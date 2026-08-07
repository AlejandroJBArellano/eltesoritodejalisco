import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-4 text-white">
      <div className="w-full max-w-md text-center space-y-6 bg-[#0e0e11] p-8 rounded-2xl border border-zinc-800/80 shadow-2xl">
        <div className="flex justify-center">
          <svg className="h-20 w-20 text-orange-500 animate-pulse" fill="none" viewBox="0 0 160 100" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 40,72 C 30,72 24,46 31,24 C 36,8 46,32 55,52" />
            <path d="M 120,72 C 130,72 136,46 129,24 C 124,8 114,32 105,52" />
            <path d="M 55,52 Q 80,44 105,52" />
            <path d="M 60,49 L 63,28 L 71,38 L 80,16 L 89,38 L 97,28 L 100,49" />
          </svg>
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
