import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scoreKeyword } from '@/lib/aso/score';
import { scoreKeywordGPlay } from '@/lib/google-play/score-keyword';
import { googlePlayToAppStore } from '@/lib/utils/locale';
import { Platform, Store } from '@/types/aso';
import { validateCronSecret } from '@/lib/utils/cron-auth';
import { redis } from '@/lib/redis';
import { sendKeywordDropEmail } from '@/lib/emails/send-keyword-drop';
import { KeywordDropEntry } from '@/components/emails/keyword-drop';
import { sendSlackMessage } from '@/lib/slack';

export const maxDuration = 300;

// A keyword drop is significant if it falls ≥5 positions or exits the top 100
const DROP_THRESHOLD = 5;

// Daily cron: snapshot keyword positions for all tracked keywords
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;

  try {
    // Idempotency: use Redis lock with 23h TTL to prevent duplicate runs
    const lockKey = `cron:keyword-rankings:${new Date().toISOString().split('T')[0]}`;
    const locked = await redis.set(lockKey, '1', {
      ex: 23 * 60 * 60,
      nx: true,
    });
    if (!locked) {
      return NextResponse.json({ message: 'Already ran today', snapshots: 0 });
    }

    // Fetch all keywords with current position and team members
    const keywords = await prisma.asoKeyword.findMany({
      select: {
        appId: true,
        store: true,
        platform: true,
        locale: true,
        keyword: true,
        position: true, // previous position — used for drop detection
        app: {
          select: {
            storeAppId: true,
            title: true,
            team: {
              select: {
                users: {
                  include: {
                    user: {
                      select: {
                        email: true,
                        locale: true,
                        notifyCompetitorChanges: true,
                        slackWebhookUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
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

    // Drops grouped by teamId → appId → drops
    const dropsByTeam: Record<
      string,
      {
        drops: KeywordDropEntry[];
        users: {
          email: string;
          locale: string;
          slackWebhookUrl: string | null;
        }[];
      }
    > = {};

    // Process in batches of 5 to avoid overwhelming the App Store search API
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
            const newPosition = score.position === -1 ? null : score.position;
            const prevPosition = kw.position; // value before today's update

            snapshots.push({
              appId: kw.appId,
              store: kw.store,
              platform: kw.platform,
              locale: kw.locale,
              keyword: kw.keyword,
              position: newPosition,
            });

            // Update the current position on the AsoKeyword record
            await prisma.asoKeyword.updateMany({
              where: {
                appId: kw.appId,
                store: kw.store,
                platform: kw.platform,
                locale: kw.locale,
                keyword: kw.keyword,
              },
              data: {
                position: newPosition,
                lastCheckedAt: new Date(),
              },
            });

            // Detect significant drops
            const isSignificantDrop =
              prevPosition != null && // was ranked before
              (newPosition === null || // dropped out of top 100
                newPosition - prevPosition >= DROP_THRESHOLD); // fell ≥ threshold

            if (isSignificantDrop) {
              const teamId = kw.app.team
                ? Object.keys(kw.app.team)[0] // use appId as team key
                : kw.appId;
              const teamKey = kw.appId; // group by app

              if (!dropsByTeam[teamKey]) {
                dropsByTeam[teamKey] = {
                  drops: [],
                  users: (kw.app.team?.users ?? [])
                    .filter(
                      (u) =>
                        u.user.email && u.user.notifyCompetitorChanges !== false
                    )
                    .map((u) => ({
                      email: u.user.email as string,
                      locale: u.user.locale ?? 'en',
                      slackWebhookUrl: u.user.slackWebhookUrl ?? null,
                    })),
                };
              }

              dropsByTeam[teamKey].drops.push({
                appTitle: kw.app.title ?? kw.app.storeAppId,
                keyword: kw.keyword,
                locale: kw.locale,
                previousPosition: prevPosition,
                newPosition,
              });
            }
          } catch (err) {
            errors.push(`${kw.appId}/${kw.keyword}: ${(err as Error).message}`);
          }
        })
      );
    }

    // Bulk insert all snapshots (skipDuplicates guards against re-runs on the same day)
    if (snapshots.length > 0) {
      await prisma.asoKeywordRanking.createMany({
        data: snapshots,
        skipDuplicates: true,
      });
    }

    // Send drop alert emails + Slack (fire & forget)
    let totalDrops = 0;
    for (const { drops, users } of Object.values(dropsByTeam)) {
      totalDrops += drops.length;
      for (const { email, locale, slackWebhookUrl } of users) {
        sendKeywordDropEmail(email, drops, locale).catch((err) =>
          console.error(
            `keyword-rankings: failed to send drop alert to ${email}:`,
            err
          )
        );

        if (slackWebhookUrl) {
          const lines = drops.map((d) => {
            const prev =
              d.previousPosition != null
                ? `#${d.previousPosition}`
                : 'unranked';
            const next =
              d.newPosition != null ? `#${d.newPosition}` : 'out of top 100';
            return `• *${d.keyword}* (${d.appTitle}): ${prev} → ${next}`;
          });
          const text = `:chart_with_downwards_trend: *${drops.length} keyword drop${drops.length === 1 ? '' : 's'} detected*\n${lines.join('\n')}`;
          sendSlackMessage(slackWebhookUrl, text).catch((err) =>
            console.error(
              `keyword-rankings: failed to send Slack to ${email}:`,
              err
            )
          );
        }
      }
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
        drops: totalDrops,
        errors: errors.length,
      })
    );

    return NextResponse.json({
      snapshots: snapshots.length,
      drops: totalDrops,
      errors,
    });
  } catch (error) {
    console.error('keyword-rankings cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
