"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in...");
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const supabase = createSupabaseBrowserClient();

    async function handleCallback() {
      try {
        const hash = window.location.hash;

        if (!hash || !hash.includes("access_token")) {
          window.location.replace("/login?error=missing_token");
          return;
        }

        setMessage("Verifying your login...");

        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (!accessToken || !refreshToken) {
          window.location.replace("/login?error=missing_token");
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("Failed to set session:", sessionError);
          window.location.replace("/login?error=auth_failed");
          return;
        }

        window.history.replaceState(
          null,
          document.title,
          window.location.pathname + window.location.search
        );

        setMessage("Loading your restaurant access...");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Failed to fetch user after session set:", userError);
          window.location.replace("/login?error=auth_failed");
          return;
        }

        const res = await fetch("/api/auth/complete-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          window.location.replace(
            `/login?error=${data.error || "not_authorized"}`
          );
          return;
        }

        setMessage("Redirecting to your dashboard...");

        window.location.replace(`/admin/restaurants/${data.slug}/orders`);
      } catch (err) {
        console.error("Auth callback failed:", err);
        window.location.replace("/login?error=auth_failed");
      }
    }

    handleCallback();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="rounded-xl border bg-white px-6 py-5 text-sm text-neutral-700 shadow-sm">
        {message}
      </div>
    </main>
  );
}