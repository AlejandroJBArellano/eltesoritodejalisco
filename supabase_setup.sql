CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    has_invoice BOOLEAN DEFAULT FALSE,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Disable RLS for now so anon/frontend can query freely, or just add policies
CREATE POLICY "Allow all operations for anon on expense_categories" 
ON public.expense_categories FOR ALL USING (true);

CREATE POLICY "Allow all operations for anon on expenses" 
ON public.expenses FOR ALL USING (true);

-- Insert dummy categories
INSERT INTO public.expense_categories (name, color) 
VALUES 
    ('Insumos', '#10B981'),
    ('Sueldos', '#6366F1'),
    ('Servicios', '#F59E0B'),
    ('Otros', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Daily Cuts historical archive
CREATE TABLE IF NOT EXISTS public.daily_cuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cut_date DATE NOT NULL,
    venta_neta NUMERIC(10, 2) DEFAULT 0,
    iva_acumulado NUMERIC(10, 2) DEFAULT 0,
    propinas_efectivo NUMERIC(10, 2) DEFAULT 0,
    propinas_tarjeta NUMERIC(10, 2) DEFAULT 0,
    caja_efectivo NUMERIC(10, 2) DEFAULT 0,
    caja_tarjeta NUMERIC(10, 2) DEFAULT 0,
    utilidad_real NUMERIC(10, 2) DEFAULT 0,
    total_gastos NUMERIC(10, 2) DEFAULT 0,
    utilidad_final NUMERIC(10, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.daily_cuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for anon on daily_cuts"
ON public.daily_cuts FOR ALL USING (true);
