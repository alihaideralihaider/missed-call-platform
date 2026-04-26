import Link from "next/link";
import {
  getPlatformPromotionHref,
  PlatformPromotion,
} from "@/lib/platformPromotions";

type Props = {
  promo: PlatformPromotion;
};

export default function PlatformPromoCard({ promo }: Props) {
  const href = getPlatformPromotionHref(promo);
  const isExternal = promo.target_type === "external";

  const content = (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            SaanaOS Promotion
          </p>
          <h3 className="mt-1 text-base font-bold text-neutral-900">
            {promo.title}
          </h3>
          <p className="mt-2 text-sm text-neutral-600">{promo.short_body}</p>
        </div>

        {promo.icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg text-neutral-700">
            {promo.icon}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Platform-managed placement. Not editable by restaurant owners.
        </p>
        <span className="shrink-0 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white">
          {promo.cta_label || "Open"}
        </span>
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="block">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
