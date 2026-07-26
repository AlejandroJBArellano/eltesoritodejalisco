"use client"

import { useState, useEffect, useMemo } from 'react'
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
import { Modal } from '@/components/ui/Modal'
import { TableSearchInput, TableHeaderSortCell, TablePagination } from '@/components/ui/DataTableControls'
import { CheckSquare, Plus, FolderPlus, Edit3, Trash2, CheckCircle2 } from 'lucide-react'

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
  const [armedCatId, setArmedCatId] = useState<string | null>(null)
  const [armedTaskId, setArmedTaskId] = useState<string | null>(null)

  // State for Categories & Tasks
  const [categories, setCategories] = useState<TaskCategory[]>(initialCategories)
  const [tasks, setTasks] = useState<PrimordialTask[]>(initialTasks)

  // Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

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

  // Table Controls State - Executions Table
  const [execSearch, setExecSearch] = useState('')
  const [execStatusFilter, setExecStatusFilter] = useState('ALL')
  const [execSortField, setExecSortField] = useState<'task' | 'user' | 'status' | 'duration'>('task')
  const [execSortDir, setExecSortDir] = useState<'asc' | 'desc'>('asc')
  const [execPage, setExecPage] = useState(1)
  const [execPageSize, setExecPageSize] = useState(10)

  // Table Controls State - Tasks Table
  const [taskSearch, setTaskSearch] = useState('')
  const [taskCatFilter, setTaskCatFilter] = useState('ALL')
  const [taskFreqFilter, setTaskFreqFilter] = useState('ALL')
  const [taskSortField, setTaskSortField] = useState<'name' | 'category' | 'frequency'>('name')
  const [taskSortDir, setTaskSortDir] = useState<'asc' | 'desc'>('asc')
  const [taskPage, setTaskPage] = useState(1)
  const [taskPageSize, setTaskPageSize] = useState(10)

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

  const handleApprove = async (executionId: string) => {
    try {
      setLoading(executionId)
      await approveTask(executionId)
      setExecutions(prev => prev.map(e => e.id === executionId ? { ...e, status: 'APPROVED' } : e))
    } catch (err: any) {
      setErrorMsg(err.message || "Error al aprobar tarea")
    } finally {
      setLoading(null)
    }
  }

  // Category CRUD
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    try {
      setLoading('cat')
      const created = await createTaskCategory(newCategoryName.trim())
      setCategories(prev => [...prev, created])
      setNewCategoryName('')
      setIsCategoryModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear categoría")
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return
    try {
      setLoading('cat')
      const updated = await updateTaskCategory(id, editingCategoryName.trim())
      setCategories(prev => prev.map(c => c.id === id ? updated : c))
      setEditingCategoryId(null)
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar categoría")
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (armedCatId !== id) {
      setArmedCatId(id)
      setTimeout(() => setArmedCatId(null), 3000)
      return
    }
    setArmedCatId(null)
    try {
      setLoading('cat')
      await deleteTaskCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar categoría")
    } finally {
      setLoading(null)
    }
  }

  // Task CRUD
  const openNewTaskModal = () => {
    setEditingTaskId(null)
    setNewTaskName('')
    setNewTaskFrequency('DAILY')
    setNewTaskRequiresPhoto(false)
    setNewTaskTimeout(60)
    if (categories.length > 0) setNewTaskCategoryId(categories[0].id)
    setIsTaskModalOpen(true)
  }

  const openEditTaskModal = (t: PrimordialTask) => {
    setEditingTaskId(t.id)
    setEditingTaskName(t.name)
    setEditingTaskFrequency(t.frequency_type)
    setEditingTaskRequiresPhoto(t.requires_photo)
    setEditingTaskTimeout(t.timeout_minutes)
    setEditingTaskCategoryId(t.category_id || (categories[0]?.id ?? ''))
    setIsTaskModalOpen(true)
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName.trim()) return
    try {
      setLoading('task')
      const created = await createPrimordialTask(
        newTaskName.trim(),
        newTaskFrequency,
        newTaskRequiresPhoto,
        newTaskTimeout,
        newTaskCategoryId
      )
      const cat = categories.find(c => c.id === newTaskCategoryId)
      setTasks(prev => [...prev, { ...created, category: cat }])
      setNewTaskName('')
      setIsTaskModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear tarea")
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTaskId || !editingTaskName.trim()) return
    try {
      setLoading('task')
      const updated = await updatePrimordialTask(
        editingTaskId,
        editingTaskName.trim(),
        editingTaskFrequency,
        editingTaskRequiresPhoto,
        editingTaskTimeout,
        editingTaskCategoryId
      )
      const cat = categories.find(c => c.id === editingTaskCategoryId)
      setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...updated, category: cat } : t))
      setEditingTaskId(null)
      setIsTaskModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar tarea")
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteTask = async (id: string, name: string) => {
    if (armedTaskId !== id) {
      setArmedTaskId(id)
      setTimeout(() => setArmedTaskId(null), 3000)
      return
    }
    setArmedTaskId(null)
    try {
      setLoading('task')
      await deletePrimordialTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err: any) {
      setErrorMsg(err.message || "Error al desactivar la tarea")
    } finally {
      setLoading(null)
    }
  }

  // Filtered & Sorted Executions
  const filteredExecutions = useMemo(() => {
    return executions.filter((exec) => {
      if (execSearch.trim()) {
        const q = execSearch.toLowerCase()
        const tName = (exec.task?.name || '').toLowerCase()
        const uName = (exec.user?.full_name || '').toLowerCase()
        if (!tName.includes(q) && !uName.includes(q)) return false
      }
      if (execStatusFilter !== 'ALL' && exec.status !== execStatusFilter) return false
      return true
    })
  }, [executions, execSearch, execStatusFilter])

  const sortedExecutions = useMemo(() => {
    return [...filteredExecutions].sort((a, b) => {
      let comp = 0
      if (execSortField === 'task') comp = (a.task?.name || '').localeCompare(b.task?.name || '')
      else if (execSortField === 'user') comp = (a.user?.full_name || '').localeCompare(b.user?.full_name || '')
      else if (execSortField === 'status') comp = (a.status || '').localeCompare(b.status || '')
      else if (execSortField === 'duration') comp = (a.net_duration_minutes || 0) - (b.net_duration_minutes || 0)
      return execSortDir === 'asc' ? comp : -comp
    })
  }, [filteredExecutions, execSortField, execSortDir])

  useEffect(() => { execPage !== 1 && setExecPage(1) }, [execSearch, execStatusFilter, execSortField, execSortDir])

  const execTotalPages = Math.ceil(sortedExecutions.length / execPageSize) || 1
  const paginatedExecutions = useMemo(() => {
    const start = (execPage - 1) * execPageSize
    return sortedExecutions.slice(start, start + execPageSize)
  }, [sortedExecutions, execPage, execPageSize])

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase()
        if (!t.name.toLowerCase().includes(q)) return false
      }
      if (taskCatFilter !== 'ALL' && t.category_id !== taskCatFilter) return false
      if (taskFreqFilter !== 'ALL' && t.frequency_type !== taskFreqFilter) return false
      return true
    })
  }, [tasks, taskSearch, taskCatFilter, taskFreqFilter])

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let comp = 0
      if (taskSortField === 'name') comp = a.name.localeCompare(b.name)
      else if (taskSortField === 'category') comp = (a.category?.name || '').localeCompare(b.category?.name || '')
      else if (taskSortField === 'frequency') comp = a.frequency_type.localeCompare(b.frequency_type)
      return taskSortDir === 'asc' ? comp : -comp
    })
  }, [filteredTasks, taskSortField, taskSortDir])

  useEffect(() => { taskPage !== 1 && setTaskPage(1) }, [taskSearch, taskCatFilter, taskFreqFilter, taskSortField, taskSortDir])

  const taskTotalPages = Math.ceil(sortedTasks.length / taskPageSize) || 1
  const paginatedTasks = useMemo(() => {
    const start = (taskPage - 1) * taskPageSize
    return sortedTasks.slice(start, start + taskPageSize)
  }, [sortedTasks, taskPage, taskPageSize])

  return (
    <div className="space-y-6">
      {/* Tabs & Acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex gap-2 bg-[#242424] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'history' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Historial
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'performance' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            📊 Rendimiento
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'config' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚙️ Configuración
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'config' && (
            <>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="rounded-xl border border-white/10 bg-[#242424] px-3.5 py-2 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-1.5 uppercase tracking-wider"
              >
                <FolderPlus className="h-4 w-4 text-purple-400" />
                Nueva Categoría
              </button>
              <button
                onClick={openNewTaskModal}
                className="rounded-xl bg-primary px-3.5 py-2 text-xs font-black text-black hover:brightness-105 flex items-center gap-1.5 uppercase tracking-wider shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                Nueva Tarea
              </button>
            </>
          )}

          {activeTab !== 'config' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#242424] border border-white/10 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary font-bold scheme-dark"
              />
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-900/40 border border-red-500/20 text-red-200 rounded-xl text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: HISTORIAL */}
      {activeTab === 'history' && (
        <div className="space-y-4 rounded-2xl bg-[#242424] p-6 border border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Ejecución de Tareas - {selectedDate}
            </h2>
            {loading === 'data' && <span className="text-xs text-primary animate-pulse font-bold">Cargando...</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
            <div>
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
                Buscar Ejecución
              </label>
              <TableSearchInput
                value={execSearch}
                onChange={setExecSearch}
                placeholder="Buscar por tarea o colaborador..."
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
                Estado
              </label>
              <select
                value={execStatusFilter}
                onChange={(e) => setExecStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="COMPLETED">Listo para Aprobar</option>
                <option value="APPROVED">Aprobado</option>
                <option value="IN_PROGRESS">En Progreso</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#181818] text-xs font-black text-white uppercase tracking-wider border-b border-white/5">
                <tr>
                  <TableHeaderSortCell
                    field="task"
                    label="Tarea"
                    currentSortField={execSortField}
                    sortDirection={execSortDir}
                    onSort={(f) => { setExecSortField(f); setExecSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                  />
                  <TableHeaderSortCell
                    field="user"
                    label="Colaborador"
                    currentSortField={execSortField}
                    sortDirection={execSortDir}
                    onSort={(f) => { setExecSortField(f); setExecSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                  />
                  <TableHeaderSortCell
                    field="status"
                    label="Estado"
                    currentSortField={execSortField}
                    sortDirection={execSortDir}
                    onSort={(f) => { setExecSortField(f); setExecSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                  />
                  <th className="py-3 px-4 font-bold">Inicio</th>
                  <TableHeaderSortCell
                    field="duration"
                    label="Duración"
                    currentSortField={execSortField}
                    sortDirection={execSortDir}
                    onSort={(f) => { setExecSortField(f); setExecSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                  />
                  <th className="py-3 px-4 font-bold">Evidencia</th>
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedExecutions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-white font-bold">{exec.task?.name || 'Desconocida'}</td>
                    <td className="py-3 px-4 text-gray-400">{exec.user?.full_name || 'Desconocido'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        exec.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        exec.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        exec.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {exec.status === 'COMPLETED' ? 'Listo para Aprobar' :
                         exec.status === 'APPROVED' ? 'Aprobado' :
                         exec.status === 'IN_PROGRESS' ? 'En Progreso' : exec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-400">
                      {exec.start_time ? new Date(exec.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {exec.net_duration_minutes !== undefined ? `${exec.net_duration_minutes} min` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {exec.photo_url ? (
                        <a href={exec.photo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-xs">
                          Ver Foto
                        </a>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {exec.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleApprove(exec.id)}
                          disabled={loading === exec.id}
                          className="bg-primary hover:bg-primary/95 text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                        >
                          Aprobar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedExecutions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-gray-500 italic">
                      No hay ejecuciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={execPage}
            totalPages={execTotalPages}
            totalItems={sortedExecutions.length}
            pageSize={execPageSize}
            onPageChange={setExecPage}
            onPageSizeChange={setExecPageSize}
          />
        </div>
      )}

      {/* TAB 2: RENDIMIENTO */}
      {activeTab === 'performance' && (
        <div className="space-y-4 rounded-2xl bg-[#242424] p-6 border border-white/5">
          <h2 className="text-base font-black text-white uppercase tracking-wider">
            Resumen de Rendimiento de Personal - {selectedDate}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#181818] text-xs font-black text-white uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Tareas Completadas</th>
                  <th className="py-3 px-4">Duración Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {metrics.map((collab) => (
                  <tr key={collab.userId} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-white font-bold">{collab.name}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono">{collab.completedCount} tareas</td>
                    <td className="py-3 px-4 font-bold text-white font-mono">{collab.avgDurationMinutes} min / tarea</td>
                  </tr>
                ))}
                {metrics.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-gray-500 italic">
                      No hay métricas registradas para esta fecha.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURACION CON TABLA DE TAREAS */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* TABLA DE CATALOGO DE TAREAS */}
          <div className="rounded-2xl bg-[#242424] p-6 border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Catálogo de Tareas Primordiales ({filteredTasks.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
                  Buscar Tarea
                </label>
                <TableSearchInput
                  value={taskSearch}
                  onChange={setTaskSearch}
                  placeholder="Buscar por nombre de tarea..."
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
                  Categoría
                </label>
                <select
                  value={taskCatFilter}
                  onChange={(e) => setTaskCatFilter(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary"
                >
                  <option value="ALL">Todas las Categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
                  Frecuencia
                </label>
                <select
                  value={taskFreqFilter}
                  onChange={(e) => setTaskFreqFilter(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary"
                >
                  <option value="ALL">Todas las Frecuencias</option>
                  <option value="DAILY">Diario</option>
                  <option value="CONTINUOUS">Continuo</option>
                  <option value="ROUTINE">Rutina</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="CLOSING">Cierre</option>
                  <option value="VARIABLE">Variable</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#181818] text-xs font-black text-white uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <TableHeaderSortCell
                      field="name"
                      label="Nombre de la Tarea"
                      currentSortField={taskSortField}
                      sortDirection={taskSortDir}
                      onSort={(f) => { setTaskSortField(f); setTaskSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                    />
                    <TableHeaderSortCell
                      field="category"
                      label="Categoría"
                      currentSortField={taskSortField}
                      sortDirection={taskSortDir}
                      onSort={(f) => { setTaskSortField(f); setTaskSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                    />
                    <TableHeaderSortCell
                      field="frequency"
                      label="Frecuencia"
                      currentSortField={taskSortField}
                      sortDirection={taskSortDir}
                      onSort={(f) => { setTaskSortField(f); setTaskSortDir(d => d === 'asc' ? 'desc' : 'asc') }}
                    />
                    <th className="py-3 px-4 font-bold">Evidencia / Timeout</th>
                    <th className="py-3 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white">{t.name}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-bold text-gray-300">
                          {t.category?.name || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs uppercase text-primary font-bold">
                        {t.frequency_type}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {t.requires_photo ? '📷 Requiere Foto' : 'Sin Foto'} | {t.timeout_minutes} min
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditTaskModal(t)}
                            className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-blue-400 hover:bg-blue-500/20"
                            title="Editar Tarea"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(t.id, t.name)}
                            className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-red-400 hover:bg-red-500/20"
                            title="Desactivar Tarea"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedTasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-gray-500 italic">
                        No hay tareas configuradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={taskPage}
              totalPages={taskTotalPages}
              totalItems={sortedTasks.length}
              pageSize={taskPageSize}
              onPageChange={setTaskPage}
              onPageSizeChange={setTaskPageSize}
            />
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR TAREA */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTaskId ? "Editar Tarea" : "Nueva Tarea"}
        subtitle="Configura el checklist operativo del restaurante"
        icon={<CheckSquare className="h-5 w-5 text-primary" />}
        maxWidth="md"
      >
        <form onSubmit={editingTaskId ? handleUpdateTask : handleCreateTask} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
              Nombre de la Tarea *
            </label>
            <input
              type="text"
              value={editingTaskId ? editingTaskName : newTaskName}
              onChange={(e) => editingTaskId ? setEditingTaskName(e.target.value) : setNewTaskName(e.target.value)}
              placeholder="Ej. Limpieza de Freidoras"
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-white outline-none focus:border-primary font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                Categoría
              </label>
              <select
                value={editingTaskId ? editingTaskCategoryId : newTaskCategoryId}
                onChange={(e) => editingTaskId ? setEditingTaskCategoryId(e.target.value) : setNewTaskCategoryId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-primary"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                Frecuencia
              </label>
              <select
                value={editingTaskId ? editingTaskFrequency : newTaskFrequency}
                onChange={(e) => editingTaskId ? setEditingTaskFrequency(e.target.value as any) : setNewTaskFrequency(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-primary"
              >
                <option value="DAILY">Diario</option>
                <option value="CONTINUOUS">Continuo</option>
                <option value="ROUTINE">Rutina</option>
                <option value="WEEKLY">Semanal</option>
                <option value="CLOSING">Cierre</option>
                <option value="VARIABLE">Variable</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#181818] border border-white/10">
            <label className="text-xs font-bold text-white flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingTaskId ? editingTaskRequiresPhoto : newTaskRequiresPhoto}
                onChange={(e) => editingTaskId ? setEditingTaskRequiresPhoto(e.target.checked) : setNewTaskRequiresPhoto(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-[#242424] text-primary focus:ring-primary"
              />
              Requiere foto de evidencia
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-400">Timeout:</span>
              <input
                type="number"
                value={editingTaskId ? editingTaskTimeout : newTaskTimeout}
                onChange={(e) => editingTaskId ? setEditingTaskTimeout(Number(e.target.value)) : setNewTaskTimeout(Number(e.target.value))}
                className="w-16 rounded-lg border border-white/10 bg-[#242424] px-2 py-1 text-xs font-bold text-white text-center"
              />
              <span className="text-xs text-gray-500">min</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-gray-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading === 'task'}
              className="rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-black hover:brightness-105 disabled:opacity-50"
            >
              {loading === 'task' ? 'Guardando...' : editingTaskId ? 'Actualizar Tarea' : 'Guardar Tarea'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL CREAR CATEGORIA */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Crear Nueva Categoría"
        subtitle="Organiza las tareas en grupos de trabajo"
        icon={<FolderPlus className="h-5 w-5 text-purple-400" />}
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ej. Cocina, Barra, Limpieza"
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-white outline-none focus:border-purple-400 font-bold"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-gray-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading === 'cat'}
              className="rounded-xl bg-purple-500 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {loading === 'cat' ? 'Guardando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
