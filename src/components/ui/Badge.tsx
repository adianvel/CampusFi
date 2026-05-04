import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
  children?: React.ReactNode;
  className?: string;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-[9px] font-bold tracking-widest uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-[#00FFA3] text-black": variant === "default",
          "border-transparent bg-white/10 text-white/70": variant === "secondary",
          "text-white/70 border-white/20": variant === "outline",
          "border-transparent bg-[#00FFA3]/20 text-[#00FFA3]": variant === "success",
          "border-transparent bg-yellow-500/20 text-yellow-500": variant === "warning",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
