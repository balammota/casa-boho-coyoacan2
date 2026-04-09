import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wrapText(text: string, maxChars = 95): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function GET(
  _request: Request,
  { params }: { params: { reservationId: string } }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const reservationId = String(params.reservationId ?? "").trim();
  if (!reservationId) {
    return NextResponse.json({ error: "Missing reservation id." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("id, contract_type, accepted_at, content, reservation_id, reservations(public_id)")
    .eq("reservation_id", reservationId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  }
  const row = data as {
    reservations?: { public_id?: string }[] | { public_id?: string } | null;
    reservation_id: string;
    contract_type: string;
    accepted_at?: string | null;
    content?: string | null;
  };
  const reservationPublicId = Array.isArray(row.reservations)
    ? row.reservations[0]?.public_id
    : row.reservations?.public_id;

  const doc = await PDFDocument.create();
  let page = doc.addPage([612, 792]); // Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const title = "Casa Boho Coyoacán - Accepted Contract";
  page.drawText(title, {
    x: 40,
    y: 760,
    size: 16,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const metaLines = [
    `Reservation: ${reservationPublicId ?? row.reservation_id}`,
    `Contract type: ${row.contract_type}`,
    `Accepted at: ${row.accepted_at ?? "N/A"}`,
    "",
  ];
  let y = 735;
  for (const l of metaLines) {
    page.drawText(l, { x: 40, y, size: 10, font });
    y -= 14;
  }

  const lines = wrapText(String(row.content ?? ""));
  for (const line of lines) {
    if (y < 40) {
      y = 760;
      page = doc.addPage([612, 792]);
      page.drawText(title, { x: 40, y, size: 14, font: bold });
      y -= 22;
    }
    page.drawText(line, { x: 40, y, size: 10, font });
    y -= 12;
  }

  const pdfBytes = await doc.save();
  const filename = `${reservationPublicId ?? "reservation"}-contract.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "private, no-store",
    },
  });
}
