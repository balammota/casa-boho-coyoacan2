import type { ContractType } from "./types";

export function buildContractText(input: {
  contractType: ContractType;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  currency: "MXN" | "USD";
  depositAmount: number;
  publicId?: string;
  documentDateIso?: string;
}): string {
  const pubId = input.publicId ?? "—";
  const acceptedLine = input.documentDateIso
    ? `Recorded at: ${input.documentDateIso}`
    : "";

  if (input.contractType === "long_stay_contract") {
    const depositLine = `Security deposit (one month reference): ${input.currency} ${input.depositAmount.toLocaleString("en-US")}`;
    return [
      "LONG STAY — RESERVATION RECORD (REFERENCE)",
      "",
      `Reservation: ${pubId}`,
      acceptedLine,
      "",
      `Guest: ${input.guestName}`,
      `Email: ${input.guestEmail}`,
      `Phone: ${input.guestPhone}`,
      "",
      `Check-in: ${input.checkIn}`,
      `Check-out: ${input.checkOut}`,
      `Nights: ${input.nights}`,
      `Quoted total: ${input.currency} ${input.totalAmount.toLocaleString("en-US")}`,
      depositLine,
      "",
      "The binding lease is the printed template provided by the host (PDF templates in the guest portal after you complete acceptance). Sign in person as agreed.",
      "",
      "By accepting electronically, the guest confirms these reservation details and acknowledges access to the lease templates for review before signing.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const title = "SHORT STAY CONTRACT";
  const depositLine = "Security deposit: N/A for short stays";
  return [
    title,
    "",
    `Guest: ${input.guestName}`,
    `Email: ${input.guestEmail}`,
    `Phone: ${input.guestPhone}`,
    "",
    `Check-in: ${input.checkIn}`,
    `Check-out: ${input.checkOut}`,
    `Nights: ${input.nights}`,
    `Total price: ${input.currency} ${input.totalAmount.toLocaleString("en-US")}`,
    depositLine,
    "",
    "Property rules:",
    "- Respect neighbors and quiet hours.",
    "- No parties or events.",
    "- No smoking inside the property.",
    "- Follow check-in and check-out schedule.",
    "",
    "By accepting this contract, the guest confirms agreement with all terms.",
  ].join("\n");
}

export function buildContractFilename(publicId: string, contractType: ContractType): string {
  return `${publicId}-${contractType}.pdf`;
}
