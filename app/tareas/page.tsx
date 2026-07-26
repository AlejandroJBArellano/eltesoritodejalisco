import { getPrimordialTasks, getTodayExecutions } from '@/lib/actions/tasks'
import { TareasClient } from '@/components/tareas/TareasClient'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckSquare } from 'lucide-react'

export default async function TareasPage() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  const tasks = await getPrimordialTasks()
  const executions = await getTodayExecutions()

  return (
    <main className="min-h-screen bg-[#121212] pb-16">
      {/* Top Header */}
      <header className="bg-[#242424] border-b border-white/5 shadow-sm mb-8">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-black text-[#E0E0E0]/60 hover:text-white uppercase tracking-widest transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-primary animate-pulse"></span>
                Checklist & Tareas Diarias
              </h1>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">
                Operación
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <TareasClient 
          initialTasks={tasks} 
          initialExecutions={executions} 
          userId={user.id} 
        />
      </div>
    </main>
  )
}
