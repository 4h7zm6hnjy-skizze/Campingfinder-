/* Campingfinder v33.0 direct-loader guard */
if (!window.__CAMPINGFINDER_V31_LOADED__) {
  window.__CAMPINGFINDER_V31_LOADED__ = '33.0.0';
/* Campingfinder v31 – lokale Browser-KI + vereinfachte Bedienstruktur
   Die vorhandene v30-Logik bleibt unangetastet.
   Keine API-Schlüssel. WebLLM wird erst geladen, wenn der Nutzer die KI-Suche startet.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const finder = $('finder');
  const smartBox = document.querySelector('.smart-search-box');
  const smartInput = $('smartSearchInput');
  const legacySmartBtn = $('smartSearchBtn');
  const filtersDetails = document.querySelector('.filters');
  const filterBar = document.querySelector('.filter-bar');

  if (!finder || !smartBox || !smartInput) return;

  document.body.classList.add('v31-ui','v31-mode-ai');

  /* ---------- Hauptreihenfolge vereinfachen ---------- */
  const shell = document.querySelector('main.shell');
  const route = $('routePlanner');
  const trip = $('tripPlanner');
  const mapArea = $('mapArea');
  const stats = document.querySelector('.stats');

  if (shell && mapArea) {
    const discoveryRow = document.querySelector('.discovery-row');
    if (discoveryRow) {
      discoveryRow.insertAdjacentElement('afterend', mapArea);
    } else if (route) {
      shell.insertBefore(mapArea, route);
    }
    if (stats && route) shell.insertBefore(stats, route);
  }

  /* ---------- Kompakte Hauptnavigation ---------- */
  const hero = document.querySelector('.hero');
  if (hero && !document.querySelector('.v31-quick-hub')) {
    const hub = document.createElement('section');
    hub.className = 'v31-quick-hub';
    hub.setAttribute('aria-label','Campingfinder Schnellzugriff');
    hub.innerHTML = `
      <button type="button" data-v31-go="finder"><span class="v31-quick-icon">⌕</span><strong>Finden</strong><small>KI oder klassisch</small></button>
      <button type="button" data-v31-go="mapArea"><span class="v31-quick-icon">⌖</span><strong>Karte</strong><small>Treffer ansehen</small></button>
      <button type="button" data-v31-go="routePlanner"><span class="v31-quick-icon">↗</span><strong>Route</strong><small>Stopps planen</small></button>
      <button type="button" data-v31-go="tripPlanner"><span class="v31-quick-icon">↝</span><strong>Reise</strong><small>Etappen sammeln</small></button>
      <button type="button" data-v31-go="myPlaces"><span class="v31-quick-icon">☆</span><strong>Meine Plätze</strong><small>Favoriten & Tagebuch</small></button>
      <button type="button" data-v31-go="helpers"><span class="v31-quick-icon">☷</span><strong>Helfer</strong><small>Budget & Checklisten</small></button>`;
    hero.insertAdjacentElement('afterend', hub);
    hub.addEventListener('click', e => {
      const btn = e.target.closest('[data-v31-go]');
      if (!btn) return;
      $(btn.dataset.v31Go)?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  /* ---------- KI / Klassisch Umschalter ---------- */
  let switcher = document.querySelector('.v31-mode-switch');
  if (!switcher) {
    switcher = document.createElement('div');
    switcher.className = 'v31-mode-switch';
    switcher.innerHTML = `
      <button type="button" class="active" data-v31-mode="ai">KI-Suche</button>
      <button type="button" data-v31-mode="classic">Klassische Suche</button>
      <button type="button" class="v31-filter-open">Alle Filter</button>`;
    finder.insertBefore(switcher, finder.firstChild);
  }

  const oldRow = smartBox.querySelector('.smart-search-row');
  const oldFeedback = $('smartSearchFeedback');
  if (oldRow) oldRow.style.display = 'none';

  let aiPanel = smartBox.querySelector('.v31-ai-panel');
  if (!aiPanel) {
    aiPanel = document.createElement('div');
    aiPanel.className = 'v31-ai-panel';
    aiPanel.innerHTML = `
      <div class="v31-ai-head">
        <div class="v31-ai-title">
          <strong>Beschreibe einfach deinen Campingwunsch</strong>
          <span>Die KI übersetzt deinen Satz in die vorhandenen Campingfinder-Filter.</span>
        </div>
        <span class="v31-ai-badge">lokal · ohne API-Key</span>
      </div>
      <div class="v31-ai-actions">
        <input id="v31AiInput" type="search" autocomplete="off"
          placeholder="z. B. Frankreich am Meer, familienfreundlich, Pool, Hund erlaubt" />
        <button id="v31AiSearchBtn" class="primary-btn" type="button">Mit KI suchen</button>
      </div>
      <div id="v31AiStatus" class="v31-ai-status" aria-live="polite">Bereit.</div>
      <div class="v31-ai-progress" aria-hidden="true"><span id="v31AiProgress"></span></div>
      <p class="v31-ai-hint"><strong>Fallback:</strong> Falls Browser-KI nicht verfügbar ist, nutzt Campingfinder die lokale intelligente Suche.</p>`;
    smartBox.insertBefore(aiPanel, oldFeedback || null);
  }

  const aiInput = $('v31AiInput');
  const aiBtn = $('v31AiSearchBtn');
  const aiStatus = $('v31AiStatus');
  const aiProgress = $('v31AiProgress');

  function setMode(mode) {
    const ai = mode !== 'classic';
    document.body.classList.toggle('v31-mode-ai', ai);
    document.body.classList.toggle('v31-mode-classic', !ai);
    switcher.querySelectorAll('[data-v31-mode]').forEach(b =>
      b.classList.toggle('active', b.dataset.v31Mode === (ai ? 'ai' : 'classic'))
    );
    localStorage.setItem('campingfinder:v31SearchMode', ai ? 'ai' : 'classic');
  }

  switcher.addEventListener('click', e => {
    const modeBtn = e.target.closest('[data-v31-mode]');
    if (modeBtn) {
      setMode(modeBtn.dataset.v31Mode);
      (modeBtn.dataset.v31Mode === 'ai' ? aiInput : $('placeInput'))?.focus();
      return;
    }
    if (e.target.closest('.v31-filter-open')) {
      if (filtersDetails) filtersDetails.open = true;
      filterBar?.classList.add('v31-filter-focus');
      filterBar?.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(() => filterBar?.classList.remove('v31-filter-focus'), 1200);
    }
  });

  setMode(localStorage.getItem('campingfinder:v31SearchMode') || 'ai');

  /* Route bleibt auf Mobil sichtbar – kein Punkt fällt weg. */
  const mobileNav = document.querySelector('.mobile-bottom-nav');
  if (mobileNav && !mobileNav.querySelector('a[href="#routePlanner"]')) {
    const a = document.createElement('a');
    a.href = '#routePlanner';
    a.innerHTML = '<span>↗</span><small>Route</small>';
    const tripLink = mobileNav.querySelector('a[href="#tripPlanner"]');
    mobileNav.insertBefore(a, tripLink || null);
  }

  /* ---------- WebLLM ---------- */
  let webllm = null;
  let engine = null;
  let enginePromise = null;
  let currentModel = '';

  const setStatus = (text, cls='') => {
    aiStatus.textContent = text;
    aiStatus.className = 'v31-ai-status' + (cls ? ' ' + cls : '');
  };
  const setProgress = pct => {
    if (aiProgress) aiProgress.style.width = Math.max(0,Math.min(100,pct || 0)) + '%';
  };

  function modelId(item) {
    return String(item?.model_id || item?.model || item?.name || '');
  }

  async function ensureEngine() {
    if (engine) return engine;
    if (enginePromise) return enginePromise;
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU wird auf diesem Gerät oder Browser nicht angeboten.');
    }

    enginePromise = (async () => {
      setStatus('Browser-KI wird geladen …','busy');
      setProgress(3);

      webllm = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm');
      const models = webllm?.prebuiltAppConfig?.model_list || [];

      const preferences = [
        /qwen.*0\.5.*instruct/i,
        /qwen.*1\.5.*instruct/i,
        /llama.*1b.*instruct/i,
        /smollm.*instruct/i,
        /phi.*mini/i
      ];

      let chosen = null;
      for (const pattern of preferences) {
        chosen = models.find(m => pattern.test(modelId(m)));
        if (chosen) break;
      }
      chosen ||= models.find(m => /instruct/i.test(modelId(m)));
      if (!chosen) throw new Error('Kein geeignetes kleines Browser-Modell gefunden.');

      currentModel = modelId(chosen);
      setStatus('KI-Modell wird beim ersten Start eingerichtet …','busy');

      const opts = {
        initProgressCallback: report => {
          const p = Number(report?.progress ?? 0);
          if (Number.isFinite(p)) setProgress(Math.round(p * 100));
          if (report?.text) {
            setStatus(String(report.text).replace(/\s+/g,' ').trim(),'busy');
          }
        }
      };

      if (webllm.CreateMLCEngine) {
        engine = await webllm.CreateMLCEngine(currentModel, opts);
      } else if (webllm.MLCEngine) {
        engine = new webllm.MLCEngine(opts);
        await engine.reload(currentModel);
      } else {
        throw new Error('WebLLM konnte nicht initialisiert werden.');
      }

      setProgress(100);
      setStatus('KI ist bereit. Die Auswertung erfolgt lokal im Browser.');
      return engine;
    })().catch(err => {
      enginePromise = null;
      engine = null;
      throw err;
    });

    return enginePromise;
  }

  /* Nur bereits vorhandene Filter-IDs sind erlaubt. */
  const filterIds = new Set([
    'adultOnlyFilter','fkkFilter','familyFilter','websiteFilter','dogFilter','feeFilter',
    'starsFilter','locationFilter','styleFilter','priceFilter','sortSelect',
    'babyFilter','toddlerFilter','childrenFilter','teenFilter',
    'electricFilter','waterFilter','toiletFilter','showerFilter','dumpFilter','wifiFilter',
    'wheelchairFilter','motorhomeFilter','caravanFilter','tentsFilter','cabinsFilter',
    'greyWaterFilter','chemicalToiletFilter','playgroundFilter','poolFilter','laundryFilter',
    'privateBathroomFilter','saunaFilter','privateHotTubFilter','privatePoolFilter',
    'kidsBathFilter','babyBathFilter','rentalCaravanFilter','rentalTentFilter','bungalowFilter',
    'indoorPoolFilter','heatedPoolFilter','paddlingPoolFilter','waterParkFilter',
    'kidsClubFilter','teenClubFilter','animationFilter','restaurantFilter','breadServiceFilter',
    'supermarketFilter','gasExchangeFilter','directBeachFilter','privateBeachFilter',
    'lakeAccessFilter','fishingFilter','bikeRentalFilter','ebikeChargeFilter','evChargeFilter',
    'yearRoundFilter','accessibleSanitaryFilter','washingMachineFilter','dryerFilter',
    'pitchSizeFilter','pitchExposureFilter'
  ]);

  function parseJsonLoose(text) {
    const raw = String(text || '').trim();
    const cleaned = raw
      .replace(/^```(?:json)?/i,'')
      .replace(/```$/,'')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('KI-Antwort konnte nicht gelesen werden.');
    return JSON.parse(cleaned.slice(start,end+1));
  }

  function resetSearchFilters() {
    $('resetFiltersBtn')?.click();
    if ($('placeInput')) $('placeInput').value = '';
    if ($('typeSelect')) $('typeSelect').value = 'all';
  }

  function applyPlan(plan, originalText) {
    resetSearchFilters();

    const country = $('countrySelect');
    if (plan?.countryCode && country) {
      const cc = String(plan.countryCode).toUpperCase();
      if ([...country.options].some(o => o.value === cc)) country.value = cc;
    }

    if (typeof plan?.place === 'string' && $('placeInput')) {
      $('placeInput').value = plan.place.trim();
    }

    if (['all','camp_site','caravan_site'].includes(plan?.siteType) && $('typeSelect')) {
      $('typeSelect').value = plan.siteType;
    }

    const filters = plan?.filters && typeof plan.filters === 'object' ? plan.filters : {};
    for (const [id,value] of Object.entries(filters)) {
      if (!filterIds.has(id)) continue;
      const el = $(id);
      if (!el) continue;

      if (el.type === 'checkbox') {
        el.checked = Boolean(value);
      } else {
        const v = String(value);
        if ([...el.options].some(o => o.value === v)) el.value = v;
      }
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }

    if (Number.isFinite(Number(plan?.radiusKm)) && $('nearRadius')) {
      const wanted = Number(plan.radiusKm) * 1000;
      const options = [...$('nearRadius').options].map(o => Number(o.value));
      const nearest = options.reduce((a,b) =>
        Math.abs(b-wanted) < Math.abs(a-wanted) ? b : a, options[0]
      );
      $('nearRadius').value = String(nearest);
    }

    smartInput.value = originalText;

    if (Boolean(plan?.nearMe) && $('nearMeBtn')) {
      $('nearMeBtn').click();
    } else if (($('countrySelect')?.value || $('placeInput')?.value.trim()) && $('countrySearchBtn')) {
      $('countrySearchBtn').click();
    } else {
      legacySmartBtn?.click();
    }
  }


  function currentFamilyProfileForAI() {
    const p = (typeof state !== 'undefined' && state.familyProfile) ? state.familyProfile : {};
    const adults = Math.max(1, Number(p.adults || 2));
    const childAges = Array.isArray(p.childAges)
      ? p.childAges.map(Number).filter(Number.isFinite)
      : [];
    const dog = p.dog === 'yes' ? 'yes' : 'no';
    const vehicle = ['motorhome','van','caravan','car','tent','all'].includes(p.vehicle)
      ? p.vehicle
      : 'all';
    return { adults, childAges, dog, vehicle };
  }

  function profileUseEnabled() {
    const toggle = document.getElementById('v31UseProfile');
    return toggle ? toggle.checked : true;
  }

  function familyProfileSummaryForAI() {
    const p = currentFamilyProfileForAI();
    const parts = [
      `${p.adults} Erwachsene`,
      p.childAges.length ? `Kinder: ${p.childAges.join(', ')} Jahre` : 'keine Kinder',
      p.dog === 'yes' ? 'mit Hund' : 'ohne Hund'
    ];
    const vehicleLabel = {
      all:'Camping-Art offen',
      motorhome:'Wohnmobil',
      van:'Van / Campervan',
      caravan:'Wohnwagen',
      car:'Auto',
      tent:'Zelt'
    }[p.vehicle] || 'Camping-Art offen';
    parts.push(vehicleLabel);
    return parts.join(' · ');
  }

  function mergeFamilyProfileIntoPlan(plan, originalText='') {
    if (!profileUseEnabled()) return plan || {};
    const p = currentFamilyProfileForAI();
    const merged = {
      ...(plan || {}),
      filters: { ...((plan && plan.filters) || {}) }
    };

    const normalized = String(originalText || '').toLowerCase();
    const explicitlyWithoutDog = /\b(ohne hund|keine hunde|hunde verboten)\b/i.test(normalized);
    const explicitlyWithDog = /\b(mit hund|hund erlaubt|hundefreundlich)\b/i.test(normalized);

    if (p.childAges.length) {
      merged.filters.familyFilter = true;
      if (p.childAges.some(a => a <= 2)) merged.filters.babyFilter = true;
      if (p.childAges.some(a => a >= 3 && a <= 5)) merged.filters.toddlerFilter = true;
      if (p.childAges.some(a => a >= 6 && a <= 12)) merged.filters.childrenFilter = true;
      if (p.childAges.some(a => a >= 13 && a <= 17)) merged.filters.teenFilter = true;
      if (!/\b(nur erwachsene|adults only|adult only|18\+)\b/i.test(normalized)) {
        merged.filters.adultOnlyFilter = false;
      }
    }

    if (p.dog === 'yes' && !explicitlyWithoutDog) merged.filters.dogFilter = 'yes';
    if (explicitlyWithoutDog) merged.filters.dogFilter = 'no';
    if (explicitlyWithDog) merged.filters.dogFilter = 'yes';

    const explicitVehicle =
      /\b(wohnwagen|caravan|wohnmobil|motorhome|campervan|van|zelt|tent)\b/i.test(normalized);

    if (!explicitVehicle) {
      if (p.vehicle === 'motorhome' || p.vehicle === 'van') merged.filters.motorhomeFilter = true;
      if (p.vehicle === 'caravan') merged.filters.caravanFilter = true;
      if (p.vehicle === 'tent') merged.filters.tentsFilter = true;
    }

    return merged;
  }

  async function interpretWithAI(text) {
    const e = await ensureEngine();
    setStatus('Wunsch wird lokal ausgewertet …','busy');

    const response = await e.chat.completions.create({
      temperature: 0.1,
      max_tokens: 650,
      messages: [
        {
          role:'system',
          content:
`Du bist der lokale Suchparser einer Camping-Webapp.
Antworte ausschließlich mit gültigem JSON ohne Markdown.

Schema:
{"countryCode":"","place":"","siteType":"all","nearMe":false,"radiusKm":25,"filters":{}}

Regeln:
- countryCode = ISO-2-Code, aber nur wenn ein Land eindeutig genannt ist.
- place enthält ausschließlich echten Ort, Region oder Campingplatznamen.
- Wünsche wie Pool, Meer, Familie, Hund oder Wohnwagen dürfen niemals als Ort eingetragen werden.
- siteType darf nur all, camp_site oder caravan_site sein.
- filters darf ausschließlich vorhandene Campingfinder-Filter verwenden.
- Erfinde keine Merkmale.
- "in meiner Nähe" => nearMe=true.
- Wohnwagen => caravanFilter=true.
- Wohnmobil oder Van => motorhomeFilter=true.
- Zelt => tentsFilter=true.
- am Meer/Küste => locationFilter="sea".
- Hund erlaubt => dogFilter="yes"; ohne Hund => dogFilter="no".
- familienfreundlich => familyFilter=true.
- Nur Erwachsene/Adults only => adultOnlyFilter=true.
- Pool => poolFilter=true; Hallenbad => indoorPoolFilter=true; Wasserpark/Rutschen => waterParkFilter=true.
- Stellplatz => siteType="caravan_site" nur wenn der Nutzer ausdrücklich Wohnmobilstellplatz/Stellplatz sagt.
- Campingplatz => siteType="camp_site" nur wenn ausdrücklich verlangt.
- Select-Werte:
  dogFilter=all/yes/no
  feeFilter=all/free/paid
  starsFilter=0/1/2/3/4/5
  locationFilter=all/sea/inland
  styleFilter=all/quiet/luxury/glamping
  priceFilter=all/20/40/60
  sortSelect=name/stars/type/distance
  pitchSizeFilter=0/80/100/120/150
  pitchExposureFilter=all/shaded/sunny`
        },
        { role:'user', content:
          (profileUseEnabled()
            ? `Gespeichertes Campingprofil: ${familyProfileSummaryForAI()}\n\nAktueller Suchwunsch: ${text}`
            : text)
        }
      ]
    });

    return parseJsonLoose(response?.choices?.[0]?.message?.content || '');
  }

  async function runAiSearch() {
    const text = aiInput.value.trim();
    if (!text) {
      aiInput.focus();
      setStatus('Bitte zuerst einen Campingwunsch eingeben.','error');
      return;
    }

    aiBtn.disabled = true;
    try {
      const plan = mergeFamilyProfileIntoPlan(await interpretWithAI(text), text);
      applyPlan(plan,text);
      setStatus('KI-Suche angewendet. Die gesetzten Kriterien kannst du unter „Alle Filter“ kontrollieren.');
    } catch (err) {
      console.warn('Campingfinder Browser-KI: Fallback aktiv', err);
      smartInput.value = text;
      legacySmartBtn?.click();
      setProgress(0);
      setStatus('Browser-KI war nicht verfügbar. Die bestehende lokale intelligente Suche wurde verwendet.','error');
    } finally {
      aiBtn.disabled = false;
    }
  }

  aiBtn.addEventListener('click', runAiSearch);
  aiInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runAiSearch();
    }
  });

  aiInput.addEventListener('input', () => {
    smartInput.value = aiInput.value;
  });
  smartInput.addEventListener('input', () => {
    if (!aiInput.matches(':focus')) aiInput.value = smartInput.value;
  });
})();


/* ---------- v31.1 Versionsanzeige & Update-Prüfung ---------- */
(() => {
  const APP_VERSION = '33.0.0';
  const VERSION_URL = './version.json';

  const parseVersion = value =>
    String(value || '0.0.0').replace(/^v/i,'').split('.').map(x => parseInt(x,10) || 0);

  function compareVersions(a,b){
    const av=parseVersion(a), bv=parseVersion(b);
    for(let i=0;i<Math.max(av.length,bv.length);i++){
      const x=av[i]||0, y=bv[i]||0;
      if(x>y)return 1;
      if(x<y)return -1;
    }
    return 0;
  }

  const brandText = document.querySelector('.brand-compact span');
  const headerActions = document.querySelector('.header-actions');

  if (!brandText || !headerActions) return;

  let versionBadge = document.getElementById('v31VersionBadge');
  if (!versionBadge) {
    versionBadge = document.createElement('span');
    versionBadge.id = 'v31VersionBadge';
    versionBadge.className = 'v31-version-badge';
    versionBadge.textContent = 'Version ' + APP_VERSION;
    brandText.appendChild(versionBadge);
  }

  let updateBtn = document.getElementById('v31UpdateBtn');
  if (!updateBtn) {
    updateBtn = document.createElement('button');
    updateBtn.id = 'v31UpdateBtn';
    updateBtn.type = 'button';
    updateBtn.className = 'ghost-btn v31-update-btn';
    updateBtn.textContent = 'Update suchen';
    updateBtn.title = 'Nach einer neuen Campingfinder-Version suchen';
    headerActions.insertBefore(updateBtn, headerActions.firstChild);
  }

  let statusBox = document.getElementById('v31UpdateStatus');
  if (!statusBox) {
    statusBox = document.createElement('div');
    statusBox.id = 'v31UpdateStatus';
    statusBox.className = 'v31-update-status';
    statusBox.hidden = true;
    statusBox.setAttribute('role','status');
    statusBox.setAttribute('aria-live','polite');
    document.body.appendChild(statusBox);
  }

  function showStatus(title,text,autoHide=5000){
    statusBox.innerHTML = '<strong>'+title+'</strong><span>'+text+'</span>';
    statusBox.hidden = false;
    if(autoHide) {
      clearTimeout(showStatus.timer);
      showStatus.timer=setTimeout(()=>{statusBox.hidden=true;},autoHide);
    }
  }

  function markUpdateAvailable(remoteVersion){
    versionBadge.classList.add('update');
    versionBadge.textContent = 'v33.0 · ' + remoteVersion;
    updateBtn.classList.add('update-available');
    if(!updateBtn.querySelector('.v31-update-dot')){
      const dot=document.createElement('span');
      dot.className='v31-update-dot';
      dot.setAttribute('aria-hidden','true');
      updateBtn.appendChild(dot);
    }
    updateBtn.title='Update '+remoteVersion+' verfügbar – antippen';
    localStorage.setItem('campingfinder:updateAvailable',remoteVersion);
  }

  function clearUpdateMark(){
    versionBadge.classList.remove('update');
    versionBadge.textContent='v33.0';
    updateBtn.classList.remove('update-available');
    updateBtn.querySelector('.v31-update-dot')?.remove();
    updateBtn.title='Nach einer neuen Campingfinder-Version suchen';
    localStorage.removeItem('campingfinder:updateAvailable');
  }

  async function fetchRemoteVersion(){
    const url = VERSION_URL + '?t=' + Date.now();
    const res = await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error('Versionsdatei nicht erreichbar');
    const data = await res.json();
    return String(data.version || '').trim();
  }

  async function registerUpdateHooks(){
    if(!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    if(!reg) return null;

    if(reg.waiting){
      markUpdateAvailable(localStorage.getItem('campingfinder:updateAvailable') || 'neu');
    }

    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed' && navigator.serviceWorker.controller){
          markUpdateAvailable(localStorage.getItem('campingfinder:updateAvailable') || 'neu');
          showStatus('Update verfügbar','Eine neue Campingfinder-Version wurde gefunden.',0);
        }
      });
    });
    return reg;
  }

  async function checkForUpdates(manual=false){
    if(manual){
      updateBtn.disabled=true;
      showStatus('Update-Suche','Campingfinder prüft auf eine neue Version …',0);
    }

    let remoteVersion='';
    let reg=null;

    try{
      reg=await registerUpdateHooks();
      await reg?.update();
    }catch(err){
      console.warn('Service-Worker-Updateprüfung fehlgeschlagen',err);
    }

    try{
      remoteVersion=await fetchRemoteVersion();
      if(remoteVersion && compareVersions(remoteVersion,APP_VERSION)>0){
        markUpdateAvailable(remoteVersion);
        showStatus(
          'Update verfügbar',
          'Version '+remoteVersion+' ist verfügbar. Tippe erneut auf „Update suchen“, um die neue Version zu laden.',
          0
        );
        return true;
      }

      if(reg?.waiting){
        markUpdateAvailable(remoteVersion || 'neu');
        showStatus('Update verfügbar','Eine neue Version wartet auf die Installation.',0);
        return true;
      }

      clearUpdateMark();
      if(manual) showStatus('Aktuell','Du verwendest bereits die neueste Version ('+APP_VERSION+').');
      return false;
    }catch(err){
      if(manual){
        showStatus(
          'Prüfung nicht möglich',
          'Die Versionsprüfung konnte gerade nicht abgeschlossen werden. Internetverbindung prüfen und erneut versuchen.'
        );
      }
      return false;
    }finally{
      updateBtn.disabled=false;
    }
  }

  async function installWaitingUpdate(){
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg?.waiting){
        reg.waiting.postMessage({type:'SKIP_WAITING'});
        showStatus('Update wird installiert','Campingfinder lädt die neue Version …',0);
        return true;
      }
    }catch{}
    return false;
  }

  updateBtn.addEventListener('click', async ()=>{
    const known = localStorage.getItem('campingfinder:updateAvailable');
    if(known){
      const installed = await installWaitingUpdate();
      if(!installed){
        await checkForUpdates(true);
        location.reload();
      }
      return;
    }
    await checkForUpdates(true);
  });

  navigator.serviceWorker?.addEventListener('controllerchange',()=>{
    if(sessionStorage.getItem('campingfinder:reloadingForUpdate'))return;
    sessionStorage.setItem('campingfinder:reloadingForUpdate','1');
    location.reload();
  });

  window.addEventListener('load',()=>{
    const known=localStorage.getItem('campingfinder:updateAvailable');
    if(known) markUpdateAvailable(known);
    setTimeout(()=>checkForUpdates(false),1800);
  });
})();


/* ---------- v31.3 Profil-Kontext & Homepage-Schnellzugriff ---------- */
(() => {
  const aiPanel = document.querySelector('.v31-ai-panel');
  if (!aiPanel) return;

  const profile = (typeof state !== 'undefined' && state.familyProfile) ? state.familyProfile : {};
  const adults = Math.max(1, Number(profile.adults || 2));
  const ages = Array.isArray(profile.childAges) ? profile.childAges.map(Number).filter(Number.isFinite) : [];
  const vehicleText = {
    all:'Camping-Art offen',
    motorhome:'Wohnmobil',
    van:'Van / Campervan',
    caravan:'Wohnwagen',
    car:'Auto',
    tent:'Zelt'
  }[profile.vehicle || 'all'] || 'Camping-Art offen';

  const summary = [
    `${adults} Erwachsene`,
    ages.length ? `Kinder ${ages.join(', ')} J.` : 'keine Kinder',
    profile.dog === 'yes' ? 'Hund' : 'ohne Hund',
    vehicleText
  ].join(' · ');

  let ctx = document.getElementById('v31ProfileContext');
  if (!ctx) {
    ctx = document.createElement('div');
    ctx.id = 'v31ProfileContext';
    ctx.className = 'v31-profile-context';
    ctx.innerHTML = `
      <div class="v31-profile-context-copy">
        <strong>Gespeichertes Profil wird verwendet</strong>
        <span>${summary}</span>
      </div>
      <label class="v31-profile-toggle">
        <input id="v31UseProfile" type="checkbox" checked />
        <span>Profil verwenden</span>
      </label>`;
    aiPanel.appendChild(ctx);
  } else {
    const summaryNode = ctx.querySelector('#v31ProfileSummaryStatic, .v31-profile-context-copy span');
    if (summaryNode) summaryNode.textContent = summary;
    const titleNode = ctx.querySelector('.v31-profile-context-copy strong');
    if (titleNode) titleNode.textContent = 'Gespeichertes Profil wird verwendet';
  }

  function enhanceOfficialHomepageLinks(root=document) {
    root.querySelectorAll?.('.result-actions a.mini-btn').forEach(a => {
      const text = (a.textContent || '').trim().toLowerCase();
      if (
        !a.classList.contains('v31-official-homepage') && (
          text.includes('original-webseite') ||
          text.includes('offizielle homepage') ||
          text.includes('betreiber-webseite')
        )
      ) {
        a.classList.add('v31-official-homepage');
        if (a.textContent !== 'Offizielle Homepage') a.textContent = 'Offizielle Homepage';
        a.title = 'Homepage des Campingplatzes laut hinterlegtem Platzdatensatz';
        a.setAttribute('aria-label','Offizielle Homepage des Campingplatzes öffnen');
      }
    });

    root.querySelectorAll?.('.detail-actionbar a.mini-btn').forEach(a => {
      const text = (a.textContent || '').trim().toLowerCase();
      if (!a.classList.contains('v31-official-homepage') && text.includes('original-webseite')) {
        a.classList.add('v31-official-homepage');
        if (a.textContent !== 'Offizielle Homepage') a.textContent = 'Offizielle Homepage';
        a.title = 'Homepage des Campingplatzes laut hinterlegtem Platzdatensatz';
      }
    });
  }

  const results = document.getElementById('results');
  if (results) {
    enhanceOfficialHomepageLinks(results);
    const observer = new MutationObserver(() => enhanceOfficialHomepageLinks(results));
    observer.observe(results,{childList:true,subtree:true});
  }

  const detail = document.getElementById('detailContent');
  if (detail) {
    const observer = new MutationObserver(() => enhanceOfficialHomepageLinks(detail));
    observer.observe(detail,{childList:true,subtree:true});
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      try { if (typeof map !== 'undefined') map.invalidateSize(); } catch {}
    }, 120);
  });
})();


/* ---------- v31.4 Branding ---------- */
(() => {
  const brand = document.querySelector('.brand-compact > span');
  if (!brand) return;

  if (!document.getElementById('v31BrandCredit')) {
    const credit = document.createElement('span');
    credit.id = 'v31BrandCredit';
    credit.className = 'v31-brand-credit';
    credit.textContent = 'by Marcel Hentschel';
    brand.appendChild(credit);
  }
})();


/* ---------- v31.6 Design-Angleichung an das Mockup ---------- */
(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  document.body.classList.add('v31-look-316');

  const brand = $('.brand-compact');
  const brandCopy = $('.brand-compact > span');
  if (brand && brandCopy) {
    brandCopy.classList.add('v31-header-copy');
    if (!brand.querySelector('.v31-brand-full')) {
      const fullLogo = document.createElement('img');
      fullLogo.src = 'logo-campingfinder.png';
      fullLogo.alt = 'Campingfinder';
      fullLogo.className = 'v31-brand-full';
      brand.insertBefore(fullLogo, brand.firstChild);
    }
  }

  const discovery = $('.discovery-row');
  const mapArea = document.getElementById('mapArea');
  const filterBar = $('.filter-bar');
  if (discovery && mapArea && filterBar && discovery.nextElementSibling !== mapArea) {
    discovery.insertAdjacentElement('afterend', mapArea);
  }

  const profile = document.getElementById('v31ProfileContext');
  if (profile && !profile.querySelector('.v31-profile-main')) {
    const copy = $('.v31-profile-context-copy', profile);
    const toggle = $('.v31-profile-toggle', profile);
    const main = document.createElement('div');
    main.className = 'v31-profile-main';
    const icon = document.createElement('div');
    icon.className = 'v31-profile-icon';
    icon.innerHTML = '👨‍👩‍👧‍👦';
    if (copy) {
      const title = $('strong', copy);
      if (title) title.textContent = 'Gespeichertes Profil wird verwendet';
      main.append(icon, copy);
      profile.insertBefore(main, profile.firstChild);
    }
    if (toggle && !toggle.querySelector('.v31-profile-arrow')) {
      const arrow = document.createElement('span');
      arrow.className = 'v31-profile-arrow';
      arrow.textContent = '›';
      toggle.appendChild(arrow);
    }
  }

  $$('.discovery-card small').forEach(n => n.remove());

  const compactVersionLabel = () => {
    const badge = document.getElementById('v31VersionBadge');
    if (badge) {
      let update = '';
      try { update = localStorage.getItem('campingfinder:updateAvailable') || ''; } catch {}
      const desired = update ? `v33.0 · ${update}` : 'v33.0';
      if (badge.textContent !== desired) badge.textContent = desired;
    }
    const btn = document.getElementById('v31UpdateBtn');
    if (btn && btn.classList.contains('update-available') && !btn.dataset.v316Styled) {
      btn.dataset.v316Styled = '1';
      btn.innerHTML = '<span class="v31-update-icon">↓</span><span>Update<br>verfügbar</span>';
    }
  };
  compactVersionLabel();

  const resultsHead = document.querySelector('#mapArea .results-card .section-head h2');
  if (resultsHead) resultsHead.textContent = 'Plätze';
  const mapHead = document.querySelector('#mapArea .map-card .section-head h2');
  if (mapHead) mapHead.textContent = 'Karte';
})();


/* ---------- Campingfinder v33.0 Laufzeit-Helfer ---------- */
(() => {
  'use strict';
  document.body.classList.add('cf-v32');
  const meta = document.querySelector('meta[name="campingfinder-version"]');
  if (meta) meta.content = '33.0.0';

  const pinToViewport = () => {
    document.documentElement.style.maxWidth = '100%';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.maxWidth = '100%';
    document.body.style.overflowX = 'hidden';
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    try { if (typeof map !== 'undefined') map.invalidateSize(); } catch {}
  };
  pinToViewport();
  window.addEventListener('load', pinToViewport, {once:true});
  window.addEventListener('resize', () => setTimeout(pinToViewport, 80));
  window.addEventListener('orientationchange', () => setTimeout(pinToViewport, 180));
})();


} // end Campingfinder v33.0 direct-loader guard
