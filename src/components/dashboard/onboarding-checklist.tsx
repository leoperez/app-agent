'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdClose,
  MdRocketLaunch,
} from 'react-icons/md';
import { useApp } from '@/context/app';
import { useGetTeamOverview } from '@/lib/swr/team';
import { useTeam } from '@/context/team';
import { useGetAppLocalizations } from '@/lib/swr/app';
import { AppLocalization } from '@/types/aso';
import { useTranslations } from 'next-intl';

const STEP_IDS = [
  'connect-app',
  'fill-metadata',
  'track-keywords',
  'monitor-rating',
  'schedule-publish',
] as const;

type StepId = (typeof STEP_IDS)[number];

function computeDone(
  apps: { id: string }[],
  localizations:
    | Record<string, { public?: AppLocalization; draft?: AppLocalization }>
    | null
    | undefined,
  overviewEntry:
    | {
        keywordCount: number;
        latestRating: number | null;
        pendingSchedule: string | null;
      }
    | undefined
): Record<StepId, boolean> {
  const locList = localizations ? Object.values(localizations) : [];
  const metadataFilled = locList.some((entry) => {
    const loc = entry.draft ?? entry.public;
    return (
      !!loc?.title?.trim() &&
      !!(loc?.keywords?.trim() || loc?.shortDescription?.trim())
    );
  });

  return {
    'connect-app': apps.length > 0,
    'fill-metadata': metadataFilled,
    'track-keywords': (overviewEntry?.keywordCount ?? 0) > 0,
    'monitor-rating':
      overviewEntry?.latestRating !== null &&
      overviewEntry?.latestRating !== undefined,
    'schedule-publish': !!overviewEntry?.pendingSchedule,
  };
}

export function OnboardingChecklist() {
  const t = useTranslations('onboarding-checklist');
  const teamInfo = useTeam();
  const { apps, currentApp } = useApp();
  const { overview } = useGetTeamOverview();
  const { localizations } = useGetAppLocalizations(currentApp?.id ?? '');
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const storageKey = `onboarding-dismissed-${teamInfo?.currentTeam?.id}`;

  useEffect(() => {
    if (typeof window !== 'undefined' && teamInfo?.currentTeam?.id) {
      setDismissed(localStorage.getItem(storageKey) === 'true');
      setLoaded(true);
    }
  }, [storageKey, teamInfo?.currentTeam?.id]);

  const overviewEntry = overview.find((e) => e.id === currentApp?.id);
  const done = computeDone(apps ?? [], localizations, overviewEntry);
  const steps = STEP_IDS.map((id) => ({ id, done: done[id] }));
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
  };

  if (!loaded || dismissed || allDone) return null;

  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
        className="mb-6 rounded-xl border border-border bg-background shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <MdRocketLaunch className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t('title')}</span>
            <span className="text-xs text-muted-foreground ml-1">
              {doneCount}/{steps.length}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={t('dismiss')}
          >
            <MdClose className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Steps */}
        <div className="divide-y divide-border">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors ${
                step.done ? 'opacity-60' : 'hover:bg-muted/30'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {step.done ? (
                  <MdCheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <MdRadioButtonUnchecked className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p
                  className={`font-medium ${step.done ? 'line-through text-muted-foreground' : ''}`}
                >
                  {t(step.id as StepId)}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(`${step.id as StepId}-desc`)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
