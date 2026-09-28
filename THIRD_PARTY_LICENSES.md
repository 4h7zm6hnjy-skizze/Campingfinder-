# Campingfinder – Datenquellen und Fremdkomponenten

Campingfinder selbst: © 2026 Marcel Hentschel.

Die App ist so ausgelegt, dass sie ohne kostenpflichtige API-Schlüssel oder Abo-Dienste betrieben werden kann. „Kostenlos“ bedeutet dabei nicht „ohne Lizenzbedingungen“: freie Daten und Open-Source-Software haben weiterhin Bedingungen wie Namensnennung.

## OpenStreetMap
- Daten: OpenStreetMap-Mitwirkende
- Lizenz: Open Database License (ODbL)
- Nutzung in Campingfinder: Campingplatz-/Stellplatzdaten und Standardkarte
- Erforderlich: sichtbare Namensnennung/Attribution

## Overpass API
- Nutzung: Abfrage von OpenStreetMap-Daten
- Öffentliche Instanzen sind Gemeinschaftsdienste mit Nutzungsgrenzen und ohne Verfügbarkeitsgarantie.
- Die App enthält mehrere austauschbare öffentliche Endpunkte.

## Nominatim
- Nutzung: Orts- und Regionssuche
- Öffentlicher Dienst mit strengen Nutzungsgrenzen; Campingfinder cached Suchergebnisse lokal und verwendet keine Autocomplete-Dauerabfragen.
- Datenbasis: OpenStreetMap / ODbL

## OpenTopoMap
- Nutzung: optionale topografische Kartenebene
- Lizenz der Online-Karte: CC-BY-SA
- Namensnennung wird direkt in der Kartenebene angezeigt.

## Open-Meteo
- Nutzung: aktuelles Wetter und Vorhersage
- Wetterdaten: CC BY 4.0
- Öffentliche Free API: ohne API-Key für nicht-kommerzielle Nutzung, mit Nutzungsgrenzen
- Server-Software ist Open Source (AGPLv3) und kann bei Bedarf selbst betrieben werden.

## Leaflet 1.9.4
- Nutzung: interaktive Karte im Browser
- Lizenz: BSD 2-Clause
- Projekt: https://leafletjs.com/

## OSRM
- Nutzung: Routenberechnung
- Software-Lizenz: BSD 2-Clause
- Die aktuell verwendete öffentliche Demo-Instanz ist ein Gratis-/Best-Effort-Dienst ohne Verfügbarkeitsgarantie.
- Für langfristige Unabhängigkeit kann OSRM selbst betrieben oder durch einen anderen freien Routing-Endpunkt ersetzt werden.

## Grundsatz
Campingfinder soll keine Funktion enthalten, für die ein kostenpflichtiger API-Schlüssel zwingend erforderlich ist. Externe kostenlose Dienste können ihre Nutzungsbedingungen oder Limits ändern. Deshalb werden Endpunkte im Code zentral definiert und können ausgetauscht werden.

## Lokaler QR-Code-Generator
- Datei: `qr-local.js`
- Nutzung: Erzeugung des QR-Codes für teilbare Campingfinder-Suchen vollständig im Browser
- Implementierung: projektspezifischer eigener Code; keine externe QR-API und keine zusätzliche Fremdbibliothek erforderlich
