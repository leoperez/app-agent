import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/notifications?limit=20
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') ?? '30'),
      100
    );

    const notifications = await prisma.notification.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        appId: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { teamId, readAt: null },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/notifications/read-all
export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);

    await prisma.notification.updateMany({
      where: { teamId, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
