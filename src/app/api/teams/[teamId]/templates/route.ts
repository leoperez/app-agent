import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/templates?store=APPSTORE
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const url = new URL(request.url);
    const store = url.searchParams.get('store');

    const templates = await prisma.descriptionTemplate.findMany({
      where: { teamId, ...(store ? { store } : {}) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST /api/teams/[teamId]/templates
export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const body = await request.json();

    const template = await prisma.descriptionTemplate.create({
      data: {
        teamId,
        store: body.store,
        name: body.name,
        title: body.title,
        subtitle: body.subtitle,
        keywords: body.keywords,
        description: body.description,
        shortDescription: body.shortDescription,
        fullDescription: body.fullDescription,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
