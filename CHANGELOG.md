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

