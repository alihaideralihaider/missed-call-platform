import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="pb-10 pt-5 text-sm text-[#8796ad]">
      <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>Saana Systems — Restaurant communication, reimagined</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[#a7b6cc]">
            <Link href="/privacy" className="transition hover:text-[#f8fbff]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-[#f8fbff]">
              Terms of Service
            </Link>
            <Link href="/sms-policy" className="transition hover:text-[#f8fbff]">
              SMS Policy
            </Link>
            <Link href="/compliance" className="transition hover:text-[#f8fbff]">
              Compliance
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[#a7b6cc]">
          <Link href="/pricing" className="transition hover:text-[#f8fbff]">
            Pricing
          </Link>
          <Link
            href="/how-it-works"
            className="transition hover:text-[#f8fbff]"
          >
            How It Works
          </Link>
          <Link
            href="/restaurant-missed-call-recovery"
            className="transition hover:text-[#f8fbff]"
          >
            Missed Call Recovery
          </Link>
          <Link
            href="/sms-ordering-for-restaurants"
            className="transition hover:text-[#f8fbff]"
          >
            SMS Ordering
          </Link>
          <Link
            href="/increase-restaurant-orders"
            className="transition hover:text-[#f8fbff]"
          >
            Increase Orders
          </Link>
        </div>
      </div>
    </footer>
  );
}
