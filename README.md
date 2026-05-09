# CampusFi

CampusFi is a reputation-based student loan crowdfunding marketplace on Solana.

Students often have future earning potential but no asset today. CampusFi lets verified students request small education-related loans based on identity, achievements, portfolio proof, repayment intent, and future earning potential. Lenders fund students through direct crowdfunding or diversified pools with transparent risk tiers and expected monthly returns.

Tagline:

```text
Fund high-potential students before they have assets.
```

Core promise:

```text
CampusFi helps students access education capital without crypto collateral, while giving lenders transparent reputation-based risk signals.
```

## Product Thesis

CampusFi is not a collateralized DeFi borrowing app.

Traditional collateralized DeFi assumes:

```text
Student needs money
-> product asks student to deposit USDC first
-> this does not match the student's reality
```

CampusFi assumes:

```text
Student has no asset today
-> verifies identity and achievements
-> creates a loan request
-> CampusFi builds a reputation profile
-> lender funds based on risk-return
-> repayment builds Credit Passport
```

Student achievements are not hard collateral. They are underwriting signals.

CampusFi should not promise guaranteed lender returns. The correct lender promise is transparent, risk-priced access to verified student loan opportunities with layered downside protection.

## MVP Scope

The MVP focuses on small education-related loans for verified students.

Target loan use cases:

- Laptop or device purchase
- Certification or course fee
- Tuition gap
- Final project or research cost
- Competition travel
- Internship relocation
- Emergency education expense

Suggested loan constraints:

- Loan size: `$50-$300`
- Term: `1-6 months`
- Repayment: monthly fixed installment
- Grace period: `7-14 days`
- Funding mode: direct crowdfunding plus future pooled funding

Suggested monthly interest bands:

| Risk Tier | Profile | Monthly Interest |
| --- | --- | ---: |
| Low | Strong verified profile, clear use case, strong repayment path | 0.6%-1.2% |
| Medium | Adequate profile, moderate risk, limited repayment history | 1.3%-2.0% |
| High | Weaker profile or higher uncertainty | 2.5%-4.0% |

High-risk pricing should be capped carefully to avoid predatory lending.

## Users

### Student Borrowers

Initial wedge:

- Indonesian university students
- `.ac.id` students and campus communities
- Students needing small loans
- Students with proof of effort such as portfolio, certificates, competitions, scholarships, internships, or academic records

### Lenders / Investors

Initial wedge:

- Alumni
- Angel or impact investors
- Crypto community lenders
- Student organization treasuries
- Scholarship communities
- Lenders comfortable with undercollateralized risk

## Core User Flows

### Student Flow

1. Connect wallet.
2. Verify email and KTM.
3. Upload achievement or portfolio proofs.
4. CampusFi generates a reputation profile.
5. Student creates a loan request.
6. Lenders fund the request.
7. Loan is disbursed fully or by milestone.
8. Student repays monthly.
9. Repayment improves Credit Passport.

### Lender Flow

1. Connect wallet.
2. Browse verified student loan requests.
3. Filter by risk tier, purpose, university, term, monthly return, and verification strength.
4. Review reputation profile.
5. Fund one student or a diversified pool.
6. Receive repayment claims.
7. Track portfolio performance.

### Default Flow

1. Student misses due date.
2. Grace period starts.
3. CampusFi sends reminders and offers restructuring.
4. If unresolved, loan is marked late/defaulted.
5. Credit Passport records the event.
6. Lender recovery uses first-loss reserve if available.
7. Student loses access to larger future loans until cured.

## Frontend Requirements

Primary product screens:

- Student Apply: email verification, KTM upload, achievement upload, loan purpose, amount, and term
- Reputation Profile: identity confidence, achievement score, portfolio score, repayment status, fraud-risk flag
- Loan Marketplace: student cards, requested amount, purpose, risk tier, monthly interest, funding progress
- Lender Dashboard: active funded loans, expected return, repayments received, late/default exposure, reserve coverage
- Repayment: due schedule, next installment, repay button, late/grace state
- Admin / Review: verification queue, suspicious applications, manual override, cohort settings

Current frontend routes:

- `/` - Landing page
- `/app` - App dashboard with a demo student/lender role switcher
- `/app/profile` - Student reputation profile mockup
- `/app/marketplace` - Lender marketplace mockup

Current dashboard data is demo/mock UI data. It is not fully wired to the Solana program yet.

## Reputation Model

CampusFi creates a Student Reputation Profile shown to lenders.

Inputs:

- Student identity: KTM and `.ac.id` email
- Academic signal: GPA band, transcript, scholarship
- Achievement: competition, hackathon, research award
- Portfolio: GitHub, design, writing, startup, freelance work
- Work signal: internship, freelance, assistant role
- Social trust: organization role, lecturer endorsement
- Repayment history: paid loans, late payments, defaults

Score components should be visible instead of one black-box score:

- Identity confidence
- Academic strength
- Achievement strength
- Portfolio strength
- Repayment reliability
- Social trust
- Fraud risk

Privacy rule:

Raw documents stay off-chain. On-chain state stores only wallet, verification status, credential hashes, reputation score snapshots, loan events, repayment events, and late/default flags.

## Solana And MagicBlock Direction

CampusFi should use Solana for trusted loan and repayment state.

MagicBlock should be used as the real-time interaction layer for reputation and loan interactions:

- Fast reputation updates
- Smooth lender browsing
- Session-key UX for repeated interactions
- Scheduled repayment checks
- Final state committed back to Solana

MagicBlock should not be described as the credential verifier. CampusFi verifies credentials off-chain, then uses MagicBlock to make reputation and lender interactions feel real-time.

Target account model:

- `StudentProfile`
- `ReputationProfile`
- `CredentialAttestation`
- `LoanRequest`
- `LoanFunding`
- `LoanEscrow`
- `RepaymentSchedule`
- `LenderPosition`
- `CreditPassport`
- `FirstLossReserve`

Target instruction model:

- `create_student_profile`
- `submit_credential_hash`
- `update_reputation_snapshot`
- `create_loan_request`
- `fund_loan_request`
- `activate_loan`
- `release_milestone`
- `repay_installment`
- `mark_late`
- `restructure_loan`
- `mark_default`
- `update_credit_passport`
- `deposit_first_loss_reserve`
- `claim_lender_repayment`

## Demo Script

```text
CampusFi lets verified students with no collateral raise education loans from lenders based on reputation, achievements, and future earning potential.
```

Demo sequence:

1. Student connects wallet.
2. Student verifies `.ac.id` email and KTM.
3. Student uploads certificate or portfolio proof.
4. CampusFi shows a reputation profile.
5. Student requests a `$150` laptop/course loan.
6. Lender opens marketplace and sees the student's risk tier.
7. Lender funds the request.
8. Loan escrow activates and disburses funds.
9. Student repays one installment.
10. Credit Passport updates in real time.
11. Optional: show late/default state and reserve coverage.

## Current Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- Motion
- Lucide React icons
- Anchor 0.32
- Solana Web3.js

## Repository Structure

```text
.
+-- programs/          # Anchor programs
+-- src/               # React frontend
|   +-- assets/        # Frontend images and logos
|   +-- components/    # Shared UI/layout components
|   +-- lib/           # Frontend utilities
|   +-- pages/         # Landing and dashboard pages
+-- tests/             # Anchor/Solana tests
+-- Anchor.toml        # Anchor workspace config
+-- Cargo.toml         # Rust workspace config
+-- package.json       # Frontend and workspace scripts
+-- vite.config.ts     # Vite config
```

## Setup

Install dependencies:

```bash
npm install
```

Create local environment variables if needed:

```bash
cp .env.example .env
```

If `.env.example` does not exist yet, create `.env` manually and keep it out of Git.

Required environment variables:

```
VITE_RPCFAST_RPC_URL=    # Primary RPC (RpcFast)
VITE_HELIUS_RPC_URL=     # Fallback RPC (Helius)
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=         # Deployed program ID
VITE_USDC_MINT=          # USDC devnet mint address
VITE_GEMINI_API_KEY=     # (optional) Gemini for KTM extraction
PADDLEOCR_API_URL=       # PaddleOCR API endpoint
PADDLEOCR_TOKEN=         # PaddleOCR auth token
SUPABASE_URL=            # Supabase project URL
SUPABASE_ANON_KEY=       # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role key
```

## Development

Start the frontend:

```bash
npm run dev
```

Default local URL:

```text
http://localhost:3000/
```

Run the TypeScript check:

```bash
npm run lint
```

Build the frontend:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Anchor / Solana

Build the Anchor program:

```bash
npm run anchor:build
```

Run Anchor tests:

```bash
npm run anchor:test
```

WSL-oriented test command:

```bash
npm run anchor:test:wsl
```

Program IDs are configured in `Anchor.toml`.

## Development Notes

### Simulating Loans

To simulate the full flow (create loan → fund → repay), you need **USDC devnet SPL tokens** in both a student wallet and a lender wallet (separate wallets).

**USDC Devnet Mint Address:** `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`

**Faucets:**

| Resource | Link |
|----------|------|
| SPL Token Faucet (USDC-Dev) | [spl-token-faucet.com](https://spl-token-faucet.com/?token-name=USDC-Dev) |
| Solana Devnet Airdrop | `solana airdrop 2 <wallet>` (up to 2 SOL per request) |

**Workflow:**
1. Airdrop SOL to both student and lender wallets
2. Use the faucet to mint USDC-Dev to both wallets
3. Student wallet: register, create loan request
4. Lender wallet: fund the loan with USDC
5. Student wallet: repay installments

### External Services

| Service | Purpose | Link |
|---------|---------|------|
| **PaddleOCR** | KTM / student card OCR verification | [aistudio.baidu.com/paddleocr](https://aistudio.baidu.com/paddleocr) |
| **MagicBlock** | Ephemeral Rollup for real-time reputation updates | [magicblock.xyz](https://www.magicblock.xyz/) |
| **RpcFast** | Primary Solana RPC | [rpcfast.com](https://rpcfast.com/) — `VITE_RPCFAST_RPC_URL` in `.env` |
| **Helius RPC** | Fallback Solana RPC | `VITE_HELIUS_RPC_URL` in `.env` |
| **Supabase** | Off-chain storage (verification, profiles) | `SUPABASE_URL` in `.env` |

## Success Metrics

Primary KPI:

```text
Number of funded verified student loans with at least one on-time repayment.
```

Supporting metrics:

- Verified student applications
- Lender funding conversion rate
- Average funding time
- Repayment rate
- Default rate
- Repeat lender rate
- Average lender portfolio size
- Number of verified credentials per student

## Git Notes

The repository ignores local/generated files such as:

- `node_modules/`
- `dist/`
- `target/`
- `.anchor/`
- local ledgers
- `.env`
- local agent/tooling folders

Do not commit private keys, wallet files, RPC secrets, uploaded student documents, or raw verification data.
