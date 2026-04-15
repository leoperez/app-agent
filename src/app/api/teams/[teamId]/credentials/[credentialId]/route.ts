import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';

// PATCH /api/teams/[teamId]/credentials/[credentialId]
// Body: { name? }
export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string; credentialId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { credentialId } = params;

    const existing = await prisma.storeCredential.findFirst({
      where: { id: credentialId, teamId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { name } = (await request.json()) as { name?: string };
    const updated = await prisma.storeCredential.update({
      where: { id: credentialId },
      data: { ...(name ? { name: name.trim() } : {}) },
      select: {
        id: true,
        name: true,
        store: true,
        keyId: true,
        issuerId: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE /api/teams/[teamId]/credentials/[credentialId]
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; credentialId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { credentialId } = params;

    const existing = await prisma.storeCredential.findFirst({
      where: { id: credentialId, teamId },
      select: { id: true, _count: { select: { apps: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing._count.apps > 0) {
      return NextResponse.json(
        {
          error: `This credential is used by ${existing._count.apps} app(s). Reassign them first.`,
        },
        { status: 409 }
      );
    }

    await prisma.storeCredential.delete({ where: { id: credentialId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
