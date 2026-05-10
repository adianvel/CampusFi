import { type ReactNode, Suspense, lazy, useState, useEffect } from "react";

const MagicBlockProvider = lazy(() =>
  import("./MagicBlockProvider").then((mod) => ({ default: mod.MagicBlockProvider }))
);

export default function MagicBlockLazyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import("./MagicBlockProvider").then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  if (!ready) return <>{children}</>;

  return (
    <Suspense fallback={<>{children}</>}>
      <MagicBlockProvider>{children}</MagicBlockProvider>
    </Suspense>
  );
}
