import { getTodayExecutions } from '@/lib/actions/tasks'
import { AdminTareasClient } from '@/components/tareas/AdminTareasClient'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminTareasPage() {
  const user = await getUser()
  // Ensure user is admin/manager here, though we just check login for now.
  if (!user) {
    redirect('/login')
  }

  const executions = await getTodayExecutions()

  return (
    <main className="min-h-screen bg-[#121212] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Administración de Tareas</h1>
        <p className="text-gray-400 mb-8">Control y monitoreo de tareas de operación del día.</p>
        
        <AdminTareasClient initialExecutions={executions} />
      </div>
    </main>
  )
}
