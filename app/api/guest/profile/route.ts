import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGuestUser } from "@/lib/auth/guest-guard";
import { assertSameOrigin } from "@/lib/security/request-guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ProfileSchema = z.object({
  fullName: z.string().trim().max(200).optional().default(""),
  phone: z.string().trim().max(80).optional().default(""),
});

export async function GET() {
  const auth = await requireGuestUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("email, full_name, phone, created_at, updated_at")
    .eq("id", auth.userId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({
    profile: data ?? { email: auth.email, full_name: null, phone: null },
  });
}

export async function PATCH(request: Request) {
  const originErr = assertSameOrigin(request);
  if (originErr) return originErr;

  const auth = await requireGuestUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const raw = await request.json().catch(() => null);
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("users").upsert({
    id: auth.userId,
    email: auth.email,
    full_name: body.fullName || null,
    phone: body.phone || null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
