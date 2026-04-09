import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireGuestUser(): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; status: number; error: string }
> {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return { ok: false, status: 500, error: "Supabase is not configured." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }
  return { ok: true, userId: user.id, email: user.email };
}
