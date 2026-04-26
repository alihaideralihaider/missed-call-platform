"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function getErrorMessage(error?: string | null) {
  switch (error) {
    case "not_authorized":
      return "This account is not allowed to access Platform Admin.";
    case "missing_token":
      return "The login session was incomplete. Please request a new link.";
    case "auth_failed":
      return "We could not complete sign in. Please try again.";
    default:
      return "";
  }
}

function PlatformLoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const urlError = getErrorMessage(searchParams.get("error"));
  const urlMessage = searchParams.get("message") || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail || loading) return;

    setLoading(true);
    setSent(false);
    setSubmitError("");

    try {
      const response = await fetch("/api/platform/auth/send-login-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: cleanedEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data?.error || "Failed to send platform login link.");
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setSubmitError("Something went wrong while sending the platform login link.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            SaanaOS Platform Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">
            Secure platform login
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in with a passwordless email link. Access is granted by your platform role.
          </p>

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

          {sent ? (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Check your email for a secure platform login link.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Work email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ops@saanaos.com"
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sending link..." : "Send platform login link"}
            </button>
          </form>

          <div className="mt-6 border-t border-neutral-200 pt-4 text-sm text-neutral-500">
            Restaurant owners should use{" "}
            <Link href="/login" className="font-semibold text-neutral-900">
              restaurant admin login
            </Link>
            .
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PlatformLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
      <PlatformLoginPageContent />
    </Suspense>
  );
}
