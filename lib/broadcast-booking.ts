const CHANNEL = "casaboho-booking-refresh";

/** Avisar otras pestañas del mismo origen para que vuelvan a pedir /api/booking-data */
export function notifyBookingDataChanged(): void {
  if (typeof window === "undefined") return;
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage("refresh");
    ch.close();
  } catch {
    /* Safari antiguo u origen file:// */
  }
}

export function subscribeBookingDataRefresh(onRefresh: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = () => onRefresh();
    return () => ch.close();
  } catch {
    return () => {};
  }
}
