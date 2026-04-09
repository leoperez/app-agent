import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// DELETE — remove a variant
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: {
      teamId: string;
      appId: string;
      locale: string;
      variantId: string;
    };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, variantId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    await prisma.metadataVariant.deleteMany({
      where: { id: variantId, appId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// PATCH — mark as active (called after a push succeeds for this variant)
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: {
      teamId: string;
      appId: string;
      locale: string;
      variantId: string;
    };
  }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale, variantId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    // Clear isActive on all variants for this app+locale, then set it on this one
    await prisma.metadataVariant.updateMany({
      where: { appId, locale },
      data: { isActive: false },
    });
    const updated = await prisma.metadataVariant.update({
      where: { id: variantId },
      data: { isActive: true, appliedAt: new Date() },
    });

    return NextResponse.json({ success: true, appliedAt: updated.appliedAt });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
