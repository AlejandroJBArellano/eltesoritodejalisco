-- 1. Insert default business hours for La Cuevita
INSERT INTO public.business_hours (day_of_week, open_time, close_time, is_closed, tenant_id)
VALUES
  (0, '09:00:00', '21:00:00', false, '082491a6-26c7-4d01-bea2-29a5971c1130'),
  (1, '09:00:00', '21:00:00', false, '082491a6-26c7-4d01-bea2-29a5971c1130'),
  (2, '09:00:00', '21:00:00', false, '082491a6-26c7-4d01-bea2-29a5971c1130'),
  (3, '09:00:00', '21:00:00', false, '082491a6-26c7-4d01-bea2-29a5971c1130'),
  (4, '09:00:00', '21:00:00', false, '082491a6-26c7-4d01-bea2-29a5971c1130'),
  (5, '09:00:00', '21:00:00', false, '082491a6-26c7-4d01-bea2-29a5971c1130'),
  (6, '09:00:00', '21:00:00', false, '082491a6-26c7-4d01-bea2-29a5971c1130')
ON CONFLICT (tenant_id, day_of_week) DO NOTHING;

-- 2. Create a test tenant (prueba)
INSERT INTO public.tenants (name, system_name, slug, primary_color, secondary_color, dark_bg_color)
VALUES (
    'Sucursal de Prueba', 
    'PruebaOS', 
    'prueba', 
    '#A7F3D0', 
    '#D1FAE5', 
    '#0F172A'
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Insert default business hours for the test tenant (prueba)
DO $$
DECLARE
    prueba_tenant_id UUID;
BEGIN
    SELECT id INTO prueba_tenant_id FROM public.tenants WHERE slug = 'prueba' LIMIT 1;
    
    IF prueba_tenant_id IS NOT NULL THEN
        INSERT INTO public.business_hours (day_of_week, open_time, close_time, is_closed, tenant_id)
        VALUES
          (0, '09:00:00', '21:00:00', false, prueba_tenant_id),
          (1, '09:00:00', '21:00:00', false, prueba_tenant_id),
          (2, '09:00:00', '21:00:00', false, prueba_tenant_id),
          (3, '09:00:00', '21:00:00', false, prueba_tenant_id),
          (4, '09:00:00', '21:00:00', false, prueba_tenant_id),
          (5, '09:00:00', '21:00:00', false, prueba_tenant_id),
          (6, '09:00:00', '21:00:00', false, prueba_tenant_id)
        ON CONFLICT (tenant_id, day_of_week) DO NOTHING;
    END IF;
END $$;
