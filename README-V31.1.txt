Campingfinder v31.1 – Versionsanzeige & Update-Suche

Diese Dateien hochladen:
1. v31-ui.css           -> vorhandene v31-ui.css ersetzen
2. ai-assistant.js      -> vorhandene ai-assistant.js ersetzen
3. sw.js                -> vorhandene sw.js ersetzen
4. version.json         -> NEU ins Hauptverzeichnis

Neu:
- Oben direkt am Campingfinder-Logo steht die aktuelle Version.
- "Update suchen" erscheint in der Kopfzeile.
- Die App prüft nach dem Start automatisch auf Updates.
- Ist eine neue Version verfügbar, wird die Versionsanzeige hervorgehoben.
- Der Update-Button bekommt einen roten Hinweis-Punkt.
- Manuelle Suche über "Update suchen".
- version.json dient als eindeutige Online-Versionsquelle.
- Service Worker wird ebenfalls aktiv auf eine neue Version geprüft.

Für spätere Updates:
In jeder neuen Version sowohl APP_VERSION in ai-assistant.js als auch
"version" in version.json erhöhen, z. B. 31.2.0, 32.0.0 usw.

Bestehende Kern-Dateien index.html, app.js und styles.css werden weiterhin nicht ersetzt.
