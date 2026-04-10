import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// DELETE /api/teams/[teamId]/review-templates/[templateId]
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; templateId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    await prisma.reviewTemplate.deleteMany({
      where: { id: params.templateId, teamId },
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
