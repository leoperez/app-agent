import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Metadata } from 'next';
import { PreviewClient } from './preview-client';
import type {
  LayoutId,
  ThemeId,
  FontId,
  DecorationId,
  SlideData,
  GradientBg,
} from '@/types/screenshots';

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shareToken = await prisma.screenshotSetShareToken.findUnique({
    where: { token: params.token },
    include: {
      set: { select: { name: true, app: { select: { title: true } } } },
    },
  });
  if (!shareToken) return { title: 'Preview not found' };
  return {
    title: `${shareToken.set.name} — ${shareToken.set.app.title ?? 'App'} Screenshots`,
    description: shareToken.label || 'Screenshot set preview',
  };
}

export default async function PreviewPage({ params }: Props) {
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

  if (!shareToken) notFound();
  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">This preview link has expired.</p>
      </div>
    );
  }

  const set = shareToken.set;

  return (
    <PreviewClient
      set={{
        id: set.id,
        name: set.name,
        locale: set.locale,
        layoutId: set.layoutId as LayoutId,
        themeId: set.themeId as ThemeId,
        fontId: (set.fontId as FontId) ?? 'system',
        decorationId: (set.decorationId as DecorationId) ?? 'none',
        customBg: set.customBg,
        customText: set.customText,
        customAccent: set.customAccent,
        bgGradient: set.bgGradient as GradientBg | null,
        slides: set.slides as unknown as SlideData[],
        appTitle: set.app.title,
        appIcon: set.app.iconUrl,
      }}
      label={shareToken.label}
    />
  );
}
