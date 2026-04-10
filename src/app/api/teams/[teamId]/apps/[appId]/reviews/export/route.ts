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

// GET /api/teams/[teamId]/apps/[appId]/reviews/export?days=90
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get('days') ?? '90'), 365);

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { title: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const reviews = await prisma.appReview.findMany({
      where: { appId, reviewedAt: { gte: since } },
      orderBy: { reviewedAt: 'desc' },
      select: {
        storeId: true,
        score: true,
        title: true,
        body: true,
        locale: true,
        version: true,
        reviewedAt: true,
      },
    });

    const headers = [
      'date',
      'score',
      'locale',
      'version',
      'title',
      'body',
      'store_id',
    ];
    const rows = reviews.map((r) =>
      [
        r.reviewedAt.toISOString().split('T')[0],
        r.score,
        r.locale,
        r.version,
        r.title,
        r.body,
        r.storeId,
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${(app.title ?? appId).replace(/[^a-z0-9]/gi, '-')}-reviews-${date}.csv`;

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
