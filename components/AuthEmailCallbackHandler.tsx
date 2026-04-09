"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * Cuando la confirmación por email usa el Site URL del proyecto (sin redirect dedicado),
 * Supabase puede redirigir a "/" con ?code=... — intercambiamos el código en el cliente.
 */
export function AuthEmailCallbackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (pathname !== "/") return;
    const code = searchParams.get("code");
    if (!code || ran.current) return;
    ran.current = true;

    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) return;

    void (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        router.replace("/guest/dashboard");
        router.refresh();
        return;
      }
      router.replace("/guest/login?error=auth");
      router.refresh();
    })();
  }, [pathname, router, searchParams]);

  return null;
}
