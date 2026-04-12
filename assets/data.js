
// ── LIGHTBOX ─────────────────────────────────────────────────
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lb || !img || !src) return;
  img.src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

/*! © 2026 Club AutoMoto 24/7 | ThomsFR | clubautomoto247.github.io */
const REPO = 'clubautomoto247/clubautomoto247';
const DATA_PATH = 'data/events.json';
const INSTA_URL = 'https://www.instagram.com/club.automoto.247';
const TODAY = new Date(); TODAY.setHours(0,0,0,0);

// ── LOAD DATA ────────────────────────────────────────────────
async function loadData() {
  try {
    const r = await fetch('data/events.json?v=' + Date.now());
    if (!r.ok) throw 0;
    return await r.json();
  } catch {
    try {
      const base = (window.location.pathname.match(/^(\/[^/]+)/) || ['','/'])[1];
      const r = await fetch(base + '/data/events.json');
      if (!r.ok) throw 0;
      return await r.json();
    } catch { return []; }
  }
}

// ── DATE UTILS ───────────────────────────────────────────────
function parseDate(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); }
const MONTHS_LONG  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
function fmtFull(s)  { const d = parseDate(s); return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`; }
function fmtShort(s) { const d = parseDate(s); return { day: d.getDate(), month: MONTHS_SHORT[d.getMonth()] }; }

// ── FORMAT HOURS (supports multi-day) ────────────────────────
function fmtHours(hd, hf, dateDebut, dateFin) {
  // dateFin is optional — if different from dateDebut, show duration in days
  if (dateFin && dateFin !== dateDebut) {
    const d1 = parseDate(dateDebut), d2 = parseDate(dateFin);
    const days = Math.round((d2 - d1) / 86400000) + 1;
    const start = hd ? hd.replace(':','h') : '';
    return `${start ? '⏰ ' + start + ' → ' : ''}📅 ${days} jours`;
  }
  if (!hd) return '';
  return hd.replace(':','h') + (hf ? ' – ' + hf.replace(':','h') : '');
}

// ── EXPAND RASSEMBLEMENTS ────────────────────────────────────
function expandEvents(evts) {
  const out = [];
  evts.filter(e => e.publie !== false && e.type === 'rassemblement').forEach(e => {
    const dates = (e.dates && e.dates.length)
      ? e.dates
      : [{ date: e.date, heureDebut: e.heureDebut||'', heureFin: e.heureFin||'', dateFin: e.dateFin||'' }];
    dates.forEach((d, i) => {
      if (!d.date) return;
      const obj = parseDate(d.date);
      const df = d.dateFin||'';
      // For multi-day events: show if today is between dateDebut and dateFin (inclusive)
      if (df && df !== d.date) {
        const objFin = parseDate(df);
        if (objFin < TODAY) return; // event fully past
        // Use today as the "display date" if we're mid-event, otherwise use start date
        const displayObj = obj < TODAY ? TODAY : obj;
        const hd = d.heureDebut||'', hf = d.heureFin||'';
        const h = fmtHours(hd, hf, d.date, df);
        out.push({ ...e, _obj:displayObj, _str:d.date, _hd:hd, _hf:hf, _df:df, _h:h, _i:i, _tot:dates.length, _ongoing: obj < TODAY });
      } else {
        if (obj < TODAY) return;
        const hd = d.heureDebut||'', hf = d.heureFin||'';
        const h = fmtHours(hd, hf, d.date, df);
        out.push({ ...e, _obj:obj, _str:d.date, _hd:hd, _hf:hf, _df:df, _h:h, _i:i, _tot:dates.length });
      }
    });
  });
  return out.sort((a,b) => a._obj - b._obj);
}

function getWeekendEvents(evts) {
  const d = new Date(TODAY), dow = d.getDay();
  const toSat = dow <= 6 ? 6 - dow : 0;
  const sat = new Date(d); sat.setDate(d.getDate() + toSat); sat.setHours(0,0,0,0);
  const sun = new Date(sat); sun.setDate(sat.getDate() + 1); sun.setHours(23,59,59,999);
  return expandEvents(evts).filter(e => e._obj >= sat && e._obj <= sun);
}

// ── TARIF ────────────────────────────────────────────────────
function tarifBadgeClass(t) { return t==='gratuit'?'b-gratuit':t==='payant'?'b-payant':t==='mixte'?'b-mixte':''; }
function tarifLabel(t)      { return t==='gratuit'?'Gratuit':t==='payant'?'Payant':t==='mixte'?'Gratuit & Payant':''; }

// ── TIMING BADGE ─────────────────────────────────────────────
function timingBadge(e) {
  const diff = (e._obj - TODAY) / 86400000;
  if (diff === 0) return '<span class="ev-card-badge br b-today">Aujourd\'hui</span>';
  if (diff <= 7)  return '<span class="ev-card-badge br b-week">Cette semaine</span>';
  return '';
}

function recurTag(e) {
  return e._tot > 1
    ? `<span style="font-size:0.58rem;color:var(--txt-m);background:var(--surf3);padding:0.08rem 0.38rem;border-radius:4px;margin-left:0.3rem">${e._i+1}/${e._tot}</span>`
    : '';
}

// ── FAVORIS ──────────────────────────────────────────────────
function getFavs()   { try { return JSON.parse(localStorage.getItem('cam247_favs')||'[]'); } catch { return []; } }
function isFav(id)   { return getFavs().includes(id); }
function toggleFav(id, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  const favs = getFavs();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx,1); else favs.push(id);
  localStorage.setItem('cam247_favs', JSON.stringify(favs));
  document.querySelectorAll(`[data-fav-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('active', favs.includes(id));
    btn.title = favs.includes(id) ? 'Retirer des favoris' : 'Ajouter aux favoris';
  });
  showFavToast(favs.includes(id));
  if (typeof renderFavSection === 'function') renderFavSection();
}
function showFavToast(added) {
  document.querySelectorAll('.fav-toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'fav-toast';
  t.innerHTML = added ? '❤️ Ajouté aux favoris' : '🗑️ Retiré des favoris';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function favBtn(id) {
  const active = isFav(id) ? 'active' : '';
  return `<button class="fav-btn-inline ${active}" data-fav-id="${id}" title="${isFav(id)?'Retirer des favoris':'Favori'}" onclick="toggleFav(${id},event)">♥</button>`;
}

// ── TRACKING ─────────────────────────────────────────────────
function track(event, props) { if (typeof plausible === 'function') plausible(event, { props }); }

// ── VEHICLE CHIPS ─────────────────────────────────────────────
function vehChips(e) {
  const hasVoit = (e.vehicules||[]).includes('Voitures');
  const hasMoto = (e.vehicules||[]).includes('Motos');
  const chips = [];
  // Voitures
  if (hasVoit && e.vehicules_anciens)  chips.push('<span class="chip chip-ancien">🚗 Anciennes</span>');
  if (hasVoit && e.vehicules_modernes) chips.push('<span class="chip chip-moderne">🚗 Modernes</span>');
  if (hasVoit && !e.vehicules_anciens && !e.vehicules_modernes) chips.push('<span class="chip">🚗 Voitures</span>');
  // Motos
  if (hasMoto && e.vehicules_anciens)  chips.push('<span class="chip chip-ancien">🏍 Anciennes</span>');
  if (hasMoto && e.vehicules_modernes) chips.push('<span class="chip chip-moderne">🏍 Modernes</span>');
  if (hasMoto && !e.vehicules_anciens && !e.vehicules_modernes) chips.push('<span class="chip">🏍 Motos</span>');
  return chips;
}

// ── DISCLAIMER ───────────────────────────────────────────────
const DISCLAIMER = `<div class="modal-disclaimer"><span class="modal-disclaimer-icon">⚠️</span><p><strong>Notification</strong> — Club AutoMoto 24/7 ne pourra être tenu responsable en cas de modification, report ou annulation d'une manifestation. Veuillez vérifier ces informations auprès des organisateurs avant de vous déplacer.</p></div>`;

// ── RASSO CARD ───────────────────────────────────────────────
function evCardHTML(e) {
  const chips = vehChips(e);
  return `
  <div class="ev-card" onclick="openModal(${e.id},'${e._str}');track('Fiche ouverte',{titre:'${e.titre.replace(/'/g,'')}'})" >
    <div class="ev-card-img">
      ${e.flyer ? `<img src="${e.flyer}" alt="${e.titre}" loading="lazy">` : '🏁'}
      <span class="ev-card-badge tr b-rasso">Rasso.</span>
      <span class="ev-card-badge tl ${tarifBadgeClass(e.tarif)}">${tarifLabel(e.tarif)}</span>
      ${timingBadge(e)}
    </div>
    <div class="ev-card-body">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem">
        <div>
          <div class="ev-card-date">${fmtFull(e._str)}${recurTag(e)}</div>
          <div class="ev-card-title">${e.titre}</div>
        </div>
        ${favBtn(e.id)}
      </div>
      <div class="ev-card-loc">📍 ${e.ville} · ${e.departement}</div>
      ${chips.length ? `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.2rem">${chips.join('')}</div>` : ''}
      <div class="ev-card-footer">
        <span class="ev-card-time">${e._df && e._df !== e._str ? (e._ongoing ? '🔴 En cours · jusqu\'au ' + fmtFull(e._df) : '📅 ' + fmtFull(e._str) + ' → ' + fmtFull(e._df)) : e._h ? '⏰ ' + e._h : ''}</span>
        <span class="ev-card-arrow">Détails →</span>
      </div>
    </div>
  </div>`;
}

// ── MUSÉE CARD ───────────────────────────────────────────────
function museeCardHTML(e) {
  return `
  <div class="ev-card" onclick="openMuseeModal(${e.id})">
    <div class="ev-card-img">
      ${e.flyer ? `<img src="${e.flyer}" alt="${e.titre}" loading="lazy">` : '🏛️'}
      <span class="ev-card-badge tr b-musee">Musée</span>
    </div>
    <div class="ev-card-body">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem"><div class="ev-card-title" style="flex:1">${e.titre}</div>${favBtn(e.id)}</div>
      <div class="ev-card-loc">📍 ${e.ville} · ${e.departement}</div>
      ${e.accroche ? `<div style="font-size:0.78rem;color:var(--txt-d);font-style:italic;line-height:1.4">${e.accroche}</div>` : ''}
      <div class="ev-card-footer"><span></span><span class="ev-card-arrow">Découvrir →</span></div>
    </div>
  </div>`;
}

// ── LOISIR CARD ──────────────────────────────────────────────
function loisirCardHTML(e) {
  return `
  <div class="ev-card" onclick="openLoisirModal(${e.id})">
    <div class="ev-card-img">
      ${e.flyer ? `<img src="${e.flyer}" alt="${e.titre}" loading="lazy">` : '🎯'}
      <span class="ev-card-badge tr b-loisir">Loisir</span>
      ${e.type_loisir ? `<span class="ev-card-badge tl b-loisir">${e.type_loisir}</span>` : ''}
    </div>
    <div class="ev-card-body">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem"><div class="ev-card-title" style="flex:1">${e.titre}</div>${favBtn(e.id)}</div>
      <div class="ev-card-loc">📍 ${e.ville} · ${e.departement}</div>
      ${e.accroche ? `<div style="font-size:0.78rem;color:var(--txt-d);font-style:italic;line-height:1.4">${e.accroche}</div>` : ''}
      <div class="ev-card-footer"><span class="ev-card-time">${e.type_loisir||''}</span><span class="ev-card-arrow">Découvrir →</span></div>
    </div>
  </div>`;
}

// ── LIST ITEM ────────────────────────────────────────────────
function evListHTML(e) {
  const d = fmtShort(e._str);
  return `
  <div class="ev-list-item" onclick="openModal(${e.id},'${e._str}')">
    <div class="eli-date"><div class="eli-day">${d.day}</div><div class="eli-month">${d.month}</div></div>
    <div class="eli-info">
      <h4>${e.titre}${recurTag(e)}</h4>
      <span>📍 ${e.ville} · ${e.departement}${e._h ? ' · ⏰ '+e._h : ''}</span>
    </div>
    <div class="eli-right">
      <span class="modal-badge ${tarifBadgeClass(e.tarif)}">${tarifLabel(e.tarif)}</span>
      ${favBtn(e.id)}
    </div>
  </div>`;
}

// ── PHOTOS GRID ──────────────────────────────────────────────
function photosGrid(photos) {
  const p = (photos||[]).filter(Boolean);
  if (!p.length) return '';
  return `<div class="modal-row"><div class="modal-icon">📷</div><div class="modal-wrap"><div class="modal-label">Photos</div>
    <div class="modal-photos">${p.map(src => `<img class="modal-photo" src="${src}" alt="" loading="lazy" onclick="openLightbox('${src}')">`).join('')}</div>
  </div></div>`;
}

// ── HORAIRES TABLE ───────────────────────────────────────────
function horairesTable(h) {
  if (!h || !Array.isArray(h)) return h||'';
  return `<table style="border-collapse:collapse;width:100%">${h.map(r => {
    if (r.ferme) return `<tr><td style="font-size:0.8rem;color:var(--txt-d);padding:0.25rem 0.5rem 0.25rem 0;min-width:75px">${r.jour}</td><td style="font-size:0.78rem;color:var(--txt-m)">Fermé</td></tr>`;
    return `<tr><td style="font-size:0.8rem;color:var(--txt-d);padding:0.25rem 0.5rem 0.25rem 0;min-width:75px">${r.jour}</td><td style="font-size:0.8rem;color:var(--txt)">${r.ouverture||''} – ${r.fermeture||''}</td></tr>`;
  }).join('')}</table>`;
}


// ── LINKIFY ──────────────────────────────────────────────────
// Converts URLs in text to clickable links
function linkify(text) {
  if (!text) return '';
  return text.replace(
    /(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" target="_blank" rel="noopener" style="color:var(--mauve-l);text-decoration:underline;word-break:break-all">$1</a>'
  );
}

// ── ANIMATIONS ───────────────────────────────────────────────
function animationsHTML(e) {
  const items = [
    {key:'restauration', icon:'🍔', label:'Restauration & buvette', dk:'restauration_detail'},
    {key:'show',         icon:'🔥', label:'Show',                   dk:'show_detail'},
    {key:'afterwork_dj', icon:'🎧', label:'Afterwork / DJ',         dk:'afterwork_dj_detail'},
    {key:'animations',   icon:'🎉', label:'Animations',             dk:'animations_detail'},
    {key:'balade',       icon:'🗺️', label:'Balade',                 dk:'balade_detail'},
  ].filter(it => e[it.key]);
  if (!items.length) return '';
  return `<div class="modal-row"><div class="modal-icon">✨</div><div class="modal-wrap"><div class="modal-label">Animations & services</div><div class="modal-value">
    ${items.map(it => `<div style="margin-bottom:0.4rem"><span style="font-weight:600">${it.icon} ${it.label}</span>${e[it.dk]?`<div style="font-size:0.78rem;color:var(--txt-d);margin-top:0.1rem;padding-left:1.4rem">${linkify(e[it.dk])}</div>`:''}</div>`).join('')}
  </div></div></div>`;
}

// ── BUILD MODAL: RASSEMBLEMENT ────────────────────────────────
function buildModal(id, ds, allEvents) {
  const e = allEvents.find(x => x.id === id);
  if (!e) return '';
  const dates = (e.dates && e.dates.length
    ? e.dates
    : [{date:e.date, heureDebut:e.heureDebut||'', heureFin:e.heureFin||'', dateFin:e.dateFin||''}]
  ).filter(d => parseDate(d.date) >= TODAY);
  // Support single string OR array for instagram/facebook
  const instaArr = Array.isArray(e.instagram) ? e.instagram : (e.instagram ? [e.instagram] : []);
  const fbArr    = Array.isArray(e.facebook)  ? e.facebook  : (e.facebook  ? [e.facebook]  : []);
  const links = [
    ...instaArr.map((url,i) => `<a href="${url}" target="_blank">Instagram${instaArr.length>1?' '+(i+1):''}</a>`),
    ...fbArr.map((url,i)    => `<a href="${url}" target="_blank">Facebook${fbArr.length>1?' '+(i+1):''}</a>`),
    e.site && `<a href="${e.site}" target="_blank">Site web</a>`,
  ].filter(Boolean);
  const chips = vehChips(e);
  const ageBadges = [
    e.vehicules_anciens  && '<span class="modal-badge b-ancien">Anciennes</span>',
    e.vehicules_modernes && '<span class="modal-badge b-moderne">Modernes</span>',
  ].filter(Boolean).join('');

  return `
    <div class="modal-handle"></div>
    ${e.flyer ? `<img class="modal-img" src="${e.flyer}" alt="${e.titre}" onclick="openLightbox('${e.flyer}')">` : '<div class="modal-placeholder">🏁</div>'}
    <div class="modal-body">
      <div class="modal-badges">
        <span class="modal-badge b-rasso">Rassemblement</span>
        ${tarifLabel(e.tarif) ? `<span class="modal-badge ${tarifBadgeClass(e.tarif)}">🎟️ ${tarifLabel(e.tarif)}</span>` : ''}
        ${ageBadges}
      </div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">
        <div class="modal-title" style="margin-bottom:0">${e.titre}</div>
        <button class="fav-btn ${isFav(e.id)?'active':''}" data-fav-id="${e.id}" onclick="toggleFav(${e.id},event)" style="position:static;flex-shrink:0;margin-top:0.2rem" title="${isFav(e.id)?'Retirer des favoris':'Ajouter aux favoris'}">❤</button>
      </div>
      ${dates.length ? `
      <div style="margin:1rem 0">
        <div style="font-size:0.62rem;color:var(--mauve-l);letter-spacing:0.14em;text-transform:uppercase;font-weight:600;margin-bottom:0.5rem">📅 ${dates.length>1?'Prochaines dates':'Date'}</div>
        <div class="modal-dates-list">${dates.map(d => {
          const isToday = parseDate(d.date).getTime() === TODAY.getTime();
          const h = fmtHours(d.heureDebut||'', d.heureFin||'', d.date, d.dateFin||'');
          return `<div class="modal-date-row"><div><div class="modal-date-main">${fmtFull(d.date)}${d.dateFin && d.dateFin!==d.date ? ' → '+fmtFull(d.dateFin):''}</div>${h?`<div class="modal-date-time">⏰ ${h}</div>`:''}</div>${isToday?'<span class="modal-date-today">Aujourd\'hui</span>':''}</div>`;
        }).join('')}</div>
      </div>` : ''}
      <div class="modal-info">
        ${e.localisation_detail?`<div class="modal-row"><div class="modal-icon">📍</div><div class="modal-wrap"><div class="modal-label">Lieu · Dép. ${e.departement}</div><div class="modal-value">${e.localisation_detail}</div></div></div>`:''}
        ${chips.length?`<div class="modal-row"><div class="modal-icon">🏍️</div><div class="modal-wrap"><div class="modal-label">Véhicules</div><div class="modal-value"><div class="modal-chips" style="margin-bottom:0.3rem">${chips.join('')}</div>${e.vehicules_detail||''}</div></div></div>`:''}
        ${e.recurrence?`<div class="modal-row"><div class="modal-icon">↻</div><div class="modal-wrap"><div class="modal-label">Récurrence</div><div class="modal-value">${e.recurrence}</div></div></div>`:''}
        ${(e.organisateur||e.organisateurs)?`<div class="modal-row"><div class="modal-icon">👥</div><div class="modal-wrap"><div class="modal-label">${Array.isArray(e.organisateurs)&&e.organisateurs.length>1?'Organisateurs':'Organisateur'}</div><div class="modal-value">${Array.isArray(e.organisateurs)?e.organisateurs.join('<br>'):e.organisateur}</div></div></div>`:''}
        ${(e.mail||e.tel||instaArr.length||fbArr.length)?`<div class="modal-row"><div class="modal-icon">✉️</div><div class="modal-wrap"><div class="modal-label">Contact</div><div class="modal-value">${e.mail?`<div><a href="mailto:${e.mail}">${e.mail}</a></div>`:''}${e.tel?`<div><a href="tel:${e.tel}">${e.tel}</a></div>`:''}${instaArr.map((url,i)=>{
      const handle = url.replace(/\/$/, '').split('/').pop();
      const label = e['instagram_label'+(i>0?i+1:'')] || (handle && handle !== 'instagram.com' ? '📷 @'+handle : '📷 Instagram'+(instaArr.length>1?' '+(i+1):''));
      return `<div><a href="${url}" target="_blank" rel="noopener">${label}</a></div>`;
    }).join('')}${fbArr.map((url,i)=>{
      const handle = url.replace(/\/$/, '').split('/').pop();
      const label = e['facebook_label'+(i>0?i+1:'')] || (handle && handle !== 'facebook.com' && !handle.match(/^\d+$/) ? '👥 '+handle : '👥 Facebook'+(fbArr.length>1?' '+(i+1):''));
      return `<div><a href="${url}" target="_blank" rel="noopener">${label}</a></div>`;
    }).join('')}</div></div></div>`:''}
        ${animationsHTML(e)}
        ${e.important?`<div class="modal-row"><div class="modal-icon">⚠️</div><div class="modal-wrap"><div class="modal-label">Important</div><div class="modal-value" style="color:var(--orange)">${e.important}</div></div></div>`:''}
        ${photosGrid(e.photos)}
      </div>
      <div class="modal-actions">
        ${e.waze?`<a href="${e.waze}" target="_blank" rel="noopener" class="btn-waze" onclick="track('Waze click',{event:'${e.titre.replace(/'/g,'')}'})">📍 Waze</a>`:''}
        ${e.site?`<a href="${e.site}" target="_blank" rel="noopener" class="btn-sec">🌐 Site</a>`:''}
        ${e.instagram?`<a href="${e.instagram}" target="_blank" rel="noopener" class="btn-sec">📷 Instagram</a>`:''}
        ${e.facebook?`<a href="${e.facebook}" target="_blank" rel="noopener" class="btn-sec">👥 Facebook</a>`:''}
      </div>
      <div style="margin-top:1rem;padding:0.75rem 1rem;background:var(--surf2);border-radius:var(--radius-sm);border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:1rem">
        <div style="font-size:0.78rem;color:var(--txt-d)">📷 Plus de photos de rassemblements sur Instagram</div>
        <a href="${INSTA_URL}" target="_blank" rel="noopener" class="btn-sec" style="flex-shrink:0;font-size:0.75rem;padding:0.5rem 0.9rem" onclick="track('Instagram click',{source:'modal'})">Suivre →</a>
      </div>
      ${DISCLAIMER}
    </div>`;
}

// ── BUILD MODAL: MUSÉE ────────────────────────────────────────
function buildMuseeModal(id, allEvents) {
  const e = allEvents.find(x => x.id === id);
  if (!e) return '';
  // Support single string OR array for instagram/facebook
  const instaArr = Array.isArray(e.instagram) ? e.instagram : (e.instagram ? [e.instagram] : []);
  const fbArr    = Array.isArray(e.facebook)  ? e.facebook  : (e.facebook  ? [e.facebook]  : []);
  const links = [
    ...instaArr.map((url,i) => `<a href="${url}" target="_blank">Instagram${instaArr.length>1?' '+(i+1):''}</a>`),
    ...fbArr.map((url,i)    => `<a href="${url}" target="_blank">Facebook${fbArr.length>1?' '+(i+1):''}</a>`),
    e.site && `<a href="${e.site}" target="_blank">Site web</a>`,
  ].filter(Boolean);
  const tarifRows = (e.tarifs||[]).map(t => `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:0.45rem 0;border-bottom:1px solid var(--border)"><div><div style="font-size:0.83rem;font-weight:600;color:var(--txt)">${t.label}</div>${t.detail?`<div style="font-size:0.73rem;color:var(--txt-d);margin-top:0.1rem">${t.detail}</div>`:''}</div><div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--mauve-l);white-space:nowrap;margin-left:1rem">${t.prix}</div></div>`).join('');

  return `
    <div class="modal-handle"></div>
    ${e.flyer ? `<img class="modal-img" src="${e.flyer}" alt="${e.titre}" onclick="openLightbox('${e.flyer}')">` : '<div class="modal-placeholder">🏛️</div>'}
    <div class="modal-body">
      <div class="modal-badges"><span class="modal-badge b-musee">Musée</span></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">
        <div class="modal-title" style="margin-bottom:0">${e.titre}</div>
        <button class="fav-btn ${isFav(e.id)?'active':''}" data-fav-id="${e.id}" onclick="toggleFav(${e.id},event)" style="position:static;flex-shrink:0;margin-top:0.2rem">❤</button>
      </div>
      ${e.accroche?`<p style="font-size:0.88rem;color:var(--txt-d);font-style:italic;margin:0.8rem 0 0;line-height:1.6">${e.accroche}</p>`:''}
      ${e.description?`<p style="font-size:0.83rem;color:var(--txt-d);line-height:1.7;margin-top:0.7rem">${e.description}</p>`:''}
      ${e.credit_photos?`<p style="font-size:0.7rem;color:var(--txt-m);margin-top:0.5rem">📸 Crédit photos : ${e.credit_photos}</p>`:''}
      <div class="modal-info" style="margin-top:0.8rem">
        ${e.adresse?`<div class="modal-row"><div class="modal-icon">📍</div><div class="modal-wrap"><div class="modal-label">Adresse</div><div class="modal-value">${e.adresse}</div></div></div>`:''}
        ${e.horaires?`<div class="modal-row"><div class="modal-icon">🕐</div><div class="modal-wrap"><div class="modal-label">Horaires</div><div class="modal-value">${Array.isArray(e.horaires)?horairesTable(e.horaires):e.horaires}${e.horaires_lien?`<br><a href="${e.horaires_lien}" target="_blank">Horaires complets →</a>`:''}</div></div></div>`:''}
        ${tarifRows?`<div class="modal-row"><div class="modal-icon">🎟️</div><div class="modal-wrap"><div class="modal-label">Tarifs</div><div class="modal-value">${tarifRows}</div></div></div>`:''}
        ${e.agenda_lien?`<div class="modal-row"><div class="modal-icon">📅</div><div class="modal-wrap"><div class="modal-label">Agenda</div><div class="modal-value"><a href="${e.agenda_lien}" target="_blank">Voir l'agenda →</a></div></div></div>`:''}
        ${e.tel?`<div class="modal-row"><div class="modal-icon">📞</div><div class="modal-wrap"><div class="modal-label">Téléphone</div><div class="modal-value"><a href="tel:${e.tel}">${e.tel}</a></div></div></div>`:''}
        ${links.length?`<div class="modal-row"><div class="modal-icon">🔗</div><div class="modal-wrap"><div class="modal-label">Liens</div><div class="modal-value">${links.join(' · ')}</div></div></div>`:''}
        ${photosGrid(e.photos)}
      </div>
      <div class="modal-actions">
        ${e.waze?`<a href="${e.waze}" target="_blank" rel="noopener" class="btn-waze">📍 Waze</a>`:''}
        ${e.site?`<a href="${e.site}" target="_blank" rel="noopener" class="btn-sec">🌐 Site</a>`:''}
      </div>
      ${DISCLAIMER}
    </div>`;
}

// ── BUILD MODAL: LOISIR ───────────────────────────────────────
function buildLoisirModal(id, allEvents) {
  const e = allEvents.find(x => x.id === id);
  if (!e) return '';
  // Support single string OR array for instagram/facebook
  const instaArr = Array.isArray(e.instagram) ? e.instagram : (e.instagram ? [e.instagram] : []);
  const fbArr    = Array.isArray(e.facebook)  ? e.facebook  : (e.facebook  ? [e.facebook]  : []);
  const links = [
    ...instaArr.map((url,i) => `<a href="${url}" target="_blank">Instagram${instaArr.length>1?' '+(i+1):''}</a>`),
    ...fbArr.map((url,i)    => `<a href="${url}" target="_blank">Facebook${fbArr.length>1?' '+(i+1):''}</a>`),
    e.site && `<a href="${e.site}" target="_blank">Site web</a>`,
  ].filter(Boolean);
  const tarifRows = (e.tarifs||[]).map(t => `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.45rem 0;border-bottom:1px solid var(--border)"><span style="font-size:0.83rem;color:var(--txt)">${t.label}</span><span style="font-family:'Syne',sans-serif;font-weight:700;color:var(--mauve-l)">${t.prix}</span></div>`).join('');

  return `
    <div class="modal-handle"></div>
    ${e.flyer ? `<img class="modal-img" src="${e.flyer}" alt="${e.titre}" onclick="openLightbox('${e.flyer}')">` : '<div class="modal-placeholder">🎯</div>'}
    <div class="modal-body">
      <div class="modal-badges"><span class="modal-badge b-loisir">Loisir</span>${e.type_loisir?`<span class="modal-badge b-loisir">${e.type_loisir}</span>`:''}</div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">
        <div class="modal-title" style="margin-bottom:0">${e.titre}</div>
        <button class="fav-btn ${isFav(e.id)?'active':''}" data-fav-id="${e.id}" onclick="toggleFav(${e.id},event)" style="position:static;flex-shrink:0;margin-top:0.2rem">❤</button>
      </div>
      ${e.accroche?`<p style="font-size:0.88rem;color:var(--txt-d);font-style:italic;margin:0.8rem 0 0;line-height:1.6">${e.accroche}</p>`:''}
      ${e.description?`<p style="font-size:0.83rem;color:var(--txt-d);line-height:1.7;margin-top:0.7rem">${e.description}</p>`:''}
      <div class="modal-info" style="margin-top:0.8rem">
        ${e.adresse?`<div class="modal-row"><div class="modal-icon">📍</div><div class="modal-wrap"><div class="modal-label">Adresse</div><div class="modal-value">${e.adresse}</div></div></div>`:''}
        ${e.horaires?`<div class="modal-row"><div class="modal-icon">🕐</div><div class="modal-wrap"><div class="modal-label">Horaires</div><div class="modal-value">${Array.isArray(e.horaires)?horairesTable(e.horaires):e.horaires}</div></div></div>`:''}
        ${tarifRows?`<div class="modal-row"><div class="modal-icon">💳</div><div class="modal-wrap"><div class="modal-label">Tarifs</div><div class="modal-value">${tarifRows}</div></div></div>`:''}
        ${e.tel?`<div class="modal-row"><div class="modal-icon">📞</div><div class="modal-wrap"><div class="modal-label">Téléphone</div><div class="modal-value"><a href="tel:${e.tel}">${e.tel}</a></div></div></div>`:''}
        ${links.length?`<div class="modal-row"><div class="modal-icon">🔗</div><div class="modal-wrap"><div class="modal-label">Liens</div><div class="modal-value">${links.join(' · ')}</div></div></div>`:''}
        ${photosGrid(e.photos)}
      </div>
      <div class="modal-actions">
        ${e.waze?`<a href="${e.waze}" target="_blank" rel="noopener" class="btn-waze">📍 Waze</a>`:''}
        ${e.site?`<a href="${e.site}" target="_blank" rel="noopener" class="btn-sec">🌐 Site</a>`:''}
      </div>
      ${DISCLAIMER}
    </div>`;
}

// ── CAT-NAV SCROLL HINT ───────────────────────────────────────
(function() {
  function init() {
    const nav  = document.getElementById('cat-nav');
    const hint = document.getElementById('cat-nav-hint');
    if (!nav || !hint) return;
    function check() {
      const canScroll = nav.scrollWidth > nav.clientWidth + 4;
      const atEnd = nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 8;
      hint.classList.toggle('show', canScroll && !atEnd);
    }
    check();
    nav.addEventListener('scroll',  check, {passive:true});
    window.addEventListener('resize', check, {passive:true});
    window.addEventListener('load',   check, {passive:true});
    hint.style.pointerEvents = 'auto';
    hint.style.cursor = 'pointer';
    hint.addEventListener('click', () => nav.scrollBy({left:120, behavior:'smooth'}));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
