import { useState } from 'react';
import { useTeam } from '@/context/team';
import {
  AppStoreConnectAppData,
  AppStoreConnectAppInfoLocalization,
} from '@/types/app-store';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/fetcher';
import { App, AppLocalization, AppVersion } from '@/types/aso';
import { GooglePlayApp } from '@/types/google-play';

export function useGetAppsFromAppStoreConnect() {
  const teamInfo = useTeam();
  const {
    data: apps,
    error,
    mutate,
    isLoading,
  } = useSWR<AppStoreConnectAppData[]>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/app-store-connect`
      : null,
    fetcher
  );

  const refreshApps = async () => {
    await mutate();
  };

  return {
    apps,
    loading: isLoading,
    error,
    refreshApps,
  };
}

export function useGetAppsFromGooglePlay() {
  const teamInfo = useTeam();
  const {
    data: apps,
    error,
    isLoading,
  } = useSWR<GooglePlayApp[]>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/google-play`
      : null,
    fetcher
  );

  return {
    apps,
    loading: isLoading,
    error,
  };
}

export function useGetApps() {
  const teamInfo = useTeam();

  const {
    data: apps,
    error,
    mutate,
    isLoading,
  } = useSWR<App[]>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/apps`
      : null,
    fetcher
  );

  return {
    apps,
    loading: isLoading,
    error,
    refreshApps: async () => {
      await mutate();
    },
  };
}

export function useGetAppLocalizations(appId: string) {
  const teamInfo = useTeam();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    data: localizations,
    error,
    mutate,
    isLoading,
  } = useSWR<{
    [key: string]: { public?: AppLocalization; draft?: AppLocalization };
  }>(
    teamInfo?.currentTeam?.id && appId
      ? `/api/teams/${teamInfo.currentTeam.id}/apps/${appId}/localizations`
      : null,
    fetcher
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  return {
    localizations,
    loading: isLoading,
    error,
    isRefreshing,
    refresh,
  };
}

export interface AppAnalyticsRow {
  date: string;
  impressions: number;
  pageViews: number;
  downloads: number;
  sessions: number;
  activeDevices: number;
}

export function useGetAppAnalytics(teamId: string, appId: string, days = 30) {
  const { data, error, isLoading } = useSWR<AppAnalyticsRow[]>(
    teamId && appId
      ? `/api/teams/${teamId}/apps/${appId}/analytics?days=${days}`
      : null,
    fetcher
  );
  return { data: data ?? [], loading: isLoading, error };
}

export interface AppRatingRow {
  date: string;
  rating: number;
  ratingCount: number;
}

export function useGetAppRatings(teamId: string, appId: string, days = 30) {
  const { data, error, isLoading } = useSWR<AppRatingRow[]>(
    teamId && appId
      ? `/api/teams/${teamId}/apps/${appId}/ratings?days=${days}`
      : null,
    fetcher
  );
  return { data: data ?? [], loading: isLoading, error };
}

export interface KeywordConversionRow {
  date: string;
  keyword: string;
  position: number | null;
  downloads: number | null;
  impressions: number | null;
}

export function useGetKeywordConversion(
  teamId: string,
  appId: string,
  locale: string,
  keyword: string,
  days = 30
) {
  const { data, error, isLoading } = useSWR<KeywordConversionRow[]>(
    teamId && appId && locale && keyword
      ? `/api/teams/${teamId}/apps/${appId}/keyword-conversion?locale=${locale}&keyword=${encodeURIComponent(keyword)}&days=${days}`
      : null,
    fetcher
  );
  return { data: data ?? [], loading: isLoading, error };
}

export interface SentimentByVersion {
  version: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  avgScore: number;
}

export interface RecentReview {
  id: string;
  score: number;
  title: string | null;
  body: string | null;
  version: string | null;
  reviewedAt: string;
}

export interface SentimentData {
  byVersion: SentimentByVersion[];
  recentNegative: RecentReview[];
  totals: { positive: number; neutral: number; negative: number };
}

export function useGetReviewSentiment(
  teamId: string,
  appId: string,
  days = 90
) {
  const { data, error, isLoading } = useSWR<SentimentData>(
    teamId && appId
      ? `/api/teams/${teamId}/apps/${appId}/reviews/sentiment?days=${days}`
      : null,
    fetcher
  );
  return { data, loading: isLoading, error };
}

export interface ScheduledPublishEntry {
  id: string;
  appId: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

export interface StoreReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  reviewerNickname: string;
  createdDate: string;
  territory: string | null;
  responseId: string | null;
  responseBody: string | null;
}

export function useGetStoreReviews(teamId: string, appId: string) {
  const { data, error, isLoading, mutate } = useSWR<StoreReview[]>(
    teamId && appId ? `/api/teams/${teamId}/apps/${appId}/reviews` : null,
    fetcher
  );
  return { reviews: data ?? [], loading: isLoading, error, mutate };
}

export function useGetScheduledPublish(teamId: string, appId: string) {
  const { data, error, isLoading, mutate } =
    useSWR<ScheduledPublishEntry | null>(
      teamId && appId
        ? `/api/teams/${teamId}/apps/${appId}/schedule-publish`
        : null,
      fetcher
    );
  return { scheduled: data ?? null, loading: isLoading, error, mutate };
}

export interface StoreExperiment {
  id: string;
  appId: string;
  name: string;
  hypothesis: string | null;
  field: string;
  variantA: string | null;
  variantB: string | null;
  status: string;
  winner: string | null;
  notes: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useGetExperiments(teamId: string, appId: string) {
  const { data, error, isLoading, mutate } = useSWR<StoreExperiment[]>(
    teamId && appId ? `/api/teams/${teamId}/apps/${appId}/experiments` : null,
    fetcher
  );
  return { experiments: data ?? [], loading: isLoading, error, mutate };
}

export interface CustomProductPage {
  id: string;
  name: string;
  url: string | null;
  visible: boolean;
  versionId: string | null;
  versionState: string | null;
}

export function useGetCustomProductPages(teamId: string, appId: string) {
  const { data, error, isLoading, mutate } = useSWR<CustomProductPage[]>(
    teamId && appId
      ? `/api/teams/${teamId}/apps/${appId}/custom-product-pages`
      : null,
    fetcher
  );
  return { pages: data ?? [], loading: isLoading, error, mutate };
}

export interface SearchAdsMetricEntry {
  id: string;
  appId: string;
  keyword: string;
  date: string;
  impressions: number;
  taps: number;
  installs: number;
  spend: number;
  currency: string;
  ttr: number | null;
  cr: number | null;
}

export function useGetSearchAdsMetrics(teamId: string, appId: string) {
  const { data, error, isLoading, mutate } = useSWR<SearchAdsMetricEntry[]>(
    teamId && appId ? `/api/teams/${teamId}/apps/${appId}/search-ads` : null,
    fetcher,
    { dedupingInterval: 30000 }
  );

  const addMetric = async (
    entry: Omit<SearchAdsMetricEntry, 'id' | 'appId' | 'ttr' | 'cr'>
  ) => {
    await fetch(`/api/teams/${teamId}/apps/${appId}/search-ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    await mutate();
  };

  const deleteMetric = async (metricId: string) => {
    await fetch(`/api/teams/${teamId}/apps/${appId}/search-ads/${metricId}`, {
      method: 'DELETE',
    });
    await mutate();
  };

  return {
    metrics: data ?? [],
    loading: isLoading,
    error,
    addMetric,
    deleteMetric,
    mutate,
  };
}

export async function checkShortDescription(teamId: string, appId: string) {
  const response = await fetch(
    `/api/teams/${teamId}/apps/${appId}/short-description`,
    {
      method: 'POST',
    }
  );
  return response.json();
}
