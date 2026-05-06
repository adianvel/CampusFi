import { Link } from "react-router-dom";
import { Button } from "../ui/button";

export function Navbar() {
  return (
    <nav className="border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-sm bg-[#00FFA3] flex items-center justify-center">
                <span className="text-black font-display font-bold text-lg leading-none italic">C</span>
              </div>
              <span className="font-display italic text-xl tracking-tight text-white">CampusFi</span>
            </Link>
            
            <div className="hidden md:flex gap-6">
              <a href="#how-it-works" className="text-[10px] font-mono tracking-widest uppercase text-white/50 hover:text-[#00FFA3] transition-colors">How it Works</a>
              <a href="#lenders" className="text-[10px] font-mono tracking-widest uppercase text-white/50 hover:text-[#00FFA3] transition-colors">For Lenders</a>
              <a href="#students" className="text-[10px] font-mono tracking-widest uppercase text-white/50 hover:text-[#00FFA3] transition-colors">For Students</a>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/app">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/app">
              <Button size="sm">Launch App</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
