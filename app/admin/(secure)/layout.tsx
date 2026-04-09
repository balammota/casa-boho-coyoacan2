import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminSecureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    redirect("/admin/login?error=config");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/admin/login");
  }

  const { data: allowed, error: allowError } = await supabase
    .from("admin_allowlist")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (allowError) {
    redirect("/admin/login?error=config");
  }
  if (!allowed) {
    redirect("/admin/login?error=forbidden");
  }

  return (
    <div className="min-h-screen bg-[var(--ivory)] text-[var(--charcoal)]">
      {children}
    </div>
  );
}
