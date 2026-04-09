import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/guest/login", origin), {
    status: 303,
  });
}
