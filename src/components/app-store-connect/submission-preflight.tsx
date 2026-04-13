'use client';

import { useState } from 'react';
import {
  MdCheckCircle,
  MdError,
  MdWarning,
  MdExpandMore,
} from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { PreflightCheck } from '@/lib/utils/publish-validation';

interface SubmissionPreflightProps {
  checks: PreflightCheck[];
}

const STATUS_ICON = {
  pass: <MdCheckCircle className="h-4 w-4 text-green-500 shrink-0" />,
  warn: <MdWarning className="h-4 w-4 text-amber-500 shrink-0" />,
  fail: <MdError className="h-4 w-4 text-red-500 shrink-0" />,
};

export function SubmissionPreflight({ checks }: SubmissionPreflightProps) {
  const [open, setOpen] = useState(false);

  const fails = checks.filter((c) => c.status === 'fail').length;
  const warns = checks.filter((c) => c.status === 'warn').length;
  const passes = checks.filter((c) => c.status === 'pass').length;

  const summaryColor =
    fails > 0
      ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
      : warns > 0
        ? 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
        : 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30';

  return (
    <div className={`rounded-lg border text-xs ${summaryColor}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2 font-medium">
          {fails > 0
            ? STATUS_ICON.fail
            : warns > 0
              ? STATUS_ICON.warn
              : STATUS_ICON.pass}
          Submission pre-flight
          <span className="font-normal text-inherit/70">
            {passes}/{checks.length} checks passed
            {fails > 0 && ` · ${fails} issue${fails > 1 ? 's' : ''}`}
            {warns > 0 && ` · ${warns} warning${warns > 1 ? 's' : ''}`}
          </span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <MdExpandMore className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-current/10 px-3 pb-3 pt-2 space-y-2">
              {checks.map((check) => (
                <div key={check.id} className="flex items-start gap-2">
                  {STATUS_ICON[check.status]}
                  <div>
                    <p className="font-medium">{check.label}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">
                      {check.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
