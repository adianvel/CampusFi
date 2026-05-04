import { useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { UserCircle2, Settings, LogOut, Wallet, LayoutDashboard, Search, FileText } from "lucide-react";
import { StudentDashboard } from "./StudentDashboard";
import { LenderDashboard } from "./LenderDashboard";

export function AppDashboard() {
  const [role, setRole] = useState<"student" | "lender">("student");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#050505] text-white flex flex-col border-r border-white/10">
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-[#00FFA3] flex items-center justify-center">
              <span className="text-black font-display font-bold text-xs leading-none italic">C</span>
            </div>
            <span className="font-display italic text-lg tracking-tight">CampusFi App</span>
          </Link>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-1">
          <div className="mb-4 bg-white/5 rounded-sm p-3 border border-white/10">
             <div className="text-[9px] text-white/40 mb-2 uppercase tracking-widest font-mono">Demo Role Switch</div>
             <div className="flex bg-[#0A0A0A] rounded-sm p-1 border border-white/10">
                <button 
                  onClick={() => setRole("student")}
                  className={`flex-1 text-[10px] py-1 tracking-widest uppercase transition-colors rounded-sm ${role === "student" ? 'bg-[#00FFA3] text-black font-bold' : 'text-white/40 hover:text-white'}`}
                >
                  Student
                </button>
                <button 
                  onClick={() => setRole("lender")}
                  className={`flex-1 text-[10px] py-1 tracking-widest uppercase transition-colors rounded-sm ${role === "lender" ? 'bg-[#00FFA3] text-black font-bold' : 'text-white/40 hover:text-white'}`}
                >
                  Lender
                </button>
             </div>
          </div>

          <div className="text-[9px] text-white/40 uppercase tracking-widest mb-2 px-2 mt-4 font-mono">Platform</div>
          {role === "student" ? (
            <>
              <NavItem to="/app" icon={<LayoutDashboard className="h-4 w-4" />} label="My Loan" />
              <NavItem to="/app/profile" icon={<UserCircle2 className="h-4 w-4" />} label="Reputation Profile" />
            </>
          ) : (
            <>
              <NavItem to="/app" icon={<LayoutDashboard className="h-4 w-4" />} label="Portfolio" />
              <NavItem to="/app/marketplace" icon={<Search className="h-4 w-4" />} label="Marketplace" />
            </>
          )}

          <div className="mt-auto pt-4 flex flex-col gap-1">
             <NavItem to="/app/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
             <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors text-sm font-light">
                <LogOut className="h-4 w-4" />
                Exit App
             </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#050505] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
          <h2 className="font-serif italic text-white hidden md:block">
            {role === "student" ? "Borrower Portal" : "Lender Portal"}
          </h2>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="hidden sm:inline-flex bg-white/5">
               <Wallet className="h-3 w-3 mr-1 text-[#00FFA3]" />
               <span className="font-mono">E2Fj...9a2B</span>
            </Badge>
            <div className="h-8 w-8 rounded-sm bg-[#00FFA3] flex items-center justify-center text-black font-bold font-serif italic border border-white/20">
               {role === "student" ? "S" : "L"}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-[#0A0A0A]">
           <Routes>
             <Route path="/" element={role === "student" ? <StudentDashboard /> : <LenderDashboard />} />
             <Route path="/profile" element={role === "student" ? <StudentDashboard showProfile /> : <LenderDashboard />} />
             <Route path="/marketplace" element={role === "lender" ? <LenderDashboard showMarketplace /> : <StudentDashboard />} />
             <Route path="*" element={<div className="text-white/50">Page not found or not mapped in demo</div>} />
           </Routes>
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-colors text-sm font-light ${
        isActive 
        ? "bg-[#00FFA3]/10 text-[#00FFA3]" 
        : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="font-serif italic tracking-wide">{label}</span>
    </Link>
  );
}
