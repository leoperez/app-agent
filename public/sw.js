// Service Worker for web push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Antigravity', body: event.data.text() };
  }

  const { title = 'Antigravity', body = '', icon = '/logo.png', url = '/' } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/logo.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const existing = cs.find((c) => c.url.includes(url) && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
