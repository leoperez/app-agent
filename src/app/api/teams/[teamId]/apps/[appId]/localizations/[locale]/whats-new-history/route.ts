import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface WhatsNewHistoryEntry {
  id: string;
  text: string;
  version: string | null;
  pushedAt: string;
}

// GET /api/teams/[teamId]/apps/[appId]/localizations/[locale]/whats-new-history
// Returns the last 20 pushed What's New entries for this app + locale
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

    const history = await prisma.whatsNewHistory.findMany({
      where: { appId, locale },
      orderBy: { pushedAt: 'desc' },
      take: 20,
      select: { id: true, text: true, version: true, pushedAt: true },
    });

    const result: WhatsNewHistoryEntry[] = history.map((h) => ({
      id: h.id,
      text: h.text,
      version: h.version,
      pushedAt: h.pushedAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
