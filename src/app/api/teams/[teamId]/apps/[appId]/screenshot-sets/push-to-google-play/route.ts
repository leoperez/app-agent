import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import {
  AppNotFoundError,
  handleAppError,
  InvalidParamsError,
} from '@/types/errors';
import prisma from '@/lib/prisma';
import { getGooglePlayKeyFromDB } from '@/lib/google-play/key';
import {
  labelToImageType,
  pushScreenshotsToGooglePlay,
} from '@/lib/google-play/screenshots';

export const maxDuration = 120;

/**
 * POST /api/teams/[teamId]/apps/[appId]/screenshot-sets/push-to-google-play
 *
 * Body:
 *   locale       — BCP-47 language tag, e.g. "en-US"
 *   displayLabel — export target label, e.g. "Google Play phone" | "Feature Graphic"
 *   slides       — array of { dataUrl: string (PNG data URL), fileName: string }
 *
 * Returns:
 *   { uploaded: number, total: number }
 */
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    // 1. Load service account key
    const serviceAccountKey = await getGooglePlayKeyFromDB(teamId);
    if (!serviceAccountKey) {
      throw new InvalidParamsError(
        'Google Play service account credentials not configured for this team. ' +
          'Go to Settings → Google Play to upload your service account key.'
      );
    }

    // 2. Load app
    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, storeAppId: true, store: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);
    if (app.store !== 'GOOGLEPLAY') {
      throw new InvalidParamsError(
        'Push to Google Play is only available for Google Play apps'
      );
    }
    if (!app.storeAppId) {
      throw new InvalidParamsError(
        'App has no package name configured. Check the app settings.'
      );
    }

    // 3. Parse body
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

    // 4. Convert data URLs → Buffers
    const imageBuffers: Buffer[] = slides.map(({ dataUrl }) => {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(base64, 'base64');
    });

    const imageType = labelToImageType(displayLabel);

    // 5. Push to Google Play
    const { uploaded } = await pushScreenshotsToGooglePlay({
      serviceAccountKey,
      packageName: app.storeAppId,
      language: locale,
      imageType,
      images: imageBuffers,
    });

    return NextResponse.json({ uploaded, total: slides.length });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
