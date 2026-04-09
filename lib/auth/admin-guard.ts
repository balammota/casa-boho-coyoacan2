import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAdminUser(): Promise<{
  ok: true;
  userId: string;
  email: string;
} | {
  ok: false;
  status: number;
  error: string;
}> {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return { ok: false, status: 500, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user?.email) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const { data: allowed, error } = await supabase
    .from("admin_allowlist")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();
  if (error) {
    return { ok: false, status: 500, error: "Could not verify admin role." };
  }
  if (!allowed) {
    return { ok: false, status: 403, error: "Forbidden." };
  }
  return { ok: true, userId: user.id, email: user.email };
}
