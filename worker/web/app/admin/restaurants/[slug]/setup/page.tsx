"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SetupPageProps = {
  params: Promise<{ slug: string }>;
};

type HourRow = {
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
};

type TimezoneOption = {
  timezone_name: string;
  display_label: string;
  country_code: string | null;
};

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function cleanSlug(value: unknown): string {
  const s = String(value ?? "").trim().toLowerCase();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

function getDefaultHours(): HourRow[] {
  return DAYS.map((day) => ({
    day_of_week: day.value,
    is_closed: true,
    open_time: "09:00",
    close_time: "21:00",
  }));
}

function normalizeZip(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

export default function SetupPage({ params }: SetupPageProps) {
  const router = useRouter();

  const [slug, setSlug] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  const [restaurantName, setRestaurantName] = useState("");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [timezoneOptions, setTimezoneOptions] = useState<TimezoneOption[]>([]);

  const [taxRate, setTaxRate] = useState("");
  const [taxMode, setTaxMode] = useState("exclusive");
  const [taxLabel, setTaxLabel] = useState("Sales Tax");

  const [hours, setHours] = useState<HourRow[]>(getDefaultHours());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timezoneLookupLoading, setTimezoneLookupLoading] = useState(false);

  function updateHourRow(dayOfWeek: number, patch: Partial<HourRow>) {
    setHours((prev) =>
      prev.map((row) =>
        row.day_of_week === dayOfWeek ? { ...row, ...patch } : row
      )
    );
  }

  useEffect(() => {
    async function loadTimezones() {
      try {
        const res = await fetch("/api/timezones", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          return;
        }

        setTimezoneOptions(Array.isArray(data?.timezones) ? data.timezones : []);
      } catch {
        // keep page usable even if timezone list fails
      }
    }

    loadTimezones();
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const resolved = await params;
        const nextSlug = cleanSlug(resolved?.slug);
        setSlug(nextSlug);

        if (!nextSlug) {
          setError("Restaurant slug is missing.");
          setPageLoading(false);
          return;
        }

        const browserTimeZone =
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "";

        const res = await fetch(`/api/admin/restaurants/${nextSlug}/profile`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || "Failed to load setup.");
          setPageLoading(false);
          return;
        }

        const restaurant = data?.restaurant || {};
        const taxSettings = data?.taxSettings || {};
        const loadedHours = Array.isArray(data?.hours) ? data.hours : [];

        setRestaurantName(restaurant.name || "");
        setAddress1(restaurant.address_line_1 || "");
        setAddress2(restaurant.address_line_2 || "");
        setCity(restaurant.city || "");
        setState(restaurant.state || "");
        setZip(restaurant.postal_code || "");
        setPickupInstructions(restaurant.pickup_instructions || "");
        setTimezone(
          restaurant.timezone ||
            browserTimeZone ||
            "America/New_York"
        );

        setTaxRate(
          taxSettings.sales_tax_rate !== null &&
            taxSettings.sales_tax_rate !== undefined
            ? String(taxSettings.sales_tax_rate)
            : ""
        );
        setTaxMode(taxSettings.tax_mode || "exclusive");
        setTaxLabel(taxSettings.tax_label || "Sales Tax");

        const normalizedHours = DAYS.map((day) => {
          const existing = loadedHours.find(
            (h: any) => Number(h?.day_of_week) === day.value
          );

          return {
            day_of_week: day.value,
            is_closed: existing ? Boolean(existing.is_closed) : true,
            open_time:
              existing?.open_time && typeof existing.open_time === "string"
                ? existing.open_time.slice(0, 5)
                : "09:00",
            close_time:
              existing?.close_time && typeof existing.close_time === "string"
                ? existing.close_time.slice(0, 5)
                : "21:00",
          };
        });

        setHours(normalizedHours);

        setPageLoading(false);
      } catch {
        setError("Something went wrong while loading setup.");
        setPageLoading(false);
      }
    }

    init();
  }, [params]);

  useEffect(() => {
    async function lookupTimezone() {
      const normalized = normalizeZip(zip);

      if (normalized.length !== 5) return;
      if (pageLoading) return;

      try {
        setTimezoneLookupLoading(true);

        const res = await fetch(`/api/timezones/us-postal-code/${normalized}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          setTimezoneLookupLoading(false);
          return;
        }

        const data = await res.json();

        if (data?.timezone) {
          setTimezone(data.timezone);
        }

        setTimezoneLookupLoading(false);
      } catch {
        setTimezoneLookupLoading(false);
      }
    }

    lookupTimezone();
  }, [zip, pageLoading]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError("Address is required");
      return;
    }

    for (const row of hours) {
      if (!row.is_closed) {
        if (!row.open_time || !row.close_time) {
          setError("Each open day must have both open and close times.");
          return;
        }

        if (row.open_time === row.close_time) {
          setError("Open time and close time cannot be the same for each open day.");
          return;
        }
      }
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/restaurants/${slug}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addressLine1: address1.trim(),
          addressLine2: address2.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: zip.trim(),
          pickupInstructions: pickupInstructions.trim(),
          timezone: timezone.trim(),
          salesTaxRate: taxRate === "" ? 0 : Number(taxRate),
          taxMode,
          taxLabel: taxLabel.trim(),
          hours: hours.map((row) => ({
            day_of_week: row.day_of_week,
            is_closed: row.is_closed,
            open_time: row.is_closed ? null : `${row.open_time}:00`,
            close_time: row.is_closed ? null : `${row.close_time}:00`,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save");
        setLoading(false);
        return;
      }

      router.push(`/admin/restaurants/${slug}/orders`);
    } catch {
      setError("Something went wrong while saving profile.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Restaurant setup
          </p>
          <h1 className="mb-2 text-xl font-bold text-neutral-900">
            {pageLoading
              ? "Loading..."
              : `Finish setting up${restaurantName ? ` ${restaurantName}` : " your restaurant"}`}
          </h1>
          <p className="text-sm text-neutral-600">
            Add your pickup location, hours, and tax settings so customers know
            where to pick up their order and checkout totals are accurate.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-xl border bg-white p-4"
        >
          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-900">
              Pickup location
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm">Address line 1</label>
                <input
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm">Address line 2</label>
                <input
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div>
                  <label className="text-sm">City</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-sm">State</label>
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-sm">ZIP</label>
                  <input
                    value={zip}
                    onChange={(e) => setZip(normalizeZip(e.target.value))}
                    className="mt-1 w-full rounded border px-3 py-2"
                    inputMode="numeric"
                    maxLength={5}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm">Pickup instructions</label>
                <textarea
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  placeholder="Optional: front desk, side door, parking notes, suite number, etc."
                  className="mt-1 min-h-[96px] w-full rounded border px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  {timezoneOptions.length === 0 ? (
                    <option value={timezone}>{timezone}</option>
                  ) : null}

                  {timezoneOptions.map((option) => (
                    <option
                      key={option.timezone_name}
                      value={option.timezone_name}
                    >
                      {option.display_label} ({option.timezone_name})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  Timezone is auto-filled from ZIP when available, but can still be changed.
                </p>
                {timezoneLookupLoading ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Looking up timezone from ZIP...
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-900">
              Restaurant hours
            </h2>
            <p className="mb-4 text-sm text-neutral-600">
              Set your weekly pickup hours. Closed days will not accept pickup
              orders.
            </p>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const row = hours.find((h) => h.day_of_week === day.value);

                if (!row) return null;

                return (
                  <div
                    key={day.value}
                    className="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-[140px_110px_1fr_1fr]"
                  >
                    <div className="text-sm font-medium text-neutral-900">
                      {day.label}
                    </div>

                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={row.is_closed}
                        onChange={(e) =>
                          updateHourRow(day.value, {
                            is_closed: e.target.checked,
                          })
                        }
                      />
                      Closed
                    </label>

                    <div>
                      <label className="mb-1 block text-sm text-neutral-600">
                        Open
                      </label>
                      <input
                        type="time"
                        value={row.open_time}
                        disabled={row.is_closed}
                        onChange={(e) =>
                          updateHourRow(day.value, {
                            open_time: e.target.value,
                          })
                        }
                        className="w-full rounded border px-3 py-2 disabled:bg-neutral-100 disabled:text-neutral-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm text-neutral-600">
                        Close
                      </label>
                      <input
                        type="time"
                        value={row.close_time}
                        disabled={row.is_closed}
                        onChange={(e) =>
                          updateHourRow(day.value, {
                            close_time: e.target.value,
                          })
                        }
                        className="w-full rounded border px-3 py-2 disabled:bg-neutral-100 disabled:text-neutral-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-semibold">Tax</p>

            <input
              placeholder="Tax rate (e.g. 8.875)"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="mb-2 w-full rounded border px-3 py-2"
            />

            <select
              value={taxMode}
              onChange={(e) => setTaxMode(e.target.value)}
              className="mb-2 w-full rounded border px-3 py-2"
            >
              <option value="exclusive">Exclusive</option>
              <option value="inclusive">Inclusive</option>
            </select>

            <input
              placeholder="Tax label"
              value={taxLabel}
              onChange={(e) => setTaxLabel(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            disabled={loading || pageLoading}
            className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save and continue"}
          </button>
        </form>
      </div>
    </main>
  );
}