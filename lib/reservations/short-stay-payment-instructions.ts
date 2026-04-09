const ES = [
  "Para estancias cortas, el pago corresponde al total cotizado de tu reserva según las fechas seleccionadas.",
  "El pago se coordina con el anfitrión y puede realizarse mediante transferencia bancaria o en efectivo, según se acuerde previamente.",
  "Revisa la plantilla del contrato en PDF (idioma de tu elección) y firma en persona el día de tu llegada, salvo que el anfitrión indique otro procedimiento.",
].join("\n\n");

const EN = [
  "For short stays, payment is the quoted total for your reservation based on the dates you selected.",
  "Payment is coordinated with the host and may be made by bank transfer or in cash, as agreed in advance.",
  "Review the lease template PDF (in your preferred language) and sign in person on arrival day unless the host specifies otherwise.",
].join("\n\n");

export function getShortStayPaymentInstructions(locale: string): string {
  return locale === "en" ? EN : ES;
}
