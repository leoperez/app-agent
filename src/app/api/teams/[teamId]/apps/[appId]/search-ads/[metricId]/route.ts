import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// DELETE /api/teams/[teamId]/apps/[appId]/search-ads/[metricId]
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; appId: string; metricId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, metricId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    await prisma.searchAdsMetric.deleteMany({
      where: { id: metricId, appId },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
