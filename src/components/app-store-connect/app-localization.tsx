'use client';

import { AppLocalization, LocalizationEditMode, Store } from '@/types/aso';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdExpandMore,
  MdSettings,
  MdAdd,
  MdAutoFixHigh,
  MdWarning,
  MdCheckCircle,
} from 'react-icons/md';
import { getLocaleName, LocaleCode } from '@/lib/utils/locale';
import LocalizationField from '@/components/common/localization-field';
import { FIELD_LIMITS, GOOGLE_PLAY_FIELD_LIMITS } from '@/types/app-store';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface AppLocalizationProps {
  // Current localization data in draft
  localization: AppLocalization;
  // Current localization data in public
  originalData?: AppLocalization;
  // Function to update the localization
  onUpdate: (updatedData: Partial<AppLocalization>) => void;
  // Mode of the localization
  mode: LocalizationEditMode;
  defaultExpanded?: boolean;
  onASOClick?: () => void;
  // Store type to determine which fields to show
  store?: Store;
}

export default function AppLocalizationView({
  localization,
  originalData,
  onUpdate,
  mode,
  defaultExpanded = true,
  onASOClick,
  store = Store.APPSTORE,
}: AppLocalizationProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const t = useTranslations('dashboard.app-store-connect.localization');

  // Determine if we're in Google Play mode
  const isGooglePlay = store === Store.GOOGLEPLAY;

  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const handleChange = (field: keyof AppLocalization, value: string) => {
    onUpdate({ [field]: value });
  };

  const hasFieldChanged = (field: keyof AppLocalization) => {
    return originalData && localization[field] !== originalData[field];
  };

  const renderQuickReleaseMode = () => (
    <div className="space-y-4">
      <LocalizationField
        label={isGooglePlay ? "Recent Changes (What's New)" : t('whats-new')}
        value={localization.whatsNew || localization.recentChanges}
        onChange={(value) => handleChange('whatsNew', value)}
        multiline
        characterLimit={isGooglePlay ? 500 : FIELD_LIMITS.whatsNew}
        hasChanged={hasFieldChanged('whatsNew')}
      />
    </div>
  );

  const renderASOMode = () => (
    <div className="space-y-4">
      {isGooglePlay ? (
        // Google Play: Show only supported fields
        <>
          <LocalizationField
            label={t('title')}
            value={localization.title}
            onChange={(value) => handleChange('title', value)}
            characterLimit={GOOGLE_PLAY_FIELD_LIMITS.title}
            hasChanged={hasFieldChanged('title')}
            originalValue={originalData?.title}
          />
          <LocalizationField
            label="Short Description"
            value={localization.shortDescription}
            onChange={(value) => handleChange('shortDescription', value)}
            multiline
            characterLimit={GOOGLE_PLAY_FIELD_LIMITS.shortDescription}
            hasChanged={hasFieldChanged('shortDescription')}
            originalValue={originalData?.shortDescription}
          />
          <LocalizationField
            label="Full Description"
            value={localization.fullDescription || localization.description}
            onChange={(value) => handleChange('fullDescription', value)}
            multiline
            characterLimit={GOOGLE_PLAY_FIELD_LIMITS.fullDescription}
            hasChanged={hasFieldChanged('fullDescription')}
            originalValue={
              originalData?.fullDescription || originalData?.description
            }
          />
          <LocalizationField
            label="Recent Changes (What's New)"
            value={localization.whatsNew || localization.recentChanges}
            onChange={(value) => handleChange('whatsNew', value)}
            multiline
            characterLimit={500}
            hasChanged={hasFieldChanged('whatsNew')}
            originalValue={
              originalData?.whatsNew || originalData?.recentChanges
            }
          />
        </>
      ) : (
        // App Store Connect: Show all fields
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocalizationField
              label={t('title')}
              value={localization.title}
              onChange={(value) => handleChange('title', value)}
              characterLimit={FIELD_LIMITS.title}
              hasChanged={hasFieldChanged('title')}
              originalValue={originalData?.title}
            />
            <LocalizationField
              label={t('subtitle')}
              value={localization.subtitle}
              onChange={(value) => handleChange('subtitle', value)}
              characterLimit={FIELD_LIMITS.subtitle}
              hasChanged={hasFieldChanged('subtitle')}
              originalValue={originalData?.subtitle}
            />
          </div>

          <LocalizationField
            label={t('keywords')}
            value={localization.keywords}
            onChange={(value) => handleChange('keywords', value)}
            characterLimit={FIELD_LIMITS.keywords}
            hasChanged={hasFieldChanged('keywords')}
            originalValue={originalData?.keywords}
          />

          <LocalizationField
            label={t('description')}
            value={localization.description}
            onChange={(value) => handleChange('description', value)}
            multiline
            characterLimit={FIELD_LIMITS.description}
            hasChanged={hasFieldChanged('description')}
          />

          <LocalizationField
            label={t('promotional-text')}
            value={localization.promotionalText}
            onChange={(value) => handleChange('promotionalText', value)}
            multiline
            characterLimit={FIELD_LIMITS.promotionalText}
            hasChanged={hasFieldChanged('promotionalText')}
          />
        </>
      )}
    </div>
  );

  const renderAdvancedFields = () => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="space-y-4 pt-4"
    >
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {t('advanced-settings')}
      </h4>

      {isGooglePlay ? (
        // Google Play: Only show informational message
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium mb-1">
            {t('google-play-advanced-note-title')}
          </p>
          <p>{t('google-play-advanced-note-description')}</p>
        </div>
      ) : (
        // App Store Connect: Show all advanced fields
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocalizationField
              label={t('privacy-policy-url')}
              value={localization.privacyPolicyUrl}
              onChange={(value) => handleChange('privacyPolicyUrl', value)}
              hasChanged={hasFieldChanged('privacyPolicyUrl')}
            />
            <LocalizationField
              label={t('privacy-choices-url')}
              value={localization.privacyChoicesUrl}
              onChange={(value) => handleChange('privacyChoicesUrl', value)}
              hasChanged={hasFieldChanged('privacyChoicesUrl')}
            />
          </div>
          <LocalizationField
            label={t('privacy-policy-text')}
            value={localization.privacyPolicyText}
            onChange={(value) => handleChange('privacyPolicyText', value)}
            multiline
            hasChanged={hasFieldChanged('privacyPolicyText')}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocalizationField
              label={t('marketing-url')}
              value={localization.marketingUrl}
              onChange={(value) => handleChange('marketingUrl', value)}
              hasChanged={hasFieldChanged('marketingUrl')}
            />
            <LocalizationField
              label={t('support-url')}
              value={localization.supportUrl}
              onChange={(value) => handleChange('supportUrl', value)}
              hasChanged={hasFieldChanged('supportUrl')}
            />
          </div>
        </>
      )}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {getLocaleName(localization.locale as LocaleCode)}
        </h3>
        <div className="flex items-center space-x-3">
          {mode === LocalizationEditMode.QUICK_RELEASE && (
            <>
              {localization.whatsNew ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <MdCheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[200px]">
                    {localization.whatsNew.slice(0, 50)}
                    {localization.whatsNew.length > 50 ? '…' : ''}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
                  <MdWarning className="w-4 h-4 flex-shrink-0" />
                  {t('no-release-notes-yet')}
                </span>
              )}
            </>
          )}
          {onASOClick && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onASOClick();
              }}
              variant="outline"
              size="sm"
              className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <MdAutoFixHigh className="w-4 h-4" />
              {t('aso-with-ai')}
            </Button>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <MdExpandMore className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
              {mode === LocalizationEditMode.QUICK_RELEASE
                ? renderQuickReleaseMode()
                : renderASOMode()}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <MdSettings
                    className={`w-4 h-4 ${showAdvanced ? 'text-blue-500' : ''}`}
                  />
                  <span>{t('advanced-settings')}</span>
                </button>
              </div>

              <AnimatePresence>
                {showAdvanced && renderAdvancedFields()}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
