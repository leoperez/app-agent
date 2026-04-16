import { NextResponse } from 'next/server';
import { validateTeamAccess } from '@/lib/auth';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { Store } from '@/types/aso';

// GET /api/teams/[teamId]/apps/[appId]/report?format=html
// Generates a printable ASO report for the app
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: {
        id: true,
        title: true,
        store: true,
        storeAppId: true,
        primaryLocale: true,
        iconUrl: true,
      },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const [keywords, latestRating, reviews, recentRankings] = await Promise.all(
      [
        prisma.asoKeyword.findMany({
          where: { appId },
          orderBy: [{ position: 'asc' }],
          take: 30,
          select: {
            keyword: true,
            locale: true,
            position: true,
            lastCheckedAt: true,
          },
        }),
        prisma.appRatingSnapshot.findFirst({
          where: { appId },
          orderBy: { recordedAt: 'desc' },
          select: { rating: true, ratingCount: true, recordedAt: true },
        }),
        prisma.appReview.findMany({
          where: { appId },
          orderBy: { date: 'desc' },
          take: 5,
          select: {
            rating: true,
            body: true,
            author: true,
            date: true,
            replyBody: true,
          },
        }),
        prisma.asoKeywordRanking.findMany({
          where: {
            appId,
            recordedAt: { gte: new Date(Date.now() - 30 * 86400000) },
          },
          orderBy: { recordedAt: 'desc' },
          take: 200,
          select: { keyword: true, position: true, recordedAt: true },
        }),
      ]
    );

    // Top keywords (ranked in top 50)
    const rankedKws = keywords.filter(
      (k) => k.position !== null && k.position <= 50
    );
    const unrankedKws = keywords.filter(
      (k) => k.position === null || k.position > 50
    );

    // Review stats
    const totalReviews = await prisma.appReview.count({ where: { appId } });
    const repliedReviews = await prisma.appReview.count({
      where: { appId, replyBody: { not: null } },
    });
    const replyRate =
      totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0;

    // Health score components
    const top10 = keywords.filter(
      (k) => k.position !== null && k.position <= 10
    ).length;
    const top50 = keywords.filter(
      (k) => k.position !== null && k.position <= 50
    ).length;
    const kwScore =
      keywords.length > 0
        ? Math.round((top10 / keywords.length) * 20) +
          Math.round((top50 / keywords.length) * 20)
        : 0;
    const ratingScore = latestRating?.rating
      ? Math.round((latestRating.rating / 5) * 20)
      : 0;
    const reviewScore =
      totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 10) : 5;
    const healthScore = kwScore + 20 + ratingScore + reviewScore; // 20 = placeholder metadata score

    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const storeName =
      app.store === Store.GOOGLEPLAY ? 'Google Play' : 'App Store';

    const stars = (n: number) =>
      '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>ASO Report — ${app.title ?? app.storeAppId}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 14px; line-height: 1.5; }
  h1 { font-size: 26px; font-weight: 700; }
  h2 { font-size: 16px; font-weight: 600; margin: 28px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; color: #374151; }
  .meta { color: #6b7280; font-size: 13px; margin-top: 4px; }
  .score-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 20px 0; }
  .score-card { flex: 1; min-width: 150px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; text-align: center; }
  .score-card .value { font-size: 28px; font-weight: 700; color: #6366f1; }
  .score-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th { text-align: left; padding: 6px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; }
  td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; border-radius: 9999px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red   { background: #fee2e2; color: #991b1b; }
  .badge-gray  { background: #f3f4f6; color: #6b7280; }
  .stars { color: #f59e0b; letter-spacing: -1px; }
  .review-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
  .review-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .review-replied { margin-top: 8px; padding: 8px; background: #f0fdf4; border-radius: 6px; font-size: 12px; color: #166534; }
  footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>

<div style="display:flex; justify-content:space-between; align-items:flex-start;">
  <div>
    <h1>${app.title ?? app.storeAppId}</h1>
    <p class="meta">${storeName} · ${app.storeAppId} · Report generated ${date}</p>
  </div>
  <div style="text-align:right">
    <div class="badge ${healthScore >= 75 ? 'badge-green' : healthScore >= 50 ? 'badge-amber' : 'badge-red'}" style="font-size:14px; padding: 6px 14px;">
      ASO Score ${healthScore}/100
    </div>
  </div>
</div>

<h2>Overview</h2>
<div class="score-row">
  <div class="score-card">
    <div class="value">${keywords.length}</div>
    <div class="label">Tracked keywords</div>
  </div>
  <div class="score-card">
    <div class="value">${top10}</div>
    <div class="label">In top 10</div>
  </div>
  <div class="score-card">
    <div class="value">${latestRating?.rating?.toFixed(1) ?? '—'}</div>
    <div class="label">Avg rating <span class="stars">${latestRating?.rating ? stars(latestRating.rating) : ''}</span></div>
  </div>
  <div class="score-card">
    <div class="value">${replyRate}%</div>
    <div class="label">Reply rate (${repliedReviews}/${totalReviews})</div>
  </div>
</div>

<h2>Keyword Rankings</h2>
${
  keywords.length === 0
    ? '<p class="meta">No keywords tracked yet.</p>'
    : `
<table>
  <thead>
    <tr>
      <th>Keyword</th>
      <th>Locale</th>
      <th>Position</th>
      <th>Status</th>
      <th>Last checked</th>
    </tr>
  </thead>
  <tbody>
    ${[...rankedKws, ...unrankedKws]
      .map(
        (kw) => `
    <tr>
      <td><strong>${kw.keyword}</strong></td>
      <td>${kw.locale}</td>
      <td>${kw.position ?? '—'}</td>
      <td><span class="badge ${kw.position === null ? 'badge-gray' : kw.position <= 10 ? 'badge-green' : kw.position <= 50 ? 'badge-amber' : 'badge-red'}">${kw.position === null ? 'Unranked' : kw.position <= 10 ? 'Top 10' : kw.position <= 50 ? 'Top 50' : 'Top 100'}</span></td>
      <td>${kw.lastCheckedAt ? new Date(kw.lastCheckedAt).toLocaleDateString() : '—'}</td>
    </tr>`
      )
      .join('')}
  </tbody>
</table>`
}

<h2>Recent Reviews</h2>
${
  reviews.length === 0
    ? '<p class="meta">No reviews yet.</p>'
    : reviews
        .map(
          (r) => `
<div class="review-card">
  <div class="review-header">
    <span class="stars">${stars(r.rating)}</span>
    <span class="meta">${r.author ?? 'Anonymous'} · ${r.date ? new Date(r.date).toLocaleDateString() : ''}</span>
  </div>
  <p>${r.body?.slice(0, 300) ?? ''}${(r.body?.length ?? 0) > 300 ? '…' : ''}</p>
  ${r.replyBody ? `<div class="review-replied"><strong>Reply:</strong> ${r.replyBody.slice(0, 200)}</div>` : ''}
</div>`
        )
        .join('')
}

<footer>
  Generated by Antigravity ASO Platform · ${date}
</footer>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${app.title ?? appId}-aso-report-${new Date().toISOString().split('T')[0]}.html"`,
      },
    });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
