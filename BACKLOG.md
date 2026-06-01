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

## 3. Migratie van GitHub Pages naar Firebase Hosting afronden — repo private maken

**Doel:** de site van Bens_boerderij volledig hosten op Firebase Hosting (zoals
de dagplanner op `dagplanner-f03ae.web.app`), zodat de GitHub-repo op Private
kan zonder dat de site offline gaat.

**Context:**
- Repo staat nu op Public in org `roelswieringa-pilot`, met een live GitHub
  Pages-site op `https://roelswieringa-pilot.github.io/Bens_boerderij/`.
- GitHub Pages werkt op het Free plan alleen voor publieke repos — daarom moet
  de hosting naar Firebase verhuizen om de repo private te kunnen maken.
- Firebase Hosting draait al op `https://benboerderij-6e7c2.web.app` — de
  technische migratie is grotendeels gedaan. Restwerk is vooral de cutover en
  het privaat maken.

**Stappen:**
1. Controleer of er gevoelige data (klantgegevens, adressen, financiële info)
   in de repo staat — die is nu publiek leesbaar. **Prioriteit** als dat zo is.
2. Verifieer dat `benboerderij-6e7c2.web.app` alle functionaliteit dekt die nu
   ook via de GitHub Pages-URL werkt.
3. Communiceer de nieuwe Firebase-link naar Ben en eventuele andere
   gebruikers; laat beide URLs nog even náást elkaar lopen.
4. Schakel GitHub Pages uit (Settings → Pages → Source: None) zodra iedereen
   over is.
5. Zet de repo op Private (Settings → General → Danger Zone → Change
   visibility).

