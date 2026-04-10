import { getGooglePlayClient } from './client';

export interface GooglePlayReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  reviewerNickname: string;
  createdDate: string;
  territory: string | null;
  responseId: string | null;
  responseBody: string | null;
}

export async function listReviews(
  serviceAccountKey: string,
  packageName: string,
  maxResults = 50
): Promise<GooglePlayReview[]> {
  const client = await getGooglePlayClient(serviceAccountKey);
  const res = await client.reviews.list({
    packageName,
    maxResults,
    translationLanguage: 'en',
  });

  return (res.data.reviews ?? []).map((r) => {
    const comment = r.comments?.[0]?.userComment;
    const devComment = r.comments?.find(
      (c) => c.developerComment
    )?.developerComment;
    return {
      id: r.reviewId ?? '',
      rating: comment?.starRating ?? 0,
      title: null,
      body: comment?.text ?? '',
      reviewerNickname: r.authorName ?? 'Anonymous',
      createdDate: comment?.lastModified?.seconds
        ? new Date(Number(comment.lastModified.seconds) * 1000).toISOString()
        : new Date().toISOString(),
      territory: null,
      responseId: devComment ? (r.reviewId ?? null) : null,
      responseBody: devComment?.text ?? null,
    };
  });
}

export async function replyToReview(
  serviceAccountKey: string,
  packageName: string,
  reviewId: string,
  replyText: string
): Promise<void> {
  const client = await getGooglePlayClient(serviceAccountKey);
  await client.reviews.reply({
    packageName,
    reviewId,
    requestBody: { replyText },
  });
}
