'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import {
  MdHistory,
  MdExpandMore,
  MdExpandLess,
  MdEdit,
  MdAdd,
  MdDelete,
  MdUpload,
  MdDownload,
  MdSchedule,
  MdCheck,
  MdClose,
} from 'react-icons/md';
import { useGetAuditLog } from '@/lib/swr/team';

const ACTION_ICON: Record<string, React.ReactNode> = {
  create: <MdAdd className="h-3.5 w-3.5 text-green-500" />,
  update: <MdEdit className="h-3.5 w-3.5 text-blue-500" />,
  delete: <MdDelete className="h-3.5 w-3.5 text-red-500" />,
  publish: <MdUpload className="h-3.5 w-3.5 text-purple-500" />,
  import: <MdDownload className="h-3.5 w-3.5 text-amber-500" />,
  export: <MdUpload className="h-3.5 w-3.5 text-amber-500" />,
  schedule: <MdSchedule className="h-3.5 w-3.5 text-indigo-500" />,
  approve: <MdCheck className="h-3.5 w-3.5 text-green-500" />,
  reject: <MdClose className="h-3.5 w-3.5 text-red-500" />,
};

const ENTITY_LABEL: Record<string, string> = {
  localization: 'Localization',
  keyword: 'Keyword',
  app: 'App',
  credential: 'Credential',
  review_reply: 'Review reply',
  auto_reply_rule: 'Auto-reply rule',
  review_template: 'Review template',
  app_version: 'Version',
  team_member: 'Team member',
};

export function AuditLog() {
  const [open, setOpen] = useState(false);
  const { logs, loading } = useGetAuditLog();

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <MdHistory className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm font-semibold">Activity log</p>
              <p className="text-xs text-muted-foreground">
                Recent actions taken by team members
              </p>
            </div>
          </div>
          {open ? (
            <MdExpandLess className="h-5 w-5 text-muted-foreground" />
          ) : (
            <MdExpandMore className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {open && (
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No activity recorded yet.
            </p>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 py-2.5 text-sm">
                  <div className="mt-0.5 flex-shrink-0">
                    {ACTION_ICON[log.action] ?? (
                      <MdEdit className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">
                        {log.userEmail ?? 'System'}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {log.action}d {ENTITY_LABEL[log.entity] ?? log.entity}
                        {log.entityId ? (
                          <span className="font-mono text-xs ml-1 text-muted-foreground/70">
                            {log.entityId.slice(0, 8)}
                          </span>
                        ) : null}
                      </span>
                    </p>
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {Object.entries(log.meta)
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/60 flex-shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
