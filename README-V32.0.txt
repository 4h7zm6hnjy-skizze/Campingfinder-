Campingfinder v32.0 – Responsive Neuaufbau
© 2026 Marcel Hentschel

Diese Version behebt die auf dem iPhone sichtbaren seitlichen Verschiebungen/Abschneidungen.

Enthalten:
- ai-assistant.js  -> komplett ersetzen
- sw.js            -> komplett ersetzen
- version.json     -> komplett ersetzen

Wichtig:
Die übrigen Dateien aus deiner aktuellen Version bleiben im GitHub-Ordner unverändert:
index.html, app.js, styles.css, v31-ui.css, qr-local.js, manifest.webmanifest und alle Bilddateien.

Was v32.0 ändert:
- Bildschirmbreite wird auf Smartphone/Tablet konsequent eingehalten
- kein horizontales Abschneiden der App
- Header/Logo/Versionsanzeige kompakt
- KI-Suche und klassische Suche passen sich der Breite an
- Profilkarte und Schnellfilter werden sauber dargestellt
- Filter bleiben im Container; horizontale Chips scrollen nur intern
- Karte und Ergebnisliste passen auf Handy/Tablet
- Ergebnis-Aktionen umbrechen korrekt
- Route/Reise/Helfer werden einspaltig auf Handy und mehrspaltig auf Tablet/PC
- feste Bottom-Navigation innerhalb der Displaybreite
- Update-System ist auf v32.0.0 umgestellt
- Service Worker erzwingt v32-Cache-Busting

UPLOAD:
1. Im GitHub-Repository Campingfinder- die drei Dateien aus diesem Ordner hochladen.
2. Bei gleicher Datei „Replace/Overwrite“ wählen.
3. Warten, bis GitHub Pages neu veröffentlicht wurde.
4. App neu öffnen.
5. Falls noch die alte Ansicht erscheint: einmal „Update suchen“ drücken und danach neu laden.

Es ist KEINE Änderung an index.html nötig.
