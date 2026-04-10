'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MdBookmarkAdd,
  MdDelete,
  MdExpandMore,
  MdExpandLess,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/fetcher';
import { useTeam } from '@/context/team';

interface ReviewTemplate {
  id: string;
  name: string;
  body: string;
  rating: number | null;
}

interface ReviewTemplatesProps {
  onApply: (text: string) => void;
  currentText?: string;
}

export function ReviewTemplates({
  onApply,
  currentText,
}: ReviewTemplatesProps) {
  const teamInfo = useTeam();
  const [open, setOpen] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: templates = [], mutate } = useSWR<ReviewTemplate[]>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/review-templates`
      : null,
    fetcher,
    { dedupingInterval: 30000 }
  );

  const handleSave = async () => {
    if (!name.trim() || !currentText?.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/teams/${teamInfo!.currentTeam!.id}/review-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), body: currentText.trim() }),
      });
      toast.success('Template saved');
      setName('');
      setShowSave(false);
      mutate();
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(
      `/api/teams/${teamInfo!.currentTeam!.id}/review-templates/${id}`,
      { method: 'DELETE' }
    );
    mutate();
  };

  return (
    <div className="border-t border-border/50 pt-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MdBookmarkAdd className="h-3.5 w-3.5" />
        Reply templates
        {templates.length > 0 && (
          <span className="bg-muted px-1 py-0.5 rounded-full text-xs">
            {templates.length}
          </span>
        )}
        {open ? (
          <MdExpandLess className="h-3 w-3 ml-0.5" />
        ) : (
          <MdExpandMore className="h-3 w-3 ml-0.5" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tpl.body.slice(0, 60)}
                      {tpl.body.length > 60 ? '…' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        onApply(tpl.body);
                        setOpen(false);
                      }}
                    >
                      Use
                    </Button>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <MdDelete className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <AnimatePresence>
                {showSave ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Template name"
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={handleSave}
                      disabled={saving || !name.trim() || !currentText?.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      onClick={() => setShowSave(false)}
                    >
                      Cancel
                    </Button>
                  </motion.div>
                ) : (
                  currentText?.trim() && (
                    <button
                      onClick={() => setShowSave(true)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <MdBookmarkAdd className="h-3 w-3" />
                      Save current reply as template
                    </button>
                  )
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
