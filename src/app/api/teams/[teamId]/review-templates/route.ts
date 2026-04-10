import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/review-templates
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const templates = await prisma.reviewTemplate.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(templates);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/review-templates
// Body: { name, body, rating? }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { name, body, rating } = await request.json();

    if (!name?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: 'name and body required' },
        { status: 400 }
      );
    }

    const template = await prisma.reviewTemplate.create({
      data: {
        teamId,
        name: name.trim(),
        body: body.trim(),
        rating: rating ?? null,
      },
    });
    return NextResponse.json(template);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
