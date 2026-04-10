import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface SearchAdsMetricEntry {
  id: string;
  appId: string;
  keyword: string;
  date: string;
  impressions: number;
  taps: number;
  installs: number;
  spend: number;
  currency: string;
  ttr: number | null; // tap-through rate
  cr: number | null; // conversion rate
}

// GET /api/teams/[teamId]/apps/[appId]/search-ads
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

    const metrics = await prisma.searchAdsMetric.findMany({
      where: { appId },
      orderBy: [{ date: 'desc' }, { keyword: 'asc' }],
    });

    const result: SearchAdsMetricEntry[] = metrics.map((m) => ({
      id: m.id,
      appId: m.appId,
      keyword: m.keyword,
      date: m.date.toISOString().slice(0, 10),
      impressions: m.impressions,
      taps: m.taps,
      installs: m.installs,
      spend: m.spend,
      currency: m.currency,
      ttr:
        m.impressions > 0
          ? Math.round((m.taps / m.impressions) * 10000) / 100
          : null,
      cr: m.taps > 0 ? Math.round((m.installs / m.taps) * 10000) / 100 : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/apps/[appId]/search-ads
// Body: { keyword, date, impressions, taps, installs, spend, currency? }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const body = await request.json();
    const {
      keyword,
      date,
      impressions = 0,
      taps = 0,
      installs = 0,
      spend = 0,
      currency = 'USD',
    } = body;

    if (!keyword || !date) {
      return NextResponse.json(
        { error: 'keyword and date required' },
        { status: 400 }
      );
    }

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const metric = await prisma.searchAdsMetric.upsert({
      where: { appId_keyword_date: { appId, keyword, date: new Date(date) } },
      update: { impressions, taps, installs, spend, currency },
      create: {
        appId,
        keyword,
        date: new Date(date),
        impressions,
        taps,
        installs,
        spend,
        currency,
      },
    });

    return NextResponse.json(metric);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
