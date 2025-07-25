import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RootState } from '@/store/store';
import { PiggyBank, Plus, Users, Calendar, Target, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface SavingsGroup {
  id: string;
  name: string;
  description?: string;
  goal_amount: number;
  current_amount: number;
  target_date?: string;
  created_by: string;
  is_active: boolean;
  member_count?: number;
  user_role?: string;
}

const SavingsPage = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile } = useSelector((state: RootState) => state.profile);
  const [groups, setGroups] = useState<SavingsGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal_amount: '',
    target_date: '',
  });
  const { toast } = useToast();

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'CAD': 'C$', 'AUD': 'A$',
    };
    return symbols[currency] || '$';
  };

  const currencySymbol = getCurrencySymbol(profile?.currency || 'USD');

  useEffect(() => {
    fetchSavingsGroups();
  }, [user]);

  const fetchSavingsGroups = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch groups with member count
      const { data: groupData, error: groupError } = await supabase
        .from('savings_groups')
        .select(`
          *,
          savings_group_members!inner(role)
        `)
        .eq('is_active', true);

      if (groupError) throw groupError;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupData || []).map(async (group: any) => {
          const { count } = await supabase
            .from('savings_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: count || 0,
            user_role: group.savings_group_members[0]?.role
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch collaborative savings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('savings_groups')
        .insert({
          name: formData.name,
          description: formData.description || null,
          goal_amount: parseFloat(formData.goal_amount),
          target_date: formData.target_date || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('savings_group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      setFormData({ name: '', description: '', goal_amount: '', target_date: '' });
      setShowCreateModal(false);
      fetchSavingsGroups();
      
      toast({
        title: "Success",
        description: "Collaborative savings created successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create collaborative savings",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const isGoalReached = (current: number, goal: number) => {
    return current >= goal;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b px-4 py-3">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <PiggyBank className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Collaborative Savings</h1>
          </div>
        </header>
        <div className="max-w-7xl mx-auto p-4">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80">
              <PiggyBank className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Collaborative Savings</h1>
            </Link>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Collaborative Savings</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Vacation Fund"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What are you saving for?"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal_amount">Goal Amount ({currencySymbol})</Label>
                    <Input
                      id="goal_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.goal_amount}
                      onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_date">Target Date (Optional)</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Group</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Groups</p>
                  <p className="text-2xl font-bold">{groups.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Saved</p>
                  <p className="text-2xl font-bold">
                    {currencySymbol}{groups.reduce((sum, group) => sum + group.current_amount, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Goals Reached</p>
                  <p className="text-2xl font-bold">
                    {groups.filter(group => isGoalReached(group.current_amount, group.goal_amount)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Savings Groups */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Your Collaborative Savings</h2>
          
          {groups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <PiggyBank className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Collaborative Savings Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first collaborative savings and start saving with friends and family!
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => {
                const progressPercentage = getProgressPercentage(group.current_amount, group.goal_amount);
                const goalReached = isGoalReached(group.current_amount, group.goal_amount);
                
                return (
                  <Link key={group.id} to={`/savings/${group.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-1">{group.name}</CardTitle>
                            {group.description && (
                              <p className="text-sm text-muted-foreground">{group.description}</p>
                            )}
                          </div>
                          <Badge variant={group.user_role === 'admin' ? 'default' : 'secondary'}>
                            {group.user_role}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Progress */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Progress</span>
                              <span className={goalReached ? 'text-green-600 font-medium' : ''}>
                                {progressPercentage.toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                            <div className="flex justify-between text-sm mt-2 text-muted-foreground">
                              <span>{currencySymbol}{group.current_amount.toFixed(2)}</span>
                              <span>{currencySymbol}{group.goal_amount.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Members and Date */}
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
                            </div>
                            {group.target_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(group.target_date), 'MMM dd')}</span>
                              </div>
                            )}
                          </div>

                          {/* Goal Status */}
                          {goalReached && (
                            <Badge variant="default" className="w-full justify-center bg-green-100 text-green-800">
                              🎉 Goal Reached!
                            </Badge>
                          )}

                          {/* Action indicator */}
                          <div className="flex items-center justify-end text-primary">
                            <span className="text-sm mr-1">View Details</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavingsPage;