# Backlog — Ben's Boerderij

Openstaande punten voor een volgende sessie.

## 1. Migratie van GitHub Pages naar Firebase Hosting afronden — repo private maken

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
