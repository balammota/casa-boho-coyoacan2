/** Misma regla que GET /api/guest/reservations/[id] */
export function guestCanAccessReservation(
  row: { guest_user_id: string | null; guest_email: string | null },
  userId: string,
  email: string
): boolean {
  if (row.guest_user_id) {
    return row.guest_user_id === userId;
  }
  const rEmail = String(row.guest_email ?? "").trim().toLowerCase();
  return rEmail === email.trim().toLowerCase();
}
