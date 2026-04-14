import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';

// DELETE /api/.../ab-tests/[testId]
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; appId: string; testId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, testId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.screenshotSetAbTest.delete({ where: { id: testId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
