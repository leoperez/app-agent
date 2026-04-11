import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { User } from '@/types/user';

// POST /api/feedback
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session ? (session.user as User).id : null;
    const userEmail = session?.user?.email ?? null;

    const body = await request.json();
    const message = (body.message ?? '').trim();
    const page = (body.page ?? '').trim() || null;

    if (!message || message.length > 2000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    await prisma.userFeedback.create({
      data: {
        userId,
        email: userEmail,
        message,
        page,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}
