import { login, loginWithGoogle } from "./actions";
import { getTenantContext } from "@/lib/tenant";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const tenant = await getTenantContext();

  const systemName = tenant.system_name;
  const endsWithOS = systemName
    ? systemName.toLowerCase().endsWith("os")
    : false;
  const prefix = endsWithOS ? systemName.slice(0, -2) : systemName || "";
  const suffix = endsWithOS ? systemName.slice(-2) : "";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Subtle background ambient highlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)_0%,transparent_60%)] opacity-[0.03]" />

      <div className="relative w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xl">
        <div className="text-center space-y-3">
          {/* Logo container showing KITTN and Tenant logo if set */}
          <div className="flex items-center justify-center gap-3.5">
            {tenant.logo_url ? (
              <>
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-12 w-12 rounded-lg object-cover border border-border/80 shadow-xs"
                />
                <div className="h-6 w-px bg-border/80" />
                <img
                  src="/logo-icon-orange.svg"
                  alt="Kittn Logo"
                  className="h-12 w-12 object-contain"
                />
              </>
            ) : (
              <img
                src="/logo-icon-orange.svg"
                alt="Kittn Logo"
                className="h-14 w-14 object-contain"
              />
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">
              <span className="text-primary">{prefix}</span>
              {suffix && <span className="text-warning">{suffix}</span>}
            </h1>
            <h2 className="text-sm font-semibold text-text-light/90">
              Iniciar sesión
            </h2>
            <p className="text-xs text-text-light/50">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>
        </div>

        <form className="space-y-4" action={login}>
          <div className="space-y-3.5">
            <div>
              <label
                htmlFor="email-address"
                className="text-xs font-semibold text-text-light/70 block mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-border bg-dark/40 px-3.5 py-2.5 text-sm text-text-light outline-none transition-all placeholder:text-text-light/30 focus:border-primary focus:ring-1 focus:ring-primary/40"
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-xs font-semibold text-text-light/70 block mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-border bg-dark/40 px-3.5 py-2.5 text-sm text-text-light outline-none transition-all placeholder:text-text-light/30 focus:border-primary focus:ring-1 focus:ring-primary/40"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-medium text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-background transition-all hover:brightness-105 active:scale-[0.98] cursor-pointer shadow-sm"
          >
            Entrar
          </button>
        </form>

        <div className="flex items-center justify-center gap-3 my-2">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[11px] font-semibold text-text-light/30 uppercase tracking-wider">
            O
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <form action={loginWithGoogle}>
          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2.5 rounded-lg border border-border bg-dark/40 px-4 py-2.5 text-sm font-medium text-text-light hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </button>
        </form>
      </div>
    </div>
  );
}
