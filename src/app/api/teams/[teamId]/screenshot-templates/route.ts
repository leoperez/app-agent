import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';

// GET /api/teams/[teamId]/screenshot-templates
export async function GET(request: Request) {
  try {
    const { teamId } = await validateTeamAccess(request);

    const templates = await prisma.screenshotTemplate.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/screenshot-templates
export async function POST(request: Request) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const body = await request.json();
    const {
      name,
      layoutId,
      themeId,
      fontId = 'system',
      decorationId = 'none',
      customBg,
      customText,
      customAccent,
      bgGradient,
      slides,
    } = body;

    const template = await prisma.screenshotTemplate.create({
      data: {
        teamId,
        name,
        layoutId,
        themeId,
        fontId,
        decorationId,
        customBg: customBg ?? null,
        customText: customText ?? null,
        customAccent: customAccent ?? null,
        bgGradient: bgGradient ?? null,
        slides: slides ?? [],
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
