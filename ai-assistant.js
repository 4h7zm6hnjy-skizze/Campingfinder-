/* Campingfinder v32.0 direct-loader guard */
if (!window.__CAMPINGFINDER_V31_LOADED__) {
  window.__CAMPINGFINDER_V31_LOADED__ = '32.0.0';
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

  if (shell && route && mapArea) {
    if (stats) shell.insertBefore(stats, route);
    shell.insertBefore(mapArea, route);
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
  const APP_VERSION = '32.0.0';
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
    versionBadge.textContent = 'Version ' + APP_VERSION + ' · Update ' + remoteVersion;
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
    versionBadge.textContent='Version '+APP_VERSION;
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
        text.includes('original-webseite') ||
        text.includes('offizielle homepage') ||
        text.includes('betreiber-webseite')
      ) {
        a.classList.add('v31-official-homepage');
        a.textContent = 'Offizielle Homepage';
        a.title = 'Homepage des Campingplatzes laut hinterlegtem Platzdatensatz';
        a.setAttribute('aria-label','Offizielle Homepage des Campingplatzes öffnen');
      }
    });

    root.querySelectorAll?.('.detail-actionbar a.mini-btn').forEach(a => {
      const text = (a.textContent || '').trim().toLowerCase();
      if (text.includes('original-webseite')) {
        a.classList.add('v31-official-homepage');
        a.textContent = 'Offizielle Homepage';
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
      const update = localStorage.getItem('campingfinder:updateAvailable');
      badge.textContent = update ? `v32.0 · ${update}` : 'v32.0';
    }
    const btn = document.getElementById('v31UpdateBtn');
    if (btn && btn.classList.contains('update-available') && !btn.dataset.v316Styled) {
      btn.dataset.v316Styled = '1';
      btn.innerHTML = '<span class="v31-update-icon">↓</span><span>Update<br>verfügbar</span>';
    }
  };
  compactVersionLabel();

  const versionObserver = new MutationObserver(() => compactVersionLabel());
  versionObserver.observe(document.body, { subtree:true, childList:true, attributes:true });

  const resultsHead = document.querySelector('#mapArea .results-card .section-head h2');
  if (resultsHead) resultsHead.textContent = 'Plätze';
  const mapHead = document.querySelector('#mapArea .map-card .section-head h2');
  if (mapHead) mapHead.textContent = 'Karte';
})();


/* ---------- Campingfinder v32.0 Responsive Fix ---------- */
(() => {
  'use strict';
  document.body.classList.add('cf-v32');

  const meta = document.querySelector('meta[name="campingfinder-version"]');
  if (meta) meta.content = '32.0.0';

  const style = document.createElement('style');
  style.id = 'cf-v32-responsive-style';
  style.textContent = `
html,body{width:100%;max-width:100%;overflow-x:hidden}
body.cf-v32{width:100%;max-width:100%;min-width:0;margin:0;overflow-x:hidden;-webkit-text-size-adjust:100%}
body.cf-v32 *{box-sizing:border-box}
body.cf-v32 img,body.cf-v32 svg,body.cf-v32 video,body.cf-v32 canvas{max-width:100%}
body.cf-v32 input,body.cf-v32 select,body.cf-v32 textarea,body.cf-v32 button{min-width:0}
body.cf-v32 input,body.cf-v32 select,body.cf-v32 textarea{font-size:16px}
body.cf-v32 .desktop-nav{display:none!important}
body.cf-v32 .stats,body.cf-v32 .v31-quick-hub{display:none!important}

body.cf-v32 .app-header{
  position:sticky!important;top:0;z-index:1500;width:100%!important;height:auto!important;min-height:70px;
  display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:7px!important;
  padding:calc(7px + env(safe-area-inset-top)) max(9px,env(safe-area-inset-right)) 7px max(9px,env(safe-area-inset-left))!important;
  background:rgba(255,255,255,.97)!important;border-bottom:1px solid rgba(25,63,45,.10)!important;
  box-shadow:0 5px 20px rgba(18,49,35,.07)!important;backdrop-filter:blur(16px)
}
body.cf-v32 .brand-compact{width:100%!important;min-width:0!important;display:flex!important;align-items:center!important;gap:7px!important;overflow:hidden!important}
body.cf-v32 .brand-compact>img:not(.v31-brand-full){display:none!important}
body.cf-v32 .v31-brand-full{display:block!important;width:min(100%,290px)!important;max-width:290px!important;height:auto!important;max-height:54px!important;object-fit:contain!important;object-position:left center!important;border-radius:0!important;box-shadow:none!important}
body.cf-v32 .v31-header-copy{display:none!important}
body.cf-v32 .header-actions{width:auto!important;min-width:0!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end!important;gap:5px!important}
body.cf-v32 .header-actions .language-control,body.cf-v32 .header-actions .compact-install,body.cf-v32 #themeToggle{display:none!important}
body.cf-v32 .v31-version-badge{display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap;min-height:31px;padding:5px 7px!important;margin:0!important;border:1px solid #dfe7e0!important;border-radius:999px!important;background:#f3f5f1!important;color:#53635a!important;font-size:.65rem!important;font-weight:800!important}
body.cf-v32 .v31-update-btn{width:39px!important;height:39px!important;min-height:39px!important;padding:0!important;display:grid!important;place-items:center!important;border:0!important;border-radius:13px!important;background:linear-gradient(135deg,#2d8a55,#176b43)!important;color:#fff!important;box-shadow:0 7px 16px rgba(28,108,67,.20)!important;overflow:hidden}
body.cf-v32 .v31-update-btn>span:not(.v31-update-icon){display:none!important}
body.cf-v32 .v31-update-icon{width:auto!important;height:auto!important;background:transparent!important;color:#fff!important;font-size:1.05rem!important}
body.cf-v32 .v31-update-btn.update-available{outline:3px solid #f3cf67!important;outline-offset:2px}

body.cf-v32 .shell{width:100%!important;max-width:1180px!important;min-width:0!important;margin:0 auto!important;padding:9px!important;display:grid!important;gap:9px!important}
body.cf-v32 .shell>*,body.cf-v32 .hero,body.cf-v32 .hero-search,body.cf-v32 .filter-bar,body.cf-v32 #mapArea,body.cf-v32 .content-grid,body.cf-v32 .map-card,body.cf-v32 .results-card,body.cf-v32 .route-card,body.cf-v32 .trip-card,body.cf-v32 .personal-card,body.cf-v32 .helpers-card,body.cf-v32 .subcard{width:100%!important;max-width:100%!important;min-width:0!important;margin-left:0!important;margin-right:0!important}

body.cf-v32 .hero{min-height:0!important;overflow:visible!important;padding:0!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;display:block!important}
body.cf-v32 .hero-copy{display:none!important}
body.cf-v32 .hero-search,body.cf-v32 .filter-bar,body.cf-v32 .map-card,body.cf-v32 .results-card,body.cf-v32 .route-card,body.cf-v32 .trip-card,body.cf-v32 .personal-card,body.cf-v32 .helpers-card,body.cf-v32 .subcard{padding:10px!important;overflow:hidden!important;border-radius:19px!important}
body.cf-v32 .search-heading{display:none!important}

body.cf-v32 .v31-mode-switch{width:100%!important;max-width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:6px!important;margin:0 0 8px!important;padding:4px!important;position:static!important;background:#f2efe7!important;border:1px solid #e6e1d4!important;border-radius:15px!important}
body.cf-v32 .v31-mode-switch button{width:100%!important;min-width:0!important;min-height:42px!important;padding:8px 5px!important;border:0!important;border-radius:11px!important;background:transparent!important;color:#355044!important;font-size:.85rem!important;font-weight:800!important;white-space:normal!important}
body.cf-v32 .v31-mode-switch button.active{background:linear-gradient(135deg,#2d8a55,#176b43)!important;color:#fff!important;box-shadow:0 7px 18px rgba(25,101,63,.17)!important}
body.cf-v32 .v31-filter-open{display:none!important}

body.cf-v32 .smart-search-box{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
body.cf-v32 .smart-search-row,body.cf-v32 .v31-ai-head{display:none!important}
body.cf-v32 .v31-ai-panel{display:block!important;width:100%!important;min-width:0!important}
body.cf-v32 .v31-ai-actions{width:100%!important;max-width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:1fr!important;gap:7px!important}
body.cf-v32 .v31-ai-actions input{width:100%!important;min-width:0!important;min-height:49px!important;padding:0 12px 0 43px!important;border:1px solid #dce5de!important;border-radius:13px!important;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='21' height='21' viewBox='0 0 24 24' fill='none' stroke='%232a6848' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 12px 50%!important;color:#173126!important}
body.cf-v32 .v31-ai-actions button{width:100%!important;min-width:0!important;min-height:47px!important;padding:9px 12px!important;border:0!important;border-radius:13px!important;background:linear-gradient(135deg,#2d8a55,#176b43)!important;color:#fff!important;font-size:.94rem!important;font-weight:850!important;box-shadow:0 9px 20px rgba(26,104,65,.16)!important}
body.cf-v32.v31-mode-ai .premium-search,body.cf-v32.v31-mode-ai .vehicle-tabs,body.cf-v32.v31-mode-ai .quick-actions-row{display:none!important}
body.cf-v32.v31-mode-classic .premium-search{display:grid!important;grid-template-columns:1fr!important;gap:7px!important}
body.cf-v32 .premium-search label{width:100%!important;min-width:0!important;display:grid!important;gap:4px!important}
body.cf-v32 .premium-search input,body.cf-v32 .premium-search select,body.cf-v32 .search-main-btn{width:100%!important;min-width:0!important;min-height:45px!important;border-radius:12px!important}

body.cf-v32 .v31-profile-context{width:100%!important;max-width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:1fr!important;gap:7px!important;margin-top:8px!important;padding:9px!important;border:1px solid #e8dfcf!important;border-radius:15px!important;background:#f8f4ea!important}
body.cf-v32 .v31-profile-main{display:grid!important;grid-template-columns:37px minmax(0,1fr)!important;align-items:center!important;gap:7px!important;min-width:0!important}
body.cf-v32 .v31-profile-icon{width:37px!important;height:37px!important;display:grid!important;place-items:center!important;border-radius:10px!important;background:#e8f3e9!important;font-size:1rem!important}
body.cf-v32 .v31-profile-context-copy{min-width:0!important;display:grid!important;gap:2px!important}
body.cf-v32 .v31-profile-context-copy strong,body.cf-v32 .v31-profile-context-copy span{overflow-wrap:anywhere!important}
body.cf-v32 .v31-profile-context-copy strong{font-size:.82rem!important}
body.cf-v32 .v31-profile-context-copy span{font-size:.73rem!important;color:#69776f!important}
body.cf-v32 .v31-profile-toggle{width:100%!important;min-width:0!important;min-height:41px!important;padding:8px 9px!important;border:1px solid #dfd8ca!important;border-radius:11px!important;background:#fff!important}

body.cf-v32 .discovery-row,body.cf-v32 .vehicle-tabs,body.cf-v32 .filter-chips,body.cf-v32 .age-filter-grid{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;scrollbar-width:none}
body.cf-v32 .discovery-row{display:flex!important;flex-wrap:nowrap!important;gap:6px!important;padding:0 1px 3px!important}
body.cf-v32 .discovery-card{flex:0 0 auto!important;width:auto!important;min-width:max-content!important;max-width:none!important;padding:8px 11px!important;border:1px solid #e2e7df!important;border-radius:13px!important;background:#fff!important}
body.cf-v32 .discovery-card span{font-size:.8rem!important}
body.cf-v32 .discovery-card small{display:none!important}

body.cf-v32 .filter-overview{width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:1fr!important;gap:7px!important}
body.cf-v32 .filter-overview-copy span{max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important}
body.cf-v32 .filter-overview-actions{width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:1fr!important;gap:6px!important}
body.cf-v32 .filter-overview-actions>*,body.cf-v32 .filter-overview-actions select,body.cf-v32 .share-search-btn{width:100%!important;min-width:0!important;max-width:100%!important}
body.cf-v32 details.filters{width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important}
body.cf-v32 .filter-grid,body.cf-v32 .compact-filter-grid{width:100%!important;max-width:100%!important;min-width:0!important;grid-template-columns:1fr!important}

body.cf-v32 #mapArea{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;min-width:0!important}
body.cf-v32 .section-head,body.cf-v32 .section-title-row{width:100%!important;min-width:0!important;display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:6px!important;flex-wrap:wrap!important}
body.cf-v32 .section-head>div,body.cf-v32 .section-title-row>div{min-width:0!important}
body.cf-v32 .section-head h2,body.cf-v32 .section-title-row h2{font-size:1rem!important;margin:0!important}
body.cf-v32 .section-head p,body.cf-v32 .section-title-row p{max-width:100%!important;font-size:.74rem!important;overflow-wrap:anywhere!important}
body.cf-v32 #map{width:100%!important;max-width:100%!important;height:225px!important;min-height:205px!important;border-radius:15px!important;overflow:hidden!important}
body.cf-v32 .mobile-view-toggle{width:100%!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important;margin-bottom:6px!important}
body.cf-v32 .mobile-view-toggle button{width:100%!important;min-width:0!important;border-radius:999px!important}

body.cf-v32 .results-list{width:100%!important;max-width:100%!important;min-width:0!important;display:grid!important;gap:8px!important}
body.cf-v32 .result-item{width:100%!important;max-width:100%!important;min-width:0!important;padding:8px!important;overflow:hidden!important;border-radius:16px!important}
body.cf-v32 .result-card-shell{width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
body.cf-v32 .result-visual{width:100%!important;min-height:120px!important;border-radius:13px!important;overflow:hidden!important}
body.cf-v32 .result-content,body.cf-v32 .result-top,body.cf-v32 .result-heading-wrap,body.cf-v32 .result-heading-wrap>div{min-width:0!important;max-width:100%!important}
body.cf-v32 .result-title{max-width:100%!important;margin:.1rem 0 .2rem!important;font-size:1.08rem!important;line-height:1.15!important;overflow-wrap:anywhere!important}
body.cf-v32 .result-sub,body.cf-v32 .result-trust,body.cf-v32 .badges,body.cf-v32 .result-facts{max-width:100%!important;overflow-wrap:anywhere!important}
body.cf-v32 .result-actions{width:100%!important;max-width:100%!important;min-width:0!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important;margin-top:8px!important}
body.cf-v32 .result-actions>*{width:100%!important;min-width:0!important;max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important}
body.cf-v32 .result-actions .v31-official-homepage{grid-column:1/-1!important}

body.cf-v32 .route-grid,body.cf-v32 .trip-toolbar,body.cf-v32 .helper-grid,body.cf-v32 .personal-grid{width:100%!important;max-width:100%!important;min-width:0!important;grid-template-columns:1fr!important}
body.cf-v32 .route-grid>*,body.cf-v32 .trip-toolbar>*,body.cf-v32 .helper-grid>*,body.cf-v32 .personal-grid>*{width:100%!important;min-width:0!important;max-width:100%!important}
body.cf-v32 .route-location-field,body.cf-v32 .route-location-field input{width:100%!important;min-width:0!important;max-width:100%!important}
body.cf-v32 .route-suggestions{max-width:calc(100vw - 18px)!important;left:9px!important;right:9px!important}
body.cf-v32 .trip-stage-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}

body.cf-v32 dialog,body.cf-v32 #detailDialog,body.cf-v32 #compareDialog,body.cf-v32 #legalDialog{width:min(720px,calc(100vw - 14px))!important;max-width:calc(100vw - 14px)!important;max-height:calc(100dvh - 14px)!important;margin:auto!important;border-radius:16px!important;overflow:auto!important}
body.cf-v32 .compare-table-wrap,body.cf-v32 .table-scroll{width:100%!important;max-width:100%!important;overflow-x:auto!important}

body.cf-v32{padding-bottom:calc(68px + env(safe-area-inset-bottom))!important}
body.cf-v32 .mobile-bottom-nav{
  position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:1600!important;
  width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;
  display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:1px!important;margin:0!important;
  padding:5px max(4px,env(safe-area-inset-right)) calc(5px + env(safe-area-inset-bottom)) max(4px,env(safe-area-inset-left))!important;
  background:rgba(255,255,255,.98)!important;border-top:1px solid #dce5de!important;box-shadow:0 -8px 22px rgba(18,46,33,.09)!important;
  backdrop-filter:blur(16px);overflow:hidden!important
}
body.cf-v32 .mobile-bottom-nav a{width:100%!important;min-width:0!important;max-width:none!important;min-height:49px!important;padding:4px 1px!important;display:grid!important;place-items:center!important;gap:1px!important;border-radius:9px!important;text-align:center!important;color:#53645b!important}
body.cf-v32 .mobile-bottom-nav a span{font-size:.98rem!important;line-height:1!important}
body.cf-v32 .mobile-bottom-nav a small{max-width:100%!important;font-size:.56rem!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}

body.cf-v32 .v31-update-status{position:fixed!important;top:calc(70px + env(safe-area-inset-top))!important;left:9px!important;right:9px!important;width:auto!important;max-width:520px!important;margin-left:auto!important;z-index:1700!important}

@media(min-width:700px){
  body.cf-v32 .shell{padding:14px!important;gap:13px!important}
  body.cf-v32 .v31-brand-full{max-width:350px!important;max-height:64px!important}
  body.cf-v32 .v31-update-btn{width:auto!important;min-width:110px!important;padding:0 12px!important;display:flex!important;gap:7px!important}
  body.cf-v32 .v31-update-btn>span:not(.v31-update-icon){display:inline!important;font-size:.72rem!important;line-height:1.05!important}
  body.cf-v32 .v31-profile-context{grid-template-columns:minmax(0,1fr) 165px!important;align-items:center!important}
  body.cf-v32.v31-mode-classic .premium-search{grid-template-columns:1fr 1.4fr!important}
  body.cf-v32.v31-mode-classic .premium-search .search-main-btn{grid-column:1/-1!important}
  body.cf-v32 #map{height:320px!important}
  body.cf-v32 .result-card-shell{grid-template-columns:140px minmax(0,1fr)!important}
  body.cf-v32 .route-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  body.cf-v32 .filter-grid,body.cf-v32 .compact-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  body.cf-v32 .filter-overview-actions{grid-template-columns:1fr auto!important;align-items:center!important}
  body.cf-v32 .filter-overview-actions .share-search-btn{width:auto!important}
}
@media(min-width:1024px){
  body.cf-v32{padding-bottom:0!important}
  body.cf-v32 .desktop-nav{display:flex!important}
  body.cf-v32 .app-header{grid-template-columns:minmax(250px,auto) minmax(0,1fr) auto!important;padding:10px 28px!important}
  body.cf-v32 .header-actions .language-control,body.cf-v32 #themeToggle{display:flex!important}
  body.cf-v32 .shell{padding:20px!important}
  body.cf-v32 .hero{display:grid!important;grid-template-columns:minmax(320px,.8fr) minmax(0,1.2fr)!important;overflow:hidden!important;border-radius:28px!important}
  body.cf-v32 .hero-copy{display:block!important;padding:36px!important;background:linear-gradient(145deg,#195e3e,#2a8054)!important;color:#fff!important}
  body.cf-v32 .hero-search{border-radius:0!important;box-shadow:none!important;border-left:0!important;padding:18px!important}
  body.cf-v32.v31-mode-classic .premium-search{grid-template-columns:.75fr 1.45fr .85fr auto!important}
  body.cf-v32.v31-mode-classic .premium-search .search-main-btn{grid-column:auto!important;width:auto!important}
  body.cf-v32 #mapArea{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)!important}
  body.cf-v32 #map{height:500px!important}
  body.cf-v32 .route-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
  body.cf-v32 .filter-grid,body.cf-v32 .compact-filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  body.cf-v32 .mobile-view-toggle,body.cf-v32 .mobile-bottom-nav{display:none!important}
}
@media(max-width:380px){
  body.cf-v32 .app-header{padding-inline:7px!important;gap:4px!important}
  body.cf-v32 .v31-brand-full{max-height:45px!important}
  body.cf-v32 .v31-version-badge{padding:4px 6px!important;font-size:.6rem!important}
  body.cf-v32 .v31-update-btn{width:35px!important;height:35px!important;min-height:35px!important}
  body.cf-v32 .shell{padding:7px!important}
  body.cf-v32 .result-actions,body.cf-v32 .trip-stage-actions{grid-template-columns:1fr!important}
  body.cf-v32 .result-actions .v31-official-homepage{grid-column:auto!important}
  body.cf-v32 .mobile-bottom-nav a small{font-size:.52rem!important}
}
`;
  document.head.appendChild(style);

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


} // end Campingfinder v32.0 direct-loader guard
