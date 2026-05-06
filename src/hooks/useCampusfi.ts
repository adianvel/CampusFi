import { useCallback, useEffect, useMemo, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PROGRAM_ID,
  USDC_MINT,
  createCampusfiProgram,
  ensureAta,
  loanFundingPda,
  loanRequestPda,
  parseUsdc,
  studentProfilePda,
  systemProgram,
  type LoanRequestData,
  type StudentProfileData,
} from "@/src/lib/campusfiClient";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
  const [loading, setLoading] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function normalizeError(err: unknown) {
    const message = err instanceof Error ? err.message : "CampusFi transaction failed";
    if (message.includes("Attempt to load a program that does not exist")) {
      return "CampusFi program is not deployed at the configured devnet program ID. Deploy the Anchor program or update VITE_PROGRAM_ID.";
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
      if (!wallet.sendTransaction) throw new Error("Wallet cannot send transactions");
      setActionPending("Funding loan request");
      setError(null);
      try {
        const lenderTokenAccount = await ensureAta(
          connection,
          wallet.sendTransaction,
          wallet.publicKey,
          USDC_MINT,
          wallet.publicKey,
        );
        const vaultTokenAccount = await ensureAta(
          connection,
          wallet.sendTransaction,
          wallet.publicKey,
          USDC_MINT,
          PROGRAM_ID,
          true,
        );

        await program.methods
          .fundLoan(parseUsdc(amount))
          .accounts({
            loanFunding: loanFundingPda(loan.publicKey, wallet.publicKey),
            loanRequest: loan.publicKey,
            lenderTokenAccount,
            vaultTokenAccount,
            lender: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
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
    [connection, program, refresh, wallet.publicKey, wallet.sendTransaction],
  );

  const repayLoan = useCallback(
    async (loan: LoanRequestData, amount: number) => {
      if (!program || !wallet.publicKey) throw new Error("Connect wallet first");
      if (!wallet.sendTransaction) throw new Error("Wallet cannot send transactions");
      setActionPending("Repaying installment");
      setError(null);
      try {
        const studentTokenAccount = await ensureAta(
          connection,
          wallet.sendTransaction,
          wallet.publicKey,
          USDC_MINT,
          wallet.publicKey,
        );
        const vaultTokenAccount = await ensureAta(
          connection,
          wallet.sendTransaction,
          wallet.publicKey,
          USDC_MINT,
          PROGRAM_ID,
          true,
        );

        await program.methods
          .repayInstallment(parseUsdc(amount))
          .accounts({
            loanRequest: loan.publicKey,
            studentTokenAccount,
            vaultTokenAccount,
            student: wallet.publicKey,
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

  return {
    connected: Boolean(wallet.publicKey),
    publicKey: wallet.publicKey,
    loading,
    actionPending,
    error,
    studentProfile,
    studentLoans,
    marketplaceLoans,
    refresh,
    registerStudent,
    createLoanRequest,
    fundLoan,
    repayLoan,
  };
}
