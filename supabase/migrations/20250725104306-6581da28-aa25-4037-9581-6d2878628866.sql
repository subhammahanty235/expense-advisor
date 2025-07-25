-- Fix search_path for security definer functions
CREATE OR REPLACE FUNCTION public.user_is_group_member(group_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.savings_group_members 
    WHERE savings_group_members.group_id = user_is_group_member.group_id 
    AND savings_group_members.user_id = user_is_group_member.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'public';

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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'public';