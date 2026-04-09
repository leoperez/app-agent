import scraperClient from '@/lib/google-play/scraper-client';
import { GooglePlayApp } from '@/types/google-play';
import { LocaleCode } from '@/lib/utils/locale';
import {
  getCountryCode,
  getLanguageCode,
} from '@/lib/google-play/country-mapper';
import { redis } from '@/lib/redis';

const CACHE_EXPIRATION = 60 * 60 * 24; // 1 day

/**
 * Get detailed information about a specific app from Google Play Store
 * @param appId The package name of the app (e.g., 'com.google.android.apps.translate')
 * @param locale The locale code for the app information
 * @returns Detailed app information
 */
export async function getApp(
  appId: string,
  locale: LocaleCode
): Promise<GooglePlayApp> {
  const country = getCountryCode(locale);
  const lang = getLanguageCode(locale);
  const cacheKey = `gplay-app:${appId}:${locale}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return cachedData as GooglePlayApp;
    }
  } catch (error) {
    console.error('Redis cache read error (gplay-get-app):', error);
  }

  const app = await scraperClient.app({ appId, lang, country });
  const result = app as GooglePlayApp;

  try {
    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_EXPIRATION });
  } catch (error) {
    console.error('Redis cache write error (gplay-get-app):', error);
  }

  return result;
}
