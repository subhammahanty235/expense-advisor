-- Update the function to account for both contributions and expenses
CREATE OR REPLACE FUNCTION public.update_group_total()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.savings_groups
  SET current_amount = (
    SELECT 
      COALESCE(SUM(contributions.amount), 0) - COALESCE(SUM(expenses.amount), 0)
    FROM 
      (SELECT COALESCE(SUM(amount), 0) as amount 
       FROM public.savings_contributions 
       WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)) as contributions,
      (SELECT COALESCE(SUM(amount), 0) as amount 
       FROM public.group_expenses 
       WHERE group_id = COALESCE(NEW.group_id, OLD.group_id) 
       AND status = 'approved') as expenses
  )
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for group_expenses to update savings total
CREATE TRIGGER update_savings_on_expense_change
  AFTER INSERT OR UPDATE OR DELETE ON public.group_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_total();