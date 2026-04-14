'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface HelpTooltipProps {
  /** Short inline explanation */
  text: string;
  /** Optional link to a /help article */
  articleSlug?: string;
}

/**
 * A small "?" button that shows a popover with a help text and an optional
 * link to the full help article.
 */
export function HelpTooltip({ text, articleSlug }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary text-[10px] font-bold flex items-center justify-center transition-colors"
        aria-label="Help"
      >
        ?
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-xl border border-border bg-popover shadow-xl p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {text}
          </p>
          {articleSlug && (
            <Link
              href={`/help/${articleSlug}`}
              target="_blank"
              className="mt-2 inline-block text-[10px] text-primary hover:underline"
            >
              Read full article →
            </Link>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}
