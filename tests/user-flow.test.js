/**
 * CampusFi User Flow Tests
 *
 * Tests the full lifecycle from both student and lender perspectives:
 * 1. Student registers profile
 * 2. Student creates a loan request
 * 3. Lender funds the loan (partial + full)
 * 4. Student repays in installments
 * 5. Lender claims returns
 * 6. Edge cases: overfunding, overpayment, double registration
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import anchorPackage from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  mintTo,
} from '@solana/spl-token'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'

const anchor = anchorPackage.default ?? anchorPackage
const USDC = 1_000_000

function pda(programId, seeds) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0]
}

async function fundFromDeployWallet(connection, payer, recipient, sol = 0.05) {
  const tx = new (await import('@solana/web3.js')).Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient,
      lamports: Math.round(sol * anchor.web3.LAMPORTS_PER_SOL),
    })
  )
  tx.feePayer = payer.publicKey
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  tx.sign(payer)
  const sig = await connection.sendRawTransaction(tx.serialize())
  const bh = await connection.getLatestBlockhash()
  await connection.confirmTransaction({ signature: sig, ...bh }, 'confirmed')
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function createAtaForPda(connection, payer, mint, pdaOwner) {
  const ata = await getAssociatedTokenAddress(mint, pdaOwner, true)
  try {
    await getAccount(connection, ata)
    return ata // already exists
  } catch {
    const ix = createAssociatedTokenAccountInstruction(payer.publicKey, ata, pdaOwner, mint)
    const tx = new Transaction().add(ix)
    tx.feePayer = payer.publicKey
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    tx.sign(payer)
    const sig = await connection.sendRawTransaction(tx.serialize())
    const bh = await connection.getLatestBlockhash()
    await connection.confirmTransaction({ signature: sig, ...bh }, 'confirmed')
    return ata
  }
}

// ─── Setup shared across tests ───

let provider, program, admin, mint
let student, lender, lender2
let configPda, vaultAuthorityPda

test.before(async () => {
  provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  program = anchor.workspace.Campusfi
  admin = provider.wallet.publicKey

  configPda = pda(program.programId, [Buffer.from('config')])
  vaultAuthorityPda = pda(program.programId, [Buffer.from('vault')])

  student = Keypair.generate()
  lender = Keypair.generate()
  lender2 = Keypair.generate()

  // Fund test wallets from deploy wallet (which already has SOL on devnet)
  await fundFromDeployWallet(provider.connection, provider.wallet.payer, student.publicKey, 0.05)
  await fundFromDeployWallet(provider.connection, provider.wallet.payer, lender.publicKey, 0.05)
  await fundFromDeployWallet(provider.connection, provider.wallet.payer, lender2.publicKey, 0.05)

  // Create a test USDC-like mint (6 decimals)
  mint = await createMint(provider.connection, provider.wallet.payer, admin, null, 6)

  // Initialize protocol config (ignore if already exists)
  try {
    await program.methods
      .initializeConfig(100, 500)
      .accounts({ config: configPda, admin, systemProgram: SystemProgram.programId })
      .rpc()
  } catch (e) {
    // Already initialized from a previous run — that's fine on devnet
    if (!e.message.includes('already in use')) throw e
  }
})

// ─── Student Flow ───

test('Student: register profile', async () => {
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])

  await program.methods
    .registerStudent('Andi Pratama', 'Universitas Indonesia')
    .accounts({
      studentProfile: studentPda,
      authority: student.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([student])
    .rpc()

  const profile = await program.account.studentProfile.fetch(studentPda)
  assert.equal(profile.name, 'Andi Pratama')
  assert.equal(profile.university, 'Universitas Indonesia')
  assert.equal(profile.reputationScore, 500)
  assert.equal(profile.loansCount, 0)
  assert.equal(profile.identityVerified, false)
})

test('Student: cannot register twice', async () => {
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])

  await assert.rejects(
    program.methods
      .registerStudent('Andi Pratama', 'UI')
      .accounts({
        studentProfile: studentPda,
        authority: student.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([student])
      .rpc(),
  )
})

test('Student: create loan request ($150, 3 months, 1.2%/month)', async () => {
  const loanId = new anchor.BN(Date.now())
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])
  const loanPda = pda(program.programId, [
    Buffer.from('loan'),
    student.publicKey.toBuffer(),
    loanId.toArrayLike(Buffer, 'le', 8),
  ])

  await program.methods
    .createLoanRequest(loanId, new anchor.BN(150 * USDC), 'Laptop for thesis project', 3, 120)
    .accounts({
      loanRequest: loanPda,
      studentProfile: studentPda,
      authority: student.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([student])
    .rpc()

  const loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.amount.toNumber(), 150 * USDC)
  assert.equal(loan.purpose, 'Laptop for thesis project')
  assert.equal(loan.termMonths, 3)
  assert.equal(loan.interestRateBps, 120)
  assert.equal(loan.status, 0) // Pending
  assert.equal(loan.riskTier, 1) // Medium (score 500)
  assert.equal(loan.fundedAmount.toNumber(), 0)
  assert.equal(loan.repaidAmount.toNumber(), 0)

  const profile = await program.account.studentProfile.fetch(studentPda)
  assert.equal(profile.loansCount, 1)
})

test('Student: cannot create loan below $50', async () => {
  const loanId = new anchor.BN(Date.now() + 1)
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])
  const loanPda = pda(program.programId, [
    Buffer.from('loan'),
    student.publicKey.toBuffer(),
    loanId.toArrayLike(Buffer, 'le', 8),
  ])

  await assert.rejects(
    program.methods
      .createLoanRequest(loanId, new anchor.BN(10 * USDC), 'Too small', 1, 100)
      .accounts({
        loanRequest: loanPda,
        studentProfile: studentPda,
        authority: student.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([student])
      .rpc(),
    /InvalidAmount/,
  )
})

test('Student: cannot create loan above $300', async () => {
  const loanId = new anchor.BN(Date.now() + 2)
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])
  const loanPda = pda(program.programId, [
    Buffer.from('loan'),
    student.publicKey.toBuffer(),
    loanId.toArrayLike(Buffer, 'le', 8),
  ])

  await assert.rejects(
    program.methods
      .createLoanRequest(loanId, new anchor.BN(500 * USDC), 'Too big', 1, 100)
      .accounts({
        loanRequest: loanPda,
        studentProfile: studentPda,
        authority: student.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([student])
      .rpc(),
    /InvalidAmount/,
  )
})

// ─── Lender Flow: Fund, Student Repay, Lender Claim ───

test('Full flow: lender funds, student repays, lender claims', async () => {
  const loanId = new anchor.BN(Date.now() + 100)
  const loanAmount = new anchor.BN(100 * USDC)
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])
  const loanPda = pda(program.programId, [
    Buffer.from('loan'),
    student.publicKey.toBuffer(),
    loanId.toArrayLike(Buffer, 'le', 8),
  ])
  const fundingPda = pda(program.programId, [
    Buffer.from('funding'),
    loanPda.toBuffer(),
    lender.publicKey.toBuffer(),
  ])

  // Student creates loan: $100, 3 months, 1%/month → total owed = $103
  await program.methods
    .createLoanRequest(loanId, loanAmount, 'Course certification', 3, 100)
    .accounts({
      loanRequest: loanPda,
      studentProfile: studentPda,
      authority: student.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([student])
    .rpc()

  // Setup token accounts with vault owned by vault PDA
  const lenderTokenAccount = await createAssociatedTokenAccount(
    provider.connection, provider.wallet.payer, mint, lender.publicKey,
  )
  const studentTokenAccount = await createAssociatedTokenAccount(
    provider.connection, provider.wallet.payer, mint, student.publicKey,
  )
  const vaultTokenAccount = await createAtaForPda(
    provider.connection, provider.wallet.payer, mint, vaultAuthorityPda,
  )

  // Mint USDC to lender and student
  await mintTo(provider.connection, provider.wallet.payer, mint, lenderTokenAccount, admin, 200 * USDC)
  await mintTo(provider.connection, provider.wallet.payer, mint, studentTokenAccount, admin, 110 * USDC)

  // ─── Lender: partial fund ($60) ───
  await program.methods
    .fundLoan(new anchor.BN(60 * USDC))
    .accounts({
      loanFunding: fundingPda,
      loanRequest: loanPda,
      lenderTokenAccount,
      vaultTokenAccount,
      vaultAuthority: vaultAuthorityPda,
      lender: lender.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([lender])
    .rpc()

  let loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.fundedAmount.toNumber(), 60 * USDC)
  assert.equal(loan.status, 0) // Still pending (not fully funded)

  // ─── Lender: fund remaining ($40) → loan becomes Active ───
  await program.methods
    .fundLoan(new anchor.BN(40 * USDC))
    .accounts({
      loanFunding: fundingPda,
      loanRequest: loanPda,
      lenderTokenAccount,
      vaultTokenAccount,
      vaultAuthority: vaultAuthorityPda,
      lender: lender.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([lender])
    .rpc()

  loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.fundedAmount.toNumber(), 100 * USDC)
  assert.equal(loan.status, 1) // Active

  let funding = await program.account.loanFunding.fetch(fundingPda)
  assert.equal(funding.amount.toNumber(), 100 * USDC)
  assert.equal(funding.lender.toBase58(), lender.publicKey.toBase58())

  // ─── Lender: cannot overfund ───
  await assert.rejects(
    program.methods
      .fundLoan(new anchor.BN(1 * USDC))
      .accounts({
        loanFunding: fundingPda,
        loanRequest: loanPda,
        lenderTokenAccount,
        vaultTokenAccount,
        vaultAuthority: vaultAuthorityPda,
        lender: lender.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([lender])
      .rpc(),
    /OverFunding/,
  )

  // ─── Student: repay first installment ($34.33) ───
  const installment = new anchor.BN(Math.ceil((103 * USDC) / 3))
  await program.methods
    .repayInstallment(installment)
    .accounts({
      loanRequest: loanPda,
      studentTokenAccount,
      vaultTokenAccount,
      vaultAuthority: vaultAuthorityPda,
      student: student.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([student])
    .rpc()

  loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.repaidAmount.toNumber(), installment.toNumber())
  assert.equal(loan.status, 2) // Repaying

  // ─── Student: repay second installment ───
  await program.methods
    .repayInstallment(installment)
    .accounts({
      loanRequest: loanPda,
      studentTokenAccount,
      vaultTokenAccount,
      vaultAuthority: vaultAuthorityPda,
      student: student.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([student])
    .rpc()

  loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.repaidAmount.toNumber(), installment.toNumber() * 2)
  assert.equal(loan.status, 2) // Still repaying

  // ─── Student: repay final installment → Completed ───
  const totalOwed = 103 * USDC
  const remaining = totalOwed - installment.toNumber() * 2
  await program.methods
    .repayInstallment(new anchor.BN(remaining))
    .accounts({
      loanRequest: loanPda,
      studentTokenAccount,
      vaultTokenAccount,
      vaultAuthority: vaultAuthorityPda,
      student: student.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([student])
    .rpc()

  loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.repaidAmount.toNumber(), totalOwed)
  assert.equal(loan.status, 3) // Completed

  // ─── Student: cannot repay a completed loan ───
  await assert.rejects(
    program.methods
      .repayInstallment(new anchor.BN(1 * USDC))
      .accounts({
        loanRequest: loanPda,
        studentTokenAccount,
        vaultTokenAccount,
        vaultAuthority: vaultAuthorityPda,
        student: student.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([student])
      .rpc(),
    /LoanNotRepayable/,
  )

  // ─── Lender: claim returns ───
  const lenderBalanceBefore = (await getAccount(provider.connection, lenderTokenAccount)).amount

  await program.methods
    .claimReturns()
    .accounts({
      loanRequest: loanPda,
      loanFunding: fundingPda,
      vaultTokenAccount,
      lenderTokenAccount,
      vaultAuthority: vaultAuthorityPda,
      lender: lender.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([lender])
    .rpc()

  const lenderBalanceAfter = (await getAccount(provider.connection, lenderTokenAccount)).amount
  const claimed = Number(lenderBalanceAfter - lenderBalanceBefore)

  // Lender funded 100% of the loan, so they get 100% of repaid amount (103 USDC)
  assert.equal(claimed, totalOwed)

  funding = await program.account.loanFunding.fetch(fundingPda)
  assert.equal(funding.returnsClaimed.toNumber(), totalOwed)

  // ─── Lender: cannot double-claim ───
  await assert.rejects(
    program.methods
      .claimReturns()
      .accounts({
        loanRequest: loanPda,
        loanFunding: fundingPda,
        vaultTokenAccount,
        lenderTokenAccount,
        vaultAuthority: vaultAuthorityPda,
        lender: lender.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([lender])
      .rpc(),
    /NothingToClaim/,
  )
})

// ─── Multi-lender flow ───

test('Multi-lender: two lenders fund, both claim proportional returns', async () => {
  const loanId = new anchor.BN(Date.now() + 200)
  const loanAmount = new anchor.BN(200 * USDC)
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])
  const loanPda = pda(program.programId, [
    Buffer.from('loan'),
    student.publicKey.toBuffer(),
    loanId.toArrayLike(Buffer, 'le', 8),
  ])
  const funding1Pda = pda(program.programId, [
    Buffer.from('funding'), loanPda.toBuffer(), lender.publicKey.toBuffer(),
  ])
  const funding2Pda = pda(program.programId, [
    Buffer.from('funding'), loanPda.toBuffer(), lender2.publicKey.toBuffer(),
  ])

  // Student creates $200 loan, 2 months, 2%/month → total owed = $208
  await program.methods
    .createLoanRequest(loanId, loanAmount, 'Tuition gap payment', 2, 200)
    .accounts({
      loanRequest: loanPda,
      studentProfile: studentPda,
      authority: student.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([student])
    .rpc()

  // Token accounts
  const lender1Token = await getAssociatedTokenAddress(mint, lender.publicKey)
  const lender2Token = await createAssociatedTokenAccount(
    provider.connection, provider.wallet.payer, mint, lender2.publicKey,
  )
  const studentToken = await getAssociatedTokenAddress(mint, student.publicKey)
  const vaultToken = await createAtaForPda(provider.connection, provider.wallet.payer, mint, vaultAuthorityPda)

  // Mint more USDC
  await mintTo(provider.connection, provider.wallet.payer, mint, lender1Token, admin, 150 * USDC)
  await mintTo(provider.connection, provider.wallet.payer, mint, lender2Token, admin, 100 * USDC)
  await mintTo(provider.connection, provider.wallet.payer, mint, studentToken, admin, 210 * USDC)

  // Lender 1 funds $120 (60%)
  await program.methods
    .fundLoan(new anchor.BN(120 * USDC))
    .accounts({
      loanFunding: funding1Pda,
      loanRequest: loanPda,
      lenderTokenAccount: lender1Token,
      vaultTokenAccount: vaultToken,
      vaultAuthority: vaultAuthorityPda,
      lender: lender.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([lender])
    .rpc()

  // Lender 2 funds $80 (40%) → loan fully funded
  await program.methods
    .fundLoan(new anchor.BN(80 * USDC))
    .accounts({
      loanFunding: funding2Pda,
      loanRequest: loanPda,
      lenderTokenAccount: lender2Token,
      vaultTokenAccount: vaultToken,
      vaultAuthority: vaultAuthorityPda,
      lender: lender2.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([lender2])
    .rpc()

  let loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.fundedAmount.toNumber(), 200 * USDC)
  assert.equal(loan.status, 1) // Active

  // Student repays full amount ($208)
  const totalOwed = 208 * USDC
  await program.methods
    .repayInstallment(new anchor.BN(totalOwed))
    .accounts({
      loanRequest: loanPda,
      studentTokenAccount: studentToken,
      vaultTokenAccount: vaultToken,
      vaultAuthority: vaultAuthorityPda,
      student: student.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([student])
    .rpc()

  loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.status, 3) // Completed

  // Lender 1 claims: 60% of $208 = $124.80
  const l1Before = (await getAccount(provider.connection, lender1Token)).amount
  await program.methods
    .claimReturns()
    .accounts({
      loanRequest: loanPda,
      loanFunding: funding1Pda,
      vaultTokenAccount: vaultToken,
      lenderTokenAccount: lender1Token,
      vaultAuthority: vaultAuthorityPda,
      lender: lender.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([lender])
    .rpc()
  const l1After = (await getAccount(provider.connection, lender1Token)).amount
  const l1Claimed = Number(l1After - l1Before)
  // 208 * 120 / 200 = 124.8 USDC = 124_800_000 micro-USDC
  assert.equal(l1Claimed, Math.floor((totalOwed * 120) / 200))

  // Lender 2 claims: 40% of $208 = $83.20
  const l2Before = (await getAccount(provider.connection, lender2Token)).amount
  await program.methods
    .claimReturns()
    .accounts({
      loanRequest: loanPda,
      loanFunding: funding2Pda,
      vaultTokenAccount: vaultToken,
      lenderTokenAccount: lender2Token,
      vaultAuthority: vaultAuthorityPda,
      lender: lender2.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([lender2])
    .rpc()
  const l2After = (await getAccount(provider.connection, lender2Token)).amount
  const l2Claimed = Number(l2After - l2Before)
  assert.equal(l2Claimed, Math.floor((totalOwed * 80) / 200))
})

// ─── Admin: reputation update ───

test('Admin: update student reputation score', async () => {
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])

  await program.methods
    .updateReputation(750)
    .accounts({
      studentProfile: studentPda,
      config: configPda,
      admin,
    })
    .rpc()

  const profile = await program.account.studentProfile.fetch(studentPda)
  assert.equal(profile.reputationScore, 750)
})

test('Non-admin cannot update reputation', async () => {
  const studentPda = pda(program.programId, [Buffer.from('student'), student.publicKey.toBuffer()])

  await assert.rejects(
    program.methods
      .updateReputation(999)
      .accounts({
        studentProfile: studentPda,
        config: configPda,
        admin: lender.publicKey,
      })
      .signers([lender])
      .rpc(),
    /Unauthorized|ConstraintRaw|ConstraintSeeds|A seeds constraint was violated/,
  )
})
