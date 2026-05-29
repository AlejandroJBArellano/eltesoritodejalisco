-- supabase_tasks.sql
-- Run this script in the Supabase SQL Editor to create the tables for the "Tareas Primordiales" module.

-- 1. Create the task catalog table
CREATE TABLE IF NOT EXISTS public.primordial_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    frequency_type TEXT NOT NULL, -- 'CONTINUOUS', 'VARIABLE', 'ROUTINE', 'DAILY', 'WEEKLY', 'CLOSING'
    requires_photo BOOLEAN DEFAULT FALSE,
    timeout_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the task executions table
CREATE TABLE IF NOT EXISTS public.task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.primordial_tasks(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'APPROVED'
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    last_resumed_at TIMESTAMP WITH TIME ZONE,
    paused_seconds INTEGER DEFAULT 0,
    net_duration_minutes INTEGER,
    photo_url TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.primordial_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_executions ENABLE ROW LEVEL SECURITY;

-- Disable RLS for now so frontend can query freely (or configure specific policies)
CREATE POLICY "Allow all operations for anon on primordial_tasks" 
ON public.primordial_tasks FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon on task_executions" 
ON public.task_executions FOR ALL USING (true);

-- Insert initial tasks based on the required checklist
INSERT INTO public.primordial_tasks (name, frequency_type, requires_photo, timeout_minutes)
VALUES
    ('Lavar los trastes (Evitar acumulación)', 'CONTINUOUS', FALSE, 60),
    ('Desinfectar los cubiertos y armarlos', 'VARIABLE', FALSE, 30),
    ('Limpiar y organizar rack y especias', 'ROUTINE', FALSE, 45),
    ('Limpiar refrigeradores (interior y exterior)', 'VARIABLE', TRUE, 60),
    ('Limpiar parrilla y estufa con fibra', 'DAILY', TRUE, 90),
    ('Limpiar contenedores y tapas', 'DAILY', FALSE, 45),
    ('Limpiar mueble de trastes', 'ROUTINE', FALSE, 30),
    ('Limpiar mueble blanco', 'ROUTINE', FALSE, 30),
    ('Limpiar campana interior/exterior', 'ROUTINE', TRUE, 60),
    ('Mover muebles para limpieza profunda', 'VARIABLE', TRUE, 90),
    ('Barrer y trapear el área', 'VARIABLE', FALSE, 45),
    ('Lavar jerga y dejar en cubeta limpia', 'CLOSING', FALSE, 15),
    ('Lavar trapos de cocina', 'ROUTINE', FALSE, 20),
    ('Limpiar charolas y libritos para cuentas', 'CLOSING', FALSE, 15),
    ('Limpiar maquinaria (Air fryer, licuadora)', 'CLOSING', TRUE, 30)
ON CONFLICT DO NOTHING;

-- 3. Storage setup
-- Run this in your SQL Editor to create the task-photos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-photos', 'task-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Give public access to task-photos" ON storage.objects
FOR SELECT USING (bucket_id = 'task-photos');

CREATE POLICY "Allow authenticated uploads to task-photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'task-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow anon uploads to task-photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'task-photos' AND auth.role() = 'anon');

CREATE POLICY "Allow all deletes from task-photos" ON storage.objects
FOR DELETE USING (bucket_id = 'task-photos');
