'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdHistory, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { useGetMetadataHistory } from '@/lib/swr/aso';
import { formatDistanceToNow } from 'date-fns';
import { LocaleCode } from '@/lib/utils/locale';
import { useApp } from '@/context/app';
import { Store } from '@/types/aso';

type Field = { label: string; key: keyof typeof FIELDS };
const FIELDS = {
  title: 'Title',
  subtitle: 'Subtitle',
  keywords: 'Keywords',
  description: 'Description',
  shortDescription: 'Short description',
  fullDescription: 'Full description',
} as const;

function diffWords(a: string, b: string): React.ReactNode {
  if (a === b)
    return <span className="text-muted-foreground text-xs">{b}</span>;
  return (
    <span className="text-xs">
      <span className="line-through text-red-400 mr-1">
        {a.slice(0, 80)}
        {a.length > 80 ? '…' : ''}
      </span>
      <span className="text-green-600">
        {b.slice(0, 80)}
        {b.length > 80 ? '…' : ''}
      </span>
    </span>
  );
}

interface MetadataHistoryProps {
  locale: LocaleCode;
}

export function MetadataHistory({ locale }: MetadataHistoryProps) {
  const appInfo = useApp();
  const [open, setOpen] = useState(false);
  const { history, loading } = useGetMetadataHistory(
    appInfo?.currentApp?.id || '',
    locale,
    open
  );

  const isGPlay = appInfo?.currentApp?.store === Store.GOOGLEPLAY;
  const fields: Field[] = isGPlay
    ? [
        { label: 'Title', key: 'title' },
        { label: 'Short description', key: 'shortDescription' },
        { label: 'Full description', key: 'fullDescription' },
      ]
    : [
        { label: 'Title', key: 'title' },
        { label: 'Subtitle', key: 'subtitle' },
        { label: 'Keywords', key: 'keywords' },
        { label: 'Description', key: 'description' },
      ];

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MdHistory className="h-4 w-4" />
          <span>Metadata history</span>
          {history.length > 0 && !loading && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </div>
        {open ? (
          <MdExpandLess className="h-4 w-4 text-muted-foreground" />
        ) : (
          <MdExpandMore className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3 pb-3 pt-2 space-y-3 max-h-72 overflow-y-auto">
              {loading && (
                <p className="text-xs text-muted-foreground py-2">Loading…</p>
              )}
              {!loading && history.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No history yet — changes are recorded each time you publish.
                </p>
              )}
              {history.map((entry, i) => {
                const prev = history[i + 1];
                return (
                  <div key={entry.id} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {entry.version ? `v${entry.version} · ` : ''}
                      {formatDistanceToNow(new Date(entry.pushedAt), {
                        addSuffix: true,
                      })}
                    </p>
                    <div className="space-y-1 pl-2 border-l-2 border-border">
                      {fields.map(({ label, key }) => {
                        const curr = (entry as any)[key] as string | null;
                        const old = prev
                          ? ((prev as any)[key] as string | null)
                          : null;
                        if (!curr) return null;
                        return (
                          <div key={key}>
                            <span className="text-xs text-muted-foreground font-medium mr-1">
                              {label}:
                            </span>
                            {prev && old !== curr ? (
                              diffWords(old ?? '', curr)
                            ) : (
                              <span className="text-xs">
                                {curr.slice(0, 80)}
                                {curr.length > 80 ? '…' : ''}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
