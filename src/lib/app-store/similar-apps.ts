import client from '@/lib/app-store/client';
import {
  getCountryCode,
  getLocaleString,
} from '@/lib/app-store/country-mapper';
import { AppStoreLocaleCode } from '@/lib/utils/locale';
import { AppStoreApp } from '@/types/app-store';
import { tarseAppData } from '@/lib/aso/tarser';
import { redis } from '@/lib/redis';

const CACHE_EXPIRATION = 60 * 60 * 24; // 1 day

export async function getSimilarApps(
  appId: string,
  locale: AppStoreLocaleCode
): Promise<Partial<AppStoreApp>[]> {
  const cacheKey = `similar:${appId}:${locale}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return cachedData as Partial<AppStoreApp>[];
    }
  } catch (error) {
    console.error('Redis cache read error (similar-apps):', error);
  }

  const apps = (
    await client.similarApps({
      id: appId,
      country: getCountryCode(locale),
      language: getLocaleString(locale),
    })
  ).map(tarseAppData);

  try {
    await redis.set(cacheKey, JSON.stringify(apps), { ex: CACHE_EXPIRATION });
  } catch (error) {
    console.error('Redis cache write error (similar-apps):', error);
  }

  return apps;
}
