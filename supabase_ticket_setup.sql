-- Add ticket configuration columns to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS rfc TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS regimen_fiscal TEXT;

-- Backfill default values for the seeded tenant 'tesorito'
UPDATE public.tenants 
SET 
  rfc = 'AIVK991104QJ0',
  postal_code = '09090',
  regimen_fiscal = '626 - Simplificado de Confianza (RESICO)'
WHERE slug = 'tesorito';
