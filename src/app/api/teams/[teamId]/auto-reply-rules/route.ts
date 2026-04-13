import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/auto-reply-rules
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const rules = await prisma.reviewAutoReplyRule.findMany({
      where: { teamId },
      include: {
        template: { select: { id: true, name: true, body: true } },
        app: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(rules);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/auto-reply-rules
export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const body = await request.json();
    const { appId, minRating, maxRating, templateId, enabled } = body;

    if (
      !templateId ||
      typeof minRating !== 'number' ||
      typeof maxRating !== 'number' ||
      minRating < 1 ||
      maxRating > 5 ||
      minRating > maxRating
    ) {
      return NextResponse.json({ error: 'Invalid rule' }, { status: 400 });
    }

    const rule = await prisma.reviewAutoReplyRule.create({
      data: {
        teamId,
        appId: appId || null,
        minRating,
        maxRating,
        templateId,
        enabled: enabled ?? true,
      },
      include: {
        template: { select: { id: true, name: true, body: true } },
        app: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
