// ============================================================
// === TEMPO · БИБЛИОТЕКА СОВЕТОВ («Советы-сториз») ===========
// ============================================================
// Лента ярких карточек. Совет открывается как короткие экраны:
// суть → почему работает → частый миф (если есть) → что сделать → насколько доказано.
// Контент — tips.json: у каждого совета источник и уровень доказательности.
// Прочитанные и сохранённые советы — в DATA.tips (уходят в экспорт вместе с остальным).

let TIPS_DATA=null;
let TL={filter:'all',q:'',search:false};
let TV=null;          // открытый совет: {t, slides, i}
let TV_SWIPED=false;  // был свайп — следующий тап не листает

const TL_LEVELS={3:'Сильные доказательства',2:'Умеренные доказательства',1:'Предварительные данные'};
const TL_LEVEL_HINT={3:'мета-анализы и официальные рекомендации',2:'хорошие эксперименты или крупные наблюдения',1:'первые данные — гарантий пока нет'};
const TL_SLIDE_NAMES={main:'Суть',why:'Почему',myth:'Миф или правда',steps:'Что сделать',ev:'Доказательства'};

async function fetchTips(){
  if(TIPS_DATA)return TIPS_DATA;
  try{
    const res=await fetch('tips.json?_='+Date.now());
    if(!res.ok)throw new Error('not ok');
    const d=await res.json();
    if(!Array.isArray(d.tips))throw new Error('old format');
    TIPS_DATA=d;
    return TIPS_DATA;
  }catch(e){return null;}
}

function tlState(){
  if(!DATA)return{read:[],saved:[]};
  if(!DATA.tips||typeof DATA.tips!=='object')DATA.tips={read:[],saved:[]};
  if(!Array.isArray(DATA.tips.read))DATA.tips.read=[];
  if(!Array.isArray(DATA.tips.saved))DATA.tips.saved=[];
  return DATA.tips;
}
const tlCat=id=>TIPS_DATA.categories.find(c=>c.id===id)||TIPS_DATA.categories[0];
const tlTip=id=>TIPS_DATA.tips.find(t=>t.id===id);
function tlVars(color){const p=ST_PAL[color]||ST_PAL.teal;return`--c:${p.c};--c2:${p.c2};--tint:${p.tint}`;}
const tlMeter=l=>`<span class="tl-ev l${l}"><i></i><i></i><i></i></span>`;
function tlMin(t){return Math.max(1,Math.round((t.why.length+t.steps.join('').length+t.ev.text.length)/900));}
function tlPlural(n,a,b,c){const m10=n%10,m100=n%100;return m10===1&&m100!==11?a:m10>=2&&m10<=4&&(m100<10||m100>=20)?b:c;}

// Совет дня: один на всех в этот день, по возможности из непрочитанных
function tlTipOfDay(){
  const read=tlState().read,pool=TIPS_DATA.tips.filter(t=>!read.includes(t.id));
  const list=pool.length?pool:TIPS_DATA.tips;
  let h=0;const k=todayKey();for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;
  return list[h%list.length];
}

// ── библиотека ──────────────────────────────────────────────

async function openTipsLib(filter){
  const data=await fetchTips();
  if(!data){showToast('Советы не загрузились — проверь интернет','bad');return;}
  TL.filter=filter==='saved'||data.categories.some(c=>c.id===filter)?filter:'all';
  TL.q='';TL.search=false;
  const el=document.getElementById('tips-lib');
  el.classList.remove('closing');
  el.classList.add('open');
  tlRender(true);
}

function closeTipsLib(){
  const el=document.getElementById('tips-lib');
  el.classList.add('closing');
  setTimeout(()=>el.classList.remove('open','closing'),220);
}

function tlRender(resetScroll){
  const box=document.getElementById('tl-scroll');if(!box||!TIPS_DATA)return;
  const top=box.scrollTop;
  const n=TIPS_DATA.tips.length,saved=tlState().saved.length;
  const chips=[['all','Все']].concat(saved?[['saved','♥ Сохранённые']]:[]).concat(TIPS_DATA.categories.map(c=>[c.id,c.emoji+' '+c.name]));
  box.innerHTML=`<div class="tl-in">
    <div class="tl-head"><button class="tl-ib" onclick="closeTipsLib()" aria-label="Назад">‹</button><div class="tl-sp"></div>
      <button class="tl-ib${TL.search?' on':''}" onclick="tlToggleSearch()" aria-label="Поиск">⌕</button></div>
    <div class="tl-h1">Советы</div>
    <div class="tl-sub">${n} ${tlPlural(n,'совет','совета','советов')} — коротко, проверенно, с источниками</div>
    ${TL.search?`<label class="tl-search">⌕<input id="tl-q" type="search" placeholder="Кофе, сон, привычка, белок…" value="${escHtml(TL.q)}" oninput="tlSearch(this.value)" enterkeyhint="search"></label>`:''}
    <div id="tl-hero"></div>
    <div class="tl-lbl">Темы</div>
    <div class="tl-chips" id="tl-chips">${chips.map(([id,name])=>`<button class="tl-chip${TL.filter===id?' on':''}" onclick="tlFilter('${id}')">${escHtml(name)}</button>`).join('')}</div>
    <div id="tl-grid"></div>
  </div>`;
  tlRenderGrid();
  box.scrollTop=resetScroll?0:top;
  if(TL.search&&resetScroll!==false){const i=document.getElementById('tl-q');if(i)i.focus();}
  const on=box.querySelector('.tl-chip.on');if(on&&resetScroll)on.scrollIntoView({inline:'center',block:'nearest'});
}

function tlRenderGrid(){
  const read=tlState().read,saved=tlState().saved,q=TL.q.trim().toLowerCase();
  let list=TIPS_DATA.tips;
  if(TL.filter==='saved')list=list.filter(t=>saved.includes(t.id));
  else if(TL.filter!=='all')list=list.filter(t=>t.cat===TL.filter);
  if(q)list=list.filter(t=>(t.title+' '+t.hook+' '+t.why+' '+tlCat(t.cat).name).toLowerCase().includes(q));

  const hero=document.getElementById('tl-hero');
  if(hero){
    const d=TL.filter==='all'&&!q?tlTipOfDay():null;
    hero.innerHTML=d?`<button class="tl-hero tl-pst" style="${tlVars(tlCat(d.cat).color)}" onclick="openTip('${d.id}')">
      <div class="tl-stk">${escHtml(d.emoji)}</div><span class="tl-kick">Совет дня · ${escHtml(tlCat(d.cat).name)}</span>
      ${d.stat?`<div class="tl-hnum${d.stat.v.length>6?' long':''}">${escHtml(d.stat.v)}</div><div class="tl-hnl">${escHtml(d.stat.l)}</div>`:''}
      <div class="tl-ht">${escHtml(d.title)}</div><div class="tl-go">Смотреть ${ST_ARROW}</div></button>`:'';
  }
  const grid=document.getElementById('tl-grid');if(!grid)return;
  if(!list.length){
    grid.innerHTML=`<div class="tl-empty">${TL.filter==='saved'?'Нажми ♡ в конце совета, и он появится здесь.':'Ничего не нашлось. Попробуй «сон», «вода» или «экзамен».'}</div>`;
    return;
  }
  grid.innerHTML=`<div class="tl-grid">${list.map(t=>{const c=tlCat(t.cat);
    return`<button class="tl-tile tl-pst" style="${tlVars(c.color)}" onclick="openTip('${t.id}')">
      <div class="tl-stk">${escHtml(t.emoji)}</div>${read.includes(t.id)?'<div class="tl-done" aria-label="Прочитано">✓</div>':''}
      ${t.stat?`<div class="tl-num">${escHtml(t.stat.v)}</div>`:''}<div class="tl-t">${escHtml(t.title)}</div>
      <div class="tl-meta">${tlMin(t)} мин · ${tlMeter(t.ev.lvl)}</div></button>`;}).join('')}</div>`;
}

function tlFilter(id){TL.filter=id;tlRender(false);const box=document.getElementById('tl-scroll');const g=document.getElementById('tl-chips');if(box&&g&&box.scrollTop>g.offsetTop)box.scrollTop=g.offsetTop-8;}
function tlToggleSearch(){TL.search=!TL.search;if(!TL.search)TL.q='';tlRender(true);}
function tlSearch(v){TL.q=v;tlRenderGrid();}

// ── совет: короткие экраны ──────────────────────────────────

function openTip(id){
  const t=tlTip(id);if(!t)return;
  const st=tlState();
  if(!st.read.includes(id)){st.read.push(id);saveData();}
  const slides=['main','why'];if(t.myth)slides.push('myth');slides.push('steps','ev');
  TV={t,slides,i:0};
  const el=document.getElementById('tip-view');
  el.classList.remove('closing');
  el.classList.add('open');
  tvRender();
}

function closeTip(){
  const el=document.getElementById('tip-view');
  el.classList.add('closing');
  setTimeout(()=>{el.classList.remove('open','closing');TV=null;},220);
  if(document.getElementById('tips-lib').classList.contains('open'))tlRender(false);
}

function tipNext(){if(!TV)return;if(TV.i<TV.slides.length-1){TV.i++;tvRender();}else closeTip();}
function tipPrev(){if(!TV)return;if(TV.i>0){TV.i--;tvRender();}}
function tvTap(dir){if(TV_SWIPED){TV_SWIPED=false;return;}dir>0?tipNext():tipPrev();}

function tvRender(keep){
  if(!TV)return;
  const t=TV.t,c=tlCat(t.cat),k=TV.slides[TV.i];
  const fr=document.getElementById('tv-frame');
  const p=ST_PAL[c.color]||ST_PAL.teal;
  fr.style.setProperty('--c',p.c);fr.style.setProperty('--c2',p.c2);fr.style.setProperty('--tint',p.tint);
  document.getElementById('tv-bars').innerHTML=TV.slides.map((_,i)=>`<i class="${i<=TV.i?'on':''}"></i>`).join('');
  document.getElementById('tv-who').textContent=TL_SLIDE_NAMES[k];
  const stk=`<div class="tv-stk${k==='main'?'':' sm'}" aria-hidden="true">${escHtml(t.emoji)}</div>`;
  let h='';
  if(k==='main'){
    h=`<span class="tl-kick">${escHtml(c.emoji+' '+c.name)}</span>
      ${t.stat?`<div class="tv-num${t.stat.v.length>6?' long':''}">${escHtml(t.stat.v)}</div><div class="tv-nl">${escHtml(t.stat.l)}</div>`:'<div class="tv-gap"></div>'}
      <div class="tv-t">${escHtml(t.title)}</div><div class="tv-p">${escHtml(t.hook)}</div>
      <div class="tv-hint">Нажми справа — дальше →</div>`;
  }else if(k==='why'){
    h=`<span class="tl-kick">Почему это работает</span><div class="tv-big">${escHtml(t.why)}</div>`;
  }else if(k==='myth'){
    const m=t.myth.v==='myth';
    h=`<span class="tl-kick">${m?'Частый миф':'Миф или правда?'}</span>
      <div class="tv-claim${m?' m':''}"><span>«${escHtml(t.myth.q)}»</span></div>
      <div class="tv-verdict ${m?'m':'t'}">${m?'Миф':'Правда'}</div><div class="tv-p">${escHtml(t.myth.a)}</div>`;
  }else if(k==='steps'){
    h=`<span class="tl-kick">Попробуй сегодня</span><div class="tv-steps">${t.steps.map((s,i)=>`<div class="tv-step"><b>${i+1}</b><span>${escHtml(s)}</span></div>`).join('')}</div>`;
  }else{
    const has=t.habit&&(DATA.habits||[]).some(x=>x.name===t.habit.name);
    const saved=tlState().saved.includes(t.id);
    h=`<span class="tl-kick">Насколько это доказано</span>
      <div class="tv-lvl">${tlMeter(t.ev.lvl)}<span>${TL_LEVELS[t.ev.lvl]}</span></div>
      <div class="tv-lvlh">${TL_LEVEL_HINT[t.ev.lvl]}</div>
      <div class="tv-p">${escHtml(t.ev.text)}</div>
      <div class="tv-src">📄 ${escHtml(t.ev.src)}</div>
      <div class="tv-acts">${t.habit?(has?`<button class="tv-btn done" disabled>✓ Уже в привычках</button>`:`<button class="tv-btn" onclick="tlAddHabit()">＋ Сделать привычкой</button>`):`<button class="tv-btn" onclick="closeTip()">Готово</button>`}
        <button class="tv-save" onclick="tlToggleSave()" aria-label="${saved?'Убрать из сохранённых':'Сохранить'}">${saved?'♥':'♡'}</button></div>`;
  }
  // keep — тот же экран обновился (привычка, сохранение): без повторной анимации
  document.getElementById('tv-stage').innerHTML=stk+`<div class="tv-slide${keep?' keep':''}">${h}</div>`;
  if(keep){const k2=document.querySelector('#tv-stage .tv-stk');if(k2)k2.style.animation='none';}
}

function tlAddHabit(){
  const t=TV&&TV.t;if(!t||!t.habit||!DATA)return;
  if(!Array.isArray(DATA.habits))DATA.habits=[];
  if(DATA.habits.some(x=>x.name===t.habit.name)){showToast('Такая привычка уже есть');return;}
  DATA.habits.push({id:'h_'+Date.now(),name:t.habit.name,desc:t.title,emoji:t.habit.emoji||'✓'});
  saveData();
  showToast('Привычка «'+t.habit.name+'» добавлена','good');
  if(typeof CURRENT_SCREEN!=='undefined'){
    if(CURRENT_SCREEN==='habits'&&typeof renderHabits==='function')renderHabits();
    else if(CURRENT_SCREEN==='home'&&typeof renderHome==='function')renderHome();
  }
  tvRender(true);
}

function tlToggleSave(){
  const t=TV&&TV.t;if(!t)return;
  const s=tlState().saved,i=s.indexOf(t.id);
  if(i<0){s.push(t.id);showToast('Сохранено — найдёшь в «♥ Сохранённые»','good');}
  else{s.splice(i,1);showToast('Убрано из сохранённых');}
  saveData();
  tvRender(true);
}

// Свайп вбок листает, свайп вниз закрывает совет; Esc и стрелки — с клавиатуры
document.addEventListener('DOMContentLoaded',()=>{
  const el=document.getElementById('tip-view');
  if(!el)return;
  let sx=0,sy=0,down=false;
  el.addEventListener('pointerdown',e=>{TV_SWIPED=false;if(e.target.closest('button'))return;down=true;sx=e.clientX;sy=e.clientY;});
  el.addEventListener('pointerup',e=>{
    if(!down)return;down=false;
    const dx=e.clientX-sx,dy=e.clientY-sy;
    if(dy>90&&Math.abs(dy)>Math.abs(dx)*1.5){TV_SWIPED=true;closeTip();}
    else if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){TV_SWIPED=true;dx<0?tipNext():tipPrev();}
  });
  el.addEventListener('pointercancel',()=>{down=false;});
});

document.addEventListener('keydown',e=>{
  if(document.getElementById('tip-view').classList.contains('open')){
    if(e.key==='Escape')closeTip();
    else if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();tipNext();}
    else if(e.key==='ArrowLeft')tipPrev();
  }else if(document.getElementById('tips-lib').classList.contains('open')&&e.key==='Escape'&&!(e.target&&e.target.id==='tl-q'&&e.target.value)){
    closeTipsLib();
  }
});
