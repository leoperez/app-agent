import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import {
  AppNotFoundError,
  handleAppError,
  InvalidParamsError,
} from '@/types/errors';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

const IMPORTABLE_FIELDS = [
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

type ImportableField = (typeof IMPORTABLE_FIELDS)[number];

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse a single CSV field (handles quoted fields with commas/newlines)
  const parseField = (field: string): string => {
    field = field.trim();
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1).replace(/""/g, '"');
    }
    return field;
  };

  // Split a CSV line respecting quoted fields
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const headers = splitLine(lines[0]).map(parseField);

  return lines.slice(1).map((line) => {
    const values = splitLine(line).map(parseField);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

// POST /api/teams/[teamId]/apps/[appId]/localizations/import
// Body: multipart/form-data with a file field (CSV or JSON)
// Returns: { updated: number, skipped: number, errors: string[] }
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId, userId, session } = await validateTeamAccess(request);
    const userEmail = session.user?.email ?? undefined;
    const { appId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const contentType = request.headers.get('content-type') ?? '';
    let rows: Record<string, string>[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) throw new InvalidParamsError('No file provided');

      const text = await file.text();
      const name = file.name.toLowerCase();

      if (name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [];
      } else {
        rows = parseCSV(text);
      }
    } else {
      // JSON body fallback
      const body = await request.json();
      rows = Array.isArray(body) ? body : [];
    }

    if (rows.length === 0) {
      throw new InvalidParamsError('No data rows found in file');
    }

    // Find the draft version
    const draftVersion = await prisma.appVersion.findFirst({
      where: {
        appId,
        state: {
          notIn: [
            'READY_FOR_SALE',
            'READY_FOR_DISTRIBUTION',
            'DEVELOPER_REMOVED_FROM_SALE',
            'completed',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!draftVersion) {
      throw new InvalidParamsError('No draft version found for this app');
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const locale = row['locale']?.trim();
      if (!locale) {
        skipped++;
        continue;
      }

      // Build only allowed fields with non-empty values
      const data: Partial<Record<ImportableField, string>> = {};
      for (const field of IMPORTABLE_FIELDS) {
        if (row[field] !== undefined && row[field] !== '') {
          data[field] = row[field];
        }
      }

      if (Object.keys(data).length === 0) {
        skipped++;
        continue;
      }

      try {
        const existing = await prisma.appLocalization.findFirst({
          where: { appVersionId: draftVersion.id, locale },
        });

        if (existing) {
          await prisma.appLocalization.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await prisma.appLocalization.create({
            data: {
              appId,
              appVersionId: draftVersion.id,
              locale,
              ...data,
            },
          });
        }
        updated++;
      } catch (err) {
        errors.push(`${locale}: ${(err as Error).message}`);
      }
    }

    logAudit({
      teamId,
      userId,
      userEmail,
      action: 'import',
      entity: 'localization',
      appId,
      meta: { updated, skipped },
    }).catch(() => {});

    return NextResponse.json({ updated, skipped, errors });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
