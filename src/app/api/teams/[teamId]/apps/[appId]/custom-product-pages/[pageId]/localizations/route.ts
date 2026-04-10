import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {
  listPageLocalizations,
  createPageLocalization,
  updatePageLocalization,
} from '@/lib/app-store-connect/custom-product-pages';

// GET /api/.../custom-product-pages/[pageId]/localizations?versionId=xxx
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; pageId: string } }
) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId } = params;
    const url = new URL(request.url);
    const versionId = url.searchParams.get('versionId');

    if (!versionId) {
      return NextResponse.json(
        { error: 'versionId required' },
        { status: 400 }
      );
    }

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const localizations = await listPageLocalizations(
      appStoreConnectJWT,
      versionId
    );
    return NextResponse.json(localizations);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/.../custom-product-pages/[pageId]/localizations
// Body: { versionId, locale, promotionalText, localizationId? }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; pageId: string } }
) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId } = params;
    const { versionId, locale, promotionalText, localizationId } =
      await request.json();

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    if (localizationId) {
      // Update existing
      await updatePageLocalization(
        appStoreConnectJWT,
        localizationId,
        promotionalText ?? ''
      );
      return NextResponse.json({ ok: true });
    } else {
      // Create new
      const loc = await createPageLocalization(
        appStoreConnectJWT,
        versionId,
        locale,
        promotionalText ?? ''
      );
      return NextResponse.json(loc, { status: 201 });
    }
  } catch (error) {
    return handleAppError(error as Error);
  }
}
