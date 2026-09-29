# Campingfinder

**Aktuelle Version: v15** – robuste Länder-Suche mit automatischer Teilgebietsabfrage statt großer Einzelabfragen.

**Slogan:** Ganz Europa gehört dir.

Professionelle responsive Web-App zum Finden von Campingplätzen und Wohnmobilstellplätzen in Europa.

## Intelligente Küstensuche (v19)
Die intelligente Suche erkennt Kombinationen wie „Frankreich und Meer“. Bei einer Länder+Meer-Suche werden Campingplätze nicht nur anhand unvollständiger Platz-Tags gefiltert, sondern geografisch bis ungefähr 30 km von echten `natural=coastline`-Linien aus OpenStreetMap gesucht. Dadurch werden wesentlich mehr reale Küstenplätze gefunden. Die Suche bleibt ohne kostenpflichtigen API-Schlüssel.


## Funktionen
- Europaweite Suche nach Land, Ort, Region oder Platzname
- Campingplätze und Wohnmobilstellplätze
- Schnellwahl für Camping, Wohnmobil, Van, Wohnwagen, Zelt und Glamping
- Nähe-Suche mit 10 / 25 / 50 / 100 / 250 km
- Routensuche mit 5 / 10 / 25 km Korridor
- Karten- und Topografieansicht mit automatischer Treffer-Clusterung
- Aktuelles Wetter und 7-Tage-Vorschau
- Umfangreiche, gruppierte Filter
- Original-Webseiten der Plätze, wenn in den Quelldaten vorhanden
- Vergleich von bis zu vier Plätzen
- Favoritenlisten, besuchte Plätze, private Notizen und Camping-Tagebuch
- Familienprofil mit automatischen Baby-/Kleinkind-/Kinder-/Jugendlichen-Filtern
- Reiseplaner mit sortierbaren Etappen und Straßenroutenanzeige
- GPX- und KML-Export der geplanten Reise
- Offline-Reisemappe mit letzter Suchkopie sowie JSON-Export/-Import
- Kostenrechner, Packliste, Abfahrtscheck und Notfallbereich
- Deutsch, Englisch, Niederländisch, Französisch, Italienisch, Spanisch und Polnisch in den zentralen App-Bereichen
- PWA-Installation und lokales Speichern persönlicher Daten
- Heller und dunkler Darstellungsmodus
- Professionelle Ergebnis-Karten mit Datenstatus und einheitlichen Camping-/Stellplatz-Symbolen
- Professionelle Detailansicht mit Betreiber-Webseite, Quelle und Datenstand
- Mobile Bottom-Navigation, Liste/Karte-Umschalter und responsive Desktop-Split-Ansicht
- Transparente Datenhinweise sowie Impressum-/Datenschutz-Platzhalter

## Datenquellen
- OpenStreetMap / Overpass API: Camping- und Stellplatzdaten
- Open-Meteo: Wetter
- OSRM: Routing
- OpenStreetMap und OpenTopoMap: Kartenebenen

## Wichtig
Offene Kartendaten sind nicht garantiert vollständig. Campingfinder zeigt Informationen nur an, wenn sie im Datensatz vorhanden oder ausdrücklich als abgeleitete Heuristik gekennzeichnet sind. Fehlende Daten werden nicht erfunden.

Vor einer öffentlichen Veröffentlichung in Deutschland müssen Impressum und Datenschutz um die tatsächlich erforderlichen Betreiber-, Kontakt- und Rechtsangaben ergänzt und geprüft werden.

© 2026 Marcel Hentschel

## Kosten- und Lizenzgrundsatz

Campingfinder benötigt keine kostenpflichtigen API-Schlüssel. Verwendet werden freie/Open-Source-Komponenten und öffentlich zugängliche Gratisdienste. Diese sind nicht „lizenzlos“: OpenStreetMap, OpenTopoMap, Open-Meteo, Leaflet und OSRM haben jeweils eigene freie Lizenzen bzw. Nutzungsbedingungen und müssen korrekt genannt werden.

Die öffentliche Open-Meteo-Free-API ist für nicht-kommerzielle Nutzung kostenlos und begrenzt. Öffentliche OSM-/Nominatim-/Overpass-/OSRM-Dienste sind Best-Effort-Angebote mit Nutzungsgrenzen. Deshalb sind die Endpunkte in der App austauschbar gehalten. Details stehen in `THIRD_PARTY_LICENSES.md`.

Die App verwendet bewusst keine proprietäre Satellitenebene. Das Kartenangebot bleibt bei freien Quellen.

## Familien-Altersfilter

Es gibt vier kombinierbare Altersgruppen:
- Baby: 0–2 Jahre
- Kleinkinder: 3–5 Jahre
- Kinder: 6–12 Jahre
- Jugendliche: 13–17 Jahre

Die Filter werten nur vorhandene bzw. eindeutig ableitbare Platzangaben aus. Fehlende Daten werden nicht als Eignung angenommen. Sind mehrere Altersgruppen gewählt, muss ein Platz für alle ausgewählten Gruppen entsprechende Hinweise im Quelldatensatz besitzen.


## Offline-Reisemappe

Die installierte PWA speichert die App-Oberfläche lokal. Favoriten, Familienprofil, Reiseetappen, private Notizen und eine begrenzte Kopie der letzten Platzsuche bleiben lokal verfügbar. Neue Campingplatzdaten, Kartenkacheln, Wetterdaten und Straßenrouten benötigen eine Internetverbindung. Ein JSON-Export sichert die Reise- und Profildaten; Tagebucheinträge werden dabei ohne Fotos exportiert, um die Sicherungsdatei klein zu halten.

## Reiseexport

Geplante Etappen können als GPX oder KML exportiert werden. Die Exportdateien enthalten die gespeicherten Campingplätze in ihrer aktuellen Reihenfolge. Die in GPX/KML enthaltene Verbindungslinie ist eine Etappenreihenfolge; eine live berechnete Straßenroute wird in der App separat über den freien OSRM-Dienst angezeigt.

### Neue Wellness-, Sanitär- und Mietfilter

Campingfinder kann – soweit die vorhandenen OpenStreetMap-Tags oder eindeutige Beschreibungen dies hergeben – zusätzlich nach folgenden Merkmalen filtern:

- Privatbad / Privatsanitär
- Sauna
- privater Whirlpool / Hot Tub
- privater Pool
- Kinderbad / Kindersanitär
- Babybad / Babyraum
- Mietwohnwagen / Standwohnwagen
- Mietzelte / Glampingzelte
- Bungalows / Hütten

Wichtig: Diese Merkmale sind in OpenStreetMap nicht überall standardisiert oder vollständig gepflegt. Campingfinder wertet deshalb nur eindeutige Tags bzw. ausdrückliche Beschreibungen als vorhanden. Fehlende Angaben werden nicht als positiv angenommen.

## Erweiterte Komfort-, Freizeit- und Lagefilter

Zusätzlich zu den bisherigen Filtern stehen jetzt – jeweils nur bei konkreten Quelldaten – folgende Filter bereit:

- Hallenbad / Indoor-Pool
- beheizter Pool
- Kinderpool / Planschbecken
- Wasserpark / Wasserrutschen
- Kinderclub und Jugendclub
- Animation / Unterhaltung
- Restaurant am Platz
- Brötchenservice
- Supermarkt / Campingshop
- direkter Strandzugang und Privatstrand
- direkter Seezugang
- Angeln
- Fahrradverleih
- E-Bike-Lademöglichkeit
- Gasflaschen / Tausch
- E-Auto-Lademöglichkeit
- ganzjährig geöffnet
- barrierefreies Sanitär
- Waschmaschine und Trockner getrennt
- Mindest-Stellplatzgröße (80 / 100 / 120 / 150 m²)
- sonnige oder schattige Stellplätze

Viele dieser Eigenschaften werden in offenen Campingdaten nicht europaweit einheitlich gepflegt. Campingfinder behandelt einen Filter deshalb nur dann als erfüllt, wenn ein passender strukturierter Tag oder eine eindeutige Freitextangabe vorhanden ist. Negative Angaben wie `sauna=no` werden nicht als positiver Treffer gewertet.

## Version 11 – Suche, Datenvertrauen, Budget und PC-Ansicht

- lokale intelligente Suchzeile ohne KI-API oder kostenpflichtigen Schlüssel, z. B. „Italien am Meer mit Hund, Privatbad und Kinderpool“
- aktive Filter werden gezählt und kompakt zusammengefasst
- Sprungmenü zu Filterkategorien für lange Filterlisten
- Datenumfang pro Platz als „Viele / Einige / Wenige Angaben“; dies ist ausdrücklich keine Platzbewertung
- Ergebnis-Karten zeigen bei aktiven Filtern transparent „Passt zu deiner Suche“
- Vergleichsansicht zeigt zusätzlich den Datenumfang je Platz
- neuer Reisebudget-Rechner für Kraftstoff, Camping, Maut/Fähre/Parken, Verpflegung und Extras
- Reisedistanz kann aus den gespeicherten Reiseetappen über OSRM übernommen werden; falls der öffentliche Routingdienst nicht erreichbar ist, wird dies offen gekennzeichnet
- Desktop/PC-Layout ab großen Bildschirmbreiten mit breiterem Arbeitsbereich, dichterem Filterraster, permanenter Karte/Listen-Splitansicht und mehrspaltigem Helferbereich
- `Strg+K` bzw. `Cmd+K` fokussiert auf Desktop direkt die intelligente Suche

Alle diese Funktionen laufen clientseitig in der Web-App. Es wurde kein kostenpflichtiger Dienst ergänzt.

## Version 12 – Teilen, Familien-Assistent, Kalender, Druck und lokale Statistik

- teilbare Suche: Land, Suchtext, Platzart, aktive Filter und Familienprofil werden direkt in einem URL-Link gespeichert
- lokaler QR-Code für teilbare Suchlinks; die QR-Erstellung sendet keine Daten an einen externen QR-Dienst
- Familien-Assistent in den Platzdetails mit drei Zuständen: bestätigt passend, nicht passend oder keine gesicherte Angabe
- Vergleich von bis zu vier Plätzen, auf großen PC-Bildschirmen nebeneinander nutzbar
- Reisebeginn und Nächte je Etappe
- Kalenderexport als `.ics` für Apple Kalender, Google Kalender, Outlook und andere kompatible Kalender
- druckbare Reiseübersicht / PDF-Ausgabe über die Druckfunktion des Browsers
- lokale Camping-Statistik aus Favoriten, besuchten Plätzen, Reiseetappen und Tagebuchdaten
- Routenplaner mit 2 / 5 / 10 / 25 km Korridor, Start/Ziel-Tausch und eigenem Standort als Start
- kurze In-Session-Zwischenspeicherung identischer Overpass-Abfragen, um unnötige Wiederholungsabfragen zu vermeiden
- PWA-Cache Version 12 enthält auch den lokalen QR-Code-Generator

Die neuen Funktionen bleiben vollständig clientseitig. Für Teilen, QR-Code, Kalenderexport, Druck/PDF und Statistik ist kein kostenpflichtiger API-Schlüssel erforderlich.

### Hinweis zu „lizenzfrei“

Campingfinder soll dauerhaft ohne Pflicht-Abo und ohne kostenpflichtige API-Schlüssel nutzbar bleiben. OpenStreetMap-Daten und die verwendeten Open-Source-Komponenten sind jedoch nicht rechtlich „lizenzfrei“: ihre offenen Lizenzen und Namensnennungspflichten müssen eingehalten werden. Campingfinder dokumentiert diese Bedingungen in `THIRD_PARTY_LICENSES.md` und vermeidet zusätzliche proprietäre Bezahldienste.


## Version 13 – Stabilität, Offline-Sicherheit und Desktop-Abschluss

- graceful Map-Fallback: Fällt die externe Leaflet-Datei beim ersten Laden aus, bleiben Suche, Ergebnislisten, Favoriten, Reiseplanung, Budget, Teilen und lokale Daten weiterhin bedienbar; nur die interaktive Karte wird als vorübergehend nicht verfügbar gekennzeichnet
- PWA-Cache auf Version 13 aktualisiert
- finale PC-/Tablet-/Smartphone-Struktur geprüft: breite Splitansicht auf Desktop, kompakte Touch-Navigation auf Mobilgeräten
- Kartenfehler können über einen direkten OpenStreetMap-Hinweis gemeldet werden
- keine neue kostenpflichtige API und kein verpflichtender Benutzeraccount ergänzt
- externe freie Dienste bleiben austauschbar und werden in `THIRD_PARTY_LICENSES.md` transparent dokumentiert

Hinweis: Die App kann ohne kostenpflichtigen API-Schlüssel betrieben werden. Öffentliche Gratisdienste haben jedoch Nutzungsbedingungen, Limits und keine dauerhafte Verfügbarkeitsgarantie. „Frei“ bedeutet daher nicht „ohne Lizenzbedingungen“.


## Version 14 – Mobile Fix
- Mobile Hochformat-Ansicht für iPhone/Android optimiert.
- Suchabfragen repariert (Overpass-Union-Syntax).
- Kinderalter werden über einzelne Felder hinzugefügt; kein Komma nötig.
- PC-/Tablet-Version bleibt responsiv erhalten.


## Sichere Routenziel-Auswahl (v16)
Der Routenplaner zeigt vor der Berechnung Ortsvorschläge für Start und Ziel. Mehrdeutige Eingaben müssen bestätigt werden. Häufige Tippfehler bei bekannten Reisezielen werden lokal korrigiert, ohne kostenpflichtige API. Die Route zeigt anschließend den tatsächlich aufgelösten Ortsnamen.


### Liste ↔ Karte (v17)
Ein Klick auf einen Treffer in der Ergebnisliste fokussiert den Platz direkt auf der Karte. Ohne ausgewählten Treffer zeigt die Karte automatisch alle aktuellen Ergebnisse. ‘Alle Treffer’ setzt die Auswahl zurück und passt den Kartenausschnitt erneut an.


## Mehrdeutige Ortsnamen
Wenn ein Ort oder eine Stadt mehrfach vorkommt, zeigt Campingfinder vor der Suche eine Auswahl mit Ort, Region/Bundesland und Land. Erst die ausgewählte Position wird für die Campingplatzsuche verwendet.
