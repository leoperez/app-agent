import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface CannibalizationEntry {
  keyword: string;
  locales: string[]; // locales where this keyword appears
  positions: (number | null)[]; // matching position per locale
  overallScores: (number | null)[];
}

// GET /api/teams/[teamId]/apps/[appId]/keywords/cannibalization
// Returns keywords tracked in more than one locale for the same app
// (they compete against each other in search results)
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const keywords = await prisma.asoKeyword.findMany({
      where: { appId },
      select: { keyword: true, locale: true, position: true, overall: true },
      orderBy: [{ keyword: 'asc' }, { locale: 'asc' }],
    });

    // Group by keyword (case-insensitive)
    const grouped: Record<
      string,
      { locale: string; position: number | null; overall: number | null }[]
    > = {};
    for (const kw of keywords) {
      const key = kw.keyword.toLowerCase().trim();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        locale: kw.locale,
        position: kw.position,
        overall: kw.overall,
      });
    }

    // Only include keywords that appear in 2+ locales
    const cannibalized: CannibalizationEntry[] = Object.entries(grouped)
      .filter(([, entries]) => entries.length >= 2)
      .map(([keyword, entries]) => ({
        keyword,
        locales: entries.map((e) => e.locale),
        positions: entries.map((e) => e.position),
        overallScores: entries.map((e) => e.overall),
      }))
      .sort((a, b) => b.locales.length - a.locales.length);

    return NextResponse.json(cannibalized);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
