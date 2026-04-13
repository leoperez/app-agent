import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';

export const maxDuration = 30;

// POST /api/teams/[teamId]/apps/[appId]/screenshot-sets/upload-image
// Body: multipart/form-data with field "file" (image/png | image/jpeg | image/webp)
// Returns: { url: string }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG and WebP images are allowed' },
        { status: 400 }
      );
    }

    // Max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 10 MB)' },
        { status: 400 }
      );
    }

    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg';
    const filename = `teams/${teamId}/apps/${appId}/screenshots/${nanoid(10)}.${ext}`;

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
