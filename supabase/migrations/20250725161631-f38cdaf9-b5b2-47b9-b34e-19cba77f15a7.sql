-- Fix RLS issues by enabling RLS on remaining tables that don't have it
ALTER TABLE public.savings_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_group_invitations ENABLE ROW LEVEL SECURITY;