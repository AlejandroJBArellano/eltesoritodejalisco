"use client"

import { useState } from 'react'
import { approveTask } from '@/lib/actions/tasks'
import { TaskExecution } from '@/types'

export function AdminTareasClient({ initialExecutions }: { initialExecutions: TaskExecution[] }) {
  const [executions, setExecutions] = useState<TaskExecution[]>(initialExecutions)
  const [loading, setLoading] = useState<string | null>(null)

  const handleApprove = async (executionId: string) => {
    setLoading(executionId)
    try {
      const updatedExec = await approveTask(executionId)
      setExecutions(prev => prev.map(e => e.id === executionId ? updatedExec : e))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-800 text-white rounded-lg overflow-hidden">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Tarea</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Inicio</th>
              <th className="px-4 py-3 text-left">Duración Neta</th>
              <th className="px-4 py-3 text-left">Foto</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {executions.map(exec => {
              const taskName = exec.task?.name || 'Desconocida'
              
              return (
                <tr key={exec.id}>
                  <td className="px-4 py-3">{taskName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      exec.status === 'COMPLETED' ? 'bg-green-600' :
                      exec.status === 'APPROVED' ? 'bg-blue-600' :
                      exec.status === 'IN_PROGRESS' ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}>
                      {exec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {exec.start_time ? new Date(exec.start_time).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {exec.net_duration_minutes !== undefined ? `${exec.net_duration_minutes} min` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {exec.photo_url ? (
                      <a href={exec.photo_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Ver Foto</a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {exec.status === 'COMPLETED' && exec.task?.requires_photo && (
                      <button 
                        onClick={() => handleApprove(exec.id)}
                        disabled={loading === exec.id}
                        className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm disabled:opacity-50"
                      >
                        {loading === exec.id ? '...' : 'Aprobar'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            
            {executions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-400">
                  No hay ejecuciones registradas hoy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
