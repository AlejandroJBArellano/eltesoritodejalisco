-- Migración: Sistema de Roles Personalizados y RBAC Granular en KittnOS

-- 1. Crear tabla de roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    system_slug TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_roles_tenant_name UNIQUE (tenant_id, name)
);

-- Índices de roles
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON public.roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_system_slug ON public.roles(tenant_id, system_slug);

-- 2. Agregar role_id a tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);

-- 3. Sembrar roles del sistema en tenants existentes
DO $$
DECLARE
    t_record RECORD;
    admin_id UUID;
    manager_id UUID;
    waiter_id UUID;
    chef_id UUID;
    inventory_id UUID;
BEGIN
    FOR t_record IN SELECT id FROM public.tenants LOOP
        -- ADMIN
        INSERT INTO public.roles (tenant_id, name, description, is_system, system_slug, permissions)
        VALUES (
            t_record.id,
            'Administrador',
            'Acceso total a todas las funciones, configuraciones y reportes del restaurante.',
            true,
            'ADMIN',
            '["*"]'::jsonb
        )
        ON CONFLICT (tenant_id, name) DO UPDATE SET 
            system_slug = 'ADMIN',
            is_system = true,
            permissions = '["*"]'::jsonb
        RETURNING id INTO admin_id;

        -- MANAGER
        INSERT INTO public.roles (tenant_id, name, description, is_system, system_slug, permissions)
        VALUES (
            t_record.id,
            'Gerente',
            'Gestión operativa de sala, caja, inventarios, personal y cortes de caja.',
            true,
            'MANAGER',
            '["pos.view", "pos.create_order", "pos.edit_order", "pos.cancel_order", "pos.apply_discount", "pos.split_bill", "pos.process_payment", "pos.reopen_closed_order", "kitchen.view", "kitchen.update_status", "kitchen.manage_queue", "menu.view", "menu.manage", "menu.toggle_availability", "inventory.view", "inventory.adjust_stock", "inventory.manage_items", "inventory.view_costs", "customers.view", "customers.manage", "customers.campaigns", "finance.view_dashboard", "finance.view_reports", "finance.manage_expenses", "finance.cash_cut", "team.view", "team.manage_shifts", "team.manage_attendance"]'::jsonb
        )
        ON CONFLICT (tenant_id, name) DO UPDATE SET 
            system_slug = 'MANAGER',
            is_system = true
        RETURNING id INTO manager_id;

        -- WAITER
        INSERT INTO public.roles (tenant_id, name, description, is_system, system_slug, permissions)
        VALUES (
            t_record.id,
            'Mesero',
            'Toma de comandas, cobro de cuentas y atención al comensal.',
            true,
            'WAITER',
            '["pos.view", "pos.create_order", "pos.edit_order", "pos.split_bill", "pos.process_payment", "menu.view", "menu.toggle_availability", "customers.view", "customers.manage"]'::jsonb
        )
        ON CONFLICT (tenant_id, name) DO UPDATE SET 
            system_slug = 'WAITER',
            is_system = true
        RETURNING id INTO waiter_id;

        -- CHEF
        INSERT INTO public.roles (tenant_id, name, description, is_system, system_slug, permissions)
        VALUES (
            t_record.id,
            'Cocina',
            'Visualización y despacho de comandas en la pantalla KDS.',
            true,
            'CHEF',
            '["kitchen.view", "kitchen.update_status", "kitchen.manage_queue", "menu.view", "menu.toggle_availability", "inventory.view"]'::jsonb
        )
        ON CONFLICT (tenant_id, name) DO UPDATE SET 
            system_slug = 'CHEF',
            is_system = true
        RETURNING id INTO chef_id;

        -- INVENTORY
        INSERT INTO public.roles (tenant_id, name, description, is_system, system_slug, permissions)
        VALUES (
            t_record.id,
            'Inventario',
            'Control de existencias, insumos, compras y gastos operativos.',
            true,
            'INVENTORY',
            '["inventory.view", "inventory.adjust_stock", "inventory.manage_items", "inventory.view_costs", "menu.view", "finance.manage_expenses"]'::jsonb
        )
        ON CONFLICT (tenant_id, name) DO UPDATE SET 
            system_slug = 'INVENTORY',
            is_system = true
        RETURNING id INTO inventory_id;

        -- Sincronizar perfiles existentes con sus roles de sistema correspondientes
        UPDATE public.profiles p
        SET role_id = CASE
            WHEN UPPER(p.role) = 'ADMIN' THEN admin_id
            WHEN UPPER(p.role) = 'MANAGER' THEN manager_id
            WHEN UPPER(p.role) = 'WAITER' THEN waiter_id
            WHEN UPPER(p.role) = 'CHEF' THEN chef_id
            WHEN UPPER(p.role) = 'INVENTORY' THEN inventory_id
            ELSE waiter_id
        END
        WHERE p.tenant_id = t_record.id AND p.role_id IS NULL;
    END LOOP;
END $$;
