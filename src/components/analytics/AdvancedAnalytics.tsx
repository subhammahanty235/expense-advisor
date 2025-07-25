import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Download, Filter, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { RootState } from '@/store/store';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';

interface ExpenseAnalytics {
  daily: Array<{ date: string; amount: number; expenses: number }>;
  weekly: Array<{ week: string; amount: number; expenses: number }>;
  monthly: Array<{ month: string; amount: number; expenses: number }>;
  categories: Array<{ name: string; amount: number; percentage: number; color: string }>;
  trends: Array<{ period: string; amount: number; change: number }>;
  predictions: Array<{ month: string; predicted: number; actual?: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', 'hsl(var(--destructive))', 'hsl(var(--warning))'];

export const AdvancedAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile } = useSelector((state: RootState) => state.profile);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 
        timeRange === '7d' ? 7 : 
        timeRange === '30d' ? 30 : 
        timeRange === '90d' ? 90 : 365
      );

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      const processedAnalytics = processExpenseData(expenses || []);
      setAnalytics(processedAnalytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processExpenseData = (expenses: any[]): ExpenseAnalytics => {
    // Process daily data
    const dailyMap = new Map();
    expenses.forEach(expense => {
      const date = expense.date;
      const existing = dailyMap.get(date) || { amount: 0, expenses: 0 };
      dailyMap.set(date, {
        amount: existing.amount + Number(expense.amount),
        expenses: existing.expenses + 1
      });
    });

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date: format(new Date(date), 'MMM dd'),
      amount: data.amount,
      expenses: data.expenses
    }));

    // Process weekly data
    const weeklyMap = new Map();
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const weekStart = startOfWeek(date);
      const weekKey = format(weekStart, 'MMM dd');
      const existing = weeklyMap.get(weekKey) || { amount: 0, expenses: 0 };
      weeklyMap.set(weekKey, {
        amount: existing.amount + Number(expense.amount),
        expenses: existing.expenses + 1
      });
    });

    const weekly = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      amount: data.amount,
      expenses: data.expenses
    }));

    // Process monthly data
    const monthlyMap = new Map();
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = format(date, 'MMM yyyy');
      const existing = monthlyMap.get(monthKey) || { amount: 0, expenses: 0 };
      monthlyMap.set(monthKey, {
        amount: existing.amount + Number(expense.amount),
        expenses: existing.expenses + 1
      });
    });

    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      amount: data.amount,
      expenses: data.expenses
    }));

    // Process categories
    const categoryMap = new Map();
    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    expenses.forEach(expense => {
      const category = expense.category;
      const existing = categoryMap.get(category) || 0;
      categoryMap.set(category, existing + Number(expense.amount));
    });

    const categories = Array.from(categoryMap.entries()).map(([name, amount], index) => ({
      name,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.amount - a.amount);

    // Process trends (month-over-month)
    const trends = monthly.map((monthData, index) => {
      const prevMonth = monthly[index - 1];
      const change = prevMonth ? ((monthData.amount - prevMonth.amount) / prevMonth.amount) * 100 : 0;
      return {
        period: monthData.month,
        amount: monthData.amount,
        change
      };
    });

    // Simple prediction (linear regression based on last 3 months)
    const predictions = [];
    if (monthly.length >= 3) {
      const lastThree = monthly.slice(-3);
      const avgGrowth = lastThree.reduce((sum, month, index) => {
        if (index === 0) return 0;
        const prevMonth = lastThree[index - 1];
        return sum + (month.amount - prevMonth.amount);
      }, 0) / 2;

      for (let i = 1; i <= 3; i++) {
        const lastAmount = monthly[monthly.length - 1]?.amount || 0;
        predictions.push({
          month: format(new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000), 'MMM yyyy'),
          predicted: Math.max(0, lastAmount + (avgGrowth * i))
        });
      }
    }

    return { daily, weekly, monthly, categories, trends, predictions };
  };

  const getCurrencySymbol = () => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      JPY: '¥',
      AUD: 'A$',
      CAD: 'C$',
      CHF: 'CHF',
      CNY: '¥',
      SEK: 'kr',
      NZD: 'NZ$'
    };
    return currencySymbols[profile?.currency || 'USD'] || '$';
  };

  const exportData = () => {
    if (!analytics) return;
    
    const data = {
      daily: analytics.daily,
      categories: analytics.categories,
      trends: analytics.trends,
      exportDate: new Date().toISOString(),
      currency: profile?.currency || 'USD'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Analytics data exported successfully');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Advanced Analytics</CardTitle>
          <CardDescription>Loading your expense analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Advanced Analytics</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalExpenses = analytics.daily.reduce((sum, day) => sum + day.amount, 0);
  const avgDaily = analytics.daily.length > 0 ? totalExpenses / analytics.daily.length : 0;
  const lastTrend = analytics.trends[analytics.trends.length - 1];

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">Detailed insights into your spending patterns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTimeRange('7d')} 
                  className={timeRange === '7d' ? 'bg-primary text-primary-foreground' : ''}>
            7 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeRange('30d')}
                  className={timeRange === '30d' ? 'bg-primary text-primary-foreground' : ''}>
            30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeRange('90d')}
                  className={timeRange === '90d' ? 'bg-primary text-primary-foreground' : ''}>
            90 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeRange('1y')}
                  className={timeRange === '1y' ? 'bg-primary text-primary-foreground' : ''}>
            1 Year
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{getCurrencySymbol()}{totalExpenses.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                <p className="text-2xl font-bold">{getCurrencySymbol()}{avgDaily.toFixed(2)}</p>
              </div>
              <Activity className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Trend</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {lastTrend?.change ? `${Math.abs(lastTrend.change).toFixed(1)}%` : '0%'}
                  </p>
                  {lastTrend?.change > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-destructive" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{analytics.categories.length}</p>
              </div>
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Spending Trends</TabsTrigger>
          <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Expense Trends</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setChartType('line')}
                          className={chartType === 'line' ? 'bg-primary text-primary-foreground' : ''}>
                    Line
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setChartType('bar')}
                          className={chartType === 'bar' ? 'bg-primary text-primary-foreground' : ''}>
                    Bar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setChartType('area')}
                          className={chartType === 'area' ? 'bg-primary text-primary-foreground' : ''}>
                    Area
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                {chartType === 'line' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                {chartType === 'bar' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {chartType === 'area' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={Object.fromEntries(analytics.categories.map(cat => [
                    cat.name, { label: cat.name, color: cat.color }
                  ]))}
                  className="h-80"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="amount"
                      >
                        {analytics.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.categories.slice(0, 6).map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{getCurrencySymbol()}{category.amount.toFixed(2)}</div>
                        <Badge variant="secondary">{category.percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending Predictions</CardTitle>
              <CardDescription>AI-powered forecasting based on your spending patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  predicted: { label: "Predicted", color: "hsl(var(--primary))" },
                  actual: { label: "Actual", color: "hsl(var(--secondary))" }
                }}
                className="h-80"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...analytics.monthly.slice(-6), ...analytics.predictions]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--secondary))" strokeWidth={2} name="Actual" />
                    <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" name="Predicted" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: { label: "Amount", color: "hsl(var(--primary))" }
                  }}
                  className="h-64"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.weekly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: { label: "Amount", color: "hsl(var(--secondary))" }
                  }}
                  className="h-64"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="amount" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};