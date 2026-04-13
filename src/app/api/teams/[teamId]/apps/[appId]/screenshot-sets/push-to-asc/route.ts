import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import {
  AppNotFoundError,
  handleAppError,
  InvalidParamsError,
} from '@/types/errors';
import prisma from '@/lib/prisma';
import {
  findEditableVersion,
  getOrCreateVersionLocalization,
  getOrCreateScreenshotSet,
  uploadScreenshot,
  labelToDisplayType,
} from '@/lib/app-store-connect/screenshots';

export const maxDuration = 120;

/**
 * POST /api/teams/[teamId]/apps/[appId]/screenshot-sets/push-to-asc
 *
 * Body:
 *   locale       — e.g. "en-US"
 *   displayLabel — export target label, e.g. 'iPhone 6.9"'
 *   slides       — array of { dataUrl: string (PNG data URL), fileName: string }
 *
 * Returns:
 *   { uploaded: number, screenshotSetId: string }
 */
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId } = params;

    if (!appStoreConnectJWT) {
      throw new InvalidParamsError(
        'App Store Connect credentials not configured for this team'
      );
    }

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, storeAppId: true, store: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);
    if (app.store !== 'APPSTORE') {
      throw new InvalidParamsError(
        'Push to ASC is only available for App Store apps'
      );
    }
    if (!app.storeAppId) {
      throw new InvalidParamsError('App has no App Store ID configured');
    }

    const body = await request.json();
    const {
      locale,
      displayLabel,
      slides,
    }: {
      locale: string;
      displayLabel: string;
      slides: Array<{ dataUrl: string; fileName: string }>;
    } = body;

    if (!locale || !displayLabel || !slides?.length) {
      throw new InvalidParamsError(
        'locale, displayLabel and slides are required'
      );
    }

    const displayType = labelToDisplayType(displayLabel);

    // 1. Find editable version
    const versionId = await findEditableVersion(
      appStoreConnectJWT,
      app.storeAppId
    );
    if (!versionId) {
      return NextResponse.json(
        {
          error:
            'No editable version found in App Store Connect. Create a new version in App Store Connect first.',
        },
        { status: 422 }
      );
    }

    // 2. Get/create localization
    const localizationId = await getOrCreateVersionLocalization(
      appStoreConnectJWT,
      versionId,
      locale
    );

    // 3. Get/create screenshot set
    const screenshotSetId = await getOrCreateScreenshotSet(
      appStoreConnectJWT,
      localizationId,
      displayType
    );

    // 4. Upload each slide
    let uploaded = 0;
    const errors: string[] = [];

    for (const slide of slides) {
      try {
        // Convert base64 data URL to Buffer
        const base64 = slide.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');
        await uploadScreenshot(
          appStoreConnectJWT,
          screenshotSetId,
          buffer,
          slide.fileName
        );
        uploaded++;
      } catch (err) {
        errors.push((err as Error).message);
      }
    }

    return NextResponse.json({
      uploaded,
      total: slides.length,
      screenshotSetId,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
