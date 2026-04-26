import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";

export const metadata: Metadata = {
  title:
    "How SaanaOS Works | Restaurant Missed Call Recovery & SMS Ordering",
  description:
    "Learn how SaanaOS helps restaurants recover missed calls and turn them into orders using SMS ordering and automated responses.",
};

const steps = [
  {
    number: "1",
    title: "Customer calls your restaurant",
    text: "A customer tries to place an order but the call is missed or the line is busy.",
  },
  {
    number: "2",
    title: "SaanaOS sends an instant SMS",
    text: "The customer automatically receives a text message with a secure ordering link.",
  },
  {
    number: "3",
    title: "Customer places the order",
    text: "The customer completes their order online, and your restaurant receives it instantly.",
  },
];

const benefits = [
  "Recover lost revenue from missed calls",
  "Reduce phone pressure during busy hours",
  "Improve customer experience with fast ordering",
  "Increase overall order volume",
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#081120] text-[#e7eef9]">
      <div className="mx-auto max-w-[1140px] px-6 py-8 md:py-10">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)] md:p-8">
          <div className="inline-flex items-center rounded-full border border-[#ff8a3d]/20 bg-[#ff8a3d]/12 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#ffc8a2]">
            Restaurant missed call recovery
          </div>
          <h1 className="mt-5 text-[42px] font-black leading-[0.95] tracking-[-0.05em] text-[#f8fbff] md:text-6xl md:leading-none md:tracking-[-0.045em]">
            How SaanaOS Works
          </h1>
          <p className="mt-4 max-w-[760px] text-lg text-[#a7b6cc] md:text-xl">
            SaanaOS helps restaurants recover missed calls by instantly
            sending customers an SMS with a link to place their order. Instead
            of losing business, every missed call becomes an opportunity to
            capture revenue.
          </p>
        </section>

        <section className="py-8 md:py-10">
          <h2 className="mb-6 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            3 Step Process
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)]"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#ff9f60] to-[#ff8a3d] font-black text-[#24150a]">
                  {step.number}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-[#f8fbff]">
                  {step.title}
                </h3>
                <p className="text-[#a7b6cc]">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Why restaurants lose orders from missed calls
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            Restaurants lose valuable orders every day when they can&apos;t
            answer the phone during peak hours. Busy lines, staff shortages,
            and high call volume lead customers to order elsewhere.
          </p>
        </section>

        <section className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            How SaanaOS solves missed call recovery
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            SaanaOS ensures every missed call is followed up instantly with an
            SMS ordering option, giving customers a fast and convenient way to
            place their order without waiting on hold.
          </p>
          <p className="mt-4 max-w-[780px] text-[#a7b6cc]">
            If you want a deeper explanation of the business case for missed
            call recovery, visit the{" "}
            <Link
              href="/restaurant-missed-call-recovery"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              restaurant missed call recovery
            </Link>{" "}
            page.
          </p>
        </section>

        <section className="py-5">
          <h2 className="mb-5 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Benefits for your restaurant
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
          <p className="mt-4 max-w-[780px] text-[#a7b6cc]">
            Related reading:{" "}
            <Link
              href="/sms-ordering-for-restaurants"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              SMS ordering for restaurants
            </Link>{" "}
            and{" "}
            <Link
              href="/increase-restaurant-orders"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              how to increase restaurant orders
            </Link>
            .
          </p>
        </section>

        <section className="py-5 pb-12">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
            <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
              Start recovering missed orders today
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
