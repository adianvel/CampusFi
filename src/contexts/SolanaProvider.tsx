import { type ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

type SolanaProviderProps = {
  children: ReactNode;
};

export function SolanaProvider({ children }: SolanaProviderProps) {
  const endpoint = useMemo(() => {
    const rpcFast = import.meta.env.VITE_RPCFAST_RPC_URL;
    const helius = import.meta.env.VITE_HELIUS_RPC_URL;
    return rpcFast || helius || clusterApiUrl("devnet");
  }, []);

  const wsEndpoint = useMemo(() => {
    const rpcFast = import.meta.env.VITE_RPCFAST_RPC_URL;
    if (!rpcFast) return undefined;
    try {
      const url = new URL(rpcFast);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      return url.toString();
    } catch {
      return undefined;
    }
  }, []);

  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ wsEndpoint }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
