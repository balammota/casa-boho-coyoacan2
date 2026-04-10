import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGuestUser } from "@/lib/auth/guest-guard";
import { notifyHostGuestDocumentUploaded } from "@/lib/email/notify-host-guest-document-uploaded";
import { guestCanAccessReservation } from "@/lib/guest/reservation-access";
import { assertSameOrigin } from "@/lib/security/request-guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "guest-documents";
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const CategorySchema = z.enum(["official_id", "passport", "income_proof", "other"]);

function safeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  return base || "document";
}

async function loadReservationForGuest(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  reservationId: string,
  userId: string,
  email: string
) {
  const { data, error } = await supabase
    .from("reservations")
    .select("id, public_id, guest_name, guest_user_id, guest_email, booking_status")
    .eq("id", reservationId)
    .single();
  if (error || !data) {
    return { ok: false as const, status: 404, error: "Reservation not found." };
  }
  if (!guestCanAccessReservation(data, userId, email)) {
    return { ok: false as const, status: 403, error: "Forbidden." };
  }
  if (data.booking_status === "cancelled") {
    return { ok: false as const, status: 400, error: "Reservation is cancelled." };
  }
  return { ok: true as const, row: data };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireGuestUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const reservationId = String(params.id ?? "").trim();
  if (!reservationId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const access = await loadReservationForGuest(supabase, reservationId, auth.userId, auth.email);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: rows, error: listErr } = await supabase
    .from("guest_reservation_documents")
    .select("id, original_filename, mime_type, document_category, file_size, created_at, storage_path")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false });

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 502 });
  }

  const documents = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, 3600);
      if (signErr || !signed?.signedUrl) {
        return {
          id: r.id,
          original_filename: r.original_filename,
          mime_type: r.mime_type,
          document_category: r.document_category,
          file_size: r.file_size,
          created_at: r.created_at,
          downloadUrl: null as string | null,
        };
      }
      return {
        id: r.id,
        original_filename: r.original_filename,
        mime_type: r.mime_type,
        document_category: r.document_category,
        file_size: r.file_size,
        created_at: r.created_at,
        downloadUrl: signed.signedUrl,
      };
    })
  );

  return NextResponse.json({ documents });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const originErr = assertSameOrigin(request);
  if (originErr) return originErr;

  const auth = await requireGuestUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const reservationId = String(params.id ?? "").trim();
  if (!reservationId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const access = await loadReservationForGuest(supabase, reservationId, auth.userId, auth.email);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  const categoryRaw = form.get("category");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing or empty file." }, { status: 400 });
  }

  const categoryParsed = CategorySchema.safeParse(
    typeof categoryRaw === "string" ? categoryRaw.trim() : ""
  );
  if (!categoryParsed.success) {
    return NextResponse.json({ error: "Invalid document category." }, { status: 400 });
  }
  const document_category = categoryParsed.data;

  const mime = (file.type || "application/octet-stream").split(";")[0].trim();
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB).` },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const storagePath = `${reservationId}/${randomUUID()}-${safeFilename(file.name)}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json(
      { error: upErr.message || "Upload failed. Is the guest-documents bucket created?" },
      { status: 502 }
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("guest_reservation_documents")
    .insert({
      reservation_id: reservationId,
      guest_user_id: auth.userId,
      storage_path: storagePath,
      original_filename: file.name.slice(0, 255),
      mime_type: mime,
      file_size: file.size,
      document_category,
    })
    .select("id, original_filename, mime_type, document_category, file_size, created_at")
    .single();

  if (insErr || !inserted) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insErr?.message ?? "Save failed." }, { status: 502 });
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);

  try {
    await notifyHostGuestDocumentUploaded({
      request,
      reservationId,
      publicId: String(access.row.public_id ?? ""),
      guestName: String(access.row.guest_name ?? ""),
      guestEmail: String(access.row.guest_email ?? auth.email),
      fileName: String(inserted.original_filename ?? file.name),
      category: document_category,
      fileSize: Number(inserted.file_size ?? file.size),
    });
  } catch (emailErr) {
    console.error("[guest/documents] host notify error:", emailErr);
  }

  return NextResponse.json({
    document: {
      ...inserted,
      downloadUrl: signed?.signedUrl ?? null,
    },
  });
}
