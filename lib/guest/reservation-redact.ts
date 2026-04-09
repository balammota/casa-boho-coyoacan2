/** Contenido sensible solo tras confirmación del anfitrión. */
export function guestSeesHostConfirmedContent(bookingStatus: string): boolean {
  return bookingStatus === "confirmed" || bookingStatus === "completed";
}

export function redactReservationForGuestResponse<
  T extends {
    booking_status?: string;
    payment_instructions?: string | null;
    checkin_instructions?: string | null;
  },
>(row: T): T {
  if (guestSeesHostConfirmedContent(String(row.booking_status ?? ""))) {
    return row;
  }
  return {
    ...row,
    payment_instructions: null,
    checkin_instructions: null,
  };
}
