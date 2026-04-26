import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/site-footer";

export const metadata: Metadata = {
  title:
    "Restaurant Missed Call Recovery | Turn Missed Calls into Orders with SaanaOS",
  description:
    "Recover lost restaurant orders from missed calls with SaanaOS. Automatically send SMS ordering links and turn missed calls into revenue.",
};

const benefits = [
  "Turn missed calls into real orders",
  "Reduce lost revenue",
  "Improve customer experience",
  "Handle peak-hour demand more efficiently",
];

const steps = [
  "Customer calls your restaurant",
  "Call is missed or busy",
  "SMS is sent automatically",
  "Customer places order online",
];

export default function RestaurantMissedCallRecoveryPage() {
  return (
    <main className="min-h-screen bg-[#081120] text-[#e7eef9]">
      <div className="mx-auto max-w-[1140px] px-6 py-8 md:py-10">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,.28)] md:p-8">
          <div className="inline-flex items-center rounded-full border border-[#ff8a3d]/20 bg-[#ff8a3d]/12 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#ffc8a2]">
            Restaurant missed call recovery
          </div>
          <h1 className="mt-5 text-[42px] font-black leading-[0.95] tracking-[-0.05em] text-[#f8fbff] md:text-6xl md:leading-none md:tracking-[-0.045em]">
            Restaurant Missed Call Recovery
          </h1>
          <p className="mt-4 max-w-[760px] text-lg text-[#a7b6cc] md:text-xl">
            Restaurants lose valuable orders every day when customers can&apos;t
            reach them by phone. SaanaOS solves this problem by automatically
            converting missed calls into SMS ordering opportunities.
          </p>
        </section>

        <section className="py-8 md:py-10">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Why missed calls cost restaurants real revenue
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            During peak hours, restaurants often miss calls due to busy lines,
            limited staff, or high demand. When customers can&apos;t get
            through, they don&apos;t wait — they order from somewhere else.
          </p>
        </section>

        <section className="py-5">
          <h2 className="mb-3 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            How SaanaOS recovers missed calls instantly
          </h2>
          <p className="max-w-[780px] text-[#a7b6cc]">
            When a call is missed, SaanaOS immediately sends the customer a
            text message with a link to place their order online. This removes
            friction and keeps the customer engaged.
          </p>
          <p className="mt-4 max-w-[780px] text-[#a7b6cc]">
            A strong restaurant missed call recovery system should respond fast,
            keep the ordering path simple, and help restaurants recover demand
            that would otherwise disappear. SaanaOS is built around that flow,
            and you can see the full sequence on the{" "}
            <Link
              href="/how-it-works"
              className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              How it works
            </Link>{" "}
            page.
          </p>
        </section>

        <section className="py-5">
          <h2 className="mb-5 text-4xl font-black tracking-[-0.03em] text-[#f8fbff]">
            Benefits of missed call recovery
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
              Start recovering missed calls today
            </h2>
            <p className="mb-5 max-w-[720px] text-[#a7b6cc]">
              If you want the broader product overview first, visit the{" "}
              <Link
                href="/"
                className="font-semibold text-[#f8fbff] underline decoration-white/25 underline-offset-4 transition hover:text-white"
              >
                SaanaOS homepage
              </Link>{" "}
              and then start your setup.
            </p>
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
