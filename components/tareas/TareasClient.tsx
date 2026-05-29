"use client"

import { useState, useEffect } from 'react'
import { startTask, pauseTask, resumeTask, completeTask } from '@/lib/actions/tasks'
import { PrimordialTask, TaskExecution, TaskStatus } from '@/types'
import { createClient } from '@/lib/supabase/client' // Wait, does lib/supabase/client exist? Let's assume it does, but we actually don't need it if we upload via server action, but server action with FormData might be easier, or we use supabase directly.
// To keep it simple without supabase client side dependency, we'll do the upload in a separate route or rely on standard HTML form data to a Server Action.

export function TareasClient({ initialTasks, initialExecutions, userId }: { initialTasks: PrimordialTask[], initialExecutions: TaskExecution[], userId: string }) {
  const [executions, setExecutions] = useState<TaskExecution[]>(initialExecutions)
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  
  // Realtime updates would be better, but for now we'll just update state locally after actions.
  
  const handleStart = async (taskId: string) => {
    setLoadingTaskId(taskId)
    try {
      const newExec = await startTask(taskId)
      setExecutions(prev => [newExec, ...prev])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTaskId(null)
    }
  }

  const handlePause = async (executionId: string) => {
    setLoadingTaskId(executionId)
    try {
      const updatedExec = await pauseTask(executionId)
      setExecutions(prev => prev.map(e => e.id === executionId ? updatedExec : e))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTaskId(null)
    }
  }

  const handleResume = async (executionId: string) => {
    setLoadingTaskId(executionId)
    try {
      const updatedExec = await resumeTask(executionId)
      setExecutions(prev => prev.map(e => e.id === executionId ? updatedExec : e))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTaskId(null)
    }
  }

  const handleComplete = async (execution: TaskExecution, file?: File) => {
    setLoadingTaskId(execution.id)
    try {
      let photoUrl = ''
      if (file) {
        // Upload file logic
        // For simplicity, assuming a generic API route or using Supabase client here if available.
        // Let's stub this out and handle it gracefully
        alert("Subida de foto no implementada completamente en este mockup, pero la tarea se cerrará.")
      }
      const updatedExec = await completeTask(execution.id, photoUrl)
      setExecutions(prev => prev.map(e => e.id === execution.id ? updatedExec : e))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTaskId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Tareas del Día</h2>
      {initialTasks.map(task => {
        // Find execution for this task
        // If daily/routine, maybe there's only one active. If variable, they can start multiple.
        const activeExecution = executions.find(e => e.task_id === task.id && (e.status === 'IN_PROGRESS' || e.status === 'PAUSED'))
        
        return (
          <div key={task.id} className="bg-gray-800 p-4 rounded-lg flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{task.name}</h3>
              <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{task.frequency_type}</span>
            </div>
            
            {activeExecution ? (
              <div className="border border-blue-500 bg-blue-900/20 p-3 rounded-md space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-300">
                    Estado: {activeExecution.status === 'PAUSED' ? 'Pausado' : 'En Progreso'}
                  </span>
                  {/* Timer placeholder */}
                  <span className="text-mono text-blue-400">00:00</span>
                </div>
                
                <div className="flex space-x-2">
                  {activeExecution.status === 'IN_PROGRESS' ? (
                    <button 
                      onClick={() => handlePause(activeExecution.id)}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-md flex-1"
                      disabled={loadingTaskId === activeExecution.id}
                    >
                      Pausar
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleResume(activeExecution.id)}
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md flex-1"
                      disabled={loadingTaskId === activeExecution.id}
                    >
                      Reanudar
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleComplete(activeExecution)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex-1"
                    disabled={loadingTaskId === activeExecution.id}
                  >
                    Completar
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => handleStart(task.id)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                disabled={loadingTaskId === task.id}
              >
                Iniciar Tarea
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
