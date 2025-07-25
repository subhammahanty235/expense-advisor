-- Create group expenses table for collaborative expense tracking
CREATE TABLE public.group_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.savings_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group expense approvals table
CREATE TABLE public.group_expense_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.group_expenses(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group messages table for in-app messaging
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.savings_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'expense')),
  referenced_expense_id UUID REFERENCES public.group_expenses(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group notifications table
CREATE TABLE public.group_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.savings_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense_added', 'expense_approved', 'expense_rejected', 'member_joined', 'goal_reached', 'reminder')),
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense reports table for saved reports
CREATE TABLE public.expense_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('expense_summary', 'category_breakdown', 'trend_analysis', 'group_analysis')),
  filters JSONB NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group permissions table for role-based access
CREATE TABLE public.group_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.savings_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('can_approve_expenses', 'can_manage_members', 'can_edit_group', 'can_view_analytics')),
  granted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense comments table for discussions
CREATE TABLE public.expense_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  group_expense_id UUID REFERENCES public.group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK ((expense_id IS NOT NULL AND group_expense_id IS NULL) OR (expense_id IS NULL AND group_expense_id IS NOT NULL))
);

-- Create group challenges table for gamification
CREATE TABLE public.group_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.savings_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('savings_goal', 'expense_limit', 'category_challenge', 'streak')),
  target_amount NUMERIC,
  target_date DATE,
  rules JSONB NOT NULL,
  rewards JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.group_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_expenses
CREATE POLICY "Group members can view group expenses" ON public.group_expenses
  FOR SELECT USING (user_is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can add group expenses" ON public.group_expenses
  FOR INSERT WITH CHECK (user_is_group_member(group_id, auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Users can update their own group expenses" ON public.group_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Group admins can update group expenses" ON public.group_expenses
  FOR UPDATE USING (user_is_group_admin(group_id, auth.uid()));

-- RLS Policies for group_expense_approvals
CREATE POLICY "Group members can view expense approvals" ON public.group_expense_approvals
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.group_expenses 
    WHERE id = expense_id AND user_is_group_member(group_id, auth.uid())
  ));

CREATE POLICY "Group admins can create expense approvals" ON public.group_expense_approvals
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_expenses 
    WHERE id = expense_id AND user_is_group_admin(group_id, auth.uid())
  ) AND auth.uid() = approver_id);

-- RLS Policies for group_messages
CREATE POLICY "Group members can view group messages" ON public.group_messages
  FOR SELECT USING (user_is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can send messages" ON public.group_messages
  FOR INSERT WITH CHECK (user_is_group_member(group_id, auth.uid()) AND auth.uid() = user_id);

-- RLS Policies for group_notifications
CREATE POLICY "Users can view their own notifications" ON public.group_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.group_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.group_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for expense_reports
CREATE POLICY "Users can view their own reports" ON public.expense_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" ON public.expense_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" ON public.expense_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" ON public.expense_reports
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for group_permissions
CREATE POLICY "Group members can view group permissions" ON public.group_permissions
  FOR SELECT USING (user_is_group_member(group_id, auth.uid()));

CREATE POLICY "Group admins can manage permissions" ON public.group_permissions
  FOR ALL USING (user_is_group_admin(group_id, auth.uid()));

-- RLS Policies for expense_comments
CREATE POLICY "Users can view comments on accessible expenses" ON public.expense_comments
  FOR SELECT USING (
    (expense_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_id AND user_id = auth.uid())) OR
    (group_expense_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.group_expenses WHERE id = group_expense_id AND user_is_group_member(group_id, auth.uid())))
  );

CREATE POLICY "Users can add comments" ON public.expense_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.expense_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for group_challenges
CREATE POLICY "Group members can view group challenges" ON public.group_challenges
  FOR SELECT USING (user_is_group_member(group_id, auth.uid()));

CREATE POLICY "Group admins can manage challenges" ON public.group_challenges
  FOR ALL USING (user_is_group_admin(group_id, auth.uid()));

-- Create triggers for updated_at columns
CREATE TRIGGER update_group_expenses_updated_at
  BEFORE UPDATE ON public.group_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_reports_updated_at
  BEFORE UPDATE ON public.expense_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_comments_updated_at
  BEFORE UPDATE ON public.expense_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_challenges_updated_at
  BEFORE UPDATE ON public.group_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();