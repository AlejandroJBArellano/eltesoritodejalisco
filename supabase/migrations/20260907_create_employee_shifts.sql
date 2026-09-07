-- Migración: Crear tabla de turnos de empleados (employee_shifts) y tolerancia en tenants

-- 1. Agregar columna de tolerancia de retardo en la tabla tenants si no existe
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS attendance_tolerance_minutes integer DEFAULT 10;

-- 2. Crear tabla employee_shifts
CREATE TABLE IF NOT EXISTS public.employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id text NOT NULL,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  area text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_employee_shifts_tenants FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_shifts_users FOREIGN KEY (user_id, tenant_id) REFERENCES public.users(id, tenant_id) ON DELETE CASCADE
);

-- 3. Índices para consultas eficientes por tenant, fecha y usuario
CREATE INDEX IF NOT EXISTS idx_employee_shifts_tenant_date
  ON public.employee_shifts(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_employee_shifts_tenant_user_date
  ON public.employee_shifts(tenant_id, user_id, date);

-- 4. Habilitar RLS
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_shifts' AND policyname = 'Allow access to tenant members'
  ) THEN
    CREATE POLICY "Allow access to tenant members" ON public.employee_shifts
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
