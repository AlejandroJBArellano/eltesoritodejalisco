import { login, loginWithGoogle } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-4xl font-extrabold text-[#E0E0E0]">
            🍽️ TesoritoOS
          </h1>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-[#E0E0E0]">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>
        <form className="mt-8 space-y-6" action={login}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-md border-0 bg-[#181818] py-2.5 text-[#E0E0E0] ring-1 ring-inset ring-[#333333] placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#FFB7CE] sm:text-sm sm:leading-6 transition-colors"
                placeholder="Correo electrónico"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-md border-0 bg-[#181818] py-2.5 text-[#E0E0E0] ring-1 ring-inset ring-[#333333] placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#FFB7CE] sm:text-sm sm:leading-6 transition-colors"
                placeholder="Contraseña"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-500/50 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md bg-[#FFB7CE] px-3 py-2 text-sm font-bold text-[#121212] hover:bg-[#FFD1DC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB7CE] shadow-[#FFB7CE]/20 shadow-lg transition-all"
            >
              Entrar
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center">
          <div className="w-full border-t border-[#333333]"></div>
          <div className="px-3 text-sm text-gray-500 bg-[#121212] uppercase font-bold tracking-widest">O</div>
          <div className="w-full border-t border-[#333333]"></div>
        </div>

        <form action={loginWithGoogle}>
          <button
            type="submit"
            className="group relative flex w-full justify-center items-center gap-3 rounded-md border border-[#333333] bg-[#242424] px-3 py-2 text-sm font-semibold text-[#E0E0E0] hover:bg-[#333333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 transition-colors shadow-md"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </button>
        </form>
      </div>
    </div>
  )
}
