// app/admin/onboard/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OnboardPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [salesTaxRate, setSalesTaxRate] = useState("");
  const [taxMode, setTaxMode] = useState("exclusive");
  const [taxLabel, setTaxLabel] = useState("Sales Tax");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);

    if (!slug) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Restaurant name is required");
      return;
    }

    if (salesTaxRate && Number.isNaN(Number(salesTaxRate))) {
      setError("Sales tax rate must be a valid number");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/onboard-restaurant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          contactName,
          contactPhone,
          contactEmail,
          salesTaxRate: salesTaxRate === "" ? 0 : Number(salesTaxRate),
          taxMode,
          taxLabel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to onboard");
        setLoading(false);
        return;
      }

      router.push(`/admin/restaurants/${data.slug}/menu`);
    } catch (err) {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-xl font-bold">Onboard Restaurant</h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-white p-4"
        >
          <div>
            <label className="text-sm font-medium">Restaurant Name</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Contact Name</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Tax Settings
            </h2>

            <div className="mt-3">
              <label className="text-sm font-medium">Sales Tax Rate</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.00001"
                placeholder="0.08875 or 8.875"
                value={salesTaxRate}
                onChange={(e) => setSalesTaxRate(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Enter decimal or percent based on how your backend expects it.
              </p>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium">Tax Mode</label>
              <select
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="exclusive">Exclusive</option>
                <option value="inclusive">Inclusive</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium">Tax Label</label>
              <input
                value={taxLabel}
                onChange={(e) => setTaxLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black py-3 text-white"
          >
            {loading ? "Creating..." : "Create Restaurant"}
          </button>
        </form>
      </div>
    </main>
  );
}