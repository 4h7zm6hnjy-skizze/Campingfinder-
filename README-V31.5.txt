Campingfinder v31.5 – iPhone/Safari Fix

Der Screenshot zeigte, dass der eingebettete iPhone-Browser weiterhin die alte
Kernoberfläche geladen hat. Ursache war die bisherige Service-Worker-Technik:
v31-ui.css und ai-assistant.js wurden erst nachträglich an styles.css/app.js angehängt.

v31.5 ändert das grundlegend:
- index.html lädt v31-ui.css DIREKT
- index.html lädt ai-assistant.js DIREKT
- styles.css, app.js und qr-local.js erhalten ?v=31.5.0
- Safari kann dadurch keine alten v26-Dateien weiterverwenden
- der Service Worker fügt keine Dateien mehr nachträglich zusammen
- alter Cache wird beim Aktivieren von v31.5 entfernt
- die Seite lädt nach SW-Wechsel einmal automatisch neu
- Doppelstart-Schutz verhindert doppelte KI-/UI-Initialisierung während des Übergangs
- Hauptbuttons bekommen explizite Schrift-/Farbwerte als Safari-Fallback
- neues Logo, by Marcel Hentschel, KI-Suche, Profilübernahme und mobile Darstellung bleiben erhalten

WICHTIG:
Für dieses Update MUSS index.html mit hochgeladen/ersetzt werden.

Zu ersetzen/hochzuladen:
- index.html
- ai-assistant.js
- v31-ui.css
- sw.js
- version.json

Die übrigen v31.4-Dateien können unverändert im Repository bleiben.
