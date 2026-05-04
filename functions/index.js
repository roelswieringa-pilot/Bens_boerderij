// functions/index.js
// Ben's Boerderij — Firebase Cloud Functions
// Deploy met: firebase deploy --only functions

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// ── Helper: stuur notificatie naar alle opgeslagen FCM tokens ──────────────
async function stuurNotificatie({ title, body, icon = "🐔" }) {
  const db = getDatabase();
  const snap = await db.ref("fcmTokens").get();
  if (!snap.exists()) return;
  const allTokens = Object.values(snap.val()).map(t => t.token).filter(Boolean);
  const tokens = [...new Set(allTokens)];
  if (!tokens.length) return;
  const messaging = getMessaging();
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    try {
      await messaging.sendEachForMulticast({
        tokens: batch,
        data: { title, body },
        webpush: { headers: { Urgency: "high" }, data: { title, body } }
      });
    } catch (e) { console.error("FCM batch fout:", e.message); }
  }
}

// ── Helper: bereken volgende abonnementsdatum ─────────────────────────────
function getVolgendeAboDatum(abo, vanafDatum) {
  const start = abo.startdatum || vanafDatum;
  const eind  = abo.einddatum || null;
  const dag   = abo.dag;
  const freq  = abo.frequentie || "week";
  let d = new Date(vanafDatum + "T12:00:00");
  for (let i = 0; i < 370; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (ds < start) { d.setDate(d.getDate() + 1); continue; }
    if (eind && ds > eind) return null;
    if (d.getDay() === dag) {
      if (freq === "week") return ds;
      const startD = new Date(start + "T12:00:00");
      const diffDagen = Math.round((d - startD) / 86400000);
      if (freq === "2week" && diffDagen % 14 === 0) return ds;
      if (freq === "maand") {
        const startDag = startD.getDate();
        if (d.getDate() === startDag || Math.abs(d.getDate() - startDag) <= 6) return ds;
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return null;
}

// ── Notificatie 1: Legdag herinnering — dagelijks 19:00 ───────────────────
exports.legdagHerinnering = onSchedule(
  { schedule: "0 19 * * *", timeZone: "Europe/Amsterdam", region: "europe-west1" },
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
exports.schoonmaakHerinnering = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/Amsterdam", region: "europe-west1" },
  async () => {
    const db = getDatabase();
    const vandaag = new Date().toISOString().slice(0, 10);
    const [instSnap, schoonSnap] = await Promise.all([
      db.ref("instellingen").get(),
      db.ref("schoonmaak").get()
    ]);
    const inst = instSnap.exists() ? instSnap.val() : {};
    const freq = inst.hokFrequentie || 14;
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
    if (!volgende) return;
    if (volgende === vandaag) {
      await stuurNotificatie({
        title: "🧹 Kippenhok schoonmaken!",
        body: `Vandaag is het tijd voor de ${freq}-daagse schoonmaakbeurt. De kippen rekenen op je! 🐔`
      });
    }
  }
);

// ── Notificatie 3: Nieuwe reservering — elke minuut checken ─────────────
exports.nieuweReservering = onSchedule(
  { schedule: "* * * * *", timeZone: "Europe/Amsterdam", region: "europe-west1" },
  async () => {
    const db = getDatabase();
    const [resSnap, verstuurdSnap] = await Promise.all([
      db.ref("reserveringen").get(),
      db.ref("fcmVerstuurd").get()
    ]);
    if (!resSnap.exists()) return;
    const reserveringen = resSnap.val();
    const verstuurd = verstuurdSnap.exists() ? verstuurdSnap.val() : {};
    const nieuw = Object.entries(reserveringen).filter(([id, r]) =>
      r.status === "nieuw" && !verstuurd[id]
    );
    for (const [id, res] of nieuw) {
      await db.ref("fcmVerstuurd/" + id).set({ verstuurd: Date.now() });
      const datum = new Date(res.datum + "T12:00:00").toLocaleDateString("nl-NL", {
        weekday: "long", day: "numeric", month: "long"
      });
      const doosje = res.aantal === 10 ? "doosje 10" : "doosje 6";
      await stuurNotificatie({
        title: "🔔 Nieuwe reservering!",
        body: `${res.naam} wil een ${doosje} reserveren voor ${datum}.`
      });
    }
  }
);

// ── Notificatie 4: Voorraad waarschuwing — dagelijks 09:00 ───────────────
exports.voorraadWaarschuwing = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Europe/Amsterdam", region: "europe-west1" },
  async () => {
    const db = getDatabase();
    const pubSnap = await db.ref("publiek").get();
    if (!pubSnap.exists()) return;
    const pub = pubSnap.val();
    const voorraad = typeof pub.voorraad === "number" ? pub.voorraad : 0;
    const gemDag   = typeof pub.gemDag   === "number" ? pub.gemDag   : 0;
    const verwacht = voorraad + gemDag;
    let title, body;
    if (voorraad > 12 && verwacht > 16) {
      title = "📦 Voorraad loopt op!";
      body  = `Je hebt ${voorraad} eieren op voorraad en verwacht er morgen ${gemDag} bij. Tijd om klanten te tippen! 🥚`;
    } else if (voorraad > 12) {
      title = "📦 Voorraad wordt groot";
      body  = `${voorraad} eieren liggen te wachten. Overweeg om een paar klanten te benaderen. 🥚`;
    } else {
      return;
    }
    await stuurNotificatie({ title, body });
  }
);

// ── Functie 5: Abonnement reserveringen aanmaken — dagelijks 07:00 ────────
// Checkt elke ochtend welke abonnees vandaag een bezorging verwachten,
// maakt automatisch een reservering aan en stuurt een pushmelding.
exports.abonnementReserveringen = onSchedule(
  { schedule: "0 7 * * *", timeZone: "Europe/Amsterdam", region: "europe-west1" },
  async () => {
    const db = getDatabase();
    const vandaag = new Date().toISOString().slice(0, 10);
    const [aboSnap, resSnap, instSnap] = await Promise.all([
      db.ref("abonnementen").get(),
      db.ref("reserveringen").get(),
      db.ref("instellingen").get()
    ]);
    if (!aboSnap.exists()) return;
    const abonnementen  = Object.entries(aboSnap.val()).map(([k, v]) => ({ ...v, _key: k }));
    const reserveringen = resSnap.exists() ? Object.values(resSnap.val()) : [];
    const inst          = instSnap.exists() ? instSnap.val() : {};
    const actief        = abonnementen.filter(a => a.status === "actief");
    const nieuw         = [];
    for (const abo of actief) {
      const volgende = getVolgendeAboDatum(abo, vandaag);
      if (!volgende || volgende !== vandaag) continue;
      const bestaatAl = reserveringen.some(r =>
        r.naam === abo.naam && r.datum === vandaag && r.abonnementKey === abo._key
      );
      if (bestaatAl) continue;
      const doosPrijs = abo.doosje === 10 ? (inst.prijsDoosje10 || 4.00) : (inst.prijsDoosje6 || 2.50);
      const key = db.ref("reserveringen").push().key;
      await db.ref("reserveringen/" + key).set({
        naam: abo.naam, tel: abo.tel || "", datum: vandaag,
        aantal: abo.doosje, doosPrijs, status: "nieuw", aangemeld: vandaag,
        abonnementKey: abo._key, type: "abonnement"
      });
      nieuw.push({ naam: abo.naam, aantal: abo.doosje });
    }
    if (nieuw.length > 0) {
      const namen  = nieuw.map(r => r.naam).join(", ");
      const totaal = nieuw.reduce((s, r) => s + r.aantal, 0);
      await stuurNotificatie({
        title: "🔄 Abonnement reserveringen klaar",
        body:  `${nieuw.length} abonnement(en) voor vandaag: ${namen} — totaal ${totaal} eieren`
      });
    }
  }
);
