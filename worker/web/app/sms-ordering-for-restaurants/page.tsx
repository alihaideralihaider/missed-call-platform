import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";

export const metadata: Metadata = {
  title: "SMS Ordering System for Restaurants | SaanaOS",
  description:
    "Enable SMS ordering for your restaurant. Let customers place orders via text when they can’t reach your phone.",
};

const benefits = [
  "Faster ordering experience",
  "Reduce missed calls",
  "Increase completed orders",
  "Improve customer satisfaction",
];

const steps = [
  "Customer calls",
  "Call is missed",
  "SMS is sent",
  "Order is placed",
];

export default function SmsOrderingForRestaurantsPage() {
  return (
    <main className="min-h-screen bg-[#081120] text-[#e7eef9]">
      <div className="mx-auto max-w-[1140px] px-6 py-8 md:py-10">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)] md:p-8">
          <div className="inline-flex items-center rounded-full border border-[#ff8a3d]/20 bg-[#ff8a3d]/12 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#ffc8a2]">
            SMS ordering system for restaurants
          </div>
          <h1 className="mt-5 text-[42px] font-black leading-[0.95] tracking-[-0.05em] text-[#f8fbff] md:text-6xl md:leading-none md:tracking-[-0.045em]">
            SMS Ordering for Restaurants
          </h1>
          <p className="mt-4 max-w-[760px] text-lg text-[#a7b6cc] md:text-xl">
            SMS ordering allows restaurants to capture orders through text
            messaging, giving customers a fast and convenient way to order
            without waiting on hold.
          </p>
        </section>

        <section className="py-8 md:py-10">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Why SMS ordering matters
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            Customers expect quick and easy ways to place orders. Long wait
            times and busy lines lead to lost business.
          </p>
        </section>

        <section className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            How SaanaOS enables SMS ordering
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            SaanaOS automatically sends customers a text message with a secure
            ordering link when calls are missed, turning missed calls into
            completed orders.
          </p>
          <p className="mt-4 max-w-[780px] text-[#a7b6cc]">
            For the complete product flow, visit the{" "}
            <Link
              href="/how-it-works"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              How it works
            </Link>{" "}
            page, or see how this connects to{" "}
            <Link
              href="/restaurant-missed-call-recovery"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              restaurant missed call recovery
            </Link>
            .
          </p>
        </section>

        <section className="py-5">
          <h2 className="mb-5 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Benefits of SMS ordering
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]"
              >
                <p className="text-lg font-semibold text-[#f8fbff]">
                  {benefit}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-5">
          <h2 className="mb-5 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            How it works
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#ff9f60] to-[#ff8a3d] font-black text-[#24150a]">
                  {index + 1}
                </div>
                <p className="text-lg font-semibold text-[#f8fbff]">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-5 pb-12">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
              Start using SMS ordering
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
