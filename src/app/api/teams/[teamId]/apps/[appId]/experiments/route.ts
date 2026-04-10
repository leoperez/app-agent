import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/apps/[appId]/experiments
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

    const experiments = await prisma.storeExperiment.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(experiments);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/apps/[appId]/experiments
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const body = await request.json();

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const experiment = await prisma.storeExperiment.create({
      data: {
        appId,
        name: body.name,
        hypothesis: body.hypothesis,
        field: body.field,
        variantA: body.variantA,
        variantB: body.variantB,
        status: 'draft',
      },
    });

    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
