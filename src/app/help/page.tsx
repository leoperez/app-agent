import Link from 'next/link';
import {
  ARTICLES,
  CATEGORIES,
  getArticlesByCategory,
} from '@/lib/help/articles';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center — Antigravity',
  description:
    'Guides and FAQs for Antigravity — Screenshot Studio, App Store Connect, Google Play, and more.',
};

export default function HelpPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">Help Center</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Guides and documentation for every feature in Antigravity.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
        {[
          {
            title: 'Getting started',
            href: '/help/what-is-antigravity',
            desc: 'New here? Start with the overview.',
            icon: '🚀',
          },
          {
            title: 'Screenshot Studio',
            href: '/help/screenshot-studio-overview',
            desc: 'Design, export, and push to stores.',
            icon: '🖼️',
          },
          {
            title: 'Connect your stores',
            href: '/help/connect-app-store-connect',
            desc: 'Set up API credentials.',
            icon: '🔑',
          },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="rounded-xl border border-border p-5 hover:border-primary/50 hover:bg-muted/20 transition-colors"
          >
            <div className="text-2xl mb-2">{q.icon}</div>
            <p className="font-semibold text-sm mb-1">{q.title}</p>
            <p className="text-xs text-muted-foreground">{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Articles by category */}
      <div className="space-y-10">
        {CATEGORIES.map((cat) => {
          const articles = getArticlesByCategory(cat);
          return (
            <section key={cat}>
              <h2 className="text-base font-semibold mb-4 text-foreground border-b border-border pb-2">
                {cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {articles.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/help/${a.slug}`}
                    className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/30 transition-colors group"
                  >
                    <span className="text-xl shrink-0 mt-0.5">{a.icon}</span>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {a.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Contact */}
      <div className="mt-14 rounded-xl border border-border bg-muted/10 p-6 text-center">
        <p className="text-sm font-medium mb-1">
          Can't find what you're looking for?
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Our team usually responds within one business day.
        </p>
        <a
          href="mailto:support@antigravity.app"
          className="text-xs bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
