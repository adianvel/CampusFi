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
  vaultAuthorityPda,
  type LoanFundingData,
  type LoanRequestData,
  type StudentProfileData,
} from "@/src/lib/campusfiClient";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
      if (!wallet.sendTransaction) throw new Error("Wallet cannot send transactions");
      setActionPending("Funding loan request");
      setError(null);
      try {
        const lenderTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
        const lenderTokenBalance = await getAccount(connection, lenderTokenAccount);
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

        await program.methods
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
  };
}
