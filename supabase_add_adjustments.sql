CREATE TABLE IF NOT EXISTS public.order_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.order_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon on order_adjustments" ON public.order_adjustments FOR ALL USING (true);
