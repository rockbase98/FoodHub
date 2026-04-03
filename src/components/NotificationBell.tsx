import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, Trash2, ShoppingBag } from 'lucide-react';
import { useNotifications, timeAgo, AppNotification } from '../hooks/useNotifications';

/* ── Status colour map ─────────────────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  accepted:         'bg-blue-100 text-blue-700',
  preparing:        'bg-purple-100 text-purple-700',
  ready:            'bg-indigo-100 text-indigo-700',
  picked_up:        'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-cyan-100 text-cyan-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
};

/* ══════════════════════════════════════════════════════════════ */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [open, setOpen]           = useState(false);
  const [animating, setAnimating] = useState(false);
  const panelRef                  = useRef<HTMLDivElement>(null);
  const bellRef                   = useRef<HTMLButtonElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        bellRef.current   && !bellRef.current.contains(e.target as Node)
      ) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openPanel = () => {
    setOpen(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 10); // trigger CSS transition
    markAllRead();
  };

  const closePanel = () => {
    setAnimating(true);
    setTimeout(() => { setOpen(false); setAnimating(false); }, 250);
  };

  const handleToggle = () => (open ? closePanel() : openPanel());

  const handleNotifClick = (n: AppNotification) => {
    closePanel();
    if (n.orderId) {
      setTimeout(() => navigate(`/customer/track/${n.orderId}`), 260);
    }
  };

  return (
    <div className="relative flex-shrink-0">
      {/* ── Bell button ─────────────────────────────────────── */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center tap-highlight"
        aria-label="Notifications"
      >
        <Bell
          className={`h-4.5 w-4.5 ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}
          style={{ width: 18, height: 18 }}
          strokeWidth={unreadCount > 0 ? 2.5 : 1.8}
        />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
            style={{ animation: 'notif-pulse 2s ease-in-out infinite' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ──────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop (mobile fullscreen feel) */}
          <div className="fixed inset-0 z-[998] bg-black/10" onClick={closePanel} />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute right-0 top-11 z-[999] w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border overflow-hidden"
            style={{
              transform: animating ? 'translateY(-8px) scale(0.97)' : 'translateY(0) scale(1)',
              opacity:   animating ? 0 : 1,
              transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
              maxHeight: 480,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" strokeWidth={2.5} />
                <span className="font-bold text-sm">Notifications</span>
                {notifications.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="p-1.5 rounded-lg hover:bg-red-50 tap-highlight text-muted-foreground hover:text-red-500 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                )}
                <button
                  onClick={closePanel}
                  className="p-1.5 rounded-lg hover:bg-muted/60 tap-highlight text-muted-foreground transition-colors"
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
              {notifications.length === 0 ? (
                <EmptyState />
              ) : (
                <ul>
                  {notifications.map((n, idx) => (
                    <NotificationItem
                      key={n.id}
                      notif={n}
                      isLast={idx === notifications.length - 1}
                      onClick={() => handleNotifClick(n)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t px-4 py-2.5 flex items-center justify-center">
                <button
                  onClick={() => { markAllRead(); closePanel(); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary tap-highlight"
                >
                  <CheckCheck style={{ width: 13, height: 13 }} />
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Keyframe for badge pulse */}
      <style>{`
        @keyframes notif-pulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50%      { transform: scale(1.05); box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}

/* ── Notification row ────────────────────────────────────────── */
function NotificationItem({
  notif,
  isLast,
  onClick,
}: {
  notif: AppNotification;
  isLast: boolean;
  onClick: () => void;
}) {
  const colorClass = notif.status ? (STATUS_COLOR[notif.status] || 'bg-gray-100 text-gray-700') : 'bg-gray-100 text-gray-700';

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left flex gap-3 px-4 py-3 tap-highlight hover:bg-muted/40 transition-colors ${!isLast ? 'border-b' : ''} ${!notif.isRead ? 'bg-primary/[0.03]' : ''}`}
      >
        {/* Emoji circle */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg leading-none mt-0.5">
          <span style={{ fontSize: 18 }}>{notif.emoji}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-xs leading-tight truncate">{notif.title}</span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
              {timeAgo(notif.timestamp)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{notif.message}</p>

          {/* Status pill */}
          {notif.status && (
            <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
              {notif.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
        </div>

        {/* Unread dot */}
        {!notif.isRead && (
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
        )}
      </button>
    </li>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-semibold text-sm text-foreground mb-1">All caught up!</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Order status updates will appear here in real-time.
      </p>
    </div>
  );
}
