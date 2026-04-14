import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';

// DELETE — revoke a single token
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: { teamId: string; appId: string; setId: string; tokenId: string };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId, tokenId } = params;

    // Verify ownership
    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
      select: { id: true },
    });
    if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.screenshotSetShareToken.delete({ where: { id: tokenId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
