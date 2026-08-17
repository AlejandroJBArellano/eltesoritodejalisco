// KittnOS - Web Push & Background Notifications Service Worker

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "KittnOS Notificación";
    const options = {
      body: payload.body || "",
      icon: payload.icon || "/favicon.ico",
      badge: payload.badge || "/favicon.ico",
      data: {
        url: payload.url || "/",
      },
      tag: payload.tag || "kittnos-alert",
      renotify: payload.renotify !== false,
      vibrate: payload.vibrate || [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[Service Worker Push Error]", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const fullTargetUrl = new URL(targetUrl, self.location.origin).href;

        // Try to find an existing open tab and focus it
        for (const client of windowClients) {
          if (client.url === fullTargetUrl && "focus" in client) {
            return client.focus();
          }
        }

        // If open on any page in this origin, navigate it and focus
        for (const client of windowClients) {
          if ("navigate" in client && "focus" in client) {
            client.navigate(fullTargetUrl);
            return client.focus();
          }
        }

        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullTargetUrl);
        }
      }),
  );
});
