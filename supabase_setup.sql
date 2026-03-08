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
