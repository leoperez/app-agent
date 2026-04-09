import scraperClient from '@/lib/google-play/scraper-client';
import { LocaleCode } from '@/lib/utils/locale';
import {
  getCountryCode,
  getLanguageCode,
} from '@/lib/google-play/country-mapper';
import { redis } from '@/lib/redis';

const CACHE_EXPIRATION = 60 * 60 * 6; // 6 hours

/**
 * Get search suggestions for a given term
 * @param term The search term to get suggestions for
 * @param locale The locale code for the suggestions
 * @returns Array of suggestion strings (up to 5)
 */
export async function getSuggestions(
  term: string,
  locale: LocaleCode
): Promise<string[]> {
  const country = getCountryCode(locale);
  const lang = getLanguageCode(locale);
  const cacheKey = `gplay-suggest:${locale}:${term}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return cachedData as string[];
    }
  } catch (error) {
    console.error('Redis cache read error (gplay-suggest):', error);
  }

  const suggestions = await scraperClient.suggest({ term, lang, country });

  try {
    await redis.set(cacheKey, JSON.stringify(suggestions), {
      ex: CACHE_EXPIRATION,
    });
  } catch (error) {
    console.error('Redis cache write error (gplay-suggest):', error);
  }

  return suggestions;
}
