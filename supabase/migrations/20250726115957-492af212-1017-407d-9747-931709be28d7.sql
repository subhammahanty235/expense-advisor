-- Add foreign key relationships to enable joins with profiles table

-- Add foreign key for group_messages.user_id -> profiles.user_id
ALTER TABLE public.group_messages 
ADD CONSTRAINT fk_group_messages_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- Add foreign key for group_expenses.user_id -> profiles.user_id  
ALTER TABLE public.group_expenses 
ADD CONSTRAINT fk_group_expenses_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- Add foreign key for savings_contributions.user_id -> profiles.user_id
ALTER TABLE public.savings_contributions 
ADD CONSTRAINT fk_savings_contributions_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- Add foreign key for group_expenses.approved_by -> profiles.user_id (when not null)
ALTER TABLE public.group_expenses 
ADD CONSTRAINT fk_group_expenses_approved_by 
FOREIGN KEY (approved_by) REFERENCES public.profiles(user_id);

-- Add foreign key for group_expense_approvals.approver_id -> profiles.user_id
ALTER TABLE public.group_expense_approvals 
ADD CONSTRAINT fk_group_expense_approvals_approver_id 
FOREIGN KEY (approver_id) REFERENCES public.profiles(user_id);