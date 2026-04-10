import { validateTeamAccess } from '@/lib/auth';
import {
  handleAppError,
  AppNotFoundError,
  InvalidParamsError,
} from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — return the pending scheduled publish for this app (if any)
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const pending = await prisma.scheduledPublish.findFirst({
      where: { appId, status: 'pending' },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json(pending);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST { scheduledAt: ISO string } — create or replace a scheduled publish
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const body = await request.json();
    const scheduledAt = new Date(body.scheduledAt);

    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new InvalidParamsError('scheduledAt must be a future date');
    }

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    // Cancel any existing pending schedule
    await prisma.scheduledPublish.updateMany({
      where: { appId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    const scheduled = await prisma.scheduledPublish.create({
      data: { appId, scheduledAt },
    });

    return NextResponse.json(scheduled);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE — cancel the pending scheduled publish
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    await prisma.scheduledPublish.updateMany({
      where: { appId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
