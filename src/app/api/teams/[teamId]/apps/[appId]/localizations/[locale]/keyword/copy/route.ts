import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/teams/[teamId]/apps/[appId]/localizations/[locale]/keyword/copy
// Body: { targetLocales: string[] }
// Copies all keywords from [locale] to the target locales (skips duplicates)
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;
    const { targetLocales }: { targetLocales: string[] } = await request.json();

    if (!targetLocales?.length) {
      return NextResponse.json(
        { error: 'targetLocales required' },
        { status: 400 }
      );
    }

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, store: true, platform: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    // Fetch source keywords
    const sourceKeywords = await prisma.asoKeyword.findMany({
      where: { appId, locale },
      select: {
        keyword: true,
        trafficScore: true,
        difficultyScore: true,
        overall: true,
      },
    });

    if (sourceKeywords.length === 0) {
      return NextResponse.json({ copied: 0 });
    }

    let totalCopied = 0;

    for (const targetLocale of targetLocales) {
      // Get existing keywords in target to avoid duplicates
      const existing = await prisma.asoKeyword.findMany({
        where: { appId, locale: targetLocale },
        select: { keyword: true },
      });
      const existingSet = new Set(existing.map((k) => k.keyword.toLowerCase()));

      const toInsert = sourceKeywords
        .filter((k) => !existingSet.has(k.keyword.toLowerCase()))
        .map((k) => ({
          appId,
          store: app.store,
          platform: app.platform,
          locale: targetLocale,
          keyword: k.keyword,
          trafficScore: k.trafficScore,
          difficultyScore: k.difficultyScore,
          overall: k.overall,
        }));

      if (toInsert.length > 0) {
        await prisma.asoKeyword.createMany({
          data: toInsert,
          skipDuplicates: true,
        });
        totalCopied += toInsert.length;
      }
    }

    return NextResponse.json({ copied: totalCopied });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
