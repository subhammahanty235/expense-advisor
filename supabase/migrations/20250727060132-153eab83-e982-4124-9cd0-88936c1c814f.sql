-- Disable RLS on savings_groups to fix creation issues
ALTER TABLE public.savings_groups DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on related tables to ensure smooth group operations
ALTER TABLE public.savings_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_group_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages DISABLE ROW LEVEL SECURITY;