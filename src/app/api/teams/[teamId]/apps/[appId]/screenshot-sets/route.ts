import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import { defaultSlides } from '@/lib/screenshot-templates';

// GET /api/teams/[teamId]/apps/[appId]/screenshot-sets
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale');

    const sets = await prisma.screenshotSet.findMany({
      where: { appId, ...(locale ? { locale } : {}) },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(sets);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/apps/[appId]/screenshot-sets
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const body = await request.json();
    const {
      locale = app.primaryLocale ?? 'en-US',
      name = 'Untitled set',
      layoutId = 'centered',
      themeId = 'midnight',
      customBg,
      customText,
      customAccent,
      slides,
    } = body;

    const set = await prisma.screenshotSet.create({
      data: {
        appId,
        locale,
        name,
        layoutId,
        themeId,
        customBg: customBg ?? null,
        customText: customText ?? null,
        customAccent: customAccent ?? null,
        slides: slides ?? defaultSlides(),
      },
    });

    return NextResponse.json(set, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
