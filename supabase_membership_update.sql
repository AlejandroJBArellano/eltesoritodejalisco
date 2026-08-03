-- =====================================================================
-- KITTNOS / TESORITO OS - MULTI-TENANT MEMBERSHIP UPDATE
-- Run this in your Supabase SQL Editor.
-- =====================================================================

BEGIN;

-- 1. Drop foreign keys referencing profiles(id)
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS fk_attendance_profile;
ALTER TABLE public.task_executions DROP CONSTRAINT IF EXISTS fk_task_executions_profiles;
ALTER TABLE public.task_executions DROP CONSTRAINT IF EXISTS fk_task_executions_profile;

-- 2. Drop primary key constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey;
END IF;

-- 3. Add composite primary keys
ALTER TABLE public.profiles ADD PRIMARY KEY (id, tenant_id);
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    ALTER TABLE public.users ADD PRIMARY KEY (id, tenant_id);
END IF;

-- 4. Re-create composite foreign keys referencing profiles(id, tenant_id)
ALTER TABLE public.attendance 
  ADD CONSTRAINT fk_attendance_profile 
  FOREIGN KEY (user_id, tenant_id) 
  REFERENCES public.profiles(id, tenant_id) 
  ON DELETE CASCADE;

ALTER TABLE public.task_executions 
  ADD CONSTRAINT fk_task_executions_profile 
  FOREIGN KEY (user_id, tenant_id) 
  REFERENCES public.profiles(id, tenant_id) 
  ON DELETE SET NULL;

-- 5. Update handle_new_user trigger to handle metadata tenant_id and fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    t_id UUID;
BEGIN
    -- Try to get tenant_id from user metadata
    t_id := (new.raw_user_meta_data->>'tenant_id')::UUID;
    
    -- Fallback: if no tenant_id is set in metadata, try to find a default tenant
    IF t_id IS NULL THEN
        SELECT id INTO t_id FROM public.tenants WHERE slug = 'tesorito' LIMIT 1;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Sin nombre'),
        COALESCE(new.raw_user_meta_data->>'role', 'WAITER'),
        t_id
    )
    ON CONFLICT (id, tenant_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper function to avoid RLS recursion when reading user's tenants
CREATE OR REPLACE FUNCTION public.get_user_tenants(user_id UUID)
RETURNS SETOF UUID AS $$
    -- Run as SECURITY DEFINER to bypass RLS
    SELECT tenant_id FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 7. Reconfigure RLS policies
-- Helper variables for looping
DO $$
DECLARE
    t_name TEXT;
    tables_to_policy TEXT[] := ARRAY[
        'ingredients', 'stock_adjustments', 'expense_categories', 
        'expenses', 'attendance', 'task_categories', 
        'primordial_tasks', 'task_executions', 'daily_cuts'
    ];
    public_tables TEXT[] := ARRAY[
        'menu_items', 'menu_categories', 'business_hours'
    ];
    customer_tables TEXT[] := ARRAY[
        'customers', 'orders', 'order_items', 'order_adjustments', 'payments'
    ];
BEGIN
    -- A. Standard internal tables
    FOREACH t_name IN ARRAY tables_to_policy LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t_name) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Scoped access for ' || t_name, t_name);
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR ALL USING (
                  tenant_id IN (SELECT public.get_user_tenants(auth.uid()))
                )', 
                'Scoped access for ' || t_name, 
                t_name
            );
        END IF;
    END LOOP;

    -- B. Public read tables (menu, etc.)
    FOREACH t_name IN ARRAY public_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t_name) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Scoped access for ' || t_name, t_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public read for ' || t_name, t_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Scoped write for ' || t_name, t_name);
            
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR SELECT USING (true)', 
                'Public read for ' || t_name, 
                t_name
            );
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR ALL USING (
                  tenant_id IN (SELECT public.get_user_tenants(auth.uid()))
                )', 
                'Scoped write for ' || t_name, 
                t_name
            );
        END IF;
    END LOOP;

    -- C. Customer orders & checkout tables
    FOREACH t_name IN ARRAY customer_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t_name) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Scoped access for ' || t_name, t_name);
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR ALL USING (
                  auth.uid() IS NULL OR 
                  tenant_id IN (SELECT public.get_user_tenants(auth.uid()))
                )', 
                'Scoped access for ' || t_name, 
                t_name
            );
        END IF;
    END LOOP;
END $$;

-- 8. Apply RLS policies for profiles & users (prevent recursion, restrict access to matching tenants)
DROP POLICY IF EXISTS "Allow scoped operations for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all operations for anon on profiles" ON public.profiles;
CREATE POLICY "Scoped access for profiles" ON public.profiles FOR ALL USING (
  id = auth.uid() OR
  tenant_id IN (SELECT public.get_user_tenants(auth.uid()))
);

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    DROP POLICY IF EXISTS "Allow scoped operations for users" ON public.users;
    CREATE POLICY "Scoped access for users" ON public.users FOR ALL USING (
      id = auth.uid() OR
      tenant_id IN (SELECT public.get_user_tenants(auth.uid()))
    );
END IF;

COMMIT;
