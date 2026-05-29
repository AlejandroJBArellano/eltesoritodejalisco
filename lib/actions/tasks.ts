"use server"

import { createClient } from '../supabase/server'
import { getUser } from '../auth'
import { revalidatePath } from 'next/cache'

export async function getPrimordialTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('primordial_tasks')
    .select('*')
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
