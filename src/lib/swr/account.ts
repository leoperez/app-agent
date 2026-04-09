export async function deleteAccount() {
  const response = await fetch(`/api/account`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function setLocale(locale: string) {
  const response = await fetch(`/api/account/locale`, {
    method: 'POST',
    body: JSON.stringify({ locale }),
  });
  return response.json();
}

export async function getNotificationPrefs(): Promise<{
  notifyCompetitorChanges: boolean;
  slackWebhookUrl: string | null;
  ratingAlertThreshold: number | null;
}> {
  const response = await fetch(`/api/account/notifications`);
  return response.json();
}

export async function setNotificationPrefs(prefs: {
  notifyCompetitorChanges?: boolean;
  slackWebhookUrl?: string | null;
  ratingAlertThreshold?: number | null;
}) {
  const response = await fetch(`/api/account/notifications`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
  return response.json();
}
