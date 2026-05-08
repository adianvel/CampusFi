import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, type Commitment } from "@solana/web3.js";
import { ConnectionMagicRouter } from "@magicblock-labs/ephemeral-rollups-sdk";

/**
 * MagicBlock configuration for CampusFi
 * 
 * Devnet endpoints:
 * - Base Layer (Solana): https://api.devnet.solana.com
 * - Magic Router: https://devnet-router.magicblock.app
 * - ER (Ephemeral Rollup): https://devnet.magicblock.app
 * 
 * ER Validators (Devnet):
 * - Asia: MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57
 * - EU: MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e
 * - US: MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd
 */

const MAGIC_ROUTER_URL = "https://devnet-router.magicblock.app";
const MAGIC_ROUTER_WS = "wss://devnet-router.magicblock.app";
const ER_DEVNET_URL = "https://devnet.magicblock.app";
const ER_DEVNET_WS = "wss://devnet.magicblock.app";

export const ER_VALIDATOR_ASIA = "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57";

interface MagicBlockContextType {
  /** Base layer Solana connection */
  baseConnection: Connection;
  /** Magic Router connection — auto-routes to ER or base layer */
  magicRouterConnection: ConnectionMagicRouter;
  /** Direct ER connection for real-time transactions */
  erConnection: Connection;
  /** Whether MagicBlock is available */
  isAvailable: boolean;
  /** Preferred ER validator pubkey */
  preferredValidator: string;
}

const MagicBlockContext = createContext<MagicBlockContextType | null>(null);

export function MagicBlockProvider({ children }: { children: ReactNode }) {
  const { connection: baseConnection } = useConnection();
  const { connected } = useWallet();

  const value = useMemo(() => {
    const magicRouterConnection = new ConnectionMagicRouter(MAGIC_ROUTER_URL, {
      wsEndpoint: MAGIC_ROUTER_WS,
      commitment: "confirmed" as Commitment,
    });

    const erConnection = new Connection(ER_DEVNET_URL, {
      wsEndpoint: ER_DEVNET_WS,
      commitment: "confirmed" as Commitment,
    });

    return {
      baseConnection,
      magicRouterConnection,
      erConnection,
      isAvailable: connected,
      preferredValidator: ER_VALIDATOR_ASIA,
    };
  }, [baseConnection, connected]);

  return (
    <MagicBlockContext.Provider value={value}>
      {children}
    </MagicBlockContext.Provider>
  );
}

export function useMagicBlock() {
  const ctx = useContext(MagicBlockContext);
  if (!ctx) throw new Error("useMagicBlock must be used within MagicBlockProvider");
  return ctx;
}
