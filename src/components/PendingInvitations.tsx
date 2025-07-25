import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, Clock, Check, X } from 'lucide-react';

interface Invitation {
  id: string;
  group_id: string;
  invited_user_email: string;
  invited_by: string;
  status: string;
  created_at: string;
  savings_groups: {
    name: string;
    description: string | null;
    goal_amount: number;
  };
  inviter_profile: {
    full_name: string;
  };
}

export default function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  const fetchInvitations = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.email) return;

      const { data, error } = await supabase
        .from('savings_group_invitations')
        .select(`
          *,
          savings_groups!inner(name, description, goal_amount)
        `)
        .eq('invited_user_email', profile.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch inviter profiles separately
      const invitationsWithProfiles = await Promise.all(
        (data || []).map(async (invitation) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', invitation.invited_by)
            .single();
          
          return {
            ...invitation,
            inviter_profile: { full_name: profile?.full_name || 'Unknown User' }
          };
        })
      );

      setInvitations(invitationsWithProfiles);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitation = async (invitationId: string, action: 'accept' | 'decline') => {
    setProcessing(invitationId);
    try {
      // Update invitation status
      const { error: updateError } = await supabase
        .from('savings_group_invitations')
        .update({ status: action === 'accept' ? 'accepted' : 'declined' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      if (action === 'accept') {
        // Add user to the group
        const invitation = invitations.find(inv => inv.id === invitationId);
        if (invitation) {
          const { error: memberError } = await supabase
            .from('savings_group_members')
            .insert({
              group_id: invitation.group_id,
              user_id: user?.id,
              role: 'member'
            });

          if (memberError) throw memberError;
        }
      }

      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      toast.success(action === 'accept' ? 'Invitation accepted!' : 'Invitation declined');
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      toast.error(`Failed to ${action} invitation`);
    } finally {
      setProcessing(null);
    }
  };

  const getCurrencySymbol = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading invitations...</div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No pending invitations</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          You have {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold">{invitation.savings_groups.name}</h3>
                {invitation.savings_groups.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {invitation.savings_groups.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="font-medium">
                    Goal: {getCurrencySymbol(invitation.savings_groups.goal_amount)}
                  </span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Invited by: {invitation.inviter_profile.full_name}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleInvitation(invitation.id, 'accept')}
                disabled={processing === invitation.id}
                className="flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleInvitation(invitation.id, 'decline')}
                disabled={processing === invitation.id}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}