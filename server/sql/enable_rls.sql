-- Enable Row-Level Security (RLS) on all public tables in Supabase
-- This closes the security vulnerability where Supabase's auto-generated PostgREST
-- endpoints expose tables publicly to anyone with the project URL and anon public key.
-- Our FastAPI backend connects directly via PostgreSQL connection string (as table owner),
-- which bypasses RLS while keeping the public PostgREST API locked down.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
