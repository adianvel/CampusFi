import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { ArrowUpRight, ShieldCheck, Activity, Users, Filter, ArrowRight, Wallet } from "lucide-react";

export function LenderDashboard({ showMarketplace = false }: { showMarketplace?: boolean }) {
  if (showMarketplace) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
           <div>
              <h1 className="text-3xl font-serif italic text-white">Marketplace</h1>
              <p className="text-white/50 font-light">Fund verified students based on reputation.</p>
           </div>
           <Button variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/5">
              <Filter className="h-4 w-4" /> Filters
           </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[
             { id: "ARF-92X", use: "Laptop Upgrade Fund", amount: "$150", term: "3 mo", filled: 60, rate: "1.2%", score: 85, tier: "Low Risk", uni: "Universitas Indonesia" },
             { id: "BTN-11Y", use: "AWS Certification", amount: "$80", term: "1 mo", filled: 20, rate: "1.8%", score: 72, tier: "Med Risk", uni: "ITB" },
             { id: "CHR-44Z", use: "Research Travel", amount: "$250", term: "6 mo", filled: 0, rate: "1.0%", score: 92, tier: "Low Risk", uni: "UGM" },
             { id: "DNM-00A", use: "Design Software Sub", amount: "$50", term: "2 mo", filled: 90, rate: "2.5%", score: 60, tier: "High Risk", uni: "Universitas Brawijaya" },
           ].map((loan, i) => (
             <Card key={i} className="hover:border-[#00FFA3]/50 transition-colors cursor-pointer group flex flex-col bg-white/5 border-white/10 relative overflow-hidden rounded-sm">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-3">
                     <div className="font-mono text-[10px] text-white/50 py-1 tracking-widest">{loan.id}</div>
                     <Badge variant={loan.tier === "Low Risk" ? "success" : loan.tier === "Med Risk" ? "warning" : "secondary"}>
                        {loan.tier}
                     </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight group-hover:text-[#00FFA3] transition-colors font-serif italic text-white/90">{loan.use}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1 text-xs text-white/40">
                     <ShieldCheck className="h-3 w-3 text-[#00FFA3]" /> {loan.uni}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                   <div className="grid grid-cols-2 gap-2 text-[11px] bg-transparent border-t border-white/10 pt-4 font-mono">
                      <div>
                         <div className="text-white/40 uppercase tracking-widest mb-1">Reputation</div>
                         <div className="font-bold text-white">{loan.score}/100</div>
                      </div>
                      <div>
                         <div className="text-white/40 uppercase tracking-widest mb-1">Return</div>
                         <div className="font-bold text-[#00FFA3]">{loan.rate} <span className="font-light text-[9px] text-white/50">/mo</span></div>
                      </div>
                   </div>

                   <div className="pt-2">
                     <div className="flex justify-between text-[9px] uppercase tracking-widest mb-1 items-end">
                        <span className="text-[#00FFA3]">{loan.filled}% Funded</span>
                        <span className="text-white/50 font-mono">Goal: {loan.amount}</span>
                     </div>
                     <div className="h-1 bg-white/10 w-full relative">
                        <div className="absolute top-0 bottom-0 left-0 bg-[#00FFA3]" style={{ width: `${loan.filled}%` }} />
                     </div>
                   </div>
                </CardContent>
                <CardFooter className="pt-0 pb-6 px-6 mt-auto">
                   <Button className="w-full bg-[#0A0A0A] text-white border border-white/20 hover:bg-[#111] gap-2 rounded-sm font-light">
                     Review Profile <ArrowRight className="h-3 w-3" />
                   </Button>
                </CardFooter>
             </Card>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-8">
         <h1 className="text-3xl font-serif italic text-white">Portfolio Overview</h1>
         <p className="text-white/50 font-light">Track your returns and active funded loans.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
         <Card className="bg-white/5 border-white/10 rounded-sm">
            <CardContent className="pt-6">
               <div className="text-white/40 text-[9px] font-mono tracking-widest uppercase mb-2 flex items-center gap-2">
                  <Wallet className="h-3 w-3" /> Active Principal
               </div>
               <div className="text-3xl font-serif italic text-white">$1,250.00</div>
               <div className="text-[10px] text-white/50 mt-2 font-mono uppercase tracking-widest">Across 12 students</div>
            </CardContent>
         </Card>
         <Card className="bg-white/5 border-white/10 rounded-sm">
            <CardContent className="pt-6">
               <div className="text-white/40 text-[9px] font-mono tracking-widest uppercase mb-2 flex items-center gap-2">
                  <Activity className="h-3 w-3" /> Avg. Return
               </div>
               <div className="text-3xl font-serif italic text-[#00FFA3]">1.4% <span className="text-lg text-[#00FFA3]/50">/ mo</span></div>
               <div className="text-[10px] text-[#00FFA3] mt-2 flex items-center gap-1 font-mono uppercase tracking-widest">
                  <ArrowUpRight className="h-3 w-3" /> Expected $17.50 this month
               </div>
            </CardContent>
         </Card>
         <Card className="bg-white/5 border-white/10 rounded-sm">
            <CardContent className="pt-6">
               <div className="text-white/40 text-[9px] font-mono tracking-widest uppercase mb-2 flex items-center gap-2">
                  <Users className="h-3 w-3" /> Default Rate
               </div>
               <div className="text-3xl font-serif italic text-white">0.0%</div>
               <div className="text-[10px] text-white/50 mt-2 font-mono uppercase tracking-widest">100% covered by first-loss reserve</div>
            </CardContent>
         </Card>
      </div>

      <h3 className="font-serif italic text-xl mb-4 text-white">Active Investments</h3>
      <Card className="bg-white/5 border-white/10 rounded-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="border-b border-white/10 text-[9px] uppercase tracking-widest font-mono text-white/40">
                  <tr>
                     <th className="px-6 py-4 font-normal">Student ID</th>
                     <th className="px-6 py-4 font-normal">Amount</th>
                     <th className="px-6 py-4 font-normal">Risk Tier</th>
                     <th className="px-6 py-4 font-normal">Next Payment</th>
                     <th className="px-6 py-4 font-normal text-right">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/10">
                  {[
                     { id: "JST-921", amount: "$100", tier: "Low Risk", next: "Aug 12", status: "On Time" },
                     { id: "ALX-404", amount: "$250", tier: "Med Risk", next: "Aug 15", status: "On Time" },
                     { id: "MNQ-772", amount: "$50", tier: "High Risk", next: "Aug 02", status: "In Grace (3d)" },
                  ].map((row, i) => (
                     <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono text-white/90">{row.id}</td>
                        <td className="px-6 py-4 font-serif italic text-white">{row.amount}</td>
                        <td className="px-6 py-4">
                           <Badge variant={row.tier.includes("Low") ? "success" : row.tier.includes("High") ? "secondary" : "warning"}>{row.tier}</Badge>
                        </td>
                        <td className="px-6 py-4 text-white/60 font-mono text-[11px] uppercase tracking-widest">{row.next}</td>
                        <td className="px-6 py-4 text-right">
                           <span className={`font-mono text-[10px] uppercase tracking-widest ${row.status.includes("Grace") ? "text-yellow-500" : "text-[#00FFA3]"}`}>
                             {row.status}
                           </span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Card>
    </div>
  );
}
