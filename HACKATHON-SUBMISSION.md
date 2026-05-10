# Colosseum Hackathon Submission — CampusFi

---

## 1. What are you building?

CampusFi is a reputation-based student loan crowdfunding marketplace on Solana. It lets verified university students request small education loans ($50–$300) without crypto collateral, using their verified identity, achievements, and portfolio as underwriting signals instead. Lenders fund students through direct crowdfunding with transparent risk tiers and monthly returns.

Students verify their identity by uploading their university student card (KTM) — our OCR system extracts their data automatically and creates an on-chain profile. They can further boost their reputation score by uploading CVs, certificates, and portfolio proof. Lenders browse a marketplace of verified loan requests, fund them with USDC, and earn interest as students repay. Every repayment builds the student's on-chain Credit Passport, unlocking access to larger future loans.

The full loan lifecycle runs on Solana: create → fund → disburse → repay → complete → credit passport update. MagicBlock's Ephemeral Rollup is integrated for real-time, low-cost reputation updates while keeping all financial operations on Solana's base layer.

---

## 2. Why did you decide to build this, and why now?

**The problem is personal.** Indonesian university students regularly need $50–$300 for laptops, certifications, tuition gaps, or research costs. They can't use DeFi (no collateral), can't get bank loans (no income/credit history), and often fall back to predatory informal lending.

**Why now:**

- **Solana's low fees** make micro-loans ($50–$300) economically viable on-chain for the first time — Ethereum gas would eat the entire loan amount.
- **MagicBlock's Ephemeral Rollups** solve the UX problem — reputation can update in real-time without expensive L1 transactions, while loan state stays maximally secure.
- **OCR maturity** — PaddleOCR can now reliably extract structured data from student cards, eliminating manual verification bottlenecks.
- **Indonesia's 9M+ university students** all have `.ac.id` emails and KTM cards — a built-in verification layer that didn't exist in previous DeFi lending attempts.

The timing is right: the infrastructure (Solana speed + MagicBlock UX + OCR verification) finally makes undercollateralized micro-lending feasible on-chain.

---

## 3. Technologies Used

**Blockchain & Smart Contracts:**
- Solana (Devnet) — base layer for loan escrow, repayments, Credit Passport
- Anchor Framework 0.32 — Rust program with 14+ instructions
- MagicBlock Ephemeral Rollups SDK — real-time reputation delegation/commit
- SPL Token (USDC) — stablecoin transfers via vault PDA

**Frontend:**
- React 19 + TypeScript
- Vite + Tailwind CSS v4
- Solana Wallet Adapter (Phantom, Backpack, Solflare)
- Motion (Framer Motion) for animations

**Backend & Verification:**
- Express.js server with rate limiting + CORS
- PaddleOCR API — KTM/student card OCR extraction
- Supabase — off-chain verification storage + file storage
- tweetnacl — wallet signature verification for API auth

**OCR Integration:**
- PaddleOCR for document text extraction
- Automated reputation scoring from extracted credentials

**Dev Tools:**
- Anchor CLI for program build/deploy/test
- Node.js test runner with 9 automated on-chain tests
- TypeScript strict mode
- Vercel for frontend deployment

---

## 6. Product Demo Video Script (max 3 minutes)

### Structure:

**[0:00–0:15] Intro**
"CampusFi — reputation-based student loans on Solana. Students borrow without collateral. Lenders earn transparent returns."

**[0:15–0:45] Student Flow**
- Show: Connect wallet as student
- Show: Enter .ac.id email, upload KTM image
- Show: OCR extracts name, NIM, university automatically
- Show: On-chain profile created (no manual form)
- Show: Create loan request — $150, 3 months, laptop purpose

**[0:45–1:15] Lender Flow**
- Switch to lender wallet
- Show: Marketplace with loan cards, filters (risk tier, amount, term)
- Show: Enter fund amount, click Fund
- Show: Success notification, card updates

**[1:15–1:45] Disbursement & Repayment**
- Switch back to student wallet
- Show: "Disburse to Wallet" button appears (loan fully funded)
- Show: Click disburse — USDC arrives in wallet
- Show: Repayment schedule with due dates
- Show: Repay one installment

**[1:45–2:15] Lender Claims & Credit Passport**
- Switch to lender wallet
- Show: Portfolio — funded amount, expected profit, claimable returns
- Show: Claim returns button → "Claimed ✓"
- Switch to student: Reputation Profile with Credit Passport scores

**[2:15–2:45] Technical Highlights**
- Show: Solana Explorer — on-chain transactions
- Mention: MagicBlock integration ready for real-time reputation
- Show: Automated tests passing (9/9)

**[2:45–3:00] Close**
"Fully functional on Solana Devnet. 14 on-chain instructions. Real OCR verification. Real USDC transfers. CampusFi — fund high-potential students before they have assets."

---

## 7. Pitch Video Script (max 2 minutes)

**[0:00–0:20] Hook**
"A student needs $150 for a laptop to finish their thesis. No crypto collateral. No bank will lend. No DeFi protocol will help. CampusFi changes that."

**[0:20–0:45] What is CampusFi**
"CampusFi is a reputation-based student loan marketplace on Solana. Students verify their identity with their university card — our OCR system extracts their data automatically. They upload achievements to build a reputation score. Lenders fund them based on transparent risk signals. No collateral needed."

**[0:45–1:05] How it works**
"Students request $50 to $300 for education expenses. Lenders browse verified requests, filter by risk, and fund with USDC. After full funding, money goes directly to the student's wallet. They repay monthly. Every payment builds their on-chain Credit Passport."

**[1:05–1:25] Why Solana + MagicBlock**
"Solana's low fees make $50 micro-loans viable. MagicBlock's Ephemeral Rollups let reputation update in real-time without expensive transactions. Loans stay on the secure base layer. Reputation uses the fast lane."

**[1:25–1:45] Traction**
"We built a fully functional protocol — not a mockup. 14 on-chain instructions, OCR-powered verification, multi-lender support, Credit Passport, automated tests. Live on Solana Devnet today."

**[1:45–2:00] Close**
"9 million Indonesian students need access to capital. CampusFi gives it to them — based on who they are, not what they own. Fund high-potential students before they have assets."

---

## 10. Accelerator Application Choice

**Recommended: MagicBlock Accelerator** (if available)

Reasoning:
- CampusFi directly integrates MagicBlock's Ephemeral Rollups for real-time reputation
- The product demonstrates a non-gaming use case for MagicBlock infrastructure
- Validator whitelist partnership would immediately unlock full ER functionality

**Alternative: Colosseum Accelerator / Solana Foundation**

Reasoning:
- Real-world use case for Solana (education finance, emerging markets)
- Demonstrates undercollateralized lending — a new DeFi primitive on Solana
- Clear path to revenue with pilot-ready product
