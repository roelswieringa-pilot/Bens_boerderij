# Backlog — Ben's Boerderij

Openstaande punten voor een volgende sessie.

## 1. Cloud Functions deploy werkt niet

`firebase deploy --only functions` faalt met:
`User code failed to load. Cannot determine backend specification. Timeout after 10000.`

- De code zelf is in orde; het is een tooling-probleem (discovery-stap loopt vast).
- `firebase-functions` en `firebase-admin` zijn al geüpdatet naar de nieuwste versie.
- Nog te proberen: `firebase-tools` CLI bijwerken (`npm install -g firebase-tools@latest`)
  en Node-versie afstemmen op `"node": "22"` uit `functions/package.json`.
- Niet kritiek: de app maakt abonnementsreserveringen sinds v6.3 zelf aan; de
  Cloud Function is alleen nog een back-up. De Cloud Function-wijziging in
  `functions/index.js` (markeren van verwerkte leverdag) staat dus nog niet live.

## 2. Beveiliging tegen dubbele verkoopregistratie

Toon een waarschuwing wanneer er al een verkoop bestaat voor dezelfde klant op
dezelfde datum, zodat een reservering niet per ongeluk twee keer als verkoop
wordt geregistreerd.
