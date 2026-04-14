import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getArticle,
  getArticlesByCategory,
  CATEGORIES,
} from '@/lib/help/articles';
import { CONTENT } from '@/lib/help/content';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const { ARTICLES } = await import('@/lib/help/articles');
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle(params.slug);
  if (!article) return { title: 'Not found' };
  return {
    title: `${article.title} — Antigravity Help`,
    description: article.description,
  };
}

export default function ArticlePage({ params }: Props) {
  const article = getArticle(params.slug);
  if (!article) notFound();

  const Content = CONTENT[params.slug];
  if (!Content) notFound();

  // Adjacent articles within the same category
  const siblings = getArticlesByCategory(article.category);
  const idx = siblings.findIndex((a) => a.slug === params.slug);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 flex gap-10">
      {/* Sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-20 space-y-6">
          {CATEGORIES.map((cat) => {
            const arts = getArticlesByCategory(cat);
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {cat}
                </p>
                <ul className="space-y-0.5">
                  {arts.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/help/${a.slug}`}
                        className={`block text-xs px-2 py-1.5 rounded transition-colors ${
                          a.slug === params.slug
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        }`}
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Article */}
      <article className="flex-1 min-w-0">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-6 flex items-center gap-1.5">
          <Link href="/help" className="hover:text-foreground">
            Help
          </Link>
          <span>›</span>
          <span>{article.category}</span>
          <span>›</span>
          <span className="text-foreground">{article.title}</span>
        </nav>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{article.icon}</span>
          <h1 className="text-2xl font-bold">{article.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          {article.description}
        </p>

        <div className="prose-sm max-w-none">
          <Content />
        </div>

        {/* Prev / Next */}
        <div className="mt-12 pt-6 border-t border-border flex justify-between gap-4">
          {prev ? (
            <Link
              href={`/help/${prev.slug}`}
              className="group flex items-start gap-2 text-sm max-w-[45%]"
            >
              <span className="text-muted-foreground group-hover:text-foreground mt-0.5">
                ←
              </span>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                  Previous
                </p>
                <p className="font-medium group-hover:text-primary transition-colors">
                  {prev.title}
                </p>
              </div>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/help/${next.slug}`}
              className="group flex items-start gap-2 text-sm text-right max-w-[45%] ml-auto"
            >
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                  Next
                </p>
                <p className="font-medium group-hover:text-primary transition-colors">
                  {next.title}
                </p>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground mt-0.5">
                →
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </article>
    </div>
  );
}
