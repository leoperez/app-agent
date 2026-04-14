import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';

// POST /api/.../snapshots/[snapshotId] — restore snapshot into parent set
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: {
      teamId: string;
      appId: string;
      setId: string;
      snapshotId: string;
    };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId, snapshotId } = params;

    // Verify set belongs to this app/team
    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
      select: { id: true },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    const snapshot = await prisma.screenshotSetSnapshot.findFirst({
      where: { id: snapshotId, setId },
    });
    if (!snapshot) throw new AppNotFoundError('Snapshot not found');

    const updated = await prisma.screenshotSet.update({
      where: { id: setId },
      data: {
        layoutId: snapshot.layoutId,
        themeId: snapshot.themeId,
        fontId: snapshot.fontId,
        decorationId: snapshot.decorationId,
        customBg: snapshot.customBg,
        customText: snapshot.customText,
        customAccent: snapshot.customAccent,
        bgGradient:
          snapshot.bgGradient != null
            ? (snapshot.bgGradient as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        slides: snapshot.slides as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE /api/.../snapshots/[snapshotId]
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: {
      teamId: string;
      appId: string;
      setId: string;
      snapshotId: string;
    };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId, snapshotId } = params;

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
      select: { id: true },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    await prisma.screenshotSetSnapshot.delete({ where: { id: snapshotId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
