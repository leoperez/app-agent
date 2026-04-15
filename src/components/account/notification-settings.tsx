'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { MdNotifications, MdNotificationsActive } from 'react-icons/md';
import { useTranslations } from 'next-intl';
import { getNotificationPrefs, setNotificationPrefs } from '@/lib/swr/account';
import { toast } from 'react-hot-toast';

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    return null;
  const reg = await navigator.serviceWorker.register('/sw.js');
  const { publicKey } = await fetch('/api/account/push-subscribe').then((r) =>
    r.json()
  );
  if (!publicKey) return null;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey,
  });
  return sub;
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await fetch('/api/account/push-subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
}

type BoolPref =
  | 'notifyKeywordDrop'
  | 'notifyKeywordRise'
  | 'notifyCompetitorChanges'
  | 'notifyRatingDrop'
  | 'weeklyDigestEnabled';

const PREF_LABELS: Record<BoolPref, { title: string; description: string }> = {
  notifyKeywordDrop: {
    title: 'Keyword rank drops',
    description:
      'Email when a tracked keyword drops 5+ positions or exits top 100.',
  },
  notifyKeywordRise: {
    title: 'Keyword rank improvements',
    description:
      'Email when a tracked keyword rises 10+ positions or enters top 10.',
  },
  notifyCompetitorChanges: {
    title: 'Competitor changes',
    description:
      'Email when a tracked competitor updates their metadata or rating.',
  },
  notifyRatingDrop: {
    title: 'Rating drops',
    description:
      'Email when your app rating falls below the threshold set below.',
  },
  weeklyDigestEnabled: {
    title: 'Weekly ASO digest',
    description:
      'A weekly summary of keyword rankings, ratings, and review activity.',
  },
};

export function NotificationSettings() {
  const t = useTranslations('account');
  const [prefs, setPrefs] = useState<Record<BoolPref, boolean>>({
    notifyKeywordDrop: true,
    notifyKeywordRise: true,
    notifyCompetitorChanges: true,
    notifyRatingDrop: true,
    weeklyDigestEnabled: true,
  });
  const [ratingThreshold, setRatingThreshold] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingPref, setSavingPref] = useState<BoolPref | null>(null);
  const [savingRating, setSavingRating] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Check current push subscription status
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    });
  }, []);

  useEffect(() => {
    getNotificationPrefs()
      .then((p) => {
        setPrefs({
          notifyKeywordDrop: p.notifyKeywordDrop ?? true,
          notifyKeywordRise: p.notifyKeywordRise ?? true,
          notifyCompetitorChanges: p.notifyCompetitorChanges ?? true,
          notifyRatingDrop: p.notifyRatingDrop ?? true,
          weeklyDigestEnabled: p.weeklyDigestEnabled ?? true,
        });
        setRatingThreshold(p.ratingAlertThreshold?.toString() ?? '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: BoolPref, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSavingPref(key);
    try {
      await setNotificationPrefs({ [key]: value });
      toast.success(t('notifications-saved'));
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSavingPref(null);
    }
  };

  const handleRatingThresholdSave = async () => {
    setSavingRating(true);
    try {
      const val = ratingThreshold.trim() ? parseFloat(ratingThreshold) : null;
      await setNotificationPrefs({ ratingAlertThreshold: val });
      toast.success(t('notifications-saved'));
    } catch {
      toast.error(t('notifications-save-error'));
    } finally {
      setSavingRating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center space-x-2">
          <MdNotifications className="h-5 w-5" />
          <div>
            <h2 className="text-xl font-semibold">{t('notifications')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('notifications-description')}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Granular email toggles */}
              <div className="space-y-4">
                {(Object.keys(PREF_LABELS) as BoolPref[]).map((key) => (
                  <label
                    key={key}
                    className="flex items-start gap-4 cursor-pointer"
                  >
                    <div className="mt-0.5 shrink-0">
                      <button
                        role="switch"
                        aria-checked={prefs[key]}
                        disabled={savingPref === key}
                        onClick={() => handleToggle(key, !prefs[key])}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          prefs[key] ? 'bg-primary' : 'bg-input'
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            prefs[key] ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {PREF_LABELS[key].title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {PREF_LABELS[key].description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Browser push notifications */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <MdNotificationsActive className="h-4 w-4 text-primary" />
                      Browser push notifications
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Receive instant alerts in your browser, even when the tab
                      is closed.
                    </p>
                  </div>
                  <button
                    disabled={pushLoading}
                    onClick={async () => {
                      setPushLoading(true);
                      try {
                        if (pushEnabled) {
                          await unsubscribeFromPush();
                          setPushEnabled(false);
                          toast.success('Push notifications disabled');
                        } else {
                          const perm = await Notification.requestPermission();
                          if (perm !== 'granted') {
                            toast.error(
                              'Permission denied — allow notifications in browser settings'
                            );
                            return;
                          }
                          const sub = await subscribeToPush();
                          if (!sub) {
                            toast.error('Failed to subscribe');
                            return;
                          }
                          await fetch('/api/account/push-subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(sub),
                          });
                          setPushEnabled(true);
                          toast.success('Push notifications enabled');
                        }
                      } catch {
                        toast.error('Failed to update push settings');
                      } finally {
                        setPushLoading(false);
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      pushEnabled ? 'bg-primary' : 'bg-input'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        pushEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Rating alert threshold */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm font-medium">
                  {t('rating-alert-threshold')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('rating-alert-threshold-description')}
                </p>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground">★</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    placeholder="e.g. 4.0"
                    value={ratingThreshold}
                    onChange={(e) => setRatingThreshold(e.target.value)}
                    className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handleRatingThresholdSave}
                    disabled={savingRating}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingRating ? t('saving') : t('save')}
                  </button>
                  {ratingThreshold && (
                    <button
                      onClick={() => {
                        setRatingThreshold('');
                        setNotificationPrefs({ ratingAlertThreshold: null });
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
