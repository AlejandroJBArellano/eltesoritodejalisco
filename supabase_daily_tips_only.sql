-- 2. Create daily_tips table
CREATE TABLE IF NOT EXISTS public.daily_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cut_date DATE UNIQUE NOT NULL,
    total_card_tips NUMERIC(10, 2) DEFAULT 0,
    total_cash_tips NUMERIC(10, 2) DEFAULT 0,
    total_tips NUMERIC(10, 2) DEFAULT 0,
    total_hours NUMERIC(10, 2) DEFAULT 0,
    breakdown JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for daily_tips
ALTER TABLE public.daily_tips ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon
CREATE POLICY "Allow all operations for anon on daily_tips" 
ON public.daily_tips FOR ALL USING (true);
