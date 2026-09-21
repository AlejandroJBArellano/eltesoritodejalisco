export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-text-light">
      <div className="w-full max-w-md text-center space-y-6 bg-card p-8 rounded-xl border border-border shadow-sm">
        <div className="flex justify-center">
          <img
            src="/logo-icon-orange.svg"
            alt="Kittn Logo"
            className="h-16 w-16 object-contain"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black uppercase tracking-wider text-primary">
            No encontrado
          </h1>
          <p className="text-sm font-medium text-text-light/70 leading-relaxed">
            Esta página no existe.
          </p>
        </div>
      </div>
    </div>
  );
}
