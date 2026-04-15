import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { User } from '@/types/user';
import { handleAppError, InvalidParamsError } from '@/types/errors';
import { VAPID_PUBLIC_KEY } from '@/lib/push';

// GET — return the VAPID public key so the browser can subscribe
export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}

// POST — save a push subscription
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const userId = (session.user as User).id;
    const { endpoint, keys } = await request.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new InvalidParamsError('Invalid subscription object');
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE — remove subscription
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { endpoint } = await request.json();
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
