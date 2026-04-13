import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';

// PATCH — update keyword settings (e.g. positionAlertThreshold)
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: {
      teamId: string;
      appId: string;
      locale: string;
      keywordId: string;
    };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, keywordId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const body = await request.json();
    const data: { positionAlertThreshold?: number | null } = {};
    if ('positionAlertThreshold' in body) {
      const val = body.positionAlertThreshold;
      data.positionAlertThreshold =
        val === null || val === '' ? null : Math.max(1, parseInt(val, 10));
    }

    const updated = await prisma.asoKeyword.update({
      where: { id: keywordId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// Delete a keyword from the database
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: {
      teamId: string;
      appId: string;
      locale: string;
      keywordId: string;
    };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, keywordId } = params;

    // Verify app belongs to team
    const app = await prisma.app.findFirst({
      where: {
        id: appId,
        teamId: teamId,
      },
    });

    if (!app) {
      throw new AppNotFoundError(`App ${appId} not found`);
    }

    // Delete the keyword
    await prisma.asoKeyword.delete({
      where: {
        id: keywordId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
