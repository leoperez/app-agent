import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { deleteCustomProductPage } from '@/lib/app-store-connect/custom-product-pages';

// DELETE /api/teams/[teamId]/apps/[appId]/custom-product-pages/[pageId]
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; appId: string; pageId: string } }
) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId, pageId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    await deleteCustomProductPage(appStoreConnectJWT, pageId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
