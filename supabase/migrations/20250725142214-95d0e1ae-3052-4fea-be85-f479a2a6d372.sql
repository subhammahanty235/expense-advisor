-- Add foreign key constraint between savings_group_members and profiles
ALTER TABLE public.savings_group_members 
ADD CONSTRAINT savings_group_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);