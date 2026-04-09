'use client';

import { useEffect, useState } from 'react';
import { useTeam } from '@/context/team';
import { useSession } from 'next-auth/react';
import { User } from '@/types/user';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FiUsers, FiTrash2, FiCopy, FiCheck } from 'react-icons/fi';

type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';

interface Member {
  role: Role;
  userId: string;
  teamId: string;
  user: { email: string; name: string | null };
}

interface Invitation {
  email: string;
  expires: string;
  token: string;
}

export function ManageTeams() {
  const teamInfo = useTeam();
  const { data: session } = useSession();
  const currentUserId = (session?.user as User | undefined)?.id;
  const teamId = teamInfo?.currentTeam?.id;

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isAdmin = members.some(
    (m) => m.userId === currentUserId && m.role === 'ADMIN'
  );

  const fetchData = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/members`),
        fetch(`/api/teams/${teamId}/invitations`),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (invitesRes.ok) setInvitations(await invitesRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const handleRoleChange = async (userId: string, role: Role) => {
    const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role } : m))
      );
      toast.success('Role updated');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to update role');
    }
  };

  const handleRemove = async (userId: string) => {
    const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success('Member removed');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to remove member');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        await navigator.clipboard.writeText(data.inviteUrl);
        toast.success('Invite link copied to clipboard');
        setInviteEmail('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to create invitation');
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (email: string) => {
    const res = await fetch(`/api/teams/${teamId}/invitations`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setInvitations((prev) => prev.filter((i) => i.email !== email));
      toast.success('Invitation revoked');
    } else {
      toast.error('Failed to revoke invitation');
    }
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center space-x-2">
          <FiUsers className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Team Members</h2>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium text-sm">
                    {member.user.name || member.user.email}
                  </p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && member.userId !== currentUserId ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          handleRoleChange(member.userId, v as Role)
                        }
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(member.userId)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                      {member.role}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Invite Member</h2>
            <p className="text-sm text-gray-500">
              Enter an email address to generate an invite link (valid 7 days).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
              >
                {inviting ? 'Creating...' : 'Generate Link'}
              </Button>
            </div>

            {invitations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Pending Invitations</p>
                <ul className="space-y-2">
                  {invitations.map((inv) => (
                    <li
                      key={inv.token}
                      className="flex items-center justify-between text-sm border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {inv.email}
                        <span className="ml-2 text-xs text-gray-400">
                          expires {new Date(inv.expires).toLocaleDateString()}
                        </span>
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(inv.token)}
                          title="Copy invite link"
                        >
                          {copiedToken === inv.token ? (
                            <FiCheck className="h-4 w-4 text-green-500" />
                          ) : (
                            <FiCopy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(inv.email)}
                          className="text-red-500 hover:text-red-700"
                          title="Revoke invitation"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
