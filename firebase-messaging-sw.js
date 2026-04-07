// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB415451nX2ZMTlv2A3EiznlWC8KyhmPn8",
  authDomain: "benboerderij-6e7c2.firebaseapp.com",
  databaseURL: "https://benboerderij-6e7c2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "benboerderij-6e7c2",
  storageBucket: "benboerderij-6e7c2.firebasestorage.app",
  messagingSenderId: "1039528273928",
  appId: "1:1039528273928:web:e2f108f026f69667e449bd"
});

const messaging = firebase.messaging();

// Data-only payload: service worker bouwt de melding zelf op
// FCM toont NOOIT automatisch een melding — wij bepalen wanneer en wat
messaging.onBackgroundMessage(payload => {
  const title = (payload.data && payload.data.title) || "Ben's Boerderij";
  const body  = (payload.data && payload.data.body)  || "";

  return self.registration.showNotification(title, {
    body,
    icon: "/Bens_boerderij/icon-192.png",
    badge: "/Bens_boerderij/icon-192.png",
    vibrate: [200, 100, 200]
  });
});

// Klik op notificatie → open app
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow("/Bens_boerderij/");
    })
  );
});
