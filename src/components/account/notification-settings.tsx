'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { MdNotifications } from 'react-icons/md';
import { useTranslations } from 'next-intl';
import { getNotificationPrefs, setNotificationPrefs } from '@/lib/swr/account';
import { toast } from 'react-hot-toast';

export function NotificationSettings() {
  const t = useTranslations('account');
  const [notifyCompetitorChanges, setNotifyCompetitorChanges] = useState(true);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSlack, setSavingSlack] = useState(false);

  useEffect(() => {
    getNotificationPrefs()
      .then((prefs) => {
        setNotifyCompetitorChanges(prefs.notifyCompetitorChanges);
        setSlackWebhookUrl(prefs.slackWebhookUrl ?? '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (value: boolean) => {
    setNotifyCompetitorChanges(value);
    setSaving(true);
    try {
      await setNotificationPrefs({ notifyCompetitorChanges: value });
      toast.success(t('notifications-saved'));
    } catch {
      setNotifyCompetitorChanges(!value); // revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleSlackSave = async () => {
    setSavingSlack(true);
    try {
      await setNotificationPrefs({ slackWebhookUrl: slackWebhookUrl || null });
      toast.success(t('notifications-saved'));
    } catch {
      toast.error(t('notifications-save-error'));
    } finally {
      setSavingSlack(false);
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
              <div className="h-12 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
              <div className="h-16 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ) : (
            <>
              {/* Email toggle */}
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="mt-0.5">
                  <button
                    role="switch"
                    aria-checked={notifyCompetitorChanges}
                    disabled={saving}
                    onClick={() => handleToggle(!notifyCompetitorChanges)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      notifyCompetitorChanges ? 'bg-primary' : 'bg-input'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        notifyCompetitorChanges
                          ? 'translate-x-4'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">
                    {t('notify-competitor-changes')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('notify-competitor-changes-description')}
                  </p>
                </div>
              </label>

              {/* Slack webhook */}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('slack-webhook')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('slack-webhook-description')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <button
                    onClick={handleSlackSave}
                    disabled={savingSlack}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingSlack ? t('saving') : t('save')}
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
