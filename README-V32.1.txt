Campingfinder v32.1 – Versionsfix

Ursache:
Die veröffentlichte v32.0 hatte in version.json, ai-assistant.js und sw.js bereits v32.0,
aber index.html enthielt noch mehrere feste v31.7-Verweise. Genau deshalb zeigte die
Live-App oben weiterhin v31.7 und lud Dateien mit ?v=31.7.0.

v32.1 korrigiert:
- meta campingfinder-version -> 32.1.0
- styles.css?v=32.1.0
- v31-ui.css?v=32.1.0
- logo-campingfinder.png?v=32.1.0
- sichtbares Versionsbadge -> v32.1
- qr-local.js?v=32.1.0
- app.js?v=32.1.0
- ai-assistant.js?v=32.1.0
- Service Worker / Cache -> v32.1

Unbedingt ersetzen:
- index.html
- version.json
- ai-assistant.js
- sw.js

Empfohlen ebenfalls erneut hochladen:
- v31-ui.css
- styles.css
