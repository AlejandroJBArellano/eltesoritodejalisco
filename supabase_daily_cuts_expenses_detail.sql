-- Migration: Add expenses_detail JSONB column to daily_cuts
-- This stores a snapshot of itemized expenses at the time of the daily cut,
-- enabling accountants to see the full expense breakdown when reviewing historical cuts.

ALTER TABLE public.daily_cuts
    ADD COLUMN IF NOT EXISTS expenses_detail JSONB DEFAULT '[]'::jsonb;
