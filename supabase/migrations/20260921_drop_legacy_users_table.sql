-- Migration: Drop legacy public.users table and link attendance & employee_shifts to public.profiles

-- 1. Drop old foreign key constraints referencing public.users
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS fk_attendance_users;
ALTER TABLE public.employee_shifts DROP CONSTRAINT IF EXISTS fk_employee_shifts_users;

-- 2. Ensure user_id column in attendance and employee_shifts is UUID
ALTER TABLE public.attendance 
  ALTER COLUMN user_id TYPE uuid USING (user_id::uuid);

ALTER TABLE public.employee_shifts 
  ALTER COLUMN user_id TYPE uuid USING (user_id::uuid);

-- 3. Add new foreign key constraints referencing public.profiles(id, tenant_id)
ALTER TABLE public.attendance
  ADD CONSTRAINT fk_attendance_profiles
  FOREIGN KEY (user_id, tenant_id)
  REFERENCES public.profiles(id, tenant_id)
  ON DELETE CASCADE;

ALTER TABLE public.employee_shifts
  ADD CONSTRAINT fk_employee_shifts_profiles
  FOREIGN KEY (user_id, tenant_id)
  REFERENCES public.profiles(id, tenant_id)
  ON DELETE CASCADE;

-- 4. Drop legacy public.users table and legacy UserRole enum
DROP TABLE IF EXISTS public.users CASCADE;
DROP TYPE IF EXISTS public."UserRole";
