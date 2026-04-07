// functions/index.js
// Ben's Boerderij — Firebase Cloud Functions
// Deploy met: firebase deploy --only functions

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueCreated } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// ── Helper: stuur notificatie naar alle opgeslagen FCM tokens ──────────────
async function stuurNotificatie({ title, body, icon = "🐔" }) {
  const db = getDatabase();
  const snap = await db.ref("fcmTokens").get();
  if (!snap.exists()) return;

  // Dedupliceer tokens — voorkom dubbele meldingen
  const allTokens = Object.values(snap.val()).map(t => t.token).filter(Boolean);
  const tokens = [...new Set(allTokens)];
  if (!tokens.length) return;

  const messaging = getMessaging();

  // Stuur in batches van max 500 (FCM limiet)
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    try {
      await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        webpush: {
          notification: { title, body, icon: "/icon-192.png", badge: "/icon-192.png" },
          fcmOptions: { link: "/" }
        }
      });
    } catch (e) {
      console.error("FCM batch fout:", e.message);
    }
  }
}

// ── Notificatie 1: Legdag herinnering — dagelijks 19:00 ───────────────────
// Elke dag om 19:00 checkt of de legdag van vandaag al is ingevuld.
// Als niet: stuur een vriendelijke herinnering.
exports.legdagHerinnering = onSchedule(
  { schedule: "0 19 * * *", timeZone: "Europe/Amsterdam" },
  async () => {
    const db = getDatabase();
    const vandaag = new Date().toISOString().slice(0, 10);

    const snap = await db.ref("legdagen").get();
    const legdagen = snap.exists() ? Object.values(snap.val()) : [];
    const vandaagIngevuld = legdagen.some(r => r.datum === vandaag);

    if (!vandaagIngevuld) {
      await stuurNotificatie({
        title: "🥚 Legdag nog niet ingevuld!",
        body: "Je hebt de eieren van vandaag nog niet geregistreerd. Even snel invullen?"
      });
    }
  }
);

// ── Notificatie 2: Schoonmaak herinnering — dagelijks 08:00 ──────────────
// Elke ochtend om 08:00 checkt of vandaag de geplande schoonmaakdatum is.
exports.schoonmaakHerinnering = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/Amsterdam" },
  async () => {
    const db = getDatabase();
    const vandaag = new Date().toISOString().slice(0, 10);

    // Lees instellingen en schoonmaakhistorie
    const [instSnap, schoonSnap] = await Promise.all([
      db.ref("instellingen").get(),
      db.ref("schoonmaak").get()
    ]);

    const inst = instSnap.exists() ? instSnap.val() : {};
    const freq = inst.hokFrequentie || 14;

    // Bepaal volgende schoonmaakdatum
    let volgende;
    if (schoonSnap.exists()) {
      const echte = Object.values(schoonSnap.val())
        .filter(r => !r.type || r.type !== "uitstel")
        .sort((a, b) => b.datum.localeCompare(a.datum));

      if (echte.length > 0) {
        const laatste = new Date(echte[0].datum + "T12:00:00");
        laatste.setDate(laatste.getDate() + freq);
        volgende = laatste.toISOString().slice(0, 10);
      }
    }

    // Geen historie: geen melding (app toont al de eerste aanstaande woensdag)
    if (!volgende) return;

    if (volgende === vandaag) {
      await stuurNotificatie({
        title: "🧹 Kippenhok schoonmaken!",
        body: `Vandaag is het tijd voor de ${freq}-daagse schoonmaakbeurt. De kippen rekenen op je! 🐔`
      });
    }
  }
);

// ── Notificatie 3: Nieuwe reservering — direct bij aanmaken ──────────────
// Vuurt direct als er een nieuwe reservering in de database verschijnt.
exports.nieuweReservering = onValueCreated(
  { ref: "/reserveringen/{resId}", region: "europe-west1" },
  async (event) => {
    const res = event.data.val();
    if (!res || res.status !== "nieuw") return;

    const datum = new Date(res.datum + "T12:00:00").toLocaleDateString("nl-NL", {
      weekday: "long", day: "numeric", month: "long"
    });
    const doosje = res.aantal === 10 ? "doosje 10" : "doosje 6";

    await stuurNotificatie({
      title: "🔔 Nieuwe reservering!",
      body: `${res.naam} wil een ${doosje} reserveren voor ${datum}.`
    });
  }
);

// ── Notificatie 4: Voorraad waarschuwing — dagelijks 09:00 ───────────────
// Checkt dagelijks of de voorraad boven de drempel ligt.
// Drempel 1: voorraad > 12
// Drempel 2: voorraad + verwachte productie morgen > 16
exports.voorraadWaarschuwing = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Europe/Amsterdam" },
  async () => {
    const db = getDatabase();

    const pubSnap = await db.ref("publiek").get();
    if (!pubSnap.exists()) return;

    const pub = pubSnap.val();
    const voorraad = typeof pub.voorraad === "number" ? pub.voorraad : 0;
    const gemDag = typeof pub.gemDag === "number" ? pub.gemDag : 0;
    const verwacht = voorraad + gemDag; // voorraad + verwachte productie morgen

    let title, body;

    if (voorraad > 12 && verwacht > 16) {
      title = "📦 Voorraad loopt op!";
      body = `Je hebt ${voorraad} eieren op voorraad en verwacht er morgen ${gemDag} bij. Tijd om klanten te tippen! 🥚`;
    } else if (voorraad > 12) {
      title = "📦 Voorraad wordt groot";
      body = `${voorraad} eieren liggen te wachten. Overweeg om een paar klanten te benaderen. 🥚`;
    } else {
      return; // Geen waarschuwing nodig
    }

    await stuurNotificatie({ title, body });
  }
);
