"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
//import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getErrorMessage(error?: string | null) {
  switch (error) {
    case "not_authorized":
      return "This account is not linked to any restaurant admin access.";
    case "missing_code":
      return "The login link was incomplete. Please request a new one.";
    case "missing_token":
      return "The login session was incomplete. Please request a new one.";
    case "auth_failed":
      return "We could not complete sign in. Please try again.";
    default:
      return "";
  }
}

type LoginMethod = "email" | "sms";

export default function LoginPage() {
  //const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");

  const [email, setEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const [submitError, setSubmitError] = useState("");

  const urlError = getErrorMessage(searchParams.get("error"));
  const urlMessage = searchParams.get("message") || "";

  async function handleMagicLinkSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail || magicLoading) return;

    setMagicLoading(true);
    setSubmitError("");
    setSent(false);
    setSmsSent(false);

    try {
      const res = await fetch("/api/auth/send-login-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanedEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to send login link.");
        setMagicLoading(false);
        return;
      }

      setSent(true);
      setMagicLoading(false);
    } catch {
      setSubmitError("Something went wrong while sending the login link.");
      setMagicLoading(false);
    }
  }

    async function handleSmsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (smsLoading) return;

    setSmsLoading(true);
    setSubmitError("");
    setSent(false);

    try {
        // STEP 1: send OTP
        if (!smsSent) {
        if (!phone.trim()) {
            setSubmitError("Phone number is required.");
            setSmsLoading(false);
            return;
        }

        const res = await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            phone: phone.trim(),
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            setSubmitError(data.error || "Failed to send code.");
            setSmsLoading(false);
            return;
        }

        setSmsSent(true);
        setSmsLoading(false);
        return;
        }

        // STEP 2: verify OTP
        if (!smsCode.trim()) {
        setSubmitError("Enter the 6-digit code.");
        setSmsLoading(false);
        return;
        }

        const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            phone: phone.trim(),
            code: smsCode.trim(),
        }),
        });

        const data = await res.json();

        if (!res.ok) {
        setSubmitError(data.error || "Invalid code.");
        setSmsLoading(false);
        return;
        }

        // SUCCESS → redirect to admin
        window.location.replace(`/admin/restaurants/${data.slug}/orders`);
    } catch {
        setSubmitError("Something went wrong with SMS login.");
    } finally {
        setSmsLoading(false);
    }
    }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Saana Admin
          </p>

          <h1 className="mt-1 text-2xl font-bold text-neutral-900">
            Secure login
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Sign in with email or SMS OTP.
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => {
                setLoginMethod("email");
                setSubmitError("");
                setSent(false);
                setSmsSent(false);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                loginMethod === "email"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600"
              }`}
            >
              Email
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMethod("sms");
                setSubmitError("");
                setSent(false);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                loginMethod === "sms"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600"
              }`}
            >
              SMS OTP
            </button>
          </div>

          {urlError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {urlError}
            </div>
          ) : null}

          {urlMessage ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {urlMessage}
            </div>
          ) : null}

          {submitError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          {loginMethod === "email" && sent ? (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Check your email for a secure login link. It will sign you in automatically.
            </div>
          ) : null}

          {loginMethod === "sms" && smsSent ? (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Code sent. Enter the 6-digit code to continue.
            </div>
          ) : null}

          {loginMethod === "email" ? (
            <form onSubmit={handleMagicLinkSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@restaurant.com"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                />
              </div>

              <button
                type="submit"
                disabled={magicLoading || !email.trim()}
                className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {magicLoading ? "Sending link..." : "Send secure login link"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSmsSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">
                  Phone number
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 917 555 1234"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                />
              </div>

              {smsSent ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    6-digit code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                  />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={smsLoading || !phone.trim()}
                className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {smsLoading
                  ? smsSent
                    ? "Verifying code..."
                    : "Sending code..."
                  : smsSent
                  ? "Verify code"
                  : "Send code"}
              </button>

              <p className="text-sm text-neutral-500">
                SMS OTP will use Twilio Verify once connected.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}