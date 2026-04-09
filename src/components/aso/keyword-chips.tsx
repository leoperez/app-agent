import React, { useRef, useState } from 'react';
import { IoMdClose, IoMdAdd } from 'react-icons/io';
import { MdOutlineFileUpload } from 'react-icons/md';
import Skeleton from 'react-loading-skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import 'react-loading-skeleton/dist/skeleton.css';
import { Tooltip } from 'react-tooltip';
import { useTranslations } from 'next-intl';

import { AsoKeyword, Store } from '@/types/aso';
import { getChipColor } from './colors';
import KeywordSparkline from './keyword-sparkline';
import { LocaleCode } from '@/lib/utils/locale';
import { useGetKeywordRankings } from '@/lib/swr/aso';
import { useApp } from '@/context/app';

const APP_STORE_KEYWORD_LIMIT = 100;

interface KeywordChipsProps {
  keywords: AsoKeyword[];
  locale?: LocaleCode;
  readonly?: boolean;
  onAdd: (keyword: string) => Promise<void>;
  onDelete: (keywordId: string) => Promise<void>;
  isLoading?: boolean;
}

function renderTooltipContent(
  keyword: AsoKeyword,
  history?: { date: string; position: number | null }[]
) {
  const fields = [
    { label: 'Score', value: keyword.overall },
    { label: 'Difficulty', value: keyword.difficultyScore || null },
    { label: 'Traffic', value: keyword.trafficScore || null },
    {
      label: 'Position',
      value:
        keyword.position === null || keyword.position === -1
          ? null
          : `#${keyword.position}`,
    },
  ];

  return (
    <div className="p-2 space-y-2 text-sm">
      <div className="space-y-1">
        {fields
          .filter((field) => field.value != null)
          .map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
      </div>
      {history && history.length >= 2 && (
        <div className="pt-1 border-t border-white/20">
          <p className="text-xs text-muted-foreground mb-1">30-day trend</p>
          <KeywordSparkline data={history} />
        </div>
      )}
    </div>
  );
}

export default function KeywordChips({
  keywords,
  locale,
  readonly = false,
  onAdd,
  onDelete,
  isLoading = false,
}: KeywordChipsProps) {
  const t = useTranslations('aso');
  const [loadingKeywords, setLoadingKeywords] = useState<Set<string>>(
    new Set()
  );
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkValue, setBulkValue] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const appInfo = useApp();
  const { rankings } = useGetKeywordRankings(
    appInfo?.currentApp?.id || '',
    locale || ('' as LocaleCode)
  );

  const isAppStore = appInfo?.currentApp?.store === Store.APPSTORE;
  const keywordChars = keywords.map((k) => k.keyword).join(',').length;
  const charsRemaining = APP_STORE_KEYWORD_LIMIT - keywordChars;

  const handleAddKeyword = async (value: string) => {
    if (!value.trim()) return;

    const keyword = value.trim();
    setLoadingKeywords((prev) => new Set(prev).add(keyword));

    try {
      await onAdd(keyword);
    } finally {
      setLoadingKeywords((prev) => {
        const next = new Set(prev);
        next.delete(keyword);
        return next;
      });
    }
  };

  const handleBulkImport = async () => {
    const terms = bulkValue
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!terms.length) return;

    setIsBulkImporting(true);
    for (const term of terms) {
      try {
        await handleAddKeyword(term);
      } catch {
        // continue with the rest even if one fails
      }
    }
    setIsBulkImporting(false);
    setBulkValue('');
    setShowBulkImport(false);
  };

  return (
    <motion.div
      className="space-y-4 max-h-[400px] overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {isAppStore && (
        <div className="flex items-center justify-end">
          <span
            className={`text-xs font-mono ${
              charsRemaining < 0
                ? 'text-red-500'
                : charsRemaining <= 10
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
            }`}
          >
            {keywordChars}/{APP_STORE_KEYWORD_LIMIT} chars
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            // Skeleton chips
            Array(5)
              .fill(0)
              .map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center"
                >
                  <Skeleton className="rounded-full" width={80} height={32} />
                </motion.div>
              ))
          ) : (
            <>
              {keywords.map((keywordObj, index) => (
                <React.Fragment key={keywordObj.keyword}>
                  <motion.div
                    {...(keywordObj.overall !== null && {
                      'data-tooltip-id': `keyword-tooltip-${keywordObj.keyword}`,
                    })}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0,
                      rotate: 20,
                      x: -20,
                      transition: {
                        duration: 0.2,
                        ease: 'backIn',
                      },
                    }}
                    layout
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${getChipColor(keywordObj.overall)}`}
                  >
                    <motion.span layout style={{ originX: 0 }}>
                      {keywordObj.keyword}
                      {keywordObj.overall !== null && (
                        <span className="ml-2 px-1.5 py-0.5 bg-background/50 rounded-full text-xs">
                          {keywordObj.overall}
                        </span>
                      )}
                      {keywordObj.position !== null &&
                        keywordObj.position >= 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            #{keywordObj.position}
                          </span>
                        )}
                      {loadingKeywords.has(keywordObj.keyword) && (
                        <span className="ml-2">
                          <Skeleton width={20} height={16} />
                        </span>
                      )}
                    </motion.span>
                    {!readonly && (
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onDelete(keywordObj.id)}
                        className="hover:bg-secondary-foreground/20 rounded-full p-1"
                      >
                        <IoMdClose className="h-3 w-3" />
                      </motion.button>
                    )}
                  </motion.div>
                  {keywordObj.overall !== null && (
                    <Tooltip
                      id={`keyword-tooltip-${keywordObj.keyword}`}
                      place="top"
                      className="z-50 max-w-md"
                      delayShow={200}
                    >
                      {renderTooltipContent(
                        keywordObj,
                        rankings?.[keywordObj.keyword]
                      )}
                    </Tooltip>
                  )}
                </React.Fragment>
              ))}
              {!readonly && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder={t('add-keyword-placeholder')}
                    className="h-8 w-[150px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddKeyword(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => {
                        const input = document.querySelector(
                          `input[placeholder="${t('add-keyword-placeholder')}"]`
                        ) as HTMLInputElement;
                        handleAddKeyword(input.value);
                        input.value = '';
                      }}
                    >
                      <IoMdAdd className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => setShowBulkImport((v) => !v)}
                      title={t('bulk-import-placeholder')}
                    >
                      <MdOutlineFileUpload className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showBulkImport && !readonly && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('bulk-import-placeholder')}
              </p>
              <textarea
                className="w-full h-20 text-sm border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="keyword1, keyword2, keyword3"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkImport}
                  disabled={isBulkImporting || !bulkValue.trim()}
                >
                  {isBulkImporting
                    ? t('working-hard')
                    : t('bulk-import-button')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowBulkImport(false);
                    setBulkValue('');
                  }}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
