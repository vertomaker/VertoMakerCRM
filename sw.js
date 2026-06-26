// Service Worker do Vertomaker
// Este arquivo precisa ficar na MESMA PASTA do index.html quando publicado
// (ex.: no GitHub Pages), para que o navegador permita instalar o app na
// tela inicial do celular/computador.

const CACHE_NAME = "vertomaker-cache-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tenta pré-cachear o essencial; se algum arquivo não existir, ignora.
      return Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: tenta a rede primeiro; se falhar (ex. sem internet), usa o cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
