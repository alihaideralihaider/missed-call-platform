import { saanaColors } from "@/lib/brand/colors";

type SaanaIconProps = {
  size?: number;
  showTinyElements?: boolean;
  className?: string;
  navy?: string;
  orange?: string;
};

export function SaanaIcon({
  size = 48,
  showTinyElements = false,
  className,
  navy = saanaColors.navy,
  orange = saanaColors.orange,
}: SaanaIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="30" fill={saanaColors.softOrange} />
      <path
        d="M18 39C19.4 29.3 24.9 23 32 23C39.1 23 44.6 29.3 46 39"
        stroke={navy}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M15 40H49"
        stroke={navy}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M26 46H38"
        stroke={navy}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M32 18V14"
        stroke={orange}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="32" cy="13" r="3" fill={orange} />
      <path
        d="M24 34H29L32 30L35 34H40"
        stroke={orange}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="34" r="2.5" fill={orange} />
      <circle cx="41" cy="34" r="2.5" fill={orange} />

      {showTinyElements ? (
        <>
          <path
            d="M12 23V16M9 16V23M15 16V23"
            stroke={navy}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M48 18H56C57.1 18 58 18.9 58 20V25C58 26.1 57.1 27 56 27H52L49 30V27H48C46.9 27 46 26.1 46 25V20C46 18.9 46.9 18 48 18Z"
            stroke={orange}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8 48H15M15 48L18 45M15 48L18 51"
            stroke={orange}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M48 49C50 46.5 54 46.5 56 49"
            stroke={navy}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="52" cy="45" r="2" stroke={navy} strokeWidth="1.6" />
          <circle cx="12" cy="52" r="2" fill={orange} />
          <circle cx="55" cy="36" r="2" fill={navy} />
        </>
      ) : null}
    </svg>
  );
}
