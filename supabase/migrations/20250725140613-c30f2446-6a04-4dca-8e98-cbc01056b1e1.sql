-- Create invitations table for savings groups
CREATE TABLE public.savings_group_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.savings_groups(id) ON DELETE CASCADE,
  invited_user_email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, invited_user_email)
);

-- Enable RLS
ALTER TABLE public.savings_group_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "Users can view invitations sent to their email" 
ON public.savings_group_invitations 
FOR SELECT 
USING (
  invited_user_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Group admins can view group invitations" 
ON public.savings_group_invitations 
FOR SELECT 
USING (user_is_group_admin(group_id, auth.uid()));

CREATE POLICY "Group admins can create invitations" 
ON public.savings_group_invitations 
FOR INSERT 
WITH CHECK (user_is_group_admin(group_id, auth.uid()));

CREATE POLICY "Invited users can update their own invitations" 
ON public.savings_group_invitations 
FOR UPDATE 
USING (
  invited_user_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  AND status = 'pending'
);

-- Trigger for updated_at
CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.savings_group_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();