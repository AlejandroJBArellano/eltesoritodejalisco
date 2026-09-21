import { PropsWithChildren } from "react";

export default function ErrorPOS({ children }: PropsWithChildren) {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="rounded-xl bg-card p-8 border border-rose-500/20 max-w-md text-center shadow-lg">
        <h2 className="mb-3 text-lg font-black text-rose-400 uppercase tracking-wider">
          Error de Conexión
        </h2>
        <p className="text-sm font-medium text-text-light/70 mb-6">{children}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-background px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider hover:bg-primary-hover active:scale-[0.98] transition-all shadow-sm cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
