import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';

// GET /api/teams/[teamId]/apps/[appId]/screenshot-sets/ab-tests
// Returns all A/B tests for this app's screenshot sets
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    // Verify app belongs to team
    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tests = await prisma.screenshotSetAbTest.findMany({
      where: {
        OR: [{ setA: { appId } }, { setB: { appId } }],
      },
      include: {
        setA: {
          select: {
            id: true,
            name: true,
            locale: true,
            themeId: true,
            layoutId: true,
          },
        },
        setB: {
          select: {
            id: true,
            name: true,
            locale: true,
            themeId: true,
            layoutId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tests);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/apps/[appId]/screenshot-sets/ab-tests
// Body: { setAId, setBId, note? }
export async function POST(
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
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const {
      setAId,
      setBId,
      note = '',
    } = body as {
      setAId: string;
      setBId: string;
      note?: string;
    };

    if (!setAId || !setBId || setAId === setBId) {
      return NextResponse.json(
        { error: 'setAId and setBId are required and must differ' },
        { status: 400 }
      );
    }

    // Verify both sets belong to this app
    const count = await prisma.screenshotSet.count({
      where: { id: { in: [setAId, setBId] }, appId },
    });
    if (count < 2) {
      return NextResponse.json(
        { error: 'One or both sets not found' },
        { status: 404 }
      );
    }

    // Upsert — ensure setAId < setBId for consistent ordering to avoid mirror duplicates
    const [a, b] = setAId < setBId ? [setAId, setBId] : [setBId, setAId];

    const test = await prisma.screenshotSetAbTest.upsert({
      where: { setAId_setBId: { setAId: a, setBId: b } },
      create: { setAId: a, setBId: b, note },
      update: { note },
      include: {
        setA: {
          select: {
            id: true,
            name: true,
            locale: true,
            themeId: true,
            layoutId: true,
          },
        },
        setB: {
          select: {
            id: true,
            name: true,
            locale: true,
            themeId: true,
            layoutId: true,
          },
        },
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
