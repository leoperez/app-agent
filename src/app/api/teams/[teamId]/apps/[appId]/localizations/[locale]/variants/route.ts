import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface MetadataVariantResponse {
  id: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  keywords: string | null;
  description: string | null;
  isActive: boolean;
  appliedAt: string | null;
  createdAt: string;
}

// GET — list all variants for this app + locale
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const variants = await prisma.metadataVariant.findMany({
      where: { appId, locale },
      orderBy: { createdAt: 'desc' },
    });

    const result: MetadataVariantResponse[] = variants.map((v) => ({
      id: v.id,
      name: v.name,
      title: v.title,
      subtitle: v.subtitle,
      keywords: v.keywords,
      description: v.description,
      isActive: v.isActive,
      appliedAt: v.appliedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// POST — save current metadata as a named variant
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const { name, title, subtitle, keywords, description } =
      await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Variant name is required' },
        { status: 400 }
      );
    }

    const variant = await prisma.metadataVariant.create({
      data: {
        appId,
        locale,
        name: name.trim(),
        title,
        subtitle,
        keywords,
        description,
      },
    });

    const result: MetadataVariantResponse = {
      id: variant.id,
      name: variant.name,
      title: variant.title,
      subtitle: variant.subtitle,
      keywords: variant.keywords,
      description: variant.description,
      isActive: variant.isActive,
      appliedAt: null,
      createdAt: variant.createdAt.toISOString(),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
