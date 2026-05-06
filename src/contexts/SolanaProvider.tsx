import { type ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

type SolanaProviderProps = {
  children: ReactNode;
};

export function SolanaProvider({ children }: SolanaProviderProps) {
  const endpoint = useMemo(() => {
    return import.meta.env.VITE_HELIUS_RPC_URL || clusterApiUrl("devnet");
  }, []);

  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
