Campingfinder v31.7 – iPhone Sofortdarstellung

Warum dieses Update:
Auf dem iPhone wurde trotz erfolgreicher v31.6-Veröffentlichung zuerst weiterhin
die alte Grundoberfläche angezeigt. Die gewünschte Oberfläche hing noch zu stark
davon ab, dass ai-assistant.js bereits ausgeführt wurde.

v31.7 behebt das:
- body-Klassen für das neue Design stehen direkt in index.html
- großes Campingfinder-Logo steht direkt in index.html
- Versionsanzeige steht direkt in index.html
- Update-Button steht direkt in index.html
- KI-Suche / Klassische Suche stehen direkt in index.html
- KI-Eingabefeld + Mit-KI-suchen-Button stehen direkt in index.html
- Profilkarte steht direkt in index.html
- JavaScript verbindet nur noch die Funktionen mit den bereits sichtbaren Elementen
- dadurch erscheint das neue Design sofort, auch wenn iPhone/Safari/ChatGPT-Browser
  JavaScript oder den Service Worker etwas später startet

Unbedingt hochladen/ersetzen:
- index.html
- ai-assistant.js
- v31-ui.css
- sw.js
- version.json

Die Logo-Dateien sind ebenfalls im Paket enthalten.
