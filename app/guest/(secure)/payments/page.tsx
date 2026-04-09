import { redirect } from "next/navigation";

export default function GuestPaymentsRedirectPage() {
  redirect("/guest/reservations");
}
