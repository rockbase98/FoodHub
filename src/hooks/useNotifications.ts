import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { getOrderStatusText } from '../lib/utils';

/* ── Types ──────────────────────────────────────────────────── */
export interface AppNotification {
  id: string;
  type: 'order_update' | 'delivery' | 'promo';
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  timestamp: string;
  emoji: string;
  status?: string;
}

/* ── Storage helpers ───────────────────────────────────────── */
const NOTIF_KEY   = 'foodhub_notifications';
const CACHE_KEY   = 'foodhub_order_statuses';
const MAX_STORED  = 50;

const loadNotifs = (): AppNotification[] => {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); }
  catch { return []; }
};
const saveNotifs = (n: AppNotification[]) =>
  localStorage.setItem(NOTIF_KEY, JSON.stringify(n.slice(0, MAX_STORED)));

const loadCache = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
};
const saveCache = (c: Record<string, string>) =>
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));

/* ── Status → emoji map ────────────────────────────────────── */
const STATUS_EMOJI: Record<string, string> = {
  accepted:          '✅',
  preparing:         '👨‍🍳',
  ready:             '🎉',
  picked_up:         '🛵',
  out_for_delivery:  '🚀',
  delivered:         '🏠',
  cancelled:         '❌',
};

/* ── Hook ──────────────────────────────────────────────────── */
export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifs);
  const cacheRef     = useRef<Record<string, string>>(loadCache());
  const isFirstPoll  = useRef(true);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /* Mark all read */
  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      saveNotifs(updated);
      return updated;
    });
  }, []);

  /* Clear all */
  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifs([]);
  }, []);

  /* Fire browser notification (if permission granted) */
  const fireBrowserNotif = (emoji: string, title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`${emoji} ${title}`, { body, icon: '/favicon.ico' });
      } catch { /* ignore */ }
    }
  };

  /* Poll supabase */
  const poll = useCallback(async () => {
    if (!user || user.role !== 'customer') return;

    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status')
      .eq('customer_id', user.id)
      .not('status', 'in', '("pending")')
      .order('created_at', { ascending: false })
      .limit(15);

    if (!orders) return;

    const cache = cacheRef.current;
    const fresh: AppNotification[] = [];

    for (const order of orders) {
      const prev = cache[order.id];

      if (prev !== undefined && prev !== order.status) {
        const emoji = STATUS_EMOJI[order.status] || '📦';
        const notif: AppNotification = {
          id:        `${order.id}-${order.status}`,
          type:      order.status === 'delivered' ? 'delivery' : 'order_update',
          title:     `Order ${order.order_number}`,
          message:   getOrderStatusText(order.status),
          orderId:   order.id,
          isRead:    false,
          timestamp: new Date().toISOString(),
          emoji,
          status:    order.status,
        };
        fresh.push(notif);

        if (!isFirstPoll.current) {
          fireBrowserNotif(emoji, notif.title, notif.message);
        }
      }

      cache[order.id] = order.status;
    }

    cacheRef.current = cache;
    saveCache(cache);

    if (fresh.length > 0 && !isFirstPoll.current) {
      setNotifications((prev) => {
        // Deduplicate by id
        const existing = new Set(prev.map((n) => n.id));
        const unique   = fresh.filter((n) => !existing.has(n.id));
        const updated  = [...unique, ...prev].slice(0, MAX_STORED);
        saveNotifs(updated);
        return updated;
      });
    }

    isFirstPoll.current = false;
  }, [user]);

  /* Start polling */
  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    poll();
    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, [poll]);

  return { notifications, unreadCount, markAllRead, clearAll };
}

/* ── Time-ago helper (exported for use in UI) ──────────────── */
export function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
