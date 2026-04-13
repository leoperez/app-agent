'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/utils/fetcher';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';
import type { ScreenshotSetRecord } from '@/types/screenshots';

export function useGetScreenshotSets(locale?: string) {
  const teamInfo = useTeam();
  const { currentApp } = useApp();
  const teamId = teamInfo?.currentTeam?.id;
  const appId = currentApp?.id;

  const key =
    teamId && appId
      ? `/api/teams/${teamId}/apps/${appId}/screenshot-sets${locale ? `?locale=${locale}` : ''}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ScreenshotSetRecord[]>(
    key,
    fetcher,
    { dedupingInterval: 30000 }
  );

  const createSet = async (payload: {
    locale?: string;
    name?: string;
    layoutId?: string;
    themeId?: string;
  }) => {
    if (!teamId || !appId) return null;
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const created = await res.json();
    await mutate();
    return created as ScreenshotSetRecord;
  };

  const updateSet = async (
    setId: string,
    payload: Partial<ScreenshotSetRecord>
  ) => {
    if (!teamId || !appId) return;
    await fetch(`/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await mutate();
  };

  const deleteSet = async (setId: string) => {
    if (!teamId || !appId) return;
    await fetch(`/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}`, {
      method: 'DELETE',
    });
    await mutate();
  };

  const generateTexts = async (opts: {
    locale: string;
    count?: number;
    description?: string;
    keywords?: string;
  }): Promise<{ headline: string; subtitle: string; badge?: string }[]> => {
    if (!teamId || !appId) return [];
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/generate-texts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }
    );
    return res.json();
  };

  return {
    sets: data ?? [],
    loading: isLoading,
    error,
    mutate,
    createSet,
    updateSet,
    deleteSet,
    generateTexts,
  };
}
