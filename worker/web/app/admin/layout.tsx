import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

return (
  <>
    <div className="flex items-center justify-end px-6 py-3 border-b border-neutral-200 bg-white">
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="text-sm font-semibold text-neutral-700 hover:text-black"
        >
          Logout
        </button>
      </form>
    </div>

    {children}
  </>
);
}