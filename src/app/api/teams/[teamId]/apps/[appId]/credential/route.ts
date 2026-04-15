import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';

// PATCH /api/teams/[teamId]/apps/[appId]/credential
// Body: { credentialId: string | null }
// Assigns or clears a StoreCredential for an app
export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const { credentialId } = (await request.json()) as {
      credentialId: string | null;
    };

    // If assigning, verify the credential belongs to this team and matches store
    if (credentialId) {
      const cred = await prisma.storeCredential.findFirst({
        where: { id: credentialId, teamId },
      });
      if (!cred) {
        return NextResponse.json(
          { error: 'Credential not found' },
          { status: 404 }
        );
      }
      if (cred.store !== app.store) {
        return NextResponse.json(
          {
            error: `Credential is for ${cred.store} but app is on ${app.store}`,
          },
          { status: 400 }
        );
      }
    }

    await prisma.app.update({
      where: { id: appId },
      data: { credentialId: credentialId ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
