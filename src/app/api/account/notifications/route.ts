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
      select: {
        notifyCompetitorChanges: true,
        weeklyDigestEnabled: true,
        slackWebhookUrl: true,
        ratingAlertThreshold: true,
      },
    });

    return NextResponse.json(
      user ?? {
        notifyCompetitorChanges: true,
        weeklyDigestEnabled: true,
        slackWebhookUrl: null,
        ratingAlertThreshold: null,
      }
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
      weeklyDigestEnabled?: boolean;
      slackWebhookUrl?: string | null;
      ratingAlertThreshold?: number | null;
    } = {};

    if ('notifyCompetitorChanges' in body) {
      data.notifyCompetitorChanges = Boolean(body.notifyCompetitorChanges);
    }
    if ('weeklyDigestEnabled' in body) {
      data.weeklyDigestEnabled = Boolean(body.weeklyDigestEnabled);
    }
    if ('slackWebhookUrl' in body) {
      data.slackWebhookUrl = body.slackWebhookUrl?.trim() || null;
    }
    if ('ratingAlertThreshold' in body) {
      const val = parseFloat(body.ratingAlertThreshold);
      data.ratingAlertThreshold = isNaN(val)
        ? null
        : Math.min(5, Math.max(1, val));
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        notifyCompetitorChanges: true,
        weeklyDigestEnabled: true,
        slackWebhookUrl: true,
        ratingAlertThreshold: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
