import { KeywordScore } from '@/types/aso';
import {
  getCountryCode,
  getLanguageCode,
} from '@/lib/google-play/country-mapper';
import { searchApps } from '@/lib/google-play/search-apps';

/**
 * Score a keyword for a Google Play app.
 * Searches Google Play for the keyword and finds the position of the app.
 */
export async function scoreKeywordGPlay(
  locale: string,
  keyword: string,
  storeAppId: string // package name, e.g. com.example.app
): Promise<KeywordScore> {
  const searchResult = await searchApps({
    term: keyword.toLowerCase().trim(),
    num: 100,
    lang: getLanguageCode(locale),
    country: getCountryCode(locale),
  });

  if (searchResult.apps.length === 0) {
    return {
      keyword,
      trafficScore: 0,
      difficultyScore: 0,
      position: -1,
      overall: 0,
      cacheHit: searchResult.cacheHit,
    };
  }

  const positionIndex = searchResult.apps.findIndex(
    (app) => app.appId === storeAppId
  );
  const position = positionIndex !== -1 ? positionIndex + 1 : -1;

  const topApps = searchResult.apps.slice(0, 10);
  const maxReviews = 1_000_000;
  const totalTopReviews = topApps.reduce(
    (sum, app) => sum + (app.score ?? 0) * 1000,
    0
  );
  const avgTopReviews = totalTopReviews / topApps.length || 0;
  const trafficScore = Math.min(
    10,
    (Math.log10(avgTopReviews + 1) / Math.log10(maxReviews + 1)) * 10
  );

  const keywordLower = keyword.toLowerCase();
  const appsUsingKeyword = topApps.filter((app) =>
    (app.title?.toLowerCase() || '').includes(keywordLower)
  );
  const difficultyScore = Math.min(
    10,
    (appsUsingKeyword.length / topApps.length) * 10
  );

  const positionScore =
    position > 0 ? Math.max(0, 10 - Math.log2(position)) : 0;

  const overall = parseFloat(
    (
      trafficScore * 0.3 +
      positionScore * 0.4 +
      (10 - difficultyScore) * 0.3
    ).toFixed(2)
  );

  return {
    keyword,
    trafficScore: parseFloat(trafficScore.toFixed(2)),
    difficultyScore: parseFloat(difficultyScore.toFixed(2)),
    position,
    overall,
    cacheHit: searchResult.cacheHit,
  };
}
