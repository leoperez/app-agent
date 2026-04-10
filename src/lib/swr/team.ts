'use client';

import { useSession } from 'next-auth/react';
import useSWR from 'swr';

import { Team, TeamDetail } from '@/types/user';
import { fetcher } from '@/lib/utils/fetcher';
import { useTeam } from '@/context/team';
import type { AppOverviewEntry } from '@/app/api/teams/[teamId]/overview/route';
import type { RankingsCompareEntry } from '@/app/api/teams/[teamId]/apps/rankings-compare/route';

export function useGetTeam() {
  const teamInfo = useTeam();

  const {
    data: team,
    error,
    isLoading,
  } = useSWR<TeamDetail>(
    teamInfo?.currentTeam && `/api/teams/${teamInfo.currentTeam.id}`,
    fetcher,
    {
      dedupingInterval: 20000,
    }
  );

  return {
    team,
    loading: isLoading,
    error,
  };
}

export interface NotificationEntry {
  id: string;
  appId: string | null;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function useGetTeamOverview() {
  const teamInfo = useTeam();
  const { data, error, isLoading, mutate } = useSWR<AppOverviewEntry[]>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/overview`
      : null,
    fetcher,
    { dedupingInterval: 60000 }
  );
  return { overview: data ?? [], loading: isLoading, error, mutate };
}

export function useGetNotifications() {
  const teamInfo = useTeam();
  const { data, error, isLoading, mutate } = useSWR<{
    notifications: NotificationEntry[];
    unreadCount: number;
  }>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/notifications`
      : null,
    fetcher,
    { refreshInterval: 60000, dedupingInterval: 30000 }
  );

  const markAllRead = async () => {
    if (!teamInfo?.currentTeam?.id) return;
    await fetch(`/api/teams/${teamInfo.currentTeam.id}/notifications`, {
      method: 'PATCH',
    });
    await mutate();
  };

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    loading: isLoading,
    error,
    markAllRead,
    mutate,
  };
}

export function useGetRankingsCompare(locale?: string) {
  const teamInfo = useTeam();
  const { data, error, isLoading } = useSWR<RankingsCompareEntry[]>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/rankings-compare${locale ? `?locale=${locale}` : ''}`
      : null,
    fetcher,
    { dedupingInterval: 120000 }
  );
  return { compare: data ?? [], loading: isLoading, error };
}

export function useTeams() {
  const { data: session } = useSession();

  const {
    data: teams,
    isValidating,
    error,
    isLoading,
  } = useSWR<Team[]>(session && '/api/teams', fetcher, {
    dedupingInterval: 20000,
  });

  return {
    teams,
    loading: isLoading || teams === undefined,
    isValidating,
    error,
  };
}
