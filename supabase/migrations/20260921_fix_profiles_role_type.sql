-- Migración: Asegurar compatibilidad de profiles.role con roles personalizados
-- Convierte profiles.role a TEXT si estuviese tipada como enum UserRole

DO $$
BEGIN
  -- 1. Si la columna 'role' en public.profiles es de tipo enum, convertirla a TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'role' 
      AND (udt_name = 'UserRole' OR data_type = 'USER-DEFINED')
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN role TYPE text;
  END IF;

  -- 2. Asegurar que role_id exista y tenga su índice
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.profiles 
      ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);
