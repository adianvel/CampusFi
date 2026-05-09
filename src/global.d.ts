declare module '*.webp' {
  const value: string;
  export default value;
}

declare module '*.png' {
  const value: string;
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_HELIUS_RPC_URL?: string;
  readonly VITE_RPCFAST_RPC_URL?: string;
  readonly VITE_SOLANA_NETWORK?: "devnet" | "testnet" | "mainnet-beta";
  readonly VITE_PROGRAM_ID?: string;
  readonly VITE_USDC_MINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.json" {
  const value: unknown;
  export default value;
}
