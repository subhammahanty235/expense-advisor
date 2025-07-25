-- Create savings groups table
CREATE TABLE public.savings_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  goal_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create savings group members table
CREATE TABLE public.savings_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.savings_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create savings contributions table
CREATE TABLE public.savings_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.savings_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.savings_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for savings_groups
CREATE POLICY "Users can view groups they're members of" 
ON public.savings_groups 
FOR SELECT 
USING (
  id IN (
    SELECT group_id 
    FROM public.savings_group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create savings groups" 
ON public.savings_groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" 
ON public.savings_groups 
FOR UPDATE 
USING (
  id IN (
    SELECT group_id 
    FROM public.savings_group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for savings_group_members
CREATE POLICY "Users can view group memberships" 
ON public.savings_group_members 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM public.savings_group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can manage members" 
ON public.savings_group_members 
FOR ALL 
USING (
  group_id IN (
    SELECT group_id 
    FROM public.savings_group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for savings_contributions
CREATE POLICY "Users can view contributions in their groups" 
ON public.savings_contributions 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM public.savings_group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group members can add contributions" 
ON public.savings_contributions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  group_id IN (
    SELECT group_id 
    FROM public.savings_group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own contributions" 
ON public.savings_contributions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contributions" 
ON public.savings_contributions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_savings_groups_updated_at
BEFORE UPDATE ON public.savings_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_savings_contributions_updated_at
BEFORE UPDATE ON public.savings_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update group total when contributions change
CREATE OR REPLACE FUNCTION public.update_group_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.savings_groups
  SET current_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.savings_contributions
    WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
  )
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update group total
CREATE TRIGGER update_group_total_on_insert
AFTER INSERT ON public.savings_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_group_total();

CREATE TRIGGER update_group_total_on_update
AFTER UPDATE ON public.savings_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_group_total();

CREATE TRIGGER update_group_total_on_delete
AFTER DELETE ON public.savings_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_group_total();