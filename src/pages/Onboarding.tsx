import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { BarChart3, Check, GraduationCap, Lock, WalletCards } from "lucide-react";
import campfiLogo from "@/src/assets/logo-campfi.webp";

type Role = "student" | "lender";

const roleOptions: Record<
  Role,
  {
    title: string;
    description: string;
    icon: typeof GraduationCap;
  }
> = {
  student: {
    title: "I'm a Student",
    description: "Access education capital and build your reputation profile.",
    icon: GraduationCap,
  },
  lender: {
    title: "I'm a Lender",
    description: "Fund verified student loans and track repayments.",
    icon: BarChart3,
  },
};

export function Onboarding() {
  const navigate = useNavigate();
  const { connected } = useWallet();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "lender" ? "lender" : "student";
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);

  const dashboardPath = useMemo(() => {
    return `/app?role=${selectedRole}`;
  }, [selectedRole]);

  useEffect(() => {
    localStorage.setItem("campusfi.role", selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    if (!connected) return;

    localStorage.setItem("campusfi.role", selectedRole);
    navigate(dashboardPath, {
      replace: true,
      state: { role: selectedRole },
    });
  }, [connected, dashboardPath, navigate, selectedRole]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#e8eaee] px-6 py-10 text-[#07152f]">
      <section className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <Link to="/" className="mb-5 inline-flex items-center gap-3 text-sm font-semibold text-[#2563eb]">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-black shadow-sm">
              <img src={campfiLogo} alt="CampusFi logo" className="h-full w-full object-cover" />
            </span>
            <span>CampusFi</span>
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Get started with CampusFi
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-6 text-[#5d687a]">
            Choose your role, connect your wallet, then continue to your dashboard.
          </p>
        </div>

        <div className="rounded-xl border border-white/80 bg-white/80 p-4 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(roleOptions) as Role[]).map((role) => {
              const option = roleOptions[role];
              const Icon = option.icon;
              const isSelected = selectedRole === role;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  aria-pressed={isSelected}
                  className={`relative min-h-[210px] rounded-lg border p-6 text-left transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-[#2563eb] bg-[#eff6ff] shadow-[0_18px_44px_rgba(37,99,235,0.16)]"
                      : "border-[#d8dee8] bg-white hover:border-[#9db8f5]"
                  }`}
                >
                  <div
                    className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-[#2563eb] bg-[#2563eb] text-white"
                        : "border-[#cbd5e1] text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </div>

                  <div
                    className={`mb-10 flex h-16 w-16 items-center justify-center rounded-lg ${
                      isSelected ? "bg-[#2563eb] text-white" : "bg-[#eef2f7] text-[#2563eb]"
                    }`}
                  >
                    <Icon className="h-8 w-8" strokeWidth={1.8} aria-hidden />
                  </div>

                  <h2 className="text-xl font-semibold">{option.title}</h2>
                  <p className="mt-2 max-w-[240px] text-sm leading-6 text-[#5d687a]">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-[#d8dee8] bg-[#f8fafc] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <WalletCards className="h-4 w-4 text-[#2563eb]" aria-hidden />
                  Connect your wallet
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  We never store your keys.
                </p>
              </div>
              <WalletMultiButton className="campusfi-onboarding-wallet-button">
                Connect Wallet
              </WalletMultiButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
