import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCronSecret } from '@/lib/utils/cron-auth';
import { redis } from '@/lib/redis';
import { Store } from '@/types/aso';
import client from '@/lib/app-store/client';
import scraperClient from '@/lib/google-play/scraper-client';
import {
  getCountryCode as getAppStoreCountry,
  getLocaleString,
} from '@/lib/app-store/country-mapper';
import { googlePlayToAppStore } from '@/lib/utils/locale';
import { sendRatingDropEmail } from '@/lib/emails/send-rating-drop';
import { sendSlackMessage } from '@/lib/slack';
import { RatingDropEntry } from '@/components/emails/rating-drop';
import { createNotification } from '@/lib/notifications';

export const maxDuration = 120;

// Daily cron: snapshot app ratings and alert on drops below threshold
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;

  try {
    const lockKey = `cron:rating-monitor:${new Date().toISOString().split('T')[0]}`;
    const locked = await redis.set(lockKey, '1', {
      ex: 23 * 60 * 60,
      nx: true,
    });
    if (!locked) {
      return NextResponse.json({ message: 'Already ran today', snapshots: 0 });
    }

    // Fetch all apps with their team members (who may have a rating threshold)
    const apps = await prisma.app.findMany({
      select: {
        id: true,
        teamId: true,
        storeAppId: true,
        title: true,
        store: true,
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
                    ratingAlertThreshold: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const snapshots: { appId: string; rating: number; ratingCount: number }[] =
      [];
    const errors: string[] = [];

    // Drops to notify: appId → entries + users
    const dropsByApp: Record<
      string,
      {
        entry: RatingDropEntry;
        users: {
          email: string;
          locale: string;
          slackWebhookUrl: string | null;
          threshold: number;
        }[];
      }
    > = {};

    for (const app of apps) {
      try {
        let rating: number | null = null;
        let ratingCount: number | null = null;

        if (app.store === Store.GOOGLEPLAY) {
          const details = await scraperClient.app({
            appId: app.storeAppId,
            lang: 'en',
            country: 'us',
          });
          rating = details.score ?? null;
          ratingCount = details.ratings ?? null;
        } else {
          // App Store
          const locale = googlePlayToAppStore('en-US');
          const details = await client.app({
            id: app.storeAppId,
            country: getAppStoreCountry(locale),
            language: getLocaleString(locale),
          });
          rating = (details as any).score ?? null;
          ratingCount = (details as any).ratings ?? null;
        }

        if (rating == null || ratingCount == null) continue;

        snapshots.push({ appId: app.id, rating, ratingCount });

        // Get previous snapshot to detect drops
        const prevSnapshot = await prisma.appRatingSnapshot.findFirst({
          where: { appId: app.id },
          orderBy: { recordedAt: 'desc' },
          select: { rating: true },
        });

        if (prevSnapshot) {
          const drop = prevSnapshot.rating - rating;

          // Collect users who have a threshold and the new rating is below it
          const interestedUsers = app.team.users
            .filter((u) => {
              const threshold = u.user.ratingAlertThreshold;
              return (
                u.user.email &&
                u.user.notifyCompetitorChanges !== false &&
                threshold != null &&
                rating! < threshold
              );
            })
            .map((u) => ({
              email: u.user.email as string,
              locale: u.user.locale ?? 'en',
              slackWebhookUrl: u.user.slackWebhookUrl ?? null,
              threshold: u.user.ratingAlertThreshold!,
            }));

          if (interestedUsers.length > 0 && drop > 0) {
            dropsByApp[app.id] = {
              entry: {
                appTitle: app.title ?? app.storeAppId,
                previousRating: prevSnapshot.rating,
                newRating: rating,
                ratingCount,
              },
              users: interestedUsers,
            };
          }
        }
      } catch (err) {
        errors.push(`${app.storeAppId}: ${(err as Error).message}`);
      }
    }

    // Bulk insert snapshots
    if (snapshots.length > 0) {
      await prisma.appRatingSnapshot.createMany({
        data: snapshots.map((s) => ({
          appId: s.appId,
          rating: s.rating,
          ratingCount: s.ratingCount,
        })),
        skipDuplicates: true,
      });
    }

    // Create in-app notifications for rating drops
    for (const [appId, { entry }] of Object.entries(dropsByApp)) {
      const app = apps.find((a) => a.id === appId);
      if (app?.teamId) {
        createNotification({
          teamId: app.teamId,
          appId,
          type: 'rating_drop',
          title: `Rating alert: ${entry.appTitle}`,
          body: `Rating dropped from ★${entry.previousRating.toFixed(1)} to ★${entry.newRating.toFixed(1)} (${entry.ratingCount.toLocaleString()} ratings).`,
        }).catch(console.error);
      }
    }

    // Send alerts fire & forget
    for (const { entry, users } of Object.values(dropsByApp)) {
      for (const { email, locale, slackWebhookUrl, threshold } of users) {
        sendRatingDropEmail(email, [entry], locale).catch((err) =>
          console.error(
            `rating-monitor: failed to send email to ${email}:`,
            err
          )
        );
        if (slackWebhookUrl) {
          const text = `:star: *Rating alert for ${entry.appTitle}*\nRating dropped below your threshold of ★${threshold.toFixed(1)}: ★${entry.previousRating.toFixed(1)} → ★${entry.newRating.toFixed(1)} (${entry.ratingCount.toLocaleString()} ratings)`;
          sendSlackMessage(slackWebhookUrl, text).catch((err) =>
            console.error(
              `rating-monitor: failed to send Slack to ${email}:`,
              err
            )
          );
        }
      }
    }

    // Clean up snapshots older than 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await prisma.appRatingSnapshot.deleteMany({
      where: { recordedAt: { lt: cutoff } },
    });

    console.log(
      JSON.stringify({
        event: 'rating_monitor_snapshot',
        snapshots: snapshots.length,
        alerts: Object.keys(dropsByApp).length,
        errors: errors.length,
      })
    );

    return NextResponse.json({
      snapshots: snapshots.length,
      alerts: Object.keys(dropsByApp).length,
      errors,
    });
  } catch (error) {
    console.error('rating-monitor cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
