import { type ReactNode, Suspense, lazy } from "react";

const MagicBlockProvider = lazy(() =>
  import("./MagicBlockProvider").then((mod) => ({ default: mod.MagicBlockProvider }))
);

export default function MagicBlockLazyProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <MagicBlockProvider>{children}</MagicBlockProvider>
    </Suspense>
  );
}
