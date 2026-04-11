import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { publicVersion } from '@/lib/utils/versions';

export interface TimelineRelease {
  version: string;
  releasedAt: string; // ISO date
  ratingAtRelease: number | null;
  ratingBefore: number | null; // 7 days before release
}

export interface TimelineRatingPoint {
  date: string;
  rating: number;
}

export interface ReleaseTimelineResponse {
  releases: TimelineRelease[];
  ratings: TimelineRatingPoint[];
}

// GET /api/teams/[teamId]/apps/[appId]/release-timeline?days=180
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(365, parseInt(searchParams.get('days') ?? '180', 10));

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, store: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Rating snapshots for the period
    const snapshots = await prisma.appRatingSnapshot.findMany({
      where: { appId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { rating: true, recordedAt: true },
    });

    const ratingPoints: TimelineRatingPoint[] = snapshots.map((s) => ({
      date: s.recordedAt.toISOString().split('T')[0],
      rating: s.rating,
    }));

    // Published versions
    const versions = await prisma.appVersion.findMany({
      where: { appId },
      select: {
        version: true,
        state: true,
        update: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const publishedVersions = versions.filter((v) =>
      publicVersion(v.state ?? '')
    );

    const releases: TimelineRelease[] = publishedVersions
      .map((v) => {
        const releaseDate = (v.update ?? v.updatedAt)
          .toISOString()
          .split('T')[0];

        // Rating on the day of release (first snapshot on or after release date)
        const atRelease =
          snapshots.find((s) => s.recordedAt >= (v.update ?? v.updatedAt))
            ?.rating ?? null;

        // Rating 7 days before release
        const sevenDaysBefore = new Date(v.update ?? v.updatedAt);
        sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
        const before =
          [...snapshots].reverse().find((s) => s.recordedAt <= sevenDaysBefore)
            ?.rating ?? null;

        return {
          version: v.version,
          releasedAt: releaseDate,
          ratingAtRelease: atRelease,
          ratingBefore: before,
        };
      })
      .filter((r) => r.releasedAt >= since.toISOString().split('T')[0]);

    return NextResponse.json({ releases, ratings: ratingPoints });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
