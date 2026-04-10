import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';

// GET /api/teams/[teamId]/apps/[appId]/publish-approvals
// Returns all approval requests for an app, most recent first
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, title: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const approvals = await prisma.publishApproval.findMany({
      where: { teamId, appId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(approvals);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/apps/[appId]/publish-approvals
// Body: { summary: string }
// Creates a new pending approval request
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { userId, teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const { summary } = await request.json();

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, title: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const approval = await prisma.publishApproval.create({
      data: {
        teamId,
        appId,
        requestedBy: userId,
        summary: summary ?? '',
        status: 'pending',
      },
    });

    // Notify the team about the pending approval request
    createNotification({
      teamId,
      appId,
      type: 'publish_approval_requested',
      title: `Publish approval requested for ${app.title ?? appId}`,
      body:
        summary?.slice(0, 200) ??
        'A team member has requested approval to publish metadata.',
    }).catch(console.error);

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
