"use server"

import { createClient } from '../supabase/server'
import { getUser } from '../auth'
import { revalidatePath } from 'next/cache'

export async function getPrimordialTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('primordial_tasks')
    .select('*, category:task_categories(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    
  if (error) throw new Error(error.message)
  return data
}

export async function getTodayExecutions() {
  const supabase = await createClient()
  
  // Get start of today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data, error } = await supabase
    .from('task_executions')
    .select(`
      *,
      task:primordial_tasks(*)
    `)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  
  // If we need user names, we could fetch profiles separately or rely on a DB join
  // For simplicity, we just return the raw data and let the frontend format it
  return data
}

export async function startTask(taskId: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
    
  const supabase = await createClient()
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('task_executions')
    .insert({
      task_id: taskId,
      user_id: user.id,
      status: 'IN_PROGRESS',
      start_time: now,
      last_resumed_at: now
    })
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/admin/tareas')
  return data
}

export async function pauseTask(executionId: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
    
  const supabase = await createClient()
  
  const { data: current, error: fetchError } = await supabase
    .from('task_executions')
    .select('last_resumed_at, paused_seconds')
    .eq('id', executionId)
    .single()
    
  if (fetchError || !current) throw new Error("Execution not found")
    
  const now = new Date()
  const lastResumedAt = new Date(current.last_resumed_at || now)
  const newlyPausedSeconds = Math.floor((now.getTime() - lastResumedAt.getTime()) / 1000)
  
  const { data, error } = await supabase
    .from('task_executions')
    .update({
      status: 'PAUSED',
      paused_seconds: current.paused_seconds + newlyPausedSeconds
    })
    .eq('id', executionId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  return data
}

export async function resumeTask(executionId: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
    
  const supabase = await createClient()
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('task_executions')
    .update({
      status: 'IN_PROGRESS',
      last_resumed_at: now
    })
    .eq('id', executionId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  return data
}

export async function completeTask(executionId: string, photoUrl?: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
    
  const supabase = await createClient()
  
  const { data: current, error: fetchError } = await supabase
    .from('task_executions')
    .select('start_time, last_resumed_at, paused_seconds, status')
    .eq('id', executionId)
    .single()
    
  if (fetchError || !current) throw new Error("Execution not found")
    
  const now = new Date()
  let finalPausedSeconds = current.paused_seconds || 0
  
  const startTime = new Date(current.start_time)
  const grossDurationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
  const netDurationMinutes = Math.floor((grossDurationSeconds - finalPausedSeconds) / 60)
  
  const { data, error } = await supabase
    .from('task_executions')
    .update({
      status: 'COMPLETED',
      end_time: now.toISOString(),
      net_duration_minutes: netDurationMinutes >= 0 ? netDurationMinutes : 0,
      photo_url: photoUrl || null
    })
    .eq('id', executionId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/admin/tareas')
  return data
}

export async function approveTask(executionId: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")
    
  const supabase = await createClient()
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('task_executions')
    .update({
      status: 'APPROVED',
      approved_at: now
    })
    .eq('id', executionId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  revalidatePath('/admin/tareas')
  return data
}

// =====================================================================
// TASK CATEGORIES CRUD ACTIONS
// =====================================================================

export async function getTaskCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function createTaskCategory(name: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_categories')
    .insert({ name })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/admin/tareas')
  return data
}

export async function updateTaskCategory(id: string, name: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_categories')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/admin/tareas')
  return data
}

export async function deleteTaskCategory(id: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { error } = await supabase
    .from('task_categories')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/admin/tareas')
  return { success: true }
}

// =====================================================================
// PRIMORDIAL TASKS CRUD ACTIONS
// =====================================================================

export async function createPrimordialTask(
  name: string,
  frequencyType: string,
  requiresPhoto: boolean,
  timeoutMinutes: number,
  categoryId: string
) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('primordial_tasks')
    .insert({
      name,
      frequency_type: frequencyType,
      requires_photo: requiresPhoto,
      timeout_minutes: timeoutMinutes,
      category_id: categoryId,
      is_active: true
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/admin/tareas')
  return data
}

export async function updatePrimordialTask(
  id: string,
  name: string,
  frequencyType: string,
  requiresPhoto: boolean,
  timeoutMinutes: number,
  categoryId: string,
  isActive: boolean = true
) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('primordial_tasks')
    .update({
      name,
      frequency_type: frequencyType,
      requires_photo: requiresPhoto,
      timeout_minutes: timeoutMinutes,
      category_id: categoryId,
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/admin/tareas')
  return data
}

export async function deletePrimordialTask(id: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  // We soft delete (set is_active to false) to preserve references in existing task execution history
  const { data, error } = await supabase
    .from('primordial_tasks')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/admin/tareas')
  return data
}

// =====================================================================
// ADMIN HISTORY & PERFORMANCE ACTIONS
// =====================================================================

export async function getExecutionsForDate(dateStr: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  // Enforce "mes en curso" (current month) constraint
  const targetDate = new Date(dateStr + 'T12:00:00') // Use noon to avoid timezone shift issues
  const now = new Date()
  if (targetDate.getMonth() !== now.getMonth() || targetDate.getFullYear() !== now.getFullYear()) {
    throw new Error("Solo se permite consultar registros del mes en curso.")
  }

  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`

  const { data, error } = await supabase
    .from('task_executions')
    .select(`
      *,
      task:primordial_tasks(*),
      user:profiles(full_name)
    `)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getStaffPerformanceMetrics(dateStr: string) {
  const user = await getUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  // Enforce current month limit
  const targetDate = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  if (targetDate.getMonth() !== now.getMonth() || targetDate.getFullYear() !== now.getFullYear()) {
     throw new Error("Solo se permite consultar registros del mes en curso.")
  }

  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`

  const { data, error } = await supabase
    .from('task_executions')
    .select(`
      id,
      status,
      net_duration_minutes,
      user:profiles(id, full_name)
    `)
    .eq('status', 'COMPLETED')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  if (error) throw new Error(error.message)

  // Aggregate stats per collaborator
  const statsMap: { [userId: string]: { name: string, completedCount: number, totalDuration: number } } = {}

  data?.forEach((exec: any) => {
    const u = exec.user
    if (!u) return
    
    if (!statsMap[u.id]) {
      statsMap[u.id] = {
        name: u.full_name || 'Desconocido',
        completedCount: 0,
        totalDuration: 0
      }
    }
    
    statsMap[u.id].completedCount += 1
    statsMap[u.id].totalDuration += (exec.net_duration_minutes || 0)
  })

  // Format array
  return Object.keys(statsMap).map(userId => {
    const item = statsMap[userId]
    return {
      userId,
      name: item.name,
      completedCount: item.completedCount,
      avgDurationMinutes: item.completedCount > 0 ? Math.round(item.totalDuration / item.completedCount) : 0
    }
  })
}

