-- Migración: Agregar columna pin a profiles y asegurar valor por defecto para admins y gerentes

-- 1. Agregar columna pin en tabla profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin VARCHAR(6) DEFAULT '1234';

-- 2. Asegurar que todos los administradores y gerentes existentes tengan el PIN '1234'
UPDATE public.profiles
SET pin = '1234'
WHERE role IN ('ADMIN', 'MANAGER') AND (pin IS NULL OR trim(pin) = '');

-- 3. También en tabla users si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin VARCHAR(6) DEFAULT '1234';
    UPDATE public.users
    SET pin = '1234'
    WHERE role IN ('ADMIN', 'MANAGER') AND (pin IS NULL OR trim(pin) = '');
  END IF;
END $$;

-- 4. Índice para agilizar verificación de PIN por tenant
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_pin
  ON public.profiles(tenant_id, pin)
  WHERE role IN ('ADMIN', 'MANAGER');
