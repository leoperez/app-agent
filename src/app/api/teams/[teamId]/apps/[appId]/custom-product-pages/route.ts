import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {
  listCustomProductPages,
  createCustomProductPage,
} from '@/lib/app-store-connect/custom-product-pages';

// GET /api/teams/[teamId]/apps/[appId]/custom-product-pages
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { storeAppId: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const pages = await listCustomProductPages(
      appStoreConnectJWT,
      app.storeAppId
    );
    return NextResponse.json(pages);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/apps/[appId]/custom-product-pages
// Body: { name: string }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId, appStoreConnectJWT } = await validateTeamAccess(request);
    const { appId } = params;
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { storeAppId: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const result = await createCustomProductPage(
      appStoreConnectJWT,
      app.storeAppId,
      name.trim()
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
