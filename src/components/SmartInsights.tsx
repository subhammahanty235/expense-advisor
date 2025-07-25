import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RootState } from '@/store/store';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

const SmartInsights = () => {
  const { profile } = useSelector((state: RootState) => state.profile);
  const { expenses } = useSelector((state: RootState) => state.expenses);
  const [insights, setInsights] = useState<any[]>([]);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'CAD': 'C$', 'AUD': 'A$',
    };
    return symbols[currency] || '$';
  };

  const currencySymbol = getCurrencySymbol(profile?.currency || 'USD');

  useEffect(() => {
    generateInsights();
  }, [expenses, profile]);

  const generateInsights = () => {
    if (!expenses.length || !profile) return;

    const now = new Date();
    const currentMonth = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
    });

    const lastMonth = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
      return expenseDate.getMonth() === lastMonthDate.getMonth() && 
             expenseDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const insights = [];

    // Monthly spending comparison
    const currentTotal = currentMonth.reduce((sum, e) => sum + e.amount, 0);
    const lastTotal = lastMonth.reduce((sum, e) => sum + e.amount, 0);
    
    if (lastTotal > 0) {
      const change = ((currentTotal - lastTotal) / lastTotal) * 100;
      insights.push({
        type: change > 0 ? 'warning' : 'success',
        icon: change > 0 ? TrendingUp : TrendingDown,
        title: `Monthly Spending ${change > 0 ? 'Increased' : 'Decreased'}`,
        description: `${Math.abs(change).toFixed(1)}% ${change > 0 ? 'higher' : 'lower'} than last month`,
        action: change > 20 ? 'Consider reviewing your budget' : null
      });
    }

    // Category analysis
    const categoryTotals = currentMonth.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0];
    if (topCategory) {
      const percentage = ((topCategory[1] / currentTotal) * 100);
      insights.push({
        type: percentage > 40 ? 'warning' : 'info',
        icon: AlertCircle,
        title: `Top Spending Category: ${topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1)}`,
        description: `${currencySymbol}${topCategory[1].toFixed(2)} (${percentage.toFixed(1)}% of total spending)`,
        action: percentage > 40 ? 'Consider setting a budget limit for this category' : null
      });
    }

    // Budget progress
    if (profile.monthly_salary) {
      const budgetUsed = (currentTotal / profile.monthly_salary) * 100;
      insights.push({
        type: budgetUsed > 80 ? 'warning' : budgetUsed > 60 ? 'info' : 'success',
        icon: budgetUsed > 80 ? AlertCircle : CheckCircle,
        title: `Budget Usage: ${budgetUsed.toFixed(1)}%`,
        description: `${currencySymbol}${(profile.monthly_salary - currentTotal).toFixed(2)} remaining this month`,
        action: budgetUsed > 80 ? 'Consider reducing expenses' : null
      });
    }

    // Weekly pattern
    const thisWeek = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return expenseDate >= weekStart;
    });

    const weeklyTotal = thisWeek.reduce((sum, e) => sum + e.amount, 0);
    const avgDailySpending = weeklyTotal / 7;
    const projectedMonthly = avgDailySpending * 30;

    if (profile.monthly_salary && projectedMonthly > profile.monthly_salary * 0.9) {
      insights.push({
        type: 'warning',
        icon: TrendingUp,
        title: 'High Weekly Spending Trend',
        description: `At current pace, you might exceed your budget by ${currencySymbol}${(projectedMonthly - profile.monthly_salary).toFixed(2)}`,
        action: 'Consider reducing daily expenses'
      });
    }

    setInsights(insights);
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'destructive';
      case 'success': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              💡 Add more expenses to get personalized insights about your spending patterns!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => {
              const IconComponent = insight.icon;
              return (
                <div key={index} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      {insight.action && (
                        <Badge variant={getInsightColor(insight.type)} className="mt-2">
                          💡 {insight.action}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartInsights;