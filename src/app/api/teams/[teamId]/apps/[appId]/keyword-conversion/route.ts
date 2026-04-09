import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface KeywordConversionRow {
  date: string;
  keyword: string;
  position: number | null;
  downloads: number | null;
  impressions: number | null;
}

// GET /api/teams/[teamId]/apps/[appId]/keyword-conversion?locale=en-US&keyword=fitness&days=30
// Returns daily position + downloads for a specific keyword, joined by date
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') ?? '';
    const keyword = searchParams.get('keyword') ?? '';
    const days = Math.min(90, parseInt(searchParams.get('days') ?? '30', 10));

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Keyword ranking history
    const rankings = await prisma.asoKeywordRanking.findMany({
      where: { appId, locale, keyword, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { position: true, recordedAt: true },
    });

    // Analytics (downloads + impressions) — App Store only
    const analytics = await prisma.appAnalytics.findMany({
      where: { appId, date: { gte: since } },
      orderBy: { date: 'asc' },
      select: { date: true, downloads: true, impressions: true },
    });

    // Build date-indexed maps
    const rankMap: Record<string, number | null> = {};
    for (const r of rankings) {
      rankMap[r.recordedAt.toISOString().split('T')[0]] = r.position;
    }
    const analyticsMap: Record<
      string,
      { downloads: number | null; impressions: number | null }
    > = {};
    for (const a of analytics) {
      analyticsMap[a.date.toISOString().split('T')[0]] = {
        downloads: a.downloads,
        impressions: a.impressions,
      };
    }

    // Merge: use all dates that appear in either dataset
    const dateSet = new Set([
      ...Object.keys(rankMap),
      ...Object.keys(analyticsMap),
    ]);
    const allDates = Array.from(dateSet).sort();

    const rows: KeywordConversionRow[] = allDates.map((date) => ({
      date,
      keyword,
      position: rankMap[date] ?? null,
      downloads: analyticsMap[date]?.downloads ?? null,
      impressions: analyticsMap[date]?.impressions ?? null,
    }));

    return NextResponse.json(rows);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
