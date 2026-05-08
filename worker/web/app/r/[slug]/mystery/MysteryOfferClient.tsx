"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { normalizeUsPhone } from "@/lib/phone";

type MysteryOffer = {
  title: string;
  terms: string;
  checkoutCode: string;
};

type MysteryOfferState = {
  phone: string;
  restaurantSlug: string;
  firstRevealedAt: string;
  expiresAt: string;
  revealCount: number;
  revealedOffer: string;
  consentText: string;
  updatedAt: string;
};

type OfferViewState =
  | {
      status: "revealed";
      offer: MysteryOffer;
      expiresAt: string;
    }
  | {
      status: "expired";
    };

type MysteryOfferClientProps = {
  restaurantName: string;
  slug: string;
};

const OFFER_WINDOW_DAYS = 30;

const APPROVED_OFFERS: MysteryOffer[] = [
  {
    title: "10% off your next pickup order",
    terms:
      "Valid on qualifying direct pickup orders. Restaurant may verify eligibility at pickup.",
    checkoutCode: "MYSTERY10",
  },
  {
    title: "$5 off your next order of $40 or more",
    terms: "Valid on qualifying direct pickup orders of $40 or more.",
    checkoutCode: "PICKUP5",
  },
  {
    title: "20% off a catering tray or large order",
    terms:
      "Valid on qualifying catering or large pickup orders. Ask restaurant for confirmation.",
    checkoutCode: "CATERING20",
  },
  {
    title: "Free drink with qualifying pickup order",
    terms: "Valid with qualifying pickup order while supplies last.",
    checkoutCode: "FREEDRINK",
  },
  {
    title: "Free side or sauce with qualifying pickup order",
    terms: "Valid with qualifying pickup order while supplies last.",
    checkoutCode: "FREESAUCE",
  },
  {
    title: "Order direct and skip marketplace fees",
    terms: "Order directly from this restaurant for pickup.",
    checkoutCode: "DIRECT",
  },
];

function getOfferIndexForReveal(revealCount: number) {
  if (revealCount <= 1) return 0;
  if (revealCount === 2) return 1;
  if (revealCount === 3) return 2;

  return 3 + ((revealCount - 4) % 3);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function readOfferState(key: string): MysteryOfferState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<MysteryOfferState>;
    if (!parsed.firstRevealedAt || !parsed.expiresAt) return null;

    return {
      phone: String(parsed.phone || ""),
      restaurantSlug: String(parsed.restaurantSlug || ""),
      firstRevealedAt: String(parsed.firstRevealedAt),
      expiresAt: String(parsed.expiresAt),
      revealCount: Number(parsed.revealCount || 0),
      revealedOffer: String(parsed.revealedOffer || ""),
      consentText: String(parsed.consentText || ""),
      updatedAt: String(parsed.updatedAt || ""),
    };
  } catch {
    return null;
  }
}

function formatExpirationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function MysteryOfferClient({
  restaurantName,
  slug,
}: MysteryOfferClientProps) {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [offerView, setOfferView] = useState<OfferViewState | null>(null);

  function handleReveal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalizedPhone = normalizeUsPhone(phone) || phone.trim();

    if (!normalizedPhone) {
      setPhoneError("Enter your phone number to reveal your offer.");
      return;
    }

    setPhoneError("");

    const stateKey = `saanaos:mystery-offer-state:${slug}`;
    const now = new Date();
    const existingState = readOfferState(stateKey);
    const existingExpiresAt = existingState?.expiresAt
      ? new Date(existingState.expiresAt)
      : null;
    const existingStateIsValid =
      existingState &&
      existingExpiresAt &&
      !Number.isNaN(existingExpiresAt.getTime());

    if (existingStateIsValid && existingExpiresAt <= now) {
      setOfferView({ status: "expired" });
      return;
    }

    const firstRevealedAt = existingStateIsValid
      ? existingState.firstRevealedAt
      : now.toISOString();
    const expiresAt = existingStateIsValid
      ? existingState.expiresAt
      : addDays(now, OFFER_WINDOW_DAYS).toISOString();
    const nextCount = existingStateIsValid
      ? Math.max(0, Number(existingState.revealCount || 0)) + 1
      : 1;
    const offer = APPROVED_OFFERS[getOfferIndexForReveal(nextCount)];

    // Phase 1 intentionally stores consent/scan locally only. Durable,
    // restaurant-specific consent capture should use a dedicated API in Phase 2.
    window.localStorage.setItem(
      stateKey,
      JSON.stringify({
        phone: normalizedPhone,
        restaurantSlug: slug,
        firstRevealedAt,
        expiresAt,
        revealCount: nextCount,
        consentText:
          "Customer agreed to receive order and offer texts from this restaurant.",
        revealedOffer: offer.title,
        updatedAt: now.toISOString(),
      })
    );

    setOfferView({ status: "revealed", offer, expiresAt });
  }

  if (offerView?.status === "expired") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xl shadow-neutral-900/10">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {restaurantName}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950 md:text-4xl">
            This mystery offer has expired.
          </h1>
          <p className="mt-4 text-base leading-7 text-neutral-600">
            You can still order directly from {restaurantName}.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/r/${slug}`}
              className="rounded-full bg-neutral-950 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Order now
            </Link>
            <Link
              href={`/r/${slug}/catering`}
              className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-center text-sm font-semibold text-neutral-800"
            >
              View catering
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (offerView?.status === "revealed") {
    const expirationDate = formatExpirationDate(offerView.expiresAt);

    return (
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl shadow-neutral-900/10">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {restaurantName}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950 md:text-4xl">
            You unlocked a mystery offer
          </h1>

          <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <p className="text-xl font-bold text-neutral-950">
              {offerView.offer.title}
            </p>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {offerView.offer.terms}
            </p>
            <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Use code at checkout
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-lg font-bold tracking-wide text-neutral-950">
                  {offerView.offer.checkoutCode}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(offerView.offer.checkoutCode)
                  }
                  className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800"
                >
                  Copy code
                </button>
              </div>
            </div>
            {expirationDate ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                Offer window expires on {expirationDate}.
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/r/${slug}`}
              className="rounded-full bg-neutral-950 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Order now
            </Link>
            <Link
              href={`/r/${slug}/catering`}
              className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-center text-sm font-semibold text-neutral-800"
            >
              View catering
            </Link>
          </div>

          <p className="mt-5 text-xs leading-5 text-neutral-500">
            Offer availability and terms are set by the restaurant. Cannot be
            combined with other offers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xl shadow-neutral-900/10">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {restaurantName}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950 md:text-4xl">
          Unlock your mystery offer
        </h1>
        <p className="mt-4 text-base leading-7 text-neutral-600">
          Enter your phone number to reveal your offer from {restaurantName}.
        </p>

        <form onSubmit={handleReveal} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="mystery-phone"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Phone number
            </label>
            <input
              id="mystery-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-0123"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900"
            />
            {phoneError ? (
              <p className="mt-2 text-sm text-red-600">{phoneError}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
            <p>
              SaanaOS does not share or sell data to any third party. Your
              number stays with this restaurant only.
            </p>
            <p className="mt-3">
              By submitting, you agree to receive order and offer texts from{" "}
              {restaurantName}. Message and data rates may apply. Message
              frequency varies. Reply STOP to opt out.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Reveal my offer
          </button>
        </form>
      </div>
    </div>
  );
}
