/* Campingfinder v30 – client-side Europe camping search */

// Current public, free Overpass mirrors. Keep the retired kumi/lz4 hosts out:
// kumi.systems moved to private.coffee and the old lz4 host can hang before timing out.
const OVERPASS_ENDPOINTS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.osm.jp/api/interpreter'
];
const WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const OSRM_ENDPOINT = 'https://router.project-osrm.org/route/v1/driving';

const countries = [
  ['AL','Albanien'],['AD','Andorra'],['AM','Armenien'],['AT','Österreich'],['AZ','Aserbaidschan'],['AX','Åland'],['BY','Belarus'],['BE','Belgien'],
  ['BA','Bosnien und Herzegowina'],['BG','Bulgarien'],['HR','Kroatien'],['CY','Zypern'],['CZ','Tschechien'],
  ['DK','Dänemark'],['EE','Estland'],['FI','Finnland'],['FR','Frankreich'],['DE','Deutschland'],['GR','Griechenland'],
  ['FO','Färöer'],['GE','Georgien'],['GI','Gibraltar'],['GG','Guernsey'],['HU','Ungarn'],['IS','Island'],['IE','Irland'],['IM','Isle of Man'],['IT','Italien'],['JE','Jersey'],['XK','Kosovo'],['LV','Lettland'],
  ['LI','Liechtenstein'],['LT','Litauen'],['LU','Luxemburg'],['MT','Malta'],['MD','Moldau'],['MC','Monaco'],
  ['ME','Montenegro'],['NL','Niederlande'],['MK','Nordmazedonien'],['NO','Norwegen'],['PL','Polen'],['PT','Portugal'],['RU','Russland'],
  ['RO','Rumänien'],['SM','San Marino'],['RS','Serbien'],['SK','Slowakei'],['SI','Slowenien'],['ES','Spanien'],
  ['SE','Schweden'],['CH','Schweiz'],['TR','Türkei'],['UA','Ukraine'],['GB','Vereinigtes Königreich'],['VA','Vatikan']
];

// Mainland/European search envelopes for countries whose OSM/Nominatim country object can include remote territories.
const COUNTRY_SEARCH_BBOX = {
  NL:[50.70,3.20,53.70,7.30],
  FR:[41.20,-5.30,51.20,9.70],
  GB:[49.80,-8.80,60.90,1.90],
  DK:[54.45,7.80,57.85,15.35],
  ES:[35.70,-9.50,43.95,4.50],
  PT:[36.75,-9.60,42.25,-6.00],
  NO:[57.70,4.00,71.60,31.30]
};

function countryAreaDeclaration(countryCode) {
  const code=String(countryCode||'').toUpperCase();
  return `(
  area["ISO3166-1"="${code}"]["boundary"="administrative"]["admin_level"="2"];
  area["ISO3166-1:alpha2"="${code}"]["boundary"="administrative"]["admin_level"="2"];
)->.searchArea;`;
}

function readJson(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
const state = {
  allPlaces: [],
  filteredPlaces: [],
  favorites: new Set(readJson('campingfinder:favorites', [])),
  favoriteSnapshots: readJson('campingfinder:favoriteSnapshots', {}),
  favoriteLists: readJson('campingfinder:favoriteLists', { 'Merkliste': [] }),
  personal: readJson('campingfinder:personal', {}),
  weather: new Map(),
  markers: new Map(),
  favoritesOnly: false,
  deferredInstall: null,
  currentSearchLabel: '',
  userLocation: null,
  routeGeometry: [],
  routeLayer: null,
  language: localStorage.getItem('campingfinder:language') || 'de',
  compare: new Set(readJson('campingfinder:compare', [])),
  compareSnapshots: readJson('campingfinder:compareSnapshots', {}),
  familyProfile: readJson('campingfinder:familyProfile', { adults: 2, childAges: [], dog: 'no', vehicle: 'all' }),
  trip: readJson('campingfinder:trip', { name: 'Meine Reise', startDate: '', stages: [] }),
  tripLayer: null,
  lastSearch: readJson('campingfinder:lastSearch', null),
  overpassCache: new Map(),
  routeSelections: { start: null, end: null },
  selectedPlaceKey: null,
  countryBoundaries: new Map(),
  routeAutoStopKeys: new Set(),
  routeAutoStopPlaces: [],
  preferredOverpassEndpoint: '',
  overpassEndpointCooldown: new Map()
};
if (!state.trip || !Array.isArray(state.trip.stages)) state.trip = { name: 'Meine Reise', startDate: '', stages: [] };
if (state.trip.startDate == null) state.trip.startDate = '';
state.trip.stages = state.trip.stages.map(stage => ({ ...stage, nights: Math.max(1, Number(stage?.nights || 1)) }));
if (!state.familyProfile || !Array.isArray(state.familyProfile.childAges)) state.familyProfile = { adults: 2, childAges: [], dog: 'no', vehicle: 'all' };
if (!state.favoriteLists.Merkliste) state.favoriteLists.Merkliste = [];

const $ = id => document.getElementById(id);
const els = {
  country: $('countrySelect'), place: $('placeInput'), type: $('typeSelect'),
  countryBtn: $('countrySearchBtn'), mapBtn: $('mapSearchBtn'), fitBtn: $('fitResultsBtn'),
  adult: $('adultOnlyFilter'), fkk: $('fkkFilter'), family: $('familyFilter'), website: $('websiteFilter'),
  baby: $('babyFilter'), toddler: $('toddlerFilter'), children: $('childrenFilter'), teen: $('teenFilter'),
  dog: $('dogFilter'), fee: $('feeFilter'), stars: $('starsFilter'), location: $('locationFilter'), sort: $('sortSelect'),
  style: $('styleFilter'), price: $('priceFilter'), nearRadius: $('nearRadius'), nearMe: $('nearMeBtn'),
  electric: $('electricFilter'), water: $('waterFilter'), toilet: $('toiletFilter'), shower: $('showerFilter'),
  dump: $('dumpFilter'), wifi: $('wifiFilter'), wheelchair: $('wheelchairFilter'), motorhome: $('motorhomeFilter'),
  caravan: $('caravanFilter'), tents: $('tentsFilter'), cabins: $('cabinsFilter'), greyWater: $('greyWaterFilter'),
  chemicalToilet: $('chemicalToiletFilter'), playground: $('playgroundFilter'), pool: $('poolFilter'), laundry: $('laundryFilter'),
  privateBathroom: $('privateBathroomFilter'), sauna: $('saunaFilter'), privateHotTub: $('privateHotTubFilter'), privatePool: $('privatePoolFilter'),
  kidsBath: $('kidsBathFilter'), babyBath: $('babyBathFilter'), rentalCaravan: $('rentalCaravanFilter'), rentalTent: $('rentalTentFilter'), bungalow: $('bungalowFilter'),
  indoorPool: $('indoorPoolFilter'), heatedPool: $('heatedPoolFilter'), paddlingPool: $('paddlingPoolFilter'), waterPark: $('waterParkFilter'),
  kidsClub: $('kidsClubFilter'), teenClub: $('teenClubFilter'), animation: $('animationFilter'), restaurant: $('restaurantFilter'), breadService: $('breadServiceFilter'), supermarket: $('supermarketFilter'),
  directBeach: $('directBeachFilter'), privateBeach: $('privateBeachFilter'), lakeAccess: $('lakeAccessFilter'), fishing: $('fishingFilter'), bikeRental: $('bikeRentalFilter'), ebikeCharge: $('ebikeChargeFilter'),
  gasExchange: $('gasExchangeFilter'), evCharge: $('evChargeFilter'), yearRound: $('yearRoundFilter'), accessibleSanitary: $('accessibleSanitaryFilter'), washingMachine: $('washingMachineFilter'), dryer: $('dryerFilter'),
  pitchSize: $('pitchSizeFilter'), pitchExposure: $('pitchExposureFilter'),
  resetFilters: $('resetFiltersBtn'),
  count: $('resultCount'), websiteCount: $('websiteCount'), weatherCount: $('weatherCount'), favoriteCount: $('favoriteCount'),
  results: $('results'), status: $('statusText'), favoritesOnly: $('favoritesOnlyBtn'),
  routeStart: $('routeStart'), routeEnd: $('routeEnd'), routeStartSuggestions: $('routeStartSuggestions'), routeEndSuggestions: $('routeEndSuggestions'), routeStartResolved: $('routeStartResolved'), routeEndResolved: $('routeEndResolved'), routeOvernights: $('routeOvernights'), routeCorridor: $('routeCorridor'), routeVehicle: $('routeVehicle'), routeLegalNotice: $('routeLegalNotice'), routeBtn: $('routeSearchBtn'), routeSummary: $('routeSummary'),
  mapLayer: $('mapLayerSelect'), language: $('languageSelect'),
  favoriteLists: $('favoriteLists'), visitedPlaces: $('visitedPlaces'), newListName: $('newListName'), addList: $('addListBtn'), refreshMyPlaces: $('refreshMyPlacesBtn'),
  journalForm: $('journalForm'), journalEntries: $('journalEntries'),
  familyAdults: $('familyAdults'), familyChildAges: $('familyChildAges'), familyChildAgeList: $('familyChildAgeList'), addChildAgeBtn: $('addChildAgeBtn'), familyDog: $('familyDog'), familyVehicle: $('familyVehicle'),
  familySummary: $('familyProfileSummary'), saveFamilyProfile: $('saveFamilyProfileBtn'), applyFamilyProfile: $('applyFamilyProfileBtn'),
  tripName: $('tripName'), tripStartDate: $('tripStartDate'), tripStages: $('tripStages'), tripSummary: $('tripSummary'), tripRouteBtn: $('tripRouteBtn'), tripGpxBtn: $('tripGpxBtn'), tripKmlBtn: $('tripKmlBtn'), tripIcsBtn: $('tripIcsBtn'), tripPrintBtn: $('tripPrintBtn'), tripClearBtn: $('tripClearBtn'),
  networkStatus: $('networkStatus'), lastSearchInfo: $('lastSearchInfo'), loadLastSearchBtn: $('loadLastSearchBtn'), exportTravelFolderBtn: $('exportTravelFolderBtn'), importTravelFolderInput: $('importTravelFolderInput'),
  smartSearchInput: $('smartSearchInput'), smartSearchBtn: $('smartSearchBtn'), smartSearchFeedback: $('smartSearchFeedback'),
  activeFilterCount: $('activeFilterCount'), activeFilterText: $('activeFilterText'), filterCategoryJump: $('filterCategoryJump'),
  budgetDistance: $('budgetDistance'), budgetConsumption: $('budgetConsumption'), budgetFuelPrice: $('budgetFuelPrice'), budgetDays: $('budgetDays'), budgetCamping: $('budgetCamping'), budgetTolls: $('budgetTolls'), budgetFoodDay: $('budgetFoodDay'), budgetExtras: $('budgetExtras'), budgetResult: $('budgetResult'),
  shareSearchBtn: $('shareSearchBtn'), shareDialog: $('shareDialog'), shareUrlInput: $('shareUrlInput'), shareQr: $('shareQr'), shareQrNote: $('shareQrNote'),
  placeChoiceDialog: $('placeChoiceDialog'), placeChoiceTitle: $('placeChoiceTitle'), placeChoiceText: $('placeChoiceText'), placeChoiceOptions: $('placeChoiceOptions'), closePlaceChoiceBtn: $('closePlaceChoiceBtn'),
  travelStats: $('travelStats'),
  dialog: $('detailDialog'), detail: $('detailContent'), closeDialog: $('closeDialogBtn'), install: $('installBtn')
};

countries.forEach(([code, name]) => {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = name;
  if (code === 'DE') option.selected = true;
  els.country.appendChild(option);
});

const leafletAvailable = typeof window.L !== 'undefined';
if (!leafletAvailable) {
  const fallbackBounds = () => ({ getSouth:()=>47, getWest:()=>5, getNorth:()=>56, getEast:()=>16 });
  const fallbackLayer = () => ({
    addTo(){ return this; }, remove(){ return this; }, bindPopup(){ return this; }, openPopup(){ return this; },
    on(){ return this; }, clearLayers(){ return this; }, bringToFront(){ return this; }, getBounds(){ return fallbackBounds(); }
  });
  const fallbackMap = {
    setView(){ return this; }, fitBounds(){ return this; }, removeLayer(){ return this; }, on(){ return this; }, invalidateSize(){ return this; },
    getBounds(){ return fallbackBounds(); }, getZoom(){ return 6; }, project(latlng){ const a=Array.isArray(latlng)?latlng:[latlng?.lat||0,latlng?.lng||0]; return { x:(Number(a[1])+180)*10, y:(90-Number(a[0]))*10 }; }
  };
  window.L = {
    map(){ return fallbackMap; }, tileLayer(){ return fallbackLayer(); }, layerGroup(){ return fallbackLayer(); }, marker(){ return fallbackLayer(); },
    divIcon(options){ return options || {}; }, polyline(){ return fallbackLayer(); }, latLngBounds(){ return fallbackBounds(); }
  };
  const mapEl = $('map');
  if (mapEl) mapEl.innerHTML = '<div class="map-fallback"><strong>Karte aktuell nicht verfügbar.</strong><span>Suche, Listen, Favoriten und Reiseplanung funktionieren weiter. Für die Karte ist beim ersten Laden eine Verbindung zur freien Leaflet-Bibliothek erforderlich.</span></div>';
}

const map = L.map('map', { preferCanvas: true, zoomControl: true }).setView([50.6, 10.3], 6);
const mapLayers = {
  osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap-Mitwirkende</a>' }),
  topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: 'Kartendaten &copy; OpenStreetMap-Mitwirkende · Darstellung &copy; OpenTopoMap (CC-BY-SA)' })
};
let activeMapLayer = mapLayers.osm.addTo(map);
const markerLayer = L.layerGroup().addTo(map);
const routePlanLayer = L.layerGroup().addTo(map);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function siteIconSvg(type) {
  if (type === 'caravan_site') return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 31V18c0-4 3-7 7-7h17c4 0 7 3 7 7v13"/><path d="M38 22h4v9h-4M13 11v9h25M10 31h31"/><circle cx="15" cy="34" r="4"/><circle cx="34" cy="34" r="4"/><path d="M18 16h7v5h-7zM29 16h6v5h-6z"/></svg>';
  return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 38 24 10l18 28M13 38h22L24 21 13 38Z"/><path d="M24 10V5M24 5c7 0 11 3 15 7-6 1-11 1-15-2"/></svg>';
}

function yesish(value) {
  return ['yes','true','1','designated','permissive','customers','available','wlan','free'].includes(String(value || '').toLowerCase());
}
function noish(value) {
  return ['no','false','0','prohibited','private'].includes(String(value || '').toLowerCase());
}
function firstTag(tags, ...keys) {
  for (const key of keys) if (tags?.[key] != null && tags[key] !== '') return tags[key];
  return '';
}
function websiteOf(tags) {
  let value = firstTag(tags, 'website', 'contact:website', 'url');
  if (!value) return '';
  value = String(value).trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    return ['http:','https:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
}
function addressOf(tags) {
  const line1 = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const line2 = [tags['addr:postcode'], tags['addr:city'] || tags['addr:town'] || tags['addr:village']].filter(Boolean).join(' ');
  const line3 = tags['addr:country'] || '';
  return [line1, line2, line3].filter(Boolean).join(', ');
}
function displayName(tags, type) {
  return firstTag(tags, 'name', 'official_name', 'brand', 'operator') || (type === 'caravan_site' ? 'Wohnmobilstellplatz' : 'Campingplatz ohne Namen');
}
function typeLabel(type) {
  return type === 'caravan_site' ? 'Wohnmobilstellplatz' : 'Campingplatz';
}
function adultOnly(tags) {
  const minAge = parseInt(firstTag(tags, 'min_age', 'minimum_age'), 10);
  return (Number.isFinite(minAge) && minAge >= 18) || yesish(firstTag(tags, 'adult_only', 'adults_only', 'adults'));
}
function nudist(tags) {
  const n = String(firstTag(tags, 'nudism', 'naturism')).toLowerCase();
  return ['yes','obligatory','designated','customary','permissive'].includes(n) || /nudist|naturist|fkk/.test(String(tags.camp_site || '').toLowerCase());
}
function dogState(tags) {
  const v = firstTag(tags, 'dog', 'dogs', 'pets');
  if (!v) return 'unknown';
  return noish(v) ? 'no' : 'yes';
}
function feeState(tags) {
  const fee = firstTag(tags, 'fee');
  if (fee) {
    if (noish(fee)) return 'free';
    if (yesish(fee) || !['unknown','unspecified'].includes(String(fee).toLowerCase())) return 'paid';
  }
  if (firstTag(tags, 'charge', 'charge:caravans', 'charge:motorhome', 'charge:campers')) return 'paid';
  return 'unknown';
}
function familyFriendly(tags) {
  if (adultOnly(tags)) return false;
  return yesish(firstTag(tags, 'family', 'family_friendly', 'child_friendly', 'children', 'playground', 'kids_area', 'baby_changing_table'));
}

function childAgeGroups(tags) {
  if (adultOnly(tags)) return { baby:false, toddler:false, children:false, teen:false };
  const text = [
    tags.name, tags.description, tags.note, tags['description:de'], tags['description:en'],
    tags.family, tags.family_friendly, tags.child_friendly, tags.children,
    tags.kids_area, tags.kids_club, tags.youth, tags.teen, tags.teenagers
  ].filter(Boolean).join(' ').toLowerCase();

  const baby = yesish(firstTag(tags, 'baby', 'baby_facilities', 'baby_changing_table', 'changing_table', 'changing_table:location', 'baby_bath', 'baby_bathroom', 'baby_sanitary', 'baby_room'))
    || /\b(baby|babies|infant|wickel|wickelraum|bébé|neonato)\b/i.test(text);
  const toddler = yesish(firstTag(tags, 'toddler', 'toddlers', 'toddler_area', 'playground:toddler'))
    || /\b(toddler|toddlers|kleinkind|kleinkinder|peuter|peuters|tout[- ]petit|petits enfants)\b/i.test(text);
  const children = yesish(firstTag(tags, 'children', 'child_friendly', 'family_friendly', 'family', 'playground', 'kids_area', 'kids_club', 'children_bathroom', 'kids_bathroom', 'child_sanitary', 'children_sanitary', 'kids_sanitary'))
    || /\b(kinder|children|kids|child friendly|family friendly|familienfreundlich|enfants|bambini|niños|dzieci)\b/i.test(text);
  const teen = yesish(firstTag(tags, 'teen', 'teens', 'teenagers', 'teen_area', 'teen_club', 'youth', 'youth_club'))
    || /\b(jugend|jugendliche|teen|teens|teenager|teenagers|youth|adolescent|adolescents|jeunes)\b/i.test(text);

  return { baby, toddler, children, teen };
}
function ageGroupLabels(place) {
  const g = place?.ageGroups || {};
  return [g.baby ? 'Baby 0–2' : '', g.toddler ? 'Kleinkinder 3–5' : '', g.children ? 'Kinder 6–12' : '', g.teen ? 'Jugendliche 13–17' : ''].filter(Boolean);
}
function seaHeuristic(tags) {
  const explicit = [tags.location, tags.seaside, tags.coastal, tags.beach, tags.waterfront, tags['camp_site:location']].filter(Boolean).join(' ').toLowerCase();
  if (/coast|coastal|sea|seaside|beach|shore|ocean/.test(explicit)) return true;
  const text = [tags.name, tags.description, tags['addr:place']].filter(Boolean).join(' ').toLowerCase();
  return /(meer|seaside|sea view|beach|plage|costa|coast|ocean|atlantic|adriatic|mediterran|baltic|north sea|mare|marina)/.test(text);
}

function parseNightPrice(tags) {
  const raw = firstTag(tags, 'charge', 'charge:motorhome', 'charge:caravans', 'charge:campers', 'charge:tents');
  if (!raw) return null;
  const m = String(raw).replace(',', '.').match(/(?:EUR|€)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n < 1000 ? n : null;
}
function capacityNumber(tags) {
  const raw = firstTag(tags, 'capacity:pitches', 'capacity', 'capacity:caravans', 'capacity:motorhomes');
  const n = parseInt(String(raw || '').match(/\d+/)?.[0] || '', 10);
  return Number.isFinite(n) ? n : null;
}
function campingStyles(tags, amenities, stars) {
  const cap = capacityNumber(tags);
  const glamping = yesish(firstTag(tags, 'glamping','cabins','static_caravans','chalets','lodges')) || amenities.cabins === 'yes';
  const luxury = stars >= 4 || (amenities.pool === 'yes' && (yesish(tags.restaurant) || yesish(tags.wellness) || yesish(tags.spa)));
  const quiet = cap != null && cap <= 80 && amenities.pool !== 'yes' && !yesish(firstTag(tags, 'animation','entertainment'));
  return { glamping, luxury, quiet };
}
function haversineKm(aLat, aLon, bLat, bLon) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(bLat-aLat), dLon = toRad(bLon-aLon);
  const x = Math.sin(dLat/2)**2 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}
function distanceToRouteKm(place, coords) {
  if (!coords?.length) return null;
  let best = Infinity;
  for (const c of coords) {
    const d = haversineKm(place.lat, place.lon, c[1], c[0]);
    if (d < best) best = d;
  }
  return Number.isFinite(best) ? best : null;
}
function amenityState(tags, keys) {
  for (const key of keys) {
    if (tags[key] != null) return noish(tags[key]) ? 'no' : 'yes';
  }
  return 'unknown';
}
function positiveSpecialValue(value) {
  if (value == null || value === '') return false;
  const v = String(value).trim().toLowerCase();
  return !['no','false','0','none','unknown','unspecified'].includes(v);
}
function anyPositiveTag(tags, keys) {
  return keys.some(key => positiveSpecialValue(tags?.[key]));
}
function searchableTagText(tags) {
  // Free-text fallback only. Structured attributes are handled by explicit tag keys above.
  // Restricting this avoids treating a negative tag such as sauna=no as a positive keyword match.
  return Object.entries(tags || {})
    .filter(([key, value]) => value != null && /^(description|note|facilities|amenities|services?|camp_site)(:|$)/i.test(key))
    .map(([, value]) => String(value))
    .filter(value => !/^(no|false|0|none|unknown|unspecified)$/i.test(value.trim()))
    .join(' ')
    .toLowerCase();
}
function specialAmenityStates(tags) {
  const text = searchableTagText(tags);
  const privateBathroom = anyPositiveTag(tags, ['private_bathroom','private_sanitary','sanitary:private','bathroom:private','ensuite','ensuite_bathroom','private_shower','private_toilet'])
    || /\b(privatbad|privat(?:e[rsn]?)? sanit[aä]r|private bathroom|private sanitary|private washroom|ensuite bathroom|en-suite bathroom|sanitaire priv[eé]|bagno privato|ba[nñ]o privado)\b/i.test(text);
  const sauna = anyPositiveTag(tags, ['sauna','sauna:type','leisure:sauna']) || String(tags.leisure||'').toLowerCase()==='sauna' || /\bsauna\b/i.test(text);
  const privateHotTub = anyPositiveTag(tags, ['private_hot_tub','hot_tub:private','whirlpool:private','jacuzzi:private','private_whirlpool'])
    || /\b(private hot tub|private whirlpool|privat(?:er|e|es)? whirlpool|whirlpool privat|private jacuzzi|jacuzzi privat)\b/i.test(text);
  const privatePool = anyPositiveTag(tags, ['private_pool','swimming_pool:private','pool:private','private_swimming_pool'])
    || /\b(private (?:swimming )?pool|privatpool|privater pool|pool privat|piscine priv[eé]e|piscina privata|piscina privada)\b/i.test(text);
  const kidsBath = anyPositiveTag(tags, ['children_bathroom','kids_bathroom','child_sanitary','children_sanitary','kids_sanitary','family_bathroom'])
    || /\b(kinderbad|kindersanit[aä]r|kinder sanit[aä]r|children(?:'s)? bathroom|kids bathroom|child sanitary|children sanitary|family bathroom)\b/i.test(text);
  const babyBath = anyPositiveTag(tags, ['baby_bath','baby_bathroom','baby_sanitary','infant_bath','baby_room'])
    || /\b(babybad|baby bad|babysanit[aä]r|baby sanit[aä]r|baby bathroom|baby bath|infant bathroom|baby room)\b/i.test(text);
  const rentalCaravan = anyPositiveTag(tags, ['rental:caravans','caravan:rental','static_caravans','mobile_homes','rental:mobile_homes'])
    || /\b(mietwohnwagen|leihwohnwagen|rental caravan|caravan rental|static caravan|mobile home|mobilheim)\b/i.test(text);
  const rentalTent = anyPositiveTag(tags, ['rental:tents','tents:rental','static_tents','glamping:tents','safari_tents'])
    || /\b(mietzelt|mietzelte|leihzelt|rental tent|rental tents|static tent|safari tent|glamping tent)\b/i.test(text);
  const bungalow = anyPositiveTag(tags, ['bungalows','cabins','chalets','lodges','rental:bungalows'])
    || /\b(bungalow|bungalows|mietbungalow|cabin|cabins|chalet|chalets|lodge|lodges|h[uü]tte|h[uü]tten)\b/i.test(text);
  const indoorPool = anyPositiveTag(tags, ['swimming_pool:indoor','pool:indoor','indoor_pool'])
    || /\b(indoor pool|indoor swimming pool|hallenbad|piscine couverte|piscina coperta|piscina cubierta)\b/i.test(text);
  const heatedPool = anyPositiveTag(tags, ['swimming_pool:heated','pool:heated','heated_pool'])
    || /\b(heated pool|beheizt(?:er|es)? pool|beheiztes schwimmbad|piscine chauff[eé]e|piscina riscaldata|piscina climatizada)\b/i.test(text);
  const paddlingPool = anyPositiveTag(tags, ['paddling_pool','children_pool','kids_pool','swimming_pool:children'])
    || /\b(paddling pool|children(?:'s)? pool|kids pool|kinderpool|planschbecken|pataugeoire|piscina infantil)\b/i.test(text);
  const waterPark = anyPositiveTag(tags, ['water_park','water_slides','waterslide','swimming_pool:slides'])
    || /\b(water ?park|wasserpark|wasserrutsche|waterslide|water slide|aquapark|parc aquatique|toboggan aquatique)\b/i.test(text);
  const kidsClub = anyPositiveTag(tags, ['kids_club','children_club','childcare:club'])
    || /\b(kids club|children(?:'s)? club|kinderclub|miniclub|mini club|club enfants)\b/i.test(text);
  const teenClub = anyPositiveTag(tags, ['teen_club','youth_club','teenagers:club'])
    || /\b(teen club|teenager club|youth club|jugendclub|teenieclub|ados club|club ados)\b/i.test(text);
  const animation = anyPositiveTag(tags, ['animation','entertainment','entertainment:animation'])
    || /\b(animation|entertainment programme|unterhaltungsprogramm|animationsprogramm|animazione|animaci[oó]n)\b/i.test(text);
  const restaurant = anyPositiveTag(tags, ['restaurant','amenity:restaurant','food:restaurant']) || String(tags.amenity||'').toLowerCase()==='restaurant'
    || /\b(restaurant on site|on-site restaurant|restaurant am platz|ristorante interno|restaurante en el camping)\b/i.test(text);
  const breadService = anyPositiveTag(tags, ['bread_service','bread:service','bakery_service','bread_roll_service'])
    || /\b(br[oö]tchenservice|br[oö]tchen dienst|bread service|bread roll service|fresh bread|service de pain|pane fresco)\b/i.test(text);
  const supermarket = anyPositiveTag(tags, ['supermarket','shop:supermarket','camp_shop','shop_on_site']) || String(tags.shop||'').toLowerCase()==='supermarket'
    || /\b(supermarket on site|camp shop|shop on site|supermarkt am platz|camping shop|épicerie du camping|negozio campeggio)\b/i.test(text);
  const directBeach = anyPositiveTag(tags, ['beach_access','direct_beach_access','access:beach'])
    || /\b(direct beach access|direct access to (?:the )?beach|direkter strandzugang|direkt am strand|acc[eè]s direct (?:à|a) la plage|accesso diretto alla spiaggia)\b/i.test(text);
  const privateBeach = anyPositiveTag(tags, ['private_beach','beach:private'])
    || /\b(private beach|privatstrand|plage priv[eé]e|spiaggia privata|playa privada)\b/i.test(text);
  const lakeAccess = anyPositiveTag(tags, ['lake_access','direct_lake_access','access:lake'])
    || /\b(direct lake access|direkter seezugang|direkt am see|acc[eè]s direct au lac|accesso diretto al lago)\b/i.test(text);
  const fishing = anyPositiveTag(tags, ['fishing','angling','sport:fishing']) || String(tags.sport||'').toLowerCase()==='fishing'
    || /\b(fishing|angling|angeln|p[eê]che|pesca)\b/i.test(text);
  const bikeRental = anyPositiveTag(tags, ['bicycle_rental','rental:bicycle','service:bicycle:rental','bike_rental']) || String(tags.amenity||'').toLowerCase()==='bicycle_rental'
    || /\b(bicycle rental|bike rental|fahrradverleih|location de v[eé]los|noleggio biciclette|alquiler de bicicletas)\b/i.test(text);
  const ebikeCharge = anyPositiveTag(tags, ['bicycle:charging','charging:bicycle','ebike_charging','charging_station:bicycle'])
    || /\b(e-?bike charging|ebike charging|e-?bike laden|e-?bike ladestation|borne v[eé]lo [eé]lectrique)\b/i.test(text);
  const gasExchange = anyPositiveTag(tags, ['gas_exchange','gas_bottles','propane_bottles','lpg:bottles'])
    || /\b(gas bottle exchange|gas bottles|gasflaschen(?:tausch)?|propane bottles|bouteilles de gaz|bombole gas)\b/i.test(text);
  const evCharge = anyPositiveTag(tags, ['ev_charging','charging:vehicle','car_charging','charging_station']) || String(tags.amenity||'').toLowerCase()==='charging_station'
    || /\b(ev charging|electric car charging|e-auto lad|e-ladestation|borne de recharge|ricarica auto elettrica)\b/i.test(text);
  const yearRound = anyPositiveTag(tags, ['year_round','all_year','open_all_year']) || /^(24\/7)$/i.test(String(tags.opening_hours||''))
    || /\b(open all year|open year-round|year round|ganzj[aä]hrig|toute l['’]ann[eé]e|tutto l['’]anno|todo el a[nñ]o)\b/i.test(text);
  const accessibleSanitary = anyPositiveTag(tags, ['toilets:wheelchair','shower:wheelchair','sanitary:wheelchair','wheelchair:toilets','wheelchair:shower'])
    || /\b(accessible sanitary|accessible bathroom|barrierefreies sanit[aä]r|rollstuhlgerechtes bad|sanitaires accessibles|bagno accessibile)\b/i.test(text);
  const washingMachine = anyPositiveTag(tags, ['washing_machine','laundry:washing_machine']) || /\b(washing machine|waschmaschine|lave-linge|lavatrice|lavadora)\b/i.test(text);
  const dryer = anyPositiveTag(tags, ['tumble_dryer','dryer','laundry:dryer']) || /\b(tumble dryer|dryer|w[aä]schetrockner|trockner|s[eè]che-linge|asciugatrice|secadora)\b/i.test(text);
  const shadedPitches = anyPositiveTag(tags, ['pitches:shaded','pitch:shaded','shade:pitches']) || /\b(shaded pitches|schattige stellpl[aä]tze|emplacements ombrag[eé]s|piazzole ombreggiate)\b/i.test(text);
  const sunnyPitches = anyPositiveTag(tags, ['pitches:sunny','pitch:sunny','sunny_pitches']) || /\b(sunny pitches|sonnige stellpl[aä]tze|emplacements ensoleill[eé]s|piazzole soleggiate)\b/i.test(text);
  return {
    privateBathroom: privateBathroom ? 'yes' : 'unknown',
    sauna: sauna ? 'yes' : 'unknown',
    privateHotTub: privateHotTub ? 'yes' : 'unknown',
    privatePool: privatePool ? 'yes' : 'unknown',
    kidsBath: kidsBath ? 'yes' : 'unknown',
    babyBath: babyBath ? 'yes' : 'unknown',
    rentalCaravan: rentalCaravan ? 'yes' : 'unknown',
    rentalTent: rentalTent ? 'yes' : 'unknown',
    bungalow: bungalow ? 'yes' : 'unknown',
    indoorPool: indoorPool ? 'yes' : 'unknown',
    heatedPool: heatedPool ? 'yes' : 'unknown',
    paddlingPool: paddlingPool ? 'yes' : 'unknown',
    waterPark: waterPark ? 'yes' : 'unknown',
    kidsClub: kidsClub ? 'yes' : 'unknown',
    teenClub: teenClub ? 'yes' : 'unknown',
    animation: animation ? 'yes' : 'unknown',
    restaurant: restaurant ? 'yes' : 'unknown',
    breadService: breadService ? 'yes' : 'unknown',
    supermarket: supermarket ? 'yes' : 'unknown',
    directBeach: directBeach ? 'yes' : 'unknown',
    privateBeach: privateBeach ? 'yes' : 'unknown',
    lakeAccess: lakeAccess ? 'yes' : 'unknown',
    fishing: fishing ? 'yes' : 'unknown',
    bikeRental: bikeRental ? 'yes' : 'unknown',
    ebikeCharge: ebikeCharge ? 'yes' : 'unknown',
    gasExchange: gasExchange ? 'yes' : 'unknown',
    evCharge: evCharge ? 'yes' : 'unknown',
    yearRound: yearRound ? 'yes' : 'unknown',
    accessibleSanitary: accessibleSanitary ? 'yes' : 'unknown',
    washingMachine: washingMachine ? 'yes' : 'unknown',
    dryer: dryer ? 'yes' : 'unknown',
    shadedPitches: shadedPitches ? 'yes' : 'unknown',
    sunnyPitches: sunnyPitches ? 'yes' : 'unknown'
  };
}
function amenityStates(tags) {
  return {
    electricity: amenityState(tags, ['power_supply','electricity','electric_hookup','hookup']),
    drinkingWater: amenityState(tags, ['drinking_water','water_point']),
    toilets: amenityState(tags, ['toilets']),
    shower: amenityState(tags, ['shower','showers']),
    dump: amenityState(tags, ['sanitary_dump_station','waste_disposal']),
    greyWater: amenityState(tags, ['sanitary_dump_station:grey_water','grey_water']),
    chemicalToilet: amenityState(tags, ['sanitary_dump_station:chemical_toilet','chemical_toilet']),
    wifi: amenityState(tags, ['internet_access','wifi']),
    wheelchair: amenityState(tags, ['wheelchair']),
    tents: amenityState(tags, ['tents']),
    caravans: amenityState(tags, ['caravans']),
    motorhome: amenityState(tags, ['motorhome']),
    cabins: amenityState(tags, ['cabins','static_caravans','chalets','lodges']),
    bbq: amenityState(tags, ['bbq']),
    hotWater: amenityState(tags, ['hot_water']),
    laundry: amenityState(tags, ['laundry','washing_machine']),
    pool: amenityState(tags, ['swimming_pool']),
    playground: amenityState(tags, ['playground']),
    recycling: amenityState(tags, ['recycling']),
    kitchen: amenityState(tags, ['kitchen','cooking_facilities']),
    ...specialAmenityStates(tags)
  };
}
function pitchSizeM2(tags) {
  const width = Number.parseFloat(String(firstTag(tags, 'pitch:width', 'pitches:width') || '').replace(',', '.'));
  const length = Number.parseFloat(String(firstTag(tags, 'pitch:length', 'pitches:length') || '').replace(',', '.'));
  if (Number.isFinite(width) && Number.isFinite(length) && width > 0 && length > 0) {
    const area = width * length;
    if (area >= 20 && area <= 1000) return Math.round(area);
  }
  const raw = firstTag(tags, 'pitch:size', 'pitches:size', 'pitch_size', 'camp_site:pitch_size', 'parcel:size', 'pitch:area');
  if (!raw) return null;
  const nums = String(raw).replace(',', '.').match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  if (!nums.length) return null;
  // A value already expressed as area, e.g. 100 m². For dimensions such as 10x12, multiply.
  if (/\d\s*[x×]\s*\d/i.test(String(raw)) && nums.length >= 2) return Math.round(nums[0] * nums[1]);
  const n = nums[0];
  return n >= 20 && n <= 1000 ? n : null;
}

function normalizePlace(el) {
  const tags = el.tags || {};
  const lat = Number(el.lat ?? el.center?.lat);
  const lon = Number(el.lon ?? el.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const tourism = tags.tourism;
  const amenities = amenityStates(tags);
  // tourism=caravan_site itself denotes a site intended for motorhomes/campervans.
  if (tourism === 'caravan_site' && amenities.motorhome === 'unknown') amenities.motorhome = 'yes';
  const stars = parseFloat(tags.stars) || 0;
  const styles = campingStyles(tags, amenities, stars);
  return {
    key: `${el.type}/${el.id}`,
    osmType: el.type,
    osmId: el.id,
    lat, lon, tags,
    name: displayName(tags, tourism),
    tourism,
    typeLabel: typeLabel(tourism),
    website: websiteOf(tags),
    address: addressOf(tags),
    stars,
    priceNight: parseNightPrice(tags),
    styles,
    distanceKm: null,
    routeDistanceKm: null,
    adultOnly: adultOnly(tags),
    nudist: nudist(tags),
    dog: dogState(tags),
    fee: feeState(tags),
    family: familyFriendly(tags),
    ageGroups: childAgeGroups(tags),
    sea: seaHeuristic(tags),
    pitchSizeM2: pitchSizeM2(tags),
    osmUpdated: el.timestamp || '',
    amenities
  };
}

function overpassTypeFragments(areaExpr) {
  const selected = els.type.value;
  if (selected === 'camp_site') return `nwr["tourism"="camp_site"]${areaExpr};`;
  if (selected === 'caravan_site') return `nwr["tourism"="caravan_site"]${areaExpr};`;
  return `nwr["tourism"="camp_site"]${areaExpr};\nnwr["tourism"="caravan_site"]${areaExpr};`;
}

async function overpass(query, options = {}) {
  const now=Date.now(), cached=state.overpassCache.get(query);
  if(cached && now-cached.savedAt < 10*60*1000) return cached.data;

  const timeoutMs = Math.max(6000, Number(options.timeoutMs || 32000));
  const maxEndpoints = Math.max(1, Math.min(OVERPASS_ENDPOINTS.length, Number(options.maxEndpoints || OVERPASS_ENDPOINTS.length)));
  const available = OVERPASS_ENDPOINTS.filter(ep => (state.overpassEndpointCooldown.get(ep) || 0) <= now);
  const cooling = OVERPASS_ENDPOINTS.filter(ep => (state.overpassEndpointCooldown.get(ep) || 0) > now);
  let endpoints = [...available, ...cooling];
  if (state.preferredOverpassEndpoint && endpoints.includes(state.preferredOverpassEndpoint)) {
    endpoints = [state.preferredOverpassEndpoint, ...endpoints.filter(ep => ep !== state.preferredOverpassEndpoint)];
  }
  endpoints = endpoints.slice(0, maxEndpoints);

  let lastError;
  for (const endpoint of endpoints) {
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
          body: new URLSearchParams({ data: query }),
          signal: controller.signal
        });
      } catch (postError) {
        // Some mirrors/proxies behave better with GET in Safari. Only use GET for short queries.
        if (postError?.name !== 'AbortError' && query.length < 6000) {
          const url = `${endpoint}?data=${encodeURIComponent(query)}`;
          response = await fetch(url, { method:'GET', signal:controller.signal });
        } else throw postError;
      }
      if (!response.ok) {
        const err = new Error(`Server ${response.status}`);
        err.status = response.status;
        if (response.status === 400) throw err;
        lastError = err;
        const cooldown = response.status === 429 ? 120000 : 45000;
        state.overpassEndpointCooldown.set(endpoint, Date.now()+cooldown);
        continue;
      }
      const json = await response.json();
      state.preferredOverpassEndpoint = endpoint;
      state.overpassEndpointCooldown.delete(endpoint);
      state.overpassCache.set(query,{savedAt:Date.now(),data:json});
      if(state.overpassCache.size>24){const first=state.overpassCache.keys().next().value;state.overpassCache.delete(first);}
      return json;
    } catch (err) {
      lastError = err;
      if (err?.status === 400 || /Server 400/.test(String(err?.message || ''))) break;
      state.overpassEndpointCooldown.set(endpoint, Date.now()+45000);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  throw lastError || new Error('Alle freien Overpass-Datenserver sind derzeit nicht erreichbar.');
}

function clampEuropeBbox(bbox) {
  const [south, west, north, east] = bbox.map(Number);
  const s = Math.max(27, south), w = Math.max(-35, west), n = Math.min(72.5, north), e = Math.min(60, east);
  if (![s,w,n,e].every(Number.isFinite) || s >= n || w >= e) return [south, west, north, east];
  return [s,w,n,e];
}

function bboxFilter(bbox) {
  return `(${bbox.map(v => Number(v).toFixed(5)).join(',')})`;
}

function makeBboxGrid(bbox) {
  const [s,w,n,e] = bbox;
  const midLat = (s+n)/2;
  const latKm = Math.max(1, (n-s) * 111);
  const lonKm = Math.max(1, (e-w) * 111 * Math.max(.25, Math.cos(midLat*Math.PI/180)));
  const approxAreaKm2 = latKm * lonKm;
  const targetCells = Math.max(1, Math.min(12, Math.ceil(approxAreaKm2 / 45000)));
  const aspect = Math.max(.25, Math.min(4, lonKm/latKm));
  let cols = Math.max(1, Math.round(Math.sqrt(targetCells * aspect)));
  let rows = Math.max(1, Math.ceil(targetCells / cols));
  while (rows * cols > 12) {
    if (cols >= rows && cols > 1) cols--; else if (rows > 1) rows--; else break;
  }
  const cells=[];
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    const cs=s+(n-s)*r/rows, cn=s+(n-s)*(r+1)/rows;
    const cw=w+(e-w)*c/cols, ce=w+(e-w)*(c+1)/cols;
    cells.push([cs,cw,cn,ce]);
  }
  return cells;
}

function splitBbox(bbox) {
  const [s,w,n,e]=bbox, midLat=(s+n)/2, midLon=(w+e)/2;
  const latKm=(n-s)*111;
  const lonKm=(e-w)*111*Math.max(.25,Math.cos(((s+n)/2)*Math.PI/180));
  return lonKm >= latKm
    ? [[s,w,n,midLon],[s,midLon,n,e]]
    : [[s,w,midLat,e],[midLat,w,n,e]];
}

function retriableOverpassError(err) {
  return err?.name === 'AbortError' || /Server (429|500|502|503|504)|Failed to fetch|NetworkError|Load failed/i.test(String(err?.message || err || ''));
}

function rawElementLatLon(el) {
  const lat = Number(el?.lat ?? el?.center?.lat);
  const lon = Number(el?.lon ?? el?.center?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  if (!Array.isArray(ring) || ring.length < 3) return false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i]?.[0]), yi = Number(ring[i]?.[1]);
    const xj = Number(ring[j]?.[0]), yj = Number(ring[j]?.[1]);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;
    const crosses = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoordinates(lon, lat, polygon) {
  if (!Array.isArray(polygon) || !polygon.length || !pointInRing(lon, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) if (pointInRing(lon, lat, polygon[i])) return false;
  return true;
}

function pointInGeoJsonGeometry(lon, lat, geometry) {
  if (!geometry) return true;
  if (geometry.type === 'Polygon') return pointInPolygonCoordinates(lon, lat, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates?.some(poly => pointInPolygonCoordinates(lon, lat, poly)) || false;
  return true;
}

function filterRawElementsByGeometry(elements, geometry) {
  if (!geometry) return elements || [];
  return (elements || []).filter(el => {
    const p = rawElementLatLon(el);
    return p ? pointInGeoJsonGeometry(p.lon, p.lat, geometry) : false;
  });
}

function expandBboxKm(bbox, km = 35) {
  const [s,w,n,e] = bbox.map(Number);
  const midLat = (s+n)/2;
  const latPad = km / 111;
  const lonPad = km / (111 * Math.max(.22, Math.cos(midLat*Math.PI/180)));
  return [Math.max(-90,s-latPad), Math.max(-180,w-lonPad), Math.min(90,n+latPad), Math.min(180,e+lonPad)];
}

function pointToSegmentKm(lat, lon, aLat, aLon, bLat, bLon) {
  const scale = Math.cos(lat * Math.PI / 180);
  const px = lon * 111 * scale, py = lat * 111;
  const ax = aLon * 111 * scale, ay = aLat * 111;
  const bx = bLon * 111 * scale, by = bLat * 111;
  const vx = bx-ax, vy = by-ay, wx = px-ax, wy = py-ay;
  const vv = vx*vx + vy*vy;
  const t = vv > 0 ? Math.max(0, Math.min(1, (wx*vx + wy*vy)/vv)) : 0;
  return Math.hypot(px-(ax+t*vx), py-(ay+t*vy));
}

function distanceToCoastKm(lat, lon, coastWays, stopAtKm = 30) {
  let best = Infinity;
  for (const way of coastWays || []) {
    const g = way?.geometry;
    if (!Array.isArray(g) || g.length < 2) continue;
    for (let i=1;i<g.length;i++) {
      const a=g[i-1], b=g[i];
      const d=pointToSegmentKm(lat,lon,Number(a.lat),Number(a.lon),Number(b.lat),Number(b.lon));
      if (d < best) best=d;
      if (best <= stopAtKm) return best;
    }
  }
  return best;
}

async function queryCountryTile(countryCode, bbox, depth = 0, progress = null) {
  progress?.('attempt');
  const bboxExpr = bboxFilter(bbox);
  const query = `[out:json][timeout:9];\n(${overpassTypeFragments(bboxExpr)});\nout body center qt;`;
  try {
    // Small tiles should answer quickly. Two mirrors are enough before the tile is subdivided.
    const data = await overpass(query, { timeoutMs: 8000, maxEndpoints: 2 });
    progress?.('success', data.elements?.length || 0);
    return { elements: data.elements || [], failed: 0 };
  } catch (err) {
    if (depth < 1 && retriableOverpassError(err)) {
      const halves = splitBbox(bbox);
      const parts = await Promise.all(halves.map(half => queryCountryTile(countryCode, half, depth+1, progress)));
      return {
        elements: parts.flatMap(part => part.elements || []),
        failed: parts.reduce((sum, part) => sum + Number(part.failed || 0), 0)
      };
    }
    progress?.('failed');
    return { elements: [], failed: 1, error: err };
  }
}
async function queryCoastTile(bbox, depth = 0) {
  const expanded = expandBboxKm(bbox, 38);
  const query = `[out:json][timeout:8];\nway["natural"="coastline"]${bboxFilter(expanded)};\nout geom qt;`;
  try {
    const data = await overpass(query, { timeoutMs: 7000, maxEndpoints: 2 });
    return data.elements || [];
  } catch (err) {
    if (depth < 1 && retriableOverpassError(err)) {
      const halves=splitBbox(expanded);
      const parts=await Promise.all(halves.map(async half=>{
        try {
          const q=`[out:json][timeout:7];\nway["natural"="coastline"]${bboxFilter(half)};\nout geom qt;`;
          const d=await overpass(q,{timeoutMs:6500,maxEndpoints:2});
          return d.elements||[];
        } catch { return []; }
      }));
      return parts.flat();
    }
    return [];
  }
}
async function filterRawByLocationMode(elements, bbox, mode = '', coastRadiusKm = 30) {
  if (!['sea','inland'].includes(mode)) return elements || [];
  const coastWays = await queryCoastTile(bbox);
  if (coastWays.length) {
    return (elements || []).filter(el => {
      const p = rawElementLatLon(el);
      if (!p) return false;
      const coastal = distanceToCoastKm(p.lat, p.lon, coastWays, coastRadiusKm) <= coastRadiusKm;
      if (coastal) el.__campingfinderCoastal = true;
      return mode === 'sea' ? coastal : !coastal;
    });
  }
  // Fallback when a public coastline query is temporarily unavailable.
  return (elements || []).filter(el => {
    const coastal = seaHeuristic(el.tags || {});
    return mode === 'sea' ? coastal : !coastal;
  });
}

async function mapWithConcurrency(items, limit, worker) {
  const input = Array.from(items || []);
  const results = new Array(input.length);
  let next = 0;
  const runners = Array.from({length: Math.max(1, Math.min(Number(limit)||1, input.length || 1))}, async () => {
    while (true) {
      const i = next++;
      if (i >= input.length) return;
      results[i] = await worker(input[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function searchCountryChunked(countryCode, countryName, rawBbox, geometry = null, options = {}) {
  const bbox = clampEuropeBbox(rawBbox);
  const tiles = makeBboxGrid(bbox);
  const rawById = new Map();
  const locationMode = ['sea','inland'].includes(options.locationMode) ? options.locationMode : (options.coastMode ? 'sea' : '');
  const coastMode = locationMode === 'sea';
  const coastRadiusKm = Number(options.coastRadiusKm || 30);
  let attempted=0, successful=0, failed=0, completed=0;
  const progress = (kind) => {
    if (kind === 'attempt') attempted++;
    if (kind === 'success') successful++;
  };

  // Two simultaneous small requests are much faster than waiting for every tile serially,
  // while staying deliberately conservative with public Overpass infrastructure.
  const parts = await mapWithConcurrency(tiles, 2, async (tile, index) => {
    const part = await queryCountryTile(countryCode, tile, 0, progress);
    let candidates = filterRawElementsByGeometry(part.elements, geometry);
    if (locationMode && candidates.length) {
      candidates = await filterRawByLocationMode(candidates, tile, locationMode, coastRadiusKm);
    }
    for (const el of candidates) rawById.set(`${el.type}/${el.id}`, el);
    completed++;
    els.status.textContent = `${countryName}${coastMode?' · Küste':''}: ${completed}/${tiles.length} Teilbereiche · ${rawById.size} Plätze gefunden`;
    return part;
  });
  failed = parts.reduce((sum, part) => sum + Number(part?.failed || 0), 0);
  return { elements:[...rawById.values()], failed, attempted, successful, bbox, coastMode, locationMode, coastRadiusKm };
}
async function geocodeCountryBoundary(countryName, countryCode) {
  const code=String(countryCode||'').toUpperCase();
  if (state.countryBoundaries?.has(code)) return state.countryBoundaries.get(code);
  const url=new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format','jsonv2');
  url.searchParams.set('limit','1');
  url.searchParams.set('addressdetails','1');
  url.searchParams.set('featuretype','country');
  url.searchParams.set('countrycodes',code.toLowerCase());
  url.searchParams.set('polygon_geojson','1');
  url.searchParams.set('polygon_threshold','0.02');
  url.searchParams.set('q',countryName);
  const response=await fetch(url,{headers:{'Accept-Language':`${state.language},de,en;q=0.7`}});
  if(!response.ok) throw new Error('Landesgrenze konnte nicht geladen werden.');
  const results=await response.json();
  if(!results.length) throw new Error(`Land nicht gefunden: ${countryName}`);
  const item=results[0], bb=(item.boundingbox||[]).map(Number);
  if(bb.length!==4) throw new Error('Landesgrenze ist unvollständig.');
  const result={bbox:clampEuropeBbox([bb[0],bb[2],bb[1],bb[3]]),name:item.display_name,geometry:item.geojson||null};
  state.countryBoundaries?.set(code,result);
  return result;
}


let placeChoicePending = null;

function placeCandidatePrimary(candidate) {
  const a = candidate?.address || {};
  return a.city || a.town || a.village || a.municipality || a.hamlet || a.locality || a.suburb || String(candidate?.name || '').split(',')[0].trim() || 'Unbekannter Ort';
}
function placeCandidateSecondary(candidate) {
  const a = candidate?.address || {};
  const parts = [a.city_district || a.county, a.state || a.region, a.country].filter(Boolean);
  return [...new Set(parts)].join(' · ') || candidate?.name || '';
}
function cancelPlaceChoice() {
  if (!placeChoicePending) return;
  const { reject } = placeChoicePending;
  placeChoicePending = null;
  if (els.placeChoiceDialog?.open) els.placeChoiceDialog.close();
  const err = new Error('Ortsauswahl abgebrochen.');
  err.code = 'USER_CANCEL';
  reject(err);
}
function choosePlaceCandidate(query, candidates, countryName='') {
  if (!Array.isArray(candidates) || !candidates.length) return Promise.reject(new Error('Ort oder Region wurde nicht gefunden.'));
  if (candidates.length === 1) return Promise.resolve(candidates[0]);
  if (!els.placeChoiceDialog || !els.placeChoiceOptions) return Promise.resolve(candidates[0]);
  if (placeChoicePending) cancelPlaceChoice();
  els.placeChoiceTitle.textContent = `Welchen Ort meinst du mit „${query}“?`;
  els.placeChoiceText.textContent = countryName
    ? `Es gibt mehrere passende Treffer in ${countryName}. Bitte wähle den richtigen Ort.`
    : 'Es gibt mehrere passende Treffer. Bitte wähle den richtigen Ort.';
  els.placeChoiceOptions.innerHTML = candidates.map((c,i)=>`<button type="button" class="place-choice-option" data-place-choice="${i}" role="option"><span class="place-choice-pin" aria-hidden="true">⌖</span><span><strong>${escapeHtml(placeCandidatePrimary(c))}</strong><small>${escapeHtml(placeCandidateSecondary(c))}</small><em>${escapeHtml(c.name || '')}</em></span></button>`).join('');
  els.placeChoiceDialog.showModal();
  return new Promise((resolve,reject)=>{ placeChoicePending={resolve,reject,candidates}; });
}

async function geocodeCountryBounds(countryName, countryCode) {
  const code=String(countryCode||'').toUpperCase();
  const override=COUNTRY_SEARCH_BBOX[code];
  if (override) return { bbox:[...override], name:countryName };
  const cacheKey=`campingfinder:geo:country:v22:${code}`;
  const cached=localStorage.getItem(cacheKey);
  if(cached){try{return JSON.parse(cached);}catch{}}
  const url=new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format','jsonv2');
  url.searchParams.set('limit','1');
  url.searchParams.set('addressdetails','1');
  url.searchParams.set('featuretype','country');
  url.searchParams.set('countrycodes',String(countryCode||'').toLowerCase());
  url.searchParams.set('q',countryName);
  const response=await fetch(url,{headers:{'Accept-Language':`${state.language},de,en;q=0.7`}});
  if(!response.ok)throw new Error('Landesgrenze konnte nicht geladen werden.');
  const results=await response.json();
  if(!results.length)throw new Error(`Land nicht gefunden: ${countryName}`);
  const item=results[0], bb=(item.boundingbox||[]).map(Number);
  if(bb.length!==4)throw new Error('Landesgrenze ist unvollständig.');
  const result={bbox:[bb[0],bb[2],bb[1],bb[3]],name:item.display_name};
  localStorage.setItem(cacheKey,JSON.stringify(result));
  return result;
}

async function geocodePlace(query, countryCode, countryName='') {
  // Candidate lists may be cached, but an ambiguous user's choice is intentionally not cached:
  // searching the same name again should allow choosing a different place.
  const candidates = await geocodeCandidates(query, 8, countryCode);
  if (!candidates.length) throw new Error('Ort oder Region wurde nicht gefunden.');
  const item = await choosePlaceCandidate(query, candidates, countryName);
  let bbox = item.bbox;
  if (!Array.isArray(bbox) || bbox.length !== 4) {
    const latPad=.12, lonPad=.16;
    bbox=[item.lat-latPad,item.lon-lonPad,item.lat+latPad,item.lon+lonPad];
  }
  const result = { bbox, name: item.name, lat:item.lat, lon:item.lon, address:item.address || {} };
  return result;
}

function normalizeRouteQuery(query='') {
  const raw = String(query || '').trim();
  const key = normalizeSearchText(raw).replace(/[^a-z0-9]+/g,'');
  const aliases = {
    garderssee: 'Gardasee', gardase: 'Gardasee', gardasee: 'Gardasee', gardaseee: 'Gardasee',
    lagoidgarda: 'Lago di Garda', lagodigarda: 'Lago di Garda',
    bodensee: 'Bodensee', nordsee: 'Nordsee', ostsee: 'Ostsee'
  };
  return aliases[key] || raw;
}
async function geocodeCandidates(query, limit=6, countryCode='') {
  const raw = String(query || '').trim();
  const coordMatch=raw.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if(coordMatch){const lat=Number(coordMatch[1]),lon=Number(coordMatch[2]);if(lat>=-90&&lat<=90&&lon>=-180&&lon<=180)return[{lat,lon,name:`${lat.toFixed(5)}, ${lon.toFixed(5)}`,type:'Koordinaten',address:{},bbox:[lat-.01,lon-.01,lat+.01,lon+.01]}];}
  const normalized = normalizeRouteQuery(raw);
  const cc = String(countryCode || '').toLowerCase();
  const cacheKey = `campingfinder:geo:candidates:v18:${state.language}:${cc}:${normalized.toLowerCase().trim()}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) { try { return JSON.parse(cached).slice(0,limit); } catch {} }
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails','1');
  url.searchParams.set('dedupe','1');
  if (cc) url.searchParams.set('countrycodes', cc);
  url.searchParams.set('q', normalized);
  const response = await fetch(url, { headers: { 'Accept-Language': `${state.language},de,en;q=0.7` } });
  if (!response.ok) throw new Error('Ortssuche nicht erreichbar');
  const results = await response.json();
  const seen = new Set();
  const mapped = results.map(item => {
    const bb=(item.boundingbox||[]).map(Number);
    return {
      lat:Number(item.lat), lon:Number(item.lon), name:item.display_name,
      type:item.type || item.addresstype || '', importance:Number(item.importance || 0),
      address:item.address || {},
      bbox:bb.length===4 ? [bb[0],bb[2],bb[1],bb[3]] : null,
      osmType:item.osm_type || '', osmId:item.osm_id || null
    };
  }).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)).filter(x=>{
    const key=`${x.osmType}/${x.osmId || ''}/${x.name}`;
    if(seen.has(key))return false;seen.add(key);return true;
  });
  localStorage.setItem(cacheKey, JSON.stringify(mapped.slice(0,10)));
  return mapped.slice(0,limit);
}
async function geocodeAny(query) {
  const results = await geocodeCandidates(query, 6);
  if (!results.length) throw new Error(`Ort nicht gefunden: ${query}`);
  return results[0];
}
function routeShortName(candidate) {
  if (!candidate?.name) return '';
  return candidate.name.split(',').slice(0,3).join(',').trim();
}
function clearRouteSelection(which) {
  state.routeSelections[which] = null;
  const resolved = which === 'start' ? els.routeStartResolved : els.routeEndResolved;
  if (resolved) { resolved.textContent=''; resolved.classList.remove('ok','warn'); }
}
function selectRouteCandidate(which, candidate) {
  state.routeSelections[which] = candidate;
  const input = which === 'start' ? els.routeStart : els.routeEnd;
  const list = which === 'start' ? els.routeStartSuggestions : els.routeEndSuggestions;
  const resolved = which === 'start' ? els.routeStartResolved : els.routeEndResolved;
  if (input) input.value = routeShortName(candidate);
  if (list) { list.hidden=true; list.innerHTML=''; }
  if (resolved) { resolved.textContent = `✓ Gefunden: ${candidate.name}`; resolved.classList.add('ok'); resolved.classList.remove('warn'); }
}
function renderRouteSuggestions(which, candidates, originalQuery='') {
  const list = which === 'start' ? els.routeStartSuggestions : els.routeEndSuggestions;
  const resolved = which === 'start' ? els.routeStartResolved : els.routeEndResolved;
  if (!list) return;
  if (!candidates.length) { list.hidden=true; list.innerHTML=''; if(resolved){resolved.textContent='Kein eindeutiger Ort gefunden.';resolved.classList.add('warn');resolved.classList.remove('ok');} return; }
  const normalized = normalizeRouteQuery(originalQuery);
  const corrected = normalizeSearchText(normalized) !== normalizeSearchText(originalQuery);
  list.innerHTML = `${corrected ? `<div class="route-suggestion-hint">Meintest du „${escapeHtml(normalized)}“?</div>` : ''}` + candidates.map((c,i)=>`<button type="button" class="route-suggestion" role="option" data-route-choice="${which}" data-index="${i}"><strong>${escapeHtml(routeShortName(c))}</strong><small>${escapeHtml(c.name)}</small></button>`).join('');
  list.hidden=false;
  list._candidates=candidates;
  if (resolved) { resolved.textContent='Bitte passenden Ort auswählen.'; resolved.classList.add('warn'); resolved.classList.remove('ok'); }
}
let routeSuggestTimer = null;
function scheduleRouteSuggestions(which) {
  clearTimeout(routeSuggestTimer);
  routeSuggestTimer = setTimeout(async()=>{
    const input = which === 'start' ? els.routeStart : els.routeEnd;
    const q=input?.value?.trim()||'';
    clearRouteSelection(which);
    const list = which === 'start' ? els.routeStartSuggestions : els.routeEndSuggestions;
    if(q.length<2){if(list)list.hidden=true;return;}
    try { renderRouteSuggestions(which, await geocodeCandidates(q,6), q); } catch { if(list)list.hidden=true; }
  }, 380);
}
async function ensureRouteSelection(which, text) {
  const current = state.routeSelections[which];
  if (current) return current;
  const candidates = await geocodeCandidates(text,6);
  if (!candidates.length) throw new Error(`Ort nicht gefunden: ${text}`);
  const normalized = normalizeRouteQuery(text);
  const corrected = normalizeSearchText(normalized) !== normalizeSearchText(text);
  if (corrected || candidates.length > 1) {
    renderRouteSuggestions(which,candidates,text);
    const label = which === 'start' ? 'Start' : 'Ziel';
    throw new Error(`${label} ist nicht eindeutig. Bitte zuerst den richtigen Ortsvorschlag auswählen.`);
  }
  selectRouteCandidate(which,candidates[0]);
  return candidates[0];
}
function simplifyRouteCoordinates(coords, maxPoints=70) {
  if (!Array.isArray(coords) || coords.length <= maxPoints) return coords || [];
  const out = [];
  for (let i=0; i<maxPoints; i++) out.push(coords[Math.round(i*(coords.length-1)/(maxPoints-1))]);
  return out;
}
function nearSearchBbox(lat, lon, radiusKm) {
  const latDelta = radiusKm / 111;
  const cosLat = Math.max(0.2, Math.cos(Number(lat) * Math.PI / 180));
  const lonDelta = radiusKm / (111 * cosLat);
  return [
    Math.max(-89.9, Number(lat) - latDelta),
    Math.max(-179.9, Number(lon) - lonDelta),
    Math.min(89.9, Number(lat) + latDelta),
    Math.min(179.9, Number(lon) + lonDelta)
  ];
}

function makeNearSearchGrid(bbox, radiusKm) {
  const [s,w,n,e] = bbox;
  const midLat = (s+n)/2;
  const latKm = Math.max(1, (n-s) * 111);
  const lonKm = Math.max(1, (e-w) * 111 * Math.max(.2, Math.cos(midLat*Math.PI/180)));
  // Large-radius searches are deliberately split into moderate pieces so the free
  // public Overpass instances do not receive one enormous request.
  const targetAreaKm2 = radiusKm >= 500 ? 50000 : radiusKm >= 300 ? 42000 : 35000;
  const maxCells = radiusKm >= 500 ? 28 : radiusKm >= 300 ? 24 : 18;
  const targetCells = Math.max(1, Math.min(maxCells, Math.ceil((latKm*lonKm)/targetAreaKm2)));
  const aspect = Math.max(.25, Math.min(4, lonKm/latKm));
  let cols = Math.max(1, Math.round(Math.sqrt(targetCells*aspect)));
  let rows = Math.max(1, Math.ceil(targetCells/cols));
  while (rows*cols > maxCells) {
    if (cols >= rows && cols > 1) cols--; else if (rows > 1) rows--; else break;
  }
  const cells=[];
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    const cs=s+(n-s)*r/rows, cn=s+(n-s)*(r+1)/rows;
    const cw=w+(e-w)*c/cols, ce=w+(e-w)*(c+1)/cols;
    cells.push([cs,cw,cn,ce]);
  }
  return cells;
}

async function queryNearbyTile(bbox, depth=0, progress=null) {
  progress?.('attempt');
  const query = `[out:json][timeout:24];\n(${overpassTypeFragments(bboxFilter(bbox))});\nout body center qt;`;
  try {
    const data = await overpass(query, { timeoutMs:22000, maxEndpoints:2 });
    progress?.('success', data.elements?.length || 0);
    return { elements:data.elements || [], failed:0 };
  } catch (err) {
    if (depth < 2 && retriableOverpassError(err)) {
      const halves=splitBbox(bbox), combined=[];
      let failed=0;
      for (const half of halves) {
        const part=await queryNearbyTile(half, depth+1, progress);
        combined.push(...part.elements); failed += part.failed;
        await new Promise(resolve=>setTimeout(resolve,120));
      }
      return { elements:combined, failed };
    }
    progress?.('failed');
    return { elements:[], failed:1, error:err };
  }
}

async function searchNearbyChunked(lat, lon, radiusMeters) {
  const radiusKm = radiusMeters/1000;
  const bbox = nearSearchBbox(lat, lon, radiusKm);
  const tiles = makeNearSearchGrid(bbox, radiusKm);
  const rawById = new Map();
  let successful=0, failed=0;
  const progress=(kind)=>{
    if(kind==='success') successful++;
    els.status.textContent = `Umkreis ${Math.round(radiusKm)} km: Teilbereiche werden geladen · ${successful} erfolgreich · ${rawById.size} Plätze gefunden`;
  };
  for(let i=0;i<tiles.length;i++) {
    els.status.textContent = `Umkreis ${Math.round(radiusKm)} km: Teilgebiet ${i+1} von ${tiles.length} wird geladen · ${rawById.size} Plätze gefunden`;
    const part=await queryNearbyTile(tiles[i],0,progress);
    for(const el of part.elements) rawById.set(`${el.type}/${el.id}`,el);
    failed += part.failed;
    if(i<tiles.length-1) await new Promise(resolve=>setTimeout(resolve,160));
  }
  // Bounding boxes include their corners outside the requested circle. Keep only
  // elements whose actual coordinate is inside the selected air-line radius.
  const elements=[...rawById.values()].filter(el=>{
    const p=normalizePlace(el);
    return p && haversineKm(lat,lon,p.lat,p.lon) <= radiusKm;
  });
  return { elements, failed, bbox, radiusKm };
}

async function searchNearMe() {
  state.routeAutoStopKeys.clear();
  state.routeAutoStopPlaces=[];
  if (!navigator.geolocation) { showError('Standortzugriff wird von diesem Browser nicht unterstützt.'); return; }
  setLoading('Standort wird bestimmt …');
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude, lon = pos.coords.longitude, radius = Number(els.nearRadius.value || 25000);
    state.userLocation = { lat, lon };
    try {
      const radiusKm=Math.round(radius/1000);
      els.status.textContent = `Campingplätze im Umkreis von ${radiusKm} km werden gesucht …`;
      let data;
      if (radius <= 100000) {
        const around = `(around:${radius},${lat.toFixed(6)},${lon.toFixed(6)})`;
        const query = `[out:json][timeout:45];\n(${overpassTypeFragments(around)});\nout body center;`;
        data = await overpass(query);
      } else {
        data = await searchNearbyChunked(lat, lon, radius);
      }
      state.currentSearchLabel = `Nähe · ${radiusKm} km`;
      ingestResults(data.elements || [], p => { p.distanceKm = haversineKm(lat, lon, p.lat, p.lon); });
      // For small radii keep an intuitive zoom; for 150–600 km fitResults() from
      // ingestResults already frames all returned places correctly.
      if (radius <= 100000) map.setView([lat, lon], radius <= 10000 ? 11 : radius <= 25000 ? 10 : radius <= 50000 ? 9 : 7);
      if (data.failed) els.status.textContent += ` · ${data.failed} Teilbereich(e) konnten nicht geladen werden`;
    } catch (err) { showError(err?.message || 'Nähe-Suche fehlgeschlagen'); }
    finally { endLoading(); }
  }, err => { endLoading(); showError(err.code === 1 ? 'Standortfreigabe wurde nicht erteilt.' : 'Standort konnte nicht bestimmt werden.'); }, { enableHighAccuracy:false, timeout:12000, maximumAge:300000 });
}
function routePointAtFraction(coords, fraction) {
  if (!Array.isArray(coords) || !coords.length) return null;
  if (coords.length === 1) return { lon:Number(coords[0][0]), lat:Number(coords[0][1]) };
  const f=Math.max(0,Math.min(1,Number(fraction)||0));
  const lengths=[];
  let total=0;
  for(let i=1;i<coords.length;i++){
    const a=coords[i-1], b=coords[i];
    const d=haversineKm(Number(a[1]),Number(a[0]),Number(b[1]),Number(b[0]));
    lengths.push(d); total+=d;
  }
  if (!total) return { lon:Number(coords[0][0]), lat:Number(coords[0][1]) };
  const target=total*f;
  let walked=0;
  for(let i=0;i<lengths.length;i++){
    const d=lengths[i];
    if(walked+d>=target || i===lengths.length-1){
      const local=d ? (target-walked)/d : 0;
      const a=coords[i], b=coords[i+1];
      return { lon:Number(a[0])+(Number(b[0])-Number(a[0]))*local, lat:Number(a[1])+(Number(b[1])-Number(a[1]))*local };
    }
    walked+=d;
  }
  const last=coords[coords.length-1];
  return { lon:Number(last[0]), lat:Number(last[1]) };
}
function formatRouteDuration(seconds) {
  const mins=Math.max(0,Math.round(Number(seconds||0)/60));
  const h=Math.floor(mins/60), m=mins%60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}
function routeVehicleValue() {
  const selected=els.routeVehicle?.value;
  if (['motorhome','van','caravan','car','tent'].includes(selected)) return selected;
  const profile=state.familyProfile?.vehicle;
  return ['motorhome','van','caravan','car','tent'].includes(profile) ? profile : 'motorhome';
}
function vehicleEligibility(place, vehicle=routeVehicleValue()) {
  const a=place?.amenities || {};
  const tourism=place?.tourism || '';
  const tags=place?.tags || {};
  if (vehicle === 'caravan') {
    if (a.caravans === 'no') return { allowed:false, confirmed:true, reason:'Wohnwagen ausdrücklich nicht erlaubt' };
    if (tourism === 'caravan_site') return a.caravans === 'yes'
      ? { allowed:true, confirmed:true, reason:'Wohnwagen auf diesem Stellplatz ausdrücklich erlaubt' }
      : { allowed:false, confirmed:false, reason:'Reiner Reisemobil-/Wohnmobilstellplatz ohne ausdrückliche Wohnwagenfreigabe' };
    if (tourism === 'camp_site') return { allowed:true, confirmed:a.caravans === 'yes', reason:a.caravans === 'yes' ? 'Wohnwagen ausdrücklich erlaubt' : 'Campingplatz – Wohnwagenregeln beim Betreiber prüfen' };
    return { allowed:false, confirmed:false, reason:'Platzart nicht als Wohnwagen-Übernachtungsplatz erkannt' };
  }
  if (vehicle === 'motorhome' || vehicle === 'van') {
    if (a.motorhome === 'no') return { allowed:false, confirmed:true, reason:'Wohnmobile ausdrücklich nicht erlaubt' };
    if (tourism === 'caravan_site') return { allowed:true, confirmed:true, reason:'Ausgewiesener Reisemobil-/Wohnmobilstellplatz' };
    if (tourism === 'camp_site') return { allowed:true, confirmed:a.motorhome === 'yes', reason:a.motorhome === 'yes' ? 'Wohnmobil ausdrücklich erlaubt' : 'Campingplatz – Fahrzeugregeln beim Betreiber prüfen' };
    return { allowed:false, confirmed:false, reason:'Platzart nicht passend' };
  }
  if (vehicle === 'tent') {
    if (a.tents === 'no') return { allowed:false, confirmed:true, reason:'Zelte ausdrücklich nicht erlaubt' };
    if (tourism === 'caravan_site') return a.tents === 'yes'
      ? { allowed:true, confirmed:true, reason:'Zelte ausdrücklich erlaubt' }
      : { allowed:false, confirmed:false, reason:'Reiner Stellplatz ohne Zeltfreigabe' };
    if (tourism === 'camp_site') return { allowed:true, confirmed:a.tents === 'yes', reason:a.tents === 'yes' ? 'Zelte ausdrücklich erlaubt' : 'Campingplatz – Zeltregeln prüfen' };
    return { allowed:false, confirmed:false, reason:'Platzart nicht passend' };
  }
  if (vehicle === 'car') {
    if (tourism !== 'camp_site') return { allowed:false, confirmed:false, reason:'Campingfinder nutzt für Auto-Übernachtungen keine normalen Park- oder Wohnmobilstellplätze' };
    if (String(tags.motor_vehicle || '').toLowerCase() === 'no') return { allowed:false, confirmed:true, reason:'Kraftfahrzeuge ausdrücklich nicht erlaubt' };
    return { allowed:true, confirmed:false, reason:'Campingplatz – Übernachten im Auto vorher beim Betreiber und nach örtlichem Recht prüfen' };
  }
  return { allowed:true, confirmed:false, reason:'Fahrzeugregeln prüfen' };
}
function routeVehicleQueryParts(areaExpr, vehicle=routeVehicleValue()) {
  if (vehicle === 'caravan') return [
    `nwr["tourism"="camp_site"]${areaExpr};`,
    `nwr["tourism"="caravan_site"]["caravans"="yes"]${areaExpr};`
  ];
  if (vehicle === 'motorhome' || vehicle === 'van') return [
    `nwr["tourism"="camp_site"]${areaExpr};`,
    `nwr["tourism"="caravan_site"]${areaExpr};`
  ];
  if (vehicle === 'tent') return [
    `nwr["tourism"="camp_site"]${areaExpr};`,
    `nwr["tourism"="caravan_site"]["tents"="yes"]${areaExpr};`
  ];
  if (vehicle === 'car') return [`nwr["tourism"="camp_site"]${areaExpr};`];
  return [`nwr["tourism"="camp_site"]${areaExpr};`,`nwr["tourism"="caravan_site"]${areaExpr};`];
}
function routeVehicleLabel(vehicle=routeVehicleValue()) {
  return {motorhome:'Wohnmobil',van:'Van / Campervan',caravan:'Wohnwagen',car:'Auto',tent:'Zelt'}[vehicle] || 'Fahrzeug';
}
function routeLegalText(vehicle=routeVehicleValue()) {
  if (vehicle === 'caravan') return '<strong>Wohnwagen:</strong> Reine Reisemobil-/Wohnmobilstellplätze werden ausgeschlossen. Sie werden nur verwendet, wenn die Platzdaten Wohnwagen ausdrücklich mit <code>caravans=yes</code> erlauben. Campingplätze mit <code>caravans=no</code> werden ebenfalls ausgeschlossen. Beschilderung und Platzordnung vor Ort haben Vorrang.';
  if (vehicle === 'car') return '<strong>Auto:</strong> Campingfinder plant nur Campingplätze als Übernachtungsstopp und keine gewöhnlichen Parkplätze. Ob Schlafen im Auto erlaubt ist, unterscheidet sich je Land und kann zusätzlich durch lokale Regeln oder den Betreiber eingeschränkt sein. In Deutschland ist eine kurzfristige Übernachtung auf einer zulässigen Parkfläche nur zur Wiederherstellung der Fahrtüchtigkeit gedacht und ohne campingähnliches Verhalten.';
  if (vehicle === 'motorhome' || vehicle === 'van') return '<strong>Wohnmobil / Van:</strong> Camping- und ausgewiesene Reisemobilstellplätze werden berücksichtigt, sofern die Daten das Fahrzeug nicht ausschließen. Beschilderung, maximale Aufenthaltsdauer und Platzordnung prüfen.';
  if (vehicle === 'tent') return '<strong>Zelt:</strong> Campingplätze werden genutzt. Reine Reisemobilstellplätze werden nur berücksichtigt, wenn Zelte ausdrücklich erlaubt sind.';
  return 'Beschilderung, örtliche Regeln und die Platzordnung haben Vorrang.';
}
function updateRouteLegalNotice() {
  if (!els.routeLegalNotice) return;
  els.routeLegalNotice.innerHTML = `${routeLegalText()}<br><small>Die Rechtslage zum Übernachten außerhalb ausgewiesener Plätze ist in Europa nicht einheitlich. Campingfinder ersetzt keine Rechtsberatung und wählt für Auto und Wohnwagen bewusst konservativ.</small>`;
}

function routeStopSearchParts(stopPoints, corridor) {
  const parts=[];
  const vehicle=routeVehicleValue();
  stopPoints.forEach(stop=>{
    const around=`(around:${corridor},${Number(stop.lat).toFixed(6)},${Number(stop.lon).toFixed(6)})`;
    parts.push(...routeVehicleQueryParts(around, vehicle));
  });
  return parts.join('\n');
}

function routeStopRadiusPlan(corridor) {
  const base=Math.max(5000, Number(corridor || 10000));
  // Three useful stages instead of six slow sequential radius queries.
  return [...new Set([
    base,
    Math.max(base, 60000),
    Math.max(base, 160000)
  ])].sort((a,b)=>a-b);
}

function bboxAroundPoint(lat, lon, radiusMeters) {
  const km=Math.max(1, Number(radiusMeters||0)/1000);
  const latPad=km/111;
  const lonPad=km/(111*Math.max(.22,Math.cos(Number(lat)*Math.PI/180)));
  return [Number(lat)-latPad, Number(lon)-lonPad, Number(lat)+latPad, Number(lon)+lonPad];
}

function routeCandidateFromRaw(raw, stop, vehicle, radius) {
  const place=normalizePlace(raw);
  if(!place) return null;
  const eligibility=vehicleEligibility(place,vehicle);
  if(!eligibility.allowed) return null;
  const distanceKm=haversineKm(stop.lat,stop.lon,place.lat,place.lon);
  if(distanceKm > radius/1000*1.03) return null;
  return { raw, place, eligibility, distanceKm, vehicleRank:eligibility.confirmed?0:1 };
}

function rawElementFromPlace(place) {
  if(!place) return null;
  const raw={ type:place.osmType || 'node', id:place.osmId, tags:{...(place.tags||{})} };
  if(raw.type==='node'){ raw.lat=place.lat; raw.lon=place.lon; }
  else raw.center={lat:place.lat,lon:place.lon};
  return raw;
}

function localRouteStopCandidates(stop, vehicle, radius) {
  const seen=new Set();
  return (state.allPlaces || []).map(place=>{
    if(!place || seen.has(place.key)) return null;
    seen.add(place.key);
    const eligibility=vehicleEligibility(place,vehicle);
    if(!eligibility.allowed) return null;
    const distanceKm=haversineKm(stop.lat,stop.lon,place.lat,place.lon);
    if(distanceKm > radius/1000) return null;
    return { raw:rawElementFromPlace(place), place, eligibility, distanceKm, vehicleRank:eligibility.confirmed?0:1 };
  }).filter(Boolean);
}

async function findRouteStopCandidateList(stop, stopIndex, corridor) {
  const radii=routeStopRadiusPlan(corridor);
  const vehicle=routeVehicleValue();
  const collected=new Map();
  let lastError=null, hadSuccessfulQuery=false;

  for (const radius of radii) {
    els.status.textContent=`Übernachtung ${stopIndex+1}: Campingplätze bis ${Math.round(radius/1000)} km werden gesucht …`;

    // Reuse places already loaded in the app before making another network request.
    for(const candidate of localRouteStopCandidates(stop,vehicle,radius)) collected.set(candidate.place.key,candidate);
    if(collected.size) break;

    const bbox=bboxFilter(bboxAroundPoint(stop.lat,stop.lon,radius));
    const query=`[out:json][timeout:11];\n(${routeVehicleQueryParts(bbox,vehicle).join('\n')});\nout body center qt;`;
    try {
      const data=await overpass(query,{timeoutMs:9500,maxEndpoints:2});
      hadSuccessfulQuery=true;
      for(const raw of data.elements || []) {
        const candidate=routeCandidateFromRaw(raw,stop,vehicle,radius);
        if(candidate) collected.set(candidate.place.key,candidate);
      }
      if(collected.size) break;
    } catch (err) {
      lastError=err;
    }
  }

  const candidates=[...collected.values()];
  // "Nächster Platz" means distance first; explicit vehicle confirmation only breaks ties.
  candidates.sort((a,b)=>a.distanceKm-b.distanceKm || a.vehicleRank-b.vehicleRank || a.place.name.localeCompare(b.place.name,state.language));
  return { stop, stopIndex, candidates, lastError, hadSuccessfulQuery };
}

async function resolveRouteStopPlaces(stopPoints, corridor) {
  const rawById=new Map();
  const usedKeys=new Set();
  let failed=0;

  // Search at most two overnight areas simultaneously. This makes 2-stop routes roughly twice as fast
  // without flooding the public data services on routes with many overnights.
  const searches=await mapWithConcurrency(stopPoints, 2, (stop,index)=>findRouteStopCandidateList(stop,index,corridor));
  const resolved=[];

  for(const search of searches) {
    const best=search.candidates.find(candidate=>!usedKeys.has(candidate.place.key));
    if(!best) {
      failed++;
      resolved.push({
        ...search.stop,
        stopIndex:search.stopIndex+1,
        error:search.lastError || new Error(search.hadSuccessfulQuery ? 'Kein geeigneter Campingplatz im erweiterten Bereich gefunden.' : 'Campingplatz-Datenserver nicht erreichbar.'),
        dataUnavailable:!search.hadSuccessfulQuery
      });
      continue;
    }
    usedKeys.add(best.place.key);
    if(best.raw) rawById.set(`${best.raw.type}/${best.raw.id}`,best.raw);
    resolved.push({
      ...search.stop,
      lat:best.place.lat,
      lon:best.place.lon,
      targetLat:search.stop.lat,
      targetLon:search.stop.lon,
      place:best.place,
      raw:best.raw,
      placeKey:best.place.key,
      name:best.place.name,
      distanceFromIdealKm:best.distanceKm,
      searchRadius:Math.ceil(best.distanceKm*1000),
      vehicleEligibility:best.eligibility,
      stopIndex:search.stopIndex+1
    });
  }
  return { stops:resolved, elements:[...rawById.values()], failed };
}
function nearestRouteStop(place, stopPoints) {
  let best=null;
  stopPoints.forEach((stop,index)=>{
    const km=haversineKm(place.lat,place.lon,stop.lat,stop.lon);
    if(!best || km<best.km) best={index,km,stop};
  });
  return best;
}
function renderRoutePlanMap(route, routeCoords, start, end, stopPoints, legs) {
  routePlanLayer.clearLayers();
  const totalDistance=Math.max(1, Number(route.distance||0));
  const makePointMarker=(lat,lon,label,kind,popup)=>{
    const marker=L.marker([lat,lon],{
      icon:L.divIcon({
        className:'route-plan-marker-wrap',
        html:`<div class="route-plan-marker ${kind}">${escapeHtml(label)}</div>`,
        iconSize:[kind==='stop'?38:46,38], iconAnchor:[kind==='stop'?19:23,19]
      }),
      title:popup,
      zIndexOffset:900
    });
    marker.bindPopup(`<div class="map-popup"><h3>${escapeHtml(popup)}</h3></div>`);
    marker.addTo(routePlanLayer);
  };
  makePointMarker(start.lat,start.lon,'S','start',`Start · ${routeShortName(start)}`);
  let stopCumulativeDistance = 0;
  stopPoints.forEach((stop,index)=>{
    const leg=legs[index] || {};
    stopCumulativeDistance += Number(leg.distance || 0);
    const placeName=stop.name ? ` · ${stop.name}` : '';
    const detour=Number.isFinite(stop.distanceFromIdealKm) ? ` · ${stop.distanceFromIdealKm.toFixed(1)} km vom idealen Stopp` : '';
    makePointMarker(stop.lat,stop.lon,String(index+1),'stop',`Übernachtung ${index+1}${placeName} · nach ca. ${Math.round(stopCumulativeDistance/1000)} km · Etappe ${formatRouteDuration(leg.duration)}${detour}`);
  });
  makePointMarker(end.lat,end.lon,'Z','end',`Ziel · ${routeShortName(end)}`);

  let cumulative=0;
  (legs || []).forEach((leg,index)=>{
    const distance=Number(leg.distance||0);
    const midpoint=(cumulative + distance/2)/totalDistance;
    cumulative += distance;
    const pos=routePointAtFraction(routeCoords,midpoint);
    if(!pos) return;
    const label=L.marker([pos.lat,pos.lon],{
      interactive:false,
      zIndexOffset:800,
      icon:L.divIcon({
        className:'route-segment-label-wrap',
        html:`<div class="route-segment-label"><strong>${Math.round(distance/1000)} km</strong><span>${escapeHtml(formatRouteDuration(leg.duration))}</span></div>`,
        iconSize:[94,42], iconAnchor:[47,21]
      })
    });
    label.addTo(routePlanLayer);
  });
}
function renderRouteSummary(start,end,route,legs,overnights,corridor) {
  if(!els.routeSummary) return;
  const totalKm=Math.round(Number(route.distance||0)/1000);
  const vehicleLabel=routeVehicleLabel();
  const stopText=overnights===0
    ? `Keine Zwischenübernachtung · passende Plätze für ${vehicleLabel} im Korridor der gesamten Route`
    : `${overnights} Zwischenübernachtung${overnights===1?'':'en'} · ${overnights+1} Fahretappen · nächster für ${vehicleLabel} geeigneter Platz je Idealstopp wird automatisch gewählt und die Route dorthin angepasst`;
  let cumulativeKm=0;
  const stops=state.routeAutoStopPlaces || [];
  const stopLabel=(idx)=>stops[idx]?.name ? `Stopp ${idx+1}: ${stops[idx].name}` : `Stopp ${idx+1}`;
  const legCards=(legs||[]).map((leg,index)=>{
    const km=Math.round(Number(leg.distance||0)/1000);
    cumulativeKm += km;
    const from=index===0 ? routeShortName(start) : stopLabel(index-1);
    const to=index===legs.length-1 ? routeShortName(end) : stopLabel(index);
    const stopInfo=index<legs.length-1 && stops[index]
      ? ` · ${Number.isFinite(stops[index].distanceFromIdealKm) ? `${stops[index].distanceFromIdealKm.toFixed(1)} km vom idealen Stopp` : 'automatisch gewählt'}`
      : '';
    return `<div class="route-leg-card"><span>Etappe ${index+1}</span><strong>${km} km · ${escapeHtml(formatRouteDuration(leg.duration))}</strong><small>${escapeHtml(from)} → ${escapeHtml(to)}${index<legs.length-1 ? ` · Übernachtung nach ca. ${cumulativeKm} km${stopInfo}` : ''}</small></div>`;
  }).join('');
  els.routeSummary.hidden=false;
  els.routeSummary.innerHTML=`<div class="route-summary-head"><div><strong>${escapeHtml(routeShortName(start))} → ${escapeHtml(routeShortName(end))}</strong><span>${escapeHtml(stopText)}</span></div><div class="route-total"><strong>${totalKm} km</strong><span>${escapeHtml(formatRouteDuration(route.duration))}</span></div></div><div class="route-leg-grid">${legCards}</div>`;
}

async function searchRoute() {
  const startText = els.routeStart.value.trim(), endText = els.routeEnd.value.trim();
  if (!startText || !endText) { showError('Bitte Start und Ziel für die Route eingeben.'); return; }
  setLoading('Route und Übernachtungsstopps werden berechnet …');
  els.routeBtn.disabled = true;
  state.routeAutoStopKeys.clear();
  state.routeAutoStopPlaces = [];
  try {
    const start = await ensureRouteSelection('start', startText);
    const end = await ensureRouteSelection('end', endText);
    const overnights=Math.max(0,Math.min(8,Number(els.routeOvernights?.value || 0)));
    const corridor = Number(els.routeCorridor.value || 10000);

    const initialUrl = `${OSRM_ENDPOINT}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson&steps=false`;
    const initialResponse = await fetch(initialUrl);
    if (!initialResponse.ok) throw new Error('Routing-Dienst nicht erreichbar.');
    const initialData = await initialResponse.json();
    if (initialData.code !== 'Ok' || !initialData.routes?.length) throw new Error('Für Start und Ziel wurde keine Route gefunden.');
    const initialRoute=initialData.routes[0];
    const initialCoords=initialRoute.geometry?.coordinates || [];
    if(initialCoords.length<2) throw new Error('Routengeometrie fehlt.');

    const roughStops=[];
    for(let i=1;i<=overnights;i++){
      const point=routePointAtFraction(initialCoords,i/(overnights+1));
      if(point) roughStops.push(point);
    }

    let resolvedStopSearch={stops:[],elements:[],failed:0};
    let realStops=[];
    if (roughStops.length) {
      resolvedStopSearch=await resolveRouteStopPlaces(roughStops,corridor);
      const missing=resolvedStopSearch.stops.filter(stop=>!stop.place);
      if (missing.length) {
        const unavailable=missing.filter(stop=>stop.dataUnavailable).length;
        if(unavailable===missing.length) throw new Error('Die freien Campingplatz-Datenserver waren für die Übernachtungsstopps nicht erreichbar. Bitte die Route erneut starten; Campingfinder wechselt automatisch zwischen den Servern.');
        throw new Error(`Für ${missing.length} Übernachtungsstopp${missing.length===1?'':'s'} wurde auch im erweiterten Bereich kein für ${routeVehicleLabel()} geeigneter Platz gefunden.`);
      }
      realStops=resolvedStopSearch.stops;
      state.routeAutoStopPlaces=realStops;
      state.routeAutoStopKeys=new Set(realStops.map(stop=>stop.placeKey).filter(Boolean));
    }

    let finalData=initialData;
    if(realStops.length){
      els.status.textContent='Route wird über die gefundenen Campingplätze neu berechnet …';
      const points=[[start.lon,start.lat],...realStops.map(p=>[p.lon,p.lat]),[end.lon,end.lat]];
      const viaUrl=`${OSRM_ENDPOINT}/${points.map(p=>`${p[0]},${p[1]}`).join(';')}?overview=full&geometries=geojson&steps=false`;
      const viaResponse=await fetch(viaUrl);
      if(!viaResponse.ok) throw new Error('Routing-Dienst konnte die Route über die Campingplätze nicht berechnen.');
      const viaData=await viaResponse.json();
      if(viaData.code!=='Ok' || !viaData.routes?.length) throw new Error('Die Route über die gefundenen Campingplätze konnte nicht berechnet werden.');
      finalData=viaData;
    }

    const route=finalData.routes[0];
    const coords=route.geometry?.coordinates || [];
    const simplified=simplifyRouteCoordinates(coords,70);
    if(simplified.length<2) throw new Error('Routengeometrie fehlt.');
    const legs=route.legs?.length ? route.legs : [{distance:route.distance,duration:route.duration}];

    const waypointStops=realStops.map((stop,index)=>({
      ...stop,
      index:index+1,
      routedLocation:finalData.waypoints?.[index+1]?.location || [stop.lon,stop.lat]
    }));

    state.routeGeometry=simplified;
    if(state.routeLayer) map.removeLayer(state.routeLayer);
    state.routeLayer=L.polyline(coords.map(c=>[c[1],c[0]]),{weight:6,opacity:.78}).addTo(map);
    renderRoutePlanMap(route,coords,start,end,waypointStops,legs);
    renderRouteSummary(start,end,route,legs,overnights,corridor);
    map.fitBounds(state.routeLayer.getBounds(),{padding:[34,34]});

    if(overnights>0 && waypointStops.length){
      state.currentSearchLabel=`${overnights} automatische Übernachtung${overnights===1?'':'en'} · ${routeShortName(start)} → ${routeShortName(end)}`;
      if(els.sort) els.sort.value='distance';
      ingestResults(resolvedStopSearch.elements || [],p=>{
        const exact=waypointStops.find(stop=>stop.placeKey===p.key);
        if(exact){
          p.routeDistanceKm=0;
          p.routeStopIndex=exact.stopIndex;
          p.routeStopTarget=exact;
          p.routeAutoSelected=true;
          p.routeIdealOffsetKm=exact.distanceFromIdealKm;
        } else {
          const nearest=nearestRouteStop(p,waypointStops);
          if(nearest){p.routeDistanceKm=nearest.km;p.routeStopIndex=nearest.index+1;p.routeStopTarget=nearest.stop;}
        }
      });
      els.status.textContent=`${waypointStops.length} Übernachtungsplatz${waypointStops.length===1?'':'plätze'} automatisch gewählt · Route angepasst`;
    } else {
      state.routeAutoStopKeys.clear();
      state.routeAutoStopPlaces=[];
      els.status.textContent='Campingplätze entlang der gesamten Route werden gesucht …';
      const line=simplified.map(c=>`${Number(c[1]).toFixed(5)},${Number(c[0]).toFixed(5)}`).join(',');
      const around=`(around:${corridor},${line})`;
      const qParts=routeVehicleQueryParts(around,routeVehicleValue()).join('\n');
      const query=`[out:json][timeout:60];\n(${qParts});\nout body center qt;`;
      const places=await overpass(query);
      const vehicle=routeVehicleValue();
      const legalElements=(places.elements || []).filter(el=>{const p=normalizePlace(el);return p && vehicleEligibility(p,vehicle).allowed;});
      state.currentSearchLabel=`Route ${routeShortName(start)} → ${routeShortName(end)} · ${routeVehicleLabel(vehicle)}`;
      if(els.sort) els.sort.value='distance';
      ingestResults(legalElements,p=>{p.routeDistanceKm=distanceToRouteKm(p,simplified);});
    }

    setTimeout(()=>{
      try{map.fitBounds(state.routeLayer.getBounds(),{padding:[34,34]});}catch{}
      state.routeLayer?.bringToFront?.();
      routePlanLayer?.bringToFront?.();
    },160);
  } catch (err) {
    state.routeAutoStopKeys.clear();
    state.routeAutoStopPlaces=[];
    showError(err?.message || 'Routensuche fehlgeschlagen');
  }
  finally { endLoading(); els.routeBtn.disabled = false; }
}

function setLoading(message) {
  els.status.textContent = message;
  els.results.innerHTML = `<div class="skeleton-stack" aria-label="${escapeHtml(message)}">${[1,2,3].map(()=>`<div class="skeleton-card"><div class="skeleton-line wide"></div><div class="skeleton-line medium"></div><div class="skeleton-chips"><i></i><i></i><i></i></div><div class="skeleton-weather"></div></div>`).join('')}</div>`;
  els.countryBtn.disabled = true;
  els.mapBtn.disabled = true;
}
function endLoading() {
  els.countryBtn.disabled = false;
  els.mapBtn.disabled = false;
}
function showError(message) {
  els.results.innerHTML = `<div class="error-box"><strong>Suche nicht möglich.</strong><br>${escapeHtml(message)}<br><br>Bei sehr großen Ländern kann die freie Datenabfrage überlastet sein. Dann den gewünschten Bereich auf der Karte heranzoomen und „Kartenbereich durchsuchen“ wählen.</div>`;
  els.status.textContent = 'Fehler bei der Datenabfrage';
}

async function searchCountry() {
  state.routeAutoStopKeys.clear();
  state.routeAutoStopPlaces=[];
  setLoading('Campingplätze werden gesucht …');
  try {
    const countryCode = els.country.value;
    const countryName = els.country.selectedOptions[0]?.textContent || countryCode;
    const placeText = els.place.value.trim();
    if (placeText) {
      els.status.textContent = `Ort „${placeText}“ wird gesucht …`;
      const geo = await geocodePlace(placeText, countryCode, countryName);
      const [s,w,n,e] = geo.bbox;
      // Expand very small geocoding boxes to at least about 25 km in each direction.
      const latPad = Math.max((n-s) * 0.35, 0.16);
      const lonPad = Math.max((e-w) * 0.35, 0.22);
      const bounds = [s-latPad,w-lonPad,n+latPad,e+lonPad];
      const bbox = bboxFilter(bounds);
      const query = `[out:json][timeout:40];\n(${overpassTypeFragments(bbox)});\nout body center qt;`;
      state.currentSearchLabel = geo.name || placeText;
      const locationMode = ['sea','inland'].includes(els.location?.value) ? els.location.value : '';
      try {
        const data = await overpass(query, { timeoutMs: 26000, maxEndpoints: 4 });
        const elements = locationMode ? await filterRawByLocationMode(data.elements || [], bounds, locationMode, 30) : (data.elements || []);
        ingestResults(elements, place => {
          if (locationMode === 'sea') { place.sea = true; place.coastalSearch = true; place.coastRadiusKm = 30; }
          if (locationMode === 'inland') place.sea = false;
        });
      } catch (err) {
        if (!retriableOverpassError(err)) throw err;
        // A large region (e.g. Bavaria/Tuscany) is automatically divided if a single request is too heavy.
        const pseudoCountry = await searchCountryChunked(countryCode, placeText, bounds, null, { locationMode, coastRadiusKm:30 });
        ingestResults(pseudoCountry.elements || [], place => {
          if (locationMode === 'sea') { place.sea = true; place.coastalSearch = true; place.coastRadiusKm = 30; }
          if (locationMode === 'inland') place.sea = false;
        });
        if (pseudoCountry.failed) els.status.textContent = `${placeText}: Ergebnisse geladen · ${pseudoCountry.failed} Teilbereich(e) konnten nicht geladen werden.`;
      }
    } else {
      // Full-country searches are intentionally split into smaller geographic chunks.
      // When "Am Meer" is active, campsites are queried geographically around real OSM coastline ways
      // instead of relying on incomplete textual campsite tags.
      const locationMode = ['sea','inland'].includes(els.location?.value) ? els.location.value : '';
      const coastMode = locationMode === 'sea';
      els.status.textContent = coastMode ? `${countryName}: Küstensuche wird vorbereitet …` : locationMode === 'inland' ? `${countryName}: Inlandssuche wird vorbereitet …` : `${countryName}: Landesgrenzen werden vorbereitet …`;
      const geo = await geocodeCountryBoundary(countryName, countryCode);
      state.currentSearchLabel = coastMode ? `${countryName} · Küste` : locationMode === 'inland' ? `${countryName} · Inland` : countryName;
      const result = await searchCountryChunked(countryCode, countryName, geo.bbox, geo.geometry, { locationMode, coastRadiusKm: 30 });
      if (!result.elements.length && result.failed) throw new Error('Keiner der freien OpenStreetMap-Datenserver konnte die Teilbereiche laden. Campingfinder hat automatisch mehrere Server probiert. Bitte kurz erneut versuchen.');
      if (locationMode) {
        ingestResults(result.elements || [], place => {
          if (locationMode === 'sea') { place.sea = true; place.coastalSearch = true; place.coastRadiusKm = 30; }
          else place.sea = false;
        });
      } else ingestResults(result.elements || []);
      try { map.fitBounds([[result.bbox[0],result.bbox[1]],[result.bbox[2],result.bbox[3]]], { padding:[24,24], maxZoom:7 }); } catch {}
      if (result.failed) {
        els.status.textContent = coastMode
          ? `${countryName} · Küste: ${state.filteredPlaces.length} Treffer · ${result.failed} Teilbereich(e) vorübergehend nicht geladen.`
          : `${countryName}: ${state.filteredPlaces.length} Treffer · ${result.failed} Teilbereich(e) vorübergehend nicht geladen.`;
      } else if (coastMode && els.smartSearchFeedback) {
        els.smartSearchFeedback.innerHTML += ' <span>Meer = geografisch bis ca. 30 km von einer OpenStreetMap-Küstenlinie.</span>';
      }
    }
  } catch (err) {
    if (err?.code === 'USER_CANCEL') { els.status.textContent = 'Ortsauswahl abgebrochen.'; return; }
    showError(err?.name === 'AbortError' ? 'Zeitüberschreitung bei der freien Kartendaten-API.' : (err?.message || 'Unbekannter Fehler'));
  } finally { endLoading(); }
}

async function searchMapArea() {
  state.routeAutoStopKeys.clear();
  state.routeAutoStopPlaces=[];
  const b = map.getBounds();
  if (map.getZoom() < 5) {
    showError('Der sichtbare Kartenbereich ist sehr groß. Bitte etwas näher heranzoomen.');
    return;
  }
  setLoading('Sichtbarer Kartenbereich wird durchsucht …');
  try {
    const bbox = `(${b.getSouth().toFixed(5)},${b.getWest().toFixed(5)},${b.getNorth().toFixed(5)},${b.getEast().toFixed(5)})`;
    const query = `[out:json][timeout:35];\n(${overpassTypeFragments(bbox)});\nout body center;`;
    const data = await overpass(query);
    state.currentSearchLabel = 'Kartenbereich';
    ingestResults(data.elements || []);
  } catch (err) {
    showError(err?.message || 'Kartensuche fehlgeschlagen');
  } finally { endLoading(); }
}

function ingestResults(elements, decorate = null) {
  state.selectedPlaceKey = null;
  const dedupe = new Map();
  elements.map(normalizePlace).filter(Boolean).forEach(p => { if (decorate) decorate(p); dedupe.set(p.key, p); });
  state.allPlaces = [...dedupe.values()];
  state.weather.clear();
  persistLastSearch();
  applyFilters(true);
}

function matchesAmenities(place) {
  const a = place.amenities;
  if (els.electric.checked && a.electricity !== 'yes') return false;
  if (els.water.checked && a.drinkingWater !== 'yes') return false;
  if (els.toilet.checked && a.toilets !== 'yes') return false;
  if (els.shower.checked && a.shower !== 'yes') return false;
  if (els.dump.checked && a.dump !== 'yes') return false;
  if (els.wifi.checked && a.wifi !== 'yes') return false;
  if (els.wheelchair.checked && a.wheelchair !== 'yes') return false;
  if (els.motorhome.checked && !vehicleEligibility(place,'motorhome').allowed) return false;
  if (els.caravan.checked && !vehicleEligibility(place,'caravan').allowed) return false;
  if (els.tents.checked && !vehicleEligibility(place,'tent').allowed) return false;
  if (els.cabins.checked && a.cabins !== 'yes') return false;
  if (els.greyWater.checked && a.greyWater !== 'yes') return false;
  if (els.chemicalToilet.checked && a.chemicalToilet !== 'yes') return false;
  if (els.playground.checked && a.playground !== 'yes') return false;
  if (els.pool.checked && a.pool !== 'yes') return false;
  if (els.laundry.checked && a.laundry !== 'yes') return false;
  if (els.privateBathroom?.checked && a.privateBathroom !== 'yes') return false;
  if (els.sauna?.checked && a.sauna !== 'yes') return false;
  if (els.privateHotTub?.checked && a.privateHotTub !== 'yes') return false;
  if (els.privatePool?.checked && a.privatePool !== 'yes') return false;
  if (els.kidsBath?.checked && a.kidsBath !== 'yes') return false;
  if (els.babyBath?.checked && a.babyBath !== 'yes') return false;
  if (els.rentalCaravan?.checked && a.rentalCaravan !== 'yes') return false;
  if (els.rentalTent?.checked && a.rentalTent !== 'yes') return false;
  if (els.bungalow?.checked && a.bungalow !== 'yes') return false;
  if (els.indoorPool?.checked && a.indoorPool !== 'yes') return false;
  if (els.heatedPool?.checked && a.heatedPool !== 'yes') return false;
  if (els.paddlingPool?.checked && a.paddlingPool !== 'yes') return false;
  if (els.waterPark?.checked && a.waterPark !== 'yes') return false;
  if (els.kidsClub?.checked && a.kidsClub !== 'yes') return false;
  if (els.teenClub?.checked && a.teenClub !== 'yes') return false;
  if (els.animation?.checked && a.animation !== 'yes') return false;
  if (els.restaurant?.checked && a.restaurant !== 'yes') return false;
  if (els.breadService?.checked && a.breadService !== 'yes') return false;
  if (els.supermarket?.checked && a.supermarket !== 'yes') return false;
  if (els.directBeach?.checked && a.directBeach !== 'yes') return false;
  if (els.privateBeach?.checked && a.privateBeach !== 'yes') return false;
  if (els.lakeAccess?.checked && a.lakeAccess !== 'yes') return false;
  if (els.fishing?.checked && a.fishing !== 'yes') return false;
  if (els.bikeRental?.checked && a.bikeRental !== 'yes') return false;
  if (els.ebikeCharge?.checked && a.ebikeCharge !== 'yes') return false;
  if (els.gasExchange?.checked && a.gasExchange !== 'yes') return false;
  if (els.evCharge?.checked && a.evCharge !== 'yes') return false;
  if (els.yearRound?.checked && a.yearRound !== 'yes') return false;
  if (els.accessibleSanitary?.checked && a.accessibleSanitary !== 'yes') return false;
  if (els.washingMachine?.checked && a.washingMachine !== 'yes') return false;
  if (els.dryer?.checked && a.dryer !== 'yes') return false;
  if (Number(els.pitchSize?.value || 0) > 0 && (place.pitchSizeM2 == null || place.pitchSizeM2 < Number(els.pitchSize.value))) return false;
  if (els.pitchExposure?.value === 'shaded' && a.shadedPitches !== 'yes') return false;
  if (els.pitchExposure?.value === 'sunny' && a.sunnyPitches !== 'yes') return false;
  return true;
}


function placeDataQuality(place) {
  const t = place?.tags || {};
  const a = place?.amenities || {};
  const checks = [
    place?.name && !/ohne namen/i.test(place.name), place?.address, place?.website,
    firstTag(t,'operator'), firstTag(t,'phone','contact:phone'), firstTag(t,'email','contact:email'),
    firstTag(t,'opening_hours','opening_date','seasonal'), place?.fee !== 'unknown', place?.dog !== 'unknown',
    place?.stars > 0, place?.priceNight != null, capacityNumber(t) != null,
    a.electricity !== 'unknown', a.drinkingWater !== 'unknown', a.toilets !== 'unknown', a.shower !== 'unknown',
    a.wifi !== 'unknown', a.playground !== 'unknown', a.pool !== 'unknown', a.dump !== 'unknown'
  ];
  const count = checks.filter(Boolean).length;
  const percent = Math.round((count / checks.length) * 100);
  if (percent >= 65) return { level:'high', label:'Viele Angaben', percent };
  if (percent >= 35) return { level:'medium', label:'Einige Angaben', percent };
  return { level:'low', label:'Wenige Angaben', percent };
}

function activeFilterLabels() {
  const labels = [];
  const checkboxMap = [
    [els.adult,'Nur Erwachsene'],[els.fkk,'FKK'],[els.family,'Familie'],[els.baby,'Baby 0–2'],[els.toddler,'Kleinkinder 3–5'],[els.children,'Kinder 6–12'],[els.teen,'Jugendliche 13–17'],[els.website,'Original-Webseite'],
    [els.electric,'Strom'],[els.water,'Trinkwasser'],[els.toilet,'Toiletten'],[els.shower,'Dusche'],[els.dump,'Entsorgung'],[els.greyWater,'Grauwasser'],[els.chemicalToilet,'Chemie-WC'],[els.wifi,'WLAN'],[els.wheelchair,'Barrierearm'],[els.motorhome,'Wohnmobil/Van'],[els.caravan,'Wohnwagen'],[els.tents,'Zelt'],[els.cabins,'Mietunterkunft'],[els.playground,'Spielplatz'],[els.pool,'Pool'],[els.laundry,'Waschmöglichkeit'],
    [els.privateBathroom,'Privatbad'],[els.sauna,'Sauna'],[els.privateHotTub,'Privat-Whirlpool'],[els.privatePool,'Privat-Pool'],[els.kidsBath,'Kinderbad'],[els.babyBath,'Babybad'],[els.rentalCaravan,'Mietwohnwagen'],[els.rentalTent,'Mietzelt'],[els.bungalow,'Bungalow'],
    [els.indoorPool,'Hallenbad'],[els.heatedPool,'Beheizter Pool'],[els.paddlingPool,'Kinderpool'],[els.waterPark,'Wasserpark'],[els.kidsClub,'Kinderclub'],[els.teenClub,'Jugendclub'],[els.animation,'Animation'],[els.restaurant,'Restaurant'],[els.breadService,'Brötchenservice'],[els.supermarket,'Shop'],
    [els.directBeach,'Strandzugang'],[els.privateBeach,'Privatstrand'],[els.lakeAccess,'Seezugang'],[els.fishing,'Angeln'],[els.bikeRental,'Fahrradverleih'],[els.ebikeCharge,'E-Bike-Laden'],[els.gasExchange,'Gasflaschen'],[els.evCharge,'E-Auto-Lader'],[els.yearRound,'Ganzjährig'],[els.accessibleSanitary,'Barrierefreies Sanitär'],[els.washingMachine,'Waschmaschine'],[els.dryer,'Trockner']
  ];
  checkboxMap.forEach(([el,label]) => { if (el?.checked) labels.push(label); });
  if (els.type?.value && els.type.value !== 'all') labels.push(els.type.value === 'caravan_site' ? 'Wohnmobilstellplätze' : 'Campingplätze');
  if (els.dog?.value === 'yes') labels.push('Hund erlaubt'); else if (els.dog?.value === 'no') labels.push('Ohne Hund');
  if (els.fee?.value === 'free') labels.push('Kostenlos'); else if (els.fee?.value === 'paid') labels.push('Kostenpflichtig');
  if (Number(els.stars?.value || 0) > 0) labels.push(`${els.stars.value}+ Sterne`);
  if (els.location?.value === 'sea') labels.push('Am Meer'); else if (els.location?.value === 'inland') labels.push('Inland');
  if (els.style?.value && els.style.value !== 'all') labels.push({quiet:'Ruhig',luxury:'Komfort/Luxus',glamping:'Glamping'}[els.style.value] || els.style.value);
  if (els.price?.value && els.price.value !== 'all') labels.push(`bis ${els.price.value} €/Nacht`);
  if (Number(els.pitchSize?.value || 0) > 0) labels.push(`ab ${els.pitchSize.value} m²`);
  if (els.pitchExposure?.value === 'shaded') labels.push('Schattig'); else if (els.pitchExposure?.value === 'sunny') labels.push('Sonnig');
  return [...new Set(labels)];
}

function updateFilterSummary() {
  const labels = activeFilterLabels();
  if (els.activeFilterCount) els.activeFilterCount.textContent = `${labels.length} aktiv`;
  if (els.activeFilterText) els.activeFilterText.textContent = labels.length ? labels.slice(0,5).join(' · ') + (labels.length > 5 ? ` · +${labels.length-5}` : '') : 'Keine zusätzlichen Filter aktiv';
}

function placeMatchHtml(place) {
  const labels = activeFilterLabels();
  if (!labels.length) return '';
  const shown = labels.slice(0,4);
  return `<div class="match-strip"><strong>Passt zu deiner Suche:</strong><span>${shown.map(escapeHtml).join(' · ')}${labels.length>shown.length ? ` · +${labels.length-shown.length}` : ''}</span></div>`;
}

function normalizeSearchText(value='') {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
}

function resetFilterControlsForSmartSearch() {
  [els.adult,els.fkk,els.family,els.baby,els.toddler,els.children,els.teen,els.website,els.electric,els.water,els.toilet,els.shower,els.dump,els.wifi,els.wheelchair,els.motorhome,els.caravan,els.tents,els.cabins,els.greyWater,els.chemicalToilet,els.playground,els.pool,els.laundry,els.privateBathroom,els.sauna,els.privateHotTub,els.privatePool,els.kidsBath,els.babyBath,els.rentalCaravan,els.rentalTent,els.bungalow,els.indoorPool,els.heatedPool,els.paddlingPool,els.waterPark,els.kidsClub,els.teenClub,els.animation,els.restaurant,els.breadService,els.supermarket,els.directBeach,els.privateBeach,els.lakeAccess,els.fishing,els.bikeRental,els.ebikeCharge,els.gasExchange,els.evCharge,els.yearRound,els.accessibleSanitary,els.washingMachine,els.dryer].filter(Boolean).forEach(el=>{el.checked=false;});
  if (els.type) els.type.value='all';
  if (els.dog) els.dog.value='all'; if (els.fee) els.fee.value='all'; if (els.stars) els.stars.value='0'; if (els.location) els.location.value='all';
  if (els.style) els.style.value='all'; if (els.price) els.price.value='all'; if (els.pitchSize) els.pitchSize.value='0'; if (els.pitchExposure) els.pitchExposure.value='all';
}

function applySmartSearchText() {
  const raw = els.smartSearchInput?.value?.trim() || '';
  if (!raw) { if (els.smartSearchFeedback) els.smartSearchFeedback.textContent='Bitte einen Suchwunsch eingeben.'; return; }
  resetFilterControlsForSmartSearch();
  let work = ` ${normalizeSearchText(raw)} `;
  const found = [];
  const setCheck=(el,label)=>{if(el){el.checked=true;found.push(label);}};
  const setValue=(el,value,label)=>{if(el){el.value=value;found.push(label);}};
  const rules = [
    [/\b(privatbad|private bathroom|privatsanitar|private sanitary)\b/g,()=>setCheck(els.privateBathroom,'Privatbad')],
    [/\b(privat(?:er)? whirlpool|private hot tub|private whirlpool|jacuzzi privat)\b/g,()=>setCheck(els.privateHotTub,'Privat-Whirlpool')],
    [/\b(privatpool|privater pool|private pool)\b/g,()=>setCheck(els.privatePool,'Privat-Pool')],
    [/\b(kinderbad|kindersanitar)\b/g,()=>setCheck(els.kidsBath,'Kinderbad')],
    [/\b(babybad|babysanitar|babyraum)\b/g,()=>setCheck(els.babyBath,'Babybad')],
    [/\b(mietwohnwagen|leihwohnwagen|standwohnwagen|mobile home|mobilheim)\b/g,()=>setCheck(els.rentalCaravan,'Mietwohnwagen')],
    [/\b(mietzelt|leihzelt|glampingzelt|safarizelt)\b/g,()=>setCheck(els.rentalTent,'Mietzelt')],
    [/\b(bungalow|bungalows|hutte|hutten|cabin|chalet|lodge)\b/g,()=>setCheck(els.bungalow,'Bungalow/Hütte')],
    [/\b(hallenbad|indoor pool)\b/g,()=>setCheck(els.indoorPool,'Hallenbad')],
    [/\b(beheizter pool|beheiztes schwimmbad|heated pool)\b/g,()=>setCheck(els.heatedPool,'Beheizter Pool')],
    [/\b(kinderpool|planschbecken|paddling pool)\b/g,()=>setCheck(els.paddlingPool,'Kinderpool')],
    [/\b(wasserpark|aquapark|wasserrutsche|wasserrutschen|rutsche|rutschen|water slide|waterslide|slides?)\b/g,()=>setCheck(els.waterPark,'Wasserpark/Rutschen')],
    [/\b(kinderclub|miniclub|kids club)\b/g,()=>setCheck(els.kidsClub,'Kinderclub')],
    [/\b(jugendclub|teen club|youth club)\b/g,()=>setCheck(els.teenClub,'Jugendclub')],
    [/\b(brötchenservice|brotchenservice|bread service)\b/g,()=>setCheck(els.breadService,'Brötchenservice')],
    [/\b(direkter strandzugang|strandzugang|direct beach access)\b/g,()=>setCheck(els.directBeach,'Strandzugang')],
    [/\b(privatstrand|private beach)\b/g,()=>setCheck(els.privateBeach,'Privatstrand')],
    [/\b(seezugang|direkt am see|lake access)\b/g,()=>setCheck(els.lakeAccess,'Seezugang')],
    [/\b(fahrradverleih|bike rental)\b/g,()=>setCheck(els.bikeRental,'Fahrradverleih')],
    [/\b(e-?bike laden|e-?bike ladestation|ebike charging)\b/g,()=>setCheck(els.ebikeCharge,'E-Bike-Laden')],
    [/\b(e-auto lader|e-ladestation|ev charging)\b/g,()=>setCheck(els.evCharge,'E-Auto-Lader')],
    [/\b(ganzjahrig|ganzjaehrig|year round|all year)\b/g,()=>setCheck(els.yearRound,'Ganzjährig')],
    [/\b(barrierefreies sanitar|barrierefreies bad|accessible sanitary)\b/g,()=>setCheck(els.accessibleSanitary,'Barrierefreies Sanitär')],
    [/\b(ohne hund|hunde verboten|no dogs)\b/g,()=>setValue(els.dog,'no','Ohne Hund')],
    [/\b(mit hund|hund erlaubt|hundefreundlich|dog friendly)\b/g,()=>setValue(els.dog,'yes','Hund erlaubt')],
    [/\b(nur erwachsene|adults only|adult only|18\+)\b/g,()=>setCheck(els.adult,'Nur Erwachsene')],
    [/\b(fkk|nudismus|naturist)\b/g,()=>setCheck(els.fkk,'FKK')],
    [/\b(familienfreundlich|familie|family friendly)\b/g,()=>setCheck(els.family,'Familie')],
    [/\b(baby|babys)\b/g,()=>setCheck(els.baby,'Baby 0–2')],
    [/\b(kleinkind|kleinkinder|toddler)\b/g,()=>setCheck(els.toddler,'Kleinkinder 3–5')],
    [/\b(jugendliche|teenager|teens)\b/g,()=>setCheck(els.teen,'Jugendliche 13–17')],
    [/\b(kinder|children|kids)\b/g,()=>setCheck(els.children,'Kinder 6–12')],
    [/\b(am meer|an der kuste|kuste|meer|coast|seaside)\b/g,()=>setValue(els.location,'sea','Am Meer')],
    [/\b(inland)\b/g,()=>setValue(els.location,'inland','Inland')],
    [/\b(kostenlos|gratis|free)\b/g,()=>setValue(els.fee,'free','Kostenlos')],
    [/\b(kostenpflichtig|paid)\b/g,()=>setValue(els.fee,'paid','Kostenpflichtig')],
    [/\b(ruhig|kleiner platz|quiet)\b/g,()=>setValue(els.style,'quiet','Ruhig')],
    [/\b(luxus|luxury|komfort)\b/g,()=>setValue(els.style,'luxury','Komfort/Luxus')],
    [/\b(glamping)\b/g,()=>setValue(els.style,'glamping','Glamping')],
    [/\b(wohnmobilstellplatz|wohnmobilplatz|stellplatz)\b/g,()=>setValue(els.type,'caravan_site','Wohnmobilstellplatz')],
    [/\b(campingplatz|camping)\b/g,()=>setValue(els.type,'camp_site','Campingplatz')],
    [/\b(wohnmobil|camper|motorhome|van)\b/g,()=>setCheck(els.motorhome,'Wohnmobil/Van')],
    [/\b(wohnwagen|caravan)\b/g,()=>setCheck(els.caravan,'Wohnwagen')],
    [/\b(zelt|zelten|tent)\b/g,()=>setCheck(els.tents,'Zelt')],
    [/\b(sauna)\b/g,()=>setCheck(els.sauna,'Sauna')],
    [/\b(pool|schwimmbad)\b/g,()=>setCheck(els.pool,'Pool')],
    [/\b(spielplatz)\b/g,()=>setCheck(els.playground,'Spielplatz')],
    [/\b(restaurant)\b/g,()=>setCheck(els.restaurant,'Restaurant')],
    [/\b(supermarkt|shop)\b/g,()=>setCheck(els.supermarket,'Shop')],
    [/\b(animation|unterhaltung)\b/g,()=>setCheck(els.animation,'Animation')],
    [/\b(angeln|fishing)\b/g,()=>setCheck(els.fishing,'Angeln')],
    [/\b(gasflaschen|gastausch)\b/g,()=>setCheck(els.gasExchange,'Gasflaschen')],
    [/\b(waschmaschine)\b/g,()=>setCheck(els.washingMachine,'Waschmaschine')],
    [/\b(trockner)\b/g,()=>setCheck(els.dryer,'Trockner')],
    [/\b(strom|electricity)\b/g,()=>setCheck(els.electric,'Strom')],
    [/\b(trinkwasser|frischwasser)\b/g,()=>setCheck(els.water,'Trinkwasser')],
    [/\b(dusche|duschen|shower)\b/g,()=>setCheck(els.shower,'Dusche')],
    [/\b(toilette|toiletten|wc)\b/g,()=>setCheck(els.toilet,'Toiletten')],
    [/\b(entsorgung|dump station|chemie-wc)\b/g,()=>setCheck(els.dump,'Entsorgung')],
    [/\b(wlan|wifi)\b/g,()=>setCheck(els.wifi,'WLAN')]
  ];
  rules.forEach(([re,fn])=>{ if(re.test(work)){ fn(); work=work.replace(re,' '); } });
  const starRe=/(?:mindestens\s*)?([1-5])\s*(?:sterne|stern)/g;
  const starMatch = normalizeSearchText(raw).match(/(?:mindestens\s*)?([1-5])\s*(?:sterne|stern)/); if(starMatch){setValue(els.stars,starMatch[1],`${starMatch[1]}+ Sterne`);work=work.replace(starRe,' ');}
  const priceRe=/bis\s*(20|40|60)\s*(?:€|euro)?/g;
  const priceMatch = normalizeSearchText(raw).match(/bis\s*(20|40|60)\s*(?:€|euro)?/); if(priceMatch){setValue(els.price,priceMatch[1],`bis ${priceMatch[1]} €/Nacht`);work=work.replace(priceRe,' ');}

  const countryAliases = Object.fromEntries(countries.map(([code,name]) => [code,[normalizeSearchText(name)]]));
  const extraCountryAliases = {
    DE:['germany'],AT:['austria'],CH:['switzerland'],IT:['italy','italia'],FR:['france'],ES:['spain','espana'],NL:['holland','netherlands'],BE:['belgium'],DK:['denmark'],HR:['croatia'],SI:['slovenia'],PL:['poland'],CZ:['czechia','czech republic'],GR:['greece'],SE:['sweden'],NO:['norway'],FI:['finland'],IE:['ireland'],GB:['great britain','united kingdom','england','uk'],HU:['hungary'],
    AL:['albania'],AM:['armenia'],AZ:['azerbaijan'],BY:['belarus'],BA:['bosnia','bosnia and herzegovina'],BG:['bulgaria'],CY:['cyprus'],EE:['estonia'],GE:['georgia'],IS:['iceland'],LV:['latvia'],LT:['lithuania'],ME:['montenegro'],MK:['north macedonia'],RO:['romania'],RS:['serbia'],SK:['slovakia'],TR:['turkey','turkiye'],UA:['ukraine'],RU:['russia'],VA:['vatican city']
  };
  for (const [code, aliases] of Object.entries(extraCountryAliases)) countryAliases[code] = [...new Set([...(countryAliases[code]||[]), ...aliases.map(normalizeSearchText)])];
  let countryFound='';
  outer: for (const [code,aliases] of Object.entries(countryAliases)) for (const alias of aliases) { const re=new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\b`,'g'); if(re.test(work)){ countryFound=code; work=work.replace(re,' '); break outer; } }
  if (countryFound && els.country) { els.country.value=countryFound; const name=els.country.selectedOptions[0]?.textContent||countryFound; found.unshift(name); }

  const normalizedRaw = normalizeSearchText(raw);
  const locationWords = work
    .replace(/\b(mit|ohne|und|oder|fur|fuer|am|an|der|die|das|dem|den|einem|einer|einen|soll|sein|suche|finde|platz|platze|plaetze|campingplatz|campingplatze|campingplaetze)\b/g,' ')
    .replace(/[,.!?:;]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  let placeText = '';
  let ignoredWords = '';
  const candidatePlace = locationWords.replace(/\b(in|bei|nahe|um|rund)\b/g,' ').replace(/\s+/g,' ').trim();
  if (!countryFound) {
    // Ohne erkanntes Land ist der Rest sehr wahrscheinlich ein Ort/Region/Platzname.
    placeText = candidatePlace;
  } else if (candidatePlace.length >= 2) {
    // Mit erkanntem Land übernehmen wir Restwörter nur dann als Ort, wenn der Nutzer
    // das ausdrücklich mit "in / bei / nahe / um" formuliert hat. Wünsche dürfen
    // niemals versehentlich im Ortsfeld landen.
    const escaped = candidatePlace.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    const explicitLocation = new RegExp(`\\b(?:in|bei|nahe|um|rund\\s+um)\\s+(?:dem|der|den|einem|einer)?\\s*${escaped}\\b`, 'i').test(normalizedRaw);
    if (explicitLocation) placeText = candidatePlace;
    else ignoredWords = candidatePlace;
  }

  if (els.place) els.place.value = placeText.length >= 2 ? placeText : '';
  if (placeText.length >= 2) found.unshift(`Ort/Region: ${placeText}`);
  syncQuickControls();
  applyFilters(false);
  if (els.smartSearchFeedback) {
    els.smartSearchFeedback.innerHTML = found.length ? `<strong>Erkannt:</strong> ${escapeHtml([...new Set(found)].join(' · '))}` : 'Keine eindeutigen Filter erkannt. Du kannst die normale Orts- und Filtersuche weiter verwenden.';
    if (ignoredWords) els.smartSearchFeedback.innerHTML += ` <span>· Nicht als Ort verwendet: ${escapeHtml(ignoredWords)}</span>`;
  }
  if (countryFound && !placeText && els.location?.value === 'sea' && els.smartSearchFeedback) {
    els.smartSearchFeedback.innerHTML += ' <span>Starte geografische Küstensuche …</span>';
  }
  if (placeText.length>=2 || countryFound) searchCountry();
  else if (!state.allPlaces.length && els.smartSearchFeedback) els.smartSearchFeedback.innerHTML += ' <span>Bitte zusätzlich Ort oder Land angeben.</span>';
}

function applyFilters(fitMap = false) {
  const q = els.place.value.trim().toLowerCase();
  let places = state.allPlaces.filter(place => {
    if (state.routeAutoStopKeys?.has(place.key)) return true;
    if (els.type?.value && els.type.value !== 'all' && place.tourism !== els.type.value) return false;
    if (q && state.currentSearchLabel !== q) {
      const hay = [place.name, place.address, place.tags.operator, place.tags.description, place.tags['addr:city'], place.tags['addr:place']].filter(Boolean).join(' ').toLowerCase();
      // When place was geocoded, don't re-filter by string; when country-wide loaded, do.
      if (state.currentSearchLabel === els.country.selectedOptions[0]?.textContent && !hay.includes(q)) return false;
    }
    if (els.type?.value && els.type.value !== 'all' && place.tourism !== els.type.value) return false;
    if (els.adult.checked && !place.adultOnly) return false;
    if (els.fkk.checked && !place.nudist) return false;
    if (els.family.checked && !place.family) return false;
    if (els.baby?.checked && !place.ageGroups?.baby) return false;
    if (els.toddler?.checked && !place.ageGroups?.toddler) return false;
    if (els.children?.checked && !place.ageGroups?.children) return false;
    if (els.teen?.checked && !place.ageGroups?.teen) return false;
    if (els.website.checked && !place.website) return false;
    if (els.dog.value === 'yes' && place.dog !== 'yes') return false;
    if (els.dog.value === 'no' && place.dog !== 'no') return false;
    if (els.fee.value === 'free' && place.fee !== 'free') return false;
    if (els.fee.value === 'paid' && place.fee !== 'paid') return false;
    if (Number(els.stars.value) > 0 && place.stars < Number(els.stars.value)) return false;
    if (els.location.value === 'sea' && !place.sea) return false;
    if (els.location.value === 'inland' && place.sea) return false;
    if (els.style?.value && els.style.value !== 'all' && !place.styles?.[els.style.value]) return false;
    if (els.price?.value && els.price.value !== 'all') {
      const maxPrice = Number(els.price.value);
      if (place.priceNight == null || place.priceNight > maxPrice) return false;
    }
    if (!matchesAmenities(place)) return false;
    if (state.favoritesOnly && !state.favorites.has(place.key)) return false;
    return true;
  });

  if (els.sort.value === 'stars') places.sort((a,b) => (b.stars - a.stars) || a.name.localeCompare(b.name, state.language));
  else if (els.sort.value === 'type') places.sort((a,b) => a.typeLabel.localeCompare(b.typeLabel, state.language) || a.name.localeCompare(b.name, state.language));
  else if (els.sort.value === 'distance') places.sort((a,b) => ((a.routeStopIndex ?? Infinity) - (b.routeStopIndex ?? Infinity)) || ((a.distanceKm ?? a.routeDistanceKm ?? Infinity) - (b.distanceKm ?? b.routeDistanceKm ?? Infinity)) || a.name.localeCompare(b.name, state.language));
  else places.sort((a,b) => a.name.localeCompare(b.name, state.language));

  state.filteredPlaces = places;
  syncQuickControls();
  renderResults();
  renderMarkers();
  updateStats();
  if (fitMap || !state.selectedPlaceKey) fitResults({ clearSelection: !state.selectedPlaceKey });
}

function badge(text, cls='') { return `<span class="badge ${cls}">${escapeHtml(text)}</span>`; }
function weatherIcon(code) {
  if (code === 0) return '☀️';
  if ([1,2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([45,48].includes(code)) return '🌫️';
  if ([51,53,55,56,57].includes(code)) return '🌦️';
  if ([61,63,65,66,67,80,81,82].includes(code)) return '🌧️';
  if ([71,73,75,77,85,86].includes(code)) return '🌨️';
  if ([95,96,99].includes(code)) return '⛈️';
  return '🌡️';
}
function weatherText(code) {
  const map = {0:'Klar',1:'Überwiegend klar',2:'Teilweise bewölkt',3:'Bewölkt',45:'Nebel',48:'Reifnebel',51:'Leichter Niesel',53:'Niesel',55:'Starker Niesel',61:'Leichter Regen',63:'Regen',65:'Starker Regen',71:'Leichter Schnee',73:'Schnee',75:'Starker Schnee',80:'Regenschauer',81:'Schauer',82:'Starke Schauer',95:'Gewitter',96:'Gewitter/Hagel',99:'Starkes Gewitter/Hagel'};
  return map[code] || 'Wetter';
}
function weatherPillInner(w) {
  return `<div class="weather-main">${weatherIcon(w.code)} ${Math.round(w.temp)} °C</div><div class="weather-meta">${escapeHtml(weatherText(w.code))}<br>Wind ${Math.round(w.wind)} km/h${Number.isFinite(w.precip) ? ` · Regen ${w.precip.toFixed(1)} mm` : ''}</div>`;
}
function cardWeather(place) {
  const w = state.weather.get(place.key);
  return `<div class="weather-pill" data-weather-key="${escapeHtml(place.key)}">${w ? weatherPillInner(w) : '<span>🌡️ Wetter wird geladen, sobald der Platz sichtbar ist …</span>'}</div>`;
}
function updateWeatherNode(key) {
  const w = state.weather.get(key);
  if (!w) return;
  document.querySelectorAll('[data-weather-key]').forEach(node => {
    if (node.dataset.weatherKey === key) node.innerHTML = weatherPillInner(w);
  });
}
let weatherObserver = null;
function observeWeatherCards() {
  weatherObserver?.disconnect();
  weatherObserver = new IntersectionObserver(entries => {
    const batch = [];
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      weatherObserver.unobserve(entry.target);
      const key = entry.target.dataset.key;
      const place = state.filteredPlaces.find(p => p.key === key);
      if (place && !state.weather.has(key)) batch.push(place);
    }
    if (batch.length) fetchWeatherForCards(batch);
  }, { root: els.results, rootMargin: '350px 0px' });
  els.results.querySelectorAll('.result-item').forEach(card => weatherObserver.observe(card));
}
function renderResults() {
  if (!state.filteredPlaces.length) {
    els.results.innerHTML = '';
    els.results.appendChild($('emptyTemplate').content.cloneNode(true));
    els.status.textContent = state.allPlaces.length ? 'Kein Platz passt zu den aktiven Filtern.' : 'Keine Plätze gefunden.';
    updateCompareBar();
    return;
  }
  els.status.textContent = `${state.filteredPlaces.length.toLocaleString('de-DE')} Treffer${state.currentSearchLabel ? ` · ${state.currentSearchLabel}` : ''}`;
  els.results.innerHTML = state.filteredPlaces.map(place => {
    const b = [];
    if (place.stars) b.push(badge(`${place.stars} ★`));
    if (place.adultOnly) b.push(badge('18+'));
    if (place.nudist) b.push(badge('FKK'));
    if (place.dog === 'yes') b.push(badge('Hund erlaubt', 'neutral'));
    if (place.dog === 'no') b.push(badge('Ohne Hund', 'neutral'));
    if (place.family) b.push(badge('Familie', 'neutral'));
    ageGroupLabels(place).forEach(label => b.push(badge(label, 'neutral')));
    if (place.fee === 'free') b.push(badge('Kostenlos', 'neutral'));
    if (place.sea) b.push(badge('Küstennähe*', 'neutral'));
    if (place.styles?.glamping) b.push(badge('Glamping', 'neutral'));
    if (place.amenities.privateBathroom === 'yes') b.push(badge('Privatbad', 'neutral'));
    if (place.amenities.sauna === 'yes') b.push(badge('Sauna', 'neutral'));
    if (place.amenities.rentalCaravan === 'yes') b.push(badge('Mietwohnwagen', 'neutral'));
    if (place.amenities.rentalTent === 'yes') b.push(badge('Mietzelt', 'neutral'));
    if (place.amenities.bungalow === 'yes') b.push(badge('Bungalow/Hütte', 'neutral'));
    if (state.personal[place.key]?.visited) b.push(badge('✓ Besucht', 'neutral'));
    if (place.routeStopIndex) {
      b.unshift(badge(`Übernachtung ${place.routeStopIndex}`, 'route-badge'));
      const elig=vehicleEligibility(place,routeVehicleValue());
      if (elig.allowed) b.unshift(badge(elig.confirmed ? `✓ ${routeVehicleLabel()} bestätigt` : `${routeVehicleLabel()} · Regeln prüfen`, elig.confirmed ? 'route-badge' : 'neutral'));
    }
    if (place.routeAutoSelected) b.unshift(badge('✓ Auto-Stopp', 'route-badge'));
    const fav = state.favorites.has(place.key);
    const dist = place.distanceKm ?? place.routeDistanceKm;
    const selected = state.compare.has(place.key);
    const quality = placeDataQuality(place);
    const facts = [
      place.amenities.electricity === 'yes' ? '⚡ Strom' : '',
      place.amenities.drinkingWater === 'yes' ? '◉ Wasser' : '',
      place.amenities.shower === 'yes' ? '◌ Dusche' : '',
      place.amenities.wifi === 'yes' ? '⌁ WLAN' : ''
    ].filter(Boolean).slice(0,3);
    return `<article class="result-item ${state.selectedPlaceKey === place.key ? 'selected' : ''}" data-key="${escapeHtml(place.key)}" tabindex="0" role="button" aria-pressed="${state.selectedPlaceKey === place.key ? 'true' : 'false'}" aria-label="${escapeHtml(place.name)} auf der Karte anzeigen">
      <div class="result-card-shell">
        <div class="result-visual ${place.tourism === 'caravan_site' ? 'caravan' : ''}">${siteIconSvg(place.tourism)}</div>
        <div class="result-content">
          <div class="result-eyebrow"><span class="result-kind">${escapeHtml(place.typeLabel)}</span><span class="result-source">OpenStreetMap</span></div>
          <div class="result-top">
            <div><h3 class="result-title">${escapeHtml(place.name)}</h3><p class="result-sub">${escapeHtml(place.address || place.tags.operator || 'Adresse nicht eingetragen')}</p></div>
            <button class="favorite-btn ${fav ? 'active' : ''}" data-action="favorite" data-key="${escapeHtml(place.key)}" title="Favorit" aria-label="Favorit umschalten">${fav ? '★' : '☆'}</button>
          </div>
          ${b.length ? `<div class="badges">${b.join('')}</div>` : ''}
          <div class="result-facts">
            ${dist != null ? `<span>⌖ ${dist < 10 ? dist.toFixed(1) : Math.round(dist)} km${place.routeStopIndex ? ` von Stopp ${place.routeStopIndex}` : (place.routeDistanceKm != null ? ' von Route*' : '')}</span>` : ''}
            ${place.priceNight != null ? `<span>€ ca. ${place.priceNight.toFixed(2).replace('.', ',')} / Nacht*</span>` : ''}
            ${facts.map(x => `<span>${x}</span>`).join('')}
          </div>
          ${placeMatchHtml(place)}
          ${cardWeather(place)}
          <div class="result-trust"><span class="trust-pill quality-${quality.level}">${quality.label} · ${quality.percent}% Datenfelder</span><span class="trust-pill ${place.website ? 'good' : ''}">${place.website ? '✓ Betreiber-Webseite hinterlegt' : 'Webseite nicht hinterlegt'}</span>${place.osmUpdated ? `<span class="trust-pill">OSM-Datenstand vorhanden</span>` : ''}</div>
          <div class="result-actions">
            <button class="mini-btn" data-action="details" data-key="${escapeHtml(place.key)}">Details</button>
            ${place.website ? `<a class="mini-btn" href="${escapeHtml(place.website)}" target="_blank" rel="noopener noreferrer">Original-Webseite ↗</a>` : ''}
            <button class="mini-btn secondary" data-action="map" data-key="${escapeHtml(place.key)}">Karte</button>
            <button class="mini-btn secondary ${state.trip.stages.some(s => s.key === place.key) ? 'active' : ''}" data-action="trip" data-key="${escapeHtml(place.key)}">${state.trip.stages.some(s => s.key === place.key) ? '✓ In Reise' : '+ Reise'}</button>
            <button class="compare-toggle ${selected ? 'active' : ''}" data-action="compare" data-key="${escapeHtml(place.key)}">${selected ? '✓ Im Vergleich' : '+ Vergleichen'}</button>
          </div>
        </div>
      </div>
    </article>`;
  }).join('');
  observeWeatherCards();
  updateCompareBar();
}

function placeMarker(place) {
  const marker = L.marker([place.lat, place.lon], {
    icon: L.divIcon({
      className: 'camp-map-marker-wrap',
      html: `<div class="camp-map-marker ${place.tourism === 'caravan_site' ? 'caravan' : ''} ${state.selectedPlaceKey === place.key ? 'selected' : ''}"><span>${siteIconSvg(place.tourism)}</span></div>`,
      iconSize: [38,42], iconAnchor: [19,38], popupAnchor: [0,-35]
    }),
    title: place.name
  });
  marker.bindPopup(`<div class="map-popup"><h3>${escapeHtml(place.name)}</h3><p>${escapeHtml(place.typeLabel)}${place.stars ? ` · ${place.stars} ★` : ''}</p><button class="mini-btn" onclick="window.Campingfinder.openDetails('${place.key.replace(/'/g, "\\'")}')">Details</button></div>`);
  marker.on('click', () => selectPlaceOnMap(place.key, { openPopup:false, scrollList:true }));
  marker.addTo(markerLayer);
  state.markers.set(place.key, marker);
}

function renderMarkers() {
  markerLayer.clearLayers();
  state.markers.clear();
  const places = state.filteredPlaces.slice(0, 3000);
  if (!places.length) return;
  const zoom = map.getZoom();
  if (zoom >= 11 || places.length <= 70) {
    places.slice(0, 1600).forEach(placeMarker);
    return;
  }
  const bucketSize = zoom <= 5 ? 92 : zoom <= 7 ? 76 : zoom <= 9 ? 62 : 52;
  const buckets = new Map();
  places.forEach(place => {
    const pt = map.project([place.lat, place.lon], zoom);
    const key = `${Math.floor(pt.x / bucketSize)}:${Math.floor(pt.y / bucketSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(place);
  });
  buckets.forEach(group => {
    if (group.length === 1) { placeMarker(group[0]); return; }
    const lat = group.reduce((sum,p)=>sum+p.lat,0)/group.length;
    const lon = group.reduce((sum,p)=>sum+p.lon,0)/group.length;
    const size = group.length >= 100 ? 50 : group.length >= 20 ? 46 : 42;
    const marker = L.marker([lat,lon], {
      icon: L.divIcon({
        className:'camp-cluster-wrap',
        html:`<div class="camp-cluster"><strong>${group.length}</strong><small>Plätze</small></div>`,
        iconSize:[size,size], iconAnchor:[size/2,size/2]
      }),
      title:`${group.length} Plätze`
    }).addTo(markerLayer);
    marker.on('click',()=>map.setView([lat,lon], Math.min(zoom+2,12), {animate:true}));
  });
}

function setSelectedResultCard(key, scrollList=false) {
  els.results?.querySelectorAll('.result-item').forEach(card => {
    const selected = !!key && card.dataset.key === key;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
  if (scrollList && key) {
    const card = [...(els.results?.querySelectorAll('.result-item') || [])].find(node => node.dataset.key === key);
    card?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
}

function switchMobileToMapIfNeeded() {
  if (!window.matchMedia?.('(max-width: 780px)').matches) return;
  const area = $('mapArea'); if (!area) return;
  area.dataset.mobileView = 'map';
  area.querySelectorAll('.mobile-view-toggle button').forEach(btn => btn.classList.toggle('active', btn.dataset.mobileView === 'map'));
  setTimeout(() => map.invalidateSize(), 80);
}

function selectPlaceOnMap(key, { openPopup=true, scrollList=false } = {}) {
  const place=getPlaceByKey(key); if(!place)return;
  state.selectedPlaceKey = key;
  setSelectedResultCard(key, scrollList);
  switchMobileToMapIfNeeded();
  map.setView([place.lat,place.lon],15,{animate:true});
  setTimeout(()=>{
    renderMarkers();
    setSelectedResultCard(key, scrollList);
    if (openPopup) state.markers.get(key)?.openPopup();
  },180);
}

function openPlaceOnMap(key) {
  selectPlaceOnMap(key, { openPopup:true, scrollList:false });
}

function fitResults({ clearSelection=true } = {}) {
  const places = state.filteredPlaces;
  if (!places.length) return;
  if (clearSelection) {
    state.selectedPlaceKey = null;
    setSelectedResultCard(null);
  }
  if (places.length === 1) map.setView([places[0].lat, places[0].lon], 14);
  else {
    const bounds = L.latLngBounds(places.slice(0, 1200).map(p => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [30,30], maxZoom: 13 });
  }
  setTimeout(renderMarkers, 120);
}

function updateStats() {
  els.count.textContent = state.filteredPlaces.length.toLocaleString('de-DE');
  els.websiteCount.textContent = state.filteredPlaces.filter(p => p.website).length.toLocaleString('de-DE');
  els.weatherCount.textContent = state.filteredPlaces.filter(p => state.weather.has(p.key)).length.toLocaleString('de-DE');
  els.favoriteCount.textContent = state.favorites.size.toLocaleString('de-DE');
  renderTravelStats();
}

async function fetchWeatherForCards(places) {
  const missing = places.filter(p => !state.weather.has(p.key));
  const chunks = [];
  for (let i=0; i<missing.length; i+=25) chunks.push(missing.slice(i,i+25));
  for (const chunk of chunks) {
    try {
      const url = new URL(WEATHER_ENDPOINT);
      url.searchParams.set('latitude', chunk.map(p => p.lat.toFixed(5)).join(','));
      url.searchParams.set('longitude', chunk.map(p => p.lon.toFixed(5)).join(','));
      url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,precipitation');
      url.searchParams.set('timezone', 'auto');
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [data];
      rows.forEach((row, idx) => {
        const p = chunk[idx];
        if (!p || !row?.current) return;
        state.weather.set(p.key, {
          temp: Number(row.current.temperature_2m),
          code: Number(row.current.weather_code),
          wind: Number(row.current.wind_speed_10m),
          precip: Number(row.current.precipitation)
        });
      });
      chunk.forEach(p => updateWeatherNode(p.key));
      updateStats();
    } catch { /* weather is optional */ }
  }
}

function getPlaceByKey(key) {
  return state.allPlaces.find(p => p.key === key) || state.filteredPlaces.find(p => p.key === key) || state.favoriteSnapshots[key] || state.personal[key]?.snapshot || state.compareSnapshots[key] || state.trip.stages.find(p => p.key === key) || null;
}
function persistFavorites() {
  localStorage.setItem('campingfinder:favorites', JSON.stringify([...state.favorites]));
  localStorage.setItem('campingfinder:favoriteSnapshots', JSON.stringify(state.favoriteSnapshots));
  localStorage.setItem('campingfinder:favoriteLists', JSON.stringify(state.favoriteLists));
}
function snapshotPlace(place) {
  if (!place) return null;
  return JSON.parse(JSON.stringify(place));
}
function addToFavoriteList(key, listName='Merkliste') {
  const place = getPlaceByKey(key);
  if (!place) return;
  if (!state.favoriteLists[listName]) state.favoriteLists[listName] = [];
  if (!state.favoriteLists[listName].includes(key)) state.favoriteLists[listName].push(key);
  state.favorites.add(key);
  state.favoriteSnapshots[key] = snapshotPlace(place);
  persistFavorites();
  renderMyPlaces();
  renderResults(); updateStats();
}
function removeFavoriteEverywhere(key) {
  state.favorites.delete(key);
  Object.values(state.favoriteLists).forEach(list => { const i=list.indexOf(key); if (i>=0) list.splice(i,1); });
  if (!state.personal[key]?.visited) delete state.favoriteSnapshots[key];
  persistFavorites();
}
function toggleFavorite(key) {
  if (state.favorites.has(key)) removeFavoriteEverywhere(key); else addToFavoriteList(key, 'Merkliste');
  if (state.favoritesOnly) applyFilters(false); else { renderResults(); updateStats(); renderMyPlaces(); }
}
async function sharePlace(key) {
  const place = getPlaceByKey(key); if (!place) return;
  const url = place.website || `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=16/${place.lat}/${place.lon}`;
  const data = { title: place.name, text: `${place.name} · ${place.typeLabel}`, url };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(`${data.text} ${url}`); alert('Link wurde kopiert.'); }
  } catch { /* sharing cancelled */ }
}
function persistPersonal() { localStorage.setItem('campingfinder:personal', JSON.stringify(state.personal)); }
function renderMyPlaces() {
  if (!els.favoriteLists || !els.visitedPlaces) return;
  const blocks = Object.entries(state.favoriteLists).map(([name, keys]) => {
    const items = keys.map(key => state.favoriteSnapshots[key] || state.personal[key]?.snapshot).filter(Boolean);
    const body = items.length ? items.map(p => `<div class="saved-item"><div class="saved-item-head"><div><strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.typeLabel || '')}${p.address ? ` · ${escapeHtml(p.address)}` : ''}</small></div><span>${p.stars ? `${p.stars} ★` : ''}</span></div><div class="saved-actions"><button class="mini-btn" data-saved-action="details" data-key="${escapeHtml(p.key)}">Details</button><button class="mini-btn secondary" data-saved-action="share" data-key="${escapeHtml(p.key)}">Teilen</button><button class="mini-btn secondary" data-saved-action="trip" data-key="${escapeHtml(p.key)}">+ Reise</button><button class="mini-btn secondary" data-saved-action="remove" data-list="${escapeHtml(name)}" data-key="${escapeHtml(p.key)}">Entfernen</button></div></div>`).join('') : '<p class="filter-note">Noch keine Plätze in dieser Liste.</p>';
    const del = name !== 'Merkliste' ? `<button class="mini-btn secondary" data-saved-action="delete-list" data-list="${escapeHtml(name)}">Liste löschen</button>` : '';
    return `<div class="favorite-list-block"><div class="favorite-list-title"><strong>${escapeHtml(name)} (${items.length})</strong>${del}</div>${body}</div>`;
  }).join('');
  els.favoriteLists.innerHTML = blocks || '<p class="filter-note">Noch keine Favoritenlisten.</p>';

  const visited = Object.entries(state.personal).filter(([,meta]) => meta?.visited).map(([key,meta]) => meta.snapshot || state.favoriteSnapshots[key]).filter(Boolean);
  els.visitedPlaces.innerHTML = visited.length ? visited.map(p => { const meta=state.personal[p.key]||{}; return `<div class="saved-item"><div class="saved-item-head"><div><strong>${escapeHtml(p.name)}</strong><br><small>${meta.rating ? `${meta.rating}/5 ★ · ` : ''}${escapeHtml(meta.note || 'Keine Notiz')}</small></div></div><div class="saved-actions"><button class="mini-btn" data-saved-action="details" data-key="${escapeHtml(p.key)}">Details</button><button class="mini-btn secondary" data-saved-action="trip" data-key="${escapeHtml(p.key)}">+ Reise</button></div></div>`; }).join('') : '<p class="filter-note">Noch keine besuchten Plätze markiert.</p>';
}

function infoRow(label, value, allowHtml=false) {
  if (value == null || value === '') return '';
  return `<div class="detail-row"><small>${escapeHtml(label)}</small><strong>${allowHtml ? value : escapeHtml(value)}</strong></div>`;
}
function friendlyValue(v) {
  if (v === 'yes') return 'Ja';
  if (v === 'no') return 'Nein';
  return 'Nicht angegeben';
}
function amenityBox(label, stateValue) {
  return `<div class="amenity ${stateValue}"><strong>${escapeHtml(label)}</strong><br>${friendlyValue(stateValue)}</div>`;
}

function familyFitState(value) {
  if (value === true || value === 'yes') return 'yes';
  if (value === false || value === 'no') return 'no';
  return 'unknown';
}
function familyAssistantItems(place) {
  const p = state.familyProfile || { adults:2, childAges:[], dog:'no', vehicle:'all' };
  const ages = Array.isArray(p.childAges) ? p.childAges : [];
  const items = [];
  if (ages.length) {
    items.push({ label:'Familienfreundlichkeit', state: place.adultOnly ? 'no' : (place.family ? 'yes' : 'unknown') });
    if (ages.some(a => a <= 2)) items.push({ label:'Baby 0–2', state: familyFitState(place.ageGroups?.baby) });
    if (ages.some(a => a >= 3 && a <= 5)) items.push({ label:'Kleinkinder 3–5', state: familyFitState(place.ageGroups?.toddler) });
    if (ages.some(a => a >= 6 && a <= 12)) items.push({ label:'Kinder 6–12', state: familyFitState(place.ageGroups?.children) });
    if (ages.some(a => a >= 13 && a <= 17)) items.push({ label:'Jugendliche 13–17', state: familyFitState(place.ageGroups?.teen) });
    if (ages.some(a => a <= 2)) items.push({ label:'Babybad / Babyraum', state: familyFitState(place.amenities?.babyBath) });
    if (ages.some(a => a <= 12)) items.push({ label:'Kinderbad', state: familyFitState(place.amenities?.kidsBath) });
    if (ages.some(a => a <= 12)) items.push({ label:'Spielplatz', state: familyFitState(place.amenities?.playground) });
    if (ages.some(a => a <= 12)) items.push({ label:'Kinderpool', state: familyFitState(place.amenities?.paddlingPool) });
    if (ages.some(a => a <= 12)) items.push({ label:'Kinderclub', state: familyFitState(place.amenities?.kidsClub) });
    if (ages.some(a => a >= 13 && a <= 17)) items.push({ label:'Jugendclub', state: familyFitState(place.amenities?.teenClub) });
  }
  if (p.dog === 'yes') items.push({ label:'Hund erlaubt', state: place.dog === 'yes' ? 'yes' : place.dog === 'no' ? 'no' : 'unknown' });
  if (p.vehicle === 'motorhome' || p.vehicle === 'van') items.push({ label:p.vehicle === 'van' ? 'Van / Campervan' : 'Wohnmobil', state: familyFitState(place.amenities?.motorhome) });
  if (p.vehicle === 'caravan') { const e=vehicleEligibility(place,'caravan'); items.push({ label:'Wohnwagen', state:e.allowed ? (e.confirmed?'yes':'unknown') : 'no' }); }
  if (p.vehicle === 'car') items.push({ label:'Auto-Übernachtung', state:'unknown' });
  if (p.vehicle === 'tent') items.push({ label:'Zelt', state: familyFitState(place.amenities?.tents) });
  return items;
}
function familyAssistantHtml(place) {
  const items = familyAssistantItems(place);
  if (!items.length) return '<p class="filter-note">Im Familienprofil sind noch keine Kinder, kein Hund und keine Camping-Art hinterlegt. Du kannst das Profil unter „Meine Plätze“ speichern.</p>';
  const symbol = s => s === 'yes' ? '✓' : s === 'no' ? '✕' : '?';
  const label = s => s === 'yes' ? 'vorhanden / passend' : s === 'no' ? 'nicht passend' : 'keine gesicherte Angabe';
  return `<div class="family-assistant-grid">${items.map(item=>`<div class="family-fit ${item.state}"><span class="family-fit-icon">${symbol(item.state)}</span><span><strong>${escapeHtml(item.label)}</strong><small>${label(item.state)}</small></span></div>`).join('')}</div><p class="filter-note">Der Familien-Assistent vergibt keine Bewertung. Er zeigt nur, was in den vorhandenen Platzdaten bestätigt, ausgeschlossen oder unbekannt ist.</p>`;
}

async function fetchDetailWeather(place) {
  try {
    const url = new URL(WEATHER_ENDPOINT);
    url.searchParams.set('latitude', place.lat);
    url.searchParams.set('longitude', place.lon);
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,wind_speed_10m_max');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('timezone', 'auto');
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const current = d.current;
    const daily = d.daily;
    if (current) {
      state.weather.set(place.key, { temp:+current.temperature_2m, code:+current.weather_code, wind:+current.wind_speed_10m, precip:+current.precipitation });
    }
    return { current, daily };
  } catch { return null; }
}

async function fetchNearby(place) {
  const query = `[out:json][timeout:25];
(
 nwr(around:5000,${place.lat},${place.lon})["amenity"~"^(toilets|drinking_water|shower|restaurant|fast_food|cafe|fuel|charging_station|waste_disposal|laundry|pharmacy|hospital|clinic|bicycle_rental)$"];
 nwr(around:5000,${place.lat},${place.lon})["shop"~"^(supermarket|convenience|bakery|bicycle)$"];
 nwr(around:5000,${place.lat},${place.lon})["leisure"~"^(playground|water_park|dog_park)$"];
 nwr(around:5000,${place.lat},${place.lon})["natural"~"^(beach|water)$"];
 nwr(around:5000,${place.lat},${place.lon})["tourism"="information"];
);
out center tags;`;
  try {
    const data = await overpass(query);
    return (data.elements || []).map(el => {
      const t = el.tags || {};
      const lat = Number(el.lat ?? el.center?.lat), lon = Number(el.lon ?? el.center?.lon);
      const kind = t.amenity || t.shop || t.leisure || t.natural || t.tourism || 'Einrichtung';
      return { name: t.name || kind.replaceAll('_',' '), kind, lat, lon, distanceKm: haversineKm(place.lat, place.lon, lat, lon) };
    }).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon)).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0, 35);
  } catch { return []; }
}

async function openDetails(key) {
  const place = getPlaceByKey(key);
  if (!place) return;
  els.detail.innerHTML = `<div class="loading">Details und Wetter werden geladen …</div>`;
  if (!els.dialog.open) els.dialog.showModal();

  const [weather, nearby] = await Promise.all([fetchDetailWeather(place), fetchNearby(place)]);
  const t = place.tags;
  const a = place.amenities;
  const osmUrl = `https://www.openstreetmap.org/${encodeURIComponent(place.osmType)}/${encodeURIComponent(place.osmId)}`;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=16/${place.lat}/${place.lon}`;
  const phone = firstTag(t, 'phone', 'contact:phone', 'mobile', 'contact:mobile');
  const email = firstTag(t, 'email', 'contact:email');
  const operator = firstTag(t, 'operator', 'brand');
  const capacity = firstTag(t, 'capacity:pitches', 'capacity', 'capacity:caravans', 'capacity:persons');
  const charge = firstTag(t, 'charge', 'fee');
  const reservation = firstTag(t, 'reservation', 'booking');
  const opening = firstTag(t, 'opening_hours', 'seasonal');
  const maxstay = firstTag(t, 'maxstay');
  const description = firstTag(t, 'description', 'note');
  const access = firstTag(t, 'access', 'motor_vehicle');
  const surface = firstTag(t, 'surface');
  const checkin = firstTag(t, 'check_in', 'checkin');
  const checkout = firstTag(t, 'check_out', 'checkout');
  const pitches = firstTag(t, 'capacity:pitches');
  const persons = firstTag(t, 'capacity:persons');
  const tentsCapacity = firstTag(t, 'capacity:tents');
  const caravanCapacity = firstTag(t, 'capacity:caravans');
  const powerDetail = firstTag(t, 'power_supply', 'electricity');
  const internetDetail = firstTag(t, 'internet_access', 'internet_access:fee');
  const payment = Object.entries(t).filter(([k,v]) => k.startsWith('payment:') && yesish(v)).map(([k]) => k.replace('payment:','').replaceAll('_',' ')).join(', ');
  const ref = firstTag(t, 'ref', 'operator:ref');
  const personal = state.personal[place.key] || {};
  const listOptions = Object.keys(state.favoriteLists).map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');

  const weatherHtml = weather?.current ? `
    <div class="detail-grid">
      ${infoRow('Aktuell', `${weatherIcon(+weather.current.weather_code)} ${Math.round(weather.current.temperature_2m)} °C · ${weatherText(+weather.current.weather_code)}`)}
      ${infoRow('Gefühlt', `${Math.round(weather.current.apparent_temperature)} °C`)}
      ${infoRow('Luftfeuchte', `${Math.round(weather.current.relative_humidity_2m)} %`)}
      ${infoRow('Wind', `${Math.round(weather.current.wind_speed_10m)} km/h · Böen ${Math.round(weather.current.wind_gusts_10m)} km/h`)}
    </div>
    ${weather.daily ? `<div class="weather-extra">
      ${infoRow('UV-Index heute', weather.daily.uv_index_max?.[0] != null ? Number(weather.daily.uv_index_max[0]).toFixed(1) : '')}
      ${infoRow('Sonnenaufgang', weather.daily.sunrise?.[0] ? new Date(weather.daily.sunrise[0]).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '')}
      ${infoRow('Sonnenuntergang', weather.daily.sunset?.[0] ? new Date(weather.daily.sunset[0]).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '')}
      ${infoRow('Badewetter-Hinweis*', (+weather.daily.temperature_2m_max?.[0] >= 23 && +(weather.daily.precipitation_probability_max?.[0]||0) <= 40 && +(weather.daily.wind_speed_10m_max?.[0]||0) <= 30) ? 'Wetterwerte sprechen eher dafür' : 'Wetterwerte sprechen eher dagegen')}
    </div>` : ''}
    ${weather.daily ? `<div class="forecast-row">${weather.daily.time.map((date,i) => `<div class="forecast-day"><small>${new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short'})}</small><div class="icon">${weatherIcon(+weather.daily.weather_code[i])}</div><strong>${Math.round(weather.daily.temperature_2m_max[i])}° / ${Math.round(weather.daily.temperature_2m_min[i])}°</strong><br><small>Regen ${Math.round(weather.daily.precipitation_probability_max[i] || 0)}% · UV ${Number(weather.daily.uv_index_max?.[i]||0).toFixed(1)}</small></div>`).join('')}</div>` : ''}
    <p class="filter-note">* Der Badewetter-Hinweis ist nur eine einfache Wetter-Heuristik, keine Sicherheits- oder Badefreigabe.</p>
  ` : '<p>Wetterdaten sind aktuell nicht verfügbar.</p>';

  const nearbyLabels = {toilets:'Toiletten',drinking_water:'Trinkwasser',shower:'Dusche',restaurant:'Restaurant',fast_food:'Imbiss',cafe:'Café',fuel:'Tankstelle',charging_station:'E-Ladestation',waste_disposal:'Entsorgung',laundry:'Wäscherei',pharmacy:'Apotheke',hospital:'Krankenhaus',clinic:'Klinik',bicycle_rental:'Fahrradverleih',bicycle:'Fahrradgeschäft',supermarket:'Supermarkt',convenience:'Shop',bakery:'Bäckerei',playground:'Spielplatz',water_park:'Wasserpark',dog_park:'Hundeauslauf',beach:'Strand',water:'Gewässer',information:'Tourist-Info'};
  const nearbyHtml = nearby.length ? `<div class="nearby-list">${nearby.map(n => `<div class="nearby-item"><span><strong>${escapeHtml(n.name)}</strong><br><small>${escapeHtml(nearbyLabels[n.kind] || n.kind)} · ${n.distanceKm < 1 ? `${Math.round(n.distanceKm*1000)} m` : `${n.distanceKm.toFixed(1)} km`}</small></span><a href="https://www.openstreetmap.org/?mlat=${n.lat}&mlon=${n.lon}#map=18/${n.lat}/${n.lon}" target="_blank" rel="noopener">Karte ↗</a></div>`).join('')}</div>` : '<p>Keine zusätzlichen Einrichtungen im Umkreis gefunden oder Datenabfrage nicht verfügbar.</p>';

  const rawTags = Object.entries(t).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('');

  els.detail.innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero-icon ${place.tourism === 'caravan_site' ? 'caravan' : ''}">${siteIconSvg(place.tourism)}</div>
      <div class="detail-title">
        <span class="section-kicker">${escapeHtml(place.typeLabel).toUpperCase()}</span>
        <h2>${escapeHtml(place.name)}</h2>
        <p>${place.address ? escapeHtml(place.address) : 'Adresse nicht eingetragen'}${place.stars ? ` · ${place.stars} ★ Klassifizierung` : ''}</p>
        <div class="badges">
          ${place.adultOnly ? badge('Nur Erwachsene') : ''}${place.nudist ? badge('FKK / Nudismus') : ''}
          ${place.dog === 'yes' ? badge('Hund erlaubt','neutral') : place.dog === 'no' ? badge('Hunde nicht erlaubt','neutral') : ''}
          ${place.family ? badge('Familienfreundlich','neutral') : ''}${ageGroupLabels(place).map(x => badge(x,'neutral')).join('')}${place.sea ? badge('Küstennähe*','neutral') : ''}
        </div>
        <div class="detail-source-row"><span class="trust-pill good">Datenquelle: OpenStreetMap</span><span class="trust-pill quality-${placeDataQuality(place).level}">${placeDataQuality(place).label} · ${placeDataQuality(place).percent}% Datenfelder</span><span class="trust-pill ${place.website ? 'good' : ''}">${place.website ? '✓ Original-Webseite hinterlegt' : 'Keine Webseite hinterlegt'}</span>${place.osmUpdated ? `<span class="trust-pill">OSM: ${new Date(place.osmUpdated).toLocaleDateString('de-DE')}</span>` : ''}</div>
      </div>
    </div>

    <div class="detail-vehicle-legal"><strong>Fahrzeug-Hinweis:</strong> ${escapeHtml(vehicleEligibility(place, state.routeAutoStopKeys?.has(place.key) ? routeVehicleValue() : (state.familyProfile?.vehicle || 'motorhome')).reason)}</div>
    <div class="detail-actionbar">
      ${place.website ? `<a class="mini-btn" href="${escapeHtml(place.website)}" target="_blank" rel="noopener noreferrer">Zur Original-Webseite ↗</a>` : ''}
      <a class="mini-btn secondary" href="${mapUrl}" target="_blank" rel="noopener">Auf Karte öffnen ↗</a>
      <button id="detailShareBtn" class="mini-btn secondary" type="button">Teilen</button>
      <button id="detailTripBtn" class="mini-btn secondary" type="button">${state.trip.stages.some(s => s.key === place.key) ? '✓ In Reise' : '+ Zur Reise'}</button>
      <a class="mini-btn secondary" href="${osmUrl}" target="_blank" rel="noopener">Quelldatensatz ↗</a>
    </div>

    ${description ? `<div class="detail-section"><h3>Beschreibung</h3><p>${escapeHtml(description)}</p></div>` : ''}

    <div class="detail-section"><h3>Kontakt &amp; Platzinfo</h3>
      <div class="detail-grid">
        ${infoRow('Betreiber', operator)}
        ${infoRow('Adresse', place.address)}
        ${phone ? infoRow('Telefon', `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>`, true) : ''}
        ${email ? infoRow('E-Mail', `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`, true) : ''}
        ${infoRow('Öffnung / Saison', opening)}
        ${infoRow('Reservierung', reservation)}
        ${infoRow('Gebührenstatus', place.fee === 'free' ? 'Als kostenlos eingetragen' : place.fee === 'paid' ? 'Gebühr/Kosten eingetragen' : 'Nicht angegeben')}
        ${infoRow('Preisangabe', charge)}
        ${infoRow('Kapazität gesamt', capacity)}
        ${infoRow('Stellplätze', pitches)}
        ${infoRow('Stellplatzgröße', place.pitchSizeM2 != null ? `ca. ${place.pitchSizeM2} m² (Quelldaten)` : '')}
        ${infoRow('Kapazität Personen', persons)}
        ${infoRow('Zeltplätze', tentsCapacity)}
        ${infoRow('Wohnwagen/Wohnmobil-Plätze', caravanCapacity)}
        ${infoRow('Max. Aufenthalt', maxstay)}
        ${infoRow('Mindestalter', firstTag(t,'min_age','minimum_age'))}
        ${infoRow('Zufahrt / Zugang', access)}
        ${infoRow('Untergrund', surface)}
        ${infoRow('Check-in', checkin)}
        ${infoRow('Check-out', checkout)}
        ${infoRow('Stromangabe', powerDetail)}
        ${infoRow('Internetangabe', internetDetail)}
        ${infoRow('Zahlungsmöglichkeiten', payment)}
        ${infoRow('Platz-Referenz', ref)}
        ${infoRow('Koordinaten', `${place.lat.toFixed(6)}, ${place.lon.toFixed(6)}`)}
        ${infoRow('OSM-Eintrag aktualisiert', place.osmUpdated ? new Date(place.osmUpdated).toLocaleString('de-DE') : '')}
      </div>
    </div>

    <div class="detail-section"><h3>Ausstattung laut Platzdatensatz</h3>
      <div class="amenity-grid">
        ${amenityBox('Strom', a.electricity)}${amenityBox('Trinkwasser', a.drinkingWater)}${amenityBox('Toiletten', a.toilets)}
        ${amenityBox('Dusche', a.shower)}${amenityBox('Entsorgung', a.dump)}${amenityBox('WLAN', a.wifi)}
        ${amenityBox('Barrierearm', a.wheelchair)}${amenityBox('Zelte', a.tents)}${amenityBox('Wohnwagen', a.caravans)}
        ${amenityBox('Wohnmobile', a.motorhome)}${amenityBox('Miet-Hütten', a.cabins)}${amenityBox('Grill', a.bbq)}
        ${amenityBox('Warmwasser', a.hotWater)}${amenityBox('Waschen', a.laundry)}${amenityBox('Pool', a.pool)}${amenityBox('Spielplatz', a.playground)}
        ${amenityBox('Grauwasser-Entsorgung', a.greyWater)}${amenityBox('Chemie-WC-Entsorgung', a.chemicalToilet)}${amenityBox('Recycling', a.recycling)}${amenityBox('Kochmöglichkeit', a.kitchen)}
        ${amenityBox('Privatbad / Privatsanitär', a.privateBathroom)}${amenityBox('Sauna', a.sauna)}${amenityBox('Privater Whirlpool', a.privateHotTub)}${amenityBox('Privater Pool', a.privatePool)}
        ${amenityBox('Kinderbad / Kindersanitär', a.kidsBath)}${amenityBox('Babybad / Babyraum', a.babyBath)}${amenityBox('Mietwohnwagen', a.rentalCaravan)}${amenityBox('Mietzelte', a.rentalTent)}${amenityBox('Bungalows / Hütten', a.bungalow)}
        ${amenityBox('Hallenbad / Indoor-Pool', a.indoorPool)}${amenityBox('Beheizter Pool', a.heatedPool)}${amenityBox('Kinderpool / Planschbecken', a.paddlingPool)}${amenityBox('Wasserpark / Rutschen', a.waterPark)}
        ${amenityBox('Kinderclub', a.kidsClub)}${amenityBox('Jugendclub', a.teenClub)}${amenityBox('Animation', a.animation)}${amenityBox('Restaurant am Platz', a.restaurant)}
        ${amenityBox('Brötchenservice', a.breadService)}${amenityBox('Supermarkt / Shop', a.supermarket)}${amenityBox('Direkter Strandzugang', a.directBeach)}${amenityBox('Privatstrand', a.privateBeach)}
        ${amenityBox('Direkter Seezugang', a.lakeAccess)}${amenityBox('Angeln', a.fishing)}${amenityBox('Fahrradverleih', a.bikeRental)}${amenityBox('E-Bike-Laden', a.ebikeCharge)}
        ${amenityBox('Gasflaschen / Tausch', a.gasExchange)}${amenityBox('E-Auto-Lader', a.evCharge)}${amenityBox('Ganzjährig geöffnet', a.yearRound)}${amenityBox('Barrierefreies Sanitär', a.accessibleSanitary)}
        ${amenityBox('Waschmaschine', a.washingMachine)}${amenityBox('Trockner', a.dryer)}${amenityBox('Schattige Stellplätze', a.shadedPitches)}${amenityBox('Sonnige Stellplätze', a.sunnyPitches)}
      </div>
    </div>

    <div class="detail-section family-assistant-section"><h3>Passt zu deiner Familie?</h3>${familyAssistantHtml(place)}</div>

    <div class="detail-section data-confidence-section"><h3>Datenvertrauen</h3>
      <div class="data-confidence-card"><strong>${placeDataQuality(place).label}</strong><span>${placeDataQuality(place).percent}% der wichtigsten Informationsfelder sind in diesem Datensatz befüllt.</span><small>Das ist keine Bewertung des Campingplatzes. Es beschreibt nur, wie viele relevante Angaben in den offenen Quelldaten vorhanden sind. Fehlende Angaben bedeuten nicht automatisch „nicht vorhanden“.</small></div>
    </div>

    <div class="detail-section"><h3>Mein Platz</h3>
      <div class="detail-personal-row">
        <label class="check"><input id="detailVisited" type="checkbox" ${personal.visited ? 'checked' : ''} /> <span>Als besucht markieren</span></label>
        <label><span>Eigene Bewertung</span><select id="detailRating"><option value="">–</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${String(personal.rating||'')===String(n)?'selected':''}>${n}/5</option>`).join('')}</select></label>
      </div>
      <div class="personal-note-box">
        <label><span>Favoritenliste</span><select id="detailListSelect">${listOptions}</select></label>
        <button id="detailSaveListBtn" class="secondary-btn" type="button">Zu dieser Liste speichern</button>
        <label><span>Private Notiz</span><textarea id="detailPrivateNote" placeholder="Nur auf diesem Gerät gespeichert">${escapeHtml(personal.note || '')}</textarea></label>
        <button id="detailSavePersonalBtn" class="primary-btn" type="button">Besucht / Notiz speichern</button>
      </div>
    </div>

    <div class="detail-section"><h3>Wetter am Platz · 7 Tage</h3>${weatherHtml}</div>
    <div class="detail-section"><h3>Umgebung bis ca. 5 km</h3>${nearbyHtml}</div>

    <details class="detail-section"><summary><strong>Alle vorhandenen OpenStreetMap-Tags</strong></summary><dl class="raw-tags">${rawTags}</dl></details>
  `;
  $('detailShareBtn')?.addEventListener('click', () => sharePlace(place.key));
  $('detailTripBtn')?.addEventListener('click', () => { addToTrip(place.key); $('detailTripBtn').textContent='✓ In Reise'; });
  $('detailSaveListBtn')?.addEventListener('click', () => addToFavoriteList(place.key, $('detailListSelect')?.value || 'Merkliste'));
  $('detailSavePersonalBtn')?.addEventListener('click', () => {
    const meta = state.personal[place.key] || {};
    meta.visited = Boolean($('detailVisited')?.checked);
    meta.rating = $('detailRating')?.value || '';
    meta.note = $('detailPrivateNote')?.value?.trim() || '';
    meta.snapshot = snapshotPlace(place);
    state.personal[place.key] = meta;
    persistPersonal();
    renderMyPlaces(); renderResults();
  });
  renderResults();
  updateStats();
}


const I18N = {
  de:{tagline:'Campingplätze & Wohnmobilstellplätze in Europa',subtagline:'Live-Suche · Route · Wetter · Favoriten',install:'App installieren',navFinder:'🔎 Finder',navRoute:'🛣️ Route',navMine:'★ Meine Plätze',navHelpers:'🧰 Camping-Helfer',finderTitle:'Campingplatz-Finder',finderIntro:'Europaweit suchen oder Plätze in deiner Nähe finden.',nearMe:'📍 In meiner Nähe',country:'Land',place:'Ort / Region / Name',siteType:'Platzart',searchCountry:'Land durchsuchen',searchMap:'Kartenbereich durchsuchen',filters:'Filter',routeTitle:'Campingplätze an deinen Übernachtungsstopps',routeIntro:'Start, Ziel und Zwischenübernachtungen wählen – Campingfinder plant gleichmäßige Fahretappen und sucht rund um die Stopps.'},
  en:{tagline:'Campsites & motorhome stopovers across Europe',subtagline:'Live search · Route · Weather · Favourites',install:'Install app',navFinder:'🔎 Finder',navRoute:'🛣️ Route',navMine:'★ My places',navHelpers:'🧰 Camping tools',finderTitle:'Campsite finder',finderIntro:'Search across Europe or find sites near you.',nearMe:'📍 Near me',country:'Country',place:'Place / region / name',siteType:'Site type',searchCountry:'Search country',searchMap:'Search map area',filters:'Filters',routeTitle:'Campsites at your overnight stops',routeIntro:'Choose start, destination and overnight stops – Campingfinder splits the trip into even driving stages and searches near the stops.'},
  nl:{tagline:'Campings & camperplaatsen in Europa',subtagline:'Live zoeken · Route · Weer · Favorieten',install:'App installeren',navFinder:'🔎 Zoeken',navRoute:'🛣️ Route',navMine:'★ Mijn plaatsen',navHelpers:'🧰 Campinghulp',finderTitle:'Campingzoeker',finderIntro:'Zoek in heel Europa of vind plaatsen in de buurt.',nearMe:'📍 In mijn buurt',country:'Land',place:'Plaats / regio / naam',siteType:'Type plaats',searchCountry:'Land doorzoeken',searchMap:'Kaartgebied doorzoeken',filters:'Filters',routeTitle:'Campings bij je overnachtingsstops',routeIntro:'Kies vertrek, bestemming en overnachtingen – Campingfinder verdeelt de rit in gelijke etappes en zoekt rond de stops.'},
  fr:{tagline:'Campings & aires de camping-car en Europe',subtagline:'Recherche · Itinéraire · Météo · Favoris',install:"Installer l’app",navFinder:'🔎 Recherche',navRoute:'🛣️ Itinéraire',navMine:'★ Mes lieux',navHelpers:'🧰 Outils camping',finderTitle:'Recherche de campings',finderIntro:'Cherchez dans toute l’Europe ou près de vous.',nearMe:'📍 Autour de moi',country:'Pays',place:'Lieu / région / nom',siteType:'Type de site',searchCountry:'Rechercher le pays',searchMap:'Rechercher sur la carte',filters:'Filtres',routeTitle:'Campings près de vos étapes de nuit',routeIntro:'Choisissez départ, destination et nuitées – Campingfinder répartit le trajet en étapes régulières et cherche autour des arrêts.'},
  it:{tagline:'Campeggi & aree camper in Europa',subtagline:'Ricerca · Percorso · Meteo · Preferiti',install:'Installa app',navFinder:'🔎 Cerca',navRoute:'🛣️ Percorso',navMine:'★ I miei posti',navHelpers:'🧰 Strumenti camping',finderTitle:'Trova campeggi',finderIntro:'Cerca in tutta Europa o trova posti vicino a te.',nearMe:'📍 Vicino a me',country:'Paese',place:'Luogo / regione / nome',siteType:'Tipo di area',searchCountry:'Cerca nel paese',searchMap:'Cerca nella mappa',filters:'Filtri',routeTitle:'Campeggi vicino alle soste notturne',routeIntro:'Scegli partenza, destinazione e pernottamenti – Campingfinder divide il viaggio in tappe regolari e cerca vicino alle soste.'},
  es:{tagline:'Campings & áreas de autocaravanas en Europa',subtagline:'Búsqueda · Ruta · Tiempo · Favoritos',install:'Instalar app',navFinder:'🔎 Buscar',navRoute:'🛣️ Ruta',navMine:'★ Mis lugares',navHelpers:'🧰 Herramientas',finderTitle:'Buscador de campings',finderIntro:'Busca por Europa o encuentra lugares cerca de ti.',nearMe:'📍 Cerca de mí',country:'País',place:'Lugar / región / nombre',siteType:'Tipo de lugar',searchCountry:'Buscar país',searchMap:'Buscar zona del mapa',filters:'Filtros',routeTitle:'Campings cerca de tus paradas nocturnas',routeIntro:'Elige origen, destino y pernoctaciones – Campingfinder divide el viaje en etapas equilibradas y busca cerca de las paradas.'},
  pl:{tagline:'Kempingi i miejsca dla kamperów w Europie',subtagline:'Wyszukiwanie · Trasa · Pogoda · Ulubione',install:'Zainstaluj aplikację',navFinder:'🔎 Szukaj',navRoute:'🛣️ Trasa',navMine:'★ Moje miejsca',navHelpers:'🧰 Narzędzia',finderTitle:'Wyszukiwarka kempingów',finderIntro:'Szukaj w całej Europie lub znajdź miejsca w pobliżu.',nearMe:'📍 W pobliżu',country:'Kraj',place:'Miejsce / region / nazwa',siteType:'Rodzaj miejsca',searchCountry:'Szukaj w kraju',searchMap:'Szukaj na mapie',filters:'Filtry',routeTitle:'Kempingi przy noclegowych postojach',routeIntro:'Wybierz start, cel i liczbę noclegów – Campingfinder dzieli trasę na równe etapy i szuka miejsc przy postojach.'}
};
function applyLanguage(lang) {
  state.language = I18N[lang] ? lang : 'de';
  localStorage.setItem('campingfinder:language', state.language);
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key=node.dataset.i18n, value=I18N[state.language]?.[key] || I18N.de[key];
    if (value) node.textContent=value;
  });
  if (els.language) els.language.value=state.language;
}

function switchMapLayer(name) {
  const next = mapLayers[name] || mapLayers.osm;
  if (activeMapLayer === next) return;
  map.removeLayer(activeMapLayer); next.addTo(map); activeMapLayer = next;
  markerLayer.bringToFront?.(); state.routeLayer?.bringToFront?.(); routePlanLayer?.bringToFront?.(); state.tripLayer?.bringToFront?.();
}

function handleSavedAction(target) {
  const action=target.dataset.savedAction, key=target.dataset.key, listName=target.dataset.list;
  if (action==='details' && key) openDetails(key);
  if (action==='share' && key) sharePlace(key);
  if (action==='trip' && key) addToTrip(key);
  if (action==='remove' && key && listName && state.favoriteLists[listName]) {
    state.favoriteLists[listName]=state.favoriteLists[listName].filter(k=>k!==key);
    const stillListed=Object.values(state.favoriteLists).some(arr=>arr.includes(key));
    if (!stillListed) { state.favorites.delete(key); if (!state.personal[key]?.visited) delete state.favoriteSnapshots[key]; }
    persistFavorites(); renderMyPlaces(); renderResults(); updateStats();
  }
  if (action==='delete-list' && listName && listName!=='Merkliste' && state.favoriteLists[listName]) {
    const keys=[...state.favoriteLists[listName]];
    delete state.favoriteLists[listName];
    keys.forEach(k=>{ if (!Object.values(state.favoriteLists).some(arr=>arr.includes(k))) state.favoriteLists.Merkliste.push(k); });
    state.favoriteLists.Merkliste=[...new Set(state.favoriteLists.Merkliste)];
    persistFavorites(); renderMyPlaces();
  }
}


function syncQuickControls() {
  document.querySelectorAll('[data-site-type]').forEach(btn => { const active=btn.dataset.siteType === els.type?.value; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('[data-filter-toggle]').forEach(btn => {
    const target = $(btn.dataset.filterToggle);
    const active=!!target?.checked; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-filter-value]').forEach(btn => {
    const [id, value] = String(btn.dataset.filterValue || '').split(':');
    const target = $(id);
    const active=!!target && target.value === value; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-style-value]').forEach(btn => { const active=els.style?.value === btn.dataset.styleValue; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active)); });
  updateFilterSummary();
}

const SHARE_CHECK_IDS = [
  'adultOnlyFilter','fkkFilter','familyFilter','babyFilter','toddlerFilter','childrenFilter','teenFilter','websiteFilter',
  'electricFilter','waterFilter','toiletFilter','showerFilter','dumpFilter','wifiFilter','wheelchairFilter','motorhomeFilter','caravanFilter','tentsFilter','cabinsFilter','greyWaterFilter','chemicalToiletFilter','playgroundFilter','poolFilter','laundryFilter',
  'privateBathroomFilter','saunaFilter','privateHotTubFilter','privatePoolFilter','kidsBathFilter','babyBathFilter','rentalCaravanFilter','rentalTentFilter','bungalowFilter','indoorPoolFilter','heatedPoolFilter','paddlingPoolFilter','waterParkFilter','kidsClubFilter','teenClubFilter','animationFilter','restaurantFilter','breadServiceFilter','supermarketFilter','directBeachFilter','privateBeachFilter','lakeAccessFilter','fishingFilter','bikeRentalFilter','ebikeChargeFilter','gasExchangeFilter','evChargeFilter','yearRoundFilter','accessibleSanitaryFilter','washingMachineFilter','dryerFilter'
];
function compactFamilyProfile() {
  const p=state.familyProfile||{};
  const vehicle={all:'a',motorhome:'m',van:'v',caravan:'c',car:'p',tent:'t'}[p.vehicle||'all']||'a';
  return `${Math.max(1,Number(p.adults||2))}-${(p.childAges||[]).join('_')}-${p.dog==='yes'?'1':'0'}-${vehicle}`;
}
function parseCompactFamilyProfile(raw) {
  const parts=String(raw||'').split('-'); if(parts.length<4)return null;
  const vehicle={a:'all',m:'motorhome',v:'van',c:'caravan',p:'car',t:'tent'}[parts[3]]||'all';
  return { adults:Math.max(1,Math.min(12,Number(parts[0]||2))), childAges:String(parts[1]||'').split('_').map(Number).filter(n=>Number.isFinite(n)&&n>=0&&n<=17), dog:parts[2]==='1'?'yes':'no', vehicle };
}
function buildShareUrl() {
  const url=new URL(location.href); url.hash=''; url.search='';
  const q=url.searchParams; q.set('cf','1'); q.set('go','1');
  if(els.country?.value)q.set('c',els.country.value);
  if(els.place?.value?.trim())q.set('q',els.place.value.trim());
  if(els.type?.value && els.type.value!=='all')q.set('t',els.type.value==='camp_site'?'c':'r');
  const active=SHARE_CHECK_IDS.map((id,i)=>$(id)?.checked?i.toString(36):'').filter(Boolean); if(active.length)q.set('f',active.join('.'));
  const simple=[['d',els.dog,'all'],['fe',els.fee,'all'],['s',els.stars,'0'],['l',els.location,'all'],['st',els.style,'all'],['pr',els.price,'all'],['ps',els.pitchSize,'0'],['pe',els.pitchExposure,'all']];
  simple.forEach(([key,el,def])=>{if(el&&el.value!==def)q.set(key,el.value);});
  const fp=compactFamilyProfile(); if(fp!=='2--0-a')q.set('fp',fp);
  return url.toString();
}
function restoreSharedSearchFromUrl() {
  const q=new URLSearchParams(location.search); if(q.get('cf')!=='1')return false;
  if(q.get('c')&&els.country)els.country.value=q.get('c');
  if(els.place)els.place.value=q.get('q')||'';
  if(els.type){ const t=q.get('t'); els.type.value=t==='c'?'camp_site':t==='r'?'caravan_site':'all'; }
  SHARE_CHECK_IDS.forEach(id=>{const el=$(id);if(el)el.checked=false;});
  String(q.get('f')||'').split('.').filter(Boolean).forEach(code=>{const i=parseInt(code,36); const el=$(SHARE_CHECK_IDS[i]); if(el)el.checked=true;});
  const assigns=[['d',els.dog,'all'],['fe',els.fee,'all'],['s',els.stars,'0'],['l',els.location,'all'],['st',els.style,'all'],['pr',els.price,'all'],['ps',els.pitchSize,'0'],['pe',els.pitchExposure,'all']];
  assigns.forEach(([key,el,def])=>{if(el)el.value=q.get(key)||def;});
  if(q.get('fp')){ const fp=parseCompactFamilyProfile(q.get('fp')); if(fp){state.familyProfile=fp;localStorage.setItem('campingfinder:familyProfile',JSON.stringify(fp));renderFamilyProfile();} }
  syncQuickControls();
  return q.get('go')==='1';
}
function openShareSearch() {
  const url=buildShareUrl();
  if(els.shareUrlInput)els.shareUrlInput.value=url;
  if(els.shareQr){
    els.shareQr.innerHTML='';
    try{
      if(window.CampingfinderQR){window.CampingfinderQR.render(els.shareQr,url,{scale:5}); if(els.shareQrNote)els.shareQrNote.textContent='QR-Code lokal erzeugt – keine Daten werden für die QR-Erstellung an einen Dienst gesendet.';}
      else throw new Error('QR unavailable');
    }catch(err){ if(els.shareQrNote)els.shareQrNote.textContent=err?.message==='QR_TEXT_TOO_LONG'?'Der vollständige Link ist für den lokalen QR-Code zu lang. Der Kopier-Link enthält trotzdem alle Filter.':'QR-Code konnte in diesem Browser nicht erzeugt werden.'; }
  }
  els.shareDialog?.showModal();
}
async function copyShareUrl() {
  const text=els.shareUrlInput?.value||buildShareUrl();
  try{ if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text); else throw new Error(); }
  catch{ if(els.shareUrlInput){els.shareUrlInput.focus();els.shareUrlInput.select();document.execCommand?.('copy');} }
  const btn=$('copyShareUrlBtn'); if(btn){const old=btn.textContent;btn.textContent='✓ Kopiert';setTimeout(()=>btn.textContent=old,1400);}
}

function persistCompare() {
  localStorage.setItem('campingfinder:compare', JSON.stringify([...state.compare]));
  localStorage.setItem('campingfinder:compareSnapshots', JSON.stringify(state.compareSnapshots));
}
function updateCompareBar() {
  const bar=$('compareBar'), count=$('compareCount');
  if (!bar || !count) return;
  count.textContent=String(state.compare.size);
  bar.hidden=state.compare.size===0;
  const open=$('compareOpenBtn'); if(open) open.disabled=state.compare.size<2;
}
function toggleCompare(key) {
  if (state.compare.has(key)) {
    state.compare.delete(key); delete state.compareSnapshots[key];
  } else {
    if (state.compare.size >= 4) { alert('Du kannst maximal vier Plätze gleichzeitig vergleichen.'); return; }
    const p=getPlaceByKey(key); if(!p)return;
    state.compare.add(key); state.compareSnapshots[key]=snapshotPlace(p);
  }
  persistCompare(); updateCompareBar(); renderResults();
}
function compareAmenity(place, key) {
  const v=place?.amenities?.[key];
  if (v === true || v === 'yes') return '<span class="yes">Ja</span>';
  if (v === false || v === 'no') return '<span class="no">Nein</span>';
  return '<span class="unknown">–</span>';
}
function openCompare() {
  const places=[...state.compare].map(getPlaceByKey).filter(Boolean).slice(0,4);
  if (places.length < 2) return;
  const cell=(fn)=>places.map(p=>`<td>${fn(p)}</td>`).join('');
  const safe=v=>escapeHtml(v || '–');
  $('compareContent').innerHTML=`
    <div class="detail-title"><span class="section-kicker">VERGLEICH</span><h2>Campingplätze vergleichen</h2><p>Bis zu vier Plätze direkt nebeneinander – besonders praktisch am PC. Fehlende Angaben bleiben bewusst leer.</p></div>
    <div class="compare-table-wrap"><table class="compare-table">
      <thead><tr><th>Merkmal</th>${places.map(p=>`<th class="place-head"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.typeLabel || '')}</small></th>`).join('')}</tr></thead>
      <tbody>
        <tr><td>Platzart</td>${cell(p=>safe(p.typeLabel))}</tr>
        <tr><td>Adresse</td>${cell(p=>safe(p.address))}</tr>
        <tr><td>Klassifizierung</td>${cell(p=>p.stars?`${escapeHtml(p.stars)} ★`:'–')}</tr>
        <tr><td>Datenumfang</td>${cell(p=>{const q=placeDataQuality(p);return `<span class="trust-pill quality-${q.level}">${q.label} · ${q.percent}%</span>`;})}</tr>
        <tr><td>Preis/Nacht*</td>${cell(p=>p.priceNight!=null?`${Number(p.priceNight).toFixed(2).replace('.',',')} €`:'–')}</tr>
        <tr><td>Gebühr</td>${cell(p=>p.fee==='free'?'Kostenlos':p.fee==='paid'?'Kostenpflichtig':'–')}</tr>
        <tr><td>Hund</td>${cell(p=>p.dog==='yes'?'<span class="yes">Erlaubt</span>':p.dog==='no'?'<span class="no">Nicht erlaubt</span>':'<span class="unknown">–</span>')}</tr>
        <tr><td>Familie</td>${cell(p=>p.family?'<span class="yes">Ja</span>':'<span class="unknown">–</span>')}</tr>
        <tr><td>Altersgruppen*</td>${cell(p=>{ const labels=ageGroupLabels(p); return labels.length?escapeHtml(labels.join(', ')):'–'; })}</tr>
        <tr><td>FKK</td>${cell(p=>p.nudist?'<span class="yes">Ja</span>':'<span class="unknown">–</span>')}</tr>
        <tr><td>Strom</td>${cell(p=>compareAmenity(p,'electricity'))}</tr>
        <tr><td>Trinkwasser</td>${cell(p=>compareAmenity(p,'drinkingWater'))}</tr>
        <tr><td>Toiletten</td>${cell(p=>compareAmenity(p,'toilets'))}</tr>
        <tr><td>Duschen</td>${cell(p=>compareAmenity(p,'shower'))}</tr>
        <tr><td>Entsorgung</td>${cell(p=>compareAmenity(p,'dump'))}</tr>
        <tr><td>WLAN</td>${cell(p=>compareAmenity(p,'wifi'))}</tr>
        <tr><td>Spielplatz</td>${cell(p=>compareAmenity(p,'playground'))}</tr>
        <tr><td>Pool</td>${cell(p=>compareAmenity(p,'pool'))}</tr>
        <tr><td>Kinderpool</td>${cell(p=>compareAmenity(p,'paddlingPool'))}</tr>
        <tr><td>Privatbad</td>${cell(p=>compareAmenity(p,'privateBathroom'))}</tr>
        <tr><td>Sauna</td>${cell(p=>compareAmenity(p,'sauna'))}</tr>
        <tr><td>Privater Whirlpool</td>${cell(p=>compareAmenity(p,'privateHotTub'))}</tr>
        <tr><td>Kinderbad</td>${cell(p=>compareAmenity(p,'kidsBath'))}</tr>
        <tr><td>Babybad</td>${cell(p=>compareAmenity(p,'babyBath'))}</tr>
        <tr><td>Mietwohnwagen</td>${cell(p=>compareAmenity(p,'rentalCaravan'))}</tr>
        <tr><td>Mietzelt</td>${cell(p=>compareAmenity(p,'rentalTent'))}</tr>
        <tr><td>Bungalow/Hütte</td>${cell(p=>compareAmenity(p,'bungalow'))}</tr>
        <tr><td>Strandzugang</td>${cell(p=>compareAmenity(p,'directBeach'))}</tr>
        <tr><td>Ganzjährig</td>${cell(p=>compareAmenity(p,'yearRound'))}</tr>
        <tr><td>Original-Webseite</td>${cell(p=>p.website?`<a href="${escapeHtml(p.website)}" target="_blank" rel="noopener noreferrer">Öffnen ↗</a>`:'–')}</tr>
      </tbody>
    </table></div><p class="filter-note">* Nur soweit aus den Quelldaten vorhanden. Der Vergleich stellt keine Bewertung oder Rangliste dar.</p>`;
  $('compareDialog').showModal();
}
function applyTheme(theme) {
  const t=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=t;
  localStorage.setItem('campingfinder:theme',t);
  const btn=$('themeToggle'); if(btn){btn.textContent=t==='dark'?'☀':'◐'; btn.setAttribute('aria-label',t==='dark'?'Helle Darstellung':'Dunkle Darstellung');}
  const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.content=t==='dark'?'#111814':'#0f5a3c';
}
function initTheme() {
  const saved=localStorage.getItem('campingfinder:theme');
  const preferred=window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';
  applyTheme(saved || preferred);
}
function openLegal(kind) {
  const content=$('legalContent'); if(!content)return;
  const pages={
    imprint:`<h2>Impressum</h2><p><strong>Campingfinder</strong><br>Verantwortlich: Marcel Hentschel</p><p class="legal-warning"><strong>Vor einer öffentlichen oder geschäftlichen Veröffentlichung:</strong> Eine vollständige ladungsfähige Anschrift und die erforderlichen Kontaktangaben müssen hier noch ergänzt werden. Diese Angaben kenne ich nicht und erfinde sie nicht.</p><p>Campingfinder ist eine Web-App zur Suche und Organisation öffentlich verfügbarer Campingplatzdaten.</p>`,
    privacy:`<h2>Datenschutz</h2><p>Favoriten, private Notizen, Checklisten und Tagebucheinträge werden lokal im Browser dieses Geräts gespeichert. Standortdaten werden nur nach Freigabe durch den Nutzer abgefragt. Campingfinder betreibt in dieser Version keinen eigenen Nutzer-Account.</p><h3>Externe Dienste</h3><ul class="legal-list"><li>OpenStreetMap/Overpass für Camping- und Kartendaten</li><li>Nominatim für Orts- und Regionssuche</li><li>Open-Meteo für Wetterdaten</li><li>OSRM für Routenberechnung</li><li>OpenTopoMap für die optionale topografische Kartenebene</li></ul><p>Beim Abruf dieser Dienste stellt der Browser direkte Netzwerkverbindungen her. Dabei können technisch notwendige Verbindungsdaten wie die IP-Adresse an den jeweiligen Anbieter übertragen werden.</p><p class="legal-warning">Vor einem öffentlichen produktiven Betrieb sollte die Datenschutzerklärung anhand der tatsächlichen Domain, Hosting-Konfiguration und eingebundenen Dienste rechtlich geprüft und vervollständigt werden.</p>`,
    sources:`<h2>Datenquellen</h2><p><strong>Camping- und Kartendaten:</strong> OpenStreetMap-Mitwirkende / Overpass API.</p><p><strong>Wetter:</strong> Open-Meteo.</p><p><strong>Routing:</strong> öffentlicher OSRM-Dienst.</p><p><strong>Karten:</strong> OpenStreetMap und OpenTopoMap – jeweils mit den vorgeschriebenen Quellen- und Lizenzhinweisen.</p><p><strong>Kostenmodell:</strong> Die App verwendet keine kostenpflichtigen API-Schlüssel. Öffentliche Gratisdienste können Nutzungsgrenzen oder geänderte Bedingungen haben; deshalb sind die Anbieter technisch austauschbar.</p><p>Campingfinder übernimmt fehlende Angaben nicht durch Schätzungen. Eine vollständige Erfassung aller europäischen Campingplätze kann mit offenen Datenquellen nicht garantiert werden.</p>`
  };
  content.innerHTML=pages[kind] || pages.sources;
  $('legalDialog').showModal();
}

const JOURNAL_DB='campingfinder-journal-v1';
function openJournalDb() {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(JOURNAL_DB,1);
    req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains('entries')) db.createObjectStore('entries',{keyPath:'id',autoIncrement:true}); };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function journalTx(mode, fn) {
  const db=await openJournalDb();
  return new Promise((resolve,reject)=>{ const tx=db.transaction('entries',mode), store=tx.objectStore('entries'); const result=fn(store); tx.oncomplete=()=>{db.close();resolve(result)}; tx.onerror=()=>{db.close();reject(tx.error)}; });
}
async function journalAdd(entry) { const db=await openJournalDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction('entries','readwrite'); const req=tx.objectStore('entries').add(entry); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); tx.oncomplete=()=>db.close(); }); }
async function journalDelete(id) { return journalTx('readwrite', store=>store.delete(Number(id))); }
async function journalAll() { const db=await openJournalDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction('entries','readonly'); const req=tx.objectStore('entries').getAll(); req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error); tx.oncomplete=()=>db.close(); }); }
async function renderTravelStats(){
  if(!els.travelStats)return;
  const visited=Object.values(state.personal||{}).filter(x=>x?.visited).length;
  const stages=(state.trip?.stages||[]).length;
  const nights=(state.trip?.stages||[]).reduce((sum,x)=>sum+Math.max(1,Number(x?.nights||1)),0);
  const countries=new Set();
  Object.values(state.favoriteSnapshots||{}).forEach(p=>{const c=p?.tags?.['addr:country'];if(c)countries.add(String(c).toUpperCase());});
  let journal=[],cost=0; try{journal=await journalAll();cost=journal.reduce((sum,x)=>sum+(Number(x.cost)||0),0);}catch{}
  const cards=[
    ['Favoriten',state.favorites.size],['Besuchte Plätze',visited],['Reise-Etappen',stages],['Geplante Nächte',nights],['Tagebuch-Einträge',journal.length],['Tagebuch-Kosten',cost.toLocaleString('de-DE',{style:'currency',currency:'EUR'})],['Länder in Favoriten',countries.size]
  ];
  els.travelStats.innerHTML=cards.map(([label,value])=>`<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('');
}
function compressPhoto(file) {
  if (!file) return Promise.resolve('');
  return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>{ const img=new Image(); img.onload=()=>{ const max=1280, scale=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale); c.getContext('2d').drawImage(img,0,0,c.width,c.height); resolve(c.toDataURL('image/jpeg',.76)); }; img.onerror=reject; img.src=reader.result; }; reader.onerror=reject; reader.readAsDataURL(file); });
}
async function renderJournalEntries() {
  if (!els.journalEntries) return;
  try {
    const rows=(await journalAll()).sort((a,b)=>String(b.date).localeCompare(String(a.date)) || b.id-a.id);
    els.journalEntries.innerHTML=rows.length?rows.map(r=>`<article class="journal-entry"><div class="journal-entry-head"><div><strong>${escapeHtml(r.place)}</strong><br><small>${escapeHtml(r.date||'')}${r.rating?` · ${r.rating}/5 ★`:''}${r.cost!==''&&r.cost!=null?` · ${Number(r.cost).toLocaleString('de-DE',{style:'currency',currency:'EUR'})}`:''}</small></div><button class="mini-btn secondary" data-journal-delete="${r.id}">Löschen</button></div>${r.note?`<p>${escapeHtml(r.note)}</p>`:''}${r.photo?`<img src="${r.photo}" alt="Camping-Tagebuch Foto" loading="lazy" />`:''}</article>`).join(''):'<p class="filter-note">Noch keine Tagebucheinträge.</p>';
  } catch { els.journalEntries.innerHTML='<p class="filter-note">Tagebuch konnte in diesem Browser nicht geladen werden.</p>'; }
}

const PACKING_LISTS={
  motorhome:['Fahrzeugpapiere','Führerschein','Gas prüfen','Stromkabel & Adapter','Frischwasserschlauch','Auffahrkeile','Toilettenchemie','Warndreieck & Westen','Werkzeug','Campingmöbel','Bettwäsche','Küchenausstattung'],
  caravan:['Fahrzeugpapiere','Führerschein','Anhänger-Stecker prüfen','Stützkurbel','Unterlegkeile','Stromkabel & Adapter','Frischwasserschlauch','Gas prüfen','Warndreieck & Westen','Campingmöbel','Bettwäsche','Küchenausstattung'],
  van:['Fahrzeugpapiere','Führerschein','Stromkabel','Wasserkanister','Verdunklung','Campingmöbel','Kocher','Kühlbox/Kühlschrank','Bettzeug','Powerbank','Werkzeug','Warndreieck & Westen'],
  tent:['Zelt','Heringe & Hammer','Unterlage','Schlafsäcke','Isomatten/Luftmatratze','Kocher & Gas','Kühlbox','Campingmöbel','Lampe','Powerbank','Regenkleidung','Erste Hilfe']
};
const DEPARTURE_ITEMS=['Stromkabel getrennt','Frischwasser gesichert','Abwasser/Toilette erledigt','Fenster & Dachluken geschlossen','Markise eingefahren','Stützen/Keile entfernt','Türen/Klappen verriegelt','Lose Gegenstände gesichert','Fahrräder/Träger kontrolliert','Licht/Bremsen geprüft'];
function renderPackingList() {
  const type=$('packingType')?.value||'motorhome', box=$('packingList'); if(!box)return;
  const saved=readJson(`campingfinder:packing:${type}`,{});
  box.innerHTML=PACKING_LISTS[type].map((item,i)=>`<label><input type="checkbox" data-pack-index="${i}" ${saved[i]?'checked':''}/><span>${escapeHtml(item)}</span></label>`).join('');
}
function renderDepartureList() {
  const box=$('departureList'); if(!box)return; const saved=readJson('campingfinder:departure',{});
  box.innerHTML=DEPARTURE_ITEMS.map((item,i)=>`<label><input type="checkbox" data-depart-index="${i}" ${saved[i]?'checked':''}/><span>${escapeHtml(item)}</span></label>`).join('');
}
function calculateStay() {
  const val=id=>Math.max(0,Number($(id)?.value||0)); const nights=Math.max(1,val('calcNights'));
  const total=nights*(val('calcPitch')+val('calcAdults')*val('calcAdultPrice')+val('calcChildren')*val('calcChildPrice')+val('calcDogs')*val('calcDogPrice')+val('calcElectric'));
  $('calcResult').textContent=`Gesamt: ${total.toLocaleString('de-DE',{style:'currency',currency:'EUR'})}`;
}



function budgetValue(id) { const n=Number($(id)?.value || 0); return Number.isFinite(n) ? Math.max(0,n) : 0; }
function calculateTravelBudget() {
  if (!els.budgetResult) return;
  const distance=budgetValue('budgetDistance'), consumption=budgetValue('budgetConsumption'), fuelPrice=budgetValue('budgetFuelPrice'), days=Math.max(1,budgetValue('budgetDays'));
  const camping=budgetValue('budgetCamping'), tolls=budgetValue('budgetTolls'), foodDay=budgetValue('budgetFoodDay'), extras=budgetValue('budgetExtras');
  const liters=distance*consumption/100, fuel=liters*fuelPrice, food=days*foodDay, total=fuel+camping+tolls+food+extras;
  const eur=n=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'});
  els.budgetResult.innerHTML=`<div><span>Kraftstoff</span><strong>${eur(fuel)}</strong><small>${liters.toFixed(1).replace('.',',')} l</small></div><div><span>Camping</span><strong>${eur(camping)}</strong></div><div><span>Maut/Fähre/Parken</span><strong>${eur(tolls)}</strong></div><div><span>Verpflegung</span><strong>${eur(food)}</strong></div><div><span>Extras</span><strong>${eur(extras)}</strong></div><div class="budget-total"><span>Gesamt</span><strong>${eur(total)}</strong><small>${eur(total/days)} pro Reisetag</small></div>`;
  const payload={distance,consumption,fuelPrice,days,camping,tolls,foodDay,extras};
  try{localStorage.setItem('campingfinder:travelBudget',JSON.stringify(payload));}catch{}
}
function restoreTravelBudget() {
  const b=readJson('campingfinder:travelBudget',null); if(!b)return;
  const map={budgetDistance:'distance',budgetConsumption:'consumption',budgetFuelPrice:'fuelPrice',budgetDays:'days',budgetCamping:'camping',budgetTolls:'tolls',budgetFoodDay:'foodDay',budgetExtras:'extras'};
  Object.entries(map).forEach(([id,key])=>{if($(id)&&b[key]!=null)$(id).value=b[key];});
}
async function budgetFromTrip() {
  const stages=state.trip.stages||[]; if(stages.length<2){alert('Füge mindestens zwei Etappen zur Reise hinzu.');return;}
  const btn=$('budgetFromTripBtn'); if(btn){btn.disabled=true;btn.textContent='Route wird berechnet …';}
  try{
    const coords=stages.map(p=>`${p.lon},${p.lat}`).join(';');
    const r=await fetch(`${OSRM_ENDPOINT}/${coords}?overview=false&steps=false`); if(!r.ok)throw new Error();
    const data=await r.json(); const route=data.routes?.[0]; if(!route)throw new Error();
    if(els.budgetDistance)els.budgetDistance.value=Math.round(route.distance/1000);
  }catch{
    if(els.budgetDistance)els.budgetDistance.value=Math.round(tripAirDistance()*1.2);
    alert('Straßenroute war nicht verfügbar. Für das Budget wurde eine grobe Näherung aus der Etappen-Luftlinie verwendet.');
  }finally{if(btn){btn.disabled=false;btn.textContent='Strecke aus Reise übernehmen';}calculateTravelBudget();}
}

function persistLastSearch() {
  if (!state.allPlaces.length) return;
  const makePayload = limit => ({
    savedAt: Date.now(),
    label: state.currentSearchLabel || 'Letzte Suche',
    places: state.allPlaces.slice(0, limit).map(snapshotPlace)
  });
  try {
    state.lastSearch = makePayload(400);
    localStorage.setItem('campingfinder:lastSearch', JSON.stringify(state.lastSearch));
  } catch {
    try {
      state.lastSearch = makePayload(120);
      localStorage.setItem('campingfinder:lastSearch', JSON.stringify(state.lastSearch));
    } catch { /* local storage quota can be small */ }
  }
  renderOfflineStatus();
}
function loadLastSearch(scrollToResults=true) {
  const cache=state.lastSearch || readJson('campingfinder:lastSearch',null);
  if (!cache?.places?.length) { alert('Es ist noch keine lokale Suchkopie vorhanden.'); return; }
  state.allPlaces=cache.places.map(snapshotPlace);
  state.currentSearchLabel=`${cache.label || 'Letzte Suche'} · offline gespeichert`;
  state.weather.clear();
  applyFilters(true);
  if (scrollToResults) $('mapArea')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderOfflineStatus() {
  if (els.networkStatus) {
    const online=navigator.onLine;
    els.networkStatus.textContent=online?'online':'offline';
    els.networkStatus.classList.toggle('offline',!online);
  }
  if (els.lastSearchInfo) {
    const cache=state.lastSearch || readJson('campingfinder:lastSearch',null);
    els.lastSearchInfo.textContent=cache?.places?.length
      ? `${cache.places.length} Plätze lokal gespeichert · ${new Date(cache.savedAt).toLocaleString('de-DE')}${cache.label ? ` · ${cache.label}` : ''}`
      : 'Noch keine lokale Suchkopie vorhanden.';
  }
  if (els.loadLastSearchBtn) els.loadLastSearchBtn.disabled=!(state.lastSearch?.places?.length);
}

function parseChildAges(value) {
  return String(value || '').split(/[;,\s]+/).map(v=>Number.parseInt(v,10)).filter(v=>Number.isInteger(v)&&v>=0&&v<=17).slice(0,12);
}
function childAgeEditorRawValues() {
  if (!els.familyChildAgeList) return [];
  return [...els.familyChildAgeList.querySelectorAll('.child-age-input')].map(input => String(input.value ?? '').trim()).slice(0,12);
}
function childAgeEditorValues() {
  return childAgeEditorRawValues().map(v=>Number.parseInt(v,10)).filter(v=>Number.isInteger(v)&&v>=0&&v<=17).slice(0,12);
}
function syncChildAgeHidden() {
  if (els.familyChildAges) els.familyChildAges.value = childAgeEditorValues().join(', ');
}
function renderChildAgeEditors(values = []) {
  if (!els.familyChildAgeList) return;
  const safe = (Array.isArray(values) ? values : []).slice(0,12);
  els.familyChildAgeList.innerHTML = safe.map((value,index)=>`<div class="child-age-row"><label><span>Kind ${index+1}</span><input class="child-age-input" type="number" inputmode="numeric" min="0" max="17" step="1" value="${value === '' || value == null ? '' : escapeHtml(String(value))}" placeholder="Alter" aria-label="Alter von Kind ${index+1}" /></label><button type="button" class="child-age-remove" data-child-age-remove="${index}" aria-label="Kind ${index+1} entfernen">×</button></div>`).join('');
  if (!safe.length) els.familyChildAgeList.innerHTML = '<p class="child-age-empty">Noch kein Kind eingetragen.</p>';
  syncChildAgeHidden();
}
function ageProfileLabels(ages) {
  const labels=[];
  if (ages.some(a=>a<=2)) labels.push('Baby 0–2');
  if (ages.some(a=>a>=3&&a<=5)) labels.push('Kleinkinder 3–5');
  if (ages.some(a=>a>=6&&a<=12)) labels.push('Kinder 6–12');
  if (ages.some(a=>a>=13&&a<=17)) labels.push('Jugendliche 13–17');
  return labels;
}
function readFamilyProfileForm() {
  return {
    adults: Math.max(1,Math.min(12,Number(els.familyAdults?.value||2))),
    childAges: els.familyChildAgeList ? childAgeEditorValues() : parseChildAges(els.familyChildAges?.value),
    dog: els.familyDog?.value==='yes'?'yes':'no',
    vehicle: ['motorhome','van','caravan','car','tent'].includes(els.familyVehicle?.value)?els.familyVehicle.value:'all'
  };
}
function persistFamilyProfile() {
  state.familyProfile=readFamilyProfileForm();
  localStorage.setItem('campingfinder:familyProfile',JSON.stringify(state.familyProfile));
  renderFamilyProfile();
}
function renderFamilyProfile() {
  const p=state.familyProfile;
  if (els.familyAdults) els.familyAdults.value=String(p.adults||2);
  if (els.familyChildAges) els.familyChildAges.value=(p.childAges||[]).join(', ');
  renderChildAgeEditors(p.childAges||[]);
  if (els.familyDog) els.familyDog.value=p.dog==='yes'?'yes':'no';
  if (els.familyVehicle) els.familyVehicle.value=p.vehicle||'all';
  if (els.familySummary) {
    const ages=ageProfileLabels(p.childAges||[]);
    const vehicle={all:'Camping-Art egal',motorhome:'Wohnmobil',van:'Van',caravan:'Wohnwagen',car:'Auto',tent:'Zelt'}[p.vehicle||'all'];
    els.familySummary.innerHTML=`<strong>${p.adults||2} Erwachsene${p.childAges?.length ? ` · ${p.childAges.length} Kinder` : ''}</strong><span>${ages.length?ages.join(' · '):'Keine Kinder-Altersgruppe'} · ${p.dog==='yes'?'mit Hund':'ohne Hund'} · ${vehicle}</span>`;
  }
}
function applyFamilyProfile() {
  persistFamilyProfile();
  const p=state.familyProfile, ages=p.childAges||[];
  if (els.family) els.family.checked=ages.length>0;
  if (els.baby) els.baby.checked=ages.some(a=>a<=2);
  if (els.toddler) els.toddler.checked=ages.some(a=>a>=3&&a<=5);
  if (els.children) els.children.checked=ages.some(a=>a>=6&&a<=12);
  if (els.teen) els.teen.checked=ages.some(a=>a>=13&&a<=17);
  if (els.dog) els.dog.value=p.dog==='yes'?'yes':'all';
  [els.motorhome,els.caravan,els.tents].forEach(el=>{if(el)el.checked=false;});
  if ((p.vehicle==='motorhome'||p.vehicle==='van')&&els.motorhome) els.motorhome.checked=true;
  if (p.vehicle==='caravan'&&els.caravan) els.caravan.checked=true;
  if (p.vehicle==='car'&&els.type) els.type.value='camp_site';
  if (p.vehicle==='tent'&&els.tents) els.tents.checked=true;
  if (els.routeVehicle && ['motorhome','van','caravan','car','tent'].includes(p.vehicle)) {
    els.routeVehicle.value=p.vehicle;
    localStorage.setItem('campingfinder:routeVehicle',p.vehicle);
    updateRouteLegalNotice();
  }
  if ($('calcAdults')) $('calcAdults').value=String(p.adults||2);
  if ($('calcChildren')) $('calcChildren').value=String(ages.length);
  calculateStay();
  syncQuickControls();
  applyFilters(false);
  $('finder')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function persistTrip() {
  state.trip.name=(els.tripName?.value||state.trip.name||'Meine Reise').trim()||'Meine Reise';
  state.trip.startDate=els.tripStartDate?.value||state.trip.startDate||'';
  state.trip.stages=(state.trip.stages||[]).map(stage=>({...stage,nights:Math.max(1,Number(stage?.nights||1))}));
  localStorage.setItem('campingfinder:trip',JSON.stringify(state.trip));
}
function tripAirDistance() {
  let total=0;
  for(let i=1;i<state.trip.stages.length;i++) total+=haversineKm(state.trip.stages[i-1].lat,state.trip.stages[i-1].lon,state.trip.stages[i].lat,state.trip.stages[i].lon);
  return total;
}
function addToTrip(key) {
  const place=getPlaceByKey(key); if(!place)return;
  if (state.trip.stages.some(s=>s.key===key)) { renderTrip(); return; }
  if (state.trip.stages.length>=25) { alert('Für eine Reise sind maximal 25 Etappen vorgesehen.'); return; }
  { const snap=snapshotPlace(place); snap.nights=1; state.trip.stages.push(snap); }
  persistTrip(); renderTrip(); renderResults();
}
function renderTrip() {
  if (els.tripName) els.tripName.value=state.trip.name||'Meine Reise';
  if (els.tripStartDate) els.tripStartDate.value=state.trip.startDate||'';
  const stages=state.trip.stages||[];
  if (els.tripStages) els.tripStages.innerHTML=stages.length?stages.map((p,i)=>`<article class="trip-stage" data-trip-index="${i}">
    <div class="trip-stage-number">${i+1}</div><div class="trip-stage-copy"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.typeLabel||'')}${p.address?` · ${escapeHtml(p.address)}`:''}</small><label class="trip-nights"><span>Nächte</span><input type="number" min="1" max="60" value="${Math.max(1,Number(p.nights||1))}" data-trip-nights="${i}" /></label></div>
    <div class="trip-stage-actions"><button class="mini-btn secondary" data-trip-action="up" ${i===0?'disabled':''}>↑</button><button class="mini-btn secondary" data-trip-action="down" ${i===stages.length-1?'disabled':''}>↓</button><button class="mini-btn secondary" data-trip-action="map">Karte</button><button class="mini-btn secondary" data-trip-action="details">Details</button><button class="mini-btn secondary" data-trip-action="remove">Entfernen</button></div>
  </article>`).join(''):'<div class="trip-empty">Noch keine Etappen. Füge Plätze aus Suchergebnissen oder Favoriten hinzu.</div>';
  if (els.tripSummary) {
    const km=tripAirDistance(), nights=stages.reduce((sum,p)=>sum+Math.max(1,Number(p.nights||1)),0);
    els.tripSummary.textContent=stages.length?`${stages.length} Etappe${stages.length===1?'':'n'} · ${nights} Nacht${nights===1?'':'Nächte'}${stages.length>1?` · ca. ${Math.round(km)} km Luftlinie zwischen den Etappen`:''}`:'Noch keine Etappen. Füge einen Platz aus der Trefferliste über „+ Reise“ hinzu.';
  }
  [els.tripRouteBtn,els.tripGpxBtn,els.tripKmlBtn,els.tripIcsBtn,els.tripPrintBtn].forEach(el=>{if(el)el.disabled=stages.length<(el===els.tripRouteBtn?2:1);});
  renderTravelStats();
}
async function showTripRoute() {
  const stages=state.trip.stages||[]; if(stages.length<2)return;
  const fallback=()=>{
    if(state.tripLayer) map.removeLayer(state.tripLayer);
    state.tripLayer=L.polyline(stages.map(p=>[p.lat,p.lon]),{weight:4,opacity:.72,dashArray:'8 7'}).addTo(map);
    map.fitBounds(state.tripLayer.getBounds(),{padding:[35,35]});
    els.tripSummary.textContent=`${stages.length} Etappen · Straßenroute aktuell nicht verfügbar · ${Math.round(tripAirDistance())} km Luftlinie`;
  };
  try {
    els.tripSummary.textContent='Reiseroute wird berechnet …';
    const coords=stages.map(p=>`${p.lon},${p.lat}`).join(';');
    const r=await fetch(`${OSRM_ENDPOINT}/${coords}?overview=full&geometries=geojson&steps=false`);
    if(!r.ok) throw new Error();
    const data=await r.json(); const route=data.routes?.[0]; if(!route) throw new Error();
    if(state.tripLayer) map.removeLayer(state.tripLayer);
    const points=route.geometry.coordinates.map(c=>[c[1],c[0]]);
    state.tripLayer=L.polyline(points,{weight:5,opacity:.82}).addTo(map);
    map.fitBounds(state.tripLayer.getBounds(),{padding:[35,35]});
    const mins=route.duration/60;
    els.tripSummary.textContent=`${stages.length} Etappen · ca. ${Math.round(route.distance/1000)} km · ca. ${Math.floor(mins/60)} h ${Math.round(mins%60)} min Fahrzeit*`;
    $('mapArea')?.scrollIntoView({behavior:'smooth',block:'start'});
  } catch { fallback(); }
}
function xmlEscape(v='') { return String(v).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c])); }
function safeFilename(v='Reise') { return String(v).trim().replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g,'-').replace(/^-+|-+$/g,'')||'Campingfinder-Reise'; }
function downloadText(filename,text,type='text/plain;charset=utf-8') {
  const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportTripGpx() {
  const s=state.trip.stages||[]; if(!s.length)return; const name=state.trip.name||'Campingfinder Reise';
  const wpts=s.map(p=>`<wpt lat="${p.lat}" lon="${p.lon}"><name>${xmlEscape(p.name)}</name><desc>${xmlEscape(p.typeLabel||'Campingplatz')}</desc></wpt>`).join('');
  const rte=s.map(p=>`<rtept lat="${p.lat}" lon="${p.lon}"><name>${xmlEscape(p.name)}</name></rtept>`).join('');
  const gpx=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Campingfinder" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${xmlEscape(name)}</name></metadata>${wpts}<rte><name>${xmlEscape(name)}</name>${rte}</rte></gpx>`;
  downloadText(`${safeFilename(name)}.gpx`,gpx,'application/gpx+xml;charset=utf-8');
}
function exportTripKml() {
  const s=state.trip.stages||[]; if(!s.length)return; const name=state.trip.name||'Campingfinder Reise';
  const placemarks=s.map((p,i)=>`<Placemark><name>${i+1}. ${xmlEscape(p.name)}</name><description>${xmlEscape(p.typeLabel||'Campingplatz')}</description><Point><coordinates>${p.lon},${p.lat},0</coordinates></Point></Placemark>`).join('');
  const line=s.length>1?`<Placemark><name>${xmlEscape(name)} – Etappenlinie</name><LineString><tessellate>1</tessellate><coordinates>${s.map(p=>`${p.lon},${p.lat},0`).join(' ')}</coordinates></LineString></Placemark>`:'';
  const kml=`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEscape(name)}</name>${placemarks}${line}</Document></kml>`;
  downloadText(`${safeFilename(name)}.kml`,kml,'application/vnd.google-earth.kml+xml;charset=utf-8');
}

function dateAddDays(dateString,days){
  const d=new Date(`${dateString}T12:00:00`); if(Number.isNaN(d.getTime()))return '';
  d.setDate(d.getDate()+days); return d.toISOString().slice(0,10);
}
function icsDate(dateString){ return String(dateString||'').replaceAll('-',''); }
function icsEscape(v=''){ return String(v).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }
function exportTripIcs(){
  persistTrip(); const stages=state.trip.stages||[]; if(!stages.length)return;
  if(!state.trip.startDate){ alert('Bitte zuerst einen Reisebeginn eintragen.'); els.tripStartDate?.focus(); return; }
  let offset=0;
  const events=stages.map((p,i)=>{
    const nights=Math.max(1,Number(p.nights||1)), start=dateAddDays(state.trip.startDate,offset), end=dateAddDays(start,nights); offset+=nights;
    const desc=[p.typeLabel,p.website?`Webseite: ${p.website}`:'',`Koordinaten: ${p.lat}, ${p.lon}`].filter(Boolean).join('\\n');
    return `BEGIN:VEVENT\r\nUID:campingfinder-${Date.now()}-${i}@local\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}\r\nDTSTART;VALUE=DATE:${icsDate(start)}\r\nDTEND;VALUE=DATE:${icsDate(end)}\r\nSUMMARY:${icsEscape(`${i+1}. ${p.name}`)}\r\nLOCATION:${icsEscape(p.address||`${p.lat}, ${p.lon}`)}\r\nDESCRIPTION:${icsEscape(desc)}\r\nEND:VEVENT`;
  }).join('\r\n');
  const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Campingfinder//Reiseplan//DE\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:${icsEscape(state.trip.name||'Campingfinder Reise')}\r\n${events}\r\nEND:VCALENDAR\r\n`;
  downloadText(`${safeFilename(state.trip.name||'Campingfinder-Reise')}.ics`,ics,'text/calendar;charset=utf-8');
}
function currentBudgetSnapshot(){
  const distance=budgetValue('budgetDistance'), consumption=budgetValue('budgetConsumption'), fuelPrice=budgetValue('budgetFuelPrice'), days=Math.max(1,budgetValue('budgetDays'));
  const camping=budgetValue('budgetCamping'), tolls=budgetValue('budgetTolls'), foodDay=budgetValue('budgetFoodDay'), extras=budgetValue('budgetExtras');
  const fuel=distance*consumption/100*fuelPrice, food=days*foodDay, total=fuel+camping+tolls+food+extras;
  return {distance,days,fuel,camping,tolls,food,extras,total};
}
function printTravelFolder(){
  persistTrip(); const stages=state.trip.stages||[]; if(!stages.length)return;
  const sheet=$('printTravelSheet'); if(!sheet)return;
  const b=currentBudgetSnapshot(), eur=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'}), p=state.familyProfile||{};
  let offset=0;
  const rows=stages.map((stage,i)=>{ const nights=Math.max(1,Number(stage.nights||1)); const date=state.trip.startDate?dateAddDays(state.trip.startDate,offset):''; offset+=nights; return `<tr><td>${i+1}</td><td><strong>${escapeHtml(stage.name)}</strong><br><small>${escapeHtml(stage.address||stage.typeLabel||'')}</small></td><td>${date?escapeHtml(date):'–'}</td><td>${nights}</td><td>${Number(stage.lat).toFixed(5)}, ${Number(stage.lon).toFixed(5)}</td><td>${stage.website?`<span>${escapeHtml(stage.website)}</span>`:'–'}</td></tr>`; }).join('');
  sheet.innerHTML=`<div class="print-head"><div><h1>Campingfinder</h1><p>Ganz Europa gehört dir.</p></div><strong>${escapeHtml(state.trip.name||'Meine Reise')}</strong></div><div class="print-meta"><span><strong>Reisebeginn:</strong> ${escapeHtml(state.trip.startDate||'nicht festgelegt')}</span><span><strong>Etappen:</strong> ${stages.length}</span><span><strong>Nächte:</strong> ${stages.reduce((a,x)=>a+Math.max(1,Number(x.nights||1)),0)}</span></div><h2>Reiseprofil</h2><p>${Math.max(1,Number(p.adults||2))} Erwachsene${p.childAges?.length?` · Kinder: ${p.childAges.join(', ')} Jahre`:''} · ${p.dog==='yes'?'mit Hund':'ohne Hund'} · ${escapeHtml({all:'Camping-Art offen',motorhome:'Wohnmobil',van:'Van',caravan:'Wohnwagen',car:'Auto',tent:'Zelt'}[p.vehicle||'all'])}</p><h2>Etappen</h2><table><thead><tr><th>#</th><th>Platz</th><th>Ankunft</th><th>Nächte</th><th>Koordinaten</th><th>Webseite</th></tr></thead><tbody>${rows}</tbody></table><h2>Reisebudget</h2><div class="print-budget"><span>Strecke: <strong>${Math.round(b.distance)} km</strong></span><span>Kraftstoff: <strong>${eur(b.fuel)}</strong></span><span>Camping: <strong>${eur(b.camping)}</strong></span><span>Maut/Fähre/Parken: <strong>${eur(b.tolls)}</strong></span><span>Verpflegung: <strong>${eur(b.food)}</strong></span><span>Extras: <strong>${eur(b.extras)}</strong></span><span>Gesamt: <strong>${eur(b.total)}</strong></span></div><p class="print-foot">Erstellt mit Campingfinder · © 2026 Marcel Hentschel · Platzdaten können unvollständig sein; vor der Reise Angaben beim Betreiber prüfen.</p>`;
  sheet.setAttribute('aria-hidden','false');
  window.print();
  setTimeout(()=>sheet.setAttribute('aria-hidden','true'),500);
}

async function journalReplaceAll(entries=[]) {
  const db=await openJournalDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('entries','readwrite'), store=tx.objectStore('entries'); store.clear();
    entries.slice(0,500).forEach(e=>store.add({date:e.date||'',place:e.place||'',cost:e.cost||'',rating:e.rating||'',note:e.note||'',photo:'',createdAt:e.createdAt||Date.now()}));
    tx.oncomplete=()=>{db.close();resolve();}; tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
async function exportTravelFolder() {
  let journal=[]; try { journal=(await journalAll()).map(({photo,...rest})=>rest); } catch {}
  const backup={
    app:'Campingfinder', version:1, exportedAt:new Date().toISOString(),
    familyProfile:state.familyProfile, trip:state.trip,
    favorites:[...state.favorites], favoriteSnapshots:state.favoriteSnapshots, favoriteLists:state.favoriteLists,
    personal:state.personal, lastSearch:state.lastSearch, journal
  };
  downloadText(`Campingfinder-Reisemappe-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(backup,null,2),'application/json;charset=utf-8');
}
async function importTravelFolder(file) {
  if(!file)return;
  let data; try { data=JSON.parse(await file.text()); } catch { alert('Die Datei ist keine gültige Campingfinder-Reisemappe.'); return; }
  if(data?.app!=='Campingfinder'||!data.version) { alert('Diese Datei wurde nicht als Campingfinder-Reisemappe erkannt.'); return; }
  if(!confirm('Die importierten Daten ersetzen die aktuellen lokalen Reise-, Favoriten- und Profildaten. Fortfahren?'))return;
  state.familyProfile=data.familyProfile||state.familyProfile;
  state.trip=data.trip&&Array.isArray(data.trip.stages)?data.trip:{name:'Meine Reise',startDate:'',stages:[]};
  if(state.trip.startDate==null)state.trip.startDate=''; state.trip.stages=state.trip.stages.map(stage=>({...stage,nights:Math.max(1,Number(stage?.nights||1))}));
  state.favorites=new Set(Array.isArray(data.favorites)?data.favorites:[]);
  state.favoriteSnapshots=data.favoriteSnapshots||{}; state.favoriteLists=data.favoriteLists||{'Merkliste':[]}; if(!state.favoriteLists.Merkliste)state.favoriteLists.Merkliste=[];
  state.personal=data.personal||{}; state.lastSearch=data.lastSearch||null;
  localStorage.setItem('campingfinder:familyProfile',JSON.stringify(state.familyProfile)); localStorage.setItem('campingfinder:trip',JSON.stringify(state.trip)); persistFavorites(); persistPersonal();
  if(state.lastSearch)localStorage.setItem('campingfinder:lastSearch',JSON.stringify(state.lastSearch)); else localStorage.removeItem('campingfinder:lastSearch');
  try { if(Array.isArray(data.journal))await journalReplaceAll(data.journal); } catch {}
  renderFamilyProfile(); renderTrip(); renderMyPlaces(); renderOfflineStatus(); renderJournalEntries(); updateStats(); renderResults();
  alert('Reisemappe wurde importiert.');
}

window.Campingfinder = { openDetails };

els.results.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (target) {
    const key = target.dataset.key;
    if (target.dataset.action === 'favorite') toggleFavorite(key);
    if (target.dataset.action === 'details') openDetails(key);
    if (target.dataset.action === 'share') sharePlace(key);
    if (target.dataset.action === 'trip') addToTrip(key);
    if (target.dataset.action === 'compare') toggleCompare(key);
    if (target.dataset.action === 'map') openPlaceOnMap(key);
    return;
  }
  if (e.target.closest('a, button, input, select, textarea, label')) return;
  const card = e.target.closest('.result-item[data-key]');
  if (card) selectPlaceOnMap(card.dataset.key, { openPopup:true, scrollList:false });
});
els.results.addEventListener('keydown', e => {
  if (!['Enter',' '].includes(e.key)) return;
  if (e.target.closest('a, button, input, select, textarea')) return;
  const card = e.target.closest('.result-item[data-key]');
  if (!card) return;
  e.preventDefault();
  selectPlaceOnMap(card.dataset.key, { openPopup:true, scrollList:false });
});


els.addChildAgeBtn?.addEventListener('click', () => {
  const values = els.familyChildAgeList ? childAgeEditorRawValues() : [];
  if (values.length >= 12) return;
  const next = values.filter(v=>v !== '').concat('');
  renderChildAgeEditors(next);
  const inputs = els.familyChildAgeList?.querySelectorAll('.child-age-input');
  inputs?.[inputs.length-1]?.focus();
});
els.familyChildAgeList?.addEventListener('input', e => {
  const input=e.target.closest('.child-age-input'); if(!input)return;
  let n=Number(input.value);
  if(input.value!=='' && Number.isFinite(n)){ n=Math.max(0,Math.min(17,Math.round(n))); input.value=String(n); }
  syncChildAgeHidden();
});
els.familyChildAgeList?.addEventListener('click', e => {
  const btn=e.target.closest('[data-child-age-remove]'); if(!btn)return;
  const idx=Number(btn.dataset.childAgeRemove);
  const values=childAgeEditorRawValues();
  if(Number.isInteger(idx)){ values.splice(idx,1); renderChildAgeEditors(values); }
});
els.saveFamilyProfile?.addEventListener('click', persistFamilyProfile);
els.applyFamilyProfile?.addEventListener('click', applyFamilyProfile);
els.tripName?.addEventListener('change',()=>{persistTrip();renderTrip();});
els.tripStartDate?.addEventListener('change',()=>{persistTrip();renderTrip();});
els.tripRouteBtn?.addEventListener('click',showTripRoute);
els.tripGpxBtn?.addEventListener('click',exportTripGpx);
els.tripKmlBtn?.addEventListener('click',exportTripKml);
els.tripIcsBtn?.addEventListener('click',exportTripIcs);
els.tripPrintBtn?.addEventListener('click',printTravelFolder);
els.tripClearBtn?.addEventListener('click',()=>{
  if(!state.trip.stages.length)return;
  if(!confirm('Alle Etappen aus der aktuellen Reise entfernen?'))return;
  state.trip.stages=[]; persistTrip();
  if(state.tripLayer){map.removeLayer(state.tripLayer);state.tripLayer=null;}
  renderTrip(); renderResults();
});
els.tripStages?.addEventListener('click',e=>{
  const btn=e.target.closest('[data-trip-action]'); if(!btn)return;
  const row=btn.closest('[data-trip-index]'); const i=Number(row?.dataset.tripIndex); if(!Number.isInteger(i))return;
  const action=btn.dataset.tripAction, stages=state.trip.stages;
  if(action==='remove') stages.splice(i,1);
  if(action==='up'&&i>0) [stages[i-1],stages[i]]=[stages[i],stages[i-1]];
  if(action==='down'&&i<stages.length-1) [stages[i+1],stages[i]]=[stages[i],stages[i+1]];
  if(action==='map') openPlaceOnMap(stages[i].key);
  if(action==='details') openDetails(stages[i].key);
  if(['remove','up','down'].includes(action)){persistTrip();renderTrip();renderResults();}
});
els.tripStages?.addEventListener('change',e=>{
  const input=e.target.closest('[data-trip-nights]'); if(!input)return;
  const i=Number(input.dataset.tripNights); if(!Number.isInteger(i)||!state.trip.stages[i])return;
  state.trip.stages[i].nights=Math.max(1,Math.min(60,Number(input.value||1))); input.value=String(state.trip.stages[i].nights); persistTrip(); renderTrip(); updateStats();
});
els.loadLastSearchBtn?.addEventListener('click',()=>loadLastSearch(true));
els.exportTravelFolderBtn?.addEventListener('click',exportTravelFolder);
els.importTravelFolderInput?.addEventListener('change',async e=>{const file=e.target.files?.[0];await importTravelFolder(file);e.target.value='';});
window.addEventListener('online',renderOfflineStatus);
window.addEventListener('offline',renderOfflineStatus);
map.on('zoomend',()=>renderMarkers());

const filterEls = [els.adult,els.fkk,els.family,els.baby,els.toddler,els.children,els.teen,els.website,els.dog,els.fee,els.stars,els.location,els.style,els.price,els.sort,els.electric,els.water,els.toilet,els.shower,els.dump,els.wifi,els.wheelchair,els.motorhome,els.caravan,els.tents,els.cabins,els.greyWater,els.chemicalToilet,els.playground,els.pool,els.laundry,els.privateBathroom,els.sauna,els.privateHotTub,els.privatePool,els.kidsBath,els.babyBath,els.rentalCaravan,els.rentalTent,els.bungalow,els.indoorPool,els.heatedPool,els.paddlingPool,els.waterPark,els.kidsClub,els.teenClub,els.animation,els.restaurant,els.breadService,els.supermarket,els.directBeach,els.privateBeach,els.lakeAccess,els.fishing,els.bikeRental,els.ebikeCharge,els.gasExchange,els.evCharge,els.yearRound,els.accessibleSanitary,els.washingMachine,els.dryer,els.pitchSize,els.pitchExposure].filter(Boolean);
filterEls.forEach(el => el.addEventListener('change', () => { applyFilters(false); syncQuickControls(); }));
els.resetFilters.addEventListener('click', () => {
  [els.adult,els.fkk,els.family,els.baby,els.toddler,els.children,els.teen,els.website,els.electric,els.water,els.toilet,els.shower,els.dump,els.wifi,els.wheelchair,els.motorhome,els.caravan,els.tents,els.cabins,els.greyWater,els.chemicalToilet,els.playground,els.pool,els.laundry,els.privateBathroom,els.sauna,els.privateHotTub,els.privatePool,els.kidsBath,els.babyBath,els.rentalCaravan,els.rentalTent,els.bungalow,els.indoorPool,els.heatedPool,els.paddlingPool,els.waterPark,els.kidsClub,els.teenClub,els.animation,els.restaurant,els.breadService,els.supermarket,els.directBeach,els.privateBeach,els.lakeAccess,els.fishing,els.bikeRental,els.ebikeCharge,els.gasExchange,els.evCharge,els.yearRound,els.accessibleSanitary,els.washingMachine,els.dryer].filter(Boolean).forEach(el => { el.checked = false; });
  if (els.pitchSize) els.pitchSize.value = '0';
  if (els.pitchExposure) els.pitchExposure.value = 'all';
  els.dog.value = 'all';
  els.fee.value = 'all';
  els.stars.value = '0';
  els.location.value = 'all';
  if (els.style) els.style.value = 'all';
  if (els.price) els.price.value = 'all';
  els.sort.value = 'name';
  state.favoritesOnly = false;
  els.favoritesOnly.setAttribute('aria-pressed', 'false');
  els.favoritesOnly.textContent = '☆ Favoriten';
  applyFilters(false); syncQuickControls();
});
els.countryBtn.addEventListener('click', searchCountry);
els.mapBtn.addEventListener('click', searchMapArea);
els.nearMe?.addEventListener('click', searchNearMe);
els.routeBtn?.addEventListener('click', searchRoute);
els.routeVehicle?.addEventListener('change',()=>{localStorage.setItem('campingfinder:routeVehicle',els.routeVehicle.value);updateRouteLegalNotice();});
$('routeSwapBtn')?.addEventListener('click',()=>{const a=els.routeStart?.value||'',b=els.routeEnd?.value||'';if(els.routeStart)els.routeStart.value=b;if(els.routeEnd)els.routeEnd.value=a;const sel=state.routeSelections.start;state.routeSelections.start=state.routeSelections.end;state.routeSelections.end=sel;const rs=els.routeStartResolved?.textContent||'',re=els.routeEndResolved?.textContent||'';if(els.routeStartResolved)els.routeStartResolved.textContent=re;if(els.routeEndResolved)els.routeEndResolved.textContent=rs;});
$('routeUseLocationBtn')?.addEventListener('click',()=>{const btn=$('routeUseLocationBtn');if(!navigator.geolocation){alert('Standortfunktion ist in diesem Browser nicht verfügbar.');return;}if(btn){btn.disabled=true;btn.textContent='Standort wird bestimmt …';}navigator.geolocation.getCurrentPosition(pos=>{if(els.routeStart)els.routeStart.value=`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;state.routeSelections.start={lat:pos.coords.latitude,lon:pos.coords.longitude,name:'Eigener Standort',type:'location'};if(els.routeStartResolved){els.routeStartResolved.textContent='✓ Eigener Standort';els.routeStartResolved.classList.add('ok');els.routeStartResolved.classList.remove('warn');}if(btn){btn.disabled=false;btn.textContent='Eigenen Standort als Start';}},()=>{if(btn){btn.disabled=false;btn.textContent='Eigenen Standort als Start';}alert('Standort konnte nicht bestimmt werden.');},{timeout:10000,maximumAge:300000});});
els.mapLayer?.addEventListener('change', () => switchMapLayer(els.mapLayer.value));
els.fitBtn.addEventListener('click', () => fitResults({ clearSelection:true }));
els.closeDialog.addEventListener('click', () => els.dialog.close());
els.dialog.addEventListener('click', e => { if (e.target === els.dialog) els.dialog.close(); });
els.place.addEventListener('keydown', e => { if (e.key === 'Enter') searchCountry(); });
els.type?.addEventListener('change', () => { applyFilters(false); syncQuickControls(); });
els.favoritesOnly.addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  els.favoritesOnly.setAttribute('aria-pressed', String(state.favoritesOnly));
  els.favoritesOnly.textContent = state.favoritesOnly ? '★ Nur Favoriten' : '☆ Favoriten';
  applyFilters(false);
});

els.placeChoiceOptions?.addEventListener('click', e => {
  const btn=e.target.closest('[data-place-choice]');
  if(!btn || !placeChoicePending) return;
  const idx=Number(btn.dataset.placeChoice);
  const candidate=placeChoicePending.candidates[idx];
  if(!candidate) return;
  const { resolve }=placeChoicePending;
  placeChoicePending=null;
  if(els.placeChoiceDialog?.open) els.placeChoiceDialog.close();
  resolve(candidate);
});
els.closePlaceChoiceBtn?.addEventListener('click', cancelPlaceChoice);
els.placeChoiceDialog?.addEventListener('cancel', e => { e.preventDefault(); cancelPlaceChoice(); });
els.placeChoiceDialog?.addEventListener('click', e => { if(e.target===els.placeChoiceDialog) cancelPlaceChoice(); });
els.routeStart?.addEventListener('input', () => scheduleRouteSuggestions('start'));
els.routeEnd?.addEventListener('input', () => scheduleRouteSuggestions('end'));
[els.routeStartSuggestions, els.routeEndSuggestions].forEach(list => list?.addEventListener('click', e => {
  const btn=e.target.closest('[data-route-choice]'); if(!btn)return;
  const which=btn.dataset.routeChoice; const idx=Number(btn.dataset.index); const candidates=list._candidates||[];
  if(candidates[idx]) selectRouteCandidate(which,candidates[idx]);
}));
document.addEventListener('click', e => {
  if (!e.target.closest('.route-location-field')) { if(els.routeStartSuggestions)els.routeStartSuggestions.hidden=true; if(els.routeEndSuggestions)els.routeEndSuggestions.hidden=true; }
});
els.routeEnd?.addEventListener('keydown', e => { if (e.key === 'Enter') searchRoute(); });
els.language?.addEventListener('change', () => applyLanguage(els.language.value));
els.addList?.addEventListener('click', () => {
  const name=els.newListName.value.trim(); if(!name)return;
  if (!state.favoriteLists[name]) state.favoriteLists[name]=[];
  els.newListName.value=''; persistFavorites(); renderMyPlaces();
});
els.refreshMyPlaces?.addEventListener('click', renderMyPlaces);
els.favoriteLists?.addEventListener('click', e => { const t=e.target.closest('[data-saved-action]'); if(t)handleSavedAction(t); });
els.visitedPlaces?.addEventListener('click', e => { const t=e.target.closest('[data-saved-action]'); if(t)handleSavedAction(t); });

els.journalForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const file=$('journalPhoto')?.files?.[0] || null;
  let photo='';
  try { photo=await compressPhoto(file); } catch { photo=''; }
  await journalAdd({date:$('journalDate').value,place:$('journalPlace').value.trim(),cost:$('journalCost').value,rating:$('journalRating').value,note:$('journalNote').value.trim(),photo,createdAt:Date.now()});
  els.journalForm.reset(); $('journalDate').value=new Date().toISOString().slice(0,10); renderJournalEntries(); updateStats();
});
els.journalEntries?.addEventListener('click', async e => { const t=e.target.closest('[data-journal-delete]'); if(!t)return; await journalDelete(t.dataset.journalDelete); renderJournalEntries(); updateStats(); });

$('packingType')?.addEventListener('change', renderPackingList);
$('packingList')?.addEventListener('change', e => { const t=e.target.closest('[data-pack-index]'); if(!t)return; const type=$('packingType').value, saved=readJson(`campingfinder:packing:${type}`,{}); saved[t.dataset.packIndex]=t.checked; localStorage.setItem(`campingfinder:packing:${type}`,JSON.stringify(saved)); });
$('departureList')?.addEventListener('change', e => { const t=e.target.closest('[data-depart-index]'); if(!t)return; const saved=readJson('campingfinder:departure',{}); saved[t.dataset.departIndex]=t.checked; localStorage.setItem('campingfinder:departure',JSON.stringify(saved)); });
$('resetDepartureBtn')?.addEventListener('click', () => { localStorage.removeItem('campingfinder:departure'); renderDepartureList(); });
['calcNights','calcPitch','calcAdults','calcAdultPrice','calcChildren','calcChildPrice','calcDogs','calcDogPrice','calcElectric'].forEach(id => $(id)?.addEventListener('input', calculateStay));
['budgetDistance','budgetConsumption','budgetFuelPrice','budgetDays','budgetCamping','budgetTolls','budgetFoodDay','budgetExtras'].forEach(id => $(id)?.addEventListener('input', calculateTravelBudget));
$('budgetFromTripBtn')?.addEventListener('click',budgetFromTrip);
$('budgetResetBtn')?.addEventListener('click',()=>{localStorage.removeItem('campingfinder:travelBudget');[['budgetDistance',1000],['budgetConsumption',8],['budgetFuelPrice',1.75],['budgetDays',7],['budgetCamping',210],['budgetTolls',0],['budgetFoodDay',40],['budgetExtras',0]].forEach(([id,v])=>{if($(id))$(id).value=v;});calculateTravelBudget();});
$('emergencyLocationBtn')?.addEventListener('click', () => {
  const out=$('emergencyLocation'); if(!navigator.geolocation){out.textContent='Standortfunktion nicht verfügbar.';return;}
  out.textContent='Standort wird bestimmt …';
  navigator.geolocation.getCurrentPosition(pos=>{ const lat=pos.coords.latitude.toFixed(6),lon=pos.coords.longitude.toFixed(6); out.innerHTML=`${lat}, ${lon}<br><a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}" target="_blank" rel="noopener">Position auf Karte öffnen ↗</a>`; },()=>{out.textContent='Standort konnte nicht bestimmt werden.';},{timeout:10000});
});


document.querySelectorAll('[data-site-type]').forEach(btn => btn.addEventListener('click', () => {
  if (!els.type) return;
  els.type.value=btn.dataset.siteType || 'all';
  applyFilters(false); syncQuickControls();
}));
document.querySelectorAll('[data-filter-toggle]').forEach(btn => btn.addEventListener('click', () => {
  const target=$(btn.dataset.filterToggle); if(!target)return;
  target.checked=!target.checked; target.dispatchEvent(new Event('change',{bubbles:true}));
}));
document.querySelectorAll('[data-filter-value]').forEach(btn => btn.addEventListener('click', () => {
  const [id,value]=String(btn.dataset.filterValue||'').split(':'); const target=$(id); if(!target)return;
  target.value=target.value===value?'all':value; target.dispatchEvent(new Event('change',{bubbles:true}));
}));
document.querySelectorAll('[data-style-value]').forEach(btn => btn.addEventListener('click', () => {
  if(!els.style)return; const value=btn.dataset.styleValue; els.style.value=els.style.value===value?'all':value; els.style.dispatchEvent(new Event('change',{bubbles:true}));
}));
els.shareSearchBtn?.addEventListener('click',openShareSearch);
$('copyShareUrlBtn')?.addEventListener('click',copyShareUrl);
$('closeShareBtn')?.addEventListener('click',()=>els.shareDialog?.close());
els.shareDialog?.addEventListener('click',e=>{if(e.target===els.shareDialog)els.shareDialog.close();});
els.smartSearchBtn?.addEventListener('click',applySmartSearchText);
els.smartSearchInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applySmartSearchText();}});
els.filterCategoryJump?.addEventListener('change',()=>{const value=els.filterCategoryJump.value;if(!value)return;const target=$(`filter-${value}`);const details=document.querySelector('.filters');if(details&&!details.open)details.open=true;target?.scrollIntoView({behavior:'smooth',block:'center'});els.filterCategoryJump.value='';});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();els.smartSearchInput?.focus();els.smartSearchInput?.select();}});
$('themeToggle')?.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
$('compareOpenBtn')?.addEventListener('click',openCompare);
$('compareClearBtn')?.addEventListener('click',()=>{state.compare.clear();state.compareSnapshots={};persistCompare();updateCompareBar();renderResults();});
$('closeCompareBtn')?.addEventListener('click',()=>$('compareDialog')?.close());
$('compareDialog')?.addEventListener('click',e=>{if(e.target===$('compareDialog'))$('compareDialog').close();});
document.querySelectorAll('[data-legal]').forEach(btn=>btn.addEventListener('click',()=>openLegal(btn.dataset.legal)));
$('closeLegalBtn')?.addEventListener('click',()=>$('legalDialog')?.close());
$('legalDialog')?.addEventListener('click',e=>{if(e.target===$('legalDialog'))$('legalDialog').close();});

document.querySelectorAll('.mobile-view-toggle [data-mobile-view]').forEach(btn => btn.addEventListener('click', () => {
  const area=$('mapArea'); if(!area)return;
  const mode=btn.dataset.mobileView || 'list';
  area.dataset.mobileView=mode;
  area.querySelectorAll('.mobile-view-toggle button').forEach(b=>b.classList.toggle('active',b.dataset.mobileView===mode));
  if(mode==='map') setTimeout(()=>map.invalidateSize(),80);
}));

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.deferredInstall = e;
  els.install.hidden = false;
});
els.install.addEventListener('click', async () => {
  if (!state.deferredInstall) return;
  state.deferredInstall.prompt();
  await state.deferredInstall.userChoice;
  state.deferredInstall = null;
  els.install.hidden = true;
});
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

if (els.routeVehicle) {
  const savedRouteVehicle=localStorage.getItem('campingfinder:routeVehicle');
  const profileVehicle=state.familyProfile?.vehicle;
  els.routeVehicle.value=['motorhome','van','caravan','car','tent'].includes(savedRouteVehicle) ? savedRouteVehicle : (['motorhome','van','caravan','car','tent'].includes(profileVehicle) ? profileVehicle : 'motorhome');
}
updateRouteLegalNotice();

restoreTravelBudget();
calculateTravelBudget();
initTheme();
syncQuickControls();
updateCompareBar();
applyLanguage(state.language);
renderFamilyProfile();
renderTrip();
renderOfflineStatus();
renderMyPlaces();
renderJournalEntries();
renderPackingList();
renderDepartureList();
calculateStay();
if ($('journalDate') && !$('journalDate').value) $('journalDate').value=new Date().toISOString().slice(0,10);
if (!navigator.onLine && state.lastSearch?.places?.length && !state.allPlaces.length) loadLastSearch(false);
const sharedAutoSearch=restoreSharedSearchFromUrl();
if(sharedAutoSearch && navigator.onLine) setTimeout(()=>searchCountry(),180);
updateStats();
