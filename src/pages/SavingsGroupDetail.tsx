import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RootState } from '@/store/store';
import { 
  ArrowLeft, Plus, Users, Calendar, Target, Trash2, 
  PiggyBank, Mail, UserPlus, TrendingUp, Download 
} from 'lucide-react';
import { format } from 'date-fns';
import { GroupExpenseManagement } from '@/components/collaboration/GroupExpenseManagement';
import * as XLSX from 'xlsx';

interface SavingsGroup {
  id: string;
  name: string;
  description?: string;
  goal_amount: number;
  current_amount: number;
  target_date?: string;
  created_by: string;
  is_active: boolean;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    full_name?: string;
    email?: string;
  };
  total_contributed: number;
}

interface Contribution {
  id: string;
  user_id: string;
  amount: number;
  description?: string;
  date: string;
  profile?: {
    full_name?: string;
    email?: string;
  };
}

const SavingsGroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile } = useSelector((state: RootState) => state.profile);
  const [group, setGroup] = useState<SavingsGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [contributionForm, setContributionForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const { toast } = useToast();

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'CAD': 'C$', 'AUD': 'A$',
    };
    return symbols[currency] || '$';
  };

  const currencySymbol = getCurrencySymbol(profile?.currency || 'USD');

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId, user]);

  const fetchGroupDetails = async () => {
    if (!groupId || !user) return;

    setLoading(true);
    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('savings_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Fetch user's role
      const { data: memberData, error: memberError } = await supabase
        .from('savings_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (memberError) throw memberError;
      setUserRole(memberData.role);

      // Fetch all members with profiles and contribution totals
      const { data: membersData, error: membersError } = await supabase
        .from('savings_group_members')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Calculate contribution totals for each member
      const membersWithTotals = await Promise.all(
        (membersData || []).map(async (member: any) => {
          const { data: contributionData } = await supabase
            .from('savings_contributions')
            .select('amount')
            .eq('group_id', groupId)
            .eq('user_id', member.user_id);

          const total = contributionData?.reduce((sum, c) => sum + c.amount, 0) || 0;

          return {
            ...member,
            profile: member.profiles,
            total_contributed: total,
          };
        })
      );

      setMembers(membersWithTotals);

      // Fetch contributions with profiles
      const { data: contributionsData, error: contributionsError } = await supabase
        .from('savings_contributions')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('group_id', groupId)
        .order('date', { ascending: false });

      if (contributionsError) throw contributionsError;
      setContributions(contributionsData?.map((c: any) => ({
        ...c,
        profile: c.profiles
      })) || []);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch group details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupId) return;

    try {
      const { error } = await supabase
        .from('savings_contributions')
        .insert({
          group_id: groupId,
          user_id: user.id,
          amount: parseFloat(contributionForm.amount),
          description: contributionForm.description || null,
          date: contributionForm.date,
        });

      if (error) throw error;

      setContributionForm({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowAddContribution(false);
      fetchGroupDetails();
      
      toast({
        title: "Success",
        description: "Contribution added successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contribution",
        variant: "destructive",
      });
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupId) return;

    try {
      // Check if user is already a member or has pending invitation
      const { data: existingMember } = await supabase
        .from('savings_group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: existingInvitation } = await supabase
        .from('savings_group_invitations')
        .select('*')
        .eq('group_id', groupId)
        .eq('invited_user_email', inviteEmail)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        toast({
          title: "Already Invited",
          description: "This user already has a pending invitation",
          variant: "destructive",
        });
        return;
      }

      // Create invitation
      const { error } = await supabase
        .from('savings_group_invitations')
        .insert({
          group_id: groupId,
          invited_user_email: inviteEmail,
          invited_by: user.id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail('');
      setShowInviteMember(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const exportTransactions = async (format: 'json' | 'excel') => {
    if (!groupId) return;

    try {
      // Fetch all contributions
      const { data: allContributions, error: contributionsError } = await supabase
        .from('savings_contributions')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('group_id', groupId)
        .order('date', { ascending: false });

      if (contributionsError) {
        console.error('Error fetching contributions:', contributionsError);
      }

      // Fetch all group expenses - use specific foreign key relationship
      const { data: allExpenses, error: expensesError } = await supabase
        .from('group_expenses')
        .select(`
          *,
          profiles!fk_group_expenses_user_id(full_name, email)
        `)
        .eq('group_id', groupId)
        .order('date', { ascending: false });

      if (expensesError) {
        console.error('Error fetching expenses:', expensesError);
      }

      console.log('Fetched contributions:', allContributions);
      console.log('Fetched expenses:', allExpenses);

      // Calculate totals
      const totalContributions = allContributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const totalExpenses = allExpenses?.reduce((sum, e) => sum + (e.status === 'approved' ? e.amount : 0), 0) || 0;
      const netSavings = totalContributions - totalExpenses;

      const exportData = {
        groupInfo: {
          name: group?.name,
          goalAmount: group?.goal_amount,
          currentAmount: group?.current_amount,
          targetDate: group?.target_date,
          exportDate: new Date().toISOString().split('T')[0]
        },
        summary: {
          totalContributions,
          totalExpenses,
          netSavings,
          currency: profile?.currency || 'USD'
        },
        contributions: allContributions?.map(c => ({
          date: c.date,
          amount: c.amount,
          description: c.description,
          contributor: c.profiles?.full_name || c.profiles?.email || 'Unknown',
          type: 'Contribution'
        })) || [],
        expenses: allExpenses?.map(e => ({
          date: e.date,
          amount: e.amount,
          title: e.title,
          description: e.description,
          category: e.category,
          status: e.status,
          spentBy: (e as any).profiles?.full_name || (e as any).profiles?.email || 'Unknown',
          type: 'Expense'
        })) || []
      };

      if (format === 'json') {
        // Export as JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${group?.name || 'group'}_transactions_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Export as Excel
        const wb = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryData = [
          ['Group Name', exportData.groupInfo.name],
          ['Goal Amount', exportData.groupInfo.goalAmount],
          ['Current Amount', exportData.groupInfo.currentAmount],
          ['Target Date', exportData.groupInfo.targetDate],
          ['Export Date', exportData.groupInfo.exportDate],
          ['Currency', exportData.summary.currency],
          [],
          ['Total Contributions', exportData.summary.totalContributions],
          ['Total Expenses', exportData.summary.totalExpenses],
          ['Net Savings', exportData.summary.netSavings]
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        // Contributions sheet
        if (exportData.contributions.length > 0) {
          const contributionsWs = XLSX.utils.json_to_sheet(exportData.contributions);
          XLSX.utils.book_append_sheet(wb, contributionsWs, 'Contributions');
        }

        // Expenses sheet
        if (exportData.expenses.length > 0) {
          const expensesWs = XLSX.utils.json_to_sheet(exportData.expenses);
          XLSX.utils.book_append_sheet(wb, expensesWs, 'Expenses');
        }

        // All transactions combined
        const allTransactions = [
          ...exportData.contributions,
          ...exportData.expenses
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (allTransactions.length > 0) {
          const allTransactionsWs = XLSX.utils.json_to_sheet(allTransactions);
          XLSX.utils.book_append_sheet(wb, allTransactionsWs, 'All Transactions');
        }

        XLSX.writeFile(wb, `${group?.name || 'group'}_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      toast({
        title: "Export Successful",
        description: `Transactions exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export transactions",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Group Not Found</h2>
          <Link to="/savings">
            <Button>Back to Savings</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.min((group.current_amount / group.goal_amount) * 100, 100);
  const goalReached = group.current_amount >= group.goal_amount;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/savings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTransactions('excel')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTransactions('json')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            {userRole === 'admin' && (
              <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleInviteMember} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="friend@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowInviteMember(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Send Invitation</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={showAddContribution} onOpenChange={setShowAddContribution}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Savings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contribution</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddContribution} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={contributionForm.amount}
                        onChange={(e) => setContributionForm({ ...contributionForm, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={contributionForm.date}
                        onChange={(e) => setContributionForm({ ...contributionForm, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="What's this contribution for?"
                      value={contributionForm.description}
                      onChange={(e) => setContributionForm({ ...contributionForm, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddContribution(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Contribution</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Group Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Savings Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.description && (
                    <p className="text-muted-foreground">{group.description}</p>
                  )}
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <Badge variant={goalReached ? 'default' : 'secondary'}>
                        {goalReached ? '🎉 Goal Reached!' : `${progressPercentage.toFixed(1)}%`}
                      </Badge>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                      <span>{currencySymbol}{group.current_amount.toFixed(2)} saved</span>
                      <span>{currencySymbol}{group.goal_amount.toFixed(2)} goal</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="text-lg font-semibold">
                        {currencySymbol}{Math.max(0, group.goal_amount - group.current_amount).toFixed(2)}
                      </p>
                    </div>
                    {group.target_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Target Date</p>
                        <p className="text-lg font-semibold flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(group.target_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.profile?.full_name, member.profile?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currencySymbol}{member.total_contributed.toFixed(2)} contributed
                      </p>
                    </div>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Contributions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contributions.length === 0 ? (
              <div className="text-center py-8">
                <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No contributions yet. Be the first to contribute!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contributions.map((contribution) => (
                  <div key={contribution.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(contribution.profile?.full_name, contribution.profile?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {contribution.profile?.full_name || contribution.profile?.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(contribution.date), 'MMM dd, yyyy')}
                        </p>
                        {contribution.description && (
                          <p className="text-xs text-muted-foreground">{contribution.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        +{currencySymbol}{contribution.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Expense Management */}
        <GroupExpenseManagement groupId={groupId!} userRole={userRole as "admin" | "member"} />
      </div>
    </div>
  );
};

export default SavingsGroupDetail;