/**
 * App Store Connect API helpers for uploading screenshots.
 *
 * Flow per screenshot:
 *  1. Find (or create) appStoreVersionLocalization for the locale
 *  2. Find (or create) appScreenshotSet for the displayType
 *  3. POST /v1/appScreenshots → get upload operations
 *  4. PUT binary to the upload URL
 *  5. PATCH /v1/appScreenshots/{id} with sourceFileChecksum to commit
 *  6. Poll until uploadState = COMPLETE
 */

import { createHash } from 'crypto';

const ASC = 'https://api.appstoreconnect.apple.com/v1';

// ─── Display types ────────────────────────────────────────────────────────────

/** Map our export-target label to the ASC displayType enum */
export function labelToDisplayType(label: string): string {
  const map: Record<string, string> = {
    'iPhone 6.9"': 'APP_IPHONE_69',
    'iPhone 6.7"': 'APP_IPHONE_67',
    'iPad 13"': 'APP_IPAD_PRO_3GEN_129',
    'Google Play phone': 'APP_IPHONE_69', // Google Play doesn't use ASC
  };
  return map[label] ?? 'APP_IPHONE_69';
}

// ─── Version localization ─────────────────────────────────────────────────────

export async function getOrCreateVersionLocalization(
  token: string,
  versionId: string,
  locale: string
): Promise<string> {
  // List existing localizations
  const listRes = await fetch(
    `${ASC}/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok)
    throw new Error(`Failed to list localizations: ${listRes.status}`);
  const { data } = await listRes.json();

  const existing = data.find(
    (d: { attributes: { locale: string } }) => d.attributes.locale === locale
  );
  if (existing) return existing.id as string;

  // Create
  const createRes = await fetch(`${ASC}/appStoreVersionLocalizations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale },
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: versionId },
          },
        },
      },
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(
      `Failed to create localization: ${JSON.stringify(err.errors)}`
    );
  }
  const { data: created } = await createRes.json();
  return created.id as string;
}

// ─── Screenshot set ───────────────────────────────────────────────────────────

export async function getOrCreateScreenshotSet(
  token: string,
  localizationId: string,
  displayType: string
): Promise<string> {
  const listRes = await fetch(
    `${ASC}/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok)
    throw new Error(`Failed to list screenshot sets: ${listRes.status}`);
  const { data } = await listRes.json();

  const existing = data.find(
    (d: { attributes: { screenshotDisplayType: string } }) =>
      d.attributes.screenshotDisplayType === displayType
  );
  if (existing) return existing.id as string;

  const createRes = await fetch(`${ASC}/appScreenshotSets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: displayType },
        relationships: {
          appStoreVersionLocalization: {
            data: { type: 'appStoreVersionLocalizations', id: localizationId },
          },
        },
      },
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(
      `Failed to create screenshot set: ${JSON.stringify(err.errors)}`
    );
  }
  const { data: created } = await createRes.json();
  return created.id as string;
}

// ─── Single screenshot upload ─────────────────────────────────────────────────

export async function uploadScreenshot(
  token: string,
  screenshotSetId: string,
  pngBuffer: Buffer,
  fileName: string
): Promise<{ id: string; state: string }> {
  const fileSize = pngBuffer.length;

  // 1. Reserve slot
  const reserveRes = await fetch(`${ASC}/appScreenshots`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'appScreenshots',
        attributes: { fileName, fileSize },
        relationships: {
          appScreenshotSet: {
            data: { type: 'appScreenshotSets', id: screenshotSetId },
          },
        },
      },
    }),
  });
  if (!reserveRes.ok) {
    const err = await reserveRes.json();
    throw new Error(
      `Failed to reserve screenshot slot: ${JSON.stringify(err.errors)}`
    );
  }
  const { data: reserved } = await reserveRes.json();
  const screenshotId = reserved.id as string;
  const uploadOps = reserved.attributes.uploadOperations as Array<{
    method: string;
    url: string;
    length: number;
    offset: number;
    requestHeaders: Array<{ name: string; value: string }>;
  }>;

  // 2. Upload each chunk (usually just one)
  for (const op of uploadOps) {
    const chunk = pngBuffer.slice(op.offset, op.offset + op.length);
    const headers: Record<string, string> = {};
    for (const h of op.requestHeaders) {
      headers[h.name] = h.value;
    }
    const uploadRes = await fetch(op.url, {
      method: op.method,
      headers,
      body: chunk,
    });
    if (!uploadRes.ok) {
      throw new Error(`Upload chunk failed: ${uploadRes.status}`);
    }
  }

  // 3. Compute MD5 checksum and commit
  const md5 = createHash('md5').update(pngBuffer).digest('hex');
  const commitRes = await fetch(`${ASC}/appScreenshots/${screenshotId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'appScreenshots',
        id: screenshotId,
        attributes: { uploaded: true, sourceFileChecksum: md5 },
      },
    }),
  });
  if (!commitRes.ok) {
    const err = await commitRes.json();
    throw new Error(
      `Failed to commit screenshot: ${JSON.stringify(err.errors)}`
    );
  }
  const { data: committed } = await commitRes.json();
  return {
    id: screenshotId,
    state: committed.attributes.assetDeliveryState?.state ?? 'UPLOADED',
  };
}

// ─── List screenshots from an existing screenshot set ────────────────────────

export interface AscScreenshot {
  id: string;
  fileName: string;
  imageUrl: string | null;
  width: number;
  height: number;
  displayType: string;
  uploadState: string;
}

/** List all screenshots for a given appScreenshotSetId */
export async function listScreenshotsInSet(
  token: string,
  screenshotSetId: string
): Promise<AscScreenshot[]> {
  const res = await fetch(
    `${ASC}/appScreenshotSets/${screenshotSetId}/appScreenshots?limit=30`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((d) => ({
    id: d.id,
    fileName: d.attributes?.fileName ?? '',
    imageUrl:
      d.attributes?.imageAsset?.templateUrl
        ?.replace('{w}', '375')
        .replace('{h}', '812')
        .replace('{f}', 'jpg') ?? null,
    width: d.attributes?.imageAsset?.width ?? 0,
    height: d.attributes?.imageAsset?.height ?? 0,
    displayType: '',
    uploadState: d.attributes?.assetDeliveryState?.state ?? '',
  }));
}

/** List all screenshot sets for a localization and return sets with their screenshots */
export async function listScreenshotSetsForLocalization(
  token: string,
  localizationId: string
): Promise<
  Array<{ displayType: string; setId: string; screenshots: AscScreenshot[] }>
> {
  const res = await fetch(
    `${ASC}/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const { data } = await res.json();

  const result = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any[]).map(async (set) => {
      const screenshots = await listScreenshotsInSet(token, set.id);
      return {
        displayType: set.attributes?.screenshotDisplayType ?? '',
        setId: set.id,
        screenshots: screenshots.map((s) => ({
          ...s,
          displayType: set.attributes?.screenshotDisplayType ?? '',
        })),
      };
    })
  );
  return result;
}

// ─── Find editable app version ────────────────────────────────────────────────

export async function findEditableVersion(
  token: string,
  ascAppId: string
): Promise<string | null> {
  const editableStates = [
    'PREPARE_FOR_SUBMISSION',
    'WAITING_FOR_REVIEW',
    'IN_REVIEW',
    'DEVELOPER_REJECTED',
    'REJECTED',
    'METADATA_REJECTED',
  ];
  const res = await fetch(
    `${ASC}/apps/${ascAppId}/appStoreVersions?filter[appStoreState]=${editableStates.join(',')}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const { data } = await res.json();
  return data[0]?.id ?? null;
}
