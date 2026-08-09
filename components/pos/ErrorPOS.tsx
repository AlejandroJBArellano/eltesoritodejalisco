import { PropsWithChildren } from "react";

export default function ErrorPOS({ children }: PropsWithChildren) {
    return <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="rounded-2xl bg-red-500/10 p-8 border border-red-500/20 max-w-md text-center">
            <h2 className="mb-3 text-lg font-black text-red-400 uppercase tracking-wider">
                Error de Conexión
            </h2>
            <p className="text-sm font-medium text-red-400/80 mb-6">
                {children}
            </p>
            <button
                onClick={() => window.location.reload()}
                className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all"
            >
                Reintentar
            </button>
        </div>
    </div>
}