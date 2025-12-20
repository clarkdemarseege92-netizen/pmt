// components/subscription/NotificationsList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { getSubscriptionNotifications, markNotificationAsRead, type SubscriptionNotification } from '@/app/actions/subscriptions';

interface NotificationsListProps {
  userId: string;
  limit?: number;
}

export function NotificationsList({ userId, limit = 5 }: NotificationsListProps) {
  const t = useTranslations('subscription');
  const locale = useLocale() as 'en' | 'th' | 'zh';
  const [notifications, setNotifications] = useState<SubscriptionNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      const result = await getSubscriptionNotifications(userId, limit);
      if (result.success && result.data) {
        setNotifications(result.data);
      }
      setLoading(false);
    }
    fetchNotifications();
  }, [userId, limit]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'trial_reminder':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'subscription_renewed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'renewal_failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'subscription_locked':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'subscription_expiring':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString(locale);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-base-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/60">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{t('noNotifications')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex gap-3 p-3 rounded-lg border transition-colors ${
            notification.read
              ? 'bg-base-100 border-base-200'
              : 'bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100'
          }`}
          onClick={() => !notification.read && handleMarkAsRead(notification.id)}
        >
          <div className="shrink-0 mt-1">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`text-sm font-medium truncate ${!notification.read && 'text-blue-900'}`}>
                {notification.title[locale] || notification.title.en}
              </h4>
              <span className="text-xs text-base-content/50 whitespace-nowrap">
                {formatDate(notification.created_at)}
              </span>
            </div>
            <p className={`text-xs mt-1 line-clamp-2 ${notification.read ? 'text-base-content/60' : 'text-blue-700'}`}>
              {notification.message[locale] || notification.message.en}
            </p>
          </div>
          {!notification.read && (
            <div className="shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
