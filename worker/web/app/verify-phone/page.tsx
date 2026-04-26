"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function VerifyPhonePage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function ensureSession() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.replace(
          "/login?message=Your session expired. Please sign in again to verify your phone."
        );
      }
    }

    ensureSession();
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/verify-phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.replace(
          "/login?message=Your session expired. Please sign in again to verify your phone."
        );
        return;
      }

      if (!res.ok) {
        setError(data.error || "Failed to send code.");
        return;
      }

      setMessage(data.message || "Verification code sent.");
      setStep("code");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/verify-phone/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.replace(
          "/login?message=Your session expired. Please sign in again to verify your phone."
        );
        return;
      }

      if (!res.ok) {
        setError(data.error || "Failed to verify code.");
        return;
      }

      window.location.replace(data.redirectTo || "/admin");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Verify your phone</h1>
        <p className="mt-2 text-sm text-gray-600">
          We verified your email. Now verify your phone number to activate your account.
        </p>

        {message ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {step === "phone" ? (
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mobile phone number
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(917) 664-7792"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify phone"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => setStep("phone")}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 disabled:opacity-60"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
