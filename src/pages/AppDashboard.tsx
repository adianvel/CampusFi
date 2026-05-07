import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { UserCircle2, Settings, LogOut, LayoutDashboard, Search, ShieldCheck } from "lucide-react";
import { StudentDashboard } from "./StudentDashboard";
import { LenderDashboard } from "./LenderDashboard";
import { WalletStatus } from "@/src/components/solana/WalletStatus";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Separator } from "@/src/components/ui/separator";
import { getStudentVerification, loadStudentVerification, saveStudentVerification } from "@/src/lib/studentVerification";
import campfiLogo from "@/src/assets/logo-campfi.webp";

export function AppDashboard() {
  const location = useLocation();
  const { publicKey } = useWallet();
  const [searchParams] = useSearchParams();
  const locationState = location.state as { role?: "student" | "lender" } | null;
  const queryRole = searchParams.get("role");
  const storedRole =
    typeof window !== "undefined" ? localStorage.getItem("campusfi.role") : null;
  const initialRole =
    locationState?.role === "student" || locationState?.role === "lender"
      ? locationState.role
      : queryRole === "student" || queryRole === "lender"
        ? queryRole
        : storedRole === "student" || storedRole === "lender"
          ? storedRole
          : null;
  const [role] = useState<"student" | "lender" | null>(initialRole);
  const [notice, setNotice] = useState<string | null>(null);
  const [isStudentVerified, setIsStudentVerified] = useState(false);

  useEffect(() => {
    if (role !== "student") return;

    const walletAddress = publicKey?.toBase58();
    if (!walletAddress) {
      setIsStudentVerified(false);
      return;
    }

    const cachedVerification = loadStudentVerification(walletAddress);
    if (cachedVerification?.status === "verified") {
      setIsStudentVerified(true);
      setNotice(null);
      return;
    }

    let isMounted = true;

    getStudentVerification(walletAddress)
      .then((verification) => {
        if (!isMounted || verification?.status !== "verified") return;
        saveStudentVerification(verification, walletAddress);
        setIsStudentVerified(true);
        setNotice(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsStudentVerified(false);
        setNotice(err instanceof Error ? err.message : "Could not restore student verification.");
      });

    return () => {
      isMounted = false;
    };
  }, [publicKey, role]);

  useEffect(() => {
    if (location.pathname === "/app") {
      setNotice(null);
    }
  }, [location.pathname]);

  if (!role) {
    return <Navigate to="/onboarding" replace />;
  }

  const portalTitle = role === "student" ? "Borrower Portal" : "Lender Portal";
  const portalDescription =
    role === "student"
      ? "Verify your identity, build reputation, and manage campus loans."
      : "Track funded positions and discover verified student loan requests.";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row">
      <aside className="w-full border-b bg-card text-card-foreground md:w-72 md:border-b-0 md:border-r">
        <div className="h-20 flex items-center px-6 border-b shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-11 w-11 overflow-hidden rounded-xl bg-black shadow-sm">
              <img src={campfiLogo} alt="CampusFi logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="block font-bold text-lg leading-none tracking-tight">CampusFi</span>
              <span className="text-xs text-muted-foreground">Devnet app</span>
            </div>
          </Link>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-1 md:min-h-[calc(100vh-5rem)]">
          <Card className="mb-5 border-primary/20 bg-primary/5">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Registered role</div>
                  <div className="mt-1 text-sm font-semibold capitalize">{role}</div>
                </div>
                <Badge className="bg-primary text-primary-foreground">{role === "student" ? "Borrower" : "Lender"}</Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border bg-background p-2">
                  <div className="font-mono text-[9px] uppercase text-muted-foreground">Network</div>
                  <div className="mt-1 font-semibold">Devnet</div>
                </div>
                <div className="rounded-lg border bg-background p-2">
                  <div className="font-mono text-[9px] uppercase text-muted-foreground">Program</div>
                  <div className="mt-1 font-semibold text-primary">Live</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-2 px-2 mt-4 font-mono">Platform</div>
          {role === "student" ? (
            <>
              <NavItem to="/app/profile" icon={<UserCircle2 className="h-4 w-4" />} label="Reputation Profile" />
              <NavItem
                to="/app"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="My Loan"
                onBlocked={() => setNotice("Verify identity first before opening My Loan.")}
                requiresStudentVerification
                isStudentVerified={isStudentVerified}
              />
            </>
          ) : (
            <>
              <NavItem to="/app" icon={<LayoutDashboard className="h-4 w-4" />} label="Portfolio" />
              <NavItem to="/app/marketplace" icon={<Search className="h-4 w-4" />} label="Marketplace" />
            </>
          )}

          <div className="mt-auto pt-4 flex flex-col gap-1">
             <Separator className="mb-3" />
             <NavItem to="/app/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
             <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="min-h-20 bg-card border-b flex items-center justify-between gap-4 px-5 py-4 shrink-0 md:px-8">
          <div className="hidden min-w-0 md:block">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-foreground">{portalTitle}</h2>
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                Devnet
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{portalDescription}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <WalletStatus />
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
               {role === "student" ? "S" : "L"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
           {notice && (
             <Alert className="mx-auto mb-6 max-w-6xl border-blue-200 bg-blue-50 text-blue-800">
               <ShieldCheck className="h-4 w-4" />
               <AlertDescription className="text-blue-800">{notice}</AlertDescription>
             </Alert>
           )}
           <Routes>
             <Route path="/" element={role === "student" ? <StudentDashboard /> : <LenderDashboard />} />
             <Route path="/profile" element={role === "student" ? <StudentDashboard showProfile /> : <LenderDashboard />} />
             <Route path="/marketplace" element={role === "lender" ? <LenderDashboard showMarketplace /> : <StudentDashboard />} />
             <Route path="*" element={<div className="text-slate-500">Page not found or not mapped in demo</div>} />
           </Routes>
        </div>
      </main>
    </div>
  );
}

function LogoutButton() {
  const navigate = useNavigate();
  const { disconnect } = useWallet();

  async function handleLogout() {
    await disconnect().catch(() => undefined);
    localStorage.removeItem("campusfi.role");
    localStorage.removeItem("campusfi.studentVerification");
    navigate("/onboarding", { replace: true });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Log out
    </button>
  );
}

function NavItem({
  to,
  icon,
  label,
  onBlocked,
  requiresStudentVerification = false,
  isStudentVerified = false,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onBlocked?: () => void;
  requiresStudentVerification?: boolean;
  isStudentVerified?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === to;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!requiresStudentVerification) return;

    if (isStudentVerified) return;

    event.preventDefault();
    onBlocked?.();
    navigate("/app/profile");
  }
  
  return (
    <Link 
      to={to} 
      onClick={handleClick}
      className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isActive 
        ? "bg-primary text-primary-foreground shadow-sm" 
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      <span className="font-semibold tracking-wide">{label}</span>
    </Link>
  );
}
