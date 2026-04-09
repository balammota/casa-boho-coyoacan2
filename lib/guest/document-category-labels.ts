/** Etiquetas fijas para panel admin (español). */
export function guestDocumentCategoryLabelEs(category: string): string {
  switch (category) {
    case "official_id":
      return "Identificación oficial";
    case "passport":
      return "Pasaporte";
    case "income_proof":
      return "Comprobante de ingresos / talones";
    case "other":
      return "Otro";
    default:
      return category;
  }
}
