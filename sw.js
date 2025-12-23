// U2B-Loop Service Worker
const CACHE_NAME = 'u2b-loop-v1.2.4';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './assets/icon-512.png',
    './assets/favicon.png',
    './assets/logo.png'
];

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('U2B-Loop: キャッシュを作成中...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('U2B-Loop: キャッシュ完了');
                return self.skipWaiting();
            })
    );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('U2B-Loop: 古いキャッシュを削除:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// リクエストをキャッシュから返す（キャッシュファースト戦略）
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // YouTube API や外部リソースはキャッシュしない
    if (url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((response) => {
                        // 正常なレスポンスのみキャッシュ
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
    );
});
