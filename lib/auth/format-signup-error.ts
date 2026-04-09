import {
  isAuthApiError,
  isAuthWeakPasswordError,
} from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n/types";

export function shouldRetrySignupWithoutRedirect(err: unknown): boolean {
  if (!isAuthApiError(err)) return false;
  if (err.code === "validation_failed" && /redirect|url|not allowed/i.test(err.message))
    return true;
  return /redirect|invalid redirect|not allowed/i.test(err.message);
}

const copy = {
  es: {
    weakPassword: (detail: string) =>
      `La contraseña no cumple los requisitos: ${detail}`,
    emailExists:
      "Este correo ya está registrado. Usa «Iniciar sesión» con la misma cuenta.",
    signupDisabled:
      "Los registros nuevos están desactivados en Supabase (Authentication → Providers → Email → «Enable email signup»).",
    emailProviderDisabled:
      "El inicio de sesión con correo está desactivado en Supabase.",
    captchaFailed:
      "Falta o falló la verificación anti-robots (CAPTCHA). En Supabase revisa Authentication → Bot Protection, o desactívala para pruebas.",
    redirectNotAllowed: (url: string) =>
      `La URL de redirección no está permitida. En Supabase → Authentication → URL Configuration añade exactamente: ${url}`,
    validationFallback: "Los datos enviados no son válidos.",
    weakPasswordFallback: "La contraseña es demasiado débil.",
    rateLimitEmail:
      "Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.",
    hookRejected:
      "El registro fue rechazado por un Auth Hook en Supabase. Revisa Authentication → Hooks.",
    codeSuffix: (c: string) => ` (código: ${c})`,
    signupFailed: (c: string | undefined, http?: number) =>
      `Error al registrarse${c ? ` (${c})` : http ? ` — HTTP ${http}` : ""}.`,
    unknown: "Error desconocido al registrarse.",
  },
  en: {
    weakPassword: (detail: string) =>
      `Password does not meet requirements: ${detail}`,
    emailExists:
      "This email is already registered. Use “Sign in” with the same account.",
    signupDisabled:
      "New sign-ups are disabled in Supabase (Authentication → Providers → Email → enable email signup).",
    emailProviderDisabled: "Email sign-in is disabled in Supabase.",
    captchaFailed:
      "CAPTCHA verification failed or is missing. Check Authentication → Bot Protection in Supabase, or turn it off for testing.",
    redirectNotAllowed: (url: string) =>
      `Redirect URL is not allowed. In Supabase → Authentication → URL Configuration add exactly: ${url}`,
    validationFallback: "The submitted data is not valid.",
    weakPasswordFallback: "Password is too weak.",
    rateLimitEmail: "Too many emails sent. Wait a few minutes and try again.",
    hookRejected:
      "Sign-up was rejected by an Auth Hook in Supabase. Check Authentication → Hooks.",
    codeSuffix: (c: string) => ` (code: ${c})`,
    signupFailed: (c: string | undefined, http?: number) =>
      `Could not sign up${c ? ` (${c})` : http ? ` — HTTP ${http}` : ""}.`,
    unknown: "Unknown error while signing up.",
  },
} as const;

export function formatGuestSignupError(
  err: unknown,
  emailRedirectTo: string,
  locale: Locale = "es"
): string {
  const L = copy[locale] ?? copy.es;
  if (isAuthWeakPasswordError(err)) {
    const reasons = err.reasons?.length
      ? err.reasons.join(". ")
      : err.message;
    return L.weakPassword(reasons);
  }
  if (isAuthApiError(err)) {
    const code = err.code;
    const msg = err.message;
    switch (code) {
      case "email_exists":
      case "user_already_exists":
      case "phone_exists":
        return L.emailExists;
      case "signup_disabled":
        return L.signupDisabled;
      case "email_provider_disabled":
      case "provider_disabled":
        return L.emailProviderDisabled;
      case "captcha_failed":
        return L.captchaFailed;
      case "validation_failed":
        if (/redirect|url|not allowed/i.test(msg)) {
          return L.redirectNotAllowed(emailRedirectTo);
        }
        return msg || L.validationFallback;
      case "weak_password":
        return msg || L.weakPasswordFallback;
      case "over_email_send_rate_limit":
        return L.rateLimitEmail;
      case "hook_timeout":
      case "hook_timeout_after_retry":
      case "hook_payload_invalid_content_type":
      case "hook_payload_over_size_limit":
        return L.hookRejected;
      default:
        return msg
          ? `${msg}${code ? L.codeSuffix(code) : ""}`
          : L.signupFailed(code, err.status);
    }
  }
  return err instanceof Error ? err.message : L.unknown;
}
