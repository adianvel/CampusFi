import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Copy, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
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

export function WalletStatus() {
  const { connection } = useConnection();
  const { publicKey, connected, connecting } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const address = publicKey?.toBase58();
  const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";

  const shortAddress = useMemo(() => {
    return address ? truncateAddress(address) : null;
  }, [address]);

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      if (!publicKey) {
        setBalance(null);
        setBalanceError(null);
        return;
      }

      setBalanceError(null);
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) setBalance(lamports / 1_000_000_000);
      } catch {
        if (!cancelled) setBalanceError("Balance unavailable");
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
        <Badge variant="warning" className="hidden sm:inline-flex">
          {network}
        </Badge>
        <WalletMultiButton className="campusfi-wallet-button">
          {connecting ? "Connecting..." : "Connect Wallet"}
        </WalletMultiButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant="warning" className="hidden sm:inline-flex">
        {network}
      </Badge>

      <div className="hidden lg:flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#3B82F6]" aria-hidden />
        <Wallet className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden />
        <span className="font-mono text-xs tabular-nums text-slate-800">
          {shortAddress}
        </span>
        <span className="h-4 w-px bg-slate-200" aria-hidden />
        <span className="font-mono text-xs tabular-nums text-slate-500">
          {balanceError ? (
            balanceError
          ) : balance === null ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> SOL
            </span>
          ) : (
            `${balance.toFixed(3)} SOL`
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
        <Copy className="h-4 w-4" aria-hidden />
      </Button>

      {address && (
        <a
          href={getExplorerUrl(address)}
          target="_blank"
          rel="noreferrer"
          aria-label="View wallet on Solana Explorer"
          title="View on explorer"
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-slate-300 text-[#111827] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8FAFC]"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      )}

      <WalletMultiButton className="campusfi-wallet-button compact" />
    </div>
  );
}
