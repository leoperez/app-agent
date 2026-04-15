import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';

// GET /api/teams/[teamId]/audit-log?limit=50&entity=localization&appId=xxx
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') ?? '50'),
      200
    );
    const entity = url.searchParams.get('entity') ?? undefined;
    const appId = url.searchParams.get('appId') ?? undefined;

    const logs = await prisma.auditLog.findMany({
      where: {
        teamId,
        ...(entity ? { entity } : {}),
        ...(appId ? { appId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        userId: true,
        userEmail: true,
        action: true,
        entity: true,
        entityId: true,
        appId: true,
        meta: true,
        createdAt: true,
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
