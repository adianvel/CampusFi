import { type ReactNode, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowRight, Loader2, RefreshCw, ShieldCheck, Users, Wallet } from "lucide-react";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Progress } from "@/src/components/ui/progress";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { useCampusfi } from "@/src/hooks/useCampusfi";
import {
  formatUsdc,
  getLoanStatus,
  getRiskTier,
  lenderClaimable,
  lenderExpectedProfit,
  lenderGrossOwed,
  lenderRepaidShare,
  totalOwed,
  usesClaimableVault,
  type LoanFundingData,
  type LoanRequestData,
} from "@/src/lib/campusfiClient";

export function LenderDashboard({ showMarketplace = false }: { showMarketplace?: boolean }) {
  const { connected, loading, actionPending, error, marketplaceLoans, lenderFundings, fundLoan, claimReturns, refresh, publicKey } = useCampusfi();
  const [fundAmounts, setFundAmounts] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fundingKey, setFundingKey] = useState<string | null>(null);
  const [filters, setFilters] = useState({ riskTier: "all", minAmount: "", maxAmount: "", term: "all" });

  const portfolioRows = useMemo(() => {
    return lenderFundings.map((funding) => ({
      funding,
      loan: marketplaceLoans.find((loan) => loan.publicKey.equals(funding.loanRequest)) ?? null,
    }));
  }, [lenderFundings, marketplaceLoans]);
  const fundableMarketplaceLoans = useMemo(() => {
    return marketplaceLoans
      .filter((loan) => loan.fundedAmount.toNumber() < loan.amount.toNumber())
      .filter((loan) => {
        if (filters.riskTier !== "all" && loan.riskTier !== Number(filters.riskTier)) return false;
        const amount = loan.amount.toNumber() / 1_000_000;
        if (filters.minAmount && amount < Number(filters.minAmount)) return false;
        if (filters.maxAmount && amount > Number(filters.maxAmount)) return false;
        if (filters.term !== "all" && loan.termMonths !== Number(filters.term)) return false;
        return true;
      });
  }, [marketplaceLoans, filters]);

  async function runAction(action: () => Promise<unknown>, successMessage?: string) {
    setFormError(null);
    setSuccessMsg(null);
    try {
      await action();
      if (successMessage) {
        setSuccessMsg(successMessage);
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Transaction failed");
    }
  }

  if (!connected) {
    return (
      <Card className="mx-auto max-w-3xl border-primary/20 bg-card shadow-sm">
        <CardContent className="grid gap-8 p-8 md:grid-cols-[1fr_220px] md:items-center">
          <div>
            <Badge variant="secondary" className="mb-4">Lender access</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Connect your lender wallet</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Funding actions, marketplace positions, and repayment tracking are signed from your Solana wallet.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background p-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Step 01</div>
                <div className="mt-1 text-sm font-semibold">Connect wallet</div>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Step 02</div>
                <div className="mt-1 text-sm font-semibold">Fund requests</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-primary/5 p-6 text-center">
            <Wallet className="mx-auto h-12 w-12 text-primary" />
            <div className="mt-4 text-sm font-semibold">No wallet connected</div>
            <div className="mt-1 text-xs text-muted-foreground">Use the button in the top bar.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showMarketplace) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#111827]">Marketplace</h1>
            <p className="text-slate-500">Fund verified students based on on-chain loan requests.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 rounded-md border border-slate-200 bg-white p-4">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Risk Tier</Label>
            <select
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.riskTier}
              onChange={(e) => setFilters((current) => ({ ...current, riskTier: e.target.value }))}
            >
              <option value="all">All tiers</option>
              <option value="0">Low Risk</option>
              <option value="1">Medium Risk</option>
              <option value="2">High Risk</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Min Amount (USDC)</Label>
            <Input
              type="number"
              placeholder="50"
              value={filters.minAmount}
              onChange={(e) => setFilters((current) => ({ ...current, minAmount: e.target.value }))}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Max Amount (USDC)</Label>
            <Input
              type="number"
              placeholder="300"
              value={filters.maxAmount}
              onChange={(e) => setFilters((current) => ({ ...current, maxAmount: e.target.value }))}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Term</Label>
            <select
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.term}
              onChange={(e) => setFilters((current) => ({ ...current, term: e.target.value }))}
            >
              <option value="all">Any term</option>
              <option value="1">1 month</option>
              <option value="2">2 months</option>
              <option value="3">3 months</option>
              <option value="4">4 months</option>
              <option value="5">5 months</option>
              <option value="6">6 months</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="grid gap-4 py-6 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
            </CardContent>
          </Card>
        ) : fundableMarketplaceLoans.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <ShieldCheck className="mb-4 h-10 w-10 text-slate-400" />
              <h3 className="text-xl font-semibold text-[#111827]">No fundable requests</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                New student loan requests will appear here until they are fully funded.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {fundableMarketplaceLoans.some((loan) => publicKey && loan.student.equals(publicKey)) && (
              <Alert className="border-blue-200 bg-blue-50 text-blue-800">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-blue-800">
                  This wallet created one of the requests below. Connect a different lender wallet to fund it.
                </AlertDescription>
              </Alert>
            )}
            {(error || formError) && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700">{error || formError}</AlertDescription>
              </Alert>
            )}
            {successMsg && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-emerald-700">{successMsg}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {fundableMarketplaceLoans.map((loan) => {
                const key = loan.publicKey.toBase58();
                const remaining = Math.max(loan.amount.toNumber() - loan.fundedAmount.toNumber(), 0);
                const remainingUsdc = remaining / 1_000_000;
                const fundAmount = fundAmounts[key] ?? "";
                const parsedFundAmount = Number(fundAmount);
                const isOwnLoan = Boolean(publicKey && loan.student.equals(publicKey));
                const disabledReason = isOwnLoan
                  ? "Use a different lender wallet"
                  : remaining === 0
                    ? "Fully funded"
                    : !Number.isFinite(parsedFundAmount) || parsedFundAmount <= 0
                      ? "Enter amount"
                      : parsedFundAmount > remainingUsdc
                        ? "Exceeds remaining"
                    : fundingKey === key
                      ? "Funding..."
                      : fundingKey
                        ? "Another fund in progress"
                        : null;

                return (
                  <LoanMarketCard
                    key={key}
                    loan={loan}
                    fundAmount={fundAmount}
                    setFundAmount={(value) => setFundAmounts((current) => ({ ...current, [key]: value }))}
                    disabledReason={disabledReason}
                    pending={fundingKey === key}
                    onFund={() => {
                      setFundingKey(key);
                      runAction(async () => {
                        await fundLoan(loan, parsedFundAmount);
                        setFundAmounts((current) => ({ ...current, [key]: "" }));
                      }, `Successfully funded ${parsedFundAmount.toFixed(2)} USDC!`).finally(() => setFundingKey(null));
                    }}
                  />
                );
              })}
            </div>
          </>
        )}

        </div>
      );
    }
  const activePrincipal = lenderFundings.reduce((sum, funding) => sum + funding.amount.toNumber(), 0);
  const expectedMonthly = portfolioRows.reduce(
    (sum, row) => sum + (row.loan ? (row.funding.amount.toNumber() * row.loan.interestRateBps) / 10_000 : 0),
    0,
  );
  const expectedProfit = portfolioRows.reduce(
    (sum, row) => sum + (row.loan ? lenderExpectedProfit(row.loan, row.funding) : 0),
    0,
  );
  const claimableReturns = portfolioRows.reduce(
    (sum, row) => sum + (row.loan && usesClaimableVault(row.funding) ? lenderClaimable(row.loan, row.funding) : 0),
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#111827]">Portfolio Overview</h1>
          <p className="text-slate-500">Track funded loan accounts from the marketplace.</p>
        </div>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard icon={<Wallet className="h-3 w-3" />} label="Funded principal" value={`${(activePrincipal / 1_000_000).toFixed(2)} USDC`} note={`${lenderFundings.length} funding positions`} />
        <MetricCard icon={<Activity className="h-3 w-3" />} label="Expected profit" value={`${(expectedProfit / 1_000_000).toFixed(2)} USDC`} note={`${(expectedMonthly / 1_000_000).toFixed(2)} USDC expected monthly`} accent />
        <MetricCard icon={<Users className="h-3 w-3" />} label="Claimable" value={`${(claimableReturns / 1_000_000).toFixed(2)} USDC`} note="Principal plus earned interest available" />
      </div>

      {portfolioRows.some(({ funding }) => !usesClaimableVault(funding)) && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-amber-800">
            Some funded positions were created before the claim vault upgrade. Their profit is visible, but on-chain claiming is available only for positions funded after the upgrade.
          </AlertDescription>
        </Alert>
      )}

      <h3 className="text-xl font-semibold text-[#111827]">Active Loan Accounts</h3>
      <Card className="overflow-hidden rounded-sm">
        <Table>
            <TableHeader className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
              <TableRow>
                <TableHead className="px-6 py-4 font-normal">Loan</TableHead>
                <TableHead className="px-6 py-4 font-normal">Funded</TableHead>
                <TableHead className="px-6 py-4 font-normal">Profit</TableHead>
                <TableHead className="px-6 py-4 font-normal">Repaid share</TableHead>
                <TableHead className="px-6 py-4 font-normal">Claimable</TableHead>
                <TableHead className="px-6 py-4 text-right font-normal">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioRows.length === 0 ? (
                <TableRow>
                  <TableCell className="px-6 py-10 text-center text-slate-500" colSpan={6}>
                    No funded positions yet. Open the marketplace and fund a student request.
                  </TableCell>
                </TableRow>
              ) : (
                portfolioRows.map(({ funding, loan }) => (
                  <PortfolioRow
                    key={funding.publicKey.toBase58()}
                    funding={funding}
                    loan={loan}
                    pending={actionPending === "Claiming lender returns"}
                    onClaim={() => loan && runAction(() => claimReturns(loan, funding), "Returns claimed successfully!")}
                  />
                ))
              )}
            </TableBody>
          </Table>
      </Card>

      {(error || formError) && <InlineError message={error || formError || ""} />}
    </div>
  );
}

function PortfolioRow({
  funding,
  loan,
  pending,
  onClaim,
}: {
  funding: LoanFundingData;
  loan: LoanRequestData | null;
  pending: boolean;
  onClaim: () => void;
}) {
  const expectedProfit = loan ? lenderExpectedProfit(loan, funding) : 0;
  const repaidShare = loan ? lenderRepaidShare(loan, funding) : 0;
  const claimable = loan ? lenderClaimable(loan, funding) : 0;
  const canClaim = Boolean(loan && claimable > 0 && usesClaimableVault(funding));
  const hasClaimed = funding.returnsClaimed.toNumber() > 0;
  const status = loan ? getLoanStatus(loan.status) : "Tracked";

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell className="px-6 py-4">
        <div className="font-semibold text-[#111827]">{loan?.purpose ?? "Loan request"}</div>
        <div className="font-mono text-[10px] text-slate-500">{funding.loanRequest.toBase58().slice(0, 8)}...</div>
        {loan && <Badge className="mt-2" variant={loan.riskTier === 0 ? "success" : loan.riskTier === 1 ? "warning" : "secondary"}>{getRiskTier(loan.riskTier)}</Badge>}
      </TableCell>
      <TableCell className="px-6 py-4 font-mono">{formatUsdc(funding.amount).toFixed(2)} USDC</TableCell>
      <TableCell className="px-6 py-4 font-mono text-[#16A34A]">+{(expectedProfit / 1_000_000).toFixed(2)} USDC</TableCell>
      <TableCell className="px-6 py-4 font-mono">{(repaidShare / 1_000_000).toFixed(2)} USDC</TableCell>
      <TableCell className="px-6 py-4">
        <div className="flex flex-col items-start gap-2">
          <span className="font-mono">{(claimable / 1_000_000).toFixed(2)} USDC</span>
          {!usesClaimableVault(funding) && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-amber-600">Funded before claim upgrade</span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 text-right">
        <div className="flex flex-col items-end gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB]">{status}</span>
          <Button size="sm" disabled={!canClaim || pending} onClick={onClaim}>
            {pending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {canClaim ? "Claim" : hasClaimed ? "Claimed ✓" : "Not claimable"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function LoanMarketCard({
  loan,
  fundAmount,
  setFundAmount,
  disabledReason,
  pending,
  onFund,
}: {
  loan: LoanRequestData;
  fundAmount: string;
  setFundAmount: (value: string) => void;
  disabledReason: string | null;
  pending: boolean;
  onFund: () => void;
}) {
  const status = getLoanStatus(loan.status);
  const fundedPct = Math.min((loan.fundedAmount.toNumber() / loan.amount.toNumber()) * 100, 100);
  const remaining = Math.max(loan.amount.toNumber() - loan.fundedAmount.toNumber(), 0);

  return (
    <Card className="group flex flex-col overflow-hidden rounded-sm transition-colors hover:border-[#3B82F6]/50">
      <CardHeader className="pb-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="font-mono text-[10px] tracking-widest text-slate-500">{loan.publicKey.toBase58().slice(0, 8)}</div>
          <Badge variant={loan.riskTier === 0 ? "success" : loan.riskTier === 1 ? "warning" : "secondary"}>{getRiskTier(loan.riskTier)}</Badge>
        </div>
        <CardTitle className="text-lg leading-tight group-hover:text-[#3B82F6]">{loan.purpose}</CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          <ShieldCheck className="h-3 w-3 text-[#3B82F6]" />
          {loan.student.toBase58().slice(0, 4)}...{loan.student.toBase58().slice(-4)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">Request</div>
            <div className="text-base font-bold text-[#111827]">{formatUsdc(loan.amount).toFixed(2)} USDC</div>
          </div>
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">Return</div>
            <div className="text-base font-bold text-[#3B82F6]">{loan.interestRateBps / 100}% /mo</div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-end justify-between text-[11px] uppercase tracking-widest">
            <span className="font-semibold text-[#3B82F6]">{fundedPct.toFixed(0)}% Funded</span>
            <span className="font-mono text-slate-500">Remaining: {(remaining / 1_000_000).toFixed(2)}</span>
          </div>
          <Progress value={fundedPct} />
        </div>

        <Label className="grid gap-2 text-sm font-medium text-[#111827]">
          Fund amount
          <Input
            type="text"
            inputMode="decimal"
            placeholder={`Up to ${(remaining / 1_000_000).toFixed(2)} USDC`}
            value={fundAmount}
            onChange={(event) => {
              const value = event.target.value;
              if (/^\d*\.?\d{0,6}$/.test(value)) setFundAmount(value);
            }}
            className="h-10"
          />
        </Label>
      </CardContent>
      <CardFooter className="mt-auto px-6 pb-6 pt-0">
        <Button disabled={Boolean(disabledReason) || status === "Completed"} className="w-full gap-2 rounded-sm" onClick={onFund}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
          {disabledReason || (status === "Completed" ? "Completed" : "Fund Loan")}
        </Button>
      </CardFooter>
    </Card>
  );
}

function MetricCard({ icon, label, value, note, accent = false }: { icon: ReactNode; label: string; value: string; note: string; accent?: boolean }) {
  return (
    <Card className="rounded-sm">
      <CardContent className="pt-6">
        <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
          {icon} {label}
        </div>
        <div className={`text-3xl font-semibold ${accent ? "text-[#3B82F6]" : "text-[#111827]"}`}>{value}</div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">{note}</div>
      </CardContent>
    </Card>
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
