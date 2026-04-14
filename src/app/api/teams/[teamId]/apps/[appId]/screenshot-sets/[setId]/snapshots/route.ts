import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';

const MAX_SNAPSHOTS = 20;

// GET /api/teams/[teamId]/apps/[appId]/screenshot-sets/[setId]/snapshots
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
      select: { id: true },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    const snapshots = await prisma.screenshotSetSnapshot.findMany({
      where: { setId },
      orderBy: { createdAt: 'desc' },
      take: MAX_SNAPSHOTS,
    });

    return NextResponse.json(snapshots);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/apps/[appId]/screenshot-sets/[setId]/snapshots
// Body: { label?: string } — saves current set state as snapshot
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    const body = await request.json().catch(() => ({}));
    const label: string = body.label ?? '';

    const snapshot = await prisma.screenshotSetSnapshot.create({
      data: {
        setId,
        label,
        layoutId: set.layoutId,
        themeId: set.themeId,
        fontId: set.fontId,
        decorationId: set.decorationId,
        customBg: set.customBg,
        customText: set.customText,
        customAccent: set.customAccent,
        bgGradient:
          set.bgGradient != null
            ? (set.bgGradient as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        slides: set.slides as Prisma.InputJsonValue,
      },
    });

    // Prune oldest beyond MAX_SNAPSHOTS
    const all = await prisma.screenshotSetSnapshot.findMany({
      where: { setId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (all.length > MAX_SNAPSHOTS) {
      const toDelete = all.slice(MAX_SNAPSHOTS).map((s) => s.id);
      await prisma.screenshotSetSnapshot.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
