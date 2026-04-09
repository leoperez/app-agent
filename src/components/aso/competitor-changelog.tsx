'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { MdHistory, MdExpandMore } from 'react-icons/md';
import { useTranslations } from 'next-intl';

export interface ChangeEntry {
  id: string;
  field: string;
  previousValue: string | null;
  newValue: string | null;
  detectedAt: string;
  competitor: {
    id: string;
    title: string;
    competitorId: string;
    iconUrl: string | null;
  };
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  description: 'Description',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

interface CompetitorChangelogProps {
  changes: ChangeEntry[];
  loading?: boolean;
}

export default function CompetitorChangelog({
  changes,
  loading,
}: CompetitorChangelogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('aso');

  if (loading || changes.length === 0) return null;

  return (
    <div className="border-t border-border mt-2 pt-2">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MdHistory className="w-4 h-4" />
          {t('competitor-changelog-title')}
          <span className="ml-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
            {changes.length}
          </span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <MdExpandMore className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1 pb-2 max-h-64 overflow-y-auto">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {change.competitor.title}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {timeAgo(change.detectedAt)}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {FIELD_LABELS[change.field] ?? change.field}
                    </span>{' '}
                    {t('competitor-changelog-changed')}
                  </div>
                  {change.previousValue && (
                    <p className="line-through text-muted-foreground truncate">
                      {change.previousValue.slice(0, 120)}
                      {change.previousValue.length > 120 ? '…' : ''}
                    </p>
                  )}
                  <p className="text-foreground truncate">
                    {(change.newValue ?? '—').slice(0, 120)}
                    {(change.newValue ?? '').length > 120 ? '…' : ''}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
