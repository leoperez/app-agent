import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { Store } from '@/types/aso';

// GET /api/teams/[teamId]/apps/[appId]/aso-health
// Returns a 0-100 ASO health score with breakdown
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, store: true, primaryLocale: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    // --- Keyword score (40 pts) ---
    const keywords = await prisma.asoKeyword.findMany({
      where: { appId },
      select: { position: true },
    });
    let keywordScore = 0;
    if (keywords.length > 0) {
      const ranked = keywords.filter((k) => k.position !== null);
      const top10 = ranked.filter((k) => k.position! <= 10).length;
      const top50 = ranked.filter((k) => k.position! <= 50).length;
      // 40 pts: 20 for top-10 coverage, 20 for top-50 coverage
      keywordScore =
        Math.round((top10 / keywords.length) * 20) +
        Math.round((top50 / keywords.length) * 20);
    }

    // --- Metadata completeness (30 pts) ---
    const isAppStore = app.store !== Store.GOOGLEPLAY;
    const requiredFields = isAppStore
      ? ['title', 'subtitle', 'description', 'keywords']
      : ['title', 'shortDescription', 'fullDescription'];
    const optionalFields = isAppStore
      ? ['promotionalText', 'whatsNew']
      : ['whatsNew'];

    // Get all locales
    const localizations = await prisma.appLocalization.findMany({
      where: { appId },
      select: Object.fromEntries(
        [...requiredFields, ...optionalFields].map((f) => [f, true])
      ) as Record<string, true>,
    });

    let metadataScore = 0;
    if (localizations.length > 0) {
      // Score primary locale required fields (20 pts) + optional (10 pts)
      const primary = localizations[0];
      const requiredFilled = requiredFields.filter(
        (f) => (primary as Record<string, unknown>)[f]
      ).length;
      const optionalFilled = optionalFields.filter(
        (f) => (primary as Record<string, unknown>)[f]
      ).length;
      metadataScore =
        Math.round((requiredFilled / requiredFields.length) * 20) +
        Math.round((optionalFilled / Math.max(optionalFields.length, 1)) * 10);
    }

    // --- Rating score (20 pts) ---
    const ratingRecord = await prisma.appRatingHistory.findFirst({
      where: { appId },
      orderBy: { recordedAt: 'desc' },
      select: { rating: true },
    });
    let ratingScore = 0;
    if (ratingRecord?.rating) {
      // 5.0 → 20pts, 4.0 → 16pts, 3.0 → 12pts, 1.0 → 4pts
      ratingScore = Math.round((ratingRecord.rating / 5) * 20);
    }

    // --- Review response rate (10 pts) ---
    const [totalReviews, repliedReviews] = await Promise.all([
      prisma.appReview.count({ where: { appId } }),
      prisma.appReview.count({ where: { appId, replyBody: { not: null } } }),
    ]);
    let reviewScore = 0;
    if (totalReviews > 0) {
      reviewScore = Math.round((repliedReviews / totalReviews) * 10);
    } else {
      reviewScore = 5; // neutral if no reviews yet
    }

    const total = keywordScore + metadataScore + ratingScore + reviewScore;

    return NextResponse.json({
      score: total,
      breakdown: {
        keywords: { score: keywordScore, max: 40, tracked: keywords.length },
        metadata: {
          score: metadataScore,
          max: 30,
          locales: localizations.length,
        },
        rating: {
          score: ratingScore,
          max: 20,
          value: ratingRecord?.rating ?? null,
        },
        reviews: {
          score: reviewScore,
          max: 10,
          total: totalReviews,
          replied: repliedReviews,
        },
      },
    });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
