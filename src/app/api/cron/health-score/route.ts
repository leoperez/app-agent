import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCronSecret } from '@/lib/utils/cron-auth';
import { logCron } from '@/lib/utils/log-cron';

export const maxDuration = 120;

// Daily cron: snapshot ASO health score for all apps
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const apps = await prisma.app.findMany({ select: { id: true } });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let recorded = 0;

    for (const app of apps) {
      try {
        const [latestSnapshot, keywords, rankingRows, negativeCount] =
          await Promise.all([
            prisma.appRatingSnapshot.findFirst({
              where: { appId: app.id },
              orderBy: { recordedAt: 'desc' },
              select: { rating: true },
            }),
            prisma.asoKeyword.findMany({
              where: { appId: app.id },
              select: { position: true },
            }),
            prisma.asoKeywordRanking.findMany({
              where: { appId: app.id },
              orderBy: { recordedAt: 'desc' },
              select: { keyword: true, locale: true, position: true },
              distinct: ['keyword', 'locale'],
            }),
            prisma.appReview.count({
              where: {
                appId: app.id,
                score: { lte: 2 },
                reviewedAt: { gte: sevenDaysAgo },
              },
            }),
          ]);

        const top10 = rankingRows.filter(
          (r) => r.position != null && r.position <= 10
        ).length;

        const ratingComponent = latestSnapshot
          ? (latestSnapshot.rating / 5) * 25
          : 0;
        const keywordComponent = Math.min(keywords.length / 20, 1) * 25;
        const top10Component = Math.min(top10 / 5, 1) * 25;
        const reviewComponent = Math.max(0, 1 - negativeCount / 10) * 25;
        const score = Math.round(
          ratingComponent + keywordComponent + top10Component + reviewComponent
        );

        await prisma.asoHealthSnapshot.upsert({
          where: {
            appId_recordedAt: {
              appId: app.id,
              recordedAt: new Date(now.toISOString().split('T')[0]),
            },
          },
          update: { score },
          create: {
            appId: app.id,
            score,
            recordedAt: new Date(now.toISOString().split('T')[0]),
          },
        });
        recorded++;
      } catch (err) {
        console.error(`health-score: failed for ${app.id}:`, err);
      }
    }

    // Clean up snapshots older than 180 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    await prisma.asoHealthSnapshot.deleteMany({
      where: { recordedAt: { lt: cutoff } },
    });

    await logCron({
      cronName: 'health-score',
      startTime,
      recordsProcessed: recorded,
    });
    return NextResponse.json({ recorded });
  } catch (error) {
    await logCron({ cronName: 'health-score', startTime, error });
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
