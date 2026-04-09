import { redirect } from "next/navigation";

export default function GuestContractsRedirectPage() {
  redirect("/guest/reservations");
}
