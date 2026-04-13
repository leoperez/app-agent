import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';

// DELETE /api/teams/[teamId]/screenshot-templates/[templateId]
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; templateId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { templateId } = params;

    await prisma.screenshotTemplate.deleteMany({
      where: { id: templateId, teamId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
