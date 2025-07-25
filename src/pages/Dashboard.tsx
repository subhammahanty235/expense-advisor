import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RootState } from '@/store/store';
import { setExpenses, setFilter } from '@/store/slices/expenseSlice';
import { DollarSign, Plus, TrendingUp, Calendar, LogOut, User, PiggyBank } from 'lucide-react';
import AddExpenseModal from '@/components/AddExpenseModal';
import ExpenseList from '@/components/ExpenseList';
import ProfileSetup from '@/components/ProfileSetup';
import SmartInsights from '@/components/SmartInsights';
import BudgetGoals from '@/components/BudgetGoals';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile } = useSelector((state: RootState) => state.profile);
  const { expenses, currentFilter } = useSelector((state: RootState) => state.expenses);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, [currentFilter]);

  useEffect(() => {
    if (profile && !profile.monthly_salary) {
      setShowProfileSetup(true);
    }
  }, [profile]);

  const fetchExpenses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      dispatch(setExpenses(data || []));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const calculateTotalExpenses = () => {
    const now = new Date();
    const filtered = expenses.filter(expense => {
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

    return filtered.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'CAD': 'C$',
      'AUD': 'A$',
    };
    return symbols[currency] || '$';
  };

  const currencySymbol = getCurrencySymbol(profile?.currency || 'USD');
  const totalExpenses = calculateTotalExpenses();
  const remainingSalary = (profile?.monthly_salary || 0) - totalExpenses;
  const spentPercentage = profile?.monthly_salary ? (totalExpenses / profile.monthly_salary) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ExpenseTracker AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/savings">
              <Button variant="ghost" className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                <span className="hidden sm:inline">Savings</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowProfileSetup(true)}
            >
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencySymbol}{totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {currentFilter} spending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencySymbol}{remainingSalary.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                from monthly salary
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{spentPercentage.toFixed(1)}%</div>
              <Progress value={Math.min(spentPercentage, 100)} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Smart Insights */}
        <SmartInsights />

        {/* Budget Goals */}
        <BudgetGoals />

        {/* Expenses Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expenses</CardTitle>
            <Button onClick={() => setShowAddExpense(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs value={currentFilter} onValueChange={(value) => dispatch(setFilter(value as any))}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value={currentFilter} className="mt-4">
                <ExpenseList />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AddExpenseModal 
        open={showAddExpense} 
        onOpenChange={setShowAddExpense}
        onExpenseAdded={fetchExpenses}
      />

      <ProfileSetup 
        open={showProfileSetup} 
        onOpenChange={setShowProfileSetup}
      />
    </div>
  );
};

export default Dashboard;