import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";

export const metadata: Metadata = {
  title: "How to Increase Restaurant Orders | SaanaOS",
  description:
    "Learn how restaurants can increase orders, reduce missed opportunities, and recover lost revenue with SaanaOS.",
};

const tactics = [
  "Recover missed calls",
  "Offer faster ordering",
  "Reduce phone bottlenecks",
  "Improve customer convenience",
  "Keep peak-hour demand from spilling over",
];

export default function IncreaseRestaurantOrdersPage() {
  return (
    <main className="min-h-screen bg-[#081120] text-[#e7eef9]">
      <div className="mx-auto max-w-[1140px] px-6 py-8 md:py-10">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)] md:p-8">
          <div className="inline-flex items-center rounded-full border border-[#ff8a3d]/20 bg-[#ff8a3d]/12 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#ffc8a2]">
            Increase restaurant orders
          </div>
          <h1 className="mt-5 text-[42px] font-black leading-[0.95] tracking-[-0.05em] text-[#f8fbff] md:text-6xl md:leading-none md:tracking-[-0.045em]">
            How to Increase Restaurant Orders
          </h1>
          <p className="mt-4 max-w-[760px] text-lg text-[#a7b6cc] md:text-xl">
            Restaurants can increase order volume by removing friction,
            reducing missed calls, and giving customers faster ways to place
            orders. SaanaOS helps capture orders that would otherwise be lost.
          </p>
        </section>

        <section className="py-8 md:py-10">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Why restaurants lose orders
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            Busy lines, missed calls, staffing pressure, and slow phone
            response all create friction that pushes customers to competitors.
          </p>
        </section>

        <section className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            How SaanaOS helps increase orders
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            SaanaOS turns missed calls into SMS ordering opportunities,
            helping restaurants recover lost demand and convert more customer
            intent into completed orders.
          </p>
        </section>

        <section className="py-5">
          <h2 className="mb-5 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Practical ways to increase restaurant orders
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tactics.map((tactic) => (
              <div
                key={tactic}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]"
              >
                <p className="text-lg font-semibold text-[#f8fbff]">{tactic}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Related solutions
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            To see the full product flow, visit{" "}
            <Link
              href="/how-it-works"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              How it works
            </Link>
            . For a deeper look at recovering lost demand, read{" "}
            <Link
              href="/restaurant-missed-call-recovery"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              Restaurant missed call recovery
            </Link>
            . If you want the text-based ordering angle, see{" "}
            <Link
              href="/sms-ordering-for-restaurants"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              SMS ordering for restaurants
            </Link>
            .
          </p>
        </section>

        <section className="py-5 pb-12">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
              Start increasing orders today
            </h2>
            <Link
              href="/onboard"
              className="inline-flex items-center justify-center rounded-[14px] bg-[#ff8a3d] px-5 py-3 font-extrabold text-[#211307] shadow-[0_12px_28px_rgba(255,138,61,.24)] transition hover:-translate-y-[1px]"
            >
              Try SaanaOS
            </Link>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
