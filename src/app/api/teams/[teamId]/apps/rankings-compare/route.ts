import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface RankingsCompareEntry {
  keyword: string;
  locale: string;
  apps: {
    appId: string;
    appTitle: string | null;
    position: number | null;
  }[];
}

// GET /api/teams/[teamId]/apps/rankings-compare?locale=en-US
// Returns keywords tracked by multiple apps in the team, with their latest positions
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const url = new URL(request.url);
    const filterLocale = url.searchParams.get('locale');

    const apps = await prisma.app.findMany({
      where: { teamId },
      select: { id: true, title: true },
    });

    if (apps.length < 2) {
      return NextResponse.json([]);
    }

    const appIds = apps.map((a) => a.id);

    // Get latest ranking per app+keyword+locale
    const rankings = await prisma.asoKeywordRanking.findMany({
      where: {
        appId: { in: appIds },
        ...(filterLocale ? { locale: filterLocale } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      distinct: ['appId', 'keyword', 'locale'],
      select: { appId: true, keyword: true, locale: true, position: true },
    });

    // Also include keywords tracked but not yet in ranking snapshots (use AsoKeyword.position)
    const keywords = await prisma.asoKeyword.findMany({
      where: {
        appId: { in: appIds },
        ...(filterLocale ? { locale: filterLocale } : {}),
      },
      select: { appId: true, keyword: true, locale: true, position: true },
    });

    // Merge: ranking snapshot takes priority over AsoKeyword.position
    const positionMap = new Map<
      string,
      { appId: string; position: number | null }[]
    >();

    // First seed from AsoKeyword
    for (const kw of keywords) {
      const key = `${kw.keyword}|||${kw.locale}`;
      const arr = positionMap.get(key) ?? [];
      arr.push({ appId: kw.appId, position: kw.position });
      positionMap.set(key, arr);
    }

    // Override with latest rankings snapshot
    for (const r of rankings) {
      const key = `${r.keyword}|||${r.locale}`;
      const arr = positionMap.get(key) ?? [];
      const existing = arr.find((e) => e.appId === r.appId);
      if (existing) {
        existing.position = r.position;
      } else {
        arr.push({ appId: r.appId, position: r.position });
        positionMap.set(key, arr);
      }
    }

    // Only return keywords tracked by at least 2 different apps
    const appTitleMap = new Map(apps.map((a) => [a.id, a.title]));
    const result: RankingsCompareEntry[] = [];

    for (const [key, positions] of Array.from(positionMap.entries())) {
      const uniqueApps = new Set(
        positions.map(
          (p: { appId: string; position: number | null }) => p.appId
        )
      );
      if (uniqueApps.size < 2) continue;

      const [keyword, locale] = key.split('|||');
      result.push({
        keyword,
        locale,
        apps: positions.map(
          (p: { appId: string; position: number | null }) => ({
            appId: p.appId,
            appTitle: appTitleMap.get(p.appId) ?? null,
            position: p.position,
          })
        ),
      });
    }

    // Sort by keyword then locale
    result.sort(
      (a, b) =>
        a.keyword.localeCompare(b.keyword) || a.locale.localeCompare(b.locale)
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
