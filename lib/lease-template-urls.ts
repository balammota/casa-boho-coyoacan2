/** Validación de enlaces a plantillas PDF (http/https). */

export function isAllowedExternalDocUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
