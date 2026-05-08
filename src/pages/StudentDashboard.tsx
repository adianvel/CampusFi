import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, RefreshCw, ShieldCheck, Upload, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Progress } from "@/src/components/ui/progress";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useCampusfi } from "@/src/hooks/useCampusfi";
import { formatUsdc, getLoanStatus, getRiskTier, totalOwed } from "@/src/lib/campusfiClient";
import {
  getStudentVerification,
  loadStudentVerification,
  saveStudentVerification,
  type StudentVerification,
  verifyStudentCredential,
} from "@/src/lib/studentVerification";

export function StudentDashboard({ showProfile = false }: { showProfile?: boolean }) {
  const {
    connected,
    publicKey,
    loading,
    actionPending,
    error,
    studentProfile,
    studentLoans,
    registerStudent,
    createLoanRequest,
    repayLoan,
    refresh,
    delegateStudentProfile,
    commitStudentProfile,
    undelegateStudentProfile,
  } = useCampusfi();
  const [profileForm, setProfileForm] = useState({
    name: "Rizki Ananda",
    university: "Universitas Indonesia",
  });
  const [loanForm, setLoanForm] = useState({
    amount: 150,
    purpose: "Laptop Upgrade Fund",
    termMonths: 3,
    interestRateBps: 120,
  });
  const [repayAmount, setRepayAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [verification, setVerification] = useState<StudentVerification | null>(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [ktmFile, setKtmFile] = useState<File | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);

  const activeLoan = useMemo(() => studentLoans[0] ?? null, [studentLoans]);
  const reputationScore = studentProfile ? Math.round(studentProfile.reputationScore / 10) : 0;

  useEffect(() => {
    const walletAddress = publicKey?.toBase58();
    if (!walletAddress) {
      setVerification(null);
      setVerificationLoading(false);
      return;
    }

    const cachedVerification = loadStudentVerification(walletAddress);
    if (cachedVerification) {
      setVerification(cachedVerification);
      setVerificationEmail(cachedVerification.email);
      setVerificationLoading(false);
      return;
    }

    let isMounted = true;

    getStudentVerification(walletAddress)
      .then((restoredVerification) => {
        if (!isMounted || !restoredVerification) return;
        saveStudentVerification(restoredVerification, walletAddress);
        setVerification(restoredVerification);
        setVerificationError(null);
        setVerificationLoading(false);
        setVerificationEmail(restoredVerification.email);
        setProfileForm((current) => ({
          ...current,
          university: current.university || restoredVerification.universityDomain.replace(".ac.id", "").toUpperCase(),
        }));
      })
      .catch((err) => {
        if (!isMounted) return;
        setVerification(null);
        setVerificationLoading(false);
        setVerificationError(err instanceof Error ? err.message : "Could not restore student verification.");
      });

    return () => {
      isMounted = false;
    };
  }, [publicKey]);

  async function runAction(action: () => Promise<void>) {
    setFormError(null);
    try {
      await action();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  async function handleStudentVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerificationError(null);

    if (!ktmFile) {
      setVerificationError("Upload your KTM card before continuing.");
      return;
    }

    setVerificationPending(true);
    try {
      const result = await verifyStudentCredential(verificationEmail, ktmFile, publicKey?.toBase58() ?? "");
      saveStudentVerification(result, publicKey?.toBase58());
      setVerification(result);
      setProfileForm((current) => ({
        ...current,
        university: current.university || result.universityDomain.replace(".ac.id", "").toUpperCase(),
      }));
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Student verification failed.");
    } finally {
      setVerificationPending(false);
    }
  }

  if (!connected) {
    return (
      <Card className="mx-auto max-w-3xl border-primary/20 bg-card shadow-sm">
        <CardContent className="grid gap-8 p-8 md:grid-cols-[1fr_220px] md:items-center">
          <div>
            <Badge variant="secondary" className="mb-4">Borrower setup</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Connect your Solana wallet</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              CampusFi links your verified student identity, reputation score, and loan accounts to one wallet.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background p-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Step 01</div>
                <div className="mt-1 text-sm font-semibold">Connect wallet</div>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Step 02</div>
                <div className="mt-1 text-sm font-semibold">Verify student email</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-primary/5 p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-primary" />
            <div className="mt-4 text-sm font-semibold">No wallet connected</div>
            <div className="mt-1 text-xs text-muted-foreground">Use the button in the top bar.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showProfile) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#111827]">Reputation Profile</h1>
            <p className="text-slate-500">On-chain student profile and reputation snapshot.</p>
          </div>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {verificationLoading ? (
          <Card className="border-primary/20">
            <CardContent className="flex items-center gap-4 p-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Checking verification status...</span>
            </CardContent>
          </Card>
        ) : !verification ? (
          <StudentVerificationCard
            email={verificationEmail}
            setEmail={setVerificationEmail}
            ktmFile={ktmFile}
            setKtmFile={setKtmFile}
            pending={verificationPending}
            error={verificationError}
            onSubmit={handleStudentVerification}
          />
        ) : !studentProfile ? (
          <div className="space-y-4">
            <VerificationSummary verification={verification} />
            <RegisterStudentCard
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              pending={actionPending}
              onSubmit={() => runAction(() => registerStudent(profileForm.name, profileForm.university))}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-[#3B82F6]/20 bg-[#3B82F6]/5">
              <CardHeader>
                <CardTitle className="text-[#3B82F6]">Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="mb-2 text-6xl font-semibold text-[#3B82F6]">
                  {reputationScore}
                </div>
                <Badge variant={reputationScore >= 75 ? "success" : "warning"}>
                  {reputationScore >= 75 ? "Low Risk Tier" : "Medium Risk Tier"}
                </Badge>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{studentProfile.name}</CardTitle>
                <CardDescription>{studentProfile.university}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Identity profile", studentProfile.identityVerified ? "Verified" : "Profile created"],
                  ["Loans created", String(studentProfile.loansCount)],
                  ["Wallet authority", studentProfile.authority.toBase58().slice(0, 8) + "..."],
                  ["Repayment history", studentLoans.length ? "On-chain loan found" : "No repayment history yet"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#3B82F6]" />
                      <span className="text-sm text-slate-800">{label}</span>
                    </div>
                    <span className="font-mono text-xs text-slate-500">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <MagicBlockCard
            pending={actionPending}
            onDelegate={() => runAction(() => delegateStudentProfile())}
            onCommit={() => runAction(() => commitStudentProfile())}
            onUndelegate={() => runAction(() => undelegateStudentProfile())}
          />
          </>
        )}

        {(error || formError) && <InlineError message={error || formError || ""} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#111827]">Loan Overview</h1>
          <p className="text-slate-500">Create and repay education loans from your wallet.</p>
        </div>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {verificationLoading ? (
        <Card className="border-primary/20">
          <CardContent className="flex items-center gap-4 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Checking verification status...</span>
          </CardContent>
        </Card>
      ) : !verification ? (
        <StudentVerificationCard
          email={verificationEmail}
          setEmail={setVerificationEmail}
          ktmFile={ktmFile}
          setKtmFile={setKtmFile}
          pending={verificationPending}
          error={verificationError}
          onSubmit={handleStudentVerification}
        />
      ) : !studentProfile ? (
        <div className="space-y-4">
          <VerificationSummary verification={verification} />
          <RegisterStudentCard
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            pending={actionPending}
            onSubmit={() => runAction(() => registerStudent(profileForm.name, profileForm.university))}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Create Loan Request</CardTitle>
              <CardDescription>Stored on Solana as a CampusFi loan account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Purpose">
                <Input
                  value={loanForm.purpose}
                  onChange={(event) => setLoanForm({ ...loanForm, purpose: event.target.value })}
                  className="h-10"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Amount USDC">
                  <Input
                    type="number"
                    min={50}
                    max={300}
                    value={loanForm.amount}
                    onChange={(event) => setLoanForm({ ...loanForm, amount: Number(event.target.value) })}
                    className="h-10"
                  />
                </Field>
                <Field label="Term">
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={loanForm.termMonths}
                    onChange={(event) => setLoanForm({ ...loanForm, termMonths: Number(event.target.value) })}
                    className="h-10"
                  />
                </Field>
                <Field label="Monthly bps">
                  <Input
                    type="number"
                    min={60}
                    max={400}
                    value={loanForm.interestRateBps}
                    onChange={(event) => setLoanForm({ ...loanForm, interestRateBps: Number(event.target.value) })}
                    className="h-10"
                  />
                </Field>
              </div>
              <Button
                className="w-full"
                disabled={Boolean(actionPending)}
                onClick={() => runAction(() => createLoanRequest(loanForm))}
              >
                {actionPending === "Creating loan request" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create On-Chain Loan
              </Button>
            </CardContent>
          </Card>

          <LoanCard
            loan={activeLoan}
            loading={loading}
            repayAmount={repayAmount}
            setRepayAmount={setRepayAmount}
            onRepay={() => activeLoan && runAction(() => repayLoan(activeLoan, parseDecimalAmount(repayAmount)))}
            pending={actionPending}
          />
        </div>
      )}

      {(error || formError) && <InlineError message={error || formError || ""} />}
    </div>
  );
}

function StudentVerificationCard({
  email,
  setEmail,
  ktmFile,
  setKtmFile,
  pending,
  error,
  onSubmit,
}: {
  email: string;
  setEmail: (value: string) => void;
  ktmFile: File | null;
  setKtmFile: (value: File | null) => void;
  pending: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-blue-50 text-[#2563EB]">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <CardTitle>Verify Student Status</CardTitle>
            <CardDescription>
              Confirm your campus email and KTM before creating an on-chain borrower profile.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label="Student email">
              <Input
                type="email"
                autoComplete="email"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10"
                placeholder="name@university.ac.id"
                aria-invalid={error ? "true" : undefined}
              />
            </Field>
            <Field label="KTM document">
              <label className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-sm border border-slate-300 bg-white px-3 text-sm text-slate-600 focus-within:ring-2 focus-within:ring-[#3B82F6] focus-within:ring-offset-2">
                <span className="truncate">{ktmFile ? ktmFile.name : "Upload image or PDF"}</span>
                <Upload className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(event) => setKtmFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </Field>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Verify
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            PaddleOCR reads the KTM server-side; CampusFi stores only a verification result and credential hash.
          </p>
          {error && <InlineError message={error} />}
        </form>
      </CardContent>
    </Card>
  );
}

function VerificationSummary({ verification }: { verification: StudentVerification }) {
  return (
    <Card className="border-[#3B82F6]/20 bg-blue-50">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#2563EB]" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-[#111827]">Student verification complete</p>
            <p className="text-xs text-slate-500">
              {verification.email} / {verification.ktmFileName}
            </p>
          </div>
        </div>
        <Badge variant="success">Verified</Badge>
      </CardContent>
    </Card>
  );
}

function RegisterStudentCard({
  profileForm,
  setProfileForm,
  pending,
  onSubmit,
}: {
  profileForm: { name: string; university: string };
  setProfileForm: (value: { name: string; university: string }) => void;
  pending: string | null;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Student Profile</CardTitle>
        <CardDescription>Create your on-chain borrower identity first.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field label="Name">
          <Input
            value={profileForm.name}
            onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
            className="h-10"
          />
        </Field>
        <Field label="University">
          <Input
            value={profileForm.university}
            onChange={(event) => setProfileForm({ ...profileForm, university: event.target.value })}
            className="h-10"
          />
        </Field>
        <Button disabled={Boolean(pending)} onClick={onSubmit}>
          {pending === "Registering student profile" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Register
        </Button>
      </CardContent>
    </Card>
  );
}

function LoanCard({
  loan,
  loading,
  repayAmount,
  setRepayAmount,
  onRepay,
  pending,
}: {
  loan: ReturnType<typeof useCampusfi>["studentLoans"][number] | null;
  loading: boolean;
  repayAmount: string;
  setRepayAmount: (value: string) => void;
  onRepay: () => void;
  pending: string | null;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!loan) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center">
          <FileText className="mb-4 h-10 w-10 text-slate-400" />
          <h3 className="text-xl font-semibold text-[#111827]">No loan request yet</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Create your first request, then lenders can fund it from the marketplace.
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = getLoanStatus(loan.status);
  const total = totalOwed(loan);
  const remaining = Math.max(total - loan.repaidAmount.toNumber(), 0);
  const parsedRepayAmount = parseDecimalAmount(repayAmount);
  const repayDisabledReason =
    status === "Pending"
      ? `Loan must be fully funded before repayment. Current funding: ${formatUsdc(loan.fundedAmount).toFixed(2)} / ${formatUsdc(loan.amount).toFixed(2)} USDC.`
      : status === "Completed"
        ? "Loan is already completed."
          : repayAmount.trim() === "" || parsedRepayAmount <= 0
            ? "Enter a repay amount."
          : parsedRepayAmount > remaining / 1_000_000
            ? "Repay amount exceeds the remaining balance."
            : pending
              ? pending
              : null;
  const repayButtonLabel =
    pending === "Repaying installment"
      ? "Repaying"
      : status === "Pending"
        ? "Waiting for full funding"
        : status === "Completed"
          ? "Completed"
          : repayAmount.trim() === "" || parsedRepayAmount <= 0
            ? "Enter amount"
            : parsedRepayAmount > remaining / 1_000_000
              ? "Exceeds remaining"
              : "Repay";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-200 bg-blue-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-[#2563EB]">{loan.purpose}</CardTitle>
            <CardDescription>
              {getRiskTier(loan.riskTier)} / {loan.termMonths} months / {loan.interestRateBps / 100}% monthly
            </CardDescription>
          </div>
          <Badge variant={status === "Completed" ? "success" : status === "Pending" ? "warning" : "default"}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div>
          <div className="mb-2 flex justify-between font-mono text-[11px] uppercase tracking-widest">
            <span className="text-[#2563EB]">{formatUsdc(loan.fundedAmount).toFixed(2)} Funded</span>
            <span className="text-slate-500">Target: {formatUsdc(loan.amount).toFixed(2)} USDC</span>
          </div>
          <Progress value={Math.min((loan.fundedAmount.toNumber() / loan.amount.toNumber()) * 100, 100)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Total owed" value={`${(total / 1_000_000).toFixed(2)} USDC`} />
          <Metric label="Repaid" value={`${formatUsdc(loan.repaidAmount).toFixed(2)} USDC`} />
          <Metric label="Remaining" value={`${(remaining / 1_000_000).toFixed(2)} USDC`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Repay amount">
            <Input
              type="text"
              inputMode="decimal"
              value={repayAmount}
              onChange={(event) => {
                const value = event.target.value;
                if (/^\d*([,.]\d{0,6})?$/.test(value)) setRepayAmount(value);
              }}
              className="h-10"
            />
          </Field>
          <Button disabled={Boolean(repayDisabledReason)} onClick={onRepay}>
            {pending === "Repaying installment" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {repayButtonLabel}
          </Button>
        </div>
        {repayDisabledReason && (
          <p className="text-xs leading-5 text-slate-500">{repayDisabledReason}</p>
        )}
      </CardContent>
    </Card>
  );
}

function parseDecimalAmount(value: string) {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? amount : 0;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-4">
      <span className="block text-[9px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className="mt-1 block font-mono text-sm text-[#111827]">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="grid gap-2 text-sm font-medium text-[#111827]">
      {label}
      {children}
    </Label>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-red-700">{message}</AlertDescription>
    </Alert>
  );
}

function MagicBlockCard({
  pending,
  onDelegate,
  onCommit,
  onUndelegate,
}: {
  pending: string | null;
  onDelegate: () => void;
  onCommit: () => void;
  onUndelegate: () => void;
}) {
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-emerald-400">MagicBlock Ephemeral Rollup</CardTitle>
        </div>
        <CardDescription>
          Delegate your reputation profile to MagicBlock for real-time, low-cost updates. Loan operations remain on Solana base layer.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
          disabled={Boolean(pending)}
          onClick={onDelegate}
        >
          {pending === "Delegating profile to MagicBlock ER" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Delegate to ER
        </Button>
        <Button
          variant="outline"
          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
          disabled={Boolean(pending)}
          onClick={onCommit}
        >
          {pending === "Committing profile to base layer" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Commit to Base
        </Button>
        <Button
          variant="outline"
          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
          disabled={Boolean(pending)}
          onClick={onUndelegate}
        >
          {pending === "Undelegating profile from ER" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Undelegate
        </Button>
      </CardContent>
    </Card>
  );
}
