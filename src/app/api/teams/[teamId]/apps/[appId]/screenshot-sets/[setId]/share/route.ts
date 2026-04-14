import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';

// GET — list share tokens for this set
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
      select: { id: true },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    const tokens = await prisma.screenshotSetShareToken.findMany({
      where: { setId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tokens);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST — create a new share token
// Body: { label?: string, expiresInDays?: number }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
      select: { id: true },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    const body = await request.json().catch(() => ({}));
    const label: string = body.label ?? '';
    const expiresInDays: number | null = body.expiresInDays ?? null;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86_400_000)
      : null;

    const shareToken = await prisma.screenshotSetShareToken.create({
      data: { setId, label, expiresAt },
    });

    return NextResponse.json(shareToken, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE — revoke all tokens for this set
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; appId: string; setId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, setId } = params;

    const set = await prisma.screenshotSet.findFirst({
      where: { id: setId, appId, app: { teamId } },
      select: { id: true },
    });
    if (!set) throw new AppNotFoundError('Screenshot set not found');

    await prisma.screenshotSetShareToken.deleteMany({ where: { setId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
