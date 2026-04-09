import client from '@/lib/app-store/client';
import { tarseAppData } from '@/lib/aso/tarser';
import { AppStoreApp } from '@/types/app-store';
import { AppStoreLocaleCode } from '@/lib/utils/locale';
import {
  getCountryCode,
  getLocaleString,
} from '@/lib/app-store/country-mapper';
import { redis } from '@/lib/redis';

const CACHE_EXPIRATION = 60 * 60 * 24; // 1 day

export async function getApp(
  appId: string,
  locale: AppStoreLocaleCode
): Promise<Partial<AppStoreApp>> {
  const cacheKey = `app:${appId}:${locale}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return cachedData as Partial<AppStoreApp>;
    }
  } catch (error) {
    console.error('Redis cache read error (get-app):', error);
  }

  const app = await client.app({
    id: appId,
    country: getCountryCode(locale),
    language: getLocaleString(locale),
  });
  const result = tarseAppData(app);

  try {
    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_EXPIRATION });
  } catch (error) {
    console.error('Redis cache write error (get-app):', error);
  }

  return result;
}
