import Link from "next/link";
import type { ReactNode } from "react";

import { saanaColors } from "@/lib/brand/colors";

type CTAButtonProps = {
  children: ReactNode;
  href?: string;
  className?: string;
  variant?: "primary" | "secondary";
};

export function CTAButton({
  children,
  href,
  className = "",
  variant = "primary",
}: CTAButtonProps) {
  const baseClass =
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClass =
    variant === "primary"
      ? "text-white focus:ring-orange-500"
      : "border bg-white focus:ring-slate-300";
  const style =
    variant === "primary"
      ? { backgroundColor: saanaColors.orange }
      : {
          borderColor: saanaColors.border,
          color: saanaColors.navy,
        };
  const combinedClass = [baseClass, variantClass, className].join(" ");

  if (href) {
    return (
      <Link href={href} className={combinedClass} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={combinedClass} style={style}>
      {children}
    </button>
  );
}
