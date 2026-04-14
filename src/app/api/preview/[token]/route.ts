import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/preview/[token] — public, no auth
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const shareToken = await prisma.screenshotSetShareToken.findUnique({
    where: { token: params.token },
    include: {
      set: {
        select: {
          id: true,
          name: true,
          locale: true,
          layoutId: true,
          themeId: true,
          fontId: true,
          decorationId: true,
          customBg: true,
          customText: true,
          customAccent: true,
          bgGradient: true,
          slides: true,
          app: { select: { title: true, iconUrl: true } },
        },
      },
    },
  });

  if (!shareToken) {
    return NextResponse.json(
      { error: 'Invalid or expired link' },
      { status: 404 }
    );
  }

  // Check expiry
  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'This preview link has expired' },
      { status: 410 }
    );
  }

  return NextResponse.json({
    set: shareToken.set,
    label: shareToken.label,
    expiresAt: shareToken.expiresAt,
  });
}
