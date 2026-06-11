import { getTodayExecutions, getTaskCategories, getPrimordialTasks } from '@/lib/actions/tasks'
import { AdminTareasClient } from '@/components/tareas/AdminTareasClient'
import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminTareasPage() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  const executions = await getTodayExecutions()
  const categories = await getTaskCategories()
  const tasks = await getPrimordialTasks()

  return (
    <main className="min-h-screen bg-dark p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Administración de Tareas</h1>
        <p className="text-gray-400 mb-8">Control, monitoreo y configuración de tareas de operación diaria.</p>
        
        <AdminTareasClient 
          initialExecutions={executions} 
          initialCategories={categories}
          initialTasks={tasks}
        />
      </div>
    </main>
  )
}
