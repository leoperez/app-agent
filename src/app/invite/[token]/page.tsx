'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface InviteDetails {
  email: string;
  teamName: string;
  expires: string;
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/${params.token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInvite(data);
      })
      .catch(() => setError('Failed to load invitation'));
  }, [params.token]);

  const handleAccept = async () => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/invite/${params.token}`);
      return;
    }
    setAccepting(true);
    const res = await fetch(`/api/invitations/${params.token}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      router.push('/dashboard');
    } else {
      setError(data.error || 'Failed to accept invitation');
      setAccepting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500 text-lg">{error}</p>
          <Button onClick={() => router.push('/')}>Go home</Button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading invitation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <h1 className="text-2xl font-bold">You&apos;re invited</h1>
        <p className="text-gray-600 dark:text-gray-400">
          You have been invited to join <strong>{invite.teamName}</strong>.
        </p>
        <p className="text-sm text-gray-500">
          This invitation was sent to <strong>{invite.email}</strong> and
          expires on {new Date(invite.expires).toLocaleDateString()}.
        </p>
        <Button onClick={handleAccept} disabled={accepting} className="w-full">
          {accepting
            ? 'Joining...'
            : status === 'unauthenticated'
              ? 'Sign in to accept'
              : 'Accept invitation'}
        </Button>
      </div>
    </div>
  );
}
