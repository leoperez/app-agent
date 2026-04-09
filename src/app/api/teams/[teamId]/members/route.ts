import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, NotPermittedError } from '@/types/errors';
import { User } from '@/types/user';
import prisma from '@/lib/prisma';

// GET /api/teams/[teamId]/members — list team members
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { team } = await validateTeamAccess(request);
    return NextResponse.json(team.users);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
