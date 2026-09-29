# v27

- Routenplaner findet pro Idealstopp automatisch den nächstgelegenen Camping-/Wohnmobilplatz.
- Suchradius erweitert sich bei Bedarf schrittweise bis 200 km.
- Route wird über die realen Übernachtungsplätze neu berechnet.
- Etappen-Kilometer und Fahrzeiten basieren auf der angepassten Route.
- Automatisch gewählte Stopps werden trotz alter Finder-Filter sichtbar gehalten.
- Doppelte Verwendung desselben Platzes bei mehreren Übernachtungen wird vermieden.
- PWA-Cache auf v27 angehoben.

# v26

- Ergebnislisten auf PC, Tablet und Smartphone repariert.
- Platznamen und Adressen werden vollständig sichtbar dargestellt und nicht mehr durch zusammenfallende Kartenhöhen abgeschnitten.
- Ergebniszeilen verwenden Inhalts-Höhen statt komprimierter Rasterzeilen.
- Lange Platznamen dürfen mehrzeilig umbrechen.
- Mobile Ergebnisaktionen bleiben innerhalb der Karte sichtbar.

# Campingfinder v25

## v25 – Audit & Stabilität
- Geografische Meer-/Inland-Erkennung funktioniert jetzt auch bei einer konkreten Orts- oder Regionssuche.
- Intelligente Suche erkennt alle Länder aus der Länderauswahl auf Deutsch sowie zusätzliche englische Ländernamen.
- Übernachtungsstopp-Suche im Routenplaner fragt jeden Stopp getrennt ab; einzelne Serverfehler reißen nicht mehr die komplette Stoppsuche mit.
- Routenmarker zeigen bei Stopp 2, 3 usw. die kumulierten Kilometer ab Start korrekt an.
- Zusätzliche Accessibility-Beschriftungen und Dokumentation bereinigt.
- PWA-Cache auf v25 angehoben.

# Campingfinder v24

## v24
- Routenplaner: 0–8 Zwischenübernachtungen auswählbar.
- 1 Übernachtung liegt exakt bei 50 % der Route; mehrere Übernachtungen teilen die Fahrt in möglichst gleich lange Etappen.
- Campingplatzsuche kann auf die geplanten Übernachtungspunkte begrenzt werden statt auf den gesamten Routenkorridor.
- Karte zeigt Start, Ziel und nummerierte Übernachtungsstopps.
- Kilometer und Fahrzeit werden für die Gesamtroute und jede einzelne Fahretappe angezeigt.
- Ergebnisliste kennzeichnet, zu welchem Übernachtungsstopp ein Platz gehört und wie weit er vom Zielpunkt entfernt liegt.


- Länder-Suche neu aufgebaut: Overpass erhält nur kleine Bounding-Box-Abfragen, keine kombinierte Länderflächen-Abfrage mehr.
- Zugehörigkeit zum Land wird lokal mit einer vereinfachten Nominatim-GeoJSON-Landesgrenze geprüft.
- Küstensuche lädt zuerst normale Campingplätze und prüft geografisch die Distanz zu OSM-Küstenlinien (ca. 30 km).
- Weniger Teilabfragen und kürzere Timeouts; 0-Treffer-Suchen bleiben nicht mehr minutenlang hängen.
- Weiterhin ohne kostenpflichtige API-Schlüssel.

# Campingfinder – Changelog

## v21
- „In meiner Nähe“ bis 600 km erweitert.
- Neue Radien: 150, 200, 300, 400, 500 und 600 km.
- Große Umkreise werden serverfreundlich in Teilgebiete zerlegt und anschließend exakt nach Luftlinienentfernung gefiltert.
- Kartenansicht passt bei großen Radien automatisch alle Treffer ein.

# Campingfinder v20

- Intelligente Suche: Wunschbegriffe werden bei erkanntem Land nicht mehr automatisch als Ort/Region übernommen.
- Beispiel: „Frankreich mit Pool und Rutsche“ lässt das Ortsfeld leer und setzt nur Land + Filter.
- Ein Ort innerhalb eines Landes wird nur bei eindeutiger Formulierung wie „Frankreich in Nizza mit Pool“ übernommen.
- „Rutsche“ (Singular) sowie weitere Varianten werden jetzt als Wasserpark/Rutschen-Filter erkannt.

# Campingfinder – Changelog

## v19 – Intelligente Küstensuche
- „Frankreich und Meer“ sowie vergleichbare Länder+Meer-Suchen nutzen jetzt echte OpenStreetMap-Küstenlinien statt nur Text-Tags an Campingplätzen.
- Campingplätze/Wohnmobilstellplätze werden bei Länder+Meer-Suche bis ca. 30 km Luftlinie von der Küste gesucht.
- Küstensuche wird wie die normale Ländersuche in kleine Teilgebiete zerlegt, damit freie Overpass-Server weniger schnell überlasten.
- Treffer aus der geografischen Küstensuche werden transparent als Küstennähe behandelt.

## v18 – Eindeutige Ortsauswahl
- Bei mehrfach vorkommenden Orts- und Städtenamen fragt Campingfinder jetzt nach dem gemeinten Ort.
- Auswahl zeigt Ort, Region/Bundesland und Land sowie den vollständigen Nominatim-Namen.
- Die Suche startet erst nach der Auswahl; Abbrechen verändert die bisherigen Treffer nicht.
- Routensuche behält ihre bestehenden Start-/Zielvorschläge.
- PWA-Cache auf v18 angehoben.

## v15 – robuste Länder-Suche
- Große Länder werden nicht mehr in einer einzigen Overpass-Abfrage geladen.
- Länder werden automatisch in kleinere Kartenbereiche aufgeteilt und schrittweise zusammengeführt.
- Teilbereiche mit 429/5xx/Timeout werden automatisch weiter geteilt.
- Bereits geladene Treffer bleiben erhalten, wenn einzelne Teilbereiche vorübergehend ausfallen.
- Abfragen werden innerhalb der Landesgrenze UND des jeweiligen Kartenabschnitts begrenzt.
- Overpass-Ausgabe auf geografische Sortierung (`qt`) optimiert.
- PWA-Cache auf v15 aktualisiert.

## Version 14 – Mobile & Suche
- Overpass-Suchabfragen korrigiert (Union-Blöcke werden korrekt mit Semikolon abgeschlossen).
- Suche nach Land, Ort, Kartenbereich, Nähe und Route repariert.
- iPhone-Hochformat deutlich kompakter und touchfreundlicher.
- iOS-Formularzoom verhindert (Formularschrift mindestens 16 px).
- Kinderalter: beliebig mehrere Kinder über „+ Kind hinzufügen“ statt Komma-Eingabe.
- PWA-Cache auf v14 angehoben.

## Version 13
- Stabilitäts-/Offline-Fallback für die Kartenbibliothek
- PWA-Cache aktualisiert
- PC-, Tablet- und Smartphone-Ausgabe final geprüft
- direkter Hinweis zum Melden von Kartenfehlern ergänzt
- teilbare Suche, lokaler QR-Code, Familien-Assistent, 4er-Vergleich, Kalenderexport, Druck-Reisemappe und Statistik aus Version 12 beibehalten

## Version 12
- teilbare Suche per URL und lokal erzeugtem QR-Code
- Familien-Assistent mit Ja / Nein / Unbekannt
- Vergleich bis zu vier Plätze
- Reisebeginn und Nächte je Etappe
- Kalenderexport `.ics`
- Druck-/PDF-Reisemappe
- lokale Camping-Statistik
- Routenplaner und Overpass-Zwischencache verbessert

## Version 11
- intelligente lokale Freitextsuche
- Datenqualitätsanzeige
- Reisebudget
- Desktop-Splitansicht und Strg/Cmd+K
## v16 – sichere Navigation / Ortsauswahl
- Start und Ziel zeigen Ortsvorschläge vor der Routenberechnung.
- Mehrdeutige Orte müssen bewusst ausgewählt werden.
- Häufige Tippfehler wie „garderssee“ werden als Gardasee vorgeschlagen.
- Die Route zeigt den tatsächlich aufgelösten Ortsnamen statt nur den eingegebenen Text.
- Eigenen Standort und Start↔Ziel behalten die bestätigten Koordinaten.

## v17
- Ergebnisliste und Karte direkt miteinander verknüpft.
- Klick auf einen Platz in der Liste zoomt auf den Platz und öffnet den Marker.
- Ausgewählter Platz wird in Liste und Karte hervorgehoben.
- Ohne Auswahl bzw. über ‘Alle Treffer’ wird die Karte automatisch auf alle aktuellen Treffer angepasst.
- Auf Smartphones wechselt eine Platzauswahl automatisch zur Kartenansicht.


## v22
- Länderabfragen robuster für abweichende OSM-Landesrelationen, besonders Niederlande.
- ISO3166-1:alpha2 wird zusätzlich unterstützt.
- Europäische Suchgrenzen verhindern falsche globale/Übersee-Suchflächen.
- Küstensuche hat einen bbox-basierten Fallback und fällt bei 0 Treffern sofort sinnvoll zurück.
- Niederlande + Meer verwendet den europäischen Niederlande-Bereich.