import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { listReviews as listAppStoreReviews } from '@/lib/app-store-connect/reviews';
import { listReviews as listGooglePlayReviews } from '@/lib/google-play/reviews';
import { getGooglePlayKeyFromDB } from '@/lib/google-play/key';

// GET /api/teams/[teamId]/apps/[appId]/reviews
// Fetches live reviews from App Store Connect or Google Play
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true, storeAppId: true, store: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    if (app.store === 'GOOGLEPLAY') {
      const key = await getGooglePlayKeyFromDB(teamId);
      if (!key) return NextResponse.json([]);
      const reviews = await listGooglePlayReviews(key, app.storeAppId);
      return NextResponse.json(reviews);
    } else {
      if (!appStoreConnectJWT) return NextResponse.json([]);
      const reviews = await listAppStoreReviews(
        appStoreConnectJWT,
        app.storeAppId
      );
      return NextResponse.json(reviews);
    }
  } catch (error) {
    return handleAppError(error as Error);
  }
}
