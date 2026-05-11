import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Copy, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Button } from "@/src/components/ui/button";

function truncateAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function getExplorerUrl(address: string) {
  const cluster = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
  const clusterParam = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/address/${address}${clusterParam}`;
}

type BalanceState = {
  balance: number | null;
  error: string | null;
};

type BalanceAction =
  | { type: "reset" }
  | { type: "loading" }
  | { type: "loaded"; balance: number }
  | { type: "failed"; error: string };

function balanceReducer(_state: BalanceState, action: BalanceAction): BalanceState {
  switch (action.type) {
    case "reset":
      return { balance: null, error: null };
    case "loading":
      return { balance: null, error: null };
    case "loaded":
      return { balance: action.balance, error: null };
    case "failed":
      return { balance: null, error: action.error };
  }
}

export function WalletStatus() {
  const { connection } = useConnection();
  const { publicKey, connected, connecting } = useWallet();
  const [balanceState, dispatchBalance] = useReducer(balanceReducer, { balance: null, error: null });
  const [copied, setCopied] = useState(false);

  const address = publicKey?.toBase58();

  const shortAddress = useMemo(() => {
    return address ? truncateAddress(address) : null;
  }, [address]);

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      if (!publicKey) {
        dispatchBalance({ type: "reset" });
        return;
      }

      dispatchBalance({ type: "loading" });
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) dispatchBalance({ type: "loaded", balance: lamports / 1_000_000_000 });
      } catch {
        if (!cancelled) dispatchBalance({ type: "failed", error: "Balance unavailable" });
      }
    }

    loadBalance();

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [address]);

  if (!connected) {
    return (
      <div className="flex items-center gap-3">
        <WalletMultiButton className="campusfi-wallet-button">
          {connecting ? "Connecting..." : "Connect Wallet"}
        </WalletMultiButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">

      <div className="hidden items-center gap-2 rounded-sm border bg-card px-3 py-2 lg:flex">
        <span className="size-2 rounded-full bg-primary" aria-hidden />
        <Wallet className="size-3.5 text-primary" aria-hidden />
        <span className="font-mono text-xs tabular-nums text-foreground">
          {shortAddress}
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {balanceState.error ? (
            balanceState.error
          ) : balanceState.balance === null ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" aria-hidden /> SOL
            </span>
          ) : (
            `${balanceState.balance.toFixed(3)} SOL`
          )}
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={copyAddress}
        aria-label={copied ? "Address copied" : "Copy wallet address"}
        title={copied ? "Copied" : "Copy address"}
      >
        <Copy className="size-4" aria-hidden />
      </Button>

      {address && (
        <a
          href={getExplorerUrl(address)}
          target="_blank"
          rel="noreferrer"
          aria-label="View wallet on Solana Explorer"
          title="View on explorer"
          className="inline-flex size-10 items-center justify-center rounded-sm border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      )}

      <WalletMultiButton className="campusfi-wallet-button compact" />
    </div>
  );
}
