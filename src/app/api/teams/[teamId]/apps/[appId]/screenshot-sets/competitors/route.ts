import { NextResponse } from 'next/server';
import { AppStoreClient } from 'app-store-client';
import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import { redis } from '@/lib/redis';

export const maxDuration = 30;

const client = new AppStoreClient();
const CACHE_TTL = 60 * 60 * 12; // 12 hours

interface CompetitorApp {
  id: string;
  title: string;
  icon: string;
  developer: string;
  score: number;
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
}

// GET /api/teams/[teamId]/apps/[appId]/screenshot-sets/competitors
// Query params: q (search term or numeric app ID), country (default "us")
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    await validateTeamAccess(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const country = (searchParams.get('country') ?? 'us').toLowerCase();

    if (!q) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 });
    }

    const cacheKey = `competitor-screenshots:${country}:${q}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // If q looks like a numeric app ID, fetch directly; otherwise search
    let apps: CompetitorApp[] = [];
    if (/^\d+$/.test(q)) {
      // Direct lookup by Apple app ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await (client.app as any)({ id: q, country });
      if (raw) {
        apps = [mapApp(raw)];
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = (await (client.search as any)({
        term: q,
        country,
        num: 10,
      })) as any[];
      apps = results.map(mapApp).filter((a) => a.screenshotUrls.length > 0);
    }

    await redis.set(cacheKey, JSON.stringify(apps), { ex: CACHE_TTL });
    return NextResponse.json(apps);
  } catch (error) {
    return handleAppError(error as Error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApp(raw: any): CompetitorApp {
  return {
    id: String(raw.id ?? raw.trackId ?? ''),
    title: raw.title ?? raw.trackName ?? '',
    icon: raw.icon ?? raw.artworkUrl100 ?? '',
    developer: raw.developer ?? raw.artistName ?? '',
    score: raw.score ?? raw.averageUserRating ?? 0,
    screenshotUrls: raw.screenshotUrls ?? [],
    ipadScreenshotUrls: raw.ipadScreenshotUrls ?? [],
  };
}
