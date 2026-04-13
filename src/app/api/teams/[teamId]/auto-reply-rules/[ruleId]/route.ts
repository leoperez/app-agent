import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

type Params = { teamId: string; ruleId: string };

// PATCH — toggle enabled or update
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { ruleId } = params;
    const body = await request.json();

    const rule = await prisma.reviewAutoReplyRule.findFirst({
      where: { id: ruleId, teamId },
    });
    if (!rule)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.reviewAutoReplyRule.update({
      where: { id: ruleId },
      data: {
        ...(typeof body.enabled === 'boolean' && { enabled: body.enabled }),
        ...(body.templateId && { templateId: body.templateId }),
        ...(typeof body.minRating === 'number' && {
          minRating: body.minRating,
        }),
        ...(typeof body.maxRating === 'number' && {
          maxRating: body.maxRating,
        }),
      },
      include: {
        template: { select: { id: true, name: true, body: true } },
        app: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE
export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { ruleId } = params;

    await prisma.reviewAutoReplyRule.deleteMany({
      where: { id: ruleId, teamId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
