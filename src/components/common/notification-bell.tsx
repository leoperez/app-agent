'use client';

import { useState } from 'react';
import { FaBell } from 'react-icons/fa';
import {
  MdTrendingDown,
  MdTrendingUp,
  MdStar,
  MdCompareArrows,
  MdReviews,
  MdSchedule,
  MdHourglassEmpty,
  MdCheckCircle,
  MdCancel,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGetNotifications, NotificationEntry } from '@/lib/swr/team';
import { formatDistanceToNow } from 'date-fns';

const TYPE_ICON: Record<string, React.ReactNode> = {
  keyword_drop: <MdTrendingDown className="h-4 w-4 text-red-500" />,
  keyword_rise: <MdTrendingUp className="h-4 w-4 text-green-500" />,
  rating_drop: <MdStar className="h-4 w-4 text-amber-500" />,
  competitor_change: <MdCompareArrows className="h-4 w-4 text-blue-500" />,
  new_review: <MdReviews className="h-4 w-4 text-purple-500" />,
  scheduled_publish: <MdSchedule className="h-4 w-4 text-green-500" />,
  publish_approval_requested: (
    <MdHourglassEmpty className="h-4 w-4 text-amber-500" />
  ),
  publish_approved: <MdCheckCircle className="h-4 w-4 text-green-500" />,
  publish_rejected: <MdCancel className="h-4 w-4 text-red-500" />,
};

export function NotificationBell() {
  const { notifications, unreadCount, loading, markAllRead } =
    useGetNotifications();
  const [open, setOpen] = useState(false);

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v && unreadCount > 0) {
      markAllRead();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <FaBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {notifications.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto divide-y">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          )}
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({
  notification: n,
}: {
  notification: NotificationEntry;
}) {
  const isUnread = !n.readAt;
  return (
    <div
      className={`flex gap-3 px-4 py-3 text-sm ${isUnread ? 'bg-blue-50/60' : ''}`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {TYPE_ICON[n.type] ?? <FaBell className="h-4 w-4 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {n.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {n.body}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>
      {isUnread && (
        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
      )}
    </div>
  );
}
