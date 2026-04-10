import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyHostSurveySubmitted } from "@/lib/email/notify-host-survey-submitted";
import { assertSameOrigin } from "@/lib/security/request-guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SurveyPostSchema = z.object({
  ratingOverall: z.number().int().min(1).max(5),
  ratingClean: z.number().int().min(1).max(5),
  ratingComfort: z.number().int().min(1).max(5),
  ratingRecommend: z.number().int().min(1).max(5),
  comments: z.string().max(4000).optional().default(""),
  consentPublish: z.union([z.boolean(), z.null()]).optional(),
});

function normalizePublicId(raw: string): string {
  try {
    return decodeURIComponent(String(raw ?? "").trim());
  } catch {
    return String(raw ?? "").trim();
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { publicId: string } }
) {
  const publicId = normalizePublicId(params.publicId);
  if (!publicId) {
    return NextResponse.json({ error: "Missing public id." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: res, error: resErr } = await supabase
    .from("reservations")
    .select("id, booking_status, public_id")
    .eq("public_id", publicId)
    .maybeSingle();

  if (resErr) {
    return NextResponse.json({ error: resErr.message }, { status: 502 });
  }
  if (!res) {
    return NextResponse.json({
      ok: true,
      found: false,
      reservationCompleted: false,
      alreadySubmitted: false,
    });
  }

  const completed = String(res.booking_status ?? "") === "completed";

  const { data: existing, error: surErr } = await supabase
    .from("guest_stay_surveys")
    .select("id")
    .eq("reservation_id", res.id)
    .maybeSingle();

  if (surErr) {
    return NextResponse.json({ error: surErr.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    found: true,
    reservationCompleted: completed,
    alreadySubmitted: Boolean(existing),
  });
}

export async function POST(
  request: Request,
  { params }: { params: { publicId: string } }
) {
  const originErr = assertSameOrigin(request);
  if (originErr) return originErr;

  const publicId = normalizePublicId(params.publicId);
  if (!publicId) {
    return NextResponse.json({ error: "Missing public id." }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = SurveyPostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const consent =
    body.consentPublish === undefined ? null : body.consentPublish;

  const supabase = createAdminSupabaseClient();
  const { data: res, error: resErr } = await supabase
    .from("reservations")
    .select("id, booking_status, public_id, guest_name, guest_email")
    .eq("public_id", publicId)
    .maybeSingle();

  if (resErr) {
    return NextResponse.json({ error: resErr.message }, { status: 502 });
  }
  if (!res) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }
  if (String(res.booking_status ?? "") !== "completed") {
    return NextResponse.json(
      { error: "Survey is only available after your stay is marked completed." },
      { status: 403 }
    );
  }

  const { error: insErr } = await supabase.from("guest_stay_surveys").insert({
    reservation_id: res.id,
    public_id: String(res.public_id ?? publicId),
    rating_overall: body.ratingOverall,
    rating_clean: body.ratingClean,
    rating_comfort: body.ratingComfort,
    rating_recommend: body.ratingRecommend,
    comments: body.comments.trim(),
    consent_publish: consent,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json(
        { error: "You have already submitted this survey." },
        { status: 409 }
      );
    }
    if (insErr.message?.includes("guest_stay_surveys")) {
      return NextResponse.json(
        {
          error:
            "Survey storage is not ready. Apply database migration 010_guest_stay_surveys.sql.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: insErr.message }, { status: 502 });
  }

  void notifyHostSurveySubmitted({
    request,
    reservationId: res.id,
    publicId: String(res.public_id ?? publicId),
    guestName: String(res.guest_name ?? "").trim() || "Huésped",
    guestEmail: String(res.guest_email ?? "").trim() || "—",
    ratingOverall: body.ratingOverall,
    ratingClean: body.ratingClean,
    ratingComfort: body.ratingComfort,
    ratingRecommend: body.ratingRecommend,
    comments: body.comments.trim(),
    consentPublish: consent,
  }).catch((e) => console.error("[survey POST] notify host:", e));

  return NextResponse.json({ ok: true });
}
