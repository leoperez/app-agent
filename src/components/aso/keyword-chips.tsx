import React, { useRef, useState } from 'react';
import { IoMdClose, IoMdAdd } from 'react-icons/io';
import {
  MdOutlineFileUpload,
  MdOutlineFileDownload,
  MdLightbulb,
  MdContentCopy,
  MdDeleteSweep,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
} from 'react-icons/md';
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
import {
  useGetKeywordRankings,
  useGetKeywordOpportunities,
  useGetReviewKeywords,
} from '@/lib/swr/aso';
import { useGetKeywordConversion } from '@/lib/swr/app';
import { useApp } from '@/context/app';
import { useTeam } from '@/context/team';
import { KeywordConversionChart } from './keyword-conversion-chart';

const APP_STORE_KEYWORD_LIMIT = 100;

// Returns position improvement over the last 7 days (positive = moved up)
function computeVelocity(
  history: { date: string; position: number | null }[] | undefined
): number | null {
  if (!history || history.length < 2) return null;
  const recent = history.slice(-7);
  const oldest = recent.find((h) => h.position !== null);
  const newest = [...recent].reverse().find((h) => h.position !== null);
  if (!oldest || !newest || oldest === newest) return null;
  return oldest.position! - newest.position!; // positive = improved
}

function VelocityBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  const improved = delta > 0;
  return (
    <span
      className={`ml-1 text-xs font-medium ${improved ? 'text-green-500' : 'text-red-500'}`}
    >
      {improved ? `↑${delta}` : `↓${Math.abs(delta)}`}
    </span>
  );
}

interface KeywordChipsProps {
  keywords: AsoKeyword[];
  locale?: LocaleCode;
  readonly?: boolean;
  onAdd: (keyword: string) => Promise<void>;
  onDelete: (keywordId: string) => Promise<void>;
  isLoading?: boolean;
  availableLocales?: string[];
}

function renderTooltipContent(
  keyword: AsoKeyword,
  history?: { date: string; position: number | null }[]
) {
  const velocity = computeVelocity(history);
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
    {
      label: '7d trend',
      value:
        velocity === null
          ? null
          : velocity > 0
            ? `↑${velocity} spots`
            : velocity < 0
              ? `↓${Math.abs(velocity)} spots`
              : '→ stable',
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
  availableLocales,
}: KeywordChipsProps) {
  const t = useTranslations('aso');
  const [loadingKeywords, setLoadingKeywords] = useState<Set<string>>(
    new Set()
  );
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkValue, setBulkValue] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const appInfo = useApp();
  const teamInfo = useTeam();
  const { rankings } = useGetKeywordRankings(
    appInfo?.currentApp?.id || '',
    locale || ('' as LocaleCode)
  );
  const { opportunities, mutate: mutateOpportunities } =
    useGetKeywordOpportunities(
      appInfo?.currentApp?.id || '',
      locale || ('' as LocaleCode)
    );
  const { suggestions: reviewSuggestions } = useGetReviewKeywords(
    appInfo?.currentApp?.id || ''
  );
  const [showReviewSuggestions, setShowReviewSuggestions] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [showCopyLocale, setShowCopyLocale] = useState(false);
  const [copyingLocale, setCopyingLocale] = useState(false);
  const [selectedCopyLocales, setSelectedCopyLocales] = useState<Set<string>>(
    new Set()
  );
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const { data: conversionData, loading: conversionLoading } =
    useGetKeywordConversion(
      teamInfo?.currentTeam?.id || '',
      appInfo?.currentApp?.id || '',
      locale || '',
      selectedKeyword || ''
    );

  const [searchQuery, setSearchQuery] = useState('');

  const isAppStore = appInfo?.currentApp?.store === Store.APPSTORE;
  const keywordChars = keywords.map((k) => k.keyword).join(',').length;
  const charsRemaining = APP_STORE_KEYWORD_LIMIT - keywordChars;

  const filteredKeywords = searchQuery.trim()
    ? keywords.filter((k) =>
        k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : keywords;

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    try {
      await fetch(
        `/api/teams/${teamInfo!.currentTeam!.id}/apps/${appInfo!.currentApp!.id}/localizations/${locale}/keyword`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        }
      );
      for (const id of ids) await onDelete(id);
      setSelectedIds(new Set());
      setBulkSelectMode(false);
    } catch {
      // silently handled
    }
  };

  const handleCopyToLocales = async (targetLocales: string[]) => {
    if (!targetLocales.length || !locale) return;
    setCopyingLocale(true);
    try {
      await fetch(
        `/api/teams/${teamInfo!.currentTeam!.id}/apps/${appInfo!.currentApp!.id}/localizations/${locale}/keyword/copy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocales }),
        }
      );
      setShowCopyLocale(false);
    } catch {
      // silently handled
    } finally {
      setCopyingLocale(false);
    }
  };

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
      <div className="flex items-center justify-between">
        {isAppStore ? (
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
        ) : (
          <span />
        )}
        {teamInfo?.currentTeam?.id &&
          appInfo?.currentApp?.id &&
          keywords.length > 0 && (
            <div className="flex items-center gap-1">
              {!readonly && (
                <Button
                  size="sm"
                  variant={bulkSelectMode ? 'default' : 'ghost'}
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setBulkSelectMode((v) => !v);
                    setSelectedIds(new Set());
                    setShowCopyLocale(false);
                  }}
                >
                  <MdCheckBoxOutlineBlank className="h-3.5 w-3.5 mr-1" />
                  Select
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-muted-foreground"
                title={t('export-keywords')}
                onClick={() =>
                  window.open(
                    `/api/teams/${teamInfo.currentTeam!.id}/apps/${appInfo.currentApp!.id}/keywords/export`,
                    '_blank'
                  )
                }
              >
                <MdOutlineFileDownload className="h-3.5 w-3.5 mr-1" />
                {t('export-keywords')}
              </Button>
              {locale && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  title={t('export-rankings')}
                  onClick={() =>
                    window.open(
                      `/api/teams/${teamInfo.currentTeam!.id}/apps/${appInfo.currentApp!.id}/localizations/${locale}/keyword/rankings/export`,
                      '_blank'
                    )
                  }
                >
                  <MdOutlineFileDownload className="h-3.5 w-3.5 mr-1" />
                  {t('export-rankings')}
                </Button>
              )}
            </div>
          )}
      </div>

      {/* Bulk action toolbar */}
      <AnimatePresence>
        {bulkSelectMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/60 border border-border text-xs">
              <button
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (selectedIds.size === filteredKeywords.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filteredKeywords.map((k) => k.id)));
                  }
                }}
              >
                {selectedIds.size === filteredKeywords.length &&
                filteredKeywords.length > 0 ? (
                  <MdCheckBox className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <MdCheckBoxOutlineBlank className="h-3.5 w-3.5" />
                )}
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : 'Select all'}
              </button>
              <div className="flex-1" />
              {selectedIds.size > 0 && (
                <>
                  {locale && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCopyLocale((v) => !v)}
                    >
                      <MdContentCopy className="h-3.5 w-3.5 mr-1" />
                      Copy to locales
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={handleBulkDelete}
                  >
                    <MdDeleteSweep className="h-3.5 w-3.5 mr-1" />
                    Delete ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>

            {/* Copy to locales panel */}
            <AnimatePresence>
              {showCopyLocale && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 p-2 rounded-md border border-border bg-background space-y-2 text-xs">
                    <p className="text-muted-foreground">
                      Select target locales:
                    </p>
                    {availableLocales &&
                    availableLocales.filter((l) => l !== locale).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {availableLocales
                          .filter((l) => l !== locale)
                          .map((l) => (
                            <button
                              key={l}
                              onClick={() =>
                                setSelectedCopyLocales((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(l)) next.delete(l);
                                  else next.add(l);
                                  return next;
                                })
                              }
                              className={`px-2 py-0.5 rounded-full border transition-colors ${
                                selectedCopyLocales.has(l)
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'border-border hover:bg-muted'
                              }`}
                            >
                              {l}
                            </button>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">
                        No other locales available.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={
                          copyingLocale || selectedCopyLocales.size === 0
                        }
                        onClick={() =>
                          handleCopyToLocales(Array.from(selectedCopyLocales))
                        }
                      >
                        {copyingLocale
                          ? 'Copying…'
                          : `Copy to ${selectedCopyLocales.size} locale${selectedCopyLocales.size !== 1 ? 's' : ''}`}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setShowCopyLocale(false);
                          setSelectedCopyLocales(new Set());
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {keywords.length > 8 && (
        <Input
          placeholder={t('search-keywords-placeholder')}
          className="h-7 text-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
              {filteredKeywords.map((keywordObj, index) => (
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
                    onClick={() => {
                      if (bulkSelectMode) {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(keywordObj.id))
                            next.delete(keywordObj.id);
                          else next.add(keywordObj.id);
                          return next;
                        });
                      } else {
                        setSelectedKeyword((k) =>
                          k === keywordObj.keyword ? null : keywordObj.keyword
                        );
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${getChipColor(keywordObj.overall)} ${
                      bulkSelectMode && selectedIds.has(keywordObj.id)
                        ? 'ring-2 ring-primary'
                        : !bulkSelectMode &&
                            selectedKeyword === keywordObj.keyword
                          ? 'ring-2 ring-primary/50'
                          : ''
                    }`}
                  >
                    {bulkSelectMode && (
                      <span className="flex-shrink-0">
                        {selectedIds.has(keywordObj.id) ? (
                          <MdCheckBox className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <MdCheckBoxOutlineBlank className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </span>
                    )}
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
                      <VelocityBadge
                        delta={computeVelocity(rankings?.[keywordObj.keyword])}
                      />
                      {loadingKeywords.has(keywordObj.keyword) && (
                        <span className="ml-2">
                          <Skeleton width={20} height={16} />
                        </span>
                      )}
                    </motion.span>
                    {!readonly && !bulkSelectMode && (
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(keywordObj.id);
                        }}
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

      {/* Keyword opportunities from competitors */}
      {!readonly && opportunities.length > 0 && (
        <div className="pt-2 border-t border-border">
          <button
            onClick={() => setShowOpportunities((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline"
          >
            <MdLightbulb className="h-3.5 w-3.5" />
            {t('keyword-opportunities', { count: opportunities.length })}
            <span className="text-muted-foreground ml-1">
              {showOpportunities ? '▲' : '▼'}
            </span>
          </button>
          <AnimatePresence>
            {showOpportunities && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('keyword-opportunities-description')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {opportunities.map((opp) => (
                    <motion.button
                      key={opp.keyword}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      onClick={async () => {
                        await handleAddKeyword(opp.keyword);
                        mutateOpportunities();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      title={`${t('from-competitor')}: ${opp.competitorTitle}`}
                    >
                      <IoMdAdd className="h-3 w-3" />
                      {opp.keyword}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Review-based keyword suggestions */}
      {!readonly && reviewSuggestions.length > 0 && (
        <div className="pt-2 border-t border-border">
          <button
            onClick={() => setShowReviewSuggestions((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            <MdOutlineFileUpload className="h-3.5 w-3.5" />
            {t('review-suggestions', { count: reviewSuggestions.length })}
            <span className="text-muted-foreground ml-1">
              {showReviewSuggestions ? '▲' : '▼'}
            </span>
          </button>
          <AnimatePresence>
            {showReviewSuggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('review-suggestions-description')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {reviewSuggestions.map((s) => {
                    const alreadyTracked = keywords.some(
                      (k) => k.keyword.toLowerCase() === s.keyword.toLowerCase()
                    );
                    return (
                      <motion.button
                        key={s.keyword}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        disabled={alreadyTracked}
                        onClick={async () => {
                          if (!alreadyTracked)
                            await handleAddKeyword(s.keyword);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          alreadyTracked
                            ? 'opacity-40 cursor-not-allowed border-border bg-muted text-muted-foreground'
                            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                        }`}
                        title={`Mentioned in ~${s.frequency} reviews`}
                      >
                        {!alreadyTracked && <IoMdAdd className="h-3 w-3" />}
                        {s.keyword}
                        <span className="text-xs opacity-60">
                          {s.frequency}×
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Keyword → downloads correlation panel */}
      <AnimatePresence>
        {selectedKeyword && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">
                  {t('keyword-conversion-title', { keyword: selectedKeyword })}
                </p>
                <button
                  onClick={() => setSelectedKeyword(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <KeywordConversionChart
                data={conversionData}
                loading={conversionLoading}
                keyword={selectedKeyword}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
