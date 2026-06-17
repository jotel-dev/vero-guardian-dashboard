self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = event.data && event.data.json ? event.data.json() : null;
  const title = payload?.title ?? 'Vero Guardian';
  const body = payload?.body ?? 'You have a new alert.';
  const icon = payload?.icon ?? '/icon.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag: payload?.tag ?? 'vero-guardian-alert',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        const client = clients[0];
        return client.focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});
