export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-4 text-white">
      <div className="w-full max-w-md text-center space-y-6 bg-[#0e0e11] p-8 rounded-2xl border border-zinc-800/80 shadow-2xl">
        <div className="flex justify-center">
          <img
            src="/logo-icon-orange.svg"
            alt="Kittn Logo"
            className="h-20 w-20 object-contain animate-pulse"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-wider text-orange-500">
            404 - Sistema No Encontrado
          </h1>
          <p className="text-sm font-medium text-zinc-400 leading-relaxed">
            El restaurante o sistema de gestión solicitado no está registrado o configurado en la plataforma KITTN.
          </p>
          <p className="text-xs text-zinc-500 leading-normal">
            Verifica que la dirección web sea correcta (ejemplo: <span className="font-mono text-orange-400/80">mi-restaurante.admin.trykittn.com</span>).
          </p>
        </div>

        <div className="pt-2">
          <a
            href="https://trykittn.com"
            className="inline-flex w-full items-center justify-center rounded-xl bg-orange-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-orange-500 transition-colors"
          >
            Ir a trykittn.com
          </a>
        </div>
      </div>
    </div>
  );
}
