import { getPrimordialTasks, getTodayExecutions } from '@/lib/actions/tasks'
import { TareasClient } from '@/components/tareas/TareasClient'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function TareasPage() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  const tasks = await getPrimordialTasks()
  const executions = await getTodayExecutions()

  return (
    <main className="min-h-screen bg-[#121212] p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Checklist de Operación</h1>
        <TareasClient 
          initialTasks={tasks} 
          initialExecutions={executions} 
          userId={user.id} 
        />
      </div>
    </main>
  )
}
