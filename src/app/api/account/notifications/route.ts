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
      select: { notifyCompetitorChanges: true, slackWebhookUrl: true },
    });

    return NextResponse.json(
      user ?? { notifyCompetitorChanges: true, slackWebhookUrl: null }
    );
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
    const body = await request.json();

    const data: {
      notifyCompetitorChanges?: boolean;
      slackWebhookUrl?: string | null;
    } = {};

    if ('notifyCompetitorChanges' in body) {
      data.notifyCompetitorChanges = Boolean(body.notifyCompetitorChanges);
    }
    if ('slackWebhookUrl' in body) {
      // Store empty string as null
      data.slackWebhookUrl = body.slackWebhookUrl?.trim() || null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { notifyCompetitorChanges: true, slackWebhookUrl: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
