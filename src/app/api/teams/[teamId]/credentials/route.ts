import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { Store } from '@/types/aso';

// GET /api/teams/[teamId]/credentials
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);

    const credentials = await prisma.storeCredential.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        store: true,
        keyId: true,
        issuerId: true,
        // never expose private key or service account key in list
        createdAt: true,
        _count: { select: { apps: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(credentials);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/credentials
// Body (App Store): { name, store: "APPSTORE", privateKey, keyId, issuerId }
// Body (Google Play): { name, store: "GOOGLEPLAY", serviceAccountKey }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);

    const body = await request.json();
    const { name, store, privateKey, keyId, issuerId, serviceAccountKey } =
      body as {
        name: string;
        store: Store;
        privateKey?: string;
        keyId?: string;
        issuerId?: string;
        serviceAccountKey?: string;
      };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!store || !['APPSTORE', 'GOOGLEPLAY'].includes(store)) {
      return NextResponse.json({ error: 'invalid store' }, { status: 400 });
    }
    if (store === Store.APPSTORE && (!privateKey || !keyId || !issuerId)) {
      return NextResponse.json(
        { error: 'privateKey, keyId and issuerId are required for App Store' },
        { status: 400 }
      );
    }
    if (store === Store.GOOGLEPLAY && !serviceAccountKey) {
      return NextResponse.json(
        { error: 'serviceAccountKey is required for Google Play' },
        { status: 400 }
      );
    }

    const credential = await prisma.storeCredential.create({
      data: {
        teamId,
        name: name.trim(),
        store,
        privateKey: store === Store.APPSTORE ? privateKey : null,
        keyId: store === Store.APPSTORE ? keyId : null,
        issuerId: store === Store.APPSTORE ? issuerId : null,
        serviceAccountKey:
          store === Store.GOOGLEPLAY && serviceAccountKey
            ? JSON.parse(serviceAccountKey)
            : null,
      },
      select: {
        id: true,
        name: true,
        store: true,
        keyId: true,
        issuerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(credential, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
