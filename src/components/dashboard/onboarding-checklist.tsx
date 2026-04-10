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

interface Step {
  id: string;
  label: string;
  description: string;
  done: boolean;
}

function computeSteps(
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
): Step[] {
  const locList = localizations ? Object.values(localizations) : [];
  const metadataFilled = locList.some((entry) => {
    const loc = entry.draft ?? entry.public;
    return (
      !!loc?.title?.trim() &&
      !!(loc?.keywords?.trim() || loc?.shortDescription?.trim())
    );
  });

  return [
    {
      id: 'connect-app',
      label: 'Connect your app',
      description: 'Add your App Store or Google Play app to start optimising.',
      done: apps.length > 0,
    },
    {
      id: 'fill-metadata',
      label: 'Fill in your metadata',
      description:
        'Set title, subtitle, keywords and description for at least one locale.',
      done: metadataFilled,
    },
    {
      id: 'track-keywords',
      label: 'Track keywords',
      description: 'Add keywords to monitor their search rankings over time.',
      done: (overviewEntry?.keywordCount ?? 0) > 0,
    },
    {
      id: 'monitor-rating',
      label: 'Monitor your rating',
      description:
        'The rating cron will automatically record daily snapshots once the app is active.',
      done:
        overviewEntry?.latestRating !== null &&
        overviewEntry?.latestRating !== undefined,
    },
    {
      id: 'schedule-publish',
      label: 'Schedule a publish',
      description:
        'Use the scheduler to push metadata updates to the store automatically.',
      done: !!overviewEntry?.pendingSchedule,
    },
  ];
}

export function OnboardingChecklist() {
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
  const steps = computeSteps(apps ?? [], localizations, overviewEntry);
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
            <span className="text-sm font-medium">Getting started</span>
            <span className="text-xs text-muted-foreground ml-1">
              {doneCount}/{steps.length} complete
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Dismiss"
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
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
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
