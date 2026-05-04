// Service Worker para interceptar fetch y redirigir al Worker
const PROXY_WORKER = 'https://proxy.mathssupport.cat'; // tu Worker

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Solo interceptar peticiones al mismo origen (evitar bucles)
  if (url.origin === self.location.origin && !url.pathname.startsWith('/sw.js')) {
    // Si es una petición dentro del proxy, podemos reescribirla
    // Por simplicidad, dejamos que el iframe maneje el contenido
    // El service worker es opcional para mejorar la velocidad
    return;
  }
  // Para otros orígenes, no intervenir
  event.respondWith(fetch(event.request));
});
