import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCronSecret } from '@/lib/utils/cron-auth';
import { redis } from '@/lib/redis';
import client from '@/lib/app-store/client';
import scraperClient from '@/lib/google-play/scraper-client';
import { getCountryCode } from '@/lib/app-store/country-mapper';
import { googlePlayToAppStore } from '@/lib/utils/locale';
import { AppStoreLocaleCode } from '@/lib/utils/locale';
import { Country } from 'app-store-client';
import { logCron } from '@/lib/utils/log-cron';
import { replyToReview as appStoreReply } from '@/lib/app-store-connect/reviews';
import { replyToReview as googlePlayReply } from '@/lib/google-play/reviews';
import { getGooglePlayKeyFromDB } from '@/lib/google-play/key';
import {
  generateJWT,
  isAppStoreConnectJWTExpired,
} from '@/lib/app-store-connect/auth';

export const maxDuration = 120;

// Daily cron: fetch latest reviews for each app and upsert into AppReview
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;

  const startTime = Date.now();
  const lockKey = `cron:review-sync:${new Date().toISOString().split('T')[0]}`;
  const locked = await redis.set(lockKey, '1', { ex: 23 * 60 * 60, nx: true });
  if (!locked) {
    return NextResponse.json({ message: 'Already ran today', saved: 0 });
  }

  const apps = await prisma.app.findMany({
    select: {
      id: true,
      storeAppId: true,
      store: true,
      primaryLocale: true,
      teamId: true,
      team: {
        select: {
          appStoreConnectJWT: true,
          appStoreConnectJWTExpiresAt: true,
          appStoreConnectPrivateKey: true,
          appStoreConnectKeyId: true,
          appStoreConnectIssuerId: true,
        },
      },
    },
  });

  let totalSaved = 0;

  for (const app of apps) {
    try {
      if (app.store === 'APPSTORE') {
        // Derive country from primary locale
        let country: Country = Country.US;
        if (app.primaryLocale) {
          const mapped = googlePlayToAppStore(app.primaryLocale);
          if (mapped) {
            country = getCountryCode(mapped as AppStoreLocaleCode);
          }
        }

        const reviews = await client.reviews({
          id: app.storeAppId,
          country,
          page: 1,
        });

        for (const r of reviews) {
          await prisma.appReview.upsert({
            where: { appId_storeId: { appId: app.id, storeId: r.id } },
            create: {
              appId: app.id,
              storeId: r.id,
              version: r.version || null,
              score: r.score,
              title: r.title || null,
              body: r.text || null,
              reviewedAt: new Date(r.updated),
            },
            update: {
              score: r.score,
              title: r.title || null,
              body: r.text || null,
            },
          });
          totalSaved++;
        }
      } else if (app.store === 'GOOGLEPLAY') {
        const { data: reviews } = await scraperClient.reviews({
          appId: app.storeAppId,
          lang: 'en',
          country: 'us',
          sort: 2, // NEWEST
          num: 100,
        } as any);

        for (const r of reviews) {
          const storeId = r.id as string;
          if (!storeId) continue;
          await prisma.appReview.upsert({
            where: { appId_storeId: { appId: app.id, storeId } },
            create: {
              appId: app.id,
              storeId,
              version: (r as any).version || null,
              score: r.score,
              title: null,
              body: r.text || null,
              reviewedAt: new Date((r as any).date || Date.now()),
              locale: 'en-US',
            },
            update: {
              score: r.score,
              body: r.text || null,
            },
          });
          totalSaved++;
        }
      }
      // Auto-reply rules: find enabled rules for this app/team
      const rules = await prisma.reviewAutoReplyRule.findMany({
        where: {
          teamId: app.teamId,
          enabled: true,
          OR: [{ appId: app.id }, { appId: null }],
        },
        include: { template: { select: { body: true } } },
      });

      if (rules.length > 0) {
        // Find reviews not yet auto-replied
        const pendingReviews = await prisma.appReview.findMany({
          where: { appId: app.id, autoRepliedAt: null },
          select: { id: true, storeId: true, score: true },
        });

        // Resolve JWT for App Store Connect replies
        let jwt: string | null = null;
        if (app.store === 'APPSTORE') {
          const team = app.team;
          if (
            team.appStoreConnectJWT &&
            team.appStoreConnectJWTExpiresAt &&
            !isAppStoreConnectJWTExpired(team.appStoreConnectJWT)
          ) {
            jwt = team.appStoreConnectJWT;
          } else if (
            team.appStoreConnectPrivateKey &&
            team.appStoreConnectKeyId &&
            team.appStoreConnectIssuerId
          ) {
            jwt = await generateJWT(
              team.appStoreConnectPrivateKey,
              team.appStoreConnectKeyId,
              team.appStoreConnectIssuerId
            );
          }
        }

        for (const review of pendingReviews) {
          const matchingRule = rules.find(
            (r) => review.score >= r.minRating && review.score <= r.maxRating
          );
          if (!matchingRule) continue;

          try {
            if (app.store === 'APPSTORE' && jwt) {
              await appStoreReply(
                jwt,
                review.storeId,
                matchingRule.template.body
              );
            } else if (app.store === 'GOOGLEPLAY') {
              const key = await getGooglePlayKeyFromDB(app.teamId);
              if (key) {
                await googlePlayReply(
                  key,
                  app.storeAppId,
                  review.storeId,
                  matchingRule.template.body
                );
              }
            }
            await prisma.appReview.update({
              where: { id: review.id },
              data: { autoRepliedAt: new Date() },
            });
          } catch (replyErr) {
            console.error(
              `[review-sync] Auto-reply failed for review ${review.id}:`,
              replyErr
            );
          }
        }
      }
    } catch (err) {
      console.error(`[review-sync] Failed for app ${app.id}:`, err);
    }
  }

  await logCron({
    cronName: 'review-sync',
    startTime,
    recordsProcessed: totalSaved,
  });
  return NextResponse.json({ saved: totalSaved });
}
