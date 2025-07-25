-- Drop and recreate the INSERT policy for savings_groups
DROP POLICY IF EXISTS "Users can create savings groups" ON public.savings_groups;

-- Create a new INSERT policy that should work properly
CREATE POLICY "Users can create savings groups" 
ON public.savings_groups 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);