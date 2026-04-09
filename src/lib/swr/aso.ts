'use client';

import { useTeam } from '@/context/team';
import { LocaleCode } from '@/lib/utils/locale';
import {
  AsoTarget,
  AsoKeyword,
  Platform,
  Store,
  AsoContent,
  Competitor,
} from '@/types/aso';
import type { KeywordOpportunity } from '@/app/api/teams/[teamId]/apps/[appId]/keywords/opportunities/route';
import type { WhatsNewHistoryEntry } from '@/app/api/teams/[teamId]/apps/[appId]/localizations/[locale]/whats-new-history/route';
import type { MetadataVariantResponse } from '@/app/api/teams/[teamId]/apps/[appId]/localizations/[locale]/variants/route';
import { fetcher } from '../utils/fetcher';
import { useState } from 'react';
import useSWR from 'swr';
import { AppStoreApp } from '@/types/app-store';

export function useGetAsoKeywords(appId: string, locale: LocaleCode) {
  const teamInfo = useTeam();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    data: keywords,
    error,
    mutate,
    isLoading,
  } = useSWR<AsoKeyword[]>(
    teamInfo?.currentTeam?.id && appId && locale
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/${appId}/localizations/${locale}/keyword`
      : null,
    fetcher
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  return {
    keywords,
    loading: isLoading,
    error,
    isRefreshing,
    refresh,
  };
}

export function useGetCompetitorChanges(appId: string, locale: LocaleCode) {
  const teamInfo = useTeam();
  const { data, error, isLoading } = useSWR<
    {
      id: string;
      competitorId: string;
      field: string;
      previousValue: string | null;
      newValue: string | null;
      detectedAt: string;
      competitor: {
        id: string;
        title: string;
        competitorId: string;
        iconUrl: string | null;
      };
    }[]
  >(
    teamInfo?.currentTeam?.id && appId && locale
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/${appId}/localizations/${locale}/competitors/changes`
      : null,
    fetcher
  );

  // Map: competitorId -> hasRecentChange
  const changedCompetitorIds = new Set(
    (data ?? []).map((c) => c.competitor.competitorId)
  );

  return {
    changes: data ?? [],
    changedCompetitorIds,
    loading: isLoading,
    error,
  };
}

export function useGetKeywordRankings(appId: string, locale: LocaleCode) {
  const teamInfo = useTeam();
  const { data, error, isLoading } = useSWR<
    Record<string, { date: string; position: number | null }[]>
  >(
    teamInfo?.currentTeam?.id && appId && locale
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/${appId}/localizations/${locale}/keyword/rankings`
      : null,
    fetcher
  );

  return { rankings: data, loading: isLoading, error };
}

export function useGetCompetitors(appId: string, locale: LocaleCode) {
  const teamInfo = useTeam();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: competitors,
    error,
    mutate,
    isLoading,
  } = useSWR<Competitor[]>(
    teamInfo?.currentTeam?.id && appId && locale
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/${appId}/localizations/${locale}/competitors`
      : null,
    fetcher
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  return {
    competitors,
    loading: isLoading,
    error,
    isRefreshing,
    refresh,
  };
}

export function useGetKeywordOpportunities(appId: string, locale: LocaleCode) {
  const teamInfo = useTeam();
  const { data, error, isLoading, mutate } = useSWR<KeywordOpportunity[]>(
    teamInfo?.currentTeam?.id && appId && locale
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/${appId}/keywords/opportunities?locale=${locale}`
      : null,
    fetcher
  );

  return { opportunities: data ?? [], loading: isLoading, error, mutate };
}

export function useGetWhatsNewHistory(
  appId: string,
  locale: string,
  enabled = true
) {
  const teamInfo = useTeam();
  const { data, error, isLoading } = useSWR<WhatsNewHistoryEntry[]>(
    enabled && teamInfo?.currentTeam?.id && appId && locale
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/${appId}/localizations/${locale}/whats-new-history`
      : null,
    fetcher
  );

  return { history: data ?? [], loading: isLoading, error };
}

export function useGetMetadataVariants(
  appId: string,
  locale: string,
  enabled = true
) {
  const teamInfo = useTeam();
  const { data, error, isLoading, mutate } = useSWR<MetadataVariantResponse[]>(
    enabled && teamInfo?.currentTeam?.id && appId && locale
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/${appId}/localizations/${locale}/variants`
      : null,
    fetcher
  );

  const saveVariant = async (payload: {
    name: string;
    title?: string | null;
    subtitle?: string | null;
    keywords?: string | null;
    description?: string | null;
  }) => {
    const res = await fetch(
      `/api/teams/${teamInfo!.currentTeam!.id}/apps/${appId}/localizations/${locale}/variants`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error('Failed to save variant');
    await mutate();
  };

  const deleteVariant = async (variantId: string) => {
    await fetch(
      `/api/teams/${teamInfo!.currentTeam!.id}/apps/${appId}/localizations/${locale}/variants/${variantId}`,
      { method: 'DELETE' }
    );
    await mutate();
  };

  const markVariantActive = async (variantId: string) => {
    await fetch(
      `/api/teams/${teamInfo!.currentTeam!.id}/apps/${appId}/localizations/${locale}/variants/${variantId}`,
      { method: 'PATCH' }
    );
    await mutate();
  };

  return {
    variants: data ?? [],
    loading: isLoading,
    error,
    saveVariant,
    deleteVariant,
    markVariantActive,
  };
}

export async function researchCompetitors(
  teamId: string,
  appId: string,
  locale: LocaleCode,
  shortDescription: string,
  store: Store = 'APPSTORE',
  platform: Platform = 'IOS',
  onData: (data: any) => void
) {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/competitors/research`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortDescription, store, platform }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let receivedText = '';

  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      receivedText += chunk;

      const lines = receivedText.split('\n');
      // Keep the last partial line
      receivedText = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const data = JSON.parse(line);
          onData(data);
        } catch (err) {
          console.error('Failed to parse JSON:', line, err);
        }
      }
    }
    // Handle any remaining text
    if (receivedText.trim() !== '') {
      try {
        const data = JSON.parse(receivedText);
        onData(data);
      } catch (err) {
        console.error('Failed to parse JSON:', receivedText, err);
      }
    }
  } else {
    const text = await response.text();
    console.error('No readable stream in response body', text);
    throw new Error('No readable stream in response body');
  }
}

export async function searchCompetitors(
  teamId: string,
  appId: string,
  locale: LocaleCode,
  term: string,
  store: Store,
  platform: Platform
): Promise<Partial<AppStoreApp>[]> {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/competitors/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term, store, platform }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export async function deleteCompetitor(
  teamId: string,
  appId: string,
  locale: LocaleCode,
  competitorId: string
) {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/competitors/${competitorId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export async function addCompetitor(
  teamId: string,
  appId: string,
  locale: LocaleCode,
  competitor: Partial<AppStoreApp>
): Promise<Competitor> {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/competitors`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitor }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export async function selectAndScoreKeywords(
  teamId: string,
  appId: string,
  locale: LocaleCode,
  shortDescription: string,
  store: Store,
  platform: Platform,
  onData: (data: any) => void
) {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/keyword/hunt`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortDescription, store, platform }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let receivedText = '';

  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      receivedText += chunk;

      const lines = receivedText.split('\n');
      // Keep the last partial line
      receivedText = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const data = JSON.parse(line);
          onData(data);
        } catch (err) {
          console.error('Failed to parse JSON:', line, err);
        }
      }
    }
    // Handle any remaining text
    if (receivedText.trim() !== '') {
      try {
        const data = JSON.parse(receivedText);
        onData(data);
      } catch (err) {
        console.error('Failed to parse JSON:', receivedText, err);
      }
    }
  } else {
    const text = await response.text();
    console.error('No readable stream in response body', text);
    throw new Error('No readable stream in response body');
  }
}

export async function deleteKeyword(
  teamId: string,
  appId: string,
  locale: LocaleCode,
  keywordId: string
) {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/keyword/${keywordId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
}

export async function addKeyword(
  teamId: string,
  appId: string,
  locale: LocaleCode,
  term: string
) {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/keyword`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  const data = await response.json();
  return data as AsoKeyword;
}

export async function optimizeContents(
  teamId: string,
  appId: string,
  locale: LocaleCode,
  title: string,
  asoKeywords: AsoKeyword[],
  targets: AsoTarget[],
  subtitle?: string,
  keywords?: string,
  description?: string,
  descriptionOutline?: string,
  previousResult?: {
    title?: string;
    subtitle?: string;
    description?: string;
    keywords?: string;
    shortDescription?: string;
    fullDescription?: string;
  },
  userFeedback?: string,
  shortDescription?: string,
  fullDescription?: string
) {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/optimization`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        asoKeywords,
        targets,
        subtitle,
        keywords,
        description,
        descriptionOutline,
        previousResult,
        userFeedback,
        shortDescription,
        fullDescription,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  const data = (await response.json()) as AsoContent;
  return data;
}
