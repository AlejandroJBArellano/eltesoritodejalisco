export default function LoadingPOS() {
    return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <p className="text-sm font-bold text-text-light/50 uppercase tracking-widest animate-pulse">
                    Iniciando POS...
                </p>
            </div>
        </div>
    );
}