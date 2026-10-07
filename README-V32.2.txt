# Campingfinder v32.2 – Komplettversion

Diese Version wurde aus dem tatsächlich veröffentlichten GitHub-Pages-Stand v32.1 aufgebaut und vollständig geprüft.

## Behobene Hauptfehler

- Endlosschleife im Versions-MutationObserver behoben. Sie konnte Safari/iPhone nach dem ersten Seitenaufbau blockieren.
- Zweite mögliche MutationObserver-Endlosschleife bei „Offizielle Homepage“-Links behoben.
- v32-Responsive-Layout wird nicht mehr erst per JavaScript in die Seite injiziert, sondern direkt als CSS geladen.
- `cf-v32` ist bereits statisch am `<body>` gesetzt: das richtige Layout ist vor JavaScript sichtbar.
- Mobile Bottom-Navigation besitzt jetzt fest 6 Bereiche: Finden, Karte, Route, Reise, Meine Plätze, Helfer.
- Safari/iPhone-Härtung: Karten/Abschnitte dürfen nicht durch `overflow:hidden` oder Grid-Zeilen abgeschnitten werden.
- Service-Worker-Cache und alle Versionsangaben auf 32.2.0 vereinheitlicht.

## Upload

Empfehlung: Den Inhalt dieses ZIPs in das Hauptverzeichnis des GitHub-Repositories hochladen und vorhandene Dateien ersetzen.
Die App-Dateien liegen direkt im ZIP-Stamm, nicht in einem zusätzlichen Unterordner.
