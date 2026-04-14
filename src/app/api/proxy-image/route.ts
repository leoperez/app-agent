import { NextResponse } from 'next/server';

// GET /api/proxy-image?url=<encoded-image-url>
// Proxies an external image for client-side canvas use (CORS bypass)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Only allow image hosts we trust
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const allowed = [
    'mzstatic.com',
    'apple.com',
    'googleusercontent.com',
    'play.google.com',
    'lh3.googleusercontent.com',
    'ssl.gstatic.com',
  ];
  if (!allowed.some((h) => parsed.hostname.endsWith(h))) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const res = await fetch(url, { headers: { Accept: 'image/*' } });
    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 502 }
    );
  }
}
