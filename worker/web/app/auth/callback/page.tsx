"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function AuthCallbackPageContent() {
  const [message, setMessage] = useState("Signing you in...");
  const hasRunRef = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const supabase = createSupabaseBrowserClient();

    async function handleCallback() {
      try {
        const nextPath = searchParams.get("next") || "";
        const platformLogin = nextPath.startsWith("/platform");
        const loginPath = platformLogin ? "/platform/login" : "/login";
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const hash = window.location.hash;

        setMessage("Verifying your login...");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            code
          );

          if (exchangeError) {
            console.error("Failed to exchange auth code:", exchangeError);
            window.location.replace(`${loginPath}?error=auth_failed`);
            return;
          }
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          });

          if (verifyError) {
            console.error("Failed to verify OTP token hash:", verifyError);
            window.location.replace(`${loginPath}?error=auth_failed`);
            return;
          }
        } else {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (!accessToken || !refreshToken) {
            window.location.replace(`${loginPath}?error=missing_token`);
            return;
          }

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Failed to set session:", sessionError);
            window.location.replace(`${loginPath}?error=auth_failed`);
            return;
          }
        }

        window.history.replaceState(
          null,
          document.title,
          window.location.pathname
        );

        setMessage("Loading your restaurant access...");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Failed to fetch user after session set:", userError);
          window.location.replace(`${loginPath}?error=auth_failed`);
          return;
        }

        const res = await fetch(
          platformLogin
            ? "/api/platform/auth/complete-login"
            : "/api/auth/complete-login",
          {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email || "",
          }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          window.location.replace(
            `${loginPath}?error=${data.error || "not_authorized"}`
          );
          return;
        }

        setMessage(
          platformLogin
            ? "Redirecting to Platform Admin..."
            : "Redirecting to your account..."
        );

        const redirectTo = String(
          data.redirectTo || (platformLogin ? nextPath : "/admin")
        ).trim();

        window.location.replace(redirectTo || (platformLogin ? nextPath : "/admin"));
      } catch (err) {
        console.error("Auth callback failed:", err);
        const nextPath = searchParams.get("next") || "";
        const loginPath = nextPath.startsWith("/platform")
          ? "/platform/login"
          : "/login";
        window.location.replace(`${loginPath}?error=auth_failed`);
      }
    }

    handleCallback();
  }, [searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="rounded-xl border bg-white px-6 py-5 text-sm text-neutral-700 shadow-sm">
        {message}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
      <AuthCallbackPageContent />
    </Suspense>
  );
}
