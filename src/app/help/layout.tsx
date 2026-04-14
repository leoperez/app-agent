import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center — Antigravity',
  description:
    'Guides and FAQs for Antigravity — the ASO platform for iOS and Android apps.',
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-lg font-bold hover:opacity-80 transition-opacity"
            >
              Antigravity
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/help"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Help Center
            </Link>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
          >
            Back to dashboard →
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Antigravity ·{' '}
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>{' '}
        ·{' '}
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
      </footer>
    </div>
  );
}
