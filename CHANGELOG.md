# Campingfinder – Changelog

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