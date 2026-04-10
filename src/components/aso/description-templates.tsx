'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MdBookmark,
  MdBookmarkAdd,
  MdDelete,
  MdExpandMore,
  MdExpandLess,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetTemplates, DescriptionTemplate } from '@/lib/swr/team';
import { useApp } from '@/context/app';
import { AppLocalization } from '@/types/aso';
import { Store } from '@/types/aso';

interface DescriptionTemplatesProps {
  currentValues: Partial<AppLocalization>;
  onApply: (values: Partial<AppLocalization>) => void;
}

export function DescriptionTemplates({
  currentValues,
  onApply,
}: DescriptionTemplatesProps) {
  const appInfo = useApp();
  const store = appInfo?.currentApp?.store ?? 'APPSTORE';
  const { templates, loading, saveTemplate, deleteTemplate } =
    useGetTemplates(store);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const isGPlay = store === Store.GOOGLEPLAY;

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await saveTemplate({
        store,
        name: newName.trim(),
        title: currentValues.title ?? null,
        subtitle: isGPlay ? null : (currentValues.subtitle ?? null),
        keywords: isGPlay ? null : (currentValues.keywords ?? null),
        description: isGPlay ? null : (currentValues.description ?? null),
        shortDescription: isGPlay
          ? (currentValues.shortDescription ?? null)
          : null,
        fullDescription: isGPlay
          ? (currentValues.fullDescription ?? currentValues.description ?? null)
          : null,
      });
      toast.success('Template saved');
      setNewName('');
      setShowSaveForm(false);
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = (t: DescriptionTemplate) => {
    const values: Partial<AppLocalization> = {};
    if (t.title) values.title = t.title;
    if (!isGPlay) {
      if (t.subtitle) values.subtitle = t.subtitle;
      if (t.keywords) values.keywords = t.keywords;
      if (t.description) values.description = t.description;
    } else {
      if (t.shortDescription) values.shortDescription = t.shortDescription;
      if (t.fullDescription) values.fullDescription = t.fullDescription;
    }
    onApply(values);
    toast.success(`Template "${t.name}" applied`);
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MdBookmark className="h-4 w-4" />
          <span>Description templates</span>
          {templates.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {templates.length}
            </span>
          )}
        </div>
        {open ? (
          <MdExpandLess className="h-4 w-4 text-muted-foreground" />
        ) : (
          <MdExpandMore className="h-4 w-4 text-muted-foreground" />
        )}
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
            <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
              {/* Save current as template */}
              <AnimatePresence>
                {showSaveForm ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Template name"
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={handleSave}
                      disabled={saving || !newName.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      onClick={() => setShowSaveForm(false)}
                    >
                      Cancel
                    </Button>
                  </motion.div>
                ) : (
                  <button
                    onClick={() => setShowSaveForm(true)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  >
                    <MdBookmarkAdd className="h-3.5 w-3.5" />
                    Save current content as template
                  </button>
                )}
              </AnimatePresence>

              {/* Template list */}
              {loading && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
              {!loading && templates.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No templates yet. Save the current content to reuse it later.
                </p>
              )}
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[tpl.title, tpl.subtitle, tpl.keywords]
                        .filter(Boolean)
                        .join(' · ')
                        .slice(0, 60)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleApply(tpl)}
                    >
                      Apply
                    </Button>
                    <button
                      onClick={() => deleteTemplate(tpl.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <MdDelete className="h-3.5 w-3.5" />
                    </button>
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
