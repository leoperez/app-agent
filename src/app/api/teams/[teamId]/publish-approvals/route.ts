import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/publish-approvals?status=pending|approved|rejected|all
// Returns all approval requests for the team, enriched with app title
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending';

    const where: Record<string, unknown> = { teamId };
    if (status !== 'all') where.status = status;

    const approvals = await prisma.publishApproval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Enrich with app title and requester name
    const appIds = Array.from(new Set(approvals.map((a) => a.appId)));
    const apps = await prisma.app.findMany({
      where: { id: { in: appIds } },
      select: { id: true, title: true },
    });
    const appMap = Object.fromEntries(apps.map((a) => [a.id, a.title]));

    const userIds = Array.from(
      new Set([
        ...approvals.map((a) => a.requestedBy),
        ...approvals.map((a) => a.reviewedBy).filter(Boolean),
      ])
    ) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(
      users.map((u) => [u.id, u.name ?? u.email ?? u.id])
    );

    const enriched = approvals.map((a) => ({
      ...a,
      appTitle: appMap[a.appId] ?? a.appId,
      requesterName: userMap[a.requestedBy] ?? a.requestedBy,
      reviewerName: a.reviewedBy
        ? (userMap[a.reviewedBy] ?? a.reviewedBy)
        : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
