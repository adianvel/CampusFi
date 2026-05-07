import * as anchor from "@coral-xyz/anchor";
import { Program, type Idl } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import campusfiIdl from "./campusfi-idl.json";
import type { Campusfi } from "./campusfi";

export const USDC_DECIMALS = 1_000_000;
export const CLAIMABLE_VAULT_CUTOFF_UNIX = 1778159227;

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || (campusfiIdl as Campusfi).address,
);

export const USDC_MINT = new PublicKey(import.meta.env.VITE_USDC_MINT || "");

export type LoanStatus = "Pending" | "Active" | "Repaying" | "Completed" | "Defaulted";
export type RiskTier = "Low Risk" | "Medium Risk" | "High Risk";

export type StudentProfileData = {
  publicKey: PublicKey;
  authority: PublicKey;
  name: string;
  university: string;
  reputationScore: number;
  loansCount: number;
  identityVerified: boolean;
};

export type LoanRequestData = {
  publicKey: PublicKey;
  student: PublicKey;
  loanId: anchor.BN;
  amount: anchor.BN;
  fundedAmount: anchor.BN;
  purpose: string;
  termMonths: number;
  interestRateBps: number;
  status: number;
  riskTier: number;
  repaidAmount: anchor.BN;
  createdAt: anchor.BN;
};

export type LoanFundingData = {
  publicKey: PublicKey;
  lender: PublicKey;
  loanRequest: PublicKey;
  amount: anchor.BN;
  fundedAt: anchor.BN;
  returnsClaimed: anchor.BN;
  bump: number;
};

export function createCampusfiProgram(
  connection: anchor.web3.Connection,
  wallet: anchor.Wallet,
) {
  const provider = new anchor.AnchorProvider(connection, wallet as anchor.Wallet, {
    commitment: "confirmed",
  });

  return new Program<Campusfi>(campusfiIdl as Idl, provider);
}

export function studentProfilePda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("student"), authority.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export function loanRequestPda(student: PublicKey, loanId: anchor.BN) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("loan"), student.toBuffer(), loanId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )[0];
}

export function loanFundingPda(loan: PublicKey, lender: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("funding"), loan.toBuffer(), lender.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export function vaultAuthorityPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    PROGRAM_ID,
  )[0];
}

export function formatUsdc(amount: anchor.BN | number) {
  const raw = typeof amount === "number" ? amount : amount.toNumber();
  return raw / USDC_DECIMALS;
}

export function parseUsdc(amount: number) {
  return new anchor.BN(Math.round(amount * USDC_DECIMALS));
}

export function getLoanStatus(status: number): LoanStatus {
  return ["Pending", "Active", "Repaying", "Completed", "Defaulted"][status] as LoanStatus;
}

export function getRiskTier(riskTier: number): RiskTier {
  return ["Low Risk", "Medium Risk", "High Risk"][riskTier] as RiskTier;
}

export function totalOwed(loan: LoanRequestData) {
  const principal = loan.amount.toNumber();
  const interest = (principal * loan.interestRateBps * loan.termMonths) / 10_000;
  return principal + interest;
}

export function lenderGrossOwed(loan: LoanRequestData, funding: LoanFundingData) {
  if (loan.amount.isZero()) return 0;
  return Math.floor((totalOwed(loan) * funding.amount.toNumber()) / loan.amount.toNumber());
}

export function lenderRepaidShare(loan: LoanRequestData, funding: LoanFundingData) {
  if (loan.amount.isZero()) return 0;
  return Math.floor((loan.repaidAmount.toNumber() * funding.amount.toNumber()) / loan.amount.toNumber());
}

export function lenderExpectedProfit(loan: LoanRequestData, funding: LoanFundingData) {
  return Math.max(lenderGrossOwed(loan, funding) - funding.amount.toNumber(), 0);
}

export function lenderClaimable(loan: LoanRequestData, funding: LoanFundingData) {
  return Math.max(lenderRepaidShare(loan, funding) - funding.returnsClaimed.toNumber(), 0);
}

export function usesClaimableVault(funding: LoanFundingData) {
  return funding.fundedAt.toNumber() >= CLAIMABLE_VAULT_CUTOFF_UNIX;
}

export async function maybeCreateAtaInstruction(
  connection: anchor.web3.Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
) {
  const ata = await getAssociatedTokenAddress(mint, owner, allowOwnerOffCurve);

  try {
    await getAccount(connection, ata);
    return { ata, instruction: null };
  } catch {
    return {
      ata,
      instruction: createAssociatedTokenAccountInstruction(
        payer,
        ata,
        owner,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    };
  }
}

export async function ensureAta(
  connection: anchor.web3.Connection,
  sendTransaction: (transaction: Transaction, connection: anchor.web3.Connection) => Promise<string>,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
) {
  const { ata, instruction } = await maybeCreateAtaInstruction(
    connection,
    payer,
    mint,
    owner,
    allowOwnerOffCurve,
  );

  if (instruction) {
    const transaction = new Transaction().add(instruction);
    const signature = await sendTransaction(transaction, connection);
    const blockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, ...blockhash }, "confirmed");
  }

  return ata;
}

export const systemProgram = SystemProgram.programId;
