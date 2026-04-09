import {
  AppStoreAnalyticsReport,
  AppStoreAnalyticsReportRequest,
} from '@/types/app-store';
import { gunzip } from 'zlib';
import { promisify } from 'util';

const gunzipAsync = promisify(gunzip);

export async function requestReport(
  token: string,
  appId: string
): Promise<string> {
  const response = await fetch(
    'https://api.appstoreconnect.apple.com/v1/analyticsReportRequests',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          type: 'analyticsReportRequests',
          attributes: {
            accessType: 'ONGOING',
          },
          relationships: {
            app: {
              data: {
                type: 'apps',
                id: appId,
              },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to request analytics report: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.data.id;
}

export async function getAnalyticsReportRequests(
  token: string,
  appId: string
): Promise<AppStoreAnalyticsReportRequest[]> {
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/apps/${appId}/analyticsReportRequests`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get analytics report requests: ${response.statusText}`
    );
  }

  const respopnse = await response.json();
  return respopnse.data as AppStoreAnalyticsReportRequest[];
}

export async function getAnalyticsReport(
  token: string,
  appId: string,
  reportId: string
) {
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/analyticsReportRequests/${reportId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get analytics report: ${response.statusText}`);
  }

  return response.json();
}

// This checks available reports for a report request
export async function getAnalyticsReports(
  token: string,
  reportRequestId: string
) {
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/analyticsReportRequests/${reportRequestId}/reports`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get analytics reports: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data as AppStoreAnalyticsReport[];
}

// This gets the report data instances
export async function getAnalyticsReportInstances(
  token: string,
  reportId: string
) {
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/analyticsReports/${reportId}/instances`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get analytics report instances: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getAnalyticsSegments(
  token: string,
  reportInstanceId: string
): Promise<{ id: string; url: string; sizeInBytes: number }[]> {
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/analyticsReportInstances/${reportInstanceId}/segments`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get analytics segments: ${response.statusText}`);
  }

  const json = await response.json();
  return (json.data || []).map((segment: any) => ({
    id: segment.id,
    url: segment.attributes?.url,
    sizeInBytes: segment.attributes?.sizeInBytes,
  }));
}

/**
 * Downloads a segment from a presigned URL, decompresses gzip, and parses TSV.
 * Returns an array of row objects keyed by column header.
 */
export async function downloadAndParseSegment(
  url: string
): Promise<Record<string, string>[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download segment: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const decompressed = await gunzipAsync(buffer);
  const tsv = decompressed.toString('utf-8');

  const lines = tsv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    return Object.fromEntries(
      headers.map((h, i) => [h.trim(), values[i]?.trim() ?? ''])
    );
  });
}

/**
 * Parses engagement metrics from a TSV row.
 * Handles Apple's column name variations across report versions.
 */
export function parseEngagementRow(row: Record<string, string>): {
  date: string | null;
  impressions: number | null;
  pageViews: number | null;
  downloads: number | null;
  sessions: number | null;
  activeDevices: number | null;
} {
  const num = (v: string | undefined) => {
    if (!v || v === '' || v === '-') return null;
    const n = parseInt(v.replace(/,/g, ''), 10);
    return isNaN(n) ? null : n;
  };

  // Apple uses different column names in different report formats
  const date = row['Date'] || row['date'] || row['Day'] || null;

  const impressions = num(
    row['Impressions'] || row['impressions'] || row['Total Impressions']
  );
  const pageViews = num(
    row['Product Page Views'] || row['Page Views'] || row['pageViews']
  );
  const downloads = num(
    row['Total Downloads'] ||
      row['Units'] ||
      row['App Units'] ||
      row['downloads']
  );
  const sessions = num(row['Sessions'] || row['sessions']);
  const activeDevices = num(
    row['Active Devices'] ||
      row['activeDevices'] ||
      row['Active Devices Per Day']
  );

  return { date, impressions, pageViews, downloads, sessions, activeDevices };
}
