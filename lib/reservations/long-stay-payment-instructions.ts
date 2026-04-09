const ES = [
  "Para estancias largas, se solicitará un depósito de garantía equivalente a un mes de renta, el cual será reembolsado al finalizar la estancia, una vez que el departamento haya sido entregado y se verifique que el inmueble y sus bienes se encuentran en buen estado y sin daños.",
  "Asimismo, para poder ingresar al departamento será necesario cubrir el pago correspondiente al primer mes de renta por adelantado.",
  "Los pagos podrán realizarse mediante transferencia bancaria o en efectivo, según se acuerde previamente.",
].join("\n\n");

const EN = [
  "For long stays, a security deposit equivalent to one month's rent will be required. It will be refunded at the end of the stay once the apartment has been handed back and the property and its contents are verified to be in good condition and undamaged.",
  "To move in, you will also need to pay the first month of rent in advance.",
  "Payments may be made by bank transfer or in cash, as agreed in advance.",
].join("\n\n");

export const LONG_STAY_PAYMENT_INSTRUCTIONS = { es: ES, en: EN } as const;

export function getLongStayPaymentInstructions(locale: string): string {
  return locale === "en" ? LONG_STAY_PAYMENT_INSTRUCTIONS.en : LONG_STAY_PAYMENT_INSTRUCTIONS.es;
}
