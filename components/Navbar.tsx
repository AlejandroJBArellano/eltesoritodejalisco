import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || "TesoritoOS";
  const endsWithOS = systemName.toLowerCase().endsWith("os");
  const prefix = endsWithOS ? systemName.slice(0, -2) : systemName;
  const suffix = endsWithOS ? systemName.slice(-2) : "";

  return (
    <nav className="bg-dark border-b border-dark/20 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-black tracking-tighter">
              <span className="text-primary">{prefix.toUpperCase()}</span>
              {suffix && <span className="text-warning">{suffix.toUpperCase()}</span>}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300 hidden sm:block font-medium">
              {user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-bold text-primary hover:text-primary/80 transition-colors bg-white/10 px-3 py-1.5 rounded-lg"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
