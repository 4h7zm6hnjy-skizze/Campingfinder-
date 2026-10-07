Campingfinder v31 – Update

Enthalten:
- sw.js                 -> ersetzt die vorhandene sw.js
- v31-ui.css            -> neue Datei
- ai-assistant.js       -> neue Datei

Was v31 ändert:
- Keine bestehende Funktion wird entfernt.
- Reihenfolge wird vereinfacht:
  Suche -> Treffer/Karte -> Route -> Reise -> Meine Plätze -> Helfer.
- Zusätzlicher Schnellzugriff auf die wichtigsten Bereiche.
- Umschalter zwischen KI-Suche und klassischer Suche.
- Kostenlose Browser-KI über WebLLM, ohne eigenen API-Schlüssel.
- KI wird nur bei Bedarf geladen.
- Wenn WebGPU/WebLLM nicht verfügbar ist, nutzt die App automatisch die bisherige intelligente Suche.
- Route wird zusätzlich in der mobilen Navigation sichtbar.

Installation in GitHub:
1. v31-ui.css in das Hauptverzeichnis des Campingfinder-Repositories hochladen.
2. ai-assistant.js ebenfalls in das Hauptverzeichnis hochladen.
3. Die vorhandene sw.js durch die beiliegende sw.js ersetzen.
4. GitHub Pages vollständig neu laden. Falls noch die alte Oberfläche erscheint:
   App/Browser einmal vollständig schließen und erneut öffnen bzw. neu laden.

Wichtig:
Die bestehende index.html, app.js und styles.css müssen für dieses Update nicht ersetzt werden.
Dadurch bleibt die bisherige Campingfinder-v30-Kernlogik erhalten.

KI:
Die Browser-KI benötigt auf unterstützten Geräten WebGPU.
Das Modell wird beim ersten KI-Aufruf geladen und kann je nach Gerät/Browser Speicherplatz und Rechenleistung benötigen.
Ist das nicht möglich, bleibt die Suche dank Fallback funktionsfähig.
