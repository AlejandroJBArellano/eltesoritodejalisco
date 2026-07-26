"use client"

import { useState, useEffect } from 'react'
import { startTask, pauseTask, resumeTask, completeTask } from '@/lib/actions/tasks'
import { PrimordialTask, TaskExecution } from '@/types'
import { createClient } from '@/lib/supabase/client'
import {
  Folder,
  Camera,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'

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

  // Error states (replacing alert)
  const [photoErrors, setPhotoErrors] = useState<{ [execId: string]: string }>({})
  const [taskError, setTaskError] = useState<string | null>(null)

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

        if (netMinutes >= task.timeout_minutes && !timeoutAlert) {
          setTimeoutAlert({ exec, task })
        }
      })
    }

    const alertTimer = setInterval(checkTimeout, 10000)
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

    if (task.requires_photo && !file) {
      setPhotoErrors(prev => ({ ...prev, [exec.id]: `Esta tarea requiere una foto de evidencia para completarse.` }))
      return
    }
    setPhotoErrors(prev => { const c = { ...prev }; delete c[exec.id]; return c })
    setTaskError(null)

    setLoadingTaskId(exec.id)
    try {
      let photoUrl = ''
      
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${exec.id}-${Date.now()}.${fileExt}`
        const filePath = `tasks/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('task-photos')
          .upload(filePath, file)

        if (uploadError) {
          throw new Error(`Error subiendo foto: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('task-photos')
          .getPublicUrl(filePath)

        photoUrl = publicUrl
      }

      const updatedExec = await completeTask(exec.id, photoUrl)
      
      setSelectedPhotos(prev => {
        const copy = { ...prev }
        delete copy[exec.id]
        return copy
      })

      setExecutions(prev => prev.map(e => e.id === exec.id ? { ...updatedExec, task: e.task } : e))
    } catch (e: any) {
      setTaskError(e.message || "Error al completar la tarea")
      console.error(e)
    } finally {
      setLoadingTaskId(null)
    }
  }

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
    <div className="space-y-8">
      {/* Timeout Alert Modal */}
      {timeoutAlert && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#242424] border border-red-500/30 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="rounded-2xl bg-red-500/10 p-4 text-red-400 w-16 h-16 mx-auto flex items-center justify-center mb-3 border border-red-500/20">
                <Clock className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-[#E0E0E0] uppercase tracking-tight">¿Sigues trabajando en esto?</h3>
              <p className="text-[#E0E0E0]/60 text-xs mt-2 font-medium">
                La tarea <strong className="text-red-400 font-bold">"{timeoutAlert.task.name}"</strong> lleva activa más de {timeoutAlert.task.timeout_minutes} minutos.
              </p>
            </div>
            <div className="flex flex-col space-y-2 pt-2">
              <button 
                onClick={() => setTimeoutAlert(null)}
                className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Sí, sigo trabajando
              </button>
              <button 
                onClick={() => {
                  handleComplete(timeoutAlert.exec, timeoutAlert.task)
                  setTimeoutAlert(null)}
                }
                className="bg-[#181818] border border-white/10 hover:bg-white/10 text-[#E0E0E0] font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Olvidé cerrarla, Completar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List Grouped by Category */}
      <div className="space-y-10">
        {Object.entries(
          initialTasks.reduce((acc, task) => {
            const catName = task.category?.name || "Sin Categoría";
            if (!acc[catName]) {
              acc[catName] = [];
            }
            acc[catName].push(task);
            return acc;
          }, {} as { [categoryName: string]: PrimordialTask[] })
        ).map(([categoryName, tasks]) => (
          <div key={categoryName} className="space-y-4">
            <h2 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2.5 border-b border-white/5 pb-3">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              <Folder className="h-4 w-4 text-primary" /> {categoryName}
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {tasks.map((task) => {
                const activeExecution = executions.find(
                  (e) => e.task_id === task.id && (e.status === 'IN_PROGRESS' || e.status === 'PAUSED')
                )

                return (
                  <div 
                    key={task.id} 
                    className={`p-6 rounded-2xl border transition-all duration-300 ${
                      activeExecution 
                        ? 'bg-[#242424] border-primary/40 shadow-lg shadow-primary/5' 
                        : 'bg-[#242424] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase">
                          {task.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-black text-[#E0E0E0]/60 uppercase tracking-widest">
                            {task.frequency_type}
                          </span>
                          {task.requires_photo && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                              <Camera className="h-3 w-3 text-amber-400" /> Evidencia Foto
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {activeExecution ? (
                      <div className="mt-6 border-t border-white/5 pt-4 space-y-4">
                        <div className="flex justify-between items-center bg-[#181818] px-4 py-3 rounded-xl border border-white/5">
                          <span className="text-xs font-black text-[#E0E0E0]/50 uppercase tracking-wider flex items-center gap-1.5">
                            {activeExecution.status === 'PAUSED' ? (
                              <>
                                <Pause className="h-3.5 w-3.5 text-amber-400" /> Pausado
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" /> En progreso
                              </>
                            )}
                          </span>
                          <span className="text-lg font-black text-[#E0E0E0] font-mono tracking-wider">
                            {getLiveTimerString(activeExecution)}
                          </span>
                        </div>

                        {/* Input Camera / Photo upload if required */}
                        {task.requires_photo && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[#E0E0E0]/60 uppercase tracking-wider block">
                              Subir Foto de Evidencia
                            </label>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              onChange={(e) => handleFileChange(activeExecution.id, e.target.files?.[0] || null)}
                              className="block w-full text-xs text-[#E0E0E0]/60 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2.5 file:text-xs file:font-black file:text-[#E0E0E0] hover:file:bg-white/20 file:transition-all cursor-pointer"
                            />
                            {photoErrors[activeExecution.id] && (
                              <p className="text-xs font-bold text-red-400 mt-1">
                                ⚠️ {photoErrors[activeExecution.id]}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3">
                          {activeExecution.status === 'IN_PROGRESS' ? (
                            <button 
                              onClick={() => handlePause(activeExecution.id)}
                              disabled={loadingTaskId === activeExecution.id}
                              className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                            >
                              <Pause className="h-4 w-4" /> Pausar
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleResume(activeExecution.id)}
                              disabled={loadingTaskId === activeExecution.id}
                              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                            >
                              <RotateCcw className="h-4 w-4" /> Reanudar
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleComplete(activeExecution, task)}
                            disabled={loadingTaskId === activeExecution.id}
                            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Completar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleStart(task.id)}
                        disabled={loadingTaskId === task.id}
                        className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Play className="h-4 w-4 fill-current" /> {loadingTaskId === task.id ? 'Iniciando...' : 'Iniciar Tarea'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
