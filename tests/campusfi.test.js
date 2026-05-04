import test from 'node:test'
import assert from 'node:assert/strict'
import anchorPackage from '@coral-xyz/anchor'
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo,
} from '@solana/spl-token'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'

const anchor = anchorPackage.default ?? anchorPackage
const USDC = 1_000_000

function pda(programId, seeds) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0]
}

async function airdrop(connection, publicKey, sol = 2) {
  const signature = await connection.requestAirdrop(publicKey, sol * anchor.web3.LAMPORTS_PER_SOL)
  const blockhash = await connection.getLatestBlockhash()
  await connection.confirmTransaction({ signature, ...blockhash }, 'confirmed')
}

test('CampusFi happy path: config, student, loan, fund, repay, reputation', async () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Campusfi
  const admin = provider.wallet.publicKey
  const student = Keypair.generate()
  const lender = Keypair.generate()
  const loanId = new anchor.BN(1)
  const loanAmount = new anchor.BN(100 * USDC)
  const halfLoan = new anchor.BN(50 * USDC)
  const totalOwed = new anchor.BN(103 * USDC)

  await airdrop(provider.connection, student.publicKey)
  await airdrop(provider.connection, lender.publicKey)

  const configPda = pda(program.programId, [Buffer.from('config')])
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

  await program.methods
    .initializeConfig(100, 500)
    .accounts({
      config: configPda,
      admin,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  const config = await program.account.protocolConfig.fetch(configPda)
  assert.equal(config.admin.toBase58(), admin.toBase58())
  assert.equal(config.reserveBps, 100)
  assert.equal(config.minReputation, 500)

  await program.methods
    .registerStudent('Rizki Ananda', 'Universitas Gadjah Mada')
    .accounts({
      studentProfile: studentPda,
      authority: student.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([student])
    .rpc()

  let profile = await program.account.studentProfile.fetch(studentPda)
  assert.equal(profile.authority.toBase58(), student.publicKey.toBase58())
  assert.equal(profile.reputationScore, 500)
  assert.equal(profile.loansCount, 0)

  await program.methods
    .createLoanRequest(loanId, loanAmount, 'Laptop Purchase', 3, 100)
    .accounts({
      loanRequest: loanPda,
      studentProfile: studentPda,
      authority: student.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([student])
    .rpc()

  let loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.student.toBase58(), student.publicKey.toBase58())
  assert.equal(loan.amount.toString(), loanAmount.toString())
  assert.equal(loan.fundedAmount.toString(), '0')
  assert.equal(loan.status, 0)
  assert.equal(loan.riskTier, 1)

  profile = await program.account.studentProfile.fetch(studentPda)
  assert.equal(profile.loansCount, 1)

  const mint = await createMint(provider.connection, provider.wallet.payer, admin, null, 6)
  const lenderTokenAccount = await createAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    lender.publicKey
  )
  const studentTokenAccount = await createAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    student.publicKey
  )
  const vaultTokenAccount = await createAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    admin
  )

  await mintTo(provider.connection, provider.wallet.payer, mint, lenderTokenAccount, admin, 100 * USDC)
  await mintTo(provider.connection, provider.wallet.payer, mint, studentTokenAccount, admin, 103 * USDC)

  await program.methods
    .fundLoan(loanAmount)
    .accounts({
      loanFunding: fundingPda,
      loanRequest: loanPda,
      lenderTokenAccount,
      vaultTokenAccount,
      lender: lender.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([lender])
    .rpc()

  loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.fundedAmount.toString(), loanAmount.toString())
  assert.equal(loan.status, 1)

  const funding = await program.account.loanFunding.fetch(fundingPda)
  assert.equal(funding.lender.toBase58(), lender.publicKey.toBase58())
  assert.equal(funding.amount.toString(), loanAmount.toString())

  let vault = await getAccount(provider.connection, vaultTokenAccount)
  assert.equal(vault.amount.toString(), loanAmount.toString())

  await program.methods
    .repayInstallment(halfLoan)
    .accounts({
      loanRequest: loanPda,
      studentTokenAccount,
      vaultTokenAccount,
      student: student.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([student])
    .rpc()

  loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.repaidAmount.toString(), halfLoan.toString())
  assert.equal(loan.status, 2)

  await program.methods
    .repayInstallment(totalOwed.sub(halfLoan))
    .accounts({
      loanRequest: loanPda,
      studentTokenAccount,
      vaultTokenAccount,
      student: student.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([student])
    .rpc()

  loan = await program.account.loanRequest.fetch(loanPda)
  assert.equal(loan.repaidAmount.toString(), totalOwed.toString())
  assert.equal(loan.status, 3)

  vault = await getAccount(provider.connection, vaultTokenAccount)
  assert.equal(vault.amount.toString(), new anchor.BN(203 * USDC).toString())

  await program.methods
    .updateReputation(720)
    .accounts({
      studentProfile: studentPda,
      config: configPda,
      admin,
    })
    .rpc()

  profile = await program.account.studentProfile.fetch(studentPda)
  assert.equal(profile.reputationScore, 720)
})
