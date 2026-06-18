'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

async function urlBase64ToUint8Array(base64String: string): Promise<Uint8Array> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

export default function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator,
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    return await registration.ready;
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    if (typeof Notification === 'undefined') {
      return;
    }

    const registration = await registerServiceWorker();
    if (!registration || !registration.pushManager) {
      return;
    }

    const permission = Notification.permission;
    if (permission !== 'granted') {
      const nextPermission = await Notification.requestPermission();
      if (nextPermission !== 'granted') {
        setError('Notification permission was not granted.');
        return;
      }
    }

    const pushManager = registration.pushManager as PushManager;
    const existingSubscription = await pushManager.getSubscription();
    if (existingSubscription) {
      setIsSubscribed(true);
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setError('Push notifications are not configured yet.');
      return;
    }

    const applicationServerKey = await urlBase64ToUint8Array(vapidPublicKey);
    const applicationServerKeyBuffer = applicationServerKey.buffer.slice(
      applicationServerKey.byteOffset,
      applicationServerKey.byteOffset + applicationServerKey.byteLength,
    ) as ArrayBuffer;
    const subscription = await pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKeyBuffer,
    });

    const response = await fetch('/api/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription }),
    });

    if (!response.ok) {
      throw new Error('Unable to save push subscription.');
    }

    setIsSubscribed(true);
    setError(null);
  }, [registerServiceWorker]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const supportsNotifications =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator;
    setIsSupported(supportsNotifications);

    if (!supportsNotifications) {
      return;
    }

    void registerServiceWorker()
      .then(async (registration) => {
        if (!registration || !registration.pushManager) {
          return;
        }

        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(subscription));
      })
      .catch(() => {
        setError('Unable to initialize push notifications.');
      });
  }, [registerServiceWorker]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setIsLoading(true);
          void subscribeToPush()
            .catch(() => {
              setError('Unable to enable push notifications.');
            })
            .finally(() => {
              setIsLoading(false);
            });
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={isSubscribed ? 'Disable alerts' : 'Enable alerts'}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : isSubscribed ? (
          <BellOff className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Bell className="w-4 h-4" aria-hidden="true" />
        )}
        <span className="text-sm font-medium">{isSubscribed ? 'Alerts on' : 'Enable alerts'}</span>
      </button>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
