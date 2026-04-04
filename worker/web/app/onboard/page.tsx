"use client";

import { useState } from "react";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OnboardPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successEmail, setSuccessEmail] = useState("");

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

    if (!contactEmail.trim()) {
      setError("Contact email is required");
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
          name: name.trim(),
          slug: slug.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to onboard");
        setLoading(false);
        return;
      }

      setSuccessEmail(contactEmail.trim());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-xl font-bold">Onboard Restaurant</h1>

        {successEmail ? (
          <div className="space-y-4 rounded-xl border bg-white p-4">
            <div className="text-lg font-semibold text-neutral-900">
              Restaurant created
            </div>
            <p className="text-sm text-neutral-700">
              Activation email sent to:{" "}
              <span className="font-medium">{successEmail}</span>
            </p>
            <p className="text-sm text-neutral-700">
              Click the link in the email to activate the account and continue to
              the restaurant admin.
            </p>
            <p className="text-sm text-neutral-700">
              After phone verification, we’ll help you finish your restaurant
              profile, tax settings, and public ordering setup.
            </p>
          </div>
        ) : (
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
              <p className="text-sm font-medium text-neutral-900">
                Public ordering link
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                AI will generate your public order link automatically based on
                your restaurant name.
              </p>
            </div>


            {error && <div className="text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Restaurant"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}