import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import { Prisma } from '@prisma/client';

// POST — clone a screenshot set into one or more locales
// Body: { targetLocales: string[] }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    const body = await request.json().catch(() => ({}));
    const targetLocales: string[] = Array.isArray(body.targetLocales)
      ? body.targetLocales
      : [];

    if (targetLocales.length === 0) {
      return NextResponse.json(
        { error: 'targetLocales must be a non-empty array' },
        { status: 400 }
      );
    }

    // Find existing sets for this app to avoid overwriting
    const existing = await prisma.screenshotSet.findMany({
      where: { appId },
      select: { locale: true },
    });
    const existingLocales = new Set(existing.map((s) => s.locale));

    // Only create sets for locales that don't already have one
    const newLocales = targetLocales.filter(
      (l) => l !== set.locale && !existingLocales.has(l)
    );

    const created = await Promise.all(
      newLocales.map((locale) =>
        prisma.screenshotSet.create({
          data: {
            appId,
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
        })
      )
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
