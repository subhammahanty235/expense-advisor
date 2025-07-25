import { useSelector, useDispatch } from 'react-redux';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RootState } from '@/store/store';
import { deleteExpense } from '@/store/slices/expenseSlice';
import { Trash2, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    food_dining: 'bg-orange-100 text-orange-800',
    transportation: 'bg-blue-100 text-blue-800',
    utilities: 'bg-yellow-100 text-yellow-800',
    healthcare: 'bg-red-100 text-red-800',
    entertainment: 'bg-purple-100 text-purple-800',
    shopping: 'bg-pink-100 text-pink-800',
    education: 'bg-indigo-100 text-indigo-800',
    travel: 'bg-teal-100 text-teal-800',
    subscriptions: 'bg-cyan-100 text-cyan-800',
    other: 'bg-gray-100 text-gray-800',
  };
  return colors[category] || colors.other;
};

const ExpenseList = () => {
  const dispatch = useDispatch();
  const { expenses, currentFilter } = useSelector((state: RootState) => state.expenses);
  const { toast } = useToast();

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      dispatch(deleteExpense(expenseId));
      toast({
        title: "Success",
        description: "Expense deleted successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  const getFilteredExpenses = () => {
    const now = new Date();
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      
      switch (currentFilter) {
        case 'daily':
          return expenseDate.toDateString() === now.toDateString();
        case 'weekly':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return expenseDate >= weekStart && expenseDate <= weekEnd;
        case 'monthly':
          return expenseDate.getMonth() === now.getMonth() && 
                 expenseDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  };

  const filteredExpenses = getFilteredExpenses();

  if (filteredExpenses.length === 0) {
    return (
      <div className="text-center py-8">
        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No expenses found for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredExpenses.map((expense) => (
        <Card key={expense.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium">{expense.title}</h3>
                  <Badge className={getCategoryColor(expense.category)}>
                    {expense.category.replace('_', ' ').charAt(0).toUpperCase() + expense.category.replace('_', ' ').slice(1)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">${expense.amount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                
                {expense.description && (
                  <p className="text-sm text-muted-foreground mt-2">{expense.description}</p>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteExpense(expense.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExpenseList;