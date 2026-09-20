-- Migración: Agregar rol INVENTORY al tipo enum UserRole en Supabase
ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'INVENTORY';
