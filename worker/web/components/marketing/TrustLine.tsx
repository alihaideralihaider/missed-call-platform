import { saanaColors } from "@/lib/brand/colors";
import { saanaBrandCopy } from "@/lib/brand/copy";

type TrustLineProps = {
  className?: string;
};

export function TrustLine({ className = "" }: TrustLineProps) {
  return (
    <div
      className={["inline-flex flex-col gap-2 text-base font-semibold", className].join(
        " ",
      )}
      style={{ color: saanaColors.navy }}
    >
      <span>{saanaBrandCopy.trustLine}</span>
      <span
        className="h-1 w-24 rounded-full"
        style={{ backgroundColor: saanaColors.orange }}
      />
    </div>
  );
}
