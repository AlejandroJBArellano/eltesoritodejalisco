import { login, loginWithGoogle } from "./actions";
import { getTenantContext } from "@/lib/tenant";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const tenant = await getTenantContext();

  const systemName = tenant.system_name || "TesoritoOS";
  const endsWithOS = systemName.toLowerCase().endsWith("os");
  const prefix = endsWithOS ? systemName.slice(0, -2) : systemName;
  const suffix = endsWithOS ? systemName.slice(-2) : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-[#242424] p-8 rounded-2xl border border-white/10 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tighter uppercase">
            <span className="text-primary">{prefix}</span>
            {suffix && <span className="text-warning">{suffix}</span>}
          </h1>
          <h2 className="text-lg font-black text-[#E0E0E0] uppercase tracking-tight">
            Iniciar sesión
          </h2>
          <p className="text-xs font-medium text-[#E0E0E0]/50">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        <form className="space-y-4" action={login}>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="email-address"
                className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1"
              >
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3.5 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3.5 py-2.5 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 text-xs font-black text-dark uppercase tracking-wider hover:bg-secondary transition-all shadow-md active:scale-98 cursor-pointer"
          >
            Entrar
          </button>
        </form>

        <div className="flex items-center justify-center gap-3 my-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-black text-[#E0E0E0]/30 uppercase tracking-widest">
            O
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form action={loginWithGoogle}>
          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2.5 rounded-xl border border-white/10 bg-[#181818] px-4 py-3 text-xs font-bold text-[#E0E0E0] hover:bg-white/5 transition-all cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
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
