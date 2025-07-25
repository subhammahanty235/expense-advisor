-- Fix RLS policy for inserting group members when accepting invitations
DROP POLICY IF EXISTS "Group creators and admins can insert members" ON public.savings_group_members;

CREATE POLICY "Users can join groups when invited or admins can add members" 
ON public.savings_group_members 
FOR INSERT 
WITH CHECK (
  -- Allow if user is adding themselves after accepting invitation
  (user_id = auth.uid()) OR
  -- Allow if group admin is adding members
  user_is_group_admin(group_id, auth.uid()) OR
  -- Allow if group creator is adding members
  (EXISTS (
    SELECT 1 FROM public.savings_groups 
    WHERE savings_groups.id = savings_group_members.group_id 
    AND savings_groups.created_by = auth.uid()
  ))
);