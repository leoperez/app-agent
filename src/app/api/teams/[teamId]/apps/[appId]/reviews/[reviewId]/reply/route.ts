import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {
  replyToReview as appStoreReply,
  updateReply as appStoreUpdate,
  deleteReply as appStoreDelete,
} from '@/lib/app-store-connect/reviews';
import { replyToReview as googlePlayReply } from '@/lib/google-play/reviews';
import { getGooglePlayKeyFromDB } from '@/lib/google-play/key';

type Params = { teamId: string; appId: string; reviewId: string };

// POST { body, responseId? } — create or update a reply
export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId, reviewId } = params;
    const { body, responseId } = await request.json();

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { storeAppId: true, store: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    if (app.store === 'GOOGLEPLAY') {
      const key = await getGooglePlayKeyFromDB(teamId);
      if (!key) throw new Error('Google Play key not configured');
      await googlePlayReply(key, app.storeAppId, reviewId, body);
    } else {
      if (!appStoreConnectJWT)
        throw new Error('App Store Connect not configured');
      if (responseId) {
        await appStoreUpdate(appStoreConnectJWT, responseId, body);
      } else {
        await appStoreReply(appStoreConnectJWT, reviewId, body);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE { responseId } — remove a reply (App Store only)
export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId } = params;
    const { responseId } = await request.json();

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { store: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    if (app.store !== 'GOOGLEPLAY') {
      if (!appStoreConnectJWT)
        throw new Error('App Store Connect not configured');
      await appStoreDelete(appStoreConnectJWT, responseId);
    }
    // Google Play does not support deleting replies via API

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
