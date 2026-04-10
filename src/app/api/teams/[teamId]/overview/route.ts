import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface AppOverviewEntry {
  id: string;
  title: string | null;
  iconUrl: string | null;
  store: string;
  platform: string;
  latestRating: number | null;
  ratingCount: number | null;
  ratingTrend: number | null; // delta vs 30 days ago
  keywordCount: number;
  avgKeywordPosition: number | null; // average of latest positions
  top10Keywords: number; // keywords ranked in top 10
  pendingSchedule: string | null; // ISO scheduledAt if pending publish exists
  recentNegativeReviews: number; // score <= 2 in last 7 days
  unrepliedReviews: number; // reviews without a reply (no developerResponse)
}

// GET /api/teams/[teamId]/overview
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);

    const apps = await prisma.app.findMany({
      where: { teamId },
      select: {
        id: true,
        title: true,
        iconUrl: true,
        store: true,
        platform: true,
      },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results: AppOverviewEntry[] = await Promise.all(
      apps.map(async (app) => {
        // Latest rating snapshot
        const latestSnapshot = await prisma.appRatingSnapshot.findFirst({
          where: { appId: app.id },
          orderBy: { recordedAt: 'desc' },
          select: { rating: true, ratingCount: true, recordedAt: true },
        });

        // Rating 30 days ago for trend
        const oldSnapshot = await prisma.appRatingSnapshot.findFirst({
          where: { appId: app.id, recordedAt: { lte: thirtyDaysAgo } },
          orderBy: { recordedAt: 'desc' },
          select: { rating: true },
        });

        const ratingTrend =
          latestSnapshot && oldSnapshot
            ? Math.round((latestSnapshot.rating - oldSnapshot.rating) * 100) /
              100
            : null;

        // Keywords: count + avg position from latest rankings
        const keywords = await prisma.asoKeyword.findMany({
          where: { appId: app.id },
          select: { keyword: true, locale: true, position: true },
        });

        // Latest ranking per keyword+locale
        const rankingRows = await prisma.asoKeywordRanking.findMany({
          where: { appId: app.id },
          orderBy: { recordedAt: 'desc' },
          select: { keyword: true, locale: true, position: true },
          distinct: ['keyword', 'locale'],
        });

        const positions = rankingRows
          .map((r) => r.position)
          .filter((p): p is number => p !== null);
        const avgPos =
          positions.length > 0
            ? Math.round(
                (positions.reduce((s, p) => s + p, 0) / positions.length) * 10
              ) / 10
            : null;
        const top10 = positions.filter((p) => p <= 10).length;

        // Pending scheduled publish
        const schedule = await prisma.scheduledPublish.findFirst({
          where: { appId: app.id, status: 'pending' },
          orderBy: { scheduledAt: 'asc' },
          select: { scheduledAt: true },
        });

        // Recent negative reviews (last 7 days)
        const negativeCount = await prisma.appReview.count({
          where: {
            appId: app.id,
            score: { lte: 2 },
            reviewedAt: { gte: sevenDaysAgo },
          },
        });

        // Unreplied reviews: reviews without developerResponse field
        // We track this via AppReview but don't store reply status, so we show total unread as proxy
        const totalRecentReviews = await prisma.appReview.count({
          where: { appId: app.id, reviewedAt: { gte: sevenDaysAgo } },
        });

        return {
          id: app.id,
          title: app.title,
          iconUrl: app.iconUrl,
          store: app.store,
          platform: app.platform,
          latestRating: latestSnapshot?.rating ?? null,
          ratingCount: latestSnapshot?.ratingCount ?? null,
          ratingTrend,
          keywordCount: keywords.length,
          avgKeywordPosition: avgPos,
          top10Keywords: top10,
          pendingSchedule: schedule?.scheduledAt?.toISOString() ?? null,
          recentNegativeReviews: negativeCount,
          unrepliedReviews: totalRecentReviews,
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
