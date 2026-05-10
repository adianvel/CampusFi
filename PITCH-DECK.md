# CampusFi Pitch Deck

## Slide 1: Title

**CampusFi**
Fund high-potential students before they have assets.

Reputation-based student loan crowdfunding on Solana.

---

## Slide 2: Problem

**Students can't access capital when they need it most.**

- No crypto collateral → can't use DeFi lending (Kamino, Aave)
- No job or credit history → can't get bank loans
- Scholarships don't cover everything → laptops, certifications, tuition gaps, research costs
- Informal lending → predatory rates, no transparency

**$50–$300** is all they need. No one will lend it to them.

---

## Slide 3: Solution

**CampusFi replaces collateral with reputation.**

```
Student has no asset today
→ Verifies identity (KTM + .ac.id email)
→ OCR extracts student data automatically
→ Creates a loan request
→ Lenders fund based on transparent risk signals
→ Repayment builds Credit Passport
```

Small education loans. Verified students. Transparent risk.

---

## Slide 4: How It Works — Student

1. **Connect wallet** → verify .ac.id email
2. **Upload KTM** → PaddleOCR extracts name, NIM, university automatically
3. **Profile created on-chain** → no manual forms
4. **Upload CV/portfolio** → certificates, GitHub, achievements boost reputation score
5. **Request a loan** → $50–$300, 1–6 months, purpose-tagged
6. **Receive funds** → USDC disbursed directly to wallet after full funding
7. **Repay monthly** → schedule with due dates, status tracking
8. **Build Credit Passport** → on-chain history improves future access

> **Note:** Base reputation comes from KTM verification. Additional score comes from uploaded achievements — CV, certificates, competition results, GitHub portfolio, internship proof. Stronger profiles get lower interest rates and faster funding.

---

## Slide 5: How It Works — Lender

1. **Browse marketplace** → filter by risk tier, amount, term
2. **Review student profiles** → verified identity, university, reputation score
3. **Fund loans** → partial or full, USDC on Solana
4. **Track portfolio** → funded principal, expected returns, repayment progress
5. **Claim returns** → principal + interest after student repays

Monthly returns: 0.6%–4% based on risk tier.

---

## Slide 6: Risk Tiers & Pricing

| Risk Tier | Profile | Monthly Interest |
|-----------|---------|-----------------|
| Low | Strong verified profile, clear repayment path | 0.6%–1.2% |
| Medium | Adequate profile, limited history | 1.3%–2.0% |
| High | Weaker profile, higher uncertainty | 2.5%–4.0% |

**Capped rates** — we don't do predatory lending.

---

## Slide 7: What We Built (Live Demo)

**Fully functional on Solana Devnet:**

- ✅ KTM OCR verification (PaddleOCR + Gemini)
- ✅ On-chain loan lifecycle: create → fund → disburse → repay → complete
- ✅ Lender marketplace with filters
- ✅ Repayment schedule with due dates
- ✅ Credit Passport (on-chain reputation)
- ✅ Multi-lender funding support
- ✅ Wallet signature authentication
- ✅ MagicBlock Ephemeral Rollup integration (code ready, pending validator)
- ✅ 9 automated on-chain tests passing

---

## Slide 8: Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind)         │
├─────────────────────────────────────────────┤
│  Express Server                             │
│  • KTM OCR (PaddleOCR)                     │
│  • Wallet signature auth                    │
│  • Rate limiting                            │
├─────────────────────────────────────────────┤
│  Supabase (off-chain)                       │
│  • Verification records                     │
│  • KTM file storage                         │
├─────────────────────────────────────────────┤
│  Solana Devnet (on-chain)                   │
│  • Anchor program (Rust)                    │
│  • Loan escrow + vault PDA                  │
│  • Credit Passport                          │
│  • MagicBlock ER (real-time reputation)     │
└─────────────────────────────────────────────┘
```

---

## Slide 9: MagicBlock Integration

**Why MagicBlock?**

Reputation updates need to be fast and cheap. Loan state needs to be secure.

| Need | MagicBlock Role |
|------|----------------|
| Fast reputation updates | Ephemeral Rollup processes scoring instantly |
| Smooth UX | Session keys reduce wallet popups |
| Scheduled checks | Automated repayment state monitoring |
| Trusted state | Final state commits back to Solana L1 |

Loans stay on Solana base layer. Reputation uses the fast lane.

---

## Slide 10: Market

**Initial wedge: Indonesian university students**

- 9M+ active university students in Indonesia
- `.ac.id` email = built-in verification layer
- KTM (student card) = identity proof
- Small loans ($50–$300) = high volume, manageable risk

**Lenders:** Alumni, impact investors, crypto community, student org treasuries.

---

## Slide 11: Business Model

| Revenue Stream | Pricing |
|----------------|---------|
| Loan origination fee | 1–3% of funded amount |
| Lender servicing fee | 0.5–2% of repayments |
| Pool management fee | 0.5–1.5% annually |

We monetize successful funding and repayment — not student desperation.

---

## Slide 12: Traction & Next Steps

**Built:**
- Full MVP on Solana Devnet
- KTM verification pipeline
- On-chain loan protocol with 14 instructions
- Automated test suite

**Next:**
- Closed pilot: 3–5 campuses, 50–100 students, 10–20 lenders
- MagicBlock ER activation
- First-loss reserve experiment
- Mobile-first UX optimization

---

## Slide 13: Team & Ask

**[Your team info here]**

**Ask:**
- MagicBlock partnership for ER validator access
- Pilot funding for first-loss reserve
- Campus community partnerships in Indonesia

---

## Slide 14: Close

**CampusFi**

Fund high-potential students before they have assets.

*Students prove potential. Lenders earn returns. Everyone wins.*

[campusfi.vercel.app] | [github.com/adianvel/CampusFi]

---
---

# Narration Script

## Slide 1 (Title) — 15 seconds

> "CampusFi is a reputation-based student loan crowdfunding marketplace on Solana. Our tagline: fund high-potential students before they have assets."

## Slide 2 (Problem) — 30 seconds

> "Here's the problem. A university student needs $150 for a laptop to finish their thesis. They can't use DeFi — no crypto collateral. They can't go to a bank — no job, no credit history. Scholarships don't cover this. Their only option is informal lending at predatory rates. The amount is small — $50 to $300 — but no one will lend it to them."

## Slide 3 (Solution) — 30 seconds

> "CampusFi replaces collateral with reputation. We verify the student's identity through their university email and student card. Our OCR system extracts their data automatically. They create a loan request, lenders fund it based on transparent risk signals, and repayment builds an on-chain Credit Passport. No collateral needed — just proof of potential."

## Slide 4 (Student Flow) — 30 seconds

> "For students, the flow is simple. Connect wallet, verify your .ac.id email, upload your KTM — our OCR reads it and creates your profile automatically. Then upload your CV or portfolio — certificates, GitHub, competition results — to boost your reputation score. Stronger profiles get lower rates. Request a loan with a clear purpose. Once funded, USDC goes directly to your wallet. Repay monthly, and every on-time payment builds your Credit Passport for larger future loans."

## Slide 5 (Lender Flow) — 25 seconds

> "For lenders, you browse a marketplace of verified student requests. Filter by risk tier, amount, or term. Fund partially or fully with USDC. Track your portfolio — see expected returns, repayment progress, and claim your principal plus interest once the student repays. Monthly returns range from 0.6% to 4% depending on risk."

## Slide 6 (Risk Tiers) — 15 seconds

> "We price risk transparently. Strong profiles get lower rates. Weaker profiles pay more — but we cap rates to avoid predatory lending. Lenders see exactly what they're getting into."

## Slide 7 (What We Built) — 30 seconds

> "This isn't a mockup. We have a fully functional protocol on Solana Devnet. KTM verification with OCR, the complete loan lifecycle on-chain — create, fund, disburse, repay, complete. A lender marketplace with filters. Repayment schedules. An on-chain Credit Passport. Multi-lender support. Wallet signature auth. And MagicBlock integration code ready for activation. Nine automated tests verify the full flow."

## Slide 8 (Architecture) — 20 seconds

> "Architecture: React frontend, Express server handling OCR and auth, Supabase for off-chain verification storage, and an Anchor program on Solana for all financial state — loan escrow, vault, Credit Passport. MagicBlock's Ephemeral Rollup handles real-time reputation updates."

## Slide 9 (MagicBlock) — 25 seconds

> "Why MagicBlock? Reputation needs to update fast and cheap — every certificate upload, every repayment. But loan money needs maximum security. MagicBlock lets us delegate reputation accounts to a fast execution layer while keeping all financial operations on Solana's base layer. Session keys reduce wallet friction. Final state always commits back to L1."

## Slide 10 (Market) — 20 seconds

> "We're starting with Indonesian university students — over 9 million active students, all with .ac.id emails and KTM cards. That's our built-in verification layer. Small loans, high volume, manageable risk. Lenders are alumni, impact investors, and crypto community members comfortable with undercollateralized risk."

## Slide 11 (Business Model) — 15 seconds

> "We take 1–3% origination on funded loans and a small servicing fee on repayments. We monetize successful outcomes — not student desperation."

## Slide 12 (Next Steps) — 20 seconds

> "Next: a closed pilot with 3–5 campus communities, 50–100 students, and 10–20 lenders. We'll activate MagicBlock's ER validator, experiment with a first-loss reserve for lender protection, and optimize for mobile."

## Slide 13 (Ask) — 15 seconds

> "We're looking for MagicBlock partnership for validator access, pilot funding for the first-loss reserve, and campus community partnerships in Indonesia."

## Slide 14 (Close) — 10 seconds

> "CampusFi. Students prove potential. Lenders earn returns. Everyone wins. Thank you."

---

**Total narration time: ~5 minutes**

Adjust pacing based on your slot. For a 3-minute pitch, cut slides 8–9 (architecture/MagicBlock) and shorten the market/business model slides.
