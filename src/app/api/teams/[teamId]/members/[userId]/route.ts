import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import {
  handleAppError,
  NotPermittedError,
  InvalidParamsError,
} from '@/types/errors';
import { User } from '@/types/user';
import prisma from '@/lib/prisma';

function requireAdmin(team: any, currentUserId: string) {
  const isAdmin = team.users.some(
    (u: any) => u.userId === currentUserId && u.role === 'ADMIN'
  );
  if (!isAdmin) throw new NotPermittedError('Only admins can manage members');
}

// PATCH /api/teams/[teamId]/members/[userId] — change role
export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string; userId: string } }
) {
  try {
    const {
      userId: currentUserId,
      team,
      teamId,
    } = await validateTeamAccess(request);
    requireAdmin(team, currentUserId);

    const { role } = await request.json();
    if (!['ADMIN', 'MANAGER', 'MEMBER'].includes(role)) {
      throw new InvalidParamsError('Invalid role');
    }

    // Prevent removing the last admin
    if (params.userId === currentUserId && role !== 'ADMIN') {
      const adminCount = team.users.filter(
        (u: any) => u.role === 'ADMIN'
      ).length;
      if (adminCount <= 1) {
        throw new NotPermittedError('Cannot demote the only admin');
      }
    }

    await prisma.userTeam.update({
      where: { userId_teamId: { userId: params.userId, teamId } },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE /api/teams/[teamId]/members/[userId] — remove member
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; userId: string } }
) {
  try {
    const {
      userId: currentUserId,
      team,
      teamId,
    } = await validateTeamAccess(request);
    requireAdmin(team, currentUserId);

    if (params.userId === currentUserId) {
      throw new NotPermittedError('Cannot remove yourself from the team');
    }

    await prisma.userTeam.delete({
      where: { userId_teamId: { userId: params.userId, teamId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
