import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import {
  handleAppError,
  NotPermittedError,
  InvalidParamsError,
} from '@/types/errors';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendInvitationEmail } from '@/lib/emails/send-invitation';
import { NEXT_PUBLIC_BASE_URL } from '@/lib/config';

function requireAdmin(team: any, currentUserId: string) {
  const isAdmin = team.users.some(
    (u: any) => u.userId === currentUserId && u.role === 'ADMIN'
  );
  if (!isAdmin) throw new NotPermittedError('Only admins can invite members');
}

// POST /api/teams/[teamId]/invitations — create an invite link
export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const {
      userId: currentUserId,
      team,
      teamId,
    } = await validateTeamAccess(request);
    requireAdmin(team, currentUserId);

    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      throw new InvalidParamsError('Valid email is required');
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const isMember = team.users.some(
        (u: any) => u.userId === existingUser.id
      );
      if (isMember) {
        throw new InvalidParamsError('User is already a member of this team');
      }
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Upsert invitation (replace existing if any)
    await prisma.invitation.upsert({
      where: { email_teamId: { email, teamId } },
      update: { token, expires },
      create: { email, teamId, token, expires },
    });

    const inviteUrl = `${NEXT_PUBLIC_BASE_URL}/invite/${token}`;

    // Get inviter name from team users
    const inviter = team.users.find((u: any) => u.userId === currentUserId);
    const inviterName = inviter?.user?.name ?? null;

    // Send invitation email (fire & forget — don't fail if email fails)
    sendInvitationEmail({
      to: email,
      inviteUrl,
      teamName: (team as any).name ?? teamId,
      inviterName,
    }).catch((err) =>
      console.error(`Failed to send invitation email to ${email}:`, err)
    );

    return NextResponse.json({ inviteUrl, token, expires });
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// GET /api/teams/[teamId]/invitations — list pending invitations
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const {
      userId: currentUserId,
      team,
      teamId,
    } = await validateTeamAccess(request);
    requireAdmin(team, currentUserId);

    const invitations = await prisma.invitation.findMany({
      where: { teamId, expires: { gt: new Date() } },
      select: { email: true, expires: true, token: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// DELETE /api/teams/[teamId]/invitations — revoke invitation by email
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const {
      userId: currentUserId,
      team,
      teamId,
    } = await validateTeamAccess(request);
    requireAdmin(team, currentUserId);

    const { email } = await request.json();
    await prisma.invitation.deleteMany({ where: { teamId, email } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
