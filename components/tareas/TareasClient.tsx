"use client"

import { useState, useEffect, useRef } from 'react'
import { startTask, pauseTask, resumeTask, completeTask } from '@/lib/actions/tasks'
import { PrimordialTask, TaskExecution, TaskStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'

export function TareasClient({ 
  initialTasks, 
  initialExecutions, 
  userId 
}: { 
  initialTasks: PrimordialTask[], 
  initialExecutions: TaskExecution[], 
  userId: string 
}) {
  const [executions, setExecutions] = useState<TaskExecution[]>(initialExecutions)
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  
  // Guardar las fotos seleccionadas por ejecución
  const [selectedPhotos, setSelectedPhotos] = useState<{ [execId: string]: File }>({})
  
  // Controlar alertas de Timeout
  const [timeoutAlert, setTimeoutAlert] = useState<{ exec: TaskExecution, task: PrimordialTask } | null>(null)
  
  // Estado para forzar re-renderizado del temporizador cada segundo
  const [now, setNow] = useState(new Date())

  const supabase = createClient()

  // Actualizar el reloj interno cada segundo para animar los temporizadores
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Comprobar periódicamente si hay tareas con Timeout
  useEffect(() => {
    const checkTimeout = () => {
      executions.forEach(exec => {
        if (exec.status !== 'IN_PROGRESS' || !exec.start_time) return
        
        const task = initialTasks.find(t => t.id === exec.task_id)
        if (!task) return

        const startTime = new Date(exec.start_time)
        const elapsedSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
        const netMinutes = Math.floor((elapsedSeconds - (exec.paused_seconds || 0)) / 60)

        // Si excede el límite y no se ha mostrado la alerta aún
        if (netMinutes >= task.timeout_minutes && !timeoutAlert) {
          setTimeoutAlert({ exec, task })
        }
      })
    }

    const alertTimer = setInterval(checkTimeout, 10000) // Revisar cada 10 seg
    return () => clearInterval(alertTimer)
  }, [executions, initialTasks, timeoutAlert])

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
      setExecutions(prev => prev.map(e => e.id === executionId ? { ...updatedExec, task: e.task } : e))
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
      setExecutions(prev => prev.map(e => e.id === executionId ? { ...updatedExec, task: e.task } : e))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTaskId(null)
    }
  }

  const handleFileChange = (execId: string, file: File | null) => {
    if (file) {
      setSelectedPhotos(prev => ({ ...prev, [execId]: file }))
    }
  }

  const handleComplete = async (exec: TaskExecution, task: PrimordialTask) => {
    const file = selectedPhotos[exec.id]
    
    // Validar si la tarea exige foto obligatoria
    if (task.requires_photo && !file) {
      alert(`⚠️ La tarea "${task.name}" requiere una foto de evidencia para poder completarse.`)
      return
    }

    setLoadingTaskId(exec.id)
    try {
      let photoUrl = ''
      
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${exec.id}-${Date.now()}.${fileExt}`
        const filePath = `tasks/${fileName}`

        // Subir foto al bucket de Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('task-photos')
          .upload(filePath, file)

        if (uploadError) {
          throw new Error(`Error subiendo foto: ${uploadError.message}`)
        }

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('task-photos')
          .getPublicUrl(filePath)

        photoUrl = publicUrl
      }

      const updatedExec = await completeTask(exec.id, photoUrl)
      
      // Limpiar foto seleccionada
      setSelectedPhotos(prev => {
        const copy = { ...prev }
        delete copy[exec.id]
        return copy
      })

      setExecutions(prev => prev.map(e => e.id === exec.id ? { ...updatedExec, task: e.task } : e))
    } catch (e: any) {
      alert(e.message || "Error al completar la tarea")
      console.error(e)
    } finally {
      setLoadingTaskId(null)
    }
  }

  // Calcular tiempo en vivo
  const getLiveTimerString = (exec: TaskExecution) => {
    if (!exec.start_time) return '00:00'
    
    const startTime = new Date(exec.start_time)
    let elapsedSeconds = 0

    if (exec.status === 'IN_PROGRESS') {
      elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    } else if (exec.status === 'PAUSED' && exec.end_time) {
      const endTime = new Date(exec.end_time)
      elapsedSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
    } else {
      // Si está en pausa o completado y no tenemos end_time a la mano
      return 'Pausado'
    }

    const netSeconds = elapsedSeconds - (exec.paused_seconds || 0)
    const displaySeconds = netSeconds > 0 ? netSeconds : 0
    
    const h = Math.floor(displaySeconds / 3600)
    const m = Math.floor((displaySeconds % 3600) / 60)
    const s = displaySeconds % 60

    const pad = (num: number) => String(num).padStart(2, '0')
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Olvido (Timeout Modal) */}
      {timeoutAlert && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#242424] border border-red-500/30 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <div className="text-center">
              <span className="text-4xl">⏰</span>
              <h3 className="text-lg font-black text-white mt-2">¿Sigues trabajando en esto?</h3>
              <p className="text-gray-400 text-sm mt-1">
                La tarea <strong className="text-red-400">"{timeoutAlert.task.name}"</strong> lleva activa más de {timeoutAlert.task.timeout_minutes} minutos.
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => setTimeoutAlert(null)}
                className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-xl transition-all"
              >
                Sí, sigo trabajando
              </button>
              <button 
                onClick={() => {
                  handleComplete(timeoutAlert.exec, timeoutAlert.task)
                  setTimeoutAlert(null)}
                }
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-2.5 rounded-xl transition-all"
              >
                Olvidé cerrarla, Completar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Tareas */}
      <div className="grid gap-4">
        {initialTasks.map(task => {
          const activeExecution = executions.find(
            e => e.task_id === task.id && (e.status === 'IN_PROGRESS' || e.status === 'PAUSED')
          )
          
          return (
            <div 
              key={task.id} 
              className={`p-6 rounded-2xl border transition-all ${
                activeExecution 
                  ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(235,94,85,0.05)]' 
                  : 'bg-[#242424] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase">
                    {task.name}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/60 font-bold uppercase tracking-wider">
                      {task.frequency_type}
                    </span>
                    {task.requires_photo && (
                      <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full text-yellow-500 font-bold uppercase tracking-wider">
                        📸 Requiere Foto
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {activeExecution ? (
                <div className="mt-6 border-t border-white/5 pt-4 space-y-4 animate-slide-down">
                  <div className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl">
                    <span className="text-sm font-bold text-white/50 uppercase tracking-wider">
                      {activeExecution.status === 'PAUSED' ? '⏱️ Pausado' : '⚡ En progreso'}
                    </span>
                    <span className="text-lg font-black text-white font-mono tracking-wider">
                      {getLiveTimerString(activeExecution)}
                    </span>
                  </div>

                  {/* Input de Cámara si requiere foto */}
                  {task.requires_photo && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider block">
                        Subir Foto de Evidencia
                      </label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={(e) => handleFileChange(activeExecution.id, e.target.files?.[0] || null)}
                        className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-primary file:text-white hover:file:bg-primary/95 file:cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    {activeExecution.status === 'IN_PROGRESS' ? (
                      <button 
                        onClick={() => handlePause(activeExecution.id)}
                        disabled={loadingTaskId === activeExecution.id}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white font-black text-xs uppercase tracking-widest py-3 px-4 rounded-xl flex-1 transition-all disabled:opacity-50"
                      >
                        Pausar
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleResume(activeExecution.id)}
                        disabled={loadingTaskId === activeExecution.id}
                        className="bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-widest py-3 px-4 rounded-xl flex-1 transition-all disabled:opacity-50"
                      >
                        Reanudar
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleComplete(activeExecution, task)}
                      disabled={loadingTaskId === activeExecution.id}
                      className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3 px-4 rounded-xl flex-1 transition-all disabled:opacity-50"
                    >
                      Completar
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => handleStart(task.id)}
                  disabled={loadingTaskId === task.id}
                  className="mt-6 w-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-black text-xs uppercase tracking-widest py-3 px-4 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loadingTaskId === task.id ? 'Iniciando...' : 'Iniciar Tarea'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
