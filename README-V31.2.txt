Campingfinder v31.2 – Update-Fix

Warum v31.2:
Die v31.1-Dateien waren korrekt auf GitHub Pages veröffentlicht, aber index.html lädt
weiterhin die v30-Kern-Dateien app.js und styles.css. v31.1 ergänzt diese über den
Service Worker. Ein bereits geöffneter Browser konnte deshalb zunächst noch die alte
Oberfläche zeigen.

v31.2 behebt das:
- neuer Service Worker campingfinder-v31-2
- nach Aktivierung wird ein offenes Campingfinder-Fenster automatisch einmal neu geladen
- v31-ui.css und ai-assistant.js werden in den Offline-Cache aufgenommen
- app.js/styles.css haben einen robusten Netzwerk-/Cache-Fallback
- Version auf 31.2.0 erhöht
- Update-Suche und Versionsanzeige bleiben erhalten

Hochladen/ersetzen:
1. ai-assistant.js ersetzen
2. sw.js ersetzen
3. version.json ersetzen
4. v31-ui.css kann unverändert erneut hochgeladen werden

Danach GitHub Pages veröffentlichen lassen. Beim nächsten Öffnen erkennt der alte
Service Worker die neue Version; nach Aktivierung erfolgt ein einmaliger automatischer Reload.
