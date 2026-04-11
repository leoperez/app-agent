'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdOutlineFeedback, MdClose, MdSend } from 'react-icons/md';
import { toast } from 'react-hot-toast';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          page: window.location.pathname,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setSent(true);
      setMessage('');
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2000);
    } catch {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Share feedback
                </p>
                <p className="text-xs text-muted-foreground">
                  Ideas, bugs, or suggestions — we read every message
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <MdClose className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4 space-y-1"
                >
                  <p className="text-2xl">🙏</p>
                  <p className="text-sm font-medium">
                    Thanks for your feedback!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    We'll review it and get back to you if needed.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What's on your mind?"
                    maxLength={2000}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:border-gray-700 dark:bg-gray-800"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      ⌘↵ to send
                    </span>
                    <button
                      onClick={handleSubmit}
                      disabled={!message.trim() || sending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      <MdSend className="w-3.5 h-3.5" />
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        aria-label="Share feedback"
      >
        <MdOutlineFeedback className="w-4 h-4" />
        Feedback
      </motion.button>
    </div>
  );
}
