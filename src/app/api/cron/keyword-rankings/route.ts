import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scoreKeyword } from '@/lib/aso/score';
import { googlePlayToAppStore } from '@/lib/utils/locale';
import { Platform, Store } from '@/types/aso';
import { validateCronSecret } from '@/lib/utils/cron-auth';

export const maxDuration = 300;

// Daily cron: snapshot keyword positions for all tracked keywords
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;

  try {
    // Fetch all keywords grouped by app
    const keywords = await prisma.asoKeyword.findMany({
      select: {
        appId: true,
        store: true,
        platform: true,
        locale: true,
        keyword: true,
        app: {
          select: { storeAppId: true },
        },
      },
    });

    if (keywords.length === 0) {
      return NextResponse.json({
        message: 'No keywords to track',
        snapshots: 0,
      });
    }

    const snapshots: {
      appId: string;
      store: Store;
      platform: Platform;
      locale: string;
      keyword: string;
      position: number | null;
    }[] = [];
    const errors: string[] = [];

    // Process in batches of 5 to avoid overwhelming the App Store search API
    const batchSize = 5;
    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (kw) => {
          try {
            const appStoreLocale = googlePlayToAppStore(kw.locale);
            const score = await scoreKeyword(
              appStoreLocale,
              kw.keyword,
              kw.app.storeAppId
            );
            const position = score.position === -1 ? null : score.position;

            snapshots.push({
              appId: kw.appId,
              store: kw.store,
              platform: kw.platform,
              locale: kw.locale,
              keyword: kw.keyword,
              position,
            });

            // Also update the current position on the AsoKeyword record
            await prisma.asoKeyword.updateMany({
              where: {
                appId: kw.appId,
                store: kw.store,
                platform: kw.platform,
                locale: kw.locale,
                keyword: kw.keyword,
              },
              data: {
                position,
                lastCheckedAt: new Date(),
              },
            });
          } catch (err) {
            errors.push(`${kw.appId}/${kw.keyword}: ${(err as Error).message}`);
          }
        })
      );
    }

    // Bulk insert all snapshots
    if (snapshots.length > 0) {
      await prisma.asoKeywordRanking.createMany({ data: snapshots });
    }

    // Clean up snapshots older than 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await prisma.asoKeywordRanking.deleteMany({
      where: { recordedAt: { lt: cutoff } },
    });

    console.log(
      JSON.stringify({
        event: 'keyword_ranking_snapshot',
        snapshots: snapshots.length,
        errors: errors.length,
      })
    );

    return NextResponse.json({ snapshots: snapshots.length, errors });
  } catch (error) {
    console.error('keyword-rankings cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
