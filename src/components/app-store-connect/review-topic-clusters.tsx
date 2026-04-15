'use client';

import { useState } from 'react';
import { MdAutoAwesome, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import { StoreReview } from '@/lib/swr/app';
import type { TopicCluster } from '@/app/api/teams/[teamId]/apps/[appId]/reviews/topic-clusters/route';

interface ReviewTopicClustersProps {
  reviews: StoreReview[];
  teamId: string;
  appId: string;
}

const SENTIMENT_STYLES: Record<TopicCluster['sentiment'], string> = {
  positive:
    'border-green-200 bg-green-50/60 dark:border-green-800 dark:bg-green-950/20',
  negative:
    'border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20',
  mixed:
    'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20',
};

const SENTIMENT_BADGE: Record<TopicCluster['sentiment'], string> = {
  positive:
    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  mixed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

function ClusterCard({ cluster }: { cluster: TopicCluster }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-lg border overflow-hidden ${SENTIMENT_STYLES[cluster.sentiment]}`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:brightness-95 transition-all text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">{cluster.emoji}</span>
          <span className="text-sm font-medium truncate">{cluster.topic}</span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${SENTIMENT_BADGE[cluster.sentiment]}`}
          >
            {cluster.count} reviews
          </span>
        </div>
        {open ? (
          <MdExpandLess className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        ) : (
          <MdExpandMore className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        )}
      </button>

      {open && (
        <div className="border-t border-inherit px-3 pb-3 pt-2 space-y-2">
          {cluster.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cluster.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-2 py-0.5 rounded-full bg-background/60 border border-border/60"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
          {cluster.examples.map((ex, i) => (
            <p
              key={i}
              className="text-xs text-muted-foreground italic border-l-2 border-border pl-2"
            >
              &ldquo;{ex}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewTopicClusters({
  reviews,
  teamId,
  appId,
}: ReviewTopicClustersProps) {
  const [clusters, setClusters] = useState<TopicCluster[] | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!reviews.length) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/apps/${appId}/reviews/topic-clusters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviews: reviews.map((r) => ({
              body: r.body,
              rating: r.rating,
              title: r.title,
            })),
          }),
        }
      );
      if (!res.ok) throw new Error();
      const { clusters: data } = await res.json();
      setClusters(data ?? []);
    } catch {
      toast.error('Topic analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Review Topics</p>
        {!clusters && (
          <button
            onClick={analyze}
            disabled={loading || reviews.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors"
          >
            <MdAutoAwesome className="h-3 w-3" />
            {loading ? 'Analyzing…' : `Analyze ${reviews.length} reviews`}
          </button>
        )}
        {clusters && (
          <button
            onClick={() => {
              setClusters(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        )}
      </div>

      {!clusters && !loading && (
        <p className="text-xs text-muted-foreground">
          AI groups your reviews into recurring themes so you can spot what
          users love and what frustrates them.
        </p>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {clusters && clusters.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No distinct topics found.
        </p>
      )}

      {clusters && clusters.length > 0 && (
        <div className="space-y-2">
          {clusters.map((c) => (
            <ClusterCard key={c.topic} cluster={c} />
          ))}
        </div>
      )}
    </div>
  );
}
