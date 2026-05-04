import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, ShieldCheck, Users, Layers, Laptop, BookOpen, Award, 
  Package, User, Plus, Shield, Network, Target, Trophy, Wallet, 
  CheckCircle2, Zap, Globe, Menu, X, Check, Book, GraduationCap
} from 'lucide-react';
import studentBg from '../assets/student-campfi.webp';
import phoneCampfi from '../assets/phone-campfi.webp';
import lenderCampfi from '../assets/lender-campfi.webp';
import solanaLogo from '../assets/solana.png';
import magicBlockLogo from '../assets/MagicBlock.png';
import campfiLogo from '../assets/logo-campfi.webp';
import heroCampfi from '../assets/hero-campfi.webp';
import togaCampfi from '../assets/toga-campfi.webp';

export function Landing() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen font-sans selection:bg-blue-600 selection:text-white">
      {/* Navbar Section */}
      <nav className="absolute top-0 w-full z-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-24 items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={campfiLogo} alt="CampusFi Logo" className="h-[100px] w-[110px] object-contain object-left" />
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-medium text-white/80 hover:text-white transition-colors">How it works</a>
              <a href="#students" className="text-sm font-medium text-white/80 hover:text-white transition-colors">For Students</a>
              <a href="#lenders" className="text-sm font-medium text-white/80 hover:text-white transition-colors">For Lenders</a>
              <a href="#about" className="text-sm font-medium text-white/80 hover:text-white transition-colors">About</a>
              <Link to="/app" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-[4px] text-sm font-medium transition-colors border border-blue-500/50">
                Get Started
              </Link>
            </div>

            <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Section 01: Hero */}
        <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-12 bg-[#000000] text-white overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center w-full"
          >
            <div className="w-full lg:w-1/2 pb-12 lg:pb-0 z-20">
              <h1 className="text-[50px] lg:text-[68px] font-bold tracking-tight mb-6 leading-[1.1] lg:leading-[61.2px]">
                Fund high-potential students <span className="text-white">before they have assets.</span>
              </h1>
              <p className="text-xl text-white/70 mb-10 max-w-lg">
                CampusFi backs ambition with capital, community, and confidence.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Link to="/app" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 hover:-translate-y-1 text-white px-8 py-4 rounded-[4px] text-lg font-medium transition-all duration-300 text-center border border-blue-500/50">
                  Explore Loans
                </Link>
                <a href="#how-it-works" className="flex items-center justify-center gap-2 text-white font-medium hover:text-blue-400 hover:translate-x-1 transition-all duration-300">
                  How it works <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            <div className="w-full lg:w-[605px] relative h-[400px] lg:h-[500px] flex justify-center items-center">
              {/* Student Photo Mask */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                className="absolute inset-0 lg:-right-32 lg:-top-16 z-0 flex justify-center items-center pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_80%)]">
                 <img 
                   src={heroCampfi} 
                   alt="Ambitious Student" 
                   className="w-[120%] h-[120%] object-cover object-center" 
                 />
              </motion.div>

            </div>
          </motion.div>
        </section>

        {/* Section 02: Opportunity */}
        <section className="min-h-screen flex flex-col justify-center py-16 bg-[#efefef] text-slate-900 overflow-hidden relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-7xl w-full px-6 lg:px-8 relative z-10"
          >
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-xl">
                <h2 className="text-4xl lg:text-[3.5rem] font-bold tracking-tight mb-8 leading-[1.15] text-slate-900">
                  Education today.<br />
                  <span className="text-black">Opportunity</span> tomorrow.
                </h2>
                <p className="text-lg text-slate-600 mb-14 max-w-md leading-relaxed">
                  CampusFi helps students access education capital without collateral, powered by reputation, not assets.
                </p>
                
                <div className="flex items-start gap-8 sm:gap-12">
                  {/* Icon 1 */}
                  <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center gap-4 cursor-pointer group">
                    <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock group-hover:scale-110 transition-transform"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">No Collateral</span>
                  </motion.div>
                  
                  {/* Divider */}
                  <div className="w-[1px] h-12 bg-slate-200 mt-2 transition-colors"></div>

                  {/* Icon 2 */}
                  <motion.div whileHover={{ y: -5 }} className="flex flex-col items-center gap-4 cursor-pointer group">
                    <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <Users className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">Reputation First</span>
                  </motion.div>

                </div>
              </div>
              <div className="flex justify-center mt-12 lg:mt-0">
                 {/* Placeholder for uploaded 3D Illustration */}
                 <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                    {/* Add your image source below */}
                    <motion.img 
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      src={togaCampfi} 
                      alt="Opportunity Graphic Placeholder" 
                      className="w-full h-full object-contain"
                    />
                 </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section 03: For Students */}
        <section id="students" className="min-h-screen flex flex-col justify-center py-16 bg-[#efefef] text-slate-900 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-7xl w-full px-6 lg:px-8"
          >
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 flex justify-center relative">
                <motion.img 
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  src={studentBg} 
                  alt="Student App UI" 
                  className="w-full max-w-sm object-contain hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                  For <span className="text-black">students</span> building the future.
                </h2>
                <p className="text-lg text-slate-600 mb-12">
                  Get the support you need for what matters most.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 text-center">
                  {[
                    { icon: Laptop, label: "Laptop" },
                    { icon: BookOpen, label: "Courses" },
                    { icon: Award, label: "Certification" },
                    { icon: Package, label: "Projects" },
                    { icon: User, label: "Competitions" },
                    { icon: Plus, label: "More" },
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="flex flex-col items-center gap-3 cursor-pointer group"
                    >
                      <div className="h-14 w-14 rounded-full border border-blue-200 bg-white flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <span className="font-semibold text-xs text-slate-800 group-hover:text-blue-600 transition-colors">{item.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section 04: For Lenders */}
        <section id="lenders" className="min-h-screen flex flex-col justify-center py-16 bg-[#000000] text-white">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-7xl w-full px-6 lg:px-8"
          >
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                  For <span className="text-white">lenders</span> making real impact.
                </h2>
                <p className="text-lg text-white/70 mb-12">
                  Fund students. Earn returns. Create change.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { icon: Shield, title: "Transparent Risk", desc: "Clear profiles and real-time scoring" },
                    { icon: Network, title: "Diversity Ready", desc: "Spread across courses, institutions or goals." },
                    { icon: Target, title: "Built for Protection", desc: "Lender-first design with fair policies & recourse." },
                  ].map((card, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ y: -8 }}
                      className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-6 hover:bg-blue-900/40 hover:border-blue-500/40 transition-all cursor-pointer group"
                    >
                      <card.icon className="h-8 w-8 text-blue-500 mb-6 group-hover:scale-110 group-hover:text-blue-400 transition-transform duration-300 origin-left" />
                      <h3 className="font-semibold text-base mb-2 group-hover:text-blue-400 transition-colors">{card.title}</h3>
                      <p className="text-sm text-white/60 leading-relaxed">{card.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                 <div className="w-full max-w-md">
                    <motion.img 
                      initial={{ opacity: 0, x: 50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      src={lenderCampfi} 
                      alt="Lender Dashboard UI" 
                      className="w-full h-auto hover:scale-105 transition-transform duration-500"
                    />
                 </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section 06: Simple process */}
        <section id="how-it-works" className="min-h-screen flex flex-col justify-center py-16 bg-[#000000] text-white border-t border-black">
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true, margin: "-100px" }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="mx-auto max-w-7xl w-full px-6 lg:px-8"
           >
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                 <div>
                    <h2 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                      Simple process,<br />
                      <span className="text-white">real support.</span>
                    </h2>
                    <p className="text-lg text-slate-400 mb-12 max-w-md">
                      From application to repayment, we make it easy with guidance every step of the way.
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4">
                       {[
                         { icon: ShieldCheck, label: "Verify" },
                         { icon: Users, label: "Build Profile" },
                         { icon: Target, label: "Request Loan" },
                         { icon: Wallet, label: "Get Funded" },
                       ].map((step, i) => (
                         <React.Fragment key={i}>
                           <motion.div 
                             whileHover={{ scale: 1.1, y: -5 }}
                             className="flex flex-col items-center gap-3 w-16 text-center cursor-pointer group"
                           >
                              <div className="h-12 w-12 rounded-full border border-blue-900 bg-slate-900/50 flex items-center justify-center text-blue-500 z-10 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors duration-300">
                                <step.icon className="h-5 w-5" />
                              </div>
                              <span className="font-semibold text-[10px] leading-tight text-slate-300 group-hover:text-white transition-colors">{step.label}</span>
                           </motion.div>
                           {i < 3 && <div className="h-[2px] w-8 bg-blue-900/50 -mt-8 hidden sm:block"></div>}
                         </React.Fragment>
                       ))}
                    </div>
                 </div>
                 <div className="flex justify-center lg:justify-end">
                    <motion.div 
                      initial={{ opacity: 0, y: 50, rotate: -5 }}
                      whileInView={{ opacity: 1, y: 0, rotate: 6 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      className="relative max-w-sm lg:max-w-md">
                       <img 
                         src={phoneCampfi} 
                         alt="Loan Funded App Screen" 
                         className="w-full h-auto hover:rotate-0 transition-transform duration-500"
                       />
                    </motion.div>
                 </div>
              </div>
           </motion.div>
        </section>

        {/* Section 07: Solana */}
        <section className="min-h-screen flex flex-col justify-center py-16 bg-[#000000] text-white relative overflow-hidden">
           {/* Abstract grid/space background could go here */}
           <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-blue-900/20 blur-3xl rounded-[100%] scale-150 transform translate-y-1/2"></div>
           
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true, margin: "-100px" }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="mx-auto max-w-7xl w-full px-6 lg:px-8 relative z-10"
           >
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                 <div>
                    <h2 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                      On <span className="text-white">Solana.</span><br />
                      For the world.
                    </h2>
                    <p className="text-xl text-white/70 mb-12">
                      Fast, transparent, and built for scale.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-6 mb-12">
                       <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col gap-2 p-4 -ml-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                          <div className="h-10 w-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                             <Zap className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <h4 className="font-semibold text-sm group-hover:text-blue-300 transition-colors">High Performance</h4>
                          <p className="text-xs text-white/50">Built on Solana's blazing-fast network.</p>
                       </motion.div>
                       <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col gap-2 p-4 -ml-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                          <div className="h-10 w-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                             <Shield className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <h4 className="font-semibold text-sm group-hover:text-blue-300 transition-colors">Transparent</h4>
                          <p className="text-xs text-white/50">On-chain by design. Open and verifiable.</p>
                       </motion.div>
                       <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col gap-2 p-4 -ml-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                          <div className="h-10 w-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                             <Globe className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <h4 className="font-semibold text-sm group-hover:text-blue-300 transition-colors">Global Access</h4>
                          <p className="text-xs text-white/50">Borderless finance for every student.</p>
                       </motion.div>
                    </div>

                 </div>
                 <div className="flex flex-col items-center justify-center gap-12 opacity-50 lg:opacity-100">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-12">
                       <motion.img 
                         initial={{ opacity: 0, scale: 0.8 }}
                         whileInView={{ opacity: 1, scale: 1 }}
                         viewport={{ once: true }}
                         transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                         src={solanaLogo} 
                         alt="Solana Logo" 
                         className="w-[150px] h-auto object-contain" 
                       />
                       <motion.img 
                         initial={{ opacity: 0, scale: 0.8 }}
                         whileInView={{ opacity: 1, scale: 1 }}
                         viewport={{ once: true }}
                         transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                         src={magicBlockLogo} 
                         alt="MagicBlock Logo" 
                         className="w-[150px] h-auto object-contain" 
                       />
                    </div>
                    <motion.div
                       initial={{ opacity: 0, y: 10 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                       className="text-center max-w-sm"
                    >
                       <p className="text-sm text-white/60 leading-relaxed">
                         <span className="font-semibold text-white/90">MagicBlock Integration:</span> CampusFi verifies the student privately, then publishes only reputation proofs — not personal identity.
                       </p>
                    </motion.div>
                 </div>
              </div>
           </motion.div>
        </section>

        {/* Section 08: CTA */}
        <section className="min-h-[80vh] flex flex-col justify-center py-16 bg-[#efefef] text-slate-900 relative overflow-hidden">
           
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true, margin: "-100px" }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="mx-auto max-w-7xl w-full px-6 lg:px-8 relative z-10"
           >
              <div className="max-w-2xl">
                 <h2 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
                   Ready to unlock <span className="text-black">what's possible?</span>
                 </h2>
                 <p className="text-xl text-slate-600 mb-12">
                   Join CampusFi and be part of the future of education finance.
                 </p>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/app" className="bg-blue-600 hover:bg-blue-500 hover:-translate-y-1 text-white px-8 py-4 rounded-[4px] text-lg font-medium transition-all duration-300 text-center border border-blue-500/50">
                      I'm a Student
                    </Link>
                    <Link to="/app" className="bg-white border border-slate-200 hover:border-slate-300 hover:-translate-y-1 text-slate-900 px-8 py-4 rounded-[4px] text-lg font-medium transition-all duration-300 text-center">
                      I'm a Lender
                    </Link>
                 </div>
              </div>
           </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#efefef] text-slate-400 py-12 border-t border-black">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
             <img src={campfiLogo} alt="CampusFi Logo" className="h-[80px] w-[80px] object-contain object-left" />
          </div>
          <p className="text-sm text-black">
            &copy; {new Date().getFullYear()} CampusFi. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-black hover:text-black/70 transition-colors">Twitter</a>
            <a href="#" className="text-black hover:text-black/70 transition-colors">Discord</a>
            <a href="#" className="text-black hover:text-black/70 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
