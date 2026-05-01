import { saanaColors } from "@/lib/brand/colors";

type BrandPatternProps = {
  className?: string;
  density?: "light" | "medium";
};

export function BrandPattern({
  className = "",
  density = "light",
}: BrandPatternProps) {
  const opacity = density === "medium" ? 0.18 : 0.1;

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 720 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity={opacity} stroke={saanaColors.navy} strokeWidth="2">
        <path d="M80 74H122C129.7 74 136 80.3 136 88V145C136 152.7 129.7 159 122 159H80C72.3 159 66 152.7 66 145V88C66 80.3 72.3 74 80 74Z" />
        <path d="M84 91H118M84 111H118M84 131H108" />
        <path d="M270 54H352C361.9 54 370 62.1 370 72V126C370 135.9 361.9 144 352 144H316L284 171V144H270C260.1 144 252 135.9 252 126V72C252 62.1 260.1 54 270 54Z" />
        <path d="M528 75V156M507 75V156M549 75V156" />
        <path d="M598 71C621 71 640 90 640 113C640 143 612 164 598 177C584 164 556 143 556 113C556 90 575 71 598 71Z" />
      </g>
      <g opacity={opacity + 0.08} stroke={saanaColors.orange} strokeWidth="2">
        <path d="M155 200H210M210 200L234 176M210 200L234 224" />
        <circle cx="156" cy="200" r="7" fill={saanaColors.orange} stroke="none" />
        <circle cx="438" cy="82" r="7" fill={saanaColors.orange} stroke="none" />
        <circle cx="476" cy="136" r="7" fill={saanaColors.orange} stroke="none" />
        <path d="M438 82H476V136H512" />
        <path d="M88 211C100 190 135 190 147 211" />
      </g>
    </svg>
  );
}
