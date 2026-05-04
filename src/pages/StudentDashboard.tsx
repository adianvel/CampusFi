import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { CheckCircle2, AlertCircle, TrendingUp, Clock, FileText, ArrowRight } from "lucide-react";

export function StudentDashboard({ showProfile = false }: { showProfile?: boolean }) {
  const [loanStatus, setLoanStatus] = useState<"none" | "requested" | "active">("none");

  if (showProfile) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
           <h1 className="text-3xl font-serif italic text-white">Reputation Profile</h1>
           <p className="text-white/50 font-light">Your verified on-chain credentials.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
           <Card className="md:col-span-1 border-[#00FFA3]/20 bg-[#00FFA3]/5">
              <CardHeader>
                 <CardTitle className="text-[#00FFA3]">Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                 <div className="text-6xl font-serif italic text-[#00FFA3] mb-2">85</div>
                 <Badge variant="success">Low Risk Tier</Badge>
              </CardContent>
           </Card>

           <Card className="md:col-span-2">
              <CardHeader>
                 <CardTitle>Verification Vectors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 {[
                   { label: "Identity (KTM & Email)", status: "Verified", certs: "UI, .ac.id", color: "text-[#00FFA3]" },
                   { label: "Academic Standings", status: "Verified", certs: "GPA > 3.5", color: "text-[#00FFA3]" },
                   { label: "Portfolio / Github", status: "Verified", certs: "14 repos, 2 hackathons", color: "text-[#00FFA3]" },
                   { label: "Repayment History", status: "Pending", certs: "No past loans yet", color: "text-white/40" },
                 ].map((v, i) => (
                   <div key={i} className="flex justify-between items-center p-3 border border-white/10 rounded-sm bg-white/5">
                      <div className="flex items-center gap-3">
                         {v.status === "Verified" ? <CheckCircle2 className={`h-4 w-4 ${v.color}`} /> : <AlertCircle className={`h-4 w-4 ${v.color}`} />}
                         <span className="font-light text-sm text-white/90">{v.label}</span>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-mono tracking-widest uppercase text-white/50">{v.status}</div>
                         <div className="text-sm text-white/80">{v.certs}</div>
                      </div>
                   </div>
                 ))}
                 
                 <Button variant="outline" className="w-full mt-4">Connect More Accounts</Button>
              </CardContent>
           </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
         <h1 className="text-3xl font-serif italic text-white">Loan Overview</h1>
         <p className="text-white/50 font-light">Manage your active education loans.</p>
      </div>

      {loanStatus === "none" && (
         <Card className="border-dashed border-2 bg-white/5">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
               <FileText className="h-10 w-10 text-white/30 mb-4" />
               <h3 className="text-xl font-serif italic text-white mb-2">No active loans</h3>
               <p className="text-white/50 max-w-sm mb-6 font-light">Your reputation score allows you to borrow up to $300 at a 1.2% monthly rate.</p>
               <Button onClick={() => setLoanStatus("requested")}>Request First Loan</Button>
            </CardContent>
         </Card>
      )}

      {loanStatus === "requested" && (
         <Card>
            <CardHeader className="bg-yellow-500/10 border-b border-white/10 rounded-t-lg">
               <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-yellow-500">Laptop Upgrade Fund</CardTitle>
                    <CardDescription className="text-yellow-500/60">Requested 2 hours ago</CardDescription>
                  </div>
                  <Badge variant="warning">Funding</Badge>
               </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               <div>
                  <div className="flex justify-between text-[11px] uppercase tracking-widest font-mono text-white mb-2">
                     <span className="text-[#00FFA3]">$90 Funded</span>
                     <span className="text-white/50">Target: $150</span>
                  </div>
                  <div className="h-1 bg-white/10 w-full">
                     <div className="h-full bg-[#00FFA3] w-[60%]" />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-sm border border-white/10">
                     <span className="block text-[9px] uppercase tracking-widest text-white/40 mb-1">Term</span>
                     <span className="font-mono text-sm text-white">3 Months</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-sm border border-white/10">
                     <span className="block text-[9px] uppercase tracking-widest text-white/40 mb-1">Interest</span>
                     <span className="font-mono text-sm text-white">1.2% / mo</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-sm border border-white/10">
                     <span className="block text-[9px] uppercase tracking-widest text-white/40 mb-1">Lenders</span>
                     <span className="font-mono text-sm text-white">2</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-sm border border-white/10">
                     <span className="block text-[9px] uppercase tracking-widest text-white/40 mb-1">Est. Payment</span>
                     <span className="font-mono text-sm text-[#00FFA3]">$51.80 / mo</span>
                  </div>
               </div>
            </CardContent>
            <CardFooter className="bg-black/20 border-t border-white/10 justify-end rounded-b-lg">
               {/* Mock action for demo */}
               <Button variant="outline" className="mr-2 border-white/20 text-white/70">Cancel Request</Button>
               <Button onClick={() => setLoanStatus("active")} className="bg-[#00FFA3] text-black">Simulate Fully Funded</Button>
            </CardFooter>
         </Card>
      )}

      {loanStatus === "active" && (
         <div className="space-y-6">
           <Card className="border-[#00FFA3]/30 bg-[#00FFA3]/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Badge variant="success">Active</Badge>
              </div>
              <CardHeader className="bg-[#00FFA3]/10 border-b border-[#00FFA3]/20">
                <CardTitle className="text-xl text-[#00FFA3]">Laptop Upgrade Fund</CardTitle>
                <CardDescription className="text-[#00FFA3]/60">Escrow fully disbursed to your wallet.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                 <div className="grid md:grid-cols-2 gap-8">
                    <div>
                       <div className="text-4xl font-serif italic text-white mb-1">$51.80</div>
                       <div className="text-[10px] text-white/50 tracking-widest uppercase font-mono mb-6">Next Payment Due in 14 days</div>
                       
                       <Button className="w-full bg-[#00FFA3] text-black hover:bg-white transition-colors">Pay Installment 1/3</Button>
                    </div>
                    
                    <div className="space-y-4 font-mono text-xs">
                       <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="text-white/40 uppercase tracking-widest">Principal Remaining</span>
                          <span className="text-white">$150.00</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="text-white/40 uppercase tracking-widest">Interest Accrued</span>
                          <span className="text-white">$1.80</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-white/40 uppercase tracking-widest">Credit Passport Impact</span>
                          <span className="text-[#00FFA3] flex items-center gap-1">+10 pts <TrendingUp className="h-3 w-3" /></span>
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
           
           <h3 className="font-serif italic text-xl pt-4 text-white">Repayment Schedule</h3>
           <Card className="overflow-hidden border-white/10">
              <CardContent className="p-0">
                 <div className="divide-y divide-white/10">
                    {[
                      { num: 1, due: "Aug 15, 2026", amount: "$51.80", status: "Upcoming", action: true },
                      { num: 2, due: "Sep 15, 2026", amount: "$51.80", status: "Locked", action: false },
                      { num: 3, due: "Oct 15, 2026", amount: "$51.80", status: "Locked", action: false },
                    ].map((row, i) => (
                      <div key={i} className={`p-4 flex items-center justify-between ${row.status === "Upcoming" ? "bg-white/5" : "bg-transparent opacity-50"}`}>
                         <div className="flex items-center gap-4">
                            <div className={`h-8 w-8 rounded-sm flex items-center justify-center font-mono text-[10px] ${row.status === "Upcoming" ? "bg-[#00FFA3] text-black" : "bg-white/10 text-white flex items-center justify-center"}`}>
                               0{row.num}
                            </div>
                            <div>
                               <div className="font-serif italic text-white">{row.due}</div>
                               <div className="text-[10px] font-mono tracking-widest uppercase text-[#00FFA3]">{row.status}</div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="font-mono text-sm text-white">{row.amount}</div>
                         </div>
                      </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
         </div>
      )}
    </div>
  );
}
