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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationPrefs()
      .then((prefs) =>
        setNotifyCompetitorChanges(prefs.notifyCompetitorChanges)
      )
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
        <CardContent>
          {loading ? (
            <div className="h-12 animate-pulse bg-gray-100 rounded-lg" />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
