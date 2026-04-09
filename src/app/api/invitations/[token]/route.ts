import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  handleAppError,
  UnauthorizedError,
  InvalidParamsError,
} from '@/types/errors';
import { User } from '@/types/user';
import prisma from '@/lib/prisma';

// POST /api/invitations/[token] — accept invitation (must be logged in)
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      throw new UnauthorizedError('Must be logged in to accept an invitation');

    const userId = (session.user as User).id;

    const invitation = await prisma.invitation.findUnique({
      where: { token: params.token },
    });

    if (!invitation)
      throw new InvalidParamsError('Invitation not found or already used');
    if (invitation.expires < new Date())
      throw new InvalidParamsError('Invitation has expired');

    // Check user email matches invitation
    if (session.user.email && session.user.email !== invitation.email) {
      throw new InvalidParamsError(
        `This invitation was sent to ${invitation.email}. Please sign in with that email.`
      );
    }

    // Add user to team (upsert in case they're already there)
    await prisma.userTeam.upsert({
      where: { userId_teamId: { userId, teamId: invitation.teamId } },
      update: {},
      create: { userId, teamId: invitation.teamId, role: 'MEMBER' },
    });

    // Delete invitation after use
    await prisma.invitation.delete({ where: { token: params.token } });

    return NextResponse.json({ teamId: invitation.teamId });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// GET /api/invitations/[token] — get invitation details (public, no auth required)
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token: params.token },
      include: { team: { select: { name: true } } },
    });

    if (!invitation) throw new InvalidParamsError('Invitation not found');
    if (invitation.expires < new Date())
      throw new InvalidParamsError('Invitation has expired');

    return NextResponse.json({
      email: invitation.email,
      teamName: invitation.team.name,
      expires: invitation.expires,
    });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
