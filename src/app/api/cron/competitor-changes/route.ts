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
import {
  getCountryCode as getGPlayCountry,
  getLanguageCode,
} from '@/lib/google-play/country-mapper';
import { googlePlayToAppStore } from '@/lib/utils/locale';
import { CompetitorChangeEntry } from '@/components/emails/competitor-changes';
import { sendCompetitorChangesEmail } from '@/lib/emails/send-competitor-changes';

export const maxDuration = 300;

const TRACKED_FIELDS = ['title', 'subtitle', 'description'] as const;

// Daily cron: detect competitor title/subtitle/description changes
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;

  try {
    // Idempotency: use Redis lock with 23h TTL to prevent duplicate runs
    const lockKey = `cron:competitor-changes:${new Date().toISOString().split('T')[0]}`;
    const locked = await redis.set(lockKey, '1', {
      ex: 23 * 60 * 60,
      nx: true,
    });
    if (!locked) {
      return NextResponse.json({ message: 'Already ran today', changes: 0 });
    }

    const competitors = await prisma.competitor.findMany({
      include: {
        app: {
          include: {
            team: {
              include: {
                users: {
                  include: { user: { select: { email: true, locale: true } } },
                },
              },
            },
          },
        },
      },
    });

    // Group by team for email digest
    const changesByTeam: Record<string, CompetitorChangeEntry[]> = {};
    const teamUsers: Record<string, { email: string; locale: string }[]> = {};
    let totalChanges = 0;

    for (const competitor of competitors) {
      try {
        const store = competitor.store as Store;
        const locale = competitor.locale;

        // Fetch fresh data bypassing Redis cache
        let freshTitle: string | null = null;
        let freshSubtitle: string | null = null;
        let freshDescription: string | null = null;

        if (store === Store.APPSTORE) {
          const appStoreLocale = googlePlayToAppStore(locale);
          const app = await client.app({
            id: competitor.competitorId,
            country: getAppStoreCountry(appStoreLocale),
            language: getLocaleString(appStoreLocale),
          });
          freshTitle = app.title ?? null;
          freshSubtitle = (app as any).subtitle ?? null;
          freshDescription = app.description ?? null;
        } else {
          const gplayApp = await scraperClient.app({
            appId: competitor.competitorId,
            lang: getLanguageCode(locale),
            country: getGPlayCountry(locale),
          });
          freshTitle = gplayApp.title ?? null;
          freshDescription = gplayApp.description ?? null;
        }

        const current: Record<string, string | null> = {
          title: competitor.title,
          subtitle: competitor.subtitle ?? null,
          description: competitor.description ?? null,
        };
        const fresh: Record<string, string | null> = {
          title: freshTitle,
          subtitle: freshSubtitle,
          description: freshDescription,
        };

        const detectedChanges: {
          field: string;
          previousValue: string | null;
          newValue: string | null;
        }[] = [];

        for (const field of TRACKED_FIELDS) {
          const prev = current[field] ?? null;
          const next = fresh[field] ?? null;
          if (prev !== next && next !== null) {
            detectedChanges.push({
              field,
              previousValue: prev,
              newValue: next,
            });
          }
        }

        if (detectedChanges.length > 0) {
          // Save changes to DB
          await prisma.competitorChange.createMany({
            data: detectedChanges.map((c) => ({
              competitorId: competitor.id,
              field: c.field,
              previousValue: c.previousValue,
              newValue: c.newValue,
            })),
          });

          // Update competitor with fresh data
          await prisma.competitor.update({
            where: { id: competitor.id },
            data: {
              ...(freshTitle && { title: freshTitle }),
              ...(freshSubtitle !== null && { subtitle: freshSubtitle }),
              ...(freshDescription && { description: freshDescription }),
            },
          });

          const teamId = competitor.app.team.id;
          if (!changesByTeam[teamId]) changesByTeam[teamId] = [];
          if (!teamUsers[teamId]) {
            teamUsers[teamId] = competitor.app.team.users
              .filter((u) => u.user.email)
              .map((u) => ({
                email: u.user.email as string,
                locale: u.user.locale ?? 'en',
              }));
          }

          for (const c of detectedChanges) {
            changesByTeam[teamId].push({
              competitorTitle: competitor.title,
              appTitle: competitor.app.title ?? competitor.app.storeAppId,
              locale,
              field: c.field,
              previousValue: c.previousValue,
              newValue: c.newValue,
            });
          }

          totalChanges += detectedChanges.length;
        }
      } catch (err) {
        console.error(
          `competitor-changes: error processing ${competitor.competitorId}:`,
          err
        );
      }
    }

    // Send email digest per team (fire & forget)
    for (const teamId of Object.keys(changesByTeam)) {
      const users = teamUsers[teamId] ?? [];
      const changes = changesByTeam[teamId];
      for (const { email, locale: userLocale } of users) {
        sendCompetitorChangesEmail(email, changes, userLocale).catch((err) =>
          console.error(
            `competitor-changes: failed to send email to ${email}:`,
            err
          )
        );
      }
    }

    // Clean up changes older than 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await prisma.competitorChange.deleteMany({
      where: { detectedAt: { lt: cutoff } },
    });

    console.log(
      JSON.stringify({
        event: 'competitor_change_scan',
        totalChanges,
        competitors: competitors.length,
      })
    );

    return NextResponse.json({
      competitors: competitors.length,
      changes: totalChanges,
    });
  } catch (error) {
    console.error('competitor-changes cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
