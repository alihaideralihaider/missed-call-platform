import { ReactNode } from "react";
import { redirect } from "next/navigation";
import PlatformNav from "@/components/platform/PlatformNav";
import { getCurrentPlatformAccess } from "@/lib/platform/access";

type Props = {
  children: ReactNode;
};

export default async function PlatformLayout({ children }: Props) {
  const access = await getCurrentPlatformAccess();

  if (!access) {
    redirect("/platform/login?error=not_authorized");
  }

  return (
    <>
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  SaanaOS Platform Admin
                </p>
                <p className="truncate text-sm font-semibold text-neutral-900">
                  Trust & Operations
                </p>
              </div>

              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="shrink-0 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700"
                >
                  Logout
                </button>
              </form>
            </div>

            <PlatformNav />
          </div>
        </div>
      </div>

      {children}
    </>
  );
}
