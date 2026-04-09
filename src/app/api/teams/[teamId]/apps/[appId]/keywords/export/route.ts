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

export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { title: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const keywords = await prisma.asoKeyword.findMany({
      where: { appId },
      orderBy: [{ locale: 'asc' }, { overall: 'desc' }],
      select: {
        locale: true,
        keyword: true,
        overall: true,
        trafficScore: true,
        difficultyScore: true,
        position: true,
        lastCheckedAt: true,
      },
    });

    const headers = [
      'locale',
      'keyword',
      'overall',
      'traffic_score',
      'difficulty_score',
      'position',
      'last_checked_at',
    ];

    const rows = keywords.map((kw) =>
      [
        kw.locale,
        kw.keyword,
        kw.overall,
        kw.trafficScore,
        kw.difficultyScore,
        kw.position,
        kw.lastCheckedAt?.toISOString().split('T')[0] ?? '',
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${(app.title ?? appId).replace(/[^a-z0-9]/gi, '-')}-keywords-${date}.csv`;

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
