import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              🍽️ TesoritoOS
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              {user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-800"
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
