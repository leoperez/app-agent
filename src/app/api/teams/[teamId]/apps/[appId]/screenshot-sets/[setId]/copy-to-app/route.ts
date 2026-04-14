import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import { Prisma } from '@prisma/client';

// POST — copy a screenshot set to another app in the same team
// Body: { targetAppId: string, locale?: string }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    // Verify source set belongs to this team
    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    const body = await request.json().catch(() => ({}));
    const targetAppId: string = body.targetAppId ?? '';
    const locale: string = body.locale ?? set.locale;

    if (!targetAppId) {
      return NextResponse.json(
        { error: 'targetAppId is required' },
        { status: 400 }
      );
    }

    // Verify target app belongs to the same team
    const targetApp = await prisma.app.findFirst({
      where: { id: targetAppId, teamId },
    });
    if (!targetApp) throw new AppNotFoundError('Target app not found');

    const created = await prisma.screenshotSet.create({
      data: {
        appId: targetAppId,
        locale,
        name: set.name,
        layoutId: set.layoutId,
        themeId: set.themeId,
        fontId: set.fontId ?? 'system',
        decorationId: set.decorationId ?? 'none',
        customBg: set.customBg,
        customText: set.customText,
        customAccent: set.customAccent,
        bgGradient:
          set.bgGradient != null
            ? (set.bgGradient as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        slides: set.slides as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
