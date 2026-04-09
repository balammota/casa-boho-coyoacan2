import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/admin-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function AdminReservationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    redirect("/admin/login?error=forbidden");
  }

  const supabase = createAdminSupabaseClient();
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !reservation) return notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
        Reservation details
      </p>
      <h1 className="mt-2 font-[family-name:var(--heading-font)] text-2xl font-semibold">
        {reservation.public_id}
      </h1>
      <div className="mt-6 rounded-2xl border border-[var(--dove-grey)]/70 bg-white p-5 text-sm text-[var(--charcoal)]/85">
        <p>Check-in: {reservation.check_in}</p>
        <p>Check-out: {reservation.check_out}</p>
        <p>Total price: {reservation.currency} {Number(reservation.total_amount).toLocaleString("en-US")}</p>
        <p>Cleaning fee: {reservation.currency} {Number(reservation.cleaning_fee).toLocaleString("en-US")}</p>
        <p>Deposit amount: {reservation.currency} {Number(reservation.deposit_amount).toLocaleString("en-US")}</p>
        <p>Stay type: {reservation.stay_type}</p>
        <p>Contract type: {reservation.contract_type}</p>
        <p>Payment status: {reservation.payment_status}</p>
        <p>Booking status: {reservation.booking_status}</p>
      </div>
      <p className="mt-6">
        <Link href="/admin" className="text-[var(--gold)] underline">
          Volver a admin
        </Link>
      </p>
    </main>
  );
}
