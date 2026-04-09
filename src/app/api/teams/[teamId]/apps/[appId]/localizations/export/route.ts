import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';

const EXPORTED_FIELDS = [
  'locale',
  'title',
  'subtitle',
  'shortDescription',
  'fullDescription',
  'description',
  'keywords',
  'promotionalText',
  'marketingUrl',
  'supportUrl',
  'privacyPolicyUrl',
  'whatsNew',
] as const;

// GET /api/teams/[teamId]/apps/[appId]/localizations/export?format=csv|json
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'json';

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    // Get all localizations, prefer draft over public for each locale
    const allLocalizations = await prisma.appLocalization.findMany({
      where: { appId },
      include: { appVersion: { select: { state: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate: one row per locale (draft wins)
    const byLocale = new Map<string, (typeof allLocalizations)[0]>();
    for (const loc of allLocalizations) {
      const existing = byLocale.get(loc.locale);
      if (!existing) {
        byLocale.set(loc.locale, loc);
      } else {
        // Prefer the draft version
        const isDraft = (state: string | null) =>
          state &&
          ![
            'READY_FOR_SALE',
            'DEVELOPER_REMOVED_FROM_SALE',
            'completed',
          ].includes(state);
        if (isDraft(loc.appVersion?.state ?? null)) {
          byLocale.set(loc.locale, loc);
        }
      }
    }

    const rows = Array.from(byLocale.values()).map((loc) =>
      Object.fromEntries(EXPORTED_FIELDS.map((f) => [f, (loc as any)[f] ?? '']))
    );

    const appName = app.title ?? appId;
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const escape = (v: unknown) => {
        const s = String(v ?? '').replace(/"/g, '""');
        return `"${s}"`;
      };
      const header = EXPORTED_FIELDS.join(',');
      const csvRows = rows.map((row) =>
        EXPORTED_FIELDS.map((f) => escape(row[f])).join(',')
      );
      const csv = [header, ...csvRows].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${appName}-localizations-${timestamp}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${appName}-localizations-${timestamp}.json"`,
      },
    });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
