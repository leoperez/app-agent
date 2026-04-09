import { validateTeamAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import { NextResponse } from 'next/server';
import { subDays } from 'date-fns';

// Returns competitor changes from the last 30 days for this app/locale
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
    });

    if (!app) {
      throw new AppNotFoundError(`App ${appId} not found`);
    }

    const since = subDays(new Date(), 30);

    const changes = await prisma.competitorChange.findMany({
      where: {
        competitor: { appId, locale },
        detectedAt: { gte: since },
      },
      orderBy: { detectedAt: 'desc' },
      include: {
        competitor: {
          select: { id: true, title: true, competitorId: true, iconUrl: true },
        },
      },
    });

    return NextResponse.json(changes);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
