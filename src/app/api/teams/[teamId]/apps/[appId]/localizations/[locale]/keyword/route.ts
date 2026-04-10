import { validateTeamAccess } from '@/lib/auth';
import { googlePlayToAppStore } from '@/lib/utils/locale';
import prisma from '@/lib/prisma';
import {
  AppNotFoundError,
  handleAppError,
  InvalidParamsError,
} from '@/types/errors';
import { NextResponse } from 'next/server';
import { scoreKeyword } from '@/lib/aso/score';

export const maxDuration = 300;

// Return all keywords for an app and locale
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;

    // Verify app belongs to team
    const app = await prisma.app.findFirst({
      where: {
        id: appId,
        teamId: teamId,
      },
    });

    if (!app) {
      throw new AppNotFoundError(`App ${appId} not found`);
    }

    // Return all keywords for the app and locale
    const keywords = await prisma.asoKeyword.findMany({
      where: {
        appId: appId,
        locale: locale,
      },
      orderBy: {
        overall: 'desc',
      },
    });

    return NextResponse.json(keywords);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// Score and store a keyword in the database
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;
    const data = await request.json();
    const { term } = data;
    if (!term) {
      throw new InvalidParamsError('Missing term');
    }

    // Verify app belongs to team
    const app = await prisma.app.findFirst({
      where: {
        id: appId,
        teamId: teamId,
      },
    });

    if (!app) {
      throw new AppNotFoundError(`App ${appId} not found`);
    }

    // App Store keyword field is limited to 100 characters (comma-separated)
    if (app.store === 'APPSTORE') {
      const existingKeywords = await prisma.asoKeyword.findMany({
        where: { appId, locale },
        select: { keyword: true },
      });
      const existing = existingKeywords.map((k) => k.keyword);
      // Only count the term if it's not already in the list
      const allKeywords = existing.includes(term)
        ? existing
        : [...existing, term];
      const combined = allKeywords.join(',');
      if (combined.length > 100) {
        throw new InvalidParamsError(
          `Adding "${term}" would exceed the 100-character App Store keyword limit (${combined.length} chars). Remove some keywords first.`
        );
      }
    }

    // Convert Google Play locale to App Store locale for scoring
    const appStoreLocale = googlePlayToAppStore(locale);

    // Score the keyword
    const score = await scoreKeyword(appStoreLocale, term, appId);

    // Store the keyword score in the database (using original locale string)
    const keyword = await prisma.asoKeyword.upsert({
      where: {
        appId_store_platform_locale_keyword: {
          appId,
          store: app.store,
          platform: app.platform,
          locale: locale,
          keyword: term,
        },
      },
      update: {
        trafficScore: score.trafficScore,
        difficultyScore: score.difficultyScore,
        position: score.position,
        overall: score.overall,
      },
      create: {
        appId,
        store: app.store,
        platform: app.platform,
        locale: locale,
        keyword: term,
        trafficScore: score.trafficScore,
        difficultyScore: score.difficultyScore,
        position: score.position,
        overall: score.overall,
      },
    });

    return NextResponse.json(keyword);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE /api/teams/[teamId]/apps/[appId]/localizations/[locale]/keyword
// Body: { ids: string[] } — bulk delete
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;
    const { ids }: { ids: string[] } = await request.json();

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 });
    }

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const { count } = await prisma.asoKeyword.deleteMany({
      where: { id: { in: ids }, appId, locale },
    });

    return NextResponse.json({ deleted: count });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
