import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface MetadataHistoryEntry {
  id: string;
  locale: string;
  version: string | null;
  title: string | null;
  subtitle: string | null;
  keywords: string | null;
  description: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  pushedAt: string;
}

// GET /api/teams/[teamId]/apps/[appId]/localizations/[locale]/metadata-history
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const entries = await prisma.metadataHistory.findMany({
      where: { appId, locale },
      orderBy: { pushedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        locale: true,
        version: true,
        title: true,
        subtitle: true,
        keywords: true,
        description: true,
        shortDescription: true,
        fullDescription: true,
        pushedAt: true,
      },
    });

    return NextResponse.json(
      entries.map((e) => ({ ...e, pushedAt: e.pushedAt.toISOString() }))
    );
  } catch (error) {
    return handleAppError(error as Error);
  }
}
