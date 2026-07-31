-- =====================================================================
-- TESORITO OS - Horarios Comerciales e i18n de Pickup
-- Ejecutar en Supabase SQL Editor o mediante psql
-- =====================================================================

-- 1. Agregar columna pickup_time a la tabla orders
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Crear tabla business_hours para configuración de horarios
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER UNIQUE NOT NULL,      -- 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    open_time TIME NOT NULL DEFAULT '09:00:00',
    close_time TIME NOT NULL DEFAULT '21:00:00',
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

-- 3. Habilitar RLS para business_hours
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- Permitir lectura pública para que el portal de clientes pueda consultar los horarios
CREATE POLICY "Permitir lectura para todos en business_hours"
    ON public.business_hours FOR SELECT USING (true);

-- Permitir todas las operaciones para usuarios autenticados (Admin)
CREATE POLICY "Permitir todo para autenticados en business_hours"
    ON public.business_hours FOR ALL USING (auth.role() = 'authenticated');

-- 5. Función de updated_at para business_hours
CREATE OR REPLACE FUNCTION public.handle_business_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_business_hours_updated_at ON public.business_hours;
CREATE TRIGGER set_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.handle_business_hours_updated_at();

-- 6. Insertar valores por defecto para los 7 días de la semana
-- 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
INSERT INTO public.business_hours (day_of_week, open_time, close_time, is_closed) VALUES
    (0, '09:00:00', '21:00:00', false),
    (1, '09:00:00', '21:00:00', false),
    (2, '09:00:00', '21:00:00', false),
    (3, '09:00:00', '21:00:00', false),
    (4, '09:00:00', '21:00:00', false),
    (5, '09:00:00', '21:00:00', false),
    (6, '09:00:00', '21:00:00', false)
ON CONFLICT (day_of_week) DO NOTHING;
