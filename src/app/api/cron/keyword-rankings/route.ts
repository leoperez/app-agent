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
import { sendKeywordRiseEmail } from '@/lib/emails/send-keyword-rise';
import { KeywordRiseEntry } from '@/components/emails/keyword-rise';
import { sendSlackMessage } from '@/lib/slack';
import { createNotification } from '@/lib/notifications';
import { logCron } from '@/lib/utils/log-cron';

export const maxDuration = 300;

// A keyword drop is significant if it falls ≥5 positions or exits the top 100
const DROP_THRESHOLD = 5;
// A rise is significant if it improves ≥10 positions OR enters the top 10
const RISE_THRESHOLD = 10;
const TOP10 = 10;

// Daily cron: snapshot keyword positions for all tracked keywords
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;
  const startTime = Date.now();

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
        id: true,
        appId: true,
        store: true,
        platform: true,
        locale: true,
        keyword: true,
        position: true, // previous position — used for drop detection
        positionAlertThreshold: true, // per-keyword custom alert threshold
        app: {
          select: {
            storeAppId: true,
            title: true,
            teamId: true,
            team: {
              select: {
                users: {
                  include: {
                    user: {
                      select: {
                        email: true,
                        locale: true,
                        notifyKeywordDrop: true,
                        notifyKeywordRise: true,
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

    // Drops grouped by appId
    const dropsByTeam: Record<
      string,
      {
        drops: KeywordDropEntry[];
        rises: KeywordRiseEntry[];
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

            // Detect significant drops (global threshold or per-keyword threshold)
            const customThreshold = kw.positionAlertThreshold;
            const crossedCustomThreshold =
              customThreshold != null &&
              prevPosition != null &&
              prevPosition <= customThreshold &&
              (newPosition === null || newPosition > customThreshold);
            const isSignificantDrop =
              crossedCustomThreshold ||
              (prevPosition != null && // was ranked before
                (newPosition === null || // dropped out of top 100
                  newPosition - prevPosition >= DROP_THRESHOLD)); // fell ≥ threshold

            // Detect significant rise: ≥RISE_THRESHOLD improvement OR top-10 entry
            const isSignificantRise =
              newPosition !== null &&
              (prevPosition === null || prevPosition > TOP10) &&
              newPosition <= TOP10; // entered top 10
            const isBigJump =
              newPosition !== null &&
              prevPosition !== null &&
              prevPosition - newPosition >= RISE_THRESHOLD; // jumped ≥10 spots

            const teamKey = kw.appId;
            const buildUsers = () =>
              (kw.app.team?.users ?? [])
                .filter(
                  (u) => u.user.email && u.user.notifyKeywordDrop !== false
                )
                .map((u) => ({
                  email: u.user.email as string,
                  locale: u.user.locale ?? 'en',
                  slackWebhookUrl: u.user.slackWebhookUrl ?? null,
                  notifyKeywordRise: u.user.notifyKeywordRise !== false,
                }));

            if (isSignificantDrop) {
              if (!dropsByTeam[teamKey]) {
                dropsByTeam[teamKey] = {
                  drops: [],
                  rises: [],
                  users: buildUsers(),
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

            if (isSignificantRise || isBigJump) {
              if (!dropsByTeam[teamKey]) {
                dropsByTeam[teamKey] = {
                  drops: [],
                  rises: [],
                  users: buildUsers(),
                };
              }
              dropsByTeam[teamKey].rises.push({
                appTitle: kw.app.title ?? kw.app.storeAppId,
                keyword: kw.keyword,
                locale: kw.locale,
                previousPosition: prevPosition,
                newPosition: newPosition!,
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

    // Create in-app notifications for drops and rises (grouped by app)
    for (const [appKey, { drops, rises }] of Object.entries(dropsByTeam)) {
      const firstKw = keywords.find((k) => k.appId === appKey);
      if (!firstKw?.app.teamId) continue;

      if (drops.length > 0) {
        const summary = drops
          .slice(0, 3)
          .map(
            (d) =>
              `"${d.keyword}" ${d.previousPosition != null ? `#${d.previousPosition}` : '?'} → ${d.newPosition != null ? `#${d.newPosition}` : 'out of top 100'}`
          )
          .join(', ');
        createNotification({
          teamId: firstKw.app.teamId,
          appId: appKey,
          type: 'keyword_drop',
          title: `${drops.length} keyword drop${drops.length === 1 ? '' : 's'} in ${firstKw.app.title ?? appKey}`,
          body:
            summary +
            (drops.length > 3 ? ` and ${drops.length - 3} more.` : '.'),
        }).catch(console.error);
      }

      if (rises.length > 0) {
        const summary = rises
          .slice(0, 3)
          .map(
            (r) =>
              `"${r.keyword}" ${r.previousPosition != null ? `#${r.previousPosition}` : 'unranked'} → #${r.newPosition}`
          )
          .join(', ');
        createNotification({
          teamId: firstKw.app.teamId,
          appId: appKey,
          type: 'keyword_rise',
          title: `${rises.length} keyword rise${rises.length === 1 ? '' : 's'} in ${firstKw.app.title ?? appKey}`,
          body:
            summary +
            (rises.length > 3 ? ` and ${rises.length - 3} more.` : '.'),
        }).catch(console.error);
      }
    }

    // Send drop + rise alert emails + Slack (fire & forget)
    let totalDrops = 0;
    let totalRises = 0;
    for (const { drops, rises, users } of Object.values(dropsByTeam)) {
      totalDrops += drops.length;
      totalRises += rises.length;
      for (const {
        email,
        locale,
        slackWebhookUrl,
        notifyKeywordRise,
      } of users) {
        if (drops.length > 0) {
          sendKeywordDropEmail(email, drops, locale).catch((err) =>
            console.error(
              `keyword-rankings: failed to send drop alert to ${email}:`,
              err
            )
          );
        }

        if (rises.length > 0 && notifyKeywordRise !== false) {
          sendKeywordRiseEmail(email, rises, locale).catch((err) =>
            console.error(
              `keyword-rankings: failed to send rise alert to ${email}:`,
              err
            )
          );
        }

        if (slackWebhookUrl) {
          const messages: string[] = [];
          if (drops.length > 0) {
            const lines = drops.map((d) => {
              const prev =
                d.previousPosition != null
                  ? `#${d.previousPosition}`
                  : 'unranked';
              const next =
                d.newPosition != null ? `#${d.newPosition}` : 'out of top 100';
              return `• *${d.keyword}* (${d.appTitle}): ${prev} → ${next}`;
            });
            messages.push(
              `:chart_with_downwards_trend: *${drops.length} keyword drop${drops.length === 1 ? '' : 's'}*\n${lines.join('\n')}`
            );
          }
          if (rises.length > 0) {
            const lines = rises.map(
              (r) =>
                `• *${r.keyword}* (${r.appTitle}): ${r.previousPosition != null ? `#${r.previousPosition}` : 'unranked'} → #${r.newPosition}`
            );
            messages.push(
              `:rocket: *${rises.length} keyword rise${rises.length === 1 ? '' : 's'}*\n${lines.join('\n')}`
            );
          }
          if (messages.length > 0) {
            sendSlackMessage(slackWebhookUrl, messages.join('\n\n')).catch(
              (err) =>
                console.error(
                  `keyword-rankings: failed to send Slack to ${email}:`,
                  err
                )
            );
          }
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
        rises: totalRises,
        errors: errors.length,
      })
    );

    await logCron({
      cronName: 'keyword-rankings',
      startTime,
      recordsProcessed: snapshots.length,
    });
    return NextResponse.json({
      snapshots: snapshots.length,
      drops: totalDrops,
      errors,
    });
  } catch (error) {
    await logCron({ cronName: 'keyword-rankings', startTime, error });
    console.error('keyword-rankings cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
