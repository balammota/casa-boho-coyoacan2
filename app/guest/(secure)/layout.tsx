import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function GuestSecureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    redirect("/guest/login");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) redirect("/guest/login");
  return <>{children}</>;
}
