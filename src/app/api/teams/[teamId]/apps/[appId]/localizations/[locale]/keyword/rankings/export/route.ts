import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/teams/[teamId]/apps/[appId]/localizations/[locale]/keyword/rankings/export
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { title: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const rankings = await prisma.asoKeywordRanking.findMany({
      where: { appId, locale },
      orderBy: [{ keyword: 'asc' }, { recordedAt: 'asc' }],
      select: { keyword: true, position: true, recordedAt: true },
    });

    const headers = ['date', 'keyword', 'position'];
    const rows = rankings.map((r) =>
      [r.recordedAt.toISOString().split('T')[0], r.keyword, r.position]
        .map(escapeCsv)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${(app.title ?? appId).replace(/[^a-z0-9]/gi, '-')}-rankings-${locale}-${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
