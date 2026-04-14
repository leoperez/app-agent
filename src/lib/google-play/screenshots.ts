import { Readable } from 'stream';
import { getGooglePlayClient } from './client';

// ─── Image type mapping ────────────────────────────────────────────────────────

/** Map our export-target label to the Google Play imageType enum */
export function labelToImageType(label: string): string {
  const map: Record<string, string> = {
    'Google Play phone': 'phoneScreenshots',
    'Feature Graphic': 'featureGraphic',
    // Tablet targets (for future use)
    'Google Play 7" tablet': 'sevenInchScreenshots',
    'Google Play 10" tablet': 'tenInchScreenshots',
  };
  return map[label] ?? 'phoneScreenshots';
}

// ─── Upload flow ───────────────────────────────────────────────────────────────

/**
 * Replace all screenshots (or the feature graphic) for a given language +
 * imageType in one atomic edit.
 *
 * Flow:
 *  1. edits.insert        → create a transient edit
 *  2. edits.images.deleteall → clear existing images for this slot
 *  3. edits.images.upload  → upload each new image
 *  4. edits.commit         → publish the edit
 */
export async function pushScreenshotsToGooglePlay({
  serviceAccountKey,
  packageName,
  language,
  imageType,
  images, // array of PNG Buffers
}: {
  serviceAccountKey: string;
  packageName: string;
  language: string;
  imageType: string;
  images: Buffer[];
}): Promise<{ uploaded: number }> {
  const client = await getGooglePlayClient(serviceAccountKey);

  // 1. Create edit
  const editRes = await client.edits.insert({ packageName });
  const editId = editRes.data.id;
  if (!editId) throw new Error('Failed to create Google Play edit');

  try {
    // 2. Delete existing images for this slot (idempotent)
    await client.edits.images.deleteall({
      packageName,
      editId,
      language,
      imageType,
    });

    // 3. Upload each image
    let uploaded = 0;
    for (const buf of images) {
      const stream = Readable.from(buf);
      await client.edits.images.upload({
        packageName,
        editId,
        language,
        imageType,
        media: {
          mimeType: 'image/png',
          body: stream,
        },
      });
      uploaded++;
    }

    // 4. Commit edit
    await client.edits.commit({ packageName, editId });

    return { uploaded };
  } catch (err) {
    // Attempt to delete the edit on failure so it doesn't linger
    try {
      await client.edits.delete({ packageName, editId });
    } catch {
      // ignore cleanup errors
    }
    throw err;
  }
}
