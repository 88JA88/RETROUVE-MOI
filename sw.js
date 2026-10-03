const CACHE = 'retrouve-moi-v4';
const FILES = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icons/logo-retrouve-moi.png', './vendor/qrcode.min.js'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(fetch(event.request).catch(() => caches.match(event.request))));
