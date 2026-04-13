import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';

// GET /api/teams/[teamId]/apps/[appId]/screenshot-sets/[setId]
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId },
    });
    if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(set);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// PUT /api/teams/[teamId]/apps/[appId]/screenshot-sets/[setId]
export async function PUT(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const body = await request.json();
    const {
      name,
      layoutId,
      themeId,
      customBg,
      customText,
      customAccent,
      bgGradient,
      slides,
    } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (layoutId !== undefined) data.layoutId = layoutId;
    if (themeId !== undefined) data.themeId = themeId;
    if ('customBg' in body) data.customBg = customBg ?? null;
    if ('customText' in body) data.customText = customText ?? null;
    if ('customAccent' in body) data.customAccent = customAccent ?? null;
    if ('bgGradient' in body) data.bgGradient = bgGradient ?? null;
    if (slides !== undefined) data.slides = slides;

    const updated = await prisma.screenshotSet.updateMany({
      where: { id: setId, appId },
      data,
    });

    if (updated.count === 0)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId },
    });
    return NextResponse.json(set);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE /api/teams/[teamId]/apps/[appId]/screenshot-sets/[setId]
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    await prisma.screenshotSet.deleteMany({ where: { id: setId, appId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
