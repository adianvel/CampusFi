use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("GdDRw2Z8wmnVndyNCDndk3AubLp8vrErAtqMFcBri8Nt");

/// CampusFi — Reputation-Based Student Loan Protocol on Solana
///
/// Program accounts (all PDAs):
/// - StudentProfile: ["student", wallet]
/// - LoanRequest: ["loan", student, loan_id]
/// - LoanFunding: ["funding", loan, lender]
/// - ProtocolConfig: ["config"]
///
/// Currency: USDC (6 decimals) primary, SOL secondary
#[program]
pub mod campusfi {
    use super::*;

    /// Initialize protocol configuration (admin-only, once)
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        reserve_bps: u16,
        min_reputation: u16,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.reserve_bps = reserve_bps;
        config.min_reputation = min_reputation;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Register a new student profile
    pub fn register_student(
        ctx: Context<RegisterStudent>,
        name: String,
        university: String,
    ) -> Result<()> {
        require!(name.len() <= 64, CampusfiError::NameTooLong);
        require!(university.len() <= 64, CampusfiError::UniversityTooLong);

        let profile = &mut ctx.accounts.student_profile;
        profile.authority = ctx.accounts.authority.key();
        profile.name = name;
        profile.university = university;
        profile.reputation_score = 500; // Starting score (50.0/100)
        profile.loans_count = 0;
        profile.identity_verified = false;
        profile.bump = ctx.bumps.student_profile;
        Ok(())
    }

    /// Create a loan request
    pub fn create_loan_request(
        ctx: Context<CreateLoanRequest>,
        loan_id: u64,
        amount: u64,
        purpose: String,
        term_months: u8,
        interest_rate_bps: u16,
    ) -> Result<()> {
        require!(amount >= 50_000_000 && amount <= 300_000_000, CampusfiError::InvalidAmount); // $50-$300 USDC
        require!(term_months >= 1 && term_months <= 6, CampusfiError::InvalidTerm);
        require!(interest_rate_bps <= 400, CampusfiError::InvalidInterestRate); // Max 4%/month
        require!(purpose.len() <= 128, CampusfiError::PurposeTooLong);

        let profile = &mut ctx.accounts.student_profile;
        profile.loans_count += 1;

        let loan = &mut ctx.accounts.loan_request;
        loan.student = ctx.accounts.authority.key();
        loan.loan_id = loan_id;
        loan.amount = amount;
        loan.funded_amount = 0;
        loan.purpose = purpose;
        loan.term_months = term_months;
        loan.interest_rate_bps = interest_rate_bps;
        loan.status = LoanStatus::Pending as u8;
        loan.risk_tier = calculate_risk_tier(profile.reputation_score);
        loan.repaid_amount = 0;
        loan.created_at = Clock::get()?.unix_timestamp;
        loan.bump = ctx.bumps.loan_request;
        Ok(())
    }

    /// Fund a loan (lender sends USDC to vault)
    pub fn fund_loan(
        ctx: Context<FundLoan>,
        amount: u64,
    ) -> Result<()> {
        let loan = &mut ctx.accounts.loan_request;
        require!(loan.status == LoanStatus::Pending as u8 || loan.status == LoanStatus::Active as u8, CampusfiError::LoanNotFundable);
        require!(amount > 0, CampusfiError::InvalidAmount);

        let remaining = loan.amount.checked_sub(loan.funded_amount).ok_or(CampusfiError::OverFunding)?;
        require!(amount <= remaining, CampusfiError::OverFunding);

        // Transfer USDC from lender to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.lender_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.lender.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        loan.funded_amount = loan.funded_amount.checked_add(amount).ok_or(CampusfiError::OverFunding)?;
        if loan.funded_amount >= loan.amount {
            loan.status = LoanStatus::Active as u8;
        }

        // Record a new funding position, or top up the existing lender position.
        let funding = &mut ctx.accounts.loan_funding;
        if funding.amount == 0 {
            funding.lender = ctx.accounts.lender.key();
            funding.loan_request = ctx.accounts.loan_request.key();
            funding.funded_at = Clock::get()?.unix_timestamp;
            funding.bump = ctx.bumps.loan_funding;
        }
        funding.amount = funding.amount.checked_add(amount).ok_or(CampusfiError::OverFunding)?;
        funding.returns_claimed = 0;

        Ok(())
    }

    /// Repay a loan installment (student sends USDC)
    pub fn repay_installment(
        ctx: Context<RepayInstallment>,
        amount: u64,
    ) -> Result<()> {
        let loan = &mut ctx.accounts.loan_request;
        require!(
            loan.status == LoanStatus::Active as u8 || loan.status == LoanStatus::Repaying as u8,
            CampusfiError::LoanNotRepayable
        );

        let total_owed = calculate_total_owed(loan.amount, loan.interest_rate_bps, loan.term_months);
        let remaining = total_owed.checked_sub(loan.repaid_amount).unwrap();
        require!(amount <= remaining, CampusfiError::Overpayment);

        // Transfer USDC from student to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.student_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.student.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        loan.repaid_amount += amount;
        loan.status = LoanStatus::Repaying as u8;

        if loan.repaid_amount >= total_owed {
            loan.status = LoanStatus::Completed as u8;
        }

        Ok(())
    }

    /// Claim repaid principal and interest owed to a lender funding position.
    pub fn claim_returns(ctx: Context<ClaimReturns>) -> Result<()> {
        let loan = &ctx.accounts.loan_request;
        let funding = &mut ctx.accounts.loan_funding;
        require!(funding.amount > 0, CampusfiError::NothingToClaim);

        let claimable = calculate_lender_claimable(
            loan.repaid_amount,
            loan.amount,
            funding.amount,
            funding.returns_claimed,
        )?;
        require!(claimable > 0, CampusfiError::NothingToClaim);

        let vault_bump = ctx.bumps.vault_authority;
        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", &[vault_bump]]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.lender_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, claimable)?;

        funding.returns_claimed = funding
            .returns_claimed
            .checked_add(claimable)
            .ok_or(CampusfiError::Overpayment)?;

        Ok(())
    }

    /// Update student reputation score (admin-only)
    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        new_score: u16,
    ) -> Result<()> {
        require!(new_score <= 1000, CampusfiError::InvalidReputationScore);
        let profile = &mut ctx.accounts.student_profile;
        profile.reputation_score = new_score;
        Ok(())
    }
}

/* ─── Helper Functions ─── */

fn calculate_risk_tier(reputation_score: u16) -> u8 {
    if reputation_score >= 750 { 0 } // Low risk
    else if reputation_score >= 500 { 1 } // Medium risk
    else { 2 } // High risk
}

fn calculate_total_owed(principal: u64, interest_rate_bps: u16, term_months: u8) -> u64 {
    // Simple interest: total = principal * (1 + rate * months)
    let rate = interest_rate_bps as u64;
    let months = term_months as u64;
    principal + (principal * rate * months) / 10_000
}

fn calculate_lender_claimable(
    repaid_amount: u64,
    loan_amount: u64,
    funding_amount: u64,
    already_claimed: u64,
) -> Result<u64> {
    if loan_amount == 0 {
        return Ok(0);
    }

    let gross_share = (repaid_amount as u128)
        .checked_mul(funding_amount as u128)
        .ok_or(CampusfiError::Overpayment)?
        .checked_div(loan_amount as u128)
        .ok_or(CampusfiError::Overpayment)?;
    let gross_share = u64::try_from(gross_share).map_err(|_| CampusfiError::Overpayment)?;

    Ok(gross_share.saturating_sub(already_claimed))
}

/* ─── Account Structs ─── */

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 2 + 2 + 1,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterStudent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 64 + 4 + 64 + 2 + 1 + 1 + 1,
        seeds = [b"student", authority.key().as_ref()],
        bump,
    )]
    pub student_profile: Account<'info, StudentProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(loan_id: u64)]
pub struct CreateLoanRequest<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 4 + 128 + 1 + 2 + 1 + 1 + 8 + 8 + 1,
        seeds = [b"loan", authority.key().as_ref(), &loan_id.to_le_bytes()],
        bump,
    )]
    pub loan_request: Account<'info, LoanRequest>,
    #[account(
        mut,
        seeds = [b"student", authority.key().as_ref()],
        bump = student_profile.bump,
        constraint = student_profile.authority == authority.key() @ CampusfiError::Unauthorized,
    )]
    pub student_profile: Account<'info, StudentProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundLoan<'info> {
    #[account(
        init_if_needed,
        payer = lender,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"funding", loan_request.key().as_ref(), lender.key().as_ref()],
        bump,
    )]
    pub loan_funding: Account<'info, LoanFunding>,
    #[account(mut)]
    pub loan_request: Account<'info, LoanRequest>,
    #[account(mut)]
    pub lender_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault_authority.key() @ CampusfiError::InvalidVault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA token authority for the protocol vault.
    #[account(
        seeds = [b"vault"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub lender: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RepayInstallment<'info> {
    #[account(
        mut,
        constraint = loan_request.student == student.key() @ CampusfiError::Unauthorized,
    )]
    pub loan_request: Account<'info, LoanRequest>,
    #[account(mut)]
    pub student_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault_authority.key() @ CampusfiError::InvalidVault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA token authority for the protocol vault.
    #[account(
        seeds = [b"vault"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub student: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimReturns<'info> {
    #[account(mut)]
    pub loan_request: Account<'info, LoanRequest>,
    #[account(
        mut,
        seeds = [b"funding", loan_request.key().as_ref(), lender.key().as_ref()],
        bump = loan_funding.bump,
        constraint = loan_funding.lender == lender.key() @ CampusfiError::Unauthorized,
        constraint = loan_funding.loan_request == loan_request.key() @ CampusfiError::Unauthorized,
    )]
    pub loan_funding: Account<'info, LoanFunding>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault_authority.key() @ CampusfiError::InvalidVault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lender_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA token authority for the protocol vault.
    #[account(
        seeds = [b"vault"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub lender: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(
        mut,
        seeds = [b"student", student_profile.authority.as_ref()],
        bump = student_profile.bump,
    )]
    pub student_profile: Account<'info, StudentProfile>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ CampusfiError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,
    pub admin: Signer<'info>,
}

/* ─── Data Accounts ─── */

#[account]
pub struct ProtocolConfig {
    pub admin: Pubkey,
    pub reserve_bps: u16,
    pub min_reputation: u16,
    pub bump: u8,
}

#[account]
pub struct StudentProfile {
    pub authority: Pubkey,
    pub name: String,
    pub university: String,
    pub reputation_score: u16,
    pub loans_count: u8,
    pub identity_verified: bool,
    pub bump: u8,
}

#[account]
pub struct LoanRequest {
    pub student: Pubkey,
    pub loan_id: u64,
    pub amount: u64,
    pub funded_amount: u64,
    pub purpose: String,
    pub term_months: u8,
    pub interest_rate_bps: u16,
    pub status: u8,
    pub risk_tier: u8,
    pub repaid_amount: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct LoanFunding {
    pub lender: Pubkey,
    pub loan_request: Pubkey,
    pub amount: u64,
    pub funded_at: i64,
    pub returns_claimed: u64,
    pub bump: u8,
}

/* ─── Enums ─── */

#[repr(u8)]
pub enum LoanStatus {
    Pending = 0,
    Active = 1,
    Repaying = 2,
    Completed = 3,
    Defaulted = 4,
}

/* ─── Errors ─── */

#[error_code]
pub enum CampusfiError {
    #[msg("Student profile already exists")]
    ProfileExists,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Loan request is not in a fundable state")]
    LoanNotFundable,
    #[msg("Insufficient reputation score")]
    InsufficientReputation,
    #[msg("Amount must be between $50 and $300 USDC")]
    InvalidAmount,
    #[msg("Loan is not in repayable state")]
    LoanNotRepayable,
    #[msg("Overpayment exceeds remaining balance")]
    Overpayment,
    #[msg("Over-funding exceeds loan amount")]
    OverFunding,
    #[msg("Name too long (max 64 chars)")]
    NameTooLong,
    #[msg("University name too long (max 64 chars)")]
    UniversityTooLong,
    #[msg("Purpose description too long (max 128 chars)")]
    PurposeTooLong,
    #[msg("Invalid term (must be 1-6 months)")]
    InvalidTerm,
    #[msg("Invalid interest rate (max 4%/month)")]
    InvalidInterestRate,
    #[msg("Invalid reputation score (max 1000)")]
    InvalidReputationScore,
    #[msg("No returns are claimable yet")]
    NothingToClaim,
    #[msg("Invalid protocol vault token account")]
    InvalidVault,
}
