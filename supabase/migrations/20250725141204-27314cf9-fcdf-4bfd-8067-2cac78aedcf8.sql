-- Fix RLS policy for updating invitations
DROP POLICY IF EXISTS "Invited users can update their own invitations" ON public.savings_group_invitations;

CREATE POLICY "Invited users can update their own invitations" 
ON public.savings_group_invitations 
FOR UPDATE 
USING (
  invited_user_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  invited_user_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  AND status IN ('accepted', 'declined')
);