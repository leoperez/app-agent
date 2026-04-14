import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import {
  AppNotFoundError,
  handleAppError,
  InvalidParamsError,
} from '@/types/errors';
import {
  findEditableVersion,
  getOrCreateVersionLocalization,
  listScreenshotSetsForLocalization,
} from '@/lib/app-store-connect/screenshots';

export const maxDuration = 30;

// GET /api/teams/[teamId]/apps/[appId]/screenshot-sets/import-from-asc?locale=en-US
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId } = params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') ?? 'en-US';

    if (!appStoreConnectJWT) {
      throw new InvalidParamsError(
        'App Store Connect credentials not configured for this team'
      );
    }

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { store: true, storeAppId: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);
    if (app.store !== 'APPSTORE') {
      return NextResponse.json(
        { error: 'Only available for App Store apps' },
        { status: 400 }
      );
    }
    if (!app.storeAppId) {
      return NextResponse.json(
        { error: 'App Store ID not configured' },
        { status: 400 }
      );
    }

    const versionId = await findEditableVersion(
      appStoreConnectJWT,
      app.storeAppId
    );
    if (!versionId) {
      return NextResponse.json(
        { error: 'No editable version found in App Store Connect' },
        { status: 404 }
      );
    }

    const localizationId = await getOrCreateVersionLocalization(
      appStoreConnectJWT,
      versionId,
      locale
    );
    const sets = await listScreenshotSetsForLocalization(
      appStoreConnectJWT,
      localizationId
    );

    // Flatten and filter to uploaded screenshots only
    const screenshots = sets.flatMap((s) =>
      s.screenshots
        .filter((sc) => sc.imageUrl && sc.uploadState === 'COMPLETE')
        .map((sc) => ({ ...sc, displayType: s.displayType }))
    );

    return NextResponse.json({ screenshots, locale });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
