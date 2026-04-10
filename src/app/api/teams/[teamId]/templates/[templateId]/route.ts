import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// DELETE /api/teams/[teamId]/templates/[templateId]
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; templateId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { templateId } = params;

    await prisma.descriptionTemplate.deleteMany({
      where: { id: templateId, teamId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
