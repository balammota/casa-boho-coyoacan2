import { redirect } from "next/navigation";
import { GuestDashboardClient } from "@/components/guest/GuestDashboardClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function GuestDashboardPage() {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    redirect("/guest/login");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) redirect("/guest/login");

  return <GuestDashboardClient userEmail={user.email} />;
}
