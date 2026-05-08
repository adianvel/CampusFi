# CampusFi — Session State

## Project
Solana-based peer-to-peer student loan protocol (devnet). Frontend React + Anchor program.

## Program ID
`GdDRw2Z8wmnVndyNCDndk3AubLp8vrErAtqMFcBri8Nt`

## Current Status
- **Frontend**: Working (Vite dev server `npm run dev` on port 3000)
- **Student verification**: Working (Vercel API)
- **Register/Loan/Fund/Repay**: Working on devnet
- **MagicBlock delegation**: **BROKEN** — `instruction modified data of an account it does not own`

## What We Fixed This Session

### 1. Vercel 404/500 (Fixed)
- `vercel.json`: SPA catch-all `/(.*) → /index.html`
- Vercel serverless functions must be self-contained — all API files inline their logic
- `api/student-verification.ts` and `api/ocr/verify-student.ts` are 100% self-contained

### 2. Frontend Blank Page (Fixed)
- Added `process.version`, `process.nextTick`, `process.browser` to polyfill at `src/polyfills.js`
- Injected polyfill via Vite `transformIndexHtml` plugin (HTML `<script>` before modules)
- Injected polyfill via esbuild `banner` in `optimizeDeps` (for dev pre-bundling)
- `npm dedupe` to flatten nested dependencies
- Error was: `readable-stream` v2.3.8 (nested in `ripemd160/node_modules/`) calling `process.version.slice(0,5)` with undefined `process.version`

### 3. MagicBlock Integration (PARTIALLY WORKING)
- Installed `@magicblock-labs/ephemeral-rollups-sdk` npm package
- Rust SDK upgraded from `0.2.0` to `0.13.0`
- Program has `delegate_student_profile`, `commit_student_profile`, `undelegate_student_profile` instructions
- Frontend has `MagicBlockProvider` (lazy-loaded via `MagicBlockLazyProvider`)
- Frontend hook `useCampusfi.ts` has delegate/commit/undelegate functions
- IDL updated in `src/lib/campusfi-idl.json`
- **Delegate button shows on Reputation Profile page** (`/student/profile`)

## MagicBlock Delegation Error (UNRESOLVED)

### Error
```
Simulation failed: instruction modified data of an account it does not own
Program log: Instruction: DelegateStudentProfile
Program 11111111111111111111111111111111 invoke [2]
Program 11111111111111111111111111111111 success
Program GdDRw2Z8wmnVndyNCDndk3AubLp8vrErAtqMFcBri8Nt consumed 30718 of 199700 compute units
Program GdDRw2Z8wmnVndyNCDndk3AubLp8vrErAtqMFcBri8Nt failed: instruction modified data of an account it does not own
```

### What We Know
- Only ONE System Program CPI happens (should be 2+ for full delegation flow)
- System Program CPI succeeds (creates buffer account)
- Our program fails after that — before reaching the 2nd System Program CPI (assign to delegation program) and before CPI to Delegation Program
- The `#[delegate]` macro was replaced with direct `cpi::delegate_account()` call
- Added `msg!()` debug logging — needs to be tested to see which log statements appear
- All PDA derivations match between Rust and frontend (verified tags: `DELEGATE_BUFFER_TAG=b"buffer"`, etc.)
- Delegation program `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` exists on devnet
- ER validator (Asia): `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57`

### Possible Causes
1. The `create_pda` creates buffer with `rent_exempt: false` (0 lamports) — may cause issues
2. The `assign()` call to change PDA owner might be failing silently
3. Solana runtime on devnet might have different `assign` behavior for PDAs
4. The delegation program might have access control that rejects our program

### Next Steps for Debugging
1. Check `msg!()` debug logs from latest deploy
2. Try with more lamports (change `create_pda` `false` → `true` for rent exemption)
3. Check if `assign()` is the failure point by adding logs between each step
4. Test delegation program directly via CLI: `solana program show DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`
5. Consider implementing delegation manually without SDK

## Key Files

| File | Purpose |
|------|---------|
| `programs/campusfi/src/lib.rs` | Anchor program with MagicBlock instructions |
| `programs/campusfi/Cargo.toml` | SDK version `0.13.0` |
| `src/hooks/useCampusfi.ts` | Frontend hook with delegate/commit/undelegate |
| `src/contexts/MagicBlockProvider.tsx` | MagicBlock base/ER/router connections |
| `src/contexts/MagicBlockLazyProvider.tsx` | Lazy wrapper to defer SDK loading |
| `src/pages/StudentDashboard.tsx` | MagicBlock delegation card UI |
| `src/lib/campusfi-idl.json` | Updated IDL with delegation instructions |
| `src/lib/campusfiClient.ts` | Anchor Program creation from IDL |
| `src/polyfills.js` | Buffer/process/global polyfill injection |
| `vite.config.ts` | Polyfill config + HTML injection + esbuild banner |
| `vercel.json` | SPA routing |
| `api/student-verification.ts` | Self-contained verification endpoint |
| `api/ocr/verify-student.ts` | Self-contained OCR endpoint |

## Commands
```bash
npm run dev        # Start dev server (port 3000)
npm run build      # Production build
npm run lint       # TypeScript check (tsc --noEmit)
anchor build       # Build Anchor program
anchor deploy --provider.cluster devnet  # Deploy to devnet
```

## Important Constants
- Magic Program: `Magic11111111111111111111111111111111111111`
- Magic Context: `MagicContext1111111111111111111111111111111`
- Delegation Program: `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`
- ER Validator (Asia): `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57`
- Magic Router (devnet): `https://devnet-router.magicblock.app`
- ER (devnet): `https://devnet.magicblock.app`
