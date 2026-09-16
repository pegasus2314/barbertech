"use client";

import { useEffect } from "react";

// Registers the service worker as soon as the dashboard loads, separate from
// the push-notification opt-in flow (NotificationBell) which only asks for
// permission when the owner clicks "Activar notificaciones". A registered
// service worker is also one of the signals Chrome/Android use to decide
// whether to offer "Add to Home Screen" — without this, the PWA install
// prompt was only reachable after someone had already turned on push.
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
