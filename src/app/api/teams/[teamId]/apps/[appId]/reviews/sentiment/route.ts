import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface SentimentByVersion {
  version: string;
  positive: number; // score 4-5
  neutral: number; // score 3
  negative: number; // score 1-2
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

export interface SentimentResponse {
  byVersion: SentimentByVersion[];
  recentNegative: RecentReview[];
  totals: { positive: number; neutral: number; negative: number };
}

// GET /api/teams/[teamId]/apps/[appId]/reviews/sentiment?days=90
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const url = new URL(request.url);
    const days = Math.min(
      parseInt(url.searchParams.get('days') ?? '90', 10),
      365
    );

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const reviews = await prisma.appReview.findMany({
      where: { appId, reviewedAt: { gte: since } },
      select: {
        id: true,
        score: true,
        title: true,
        body: true,
        version: true,
        reviewedAt: true,
      },
      orderBy: { reviewedAt: 'desc' },
    });

    // Group by version
    const versionMap: Record<string, { scores: number[] }> = {};
    for (const r of reviews) {
      const v = r.version ?? 'Unknown';
      if (!versionMap[v]) versionMap[v] = { scores: [] };
      versionMap[v].scores.push(r.score);
    }

    const byVersion: SentimentByVersion[] = Object.entries(versionMap)
      .map(([version, { scores }]) => ({
        version,
        positive: scores.filter((s) => s >= 4).length,
        neutral: scores.filter((s) => s === 3).length,
        negative: scores.filter((s) => s <= 2).length,
        total: scores.length,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    type ReviewRow = (typeof reviews)[number];

    const recentNegative: RecentReview[] = reviews
      .filter((r: ReviewRow) => r.score <= 2)
      .slice(0, 10)
      .map((r: ReviewRow) => ({
        id: r.id,
        score: r.score,
        title: r.title,
        body: r.body,
        version: r.version,
        reviewedAt: r.reviewedAt.toISOString(),
      }));

    const totals = {
      positive: reviews.filter((r: ReviewRow) => r.score >= 4).length,
      neutral: reviews.filter((r: ReviewRow) => r.score === 3).length,
      negative: reviews.filter((r: ReviewRow) => r.score <= 2).length,
    };

    return NextResponse.json({
      byVersion,
      recentNegative,
      totals,
    } satisfies SentimentResponse);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
