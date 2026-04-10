import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scoreKeyword } from '@/lib/aso/score';
import { scoreKeywordGPlay } from '@/lib/google-play/score-keyword';
import { googlePlayToAppStore } from '@/lib/utils/locale';
import { Store } from '@/types/aso';
import { validateCronSecret } from '@/lib/utils/cron-auth';
import { redis } from '@/lib/redis';
import { logCron } from '@/lib/utils/log-cron';

export const maxDuration = 300;

// Weekly cron: refresh traffic, difficulty and overall scores for all keywords.
// The daily keyword-rankings cron only snapshots position; this one updates
// the full AsoKeyword row so chip colours and tooltips stay accurate.
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    // Idempotency: lock per ISO-week so it only runs once per week
    const now = new Date();
    const week = `${now.getUTCFullYear()}-W${String(Math.ceil((now.getUTCDate() + 6 - now.getUTCDay()) / 7)).padStart(2, '0')}`;
    const lockKey = `cron:keyword-rescore:${week}`;
    const locked = await redis.set(lockKey, '1', {
      ex: 6 * 24 * 60 * 60, // 6 days
      nx: true,
    });
    if (!locked) {
      return NextResponse.json({
        message: 'Already ran this week',
        updated: 0,
      });
    }

    const keywords = await prisma.asoKeyword.findMany({
      select: {
        appId: true,
        store: true,
        platform: true,
        locale: true,
        keyword: true,
        app: { select: { storeAppId: true } },
      },
    });

    if (keywords.length === 0) {
      return NextResponse.json({
        message: 'No keywords to rescore',
        updated: 0,
      });
    }

    let updated = 0;
    const errors: string[] = [];

    // Batches of 5 to avoid rate-limiting on the search API
    const batchSize = 5;
    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (kw) => {
          try {
            const score =
              kw.store === Store.GOOGLEPLAY
                ? await scoreKeywordGPlay(
                    kw.locale,
                    kw.keyword,
                    kw.app.storeAppId
                  )
                : await scoreKeyword(
                    googlePlayToAppStore(kw.locale),
                    kw.keyword,
                    kw.app.storeAppId
                  );

            await prisma.asoKeyword.updateMany({
              where: {
                appId: kw.appId,
                store: kw.store,
                platform: kw.platform,
                locale: kw.locale,
                keyword: kw.keyword,
              },
              data: {
                trafficScore: score.trafficScore,
                difficultyScore: score.difficultyScore,
                overall: score.overall,
                position: score.position === -1 ? null : score.position,
                lastCheckedAt: new Date(),
              },
            });

            updated++;
          } catch (err) {
            errors.push(`${kw.appId}/${kw.keyword}: ${(err as Error).message}`);
          }
        })
      );
    }

    console.log(
      JSON.stringify({
        event: 'keyword_rescore',
        updated,
        errors: errors.length,
      })
    );

    await logCron({
      cronName: 'keyword-rescore',
      startTime,
      recordsProcessed: updated,
    });
    return NextResponse.json({ updated, errors });
  } catch (error) {
    await logCron({ cronName: 'keyword-rescore', startTime, error });
    console.error('keyword-rescore cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
