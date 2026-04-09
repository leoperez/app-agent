import scraperClient from '@/lib/google-play/scraper-client';
import { GooglePlaySimilarApp } from '@/types/google-play';
import { LocaleCode } from '@/lib/utils/locale';
import {
  getCountryCode,
  getLanguageCode,
} from '@/lib/google-play/country-mapper';
import { redis } from '@/lib/redis';

const CACHE_EXPIRATION = 60 * 60 * 24; // 1 day

/**
 * Get similar apps for a given app from Google Play Store
 * @param appId The package name of the app
 * @param locale The locale code for the results
 * @returns Array of similar apps
 */
export async function getSimilarApps(
  appId: string,
  locale: LocaleCode
): Promise<GooglePlaySimilarApp[]> {
  const country = getCountryCode(locale);
  const lang = getLanguageCode(locale);
  const cacheKey = `gplay-similar:${appId}:${locale}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return cachedData as GooglePlaySimilarApp[];
    }
  } catch (error) {
    console.error('Redis cache read error (gplay-similar-apps):', error);
  }

  const apps = await scraperClient.similar({
    appId,
    lang,
    country,
    fullDetail: false,
  });

  const transformed: GooglePlaySimilarApp[] = apps.map((app: any) => ({
    appId: app.appId,
    title: app.title,
    summary: app.summary,
    developer: app.developer,
    developerId: app.developerId,
    icon: app.icon,
    score: app.score,
    scoreText: app.scoreText,
    priceText: app.priceText,
    free: app.free,
    url: app.url,
  }));

  try {
    await redis.set(cacheKey, JSON.stringify(transformed), {
      ex: CACHE_EXPIRATION,
    });
  } catch (error) {
    console.error('Redis cache write error (gplay-similar-apps):', error);
  }

  return transformed;
}
