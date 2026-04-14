'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/utils/fetcher';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';
import type {
  ScreenshotSetRecord,
  ScreenshotSetSnapshotRecord,
  ScreenshotSetAbTestRecord,
  ScreenshotTemplateRecord,
  AsoScoreResult,
} from '@/types/screenshots';

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

  const translateSlides = async (opts: {
    slides: Array<{ headline: string; subtitle: string; badge?: string }>;
    targetLocales: string[];
    sourceLocale?: string;
  }): Promise<
    Array<{
      locale: string;
      slides: Array<{ headline: string; subtitle: string; badge?: string }>;
    }>
  > => {
    if (!teamId || !appId) return [];
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/translate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }
    );
    if (!res.ok) return [];
    return res.json();
  };

  const scoreSlides = async (opts: {
    slides: Array<{ headline: string; subtitle: string; badge?: string }>;
    locale?: string;
  }): Promise<AsoScoreResult | null> => {
    if (!teamId || !appId) return null;
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/score`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }
    );
    if (!res.ok) return null;
    return res.json();
  };

  const listSnapshots = async (
    setId: string
  ): Promise<ScreenshotSetSnapshotRecord[]> => {
    if (!teamId || !appId) return [];
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}/snapshots`
    );
    if (!res.ok) return [];
    return res.json();
  };

  const saveSnapshot = async (
    setId: string,
    label?: string
  ): Promise<boolean> => {
    if (!teamId || !appId) return false;
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}/snapshots`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label ?? '' }),
      }
    );
    return res.ok;
  };

  const restoreSnapshot = async (
    setId: string,
    snapshotId: string
  ): Promise<ScreenshotSetRecord | null> => {
    if (!teamId || !appId) return null;
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}/snapshots/${snapshotId}`,
      { method: 'POST' }
    );
    if (!res.ok) return null;
    const updated = await res.json();
    await mutate();
    return updated as ScreenshotSetRecord;
  };

  const deleteSnapshot = async (
    setId: string,
    snapshotId: string
  ): Promise<void> => {
    if (!teamId || !appId) return;
    await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}/snapshots/${snapshotId}`,
      { method: 'DELETE' }
    );
  };

  const listAbTests = async (): Promise<ScreenshotSetAbTestRecord[]> => {
    if (!teamId || !appId) return [];
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/ab-tests`
    );
    if (!res.ok) return [];
    return res.json();
  };

  const createAbTest = async (
    setAId: string,
    setBId: string,
    note?: string
  ): Promise<ScreenshotSetAbTestRecord | null> => {
    if (!teamId || !appId) return null;
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/ab-tests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setAId, setBId, note: note ?? '' }),
      }
    );
    if (!res.ok) return null;
    return res.json();
  };

  const deleteAbTest = async (testId: string): Promise<void> => {
    if (!teamId || !appId) return;
    await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/ab-tests/${testId}`,
      { method: 'DELETE' }
    );
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
    translateSlides,
    scoreSlides,
    listSnapshots,
    saveSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    listAbTests,
    createAbTest,
    deleteAbTest,
  };
}

export function useGetScreenshotTemplates() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const key = teamId ? `/api/teams/${teamId}/screenshot-templates` : null;

  const { data, error, isLoading, mutate } = useSWR<ScreenshotTemplateRecord[]>(
    key,
    fetcher,
    { dedupingInterval: 60000 }
  );

  const saveTemplate = async (
    payload: Omit<
      ScreenshotTemplateRecord,
      'id' | 'teamId' | 'createdAt' | 'updatedAt'
    >
  ) => {
    if (!teamId) return null;
    const res = await fetch(`/api/teams/${teamId}/screenshot-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const created = await res.json();
    await mutate();
    return created as ScreenshotTemplateRecord;
  };

  const deleteTemplate = async (templateId: string) => {
    if (!teamId) return;
    await fetch(`/api/teams/${teamId}/screenshot-templates/${templateId}`, {
      method: 'DELETE',
    });
    await mutate();
  };

  return {
    templates: data ?? [],
    loading: isLoading,
    error,
    saveTemplate,
    deleteTemplate,
  };
}
