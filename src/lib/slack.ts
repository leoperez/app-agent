/**
 * Send a plain-text message to a Slack incoming webhook URL.
 * Returns silently if the URL is empty/null — callers don't need to guard.
 */
export async function sendSlackMessage(
  webhookUrl: string | null | undefined,
  text: string
): Promise<void> {
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    console.error(
      `slack: webhook POST failed ${res.status} ${await res.text()}`
    );
  }
}
