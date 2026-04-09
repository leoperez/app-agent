import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { User } from '@/types/user';
import { handleAppError } from '@/types/errors';

// GET — return current notification prefs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const userId = (session.user as User).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifyCompetitorChanges: true },
    });

    return NextResponse.json(user ?? { notifyCompetitorChanges: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// PATCH — update notification prefs
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const userId = (session.user as User).id;
    const { notifyCompetitorChanges } = await request.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data: { notifyCompetitorChanges: Boolean(notifyCompetitorChanges) },
      select: { notifyCompetitorChanges: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
