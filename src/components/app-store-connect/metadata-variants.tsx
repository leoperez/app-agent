'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdFlipToFront, MdDeleteOutline, MdCheckCircle } from 'react-icons/md';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { useGetMetadataVariants } from '@/lib/swr/aso';
import { AppLocalization } from '@/types/aso';

interface MetadataVariantsProps {
  appId: string;
  locale: string;
  localization: AppLocalization;
  onApply: (fields: Partial<AppLocalization>) => void;
}

export function MetadataVariants({
  appId,
  locale,
  localization,
  onApply,
}: MetadataVariantsProps) {
  const t = useTranslations('dashboard.app-store-connect.variants');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variantName, setVariantName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const { variants, loading, saveVariant, deleteVariant } =
    useGetMetadataVariants(appId, locale, open);

  const handleSave = async () => {
    if (!variantName.trim()) return;
    setSaving(true);
    try {
      await saveVariant({
        name: variantName.trim(),
        title: localization.title,
        subtitle: localization.subtitle,
        keywords: localization.keywords,
        description: localization.description,
      });
      setVariantName('');
      setShowSaveForm(false);
      toast.success(t('saved'));
    } catch {
      toast.error(t('save-error'));
    } finally {
      setSaving(false);
    }
  };

  const handleApply = (variant: (typeof variants)[0]) => {
    onApply({
      title: variant.title ?? undefined,
      subtitle: variant.subtitle ?? undefined,
      keywords: variant.keywords ?? undefined,
      description: variant.description ?? undefined,
    });
    toast.success(t('applied'));
  };

  const handleDelete = async (variantId: string) => {
    await deleteVariant(variantId);
    toast.success(t('deleted'));
  };

  return (
    <div className="border-t border-border pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MdFlipToFront className="h-3.5 w-3.5" />
        {t('title')}
        {variants.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
            {variants.length}
          </span>
        )}
        <span>{open ? '▲' : '▼'}</span>
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
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('description')}
              </p>

              {/* Save current as variant */}
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="text-xs text-primary hover:underline"
                >
                  + {t('save-current')}
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    autoFocus
                    type="text"
                    placeholder={t('name-placeholder')}
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') setShowSaveForm(false);
                    }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring dark:border-gray-700 dark:bg-gray-900"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving || !variantName.trim()}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? t('saving') : t('save')}
                  </button>
                  <button
                    onClick={() => setShowSaveForm(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('cancel')}
                  </button>
                </div>
              )}

              {/* Variant list */}
              {loading ? (
                <div className="h-8 animate-pulse bg-muted rounded" />
              ) : variants.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {t('empty')}
                </p>
              ) : (
                <div className="space-y-2">
                  {variants.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-border p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {v.isActive && (
                            <MdCheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          )}
                          <span className="text-xs font-medium">{v.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                          {v.appliedAt && (
                            <span className="text-xs text-muted-foreground">
                              · {t('applied-on')}{' '}
                              {new Date(v.appliedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApply(v)}
                            className="text-xs text-primary hover:underline"
                          >
                            {t('apply')}
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <MdDeleteOutline className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {v.title && (
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="font-medium">
                            {t('field-title')}:
                          </span>{' '}
                          {v.title}
                        </p>
                      )}
                      {v.keywords && (
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="font-medium">
                            {t('field-keywords')}:
                          </span>{' '}
                          {v.keywords}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
