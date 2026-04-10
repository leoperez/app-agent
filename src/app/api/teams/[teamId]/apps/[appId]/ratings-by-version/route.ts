import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Store } from '@/types/aso';

export interface RatingByVersion {
  version: string;
  state: string | null;
  releasedAt: string; // ISO date string
  rating: number | null;
  ratingCount: number | null;
  /** 5-element array: [1-star, 2-star, 3-star, 4-star, 5-star] counts */
  histogram: number[] | null;
}

// GET /api/teams/[teamId]/apps/[appId]/ratings-by-version
// Returns rating data per app version, most recent first
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, store: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const versions = await prisma.appVersion.findMany({
      where: { appId },
      select: {
        id: true,
        version: true,
        state: true,
        score: true,
        ratings: true,
        histogram: true,
        update: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (app.store === Store.GOOGLEPLAY) {
      const result: RatingByVersion[] = versions
        .filter((v) => v.score != null || v.ratings != null)
        .map((v) => {
          let hist: number[] | null = null;
          if (v.histogram && typeof v.histogram === 'object') {
            // Google Play histogram is { '1': n, '2': n, '3': n, '4': n, '5': n }
            const h = v.histogram as Record<string, number>;
            hist = [
              h['1'] ?? 0,
              h['2'] ?? 0,
              h['3'] ?? 0,
              h['4'] ?? 0,
              h['5'] ?? 0,
            ];
          }
          return {
            version: v.version,
            state: v.state,
            releasedAt: (v.update ?? v.updatedAt).toISOString(),
            rating: v.score ?? null,
            ratingCount: v.ratings ?? null,
            histogram: hist,
          };
        });

      return NextResponse.json(result);
    }

    // App Store: correlate rating snapshots with version release dates
    // Get all rating snapshots
    const snapshots = await prisma.appRatingSnapshot.findMany({
      where: { appId },
      orderBy: { recordedAt: 'asc' },
      select: { rating: true, ratingCount: true, recordedAt: true },
    });

    if (snapshots.length === 0) {
      return NextResponse.json([]);
    }

    const result: RatingByVersion[] = versions
      .filter((v) => v.state)
      .map((v) => {
        const versionDate = v.updatedAt;
        // Find the snapshot recorded closest to (but not before) this version's date
        // We look for the first snapshot on or after the version date
        const afterSnap = snapshots.find((s) => s.recordedAt >= versionDate);
        // Fallback to the last snapshot if no future snapshot exists
        const snap = afterSnap ?? snapshots[snapshots.length - 1];

        return {
          version: v.version,
          state: v.state,
          releasedAt: versionDate.toISOString(),
          rating: snap?.rating ?? null,
          ratingCount: snap?.ratingCount ?? null,
          histogram: null,
        };
      });

    return NextResponse.json(result);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
