-- =====================================================================
-- DATABASE UPDATE: TASK CATEGORIZATION & PROFILES ASSOCIATION
-- Run this in your Supabase SQL Editor to add Category support
-- and establish profile relationships for task tracking.
-- =====================================================================

-- 1. Create the task categories table
CREATE TABLE IF NOT EXISTS public.task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for task_categories
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon on task_categories" ON public.task_categories;
CREATE POLICY "Allow all operations for anon on task_categories" 
ON public.task_categories FOR ALL USING (true);

-- 2. Add category_id to primordial_tasks
ALTER TABLE public.primordial_tasks 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL;

-- 3. Link task_executions to profiles to allow relational joining of full_name
ALTER TABLE public.task_executions DROP CONSTRAINT IF EXISTS fk_task_executions_profiles;
ALTER TABLE public.task_executions
ADD CONSTRAINT fk_task_executions_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 4. Seed the default category "Limpieza y Organización"
INSERT INTO public.task_categories (name) 
VALUES ('Limpieza y Organización')
ON CONFLICT (name) DO NOTHING;

-- 5. Associate all existing primordial_tasks with the default category
UPDATE public.primordial_tasks
SET category_id = (SELECT id FROM public.task_categories WHERE name = 'Limpieza y Organización')
WHERE category_id IS NULL;
