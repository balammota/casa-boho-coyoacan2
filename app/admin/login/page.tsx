"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

const errorMessages: Record<string, string> = {
  forbidden:
    "Tu cuenta no está en la lista de administradores. Añade tu correo en Supabase (tabla admin_allowlist).",
  auth: "No se pudo completar el inicio de sesión.",
  config: "Faltan variables de entorno de Supabase en el servidor.",
};

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(
    urlError && errorMessages[urlError] ? errorMessages[urlError] : null
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      setMessage(
        "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local."
      );
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--ivory)] px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-[var(--dove-grey)]/60 bg-[var(--white)] px-8 py-10 shadow-soft-lg">
        <h1 className="text-center font-[family-name:var(--heading-font)] text-2xl font-semibold text-[var(--charcoal)]">
          Admin
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--charcoal)]/60">
          Casa Boho Coyoacán
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-[var(--charcoal)]/80">
            Correo
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-4 py-3 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--charcoal)]/80">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--dove-grey)] bg-[var(--white)] px-4 py-3 text-[var(--charcoal)] outline-none focus:border-[var(--gold)]/50 focus:ring-2 focus:ring-[var(--gold)]/20"
            />
          </label>
          {message && (
            <p className="text-sm text-red-700/90" role="alert">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--gold)] py-3.5 text-sm font-semibold uppercase tracking-wider text-[var(--white)] shadow-soft transition-colors hover:bg-[var(--dark-gold)] disabled:opacity-50"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--charcoal)]/50">
          <Link href="/" className="text-[var(--gold)] underline-offset-2 hover:underline">
            Volver al sitio
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--ivory)] text-sm text-[var(--charcoal)]/60">
          Cargando…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
