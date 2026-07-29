-- =====================================================================
-- TESORITO OS - i18n: Traducciones y Ordenamiento de Categorías
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- 1. Nueva tabla de categorías con soporte i18n y ordenamiento
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,          -- nombre canónico en ES (ej: "ANTOJITOS")
    translations JSONB DEFAULT '{}'::JSONB, -- { "en": { "name": "Snacks" } }
    sort_order INTEGER DEFAULT 0,       -- orden de aparición en el pickup
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS para menu_categories
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for menu_categories"
  ON public.menu_categories FOR ALL USING (true);

-- 3. Índice para ordenamiento eficiente
CREATE INDEX IF NOT EXISTS idx_menu_categories_sort
  ON public.menu_categories(sort_order ASC);

-- 4. Agregar columna translations a menu_items para nombre y descripción
ALTER TABLE public.menu_items
    ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::JSONB;

-- 5. Poblar menu_categories desde categorías existentes en menu_items
--    Asigna sort_order inicial en pasos de 10 (deja espacio para insertar entre categorías)
INSERT INTO public.menu_categories (name, sort_order)
SELECT
    category,
    (ROW_NUMBER() OVER (ORDER BY category) * 10)::INTEGER
FROM (
    SELECT DISTINCT category
    FROM public.menu_items
    WHERE category IS NOT NULL AND category != ''
) sub
ON CONFLICT (name) DO NOTHING;

-- 6. Función para updated_at automático en menu_categories
CREATE OR REPLACE FUNCTION public.handle_menu_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_menu_categories_updated_at ON public.menu_categories;
CREATE TRIGGER set_menu_categories_updated_at
  BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_menu_categories_updated_at();
