const BASE = 'https://api.appstoreconnect.apple.com/v1';

export interface CustomProductPage {
  id: string;
  name: string;
  url: string | null;
  visible: boolean;
  versionId: string | null;
  versionState: string | null;
}

export interface CustomProductPageLocalization {
  id: string;
  locale: string;
  promotionalText: string | null;
}

// List all custom product pages for an app
export async function listCustomProductPages(
  token: string,
  appId: string
): Promise<CustomProductPage[]> {
  const res = await fetch(
    `${BASE}/apps/${appId}/appCustomProductPages?include=appCustomProductPageVersions&limit=35`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok)
    throw new Error(`Failed to list custom product pages: ${res.status}`);
  const json = await res.json();

  return (json.data ?? []).map((page: any) => {
    const versionRel =
      page.relationships?.appCustomProductPageVersions?.data?.[0];
    const version = json.included?.find(
      (i: any) =>
        i.type === 'appCustomProductPageVersions' && i.id === versionRel?.id
    );
    return {
      id: page.id,
      name: page.attributes?.name ?? '',
      url: page.attributes?.url ?? null,
      visible: page.attributes?.visible ?? false,
      versionId: version?.id ?? null,
      versionState: version?.attributes?.state ?? null,
    };
  });
}

// Create a new custom product page
export async function createCustomProductPage(
  token: string,
  appId: string,
  name: string
): Promise<{ pageId: string; versionId: string }> {
  // 1. Create page
  const pageRes = await fetch(`${BASE}/appCustomProductPages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'appCustomProductPages',
        attributes: { name },
        relationships: {
          app: { data: { type: 'apps', id: appId } },
        },
      },
    }),
  });
  if (!pageRes.ok) {
    const err = await pageRes.text();
    throw new Error(`Failed to create page: ${err}`);
  }
  const pageJson = await pageRes.json();
  const pageId = pageJson.data.id;

  // 2. Create a draft version for the page
  const versionRes = await fetch(`${BASE}/appCustomProductPageVersions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'appCustomProductPageVersions',
        relationships: {
          appCustomProductPage: {
            data: { type: 'appCustomProductPages', id: pageId },
          },
        },
      },
    }),
  });
  if (!versionRes.ok) {
    const err = await versionRes.text();
    throw new Error(`Failed to create page version: ${err}`);
  }
  const versionJson = await versionRes.json();
  return { pageId, versionId: versionJson.data.id };
}

// Delete a custom product page
export async function deleteCustomProductPage(
  token: string,
  pageId: string
): Promise<void> {
  const res = await fetch(`${BASE}/appCustomProductPages/${pageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to delete page: ${res.status}`);
  }
}

// List localizations for a page version
export async function listPageLocalizations(
  token: string,
  versionId: string
): Promise<CustomProductPageLocalization[]> {
  const res = await fetch(
    `${BASE}/appCustomProductPageVersions/${versionId}/appCustomProductPageLocalizations`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok)
    throw new Error(`Failed to list page localizations: ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map((loc: any) => ({
    id: loc.id,
    locale: loc.attributes?.locale ?? '',
    promotionalText: loc.attributes?.promotionalText ?? null,
  }));
}

// Create a localization for a page version
export async function createPageLocalization(
  token: string,
  versionId: string,
  locale: string,
  promotionalText: string
): Promise<CustomProductPageLocalization> {
  const res = await fetch(`${BASE}/appCustomProductPageLocalizations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'appCustomProductPageLocalizations',
        attributes: { locale, promotionalText },
        relationships: {
          appCustomProductPageVersion: {
            data: { type: 'appCustomProductPageVersions', id: versionId },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create localization: ${err}`);
  }
  const json = await res.json();
  return {
    id: json.data.id,
    locale: json.data.attributes?.locale ?? locale,
    promotionalText: json.data.attributes?.promotionalText ?? null,
  };
}

// Update a localization's promotional text
export async function updatePageLocalization(
  token: string,
  localizationId: string,
  promotionalText: string
): Promise<void> {
  const res = await fetch(
    `${BASE}/appCustomProductPageLocalizations/${localizationId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'appCustomProductPageLocalizations',
          id: localizationId,
          attributes: { promotionalText },
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update localization: ${err}`);
  }
}
