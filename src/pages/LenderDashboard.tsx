import { type ReactNode, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowRight, ArrowUpRight, Filter, Loader2, RefreshCw, ShieldCheck, Users, Wallet } from "lucide-react";
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
import { formatUsdc, getLoanStatus, getRiskTier, totalOwed, type LoanRequestData } from "@/src/lib/campusfiClient";

export function LenderDashboard({ showMarketplace = false }: { showMarketplace?: boolean }) {
  const { connected, loading, actionPending, error, marketplaceLoans, fundLoan, refresh, publicKey } = useCampusfi();
  const [fundAmounts, setFundAmounts] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const fundedByMe = useMemo(() => {
    return marketplaceLoans.filter((loan) => loan.status !== 0);
  }, [marketplaceLoans]);

  async function runAction(action: () => Promise<void>) {
    setFormError(null);
    try {
      await action();
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
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
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
        ) : marketplaceLoans.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <ShieldCheck className="mb-4 h-10 w-10 text-slate-400" />
              <h3 className="text-xl font-semibold text-[#111827]">No loan requests yet</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Student-created on-chain loan requests will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {marketplaceLoans.map((loan) => {
              const key = loan.publicKey.toBase58();
              const remaining = Math.max(loan.amount.toNumber() - loan.fundedAmount.toNumber(), 0);
              const defaultAmount = Math.min(remaining / 1_000_000, 50);
              const fundAmount = fundAmounts[key] ?? defaultAmount;

              return (
                <LoanMarketCard
                  key={key}
                  loan={loan}
                  fundAmount={fundAmount}
                  setFundAmount={(value) => setFundAmounts({ ...fundAmounts, [key]: value })}
                  disabled={loan.student.equals(publicKey!) || remaining === 0 || Boolean(actionPending)}
                  pending={actionPending === "Funding loan request"}
                  onFund={() => runAction(() => fundLoan(loan, fundAmount))}
                />
              );
            })}
          </div>
        )}

        {(error || formError) && <InlineError message={error || formError || ""} />}
      </div>
    );
  }

  const activePrincipal = fundedByMe.reduce((sum, loan) => sum + loan.fundedAmount.toNumber(), 0);
  const expectedMonthly = fundedByMe.reduce(
    (sum, loan) => sum + (loan.fundedAmount.toNumber() * loan.interestRateBps) / 10_000,
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
        <MetricCard icon={<Wallet className="h-3 w-3" />} label="Funded principal" value={`${(activePrincipal / 1_000_000).toFixed(2)} USDC`} note={`${fundedByMe.length} active loan accounts`} />
        <MetricCard icon={<Activity className="h-3 w-3" />} label="Expected monthly" value={`${(expectedMonthly / 1_000_000).toFixed(2)} USDC`} note="Based on current funded amount" accent />
        <MetricCard icon={<Users className="h-3 w-3" />} label="Default rate" value="0.0%" note="Default workflow not enabled yet" />
      </div>

      <h3 className="text-xl font-semibold text-[#111827]">Active Loan Accounts</h3>
      <Card className="overflow-hidden rounded-sm">
        <Table>
            <TableHeader className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
              <TableRow>
                <TableHead className="px-6 py-4 font-normal">Loan</TableHead>
                <TableHead className="px-6 py-4 font-normal">Funded</TableHead>
                <TableHead className="px-6 py-4 font-normal">Risk</TableHead>
                <TableHead className="px-6 py-4 font-normal">Owed</TableHead>
                <TableHead className="px-6 py-4 text-right font-normal">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketplaceLoans.map((loan) => (
                <TableRow key={loan.publicKey.toBase58()} className="hover:bg-slate-50">
                  <TableCell className="px-6 py-4">
                    <div className="font-semibold text-[#111827]">{loan.purpose}</div>
                    <div className="font-mono text-[10px] text-slate-500">{loan.publicKey.toBase58().slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-mono">{formatUsdc(loan.fundedAmount).toFixed(2)} USDC</TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={loan.riskTier === 0 ? "success" : loan.riskTier === 1 ? "warning" : "secondary"}>{getRiskTier(loan.riskTier)}</Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-mono">{(totalOwed(loan) / 1_000_000).toFixed(2)} USDC</TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB]">{getLoanStatus(loan.status)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </Card>

      {(error || formError) && <InlineError message={error || formError || ""} />}
    </div>
  );
}

function LoanMarketCard({
  loan,
  fundAmount,
  setFundAmount,
  disabled,
  pending,
  onFund,
}: {
  loan: LoanRequestData;
  fundAmount: number;
  setFundAmount: (value: number) => void;
  disabled: boolean;
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
        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 font-mono text-[11px]">
          <div>
            <div className="mb-1 uppercase tracking-widest text-slate-500">Request</div>
            <div className="font-bold text-[#111827]">{formatUsdc(loan.amount).toFixed(2)} USDC</div>
          </div>
          <div>
            <div className="mb-1 uppercase tracking-widest text-slate-500">Return</div>
            <div className="font-bold text-[#3B82F6]">{loan.interestRateBps / 100}% /mo</div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-end justify-between text-[9px] uppercase tracking-widest">
            <span className="text-[#3B82F6]">{fundedPct.toFixed(0)}% Funded</span>
            <span className="font-mono text-slate-500">Remaining: {(remaining / 1_000_000).toFixed(2)}</span>
          </div>
          <Progress value={fundedPct} />
        </div>

        <Label className="grid gap-2 text-sm font-medium text-[#111827]">
          Fund amount
          <Input
            type="number"
            min={1}
            max={remaining / 1_000_000}
            value={fundAmount}
            onChange={(event) => setFundAmount(Number(event.target.value))}
            className="h-10"
          />
        </Label>
      </CardContent>
      <CardFooter className="mt-auto px-6 pb-6 pt-0">
        <Button disabled={disabled || status === "Completed"} className="w-full gap-2 rounded-sm" onClick={onFund}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
          {disabled ? "Not fundable" : "Fund Loan"}
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
