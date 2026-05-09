import { useCallback, useEffect, useMemo, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PROGRAM_ID,
  USDC_MINT,
  formatUsdc,
  createCampusfiProgram,
  loanFundingPda,
  loanRequestPda,
  maybeCreateAtaInstruction,
  parseUsdc,
  studentProfilePda,
  systemProgram,
  totalOwed,
  vaultAuthorityPda,
  type LoanFundingData,
  type LoanRequestData,
  type StudentProfileData,
} from "@/src/lib/campusfiClient";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

const ER_VALIDATOR_DEVNET = new PublicKey("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57");
const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
const MAGIC_PROGRAM_ID = new PublicKey("Magic11111111111111111111111111111111111111");
const MAGIC_CONTEXT_ID = new PublicKey("MagicContext1111111111111111111111111111111");

function toAnchorWallet(wallet: ReturnType<typeof useWallet>): anchor.Wallet | null {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    return null;
  }

  return {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  } as anchor.Wallet;
}

export function useCampusfi() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [studentProfile, setStudentProfile] = useState<StudentProfileData | null>(null);
  const [studentLoans, setStudentLoans] = useState<LoanRequestData[]>([]);
  const [marketplaceLoans, setMarketplaceLoans] = useState<LoanRequestData[]>([]);
  const [lenderFundings, setLenderFundings] = useState<LoanFundingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function normalizeError(err: unknown) {
    const message = err instanceof Error ? err.message : "CampusFi transaction failed";
    if (message.includes("Attempt to load a program that does not exist")) {
      return "CampusFi program is not deployed at the configured devnet program ID. Deploy the Anchor program or update VITE_PROGRAM_ID.";
    }
    if (message.includes("insufficient funds") || message.includes("custom program error: 0x1")) {
      return "Insufficient devnet USDC balance. Get test USDC for the lender wallet, then try again.";
    }
    return message;
  }

  const anchorWallet = useMemo(() => toAnchorWallet(wallet), [wallet]);

  const program = useMemo(() => {
    if (!anchorWallet) return null;
    return createCampusfiProgram(connection, anchorWallet);
  }, [anchorWallet, connection]);

  const refresh = useCallback(async () => {
    if (!program || !wallet.publicKey) {
      setStudentProfile(null);
      setStudentLoans([]);
      setMarketplaceLoans([]);
      setLenderFundings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profilePda = studentProfilePda(wallet.publicKey);

      try {
        const profile = await program.account.studentProfile.fetch(profilePda);
        setStudentProfile({
          publicKey: profilePda,
          authority: profile.authority,
          name: profile.name,
          university: profile.university,
          reputationScore: profile.reputationScore,
          loansCount: profile.loansCount,
          identityVerified: profile.identityVerified,
        });
      } catch {
        setStudentProfile(null);
      }

      const allLoans = (await program.account.loanRequest.all()).map((item) => ({
        publicKey: item.publicKey,
        ...item.account,
      })) as LoanRequestData[];

      setMarketplaceLoans(allLoans.sort((a, b) => b.createdAt.toNumber() - a.createdAt.toNumber()));
      setStudentLoans(
        allLoans
          .filter((loan) => loan.student.equals(wallet.publicKey!))
          .sort((a, b) => b.createdAt.toNumber() - a.createdAt.toNumber()),
      );

      const allFundings = (await program.account.loanFunding.all()).map((item) => ({
        publicKey: item.publicKey,
        ...item.account,
      })) as LoanFundingData[];

      setLenderFundings(
        allFundings
          .filter((funding) => funding.lender.equals(wallet.publicKey!))
          .sort((a, b) => b.fundedAt.toNumber() - a.fundedAt.toNumber()),
      );
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const registerStudent = useCallback(
    async (name: string, university: string) => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      setActionPending("Registering student profile");
      setError(null);
      try {
        await program.methods
          .registerStudent(name, university)
          .accounts({
            studentProfile: studentProfilePda(wallet.publicKey),
            authority: wallet.publicKey,
            systemProgram,
          } as never)
          .rpc();
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
        throw err;
      } finally {
        setActionPending(null);
      }
    },
    [program, refresh, wallet.publicKey],
  );

  const createLoanRequest = useCallback(
    async (input: {
      amount: number;
      purpose: string;
      termMonths: number;
      interestRateBps: number;
    }) => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      const loanId = new anchor.BN(Date.now());
      setActionPending("Creating loan request");
      setError(null);
      try {
        await program.methods
          .createLoanRequest(
            loanId,
            parseUsdc(input.amount),
            input.purpose,
            input.termMonths,
            input.interestRateBps,
          )
          .accounts({
            loanRequest: loanRequestPda(wallet.publicKey, loanId),
            studentProfile: studentProfilePda(wallet.publicKey),
            authority: wallet.publicKey,
            systemProgram,
          } as never)
          .rpc();
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
        throw err;
      } finally {
        setActionPending(null);
      }
    },
    [program, refresh, wallet.publicKey],
  );

  const fundLoan = useCallback(
    async (loan: LoanRequestData, amount: number) => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      if (!wallet.sendTransaction) throw new Error("Wallet cannot send transactions — use Phantom, Backpack, or Solflare");
      setActionPending("Funding loan request");
      setError(null);
      try {
        const lenderTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
        const lenderTokenBalance = await getAccount(connection, lenderTokenAccount).catch(() => {
          throw new Error(`No USDC token account found. Visit https://spl-token-faucet.com/?token-name=USDC-Dev to mint test USDC.`);
        });
        const requestedAmount = parseUsdc(amount);
        if (lenderTokenBalance.amount < BigInt(requestedAmount.toString())) {
          throw new Error(
            `Insufficient devnet USDC balance. Need ${amount.toFixed(2)} USDC, available ${formatUsdc(Number(lenderTokenBalance.amount)).toFixed(2)} USDC.`,
          );
        }
        const { ata: vaultTokenAccount, instruction: createVaultTokenAccountInstruction } = await maybeCreateAtaInstruction(
          connection,
          wallet.publicKey,
          USDC_MINT,
          vaultAuthorityPda(),
          true,
        );

        const sig = await program.methods
          .fundLoan(requestedAmount)
          .accounts({
            loanFunding: loanFundingPda(loan.publicKey, wallet.publicKey),
            loanRequest: loan.publicKey,
            lenderTokenAccount,
            vaultTokenAccount,
            vaultAuthority: vaultAuthorityPda(),
            lender: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram,
          } as never)
          .preInstructions(createVaultTokenAccountInstruction ? [createVaultTokenAccountInstruction] : [])
          .rpc();

        const newFundedAmount = new anchor.BN(loan.fundedAmount.toNumber() + requestedAmount.toNumber());
        const newStatus = newFundedAmount.toNumber() >= loan.amount.toNumber() ? 1 : loan.status;

        setMarketplaceLoans((prev) =>
          prev.map((l) =>
            l.publicKey.equals(loan.publicKey)
              ? { ...l, fundedAmount: newFundedAmount, status: newStatus }
              : l,
          ),
        );

        await refresh();
        return sig;
      } catch (err) {
        setError(normalizeError(err));
        throw err;
      } finally {
        setActionPending(null);
      }
    },
    [connection, program, refresh, wallet.publicKey, wallet.sendTransaction],
  );

  const repayLoan = useCallback(
    async (loan: LoanRequestData, amount: number) => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      if (!wallet.sendTransaction) throw new Error("Wallet cannot send transactions");
      setActionPending("Repaying installment");
      setError(null);
      try {
        const studentTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
        const studentTokenBalance = await getAccount(connection, studentTokenAccount);
        const requestedAmount = parseUsdc(amount);
        if (studentTokenBalance.amount < BigInt(requestedAmount.toString())) {
          throw new Error(
            `Insufficient devnet USDC balance. Need ${amount.toFixed(2)} USDC, available ${formatUsdc(Number(studentTokenBalance.amount)).toFixed(2)} USDC.`,
          );
        }
        const { ata: vaultTokenAccount, instruction: createVaultTokenAccountInstruction } = await maybeCreateAtaInstruction(
          connection,
          wallet.publicKey,
          USDC_MINT,
          vaultAuthorityPda(),
          true,
        );

        await program.methods
          .repayInstallment(requestedAmount)
          .accounts({
            loanRequest: loan.publicKey,
            studentTokenAccount,
            vaultTokenAccount,
            vaultAuthority: vaultAuthorityPda(),
            student: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          } as never)
          .preInstructions(createVaultTokenAccountInstruction ? [createVaultTokenAccountInstruction] : [])
          .rpc();

        const newRepaid = new anchor.BN(loan.repaidAmount.toNumber() + requestedAmount.toNumber());
        const newStatus = newRepaid.toNumber() >= totalOwed(loan) ? 3 : 2;

        const updateLoan = (prev: LoanRequestData[]) =>
          prev.map((l) =>
            l.publicKey.equals(loan.publicKey)
              ? { ...l, repaidAmount: newRepaid, status: newStatus }
              : l,
          );

        setStudentLoans(updateLoan);
        setMarketplaceLoans(updateLoan);

        await refresh();
      } catch (err) {
        setError(normalizeError(err));
        throw err;
      } finally {
        setActionPending(null);
      }
    },
    [connection, program, refresh, wallet.publicKey, wallet.sendTransaction],
  );

  const claimReturns = useCallback(
    async (loan: LoanRequestData, funding: LoanFundingData) => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      if (!wallet.sendTransaction) throw new Error("Wallet cannot send transactions");
      setActionPending("Claiming lender returns");
      setError(null);
      try {
        const lenderTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
        const { ata: vaultTokenAccount } = await maybeCreateAtaInstruction(
          connection,
          wallet.publicKey,
          USDC_MINT,
          vaultAuthorityPda(),
          true,
        );

        await program.methods
          .claimReturns()
          .accounts({
            loanRequest: loan.publicKey,
            loanFunding: funding.publicKey,
            vaultTokenAccount,
            lenderTokenAccount,
            vaultAuthority: vaultAuthorityPda(),
            lender: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          } as never)
          .rpc();
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
        throw err;
      } finally {
        setActionPending(null);
      }
    },
    [connection, program, refresh, wallet.publicKey, wallet.sendTransaction],
  );

  /* ─── MagicBlock Delegation ─── */

  const delegateStudentProfile = useCallback(
    async () => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      setActionPending("Delegating profile to MagicBlock ER");
      setError(null);
      try {
        const profilePda = studentProfilePda(wallet.publicKey);

        const [bufferPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("buffer"), profilePda.toBuffer()],
          PROGRAM_ID,
        );
        const [delegationRecordPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("delegation"), profilePda.toBuffer()],
          DELEGATION_PROGRAM_ID,
        );
        const [delegationMetadataPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("delegation-metadata"), profilePda.toBuffer()],
          DELEGATION_PROGRAM_ID,
        );

        await (program.methods as any)
          .delegateStudentProfile()
          .accounts({
            payer: wallet.publicKey,
            bufferStudentProfile: bufferPda,
            delegationRecordStudentProfile: delegationRecordPda,
            delegationMetadataStudentProfile: delegationMetadataPda,
            studentProfile: profilePda,
            ownerProgram: PROGRAM_ID,
            delegationProgram: DELEGATION_PROGRAM_ID,
            systemProgram,
          } as never)
          .remainingAccounts([
            { pubkey: ER_VALIDATOR_DEVNET, isSigner: false, isWritable: false },
          ])
          .rpc();
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
        throw err;
      } finally {
        setActionPending(null);
      }
    },
    [program, refresh, wallet.publicKey],
  );

  const commitStudentProfile = useCallback(
    async () => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      setActionPending("Committing profile to base layer");
      setError(null);
      try {
        const profilePda = studentProfilePda(wallet.publicKey);

        await (program.methods as any)
          .commitStudentProfile()
          .accounts({
            payer: wallet.publicKey,
            studentProfile: profilePda,
            magicContext: MAGIC_CONTEXT_ID,
            magicProgram: MAGIC_PROGRAM_ID,
          } as never)
          .rpc();
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
        throw err;
      } finally {
        setActionPending(null);
      }
    },
    [program, refresh, wallet.publicKey],
  );

  const undelegateStudentProfile = useCallback(
    async () => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      setActionPending("Undelegating profile from ER");
      setError(null);
      try {
        const profilePda = studentProfilePda(wallet.publicKey);

        await (program.methods as any)
          .undelegateStudentProfile()
          .accounts({
            payer: wallet.publicKey,
            studentProfile: profilePda,
            magicContext: MAGIC_CONTEXT_ID,
            magicProgram: MAGIC_PROGRAM_ID,
          } as never)
          .rpc();
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
        throw err;
      } finally {
        setActionPending(null);
      }
    },
    [program, refresh, wallet.publicKey],
  );

  return {
    connected: Boolean(wallet.publicKey),
    publicKey: wallet.publicKey,
    loading,
    actionPending,
    error,
    studentProfile,
    studentLoans,
    marketplaceLoans,
    lenderFundings,
    refresh,
    registerStudent,
    createLoanRequest,
    fundLoan,
    repayLoan,
    claimReturns,
    delegateStudentProfile,
    commitStudentProfile,
    undelegateStudentProfile,
  };
}
