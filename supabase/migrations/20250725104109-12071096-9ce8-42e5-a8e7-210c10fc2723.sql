-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view groups they're members of" ON public.savings_groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.savings_groups;
DROP POLICY IF EXISTS "Users can view group memberships" ON public.savings_group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.savings_group_members;
DROP POLICY IF EXISTS "Users can view contributions in their groups" ON public.savings_contributions;
DROP POLICY IF EXISTS "Group members can add contributions" ON public.savings_contributions;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_group_member(group_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.savings_group_members 
    WHERE savings_group_members.group_id = user_is_group_member.group_id 
    AND savings_group_members.user_id = user_is_group_member.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_is_group_admin(group_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.savings_group_members 
    WHERE savings_group_members.group_id = user_is_group_admin.group_id 
    AND savings_group_members.user_id = user_is_group_admin.user_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate RLS policies using security definer functions

-- Policies for savings_groups
CREATE POLICY "Users can view groups they're members of" 
ON public.savings_groups 
FOR SELECT 
USING (public.user_is_group_member(id, auth.uid()));

CREATE POLICY "Users can create savings groups" 
ON public.savings_groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" 
ON public.savings_groups 
FOR UPDATE 
USING (public.user_is_group_admin(id, auth.uid()));

-- Policies for savings_group_members
CREATE POLICY "Users can view group memberships they're part of" 
ON public.savings_group_members 
FOR SELECT 
USING (public.user_is_group_member(group_id, auth.uid()));

CREATE POLICY "Group admins can insert members" 
ON public.savings_group_members 
FOR INSERT 
WITH CHECK (public.user_is_group_admin(group_id, auth.uid()));

CREATE POLICY "Group admins can update members" 
ON public.savings_group_members 
FOR UPDATE 
USING (public.user_is_group_admin(group_id, auth.uid()));

CREATE POLICY "Group admins can delete members" 
ON public.savings_group_members 
FOR DELETE 
USING (public.user_is_group_admin(group_id, auth.uid()));

-- Policies for savings_contributions
CREATE POLICY "Users can view contributions in their groups" 
ON public.savings_contributions 
FOR SELECT 
USING (public.user_is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can add contributions" 
ON public.savings_contributions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  public.user_is_group_member(group_id, auth.uid())
);

CREATE POLICY "Users can update their own contributions" 
ON public.savings_contributions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contributions" 
ON public.savings_contributions 
FOR DELETE 
USING (auth.uid() = user_id);