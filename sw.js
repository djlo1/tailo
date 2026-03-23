const CACHE = 'tailo-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Supabase → network first
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Assets → cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
      }
      return resp;
    }))
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  self.registration.showNotification(data.title || 'Tailo', {
    body: data.body || '',
    icon: '/manifest.json',
    badge: '/manifest.json',
    tag: data.tag || 'tailo',
    data: data.url || '/'
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data));
});
