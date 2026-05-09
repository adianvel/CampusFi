# CampusFi — Session State

## Project
Solana-based peer-to-peer student loan protocol (devnet). Frontend React (Vite) + Anchor program.

## Program ID
`GdDRw2Z8wmnVndyNCDndk3AubLp8vrErAtqMFcBri8Nt`

## Current Status (May 2026)

| Feature | Status |
|---------|--------|
| Frontend (Vite dev) | ✅ Working |
| Student Verification (OCR + Gemini) | ✅ Working |
| Register Student Profile | ✅ Working |
| Create Loan Request | ✅ Working |
| Fund Loan (lender) | ✅ Working |
| Repay Loan (student) | ✅ Working |
| MagicBlock Delegate to ER | ✅ Working |
| MagicBlock Commit to Base | ❌ Broken (writable privilege) |
| MagicBlock Undelegate | ❌ Broken (same as commit) |
| Deploy Wallet | ✅ Restored from `walletdeploy.md` |
| RPC | ✅ RpcFast primary, Helius fallback |

## Completed This Session

### 1. Frontend Blank Page / Polyfills
- Bug: `readable-stream` v2.3.8 in `ripemd160/node_modules/` called `process.version.slice(0,5)` with undefined `process.version`
- Fixed: `src/polyfills.js` injects `window.process` with `version: ""` + `window.Buffer` + `window.global`
- Vite config: `transformIndexHtml` plugin injects `<script>` in `<head>`, esbuild `banner` for dev pre-bundling
- `npm dedupe` to flatten nested deps

### 2. MagicBlock Integration
- Rust SDK: `ephemeral-rollups-sdk` v0.13.0
- **Delegate to ER**: Working via `cpi::delegate_account()` directly
- Previously broken because PDA was already delegated from failed attempt with SDK v0.2.0
- Fix: check `if owner != &crate::id()` in delegate, return `AlreadyDelegated` error
- **Commit/Undelelegate**: Still broken — "writable privilege escalated" for magic_program/magic_context
- Struct `CommitStudentProfile` uses `UncheckedAccount` (no seeds) to handle delegated PDA

### 3. KTM Verification Enhancement
- File: `api/ocr/verify-student.ts`
- **Rejects non-KTM** documents using Gemini API (fallback to regex)
- **Extracts 4 fields**: studentName, NIM, university, major
- API returns new fields; stored in Supabase `student_verifications` table
- Frontend type: `StudentVerification` updated with optional fields
- `api/student-verification.ts`: GET endpoint returns extracted fields

### 4. KTM Auto-Fill Registration Form
- After verification, `name` and `university` auto-fill in RegisterStudentCard
- Badge "from KTM" when values match extracted data
- Extracted data overrides defaults (previously kept hardcoded "Rizki Ananda")
- Defaults cleared to empty strings

### 5. KTM Upload UI Redesign
- Visual KTM card template placeholder (mini card with field outlines)
- File preview with name + size + remove button
- "Click to upload" label, JPG/PNG/PDF up to 10MB

### 6. Auto Interest Rate
- Removed manual "Monthly bps" input from Create Loan form
- Auto-calculated from reputation score:
  - Low Risk (≥75): 60 bps (0.6%/mo)
  - Medium Risk (≥50): 120 bps (1.2%/mo)
  - High Risk (<50): 200 bps (2.0%/mo)
- Displayed as read-only with tier label

### 7. Instant UI Updates (No Refresh)
- `fundLoan`: updates `marketplaceLoans` state immediately after transaction
- `repayLoan`: updates `studentLoans` + `marketplaceLoans` state immediately
- No more page refresh needed after fund/repay

### 8. "No Active Loan" Empty State
- When student has no active loan, shows "No active loan" card + centered Create Loan form
- Previously always showed create form alongside loan card

### 9. RPC Configuration
- RpcFast as primary (`VITE_RPCFAST_RPC_URL` in `.env`)
- Helius as fallback (`VITE_HELIUS_RPC_URL` in `.env`)
- `rpcfast.md` gitignored (contains API key)
- WebSocket derived from RPC URL

### 10. Profile Card Shows KTM Data
- Reputation Profile card now shows: Name (from KTM), NIM, University, Major
- Falls back to on-chain data if extraction unavailable

### 11. README Updates
- USDC faucet link + mint address
- Simulation workflow (separate wallets)
- PaddleOCR, MagicBlock, RpcFast links
- Environment variables table

## MagicBlock Commit/Undelegate Error (UNRESOLVED)

### Error
```
Magic11111111111111111111111111111111111111's writable privilege escalated
Program GdDRw2Z8wmnVndyNCDndk3AubLp8vrErAtqMFcBri8Nt failed: 
Cross-program invocation with unauthorized signer or writable account
```

### Root Cause
The `commit_accounts` / `commit_and_undelegate_accounts` functions CPI to the Magic Program, but the `magic_program` account has wrong writable permissions in the Anchor instruction. The `#[commit]` macro auto-adds fields that conflict with explicit declarations. Last attempt: explicit `UncheckedAccount` for `magic_context` (writable) and `magic_program` (non-writable), removed `#[commit]` macro.

### Deploy Wallet
- Address: `4EUirw2TxJDMo2bSHsTzXuxEuK6HAZBreDTt7hGxZNpY`
- Keypair backed up in `walletdeploy.md` (gitignored)
- Restored to `.anchor/deploy-wallet.json` using node script

## Key Files

| File | Purpose |
|------|---------|
| `programs/campusfi/src/lib.rs` | Anchor program (v0.13.0 SDK) |
| `src/hooks/useCampusfi.ts` | All hooks: register, create, fund, repay, delegate, commit, undelegate |
| `src/contexts/SolanaProvider.tsx` | RpcFast primary, Helius fallback |
| `src/contexts/MagicBlockProvider.tsx` | MagicBlock connections |
| `src/contexts/MagicBlockLazyProvider.tsx` | Lazy-load SDK to avoid Buffer init race |
| `src/pages/StudentDashboard.tsx` | Student UI: verify, register, loans, profile, MagicBlock |
| `src/pages/LenderDashboard.tsx` | Lender UI: marketplace, fund, portfolio |
| `src/lib/campusfi-idl.json` | Updated IDL |
| `src/lib/campusfiClient.ts` | Program creation, PDAs, utilities |
| `src/lib/studentVerification.ts` | Verification types + API calls |
| `src/polyfills.js` | Buffer/process/global injection |
| `vite.config.ts` | Polyfills, HTML injection, esbuild banner |
| `api/ocr/verify-student.ts` | KTM OCR + Gemini extraction |
| `api/student-verification.ts` | Verification lookup endpoint |
| `.env` | All env vars (gitignored) |
| `.gitignore` | Ignores rpcfast.md, walletdeploy.md, key/secret md files |
| `walletdeploy.md` | Deploy wallet keypair (gitignored) |

## Important Constants
- Magic Program: `Magic11111111111111111111111111111111111111`
- Magic Context: `MagicContext1111111111111111111111111111111`
- Delegation Program: `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`
- ER Validator (Asia): `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57`
- USDC Mint (devnet): `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- USDC Faucet: https://spl-token-faucet.com/?token-name=USDC-Dev
- MagicBlock: https://www.magicblock.xyz/
- PaddleOCR: https://aistudio.baidu.com/paddleocr
- RpcFast: https://rpcfast.com/

## Commands
```bash
npm run dev        # Start dev server (port 3000)
npm run build      # Production build
npm run lint       # TypeScript check (tsc --noEmit)
anchor build       # Build Anchor program
anchor deploy --provider.cluster devnet  # Deploy to devnet
```

## Git Notes
- `rpcfast.md`, `walletdeploy.md` are gitignored (contain keys)
- `.env` is gitignored
- Deploy wallet restored from `walletdeploy.md` using: `node -e "const bs58=require('bs58');..."`