import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RootState } from '@/store/store';
import { Target, Plus, Trash2 } from 'lucide-react';

interface BudgetGoal {
  id: string;
  category: string;
  amount: number;
  period: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

const BudgetGoals = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile } = useSelector((state: RootState) => state.profile);
  const { expenses } = useSelector((state: RootState) => state.expenses);
  const [goals, setGoals] = useState<BudgetGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly' as const,
  });
  const { toast } = useToast();

  const categories = [
    'food', 'transportation', 'entertainment', 'utilities', 'healthcare',
    'shopping', 'education', 'travel', 'other'
  ];

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'CAD': 'C$', 'AUD': 'A$',
    };
    return symbols[currency] || '$';
  };

  const currencySymbol = getCurrencySymbol(profile?.currency || 'USD');

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('budget_goals')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const calculateSpentAmount = (goal: BudgetGoal) => {
    const now = new Date();
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const matchesCategory = expense.category === goal.category;
      
      switch (goal.period) {
        case 'daily':
          return matchesCategory && expenseDate.toDateString() === now.toDateString();
        case 'weekly':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return matchesCategory && expenseDate >= weekStart && expenseDate <= weekEnd;
        case 'monthly':
          return matchesCategory && 
                 expenseDate.getMonth() === now.getMonth() && 
                 expenseDate.getFullYear() === now.getFullYear();
        default:
          return false;
      }
    });

    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budget_goals')
        .insert({
          user_id: user.id,
          category: formData.category,
          amount: parseFloat(formData.amount),
          period: formData.period,
        });

      if (error) throw error;
      
      setFormData({ category: '', amount: '', period: 'monthly' });
      setShowAddGoal(false);
      fetchGoals();
      toast({ title: "Success", description: "Budget goal added successfully!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add budget goal", variant: "destructive" });
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budget_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchGoals();
      toast({ title: "Success", description: "Budget goal deleted successfully!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete budget goal", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Budget Goals
        </CardTitle>
        <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Budget Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Select value={formData.period} onValueChange={(value: any) => setFormData({ ...formData, period: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddGoal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Goal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No budget goals set. Create your first goal to start tracking!
          </p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const spent = calculateSpentAmount(goal);
              const percentage = Math.min((spent / goal.amount) * 100, 100);
              const isOverBudget = spent > goal.amount;
              
              return (
                <div key={goal.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium capitalize">{goal.category}</h4>
                      <p className="text-sm text-muted-foreground">
                        {currencySymbol}{spent.toFixed(2)} / {currencySymbol}{goal.amount.toFixed(2)} ({goal.period})
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`mt-2 ${isOverBudget ? 'text-destructive' : ''}`}
                  />
                  {isOverBudget && (
                    <p className="text-sm text-destructive mt-1">
                      Over budget by {currencySymbol}{(spent - goal.amount).toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetGoals;