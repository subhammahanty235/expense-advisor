import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Users, 
  DollarSign, 
  Calendar,
  Filter,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { RootState } from '@/store/store';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

interface GroupExpense {
  id: string;
  group_id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name?: string;
    email: string;
  };
}

interface GroupExpenseApproval {
  id: string;
  expense_id: string;
  approver_id: string;
  status: 'approved' | 'rejected';
  comment?: string;
  created_at: string;
}

interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'system' | 'expense';
  referenced_expense_id?: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    email: string;
  };
}

interface Props {
  groupId: string;
  userRole: 'admin' | 'member';
}

export const GroupExpenseManagement: React.FC<Props> = ({ groupId, userRole }) => {
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'pending' | 'chat'>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { user } = useSelector((state: RootState) => state.auth);
  const { profile } = useSelector((state: RootState) => state.profile);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    if (groupId && user) {
      fetchGroupExpenses();
      fetchGroupMessages();
    }
  }, [groupId, user]);

  const fetchGroupExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('group_expenses')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as any);
    } catch (error) {
      console.error('Error fetching group expenses:', error);
      toast.error('Failed to load group expenses');
    }
  };

  const fetchGroupMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as any);
    } catch (error) {
      console.error('Error fetching group messages:', error);
      toast.error('Failed to load group messages');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (data: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_expenses')
        .insert({
          group_id: groupId,
          user_id: user.id,
          title: data.title,
          amount: parseFloat(data.amount),
          category: data.category,
          description: data.description,
          date: data.date,
          status: 'pending'
        });

      if (error) throw error;

      // Send system message
      await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message: `Added new expense: ${data.title} (${getCurrencySymbol()}${data.amount})`,
          message_type: 'system'
        });

      toast.success('Expense added successfully');
      setShowAddExpense(false);
      reset();
      fetchGroupExpenses();
      fetchGroupMessages();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleApproveExpense = async (expenseId: string, status: 'approved' | 'rejected', comment?: string) => {
    if (!user || userRole !== 'admin') return;

    try {
      // Update expense status
      await supabase
        .from('group_expenses')
        .update({
          status,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', expenseId);

      // Add approval record
      await supabase
        .from('group_expense_approvals')
        .insert({
          expense_id: expenseId,
          approver_id: user.id,
          status,
          comment
        });

      // Send system message
      const expense = expenses.find(e => e.id === expenseId);
      await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message: `${status === 'approved' ? 'Approved' : 'Rejected'} expense: ${expense?.title}${comment ? ` - ${comment}` : ''}`,
          message_type: 'system',
          referenced_expense_id: expenseId
        });

      toast.success(`Expense ${status} successfully`);
      fetchGroupExpenses();
      fetchGroupMessages();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error(`Failed to ${status} expense`);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    try {
      await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message: newMessage.trim(),
          message_type: 'text'
        });

      setNewMessage('');
      fetchGroupMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const getCurrencySymbol = () => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥'
    };
    return currencySymbols[profile?.currency || 'USD'] || '$';
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filter === 'all') return true;
    return expense.status === filter;
  });

  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const totalPendingAmount = pendingExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Group Expense Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage collaborative expenses and approvals
          </p>
        </div>
        <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Group Expense</DialogTitle>
              <DialogDescription>
                Submit an expense for group approval
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddExpense)} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'Title is required' })}
                  placeholder="Expense title"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{String(errors.title.message)}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...register('amount', { required: 'Amount is required' })}
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{String(errors.amount.message)}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    {...register('date', { required: 'Date is required' })}
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  onValueChange={(value) => setValue('category', value)} 
                  {...register('category', { required: 'Category is required' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food_dining">Food & Dining</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="healthcare">Health & Medical</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="subscriptions">Subscriptions</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{String(errors.category.message)}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Additional details about the expense"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddExpense(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Expense</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{expenses.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingExpenses.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold">{getCurrencySymbol()}{totalPendingAmount.toFixed(2)}</p>
              </div>
              <Users className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="expenses">All Expenses</TabsTrigger>
          {userRole === 'admin' && (
            <TabsTrigger value="pending">
              Pending Approval
              {pendingExpenses.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="chat">Group Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('approved')}
              >
                Approved
              </Button>
              <Button
                variant={filter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('rejected')}
              >
                Rejected
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(expense.profiles?.full_name, expense.profiles?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{expense.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.profiles?.full_name || expense.profiles?.email} • {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </p>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground mt-1">{expense.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">{getCurrencySymbol()}{expense.amount.toFixed(2)}</p>
                        <Badge variant="secondary">{expense.category}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(expense.status)}`} />
                        <span className="text-sm capitalize">{expense.status}</span>
                      </div>

                      {userRole === 'admin' && expense.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveExpense(expense.id, 'approved')}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveExpense(expense.id, 'rejected')}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {userRole === 'admin' && (
          <TabsContent value="pending" className="space-y-4">
            <div className="space-y-3">
              {pendingExpenses.map((expense) => (
                <Card key={expense.id} className="border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(expense.profiles?.full_name, expense.profiles?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{expense.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {expense.profiles?.full_name || expense.profiles?.email} • {format(new Date(expense.date), 'MMM dd, yyyy')}
                          </p>
                          {expense.description && (
                            <p className="text-sm text-muted-foreground mt-1">{expense.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">{getCurrencySymbol()}{expense.amount.toFixed(2)}</p>
                          <Badge variant="secondary">{expense.category}</Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveExpense(expense.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApproveExpense(expense.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {pendingExpenses.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending expenses to review</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Group Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {getInitials(message.profiles?.full_name, message.profiles?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {message.profiles?.full_name || message.profiles?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                        </p>
                        {message.message_type === 'system' && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};