import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PATCH /api/teams/[teamId]/apps/[appId]/experiments/[experimentId]
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { teamId: string; appId: string; experimentId: string };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, experimentId } = params;
    const body = await request.json();

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const data: Record<string, any> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.hypothesis !== undefined) data.hypothesis = body.hypothesis;
    if (body.field !== undefined) data.field = body.field;
    if (body.variantA !== undefined) data.variantA = body.variantA;
    if (body.variantB !== undefined) data.variantB = body.variantB;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.winner !== undefined) data.winner = body.winner;

    // Status transitions
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'running' && !body.startedAt)
        data.startedAt = new Date();
      if (
        (body.status === 'completed' || body.status === 'cancelled') &&
        !body.endedAt
      )
        data.endedAt = new Date();
    }

    const updated = await prisma.storeExperiment.update({
      where: { id: experimentId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE /api/teams/[teamId]/apps/[appId]/experiments/[experimentId]
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: { teamId: string; appId: string; experimentId: string };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, experimentId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    await prisma.storeExperiment.delete({ where: { id: experimentId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
