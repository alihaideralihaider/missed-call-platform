import { SaanaIcon } from "@/components/brand/SaanaIcon";
import { saanaColors } from "@/lib/brand/colors";
import { saanaBrandCopy } from "@/lib/brand/copy";

type SaanaLogoProps = {
  variant?: "horizontal" | "stacked";
  showTagline?: boolean;
  showTinyElements?: boolean;
  className?: string;
};

export function SaanaLogo({
  variant = "horizontal",
  showTagline = false,
  showTinyElements = false,
  className = "",
}: SaanaLogoProps) {
  const isStacked = variant === "stacked";

  return (
    <div
      role="img"
      aria-label="SaanaOS - Restaurant technology, simplified."
      className={[
        "inline-flex items-center",
        isStacked ? "flex-col gap-2 text-center" : "gap-3",
        className,
      ].join(" ")}
    >
      <SaanaIcon
        size={isStacked ? 56 : 42}
        showTinyElements={showTinyElements}
      />
      <div className={isStacked ? "" : "leading-none"}>
        <div className="text-2xl font-black tracking-normal">
          <span style={{ color: saanaColors.navy }}>Saana</span>
          <span style={{ color: saanaColors.orange }}>OS</span>
        </div>
        {showTagline ? (
          <div
            className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: saanaColors.muted }}
          >
            {saanaBrandCopy.tagline}
          </div>
        ) : null}
      </div>
    </div>
  );
}
