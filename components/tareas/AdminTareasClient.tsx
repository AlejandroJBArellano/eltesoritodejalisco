"use client"

import { useState, useEffect } from 'react'
import { 
  approveTask, 
  getExecutionsForDate, 
  getStaffPerformanceMetrics,
  createTaskCategory, 
  updateTaskCategory, 
  deleteTaskCategory,
  createPrimordialTask, 
  updatePrimordialTask, 
  deletePrimordialTask 
} from '@/lib/actions/tasks'
import { TaskExecution, TaskCategory, PrimordialTask, TaskFrequency } from '@/types'

interface AdminTareasClientProps {
  initialExecutions: TaskExecution[]
  initialCategories: TaskCategory[]
  initialTasks: PrimordialTask[]
}

export function AdminTareasClient({ 
  initialExecutions, 
  initialCategories, 
  initialTasks 
}: AdminTareasClientProps) {
  // Navigation Tabs: 'history' | 'performance' | 'config'
  const [activeTab, setActiveTab] = useState<'history' | 'performance' | 'config'>('history')
  
  // Date state (defaults to today in Mexico City timezone YYYY-MM-DD format)
  const getTodayString = () => {
    const d = new Date()
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  }
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())
  
  // State for Executions & Performance Metrics
  const [executions, setExecutions] = useState<TaskExecution[]>(initialExecutions)
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // State for Categories & Tasks
  const [categories, setCategories] = useState<TaskCategory[]>(initialCategories)
  const [tasks, setTasks] = useState<PrimordialTask[]>(initialTasks)

  // Form states for Categories
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  // Form states for Tasks
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskFrequency, setNewTaskFrequency] = useState<TaskFrequency>('DAILY')
  const [newTaskRequiresPhoto, setNewTaskRequiresPhoto] = useState(false)
  const [newTaskTimeout, setNewTaskTimeout] = useState(60)
  const [newTaskCategoryId, setNewTaskCategoryId] = useState(initialCategories[0]?.id || '')

  // Edit Task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskName, setEditingTaskName] = useState('')
  const [editingTaskFrequency, setEditingTaskFrequency] = useState<TaskFrequency>('DAILY')
  const [editingTaskRequiresPhoto, setEditingTaskRequiresPhoto] = useState(false)
  const [editingTaskTimeout, setEditingTaskTimeout] = useState(60)
  const [editingTaskCategoryId, setEditingTaskCategoryId] = useState('')

  // Automatically set default category in task form once categories load
  useEffect(() => {
    if (categories.length > 0 && !newTaskCategoryId) {
      setNewTaskCategoryId(categories[0].id)
    }
  }, [categories, newTaskCategoryId])

  // Load executions & metrics when the selected date changes
  useEffect(() => {
    const loadData = async () => {
      setErrorMsg(null)
      try {
        const dateObj = new Date(selectedDate + 'T12:00:00')
        const now = new Date()
        if (dateObj.getMonth() !== now.getMonth() || dateObj.getFullYear() !== now.getFullYear()) {
          setErrorMsg("⚠️ Solo se permite consultar registros del mes en curso.")
          setExecutions([])
          setMetrics([])
          return
        }

        setLoading('data')
        const [execData, metricsData] = await Promise.all([
          getExecutionsForDate(selectedDate),
          getStaffPerformanceMetrics(selectedDate)
        ])
        setExecutions(execData)
        setMetrics(metricsData)
      } catch (err: any) {
        setErrorMsg(err.message || "Error al cargar registros.")
      } finally {
        setLoading(null)
      }
    }
    loadData()
  }, [selectedDate])

  // Approval handler
  const handleApprove = async (executionId: string) => {
    setLoading(executionId)
    try {
      const updatedExec = await approveTask(executionId)
      setExecutions(prev => prev.map(e => e.id === executionId ? { ...updatedExec, task: e.task, user: e.user } : e))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  // Category CRUD Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    try {
      setLoading('cat')
      const newCat = await createTaskCategory(newCategoryName)
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
    } catch (err: any) {
      alert(err.message || "Error al crear categoría")
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return
    try {
      setLoading('cat')
      const updatedCat = await updateTaskCategory(id, editingCategoryName)
      setCategories(prev => prev.map(c => c.id === id ? updatedCat : c))
      // Update local task catalog references
      setTasks(prev => prev.map(t => t.category_id === id ? { ...t, category: updatedCat } : t))
      setEditingCategoryId(null)
      setEditingCategoryName('')
    } catch (err: any) {
      alert(err.message || "Error al actualizar categoría")
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la categoría "${name}"? Las tareas asociadas quedarán sin categoría.`)) return
    try {
      setLoading('cat')
      await deleteTaskCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      // Update local task catalog references
      setTasks(prev => prev.map(t => t.category_id === id ? { ...t, category_id: undefined, category: undefined } : t))
    } catch (err: any) {
      alert(err.message || "Error al eliminar categoría")
    } finally {
      setLoading(null)
    }
  }

  // Task CRUD Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName.trim() || !newTaskCategoryId) return
    try {
      setLoading('task')
      const newTask = await createPrimordialTask(
        newTaskName,
        newTaskFrequency,
        newTaskRequiresPhoto,
        newTaskTimeout,
        newTaskCategoryId
      )
      // Resolve category relation locally
      const cat = categories.find(c => c.id === newTaskCategoryId)
      setTasks(prev => [...prev, { ...newTask, category: cat }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTaskName('')
      setNewTaskRequiresPhoto(false)
      setNewTaskTimeout(60)
    } catch (err: any) {
      alert(err.message || "Error al crear tarea")
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTaskId || !editingTaskName.trim() || !editingTaskCategoryId) return
    try {
      setLoading('task')
      const updated = await updatePrimordialTask(
        editingTaskId,
        editingTaskName,
        editingTaskFrequency,
        editingTaskRequiresPhoto,
        editingTaskTimeout,
        editingTaskCategoryId
      )
      const cat = categories.find(c => c.id === editingTaskCategoryId)
      setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...updated, category: cat } : t))
      setEditingTaskId(null)
    } catch (err: any) {
      alert(err.message || "Error al actualizar tarea")
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteTask = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas desactivar la tarea "${name}"? No aparecerá en el checklist diario pero se conservará su historial de ejecuciones.`)) return
    try {
      setLoading('task')
      await deletePrimordialTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err: any) {
      alert(err.message || "Error al desactivar la tarea")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation tabs & Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex gap-2 bg-[#242424] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'history' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Historial
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'performance' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            📊 Rendimiento
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'config' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚙️ Configuración
          </button>
        </div>

        {activeTab !== 'config' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#242424] border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary font-bold"
            />
          </div>
        )}
      </div>

      {/* Error display */}
      {errorMsg && (
        <div className="p-4 bg-red-900/40 border border-red-500/20 text-red-200 rounded-xl text-sm font-semibold animate-pulse">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: HISTORY & MONITORING */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              Ejecución de Tareas - {selectedDate}
            </h2>
            {loading === 'data' && <span className="text-xs text-primary animate-pulse font-bold">Cargando...</span>}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#181818] shadow-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-300 font-medium">
                <thead className="bg-[#242424] text-xs font-black text-white uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left">Tarea</th>
                    <th className="px-6 py-4 text-left">Colaborador</th>
                    <th className="px-6 py-4 text-left">Estado</th>
                    <th className="px-6 py-4 text-left">Inicio</th>
                    <th className="px-6 py-4 text-left">Duración Neta</th>
                    <th className="px-6 py-4 text-left">Evidencia</th>
                    <th className="px-6 py-4 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {executions.map(exec => {
                    const taskName = exec.task?.name || 'Desconocida'
                    const userName = exec.user?.full_name || 'Desconocido'
                    
                    return (
                      <tr key={exec.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-white font-bold">{taskName}</td>
                        <td className="px-6 py-4 text-gray-400">{userName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            exec.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            exec.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            exec.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                            'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                          }`}>
                            {exec.status === 'COMPLETED' ? 'Listo para Aprobar' : 
                             exec.status === 'APPROVED' ? 'Aprobado' : 
                             exec.status === 'IN_PROGRESS' ? 'Activo' : exec.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">
                          {exec.start_time ? new Date(exec.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {exec.net_duration_minutes !== undefined ? `${exec.net_duration_minutes} min` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {exec.photo_url ? (
                            <a 
                              href={exec.photo_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-primary hover:underline font-bold text-xs uppercase tracking-wider"
                            >
                              Ver Foto
                            </a>
                          ) : <span className="text-gray-600">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          {exec.status === 'COMPLETED' && (
                            <button 
                              onClick={() => handleApprove(exec.id)}
                              disabled={loading === exec.id}
                              className="bg-primary hover:bg-primary/95 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                            >
                              {loading === exec.id ? '...' : 'Aprobar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  
                  {executions.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider">
                        No hay ejecuciones registradas para esta fecha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              Resumen de Rendimiento - {selectedDate}
            </h2>
            {loading === 'data' && <span className="text-xs text-primary animate-pulse font-bold">Cargando...</span>}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#181818] shadow-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-300 font-medium">
                <thead className="bg-[#242424] text-xs font-black text-white uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left">Colaborador</th>
                    <th className="px-6 py-4 text-left">Tareas Completadas</th>
                    <th className="px-6 py-4 text-left">Duración Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {metrics.map(collab => (
                    <tr key={collab.userId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-white font-bold">{collab.name}</td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-md">{collab.completedCount} tareas</td>
                      <td className="px-6 py-4 font-bold text-white font-mono text-md">{collab.avgDurationMinutes} min / tarea</td>
                    </tr>
                  ))}
                  
                  {metrics.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-wider">
                        No hay métricas completadas para esta fecha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURATION (CRUD) */}
      {activeTab === 'config' && (
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* CATEGORIES MANAGEMENT */}
          <div className="space-y-6 bg-[#181818] p-6 rounded-2xl border border-white/5">
            <h2 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">
              📂 Gestionar Categorías
            </h2>

            {/* Create Category Form */}
            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nueva categoría..."
                className="bg-[#242424] border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary flex-1 font-bold"
              />
              <button
                type="submit"
                disabled={loading === 'cat'}
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
              >
                +
              </button>
            </form>

            {/* Categories List */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center bg-[#242424] p-3 rounded-xl border border-white/5">
                  {editingCategoryId === cat.id ? (
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="bg-[#181818] border border-primary text-white rounded-lg px-2 py-1 text-xs focus:outline-none flex-1 mr-2"
                    />
                  ) : (
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{cat.name}</span>
                  )}

                  <div className="flex gap-1">
                    {editingCategoryId === cat.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateCategory(cat.id)}
                          className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded"
                        >
                          Ok
                        </button>
                        <button
                          onClick={() => setEditingCategoryId(null)}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded"
                        >
                          X
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingCategoryId(cat.id)
                            setEditingCategoryName(cat.name)
                          }}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TASKS MANAGEMENT */}
          <div className="space-y-6 bg-[#181818] p-6 rounded-2xl border border-white/5">
            <h2 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">
              ✅ Gestionar Catálogo de Tareas
            </h2>

            {/* Create or Edit Task Form */}
            {editingTaskId ? (
              <form onSubmit={handleUpdateTask} className="space-y-3 bg-[#242424] p-4 rounded-xl border border-white/5">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">Editar Tarea</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingTaskName}
                    onChange={(e) => setEditingTaskName(e.target.value)}
                    placeholder="Nombre de la tarea..."
                    className="bg-[#181818] border border-white/10 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary w-full font-bold"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editingTaskCategoryId}
                      onChange={(e) => setEditingTaskCategoryId(e.target.value)}
                      className="bg-[#181818] border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-bold"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                      value={editingTaskFrequency}
                      onChange={(e) => setEditingTaskFrequency(e.target.value as TaskFrequency)}
                      className="bg-[#181818] border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="CONTINUOUS">Continuo</option>
                      <option value="DAILY">Diario</option>
                      <option value="ROUTINE">Rutina</option>
                      <option value="VARIABLE">Variable</option>
                      <option value="WEEKLY">Semanal</option>
                      <option value="CLOSING">Cierre</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs text-gray-400 font-bold flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editingTaskRequiresPhoto} 
                        onChange={(e) => setEditingTaskRequiresPhoto(e.target.checked)}
                        className="rounded border-[#333] accent-primary"
                      />
                      Exige foto evidencia
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Timeout:</span>
                      <input 
                        type="number" 
                        value={editingTaskTimeout} 
                        onChange={(e) => setEditingTaskTimeout(Number(e.target.value))}
                        className="bg-[#181818] border border-[#333] text-white text-xs px-2 py-1 rounded w-14 text-center font-bold" 
                      />
                      <span className="text-xs text-gray-500">min</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-white font-black text-[10px] uppercase tracking-widest py-2 px-3 rounded-lg flex-1 transition-all"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTaskId(null)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-black text-[10px] uppercase tracking-widest py-2 px-3 rounded-lg flex-1 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateTask} className="space-y-3 bg-[#242424] p-4 rounded-xl border border-white/5">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">+ Crear Nueva Tarea</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Nombre de la tarea..."
                    className="bg-[#181818] border border-white/10 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary w-full font-bold"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newTaskCategoryId}
                      onChange={(e) => setNewTaskCategoryId(e.target.value)}
                      className="bg-[#181818] border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-bold"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                      value={newTaskFrequency}
                      onChange={(e) => setNewTaskFrequency(e.target.value as TaskFrequency)}
                      className="bg-[#181818] border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="CONTINUOUS">Continuo</option>
                      <option value="DAILY">Diario</option>
                      <option value="ROUTINE">Rutina</option>
                      <option value="VARIABLE">Variable</option>
                      <option value="WEEKLY">Semanal</option>
                      <option value="CLOSING">Cierre</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs text-gray-400 font-bold flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newTaskRequiresPhoto} 
                        onChange={(e) => setNewTaskRequiresPhoto(e.target.checked)}
                        className="rounded border-[#333] accent-primary"
                      />
                      Exige foto evidencia
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Timeout:</span>
                      <input 
                        type="number" 
                        value={newTaskTimeout} 
                        onChange={(e) => setNewTaskTimeout(Number(e.target.value))}
                        className="bg-[#181818] border border-[#333] text-white text-xs px-2 py-1 rounded w-14 text-center font-bold" 
                      />
                      <span className="text-xs text-gray-500">min</span>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/95 text-white font-black text-[10px] uppercase tracking-widest py-2 rounded-lg transition-all"
                >
                  Agregar Tarea
                </button>
              </form>
            )}

            {/* Tasks List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {tasks.map(task => (
                <div key={task.id} className="flex justify-between items-center bg-[#242424] p-3 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{task.name}</span>
                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider mt-0.5">
                      📂 {task.category?.name || 'Sin categoría'} | ⏱️ {task.frequency_type}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTaskId(task.id)
                        setEditingTaskName(task.name)
                        setEditingTaskFrequency(task.frequency_type)
                        setEditingTaskRequiresPhoto(task.requires_photo)
                        setEditingTaskTimeout(task.timeout_minutes)
                        setEditingTaskCategoryId(task.category_id || '')
                      }}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id, task.name)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
