/**
 * Validates the Vercel cron secret from the Authorization header.
 * Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
 * Returns a 401 Response if invalid, null if valid.
 */
export function validateCronSecret(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return null; // Skip check in dev if not configured

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
