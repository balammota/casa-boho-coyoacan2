import { NextResponse } from "next/server";

function normalizeHost(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Basic CSRF mitigation:
 * - allow same-origin browser requests by comparing Origin and Host.
 * - for non-browser clients with no Origin header, allow (used by tests/cron).
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const requestUrl = new URL(request.url);
  const originHost = normalizeHost(origin);
  const requestHost = requestUrl.host.toLowerCase();
  if (!originHost || originHost !== requestHost) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  return null;
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
