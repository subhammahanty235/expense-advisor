-- Fix the RLS policy for savings_group_members to allow group creators to add themselves as admin
DROP POLICY IF EXISTS "Group admins can insert members" ON public.savings_group_members;

-- Create a new policy that allows group creators to add themselves as admin, and existing admins to add others
CREATE POLICY "Group creators and admins can insert members" 
ON public.savings_group_members 
FOR INSERT 
WITH CHECK (
  -- Allow group creators to add themselves as admin when creating the group
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.savings_groups 
    WHERE id = group_id AND created_by = auth.uid()
  ))
  OR
  -- Allow existing group admins to add other members
  public.user_is_group_admin(group_id, auth.uid())
);