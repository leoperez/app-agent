const BASE = 'https://api.appstoreconnect.apple.com/v1';

export interface AppStoreReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  reviewerNickname: string;
  createdDate: string;
  territory: string;
  responseId: string | null;
  responseBody: string | null;
}

export async function listReviews(
  token: string,
  appId: string,
  limit = 50
): Promise<AppStoreReview[]> {
  const params = new URLSearchParams({
    include: 'response',
    sort: '-createdDate',
    limit: String(limit),
    'fields[customerReviews]':
      'rating,title,body,reviewerNickname,createdDate,territory,response',
    'fields[customerReviewResponses]': 'responseBody,state',
  });
  const res = await fetch(`${BASE}/apps/${appId}/customerReviews?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`App Store reviews fetch failed: ${res.status}`);
  const json = await res.json();

  // Build a map of included responses
  const responseMap: Record<string, { id: string; body: string }> = {};
  for (const inc of json.included ?? []) {
    if (inc.type === 'customerReviewResponses') {
      responseMap[inc.id] = { id: inc.id, body: inc.attributes.responseBody };
    }
  }

  return (json.data ?? []).map((d: any) => {
    const responseRelId = d.relationships?.response?.data?.id ?? null;
    const response = responseRelId ? responseMap[responseRelId] : null;
    return {
      id: d.id,
      rating: d.attributes.rating,
      title: d.attributes.title ?? null,
      body: d.attributes.body,
      reviewerNickname: d.attributes.reviewerNickname,
      createdDate: d.attributes.createdDate,
      territory: d.attributes.territory,
      responseId: response?.id ?? null,
      responseBody: response?.body ?? null,
    };
  });
}

export async function replyToReview(
  token: string,
  reviewId: string,
  responseBody: string
): Promise<string> {
  const res = await fetch(`${BASE}/customerReviewResponses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'customerReviewResponses',
        attributes: { responseBody },
        relationships: {
          review: { data: { type: 'customerReviews', id: reviewId } },
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`App Store reply failed: ${res.status} ${err}`);
  }
  const json = await res.json();
  return json.data.id as string;
}

export async function updateReply(
  token: string,
  responseId: string,
  responseBody: string
): Promise<void> {
  const res = await fetch(`${BASE}/customerReviewResponses/${responseId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'customerReviewResponses',
        id: responseId,
        attributes: { responseBody },
      },
    }),
  });
  if (!res.ok) throw new Error(`App Store update reply failed: ${res.status}`);
}

export async function deleteReply(
  token: string,
  responseId: string
): Promise<void> {
  const res = await fetch(`${BASE}/customerReviewResponses/${responseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`App Store delete reply failed: ${res.status}`);
}
