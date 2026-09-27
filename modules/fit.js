// ============================================================
// === TEMPO FIT · ЭКРАН ======================================
// ============================================================
// Вкладки: Сегодня · План · Упражнения · Тело (вес, вода, калории).
// Подбор тренировки — fit-engine.js, плеер тренировки — fit-player.js.

let FIT_DB=null,FIT_LOADING=null,FIT_ERR=false;
let FIT_CI=null;     // черновик чек-ина
let FIT_ONB=null;    // онбординг / редактирование профиля
let FIT_CUSTOM=null; // своя тренировка: выбранные упражнения
let FIT_LIB={q:'',cat:'all',mus:'all',eq:'all',avail:false,fav:false,limit:60};

const FIT_TABS=[['today','Сегодня'],['plan','План'],['lib','Упражнения'],['body','Тело']];
const FIT_DOW=['пн','вт','ср','чт','пт','сб','вс'];
const FIT_TYPE_ICON={strength:'◆',circuit:'◎',hiit:'⚡',cardio:'♥',run:'➶',mobility:'◌',recovery:'◌',custom:'✎'};
const FIT_BREATH={
  strength:'Выдох на усилии, вдох на возврате. Не задерживай дыхание.',
  core:'Дыши коротко и ровно, пресс не расслабляй.',
  hiit:'Дыши ритмично. Если не можешь сказать пару слов — сбавь темп.',
  cardio:'Разговорный темп: можешь говорить фразами. Задыхаешься — сбавь.',
  mobility:'Медленно и глубоко, в ритме движения.',
  stretch:'Медленный выдох — и чуть глубже в растяжение. Без боли.',
  warmup:'Свободное дыхание, постепенно разгоняемся.',
};
const FIT_CI_ROWS=[
  ['sq','Качество сна',['Плохо','Так себе','Норм','Хорошо','Отлично']],
  ['en','Энергия',['Нет сил','Мало','Средне','Бодро','Полон сил']],
  ['so','Мышцы',['Не болят','Чуть-чуть','Заметно','Сильно','Всё болит']],
  ['st','Стресс',['Спокойно','Лёгкий','Средний','Сильный','Очень']],
  ['mo','Настроение',['На нуле','Так себе','Ровное','Хорошее','Отличное']],
];
const FIT_ILL=['Здоров','Насморк, лёгкое недомогание','Температура, ломота'];
const FIT_FLAGS=[['chest','Боль в груди'],['dizzy','Головокружение'],['breath','Одышка в покое']];
const FIT_PARQ=[
  ['heart','Врач говорил, что у тебя проблемы с сердцем или высокое давление?'],
  ['chest','Бывает боль в груди — в покое или при нагрузке?'],
  ['dizzy','Бывает сильное головокружение или потеря сознания?'],
  ['chronic','Есть хроническое заболевание, при котором врач ограничивал нагрузки?'],
  ['meds','Принимаешь лекарства от давления или сердца?'],
  ['joint','Есть проблемы с суставами или спиной, которые усиливаются от нагрузки?'],
];

// ── данные ──────────────────────────────────────────────────

function fitLoad(){
  if(FIT_DB)return Promise.resolve(FIT_DB);
  if(FIT_LOADING)return FIT_LOADING;
  const get=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.json();});
  FIT_LOADING=Promise.all([get('fit/exercises.json'),get('fit/programs.json')])
    .then(([ex,pr])=>{FIT_DB=fitIndex(ex,pr);FIT_ERR=false;return FIT_DB;})
    .catch(e=>{FIT_ERR=true;throw e;})
    .finally(()=>{FIT_LOADING=null;});
  return FIT_LOADING;
}

function fitBody(){
  const w=DATA.weight||{},c=DATA.calories||{};
  return{sex:c.gender||null,age:c.age||null,height:w.height||null,weight:latestWeight(DATA)||w.start||null};
}
function fitProg(){
  const id=DATA.fit.program&&DATA.fit.program.id;
  return id&&id!=='smart'&&FIT_DB?FIT_DB.programs.find(p=>p.id===id)||null:null;
}
function fitLvlN(){return{novice:1,intermediate:2,advanced:3}[DATA.fit.profile.level]||1;}
function fitStrHash(s){let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h.toString(36);}
function fitIsTrainingDay(k){
  const p=fitProg();
  if(p&&p.days>=7)return true;
  const days=DATA.fit.profile.days||[];
  return !days.length||days.includes(fitDow(k));
}
function fitTodayKcal(){
  if(!DATA||!DATA.fit)return 0;
  const t=todayKey();
  return DATA.fit.sessions.filter(s=>s.date===t).reduce((a,s)=>a+(s.kcal||0),0);
}
function fitFmtSec(s){
  if(s>=60){const m=Math.floor(s/60),r=s%60;return r?m+':'+String(r).padStart(2,'0')+' мин':m+' мин';}
  return s+' сек';
}
function fitRxText(it,e,single){
  const side=e&&e.unilateral?' на сторону':'';
  const n=single?1:(it.sets||1);
  let t='';
  if(it.sec!=null)t=(n>1?n+' × ':'')+fitFmtSec(it.sec)+side;
  else if(it.reps)t=(n>1?n+' × ':'')+it.reps[0]+(it.reps[1]!==it.reps[0]?'–'+it.reps[1]:'')+' повт.'+side;
  if(it.kg)t+=' · '+fitNum(it.kg)+' кг';
  if(it.rpe)t+=' · RPE '+fitNum(it.rpe);
  return t;
}
function fitEquipText(e){return e.equipment.length?e.equipment.map(q=>FIT_EQUIP[q]).join(', '):'без инвентаря';}

// План на сегодня: готовность + тренировка. Кэшируется в DATA.fit.day,
// чтобы замены упражнений не терялись, пока не поменялись входные данные.
function fitTodayCtx(){
  const f=DATA.fit,today=todayKey(),ci=f.checkins[today]||null;
  const rd=fitReadiness(ci,f.checkins,f.sessions.filter(s=>s.date<today),today);
  const prog=fitProg();
  const avail=(ci&&ci.time)||f.profile.min||30;
  const time=prog?Math.min(avail,prog.minutes||avail):avail;
  const place=(ci&&ci.place)||f.profile.place||'home';
  const st=f.today&&f.today.date===today?f.today:{};
  const forceTpl=st.recovery?'recovery_flow':null;
  const regen=f.regen[today]||0;
  const key=fitStrHash([today,ci?(ci.ts||1):0,regen,time,place,JSON.stringify(f.program),f.sessions.length,forceTpl,JSON.stringify(f.profile)].join('|'));
  let plan;
  if(f.day&&f.day.date===today&&f.day.key===key)plan=f.day.plan;
  else{
    plan=fitGenerate({db:FIT_DB,profile:f.profile,body:fitBody(),checkin:ci,readiness:rd,sessions:f.sessions,date:today,regen,place,time,
      program:prog?f.program:null,ban:f.ban,fav:f.fav,forceTpl});
    f.day={date:today,key,plan};
    saveData();
  }
  return{rd,plan,prog,ci,time,place,st,today};
}

// ── экран ───────────────────────────────────────────────────

function renderFit(){
  fitEnsure(DATA);
  const f=DATA.fit;
  document.getElementById('fit-seg').innerHTML=FIT_TABS.map(([id,n])=>`<button class="fit-seg-btn${f.tab===id?' active':''}" onclick="fitSetTab('${id}')">${n}</button>`).join('');
  const view=document.getElementById('fit-view'),body=document.getElementById('ms-weight');
  if(f.tab==='body'){view.style.display='none';body.style.display='';renderWeight();return;}
  body.style.display='none';view.style.display='';
  if(!FIT_DB){
    view.innerHTML=FIT_ERR
      ?`<div class="fit-card fit-empty"><div class="fit-card-title">Не удалось загрузить упражнения</div><div class="fit-card-sub">Проверь интернет. После первой загрузки Fit работает и офлайн.</div><button class="wl-primary-btn" onclick="FIT_ERR=false;renderFit()">Повторить</button></div>`
      :`<div class="fit-loading">Загружаю упражнения…</div>`;
    if(!FIT_ERR)fitLoad().then(()=>{if(CURRENT_SCREEN==='fit')renderFit();}).catch(()=>{if(CURRENT_SCREEN==='fit')renderFit();});
    return;
  }
  if(f.tab==='plan')view.innerHTML=fitRenderPlanTab();
  else if(f.tab==='lib'){view.innerHTML=fitRenderLib();fitLibList();}
  else view.innerHTML=fitRenderToday();
}

function fitSetTab(t){DATA.fit.tab=t;saveData();renderFit();window.scrollTo(0,0);}

// ── вкладка «Сегодня» ───────────────────────────────────────

function fitRenderToday(){
  const f=DATA.fit;
  if(FIT_ONB)return fitRenderOnb();
  if(!f.setupDone)return fitRenderIntro();
  const today=todayKey(),ci=f.checkins[today];
  let h='';
  if(f.active)h+=fitRenderActiveCard();
  if(!ci||FIT_CI)return h+fitRenderCheckin()+fitRenderWeekMini();
  const c=fitTodayCtx();
  h+=fitRenderReady(c);
  const doneToday=f.sessions.filter(s=>s.date===today);
  if(c.plan.type==='rest')h+=fitRenderRestCard(c);
  else if(doneToday.length&&!c.st.more)h+=fitRenderDoneCard(doneToday);
  else if(c.st.rest)h+=fitRenderRestedCard();
  else if(!fitIsTrainingDay(today)&&!c.st.force&&!c.st.recovery)h+=fitRenderRestDayCard();
  else if(!f.active)h+=fitRenderPlanCard(c);
  return h+fitRenderWeekMini();
}

function fitRenderIntro(){
  return`<div class="fit-hero">
    <div class="fit-hero-mark">tempo fit</div>
    <div class="fit-hero-title">Тренировки под твоё самочувствие</div>
    <div class="fit-hero-sub">Каждый день — короткий чек-ин: сон, энергия, мышцы, стресс. Tempo считает готовность и собирает тренировку под тебя: силовую, кардио, интервалы, растяжку или отдых.</div>
    <div class="fit-hero-points">
      <div><span>◆</span>${FIT_DB.ex.length} упражнений с техникой и ошибками</div>
      <div><span>◎</span>${FIT_DB.programs.length} программ и умный режим</div>
      <div><span>↗</span>Прогрессия весов, рекорды, разгрузки</div>
    </div>
    <button class="wl-primary-btn" onclick="fitOnbStart(false)">Настроить за 2 минуты</button>
  </div>`;
}

function fitRenderActiveCard(){
  const a=DATA.fit.active;
  const started=new Date(a.startedAt);
  const t=String(started.getHours()).padStart(2,'0')+':'+String(started.getMinutes()).padStart(2,'0');
  return`<div class="fit-card fit-active">
    <div class="fit-card-title">Тренировка в процессе</div>
    <div class="fit-card-sub">${escHtml(a.plan.title)} · начата в ${t}</div>
    <button class="wl-primary-btn" onclick="fitPlayerOpen()">Продолжить</button>
    <button class="fit-link" onclick="fitPlayerAbort()">Отменить тренировку</button>
  </div>`;
}

// ── чек-ин ──

function fitCiDraft(){
  if(FIT_CI)return FIT_CI;
  const f=DATA.fit,today=todayKey(),ex=f.checkins[today];
  if(ex&&!ex.skip){FIT_CI=Object.assign(JSON.parse(JSON.stringify(ex)),{more:0});return FIT_CI;}
  const n=fitNorm(f.checkins,today).def;
  FIT_CI={sl:n.sl||7.5,sq:n.sq||3,en:n.en||3,so:1,zones:[],st:n.st||2,mo:DATA.moods[today]||n.mo||3,pain:[],ill:0,flags:[],
    time:(ex&&ex.time)||f.profile.min||30,place:(ex&&ex.place)||f.profile.place||'home',more:0};
  return FIT_CI;
}

function fitRenderCheckin(){
  const c=fitCiDraft(),edit=!!DATA.fit.checkins[todayKey()];
  let h=`<div class="fit-card fit-ci">
    <div class="fit-card-title">Как ты сегодня?</div>
    <div class="fit-card-sub">20 секунд — и тренировка подстроится. Значения по умолчанию — твои обычные.</div>
    <div class="fit-ci-row"><div class="fit-ci-lbl">Сон</div>
      <div class="fit-stepper"><button onclick="fitCiStep(-0.5)" aria-label="Меньше">−</button><span>${fitNum(c.sl)} ч</span><button onclick="fitCiStep(0.5)" aria-label="Больше">+</button></div></div>`;
  FIT_CI_ROWS.forEach(([k,lbl,opts])=>{
    h+=`<div class="fit-ci-row col"><div class="fit-ci-lbl">${lbl}</div><div class="fit-chips five">${opts.map((o,i)=>`<button class="fit-chip${c[k]===i+1?' sel':''}" onclick="fitCiSet('${k}',${i+1})">${o}</button>`).join('')}</div></div>`;
    if(k==='so'&&c.so>=2){
      h+=`<div class="fit-ci-row col"><div class="fit-ci-lbl">Где болит — эти мышцы сегодня не нагружаю</div><div class="fit-chips">${Object.entries(FIT_ZONES).map(([z,v])=>`<button class="fit-chip sm${c.zones.includes(z)?' sel':''}" onclick="fitCiToggle('zones','${z}')">${v.n}</button>`).join('')}</div></div>`;
    }
  });
  h+=`<button class="fit-more-btn" onclick="fitCiSet('more',${c.more?0:1})">${c.more?'Скрыть подробности ▴':'Время, место, боль, болезнь ▾'}</button>`;
  if(c.more){
    h+=`<div class="fit-ci-row col"><div class="fit-ci-lbl">Сколько есть времени</div><div class="fit-chips">${[10,20,30,45,60,90].map(v=>`<button class="fit-chip sm${c.time===v?' sel':''}" onclick="fitCiSet('time',${v})">${v} мин</button>`).join('')}</div></div>
    <div class="fit-ci-row col"><div class="fit-ci-lbl">Где тренируешься</div><div class="fit-chips">${Object.entries(FIT_PLACES).map(([k,v])=>`<button class="fit-chip sm${c.place===k?' sel':''}" onclick="fitCiSet('place','${k}')">${v}</button>`).join('')}</div></div>
    <div class="fit-ci-row col"><div class="fit-ci-lbl">Болит сустав или травма</div><div class="fit-chips">${FIT_PAIN.map(k=>`<button class="fit-chip sm${c.pain.includes(k)?' sel':''}" onclick="fitCiToggle('pain','${k}')">${FIT_LIMITS[k]}</button>`).join('')}</div></div>
    <div class="fit-ci-row col"><div class="fit-ci-lbl">Самочувствие</div><div class="fit-chips">${FIT_ILL.map((v,i)=>`<button class="fit-chip sm${(c.ill||0)===i?' sel':''}" onclick="fitCiSet('ill',${i})">${v}</button>`).join('')}</div></div>
    <div class="fit-ci-row col"><div class="fit-ci-lbl">Тревожные симптомы</div><div class="fit-chips">${FIT_FLAGS.map(([k,v])=>`<button class="fit-chip sm bad${c.flags.includes(k)?' sel':''}" onclick="fitCiToggle('flags','${k}')">${v}</button>`).join('')}</div></div>`;
  }
  h+=`<div class="fit-ci-actions"><button class="wl-primary-btn" onclick="fitCiSave()">${edit?'Сохранить':'Готово'}</button>
    ${edit?`<button class="fit-link" onclick="FIT_CI=null;renderFit()">Отмена</button>`:`<button class="fit-link" onclick="fitCiSkip()">Пропустить чек-ин</button>`}</div></div>`;
  return h;
}

function fitCiSet(k,v){const c=fitCiDraft();c[k]=v;if(k==='so'&&v<2)c.zones=[];renderFit();}
function fitCiStep(d){const c=fitCiDraft();c.sl=Math.max(3,Math.min(12,(c.sl||7)+d));renderFit();}
function fitCiToggle(k,v){const c=fitCiDraft(),a=c[k]||(c[k]=[]),i=a.indexOf(v);if(i>=0)a.splice(i,1);else a.push(v);renderFit();}
function fitCiEdit(){FIT_CI=null;fitCiDraft();renderFit();window.scrollTo(0,0);}

function fitCiSave(){
  const f=DATA.fit,today=todayKey(),c=fitCiDraft();
  const ci={sl:c.sl,sq:c.sq,en:c.en,so:c.so,zones:c.so>=2?c.zones.slice():[],st:c.st,mo:c.mo,pain:c.pain.slice(),ill:c.ill||0,flags:c.flags.slice(),
    time:c.time,place:c.place,skip:false,ts:Date.now()};
  const rd=fitReadiness(ci,f.checkins,f.sessions.filter(s=>s.date<today),today);
  ci.score=rd.score;ci.mode=rd.mode;
  f.checkins[today]=ci;
  if(!DATA.moods[today])DATA.moods[today]=ci.mo;
  FIT_CI=null;
  const aw=f.awards[today]||(f.awards[today]={});
  if(!aw.c){aw.c=1;addPoints(POINTS.fitCheckin,'fit checkin');showToast('Чек-ин готов · +'+POINTS.fitCheckin+' балла','good');}
  else{saveData();showToast('Чек-ин обновлён');}
  updateTopBar();renderFit();window.scrollTo(0,0);
}

function fitCiSkip(){
  const f=DATA.fit,t=todayKey();
  f.checkins[t]={skip:true,time:f.profile.min,place:f.profile.place,ts:Date.now()};
  FIT_CI=null;saveData();renderFit();
}

// ── готовность ──

function fitRenderReady(c){
  const rd=c.rd,m=FIT_MODES[rd.mode],r=30,C=2*Math.PI*r;
  let h=`<div class="fit-card fit-ready">
    <div class="fit-ring"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="${r}" class="fit-ring-bg"/><circle cx="36" cy="36" r="${r}" class="fit-ring-fg ${m.cls}" stroke-dasharray="${(rd.score/100*C).toFixed(1)} ${C.toFixed(1)}"/></svg><div class="fit-ring-val">${rd.score}</div></div>
    <div class="fit-ready-info">
      <div class="fit-ready-lbl">Готовность</div>
      <div class="fit-mode ${m.cls}">${m.name}</div>
      <div class="fit-why">${rd.reasons.map(x=>`<div class="fit-why-row"><span>${escHtml(x.t)}</span>${x.v?`<b class="${x.v>0?'pos':'neg'}">${x.v>0?'+':''}${x.v}</b>`:''}</div>`).join('')}</div>
    </div>
  </div>`;
  rd.warnings.forEach(w=>{h+=`<div class="fit-warn">${escHtml(w)}</div>`;});
  h+=`<div class="fit-ci-edit"><button class="fit-link" onclick="fitCiEdit()">${c.ci&&c.ci.skip?'Пройти чек-ин':'Изменить чек-ин'}</button></div>`;
  return h;
}

// ── карточки дня ──

function fitRenderPlanCard(c){
  const p=c.plan,db=FIT_DB;
  const sub=[FIT_TYPES[p.type]||'Тренировка'];
  if(p.program)sub.push(escHtml(p.program.name)+' · неделя '+p.program.week+' из '+p.program.weeks+(p.program.deload?' · разгрузка':''));
  else sub.push(c.prog?'вне программы':'умный режим');
  const work=p.items.filter(it=>!['warm','cool'].includes(it.b));
  const pickHint=p.items.some(it=>/^Подбери вес/.test(it.note||''));
  return`<div class="fit-card fit-plan">
    <div class="fit-plan-sub">${sub.join(' · ')}</div>
    <div class="fit-plan-title">${escHtml(p.title)}</div>
    <div class="fit-plan-meta"><span>${p.minutes} мин</span><span>≈ ${p.kcal} ккал</span><span>${work.length} ${fitPlural(work.length,'упражнение','упражнения','упражнений')}</span></div>
    ${p.focus&&p.focus.length?`<div class="fit-tags">${p.focus.map(m=>`<span class="fit-tag">${FIT_MUSCLES[m]}</span>`).join('')}</div>`:''}
    ${p.notes.map(n=>`<div class="fit-note">${escHtml(n)}</div>`).join('')}
    ${pickHint?`<div class="fit-note muted">Вес подбирай так, чтобы последние 2 повтора давались тяжело, но техника не ломалась. Дальше Tempo подскажет сам.</div>`:''}
    <div class="fit-ex-list">${fitRenderPlanItems(p,true)}</div>
    <button class="wl-primary-btn fit-start" onclick="fitStart()">Начать тренировку</button>
    <div class="fit-plan-actions">
      <button onclick="fitRegen()">↻ Другая</button>
      <button onclick="fitOpenTimePlace()">◷ Условия</button>
      <button onclick="fitRestToday()">☾ Отдыхаю</button>
    </div>
    <button class="fit-link fit-center" onclick="fitOpenCustom()">Собрать свою тренировку</button>
  </div>`;
}

function fitRenderPlanItems(p,editable){
  const db=FIT_DB,idx=p.items.map((it,i)=>({it,i}));
  let h='';
  if(p.format==='intervals'&&p.segs){
    const run=p.segs.filter(s=>s.k==='work').reduce((a,s)=>a+s.sec,0);
    h+=`<div class="fit-block-lbl">Интервалы · бег всего ${Math.round(run/60)} мин</div>
      <div class="fit-seg-line">${p.segs.map(s=>`<i class="k-${s.k}" style="flex:${s.sec}"></i>`).join('')}</div>
      <div class="fit-seg-desc">${escHtml(p.desc||'')}</div>`;
  }
  const warm=idx.filter(o=>o.it.b==='warm'),cool=idx.filter(o=>o.it.b==='cool');
  const main=idx.filter(o=>!['warm','cool'].includes(o.it.b)&&!(p.format==='intervals'&&o.it.b==='cardio'));
  if(warm.length)h+=fitBlockRow('Разминка',warm);
  if(main.length){
    if(p.format==='circuit')h+=`<div class="fit-block-lbl">По кругу × ${p.rounds} · отдых между кругами ${p.restRound} сек</div>`;
    else if(p.format==='sets'||p.format==='cardio')h+=`<div class="fit-block-lbl">Основная часть</div>`;
    main.forEach(({it,i})=>{h+=fitExRow(it,i,editable,p.format);});
  }
  if(cool.length)h+=fitBlockRow('Заминка',cool);
  return h;
}

function fitBlockRow(lbl,list){
  const db=FIT_DB,sec=fitEstimate({format:'flow',items:list.map(o=>o.it)},db).sec;
  return`<div class="fit-block-row" onclick="this.classList.toggle('open')">
    <div class="fit-block-top"><span>${lbl}</span><span class="fit-block-meta">${Math.max(1,Math.round(sec/60))} мин · ${list.length} упр. <i>▾</i></span></div>
    <div class="fit-block-list">${list.map(o=>`<div onclick="event.stopPropagation();fitOpenEx('${o.it.id}')"><span>${escHtml(db.byId[o.it.id].name)}</span><em>${fitRxText(o.it,db.byId[o.it.id],true)}</em></div>`).join('')}</div>
  </div>`;
}

function fitExRow(it,i,editable,format){
  const e=FIT_DB.byId[it.id];if(!e)return'';
  const note=it.note&&!/^Подбери вес/.test(it.note)?it.note:'';
  return`<div class="fit-ex-row" onclick="fitOpenEx('${e.id}')">
    <div class="fit-ex-main">
      <div class="fit-ex-name">${escHtml(e.name)}${it.b==='fin'?' <span class="fit-badge">финишер</span>':''}</div>
      <div class="fit-ex-rx">${fitRxText(it,e,format==='circuit')}</div>
      ${note?`<div class="fit-ex-note">${escHtml(note)}</div>`:''}
    </div>
    ${editable?`<button class="fit-ex-swap" onclick="event.stopPropagation();fitOpenSwap(${i})" title="Заменить" aria-label="Заменить">⇄</button>`:''}
  </div>`;
}

function fitRenderRestCard(c){
  const stop=c.plan.mode==='stop';
  return`<div class="fit-card fit-rest">
    <div class="fit-rest-ic">${stop?'!':'☾'}</div>
    <div class="fit-card-title">${stop?'Сегодня без тренировки':'Сегодня отдыхаем'}</div>
    <div class="fit-card-sub">${stop?'Твоё самочувствие важнее плана. Спокойный день, вода, сон. Если симптомы повторяются — обязательно к врачу.':'Пей больше воды, высыпайся. Лёгкая прогулка — только если действительно хочется. Тренировки подождут, программа никуда не денется.'}</div>
    ${fitRestAwardBtn()}
  </div>`;
}

function fitRenderRestDayCard(){
  return`<div class="fit-card fit-rest">
    <div class="fit-rest-ic">☾</div>
    <div class="fit-card-title">По плану сегодня отдых</div>
    <div class="fit-card-sub">Мышцы растут и восстанавливаются именно в дни отдыха. Хочется подвигаться — есть мягкое восстановление на 15 минут.</div>
    <button class="wl-primary-btn" onclick="fitDayState('recovery',true)">Восстановление 15 минут</button>
    <div class="fit-plan-actions"><button onclick="fitDayState('force',true)">Всё равно потренироваться</button></div>
    ${fitRestAwardBtn()}
  </div>`;
}

function fitRestAwardBtn(){
  const a=DATA.fit.awards[todayKey()];
  return a&&a.r?`<div class="fit-hint center">✓ День отдыха отмечен</div>`:`<button class="fit-link fit-center" onclick="fitRestToday()">Отметить день отдыха · +${POINTS.fitRecovery}</button>`;
}

function fitRenderRestedCard(){
  return`<div class="fit-card fit-rest">
    <div class="fit-rest-ic">☾</div>
    <div class="fit-card-title">Сегодня отдыхаешь</div>
    <div class="fit-card-sub">Хорошее решение, если тело просит паузу. Завтра начнём с чек-ина.</div>
    <div class="fit-plan-actions"><button onclick="fitDayState('rest',false)">Передумал — тренироваться</button></div>
  </div>`;
}

function fitRenderDoneCard(list){
  const s=list[list.length-1];
  const prs=list.flatMap(x=>x.prs||[]);
  return`<div class="fit-card fit-done">
    <div class="fit-rest-ic good">✓</div>
    <div class="fit-card-title">Тренировка выполнена</div>
    <div class="fit-card-sub">${escHtml(s.title)} · ${s.min} мин${s.rpe?' · RPE '+s.rpe:''}${s.kcal?' · ≈ '+s.kcal+' ккал':''}</div>
    ${prs.length?`<div class="fit-prs">${prs.map(p=>`<div>📈 ${escHtml(p)}</div>`).join('')}</div>`:''}
    <div class="fit-plan-actions"><button onclick="fitOpenSession('${s.id}')">Подробнее</button><button onclick="fitDayState('more',true)">Ещё тренировка</button></div>
  </div>`;
}

function fitDayState(k,v){
  const f=DATA.fit,t=todayKey();
  if(!f.today||f.today.date!==t)f.today={date:t};
  f.today[k]=v;
  saveData();renderFit();window.scrollTo(0,0);
}

function fitRestToday(){
  const f=DATA.fit,t=todayKey(),ci=f.checkins[t]||{};
  if(!f.today||f.today.date!==t)f.today={date:t};
  f.today.rest=true;
  // баллы — только когда отдых по плану или по самочувствию, а не вместо тренировки
  const planned=!fitIsTrainingDay(t)||['light','recovery','rest','stop'].includes(ci.mode);
  const aw=f.awards[t]||(f.awards[t]={});
  if(planned&&!aw.r){aw.r=1;addPoints(POINTS.fitRecovery,'fit rest');showToast('Отдых — тоже часть плана · +'+POINTS.fitRecovery,'good');}
  else{saveData();showToast('Хорошо, сегодня отдыхаем');}
  updateTopBar();renderFit();
}

function fitRegen(){
  const f=DATA.fit,t=todayKey();
  f.regen[t]=(f.regen[t]||0)+1;
  saveData();renderFit();showToast('Собрал другой вариант');
}

function fitStart(){
  const c=fitTodayCtx();
  if(c.plan.type==='rest')return;
  fitPlayerStart(c.plan);
}

function fitRenderWeekMini(){
  const f=DATA.fit,t=todayKey(),d=dateFromKey(t);
  const mon=new Date(d);mon.setDate(d.getDate()-dayOfWeek(d));
  let cells='';
  for(let i=0;i<7;i++){
    const x=new Date(mon);x.setDate(mon.getDate()+i);
    const k=todayKey(x),ss=f.sessions.filter(s=>s.date===k),planned=fitIsTrainingDay(k);
    cells+=`<div class="fit-wd${k===t?' today':''}${ss.length?' done':''}"><div class="fit-wd-n">${FIT_DOW[i]}</div><div class="fit-wd-dot">${ss.length?(FIT_TYPE_ICON[ss[0].type]||'●'):planned?'○':'·'}</div></div>`;
  }
  const w=fitWeekStats(f.sessions,t);
  return`<div class="section-lbl">Неделя</div><div class="fit-card fit-week">
    <div class="fit-week-row">${cells}</div>
    <div class="fit-week-stats"><div><b>${w.n}</b>${fitPlural(w.n,'тренировка','тренировки','тренировок')}</div><div><b>${w.min}</b>минут</div><div><b>${w.strengthDays}/2</b>силовых</div></div>
    <div class="fit-bar"><i style="width:${Math.min(100,Math.round(w.min/150*100))}%"></i></div>
    <div class="fit-hint">За 7 дней: ${w.min} из 150 минут активности — минимум по рекомендации ВОЗ</div>
  </div>`;
}

// ── время и место ──

function fitOpenTimePlace(){
  const f=DATA.fit,ci=f.checkins[todayKey()]||{};
  const time=ci.time||f.profile.min,place=ci.place||f.profile.place;
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>Время и место</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll">
      <div class="field-lbl">Сколько есть времени</div>
      <div class="fit-chips">${[10,20,30,45,60,90].map(v=>`<button class="fit-chip${time===v?' sel':''}" onclick="fitSetTP('time',${v})">${v} мин</button>`).join('')}</div>
      <div class="field-lbl" style="margin-top:16px;">Где тренируешься сегодня</div>
      <div class="fit-chips">${Object.entries(FIT_PLACES).map(([k,v])=>`<button class="fit-chip${place===k?' sel':''}" onclick="fitSetTP('place','${k}')">${v}</button>`).join('')}</div>
      <div class="fit-hint">Тренировка пересоберётся под новое время и доступный инвентарь.</div>
    </div>
    <div class="panel-foot"><button class="pf-save" onclick="closeOverlay()">Готово</button></div>`;
  document.getElementById('overlay').classList.add('open');
}

function fitSetTP(k,v){
  const f=DATA.fit,t=todayKey();
  if(!f.checkins[t])f.checkins[t]={skip:true};
  f.checkins[t][k]=v;f.checkins[t].ts=Date.now();
  saveData();fitOpenTimePlace();renderFit();
}

// ── замена упражнения ──

function fitSwapFilter(place,rd,prog){
  const f=DATA.fit;
  return fitMakeFilter({profile:f.profile,body:fitBody(),place,readiness:rd,program:prog,ban:f.ban,fav:f.fav});
}

function fitOpenSwap(i){
  const c=fitTodayCtx(),it=c.plan.items[i],e=FIT_DB.byId[it.id];
  const alts=fitAlternatives(it,c.plan,FIT_DB,fitSwapFilter(c.place,c.rd,c.prog));
  fitShowSwapPanel(e,alts,'fitDoSwap('+i+',',`fitBanSwap(${i})`);
}

function fitShowSwapPanel(e,alts,onPick,onBan){
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>Заменить: ${escHtml(e.name)}</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll">
      ${alts.length?alts.map(a=>`<div class="fit-lib-row" onclick="${onPick}'${a.id}')">
        <div class="fit-lib-main"><div class="fit-lib-name">${escHtml(a.name)}</div><div class="fit-lib-sub">${a.primary.map(m=>FIT_MUSCLES[m]).join(', ')} · ${fitEquipText(a)}</div></div>
        <div class="fit-dots">${'●'.repeat(a.difficulty)}<span>${'●'.repeat(5-a.difficulty)}</span></div></div>`).join('')
      :`<div class="fit-hint">Подходящих замен с твоим инвентарём и ограничениями не нашлось.</div>`}
    </div>
    ${onBan?`<div class="panel-foot"><button class="pf-cancel" onclick="${onBan}">Больше не предлагать это упражнение</button></div>`:''}`;
  document.getElementById('overlay').classList.add('open');
}

function fitDoSwap(i,id){
  const f=DATA.fit,plan=f.day&&f.day.plan,e=FIT_DB.byId[id];
  if(!plan||!e)return;
  plan.items[i]=fitRetarget(plan.items[i],e,f.sessions,fitLvlN());
  const est=fitEstimate(plan,FIT_DB,fitBody().weight||70);plan.minutes=est.min;plan.kcal=est.kcal;
  saveData();closeOverlay();renderFit();showToast('Заменил на «'+e.name+'»');
}

function fitBanSwap(i){
  const f=DATA.fit,plan=f.day&&f.day.plan;if(!plan)return;
  const it=plan.items[i];
  if(!f.ban.includes(it.id))f.ban.push(it.id);
  const c=fitTodayCtx();
  const alt=fitAlternatives(it,plan,FIT_DB,fitSwapFilter(c.place,c.rd,c.prog))[0];
  if(alt)fitDoSwap(i,alt.id);else{saveData();closeOverlay();renderFit();}
  showToast('Больше не буду его предлагать');
}

// ── карточка упражнения ──

function fitBodyMap(pri,sec){
  const P=new Set(pri||[]),S=new Set(sec||[]);
  const k=m=>P.has(m)?' p':S.has(m)?' s':'';
  const r=(m,x,y,w,h,rx)=>`<rect class="bm${k(m)}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx==null?3:rx}"/>`;
  const el=(m,cx,cy,rx,ry)=>`<ellipse class="bm${k(m)}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  const pa=(m,d)=>`<path class="bm${k(m)}" d="${d}"/>`;
  const front=[
    `<circle class="bm n" cx="50" cy="11" r="8"/>`,
    pa('traps','M42 22 Q50 19 58 22 L56 27 L44 27 Z'),
    el('delts_side',28.5,34,3.8,7),el('delts_side',71.5,34,3.8,7),
    el('delts_front',34.5,31,5,6),el('delts_front',65.5,31,5,6),
    r('chest',38.5,28,11,14,4),r('chest',50.5,28,11,14,4),
    r('biceps',25,41,7,16,3.5),r('biceps',68,41,7,16,3.5),
    r('forearms',22,58.5,6.5,18,3),r('forearms',71.5,58.5,6.5,18,3),
    r('abs',43.5,44,13,25,3),
    r('obliques',38,45,4.5,21,2),r('obliques',57.5,45,4.5,21,2),
    el('hip_flexors',43.5,73,3.6,3.6),el('hip_flexors',56.5,73,3.6,3.6),
    r('quads',37,78,10,31,5),r('quads',53,78,10,31,5),
    r('adductors',46.5,79,3,21,1.5),r('adductors',50.5,79,3,21,1.5),
    `<rect class="bm n" x="38.5" y="112" width="8" height="26" rx="4"/><rect class="bm n" x="53.5" y="112" width="8" height="26" rx="4"/>`,
  ].join('');
  const back=[
    `<circle class="bm n" cx="150" cy="11" r="8"/>`,
    pa('traps','M141 21 L159 21 L155 38 L145 38 Z'),
    el('delts_rear',133.5,32,5,6.5),el('delts_rear',166.5,32,5,6.5),
    r('upper_back',140,30,20,12,3),
    pa('lats','M136.5 42 L147 44 L147 60 L140 58 Z'),pa('lats','M163.5 42 L153 44 L153 60 L160 58 Z'),
    r('triceps',125,41,7,16,3.5),r('triceps',168,41,7,16,3.5),
    r('forearms',122,58.5,6.5,18,3),r('forearms',171.5,58.5,6.5,18,3),
    r('lower_back',143.5,55,13,15,3),
    el('glutes',144,79,7,8),el('glutes',156,79,7,8),
    r('hamstrings',137,89,10,21,5),r('hamstrings',153,89,10,21,5),
    el('calves',142,123,4.8,12),el('calves',158,123,4.8,12),
  ].join('');
  return`<svg class="fit-bodymap" viewBox="0 0 200 146" role="img" aria-label="Карта мышц">${front}${back}<text x="50" y="145" class="bm-t">спереди</text><text x="150" y="145" class="bm-t">сзади</text></svg>`;
}

function fitOpenEx(id){
  const e=FIT_DB&&FIT_DB.byId[id];if(!e)return;
  const f=DATA.fit,fav=f.fav.includes(id),ban=f.ban.includes(id);
  const hist=fitExHistory(f.sessions,id).slice(0,4);
  const rec=fitRecords(f.sessions,FIT_DB)[id];
  const reg=e.regression&&FIT_DB.byId[e.regression],prg=e.progression&&FIT_DB.byId[e.progression];
  const fmtSet=s=>s.t?s.t+' сек':(s.w?fitNum(s.w)+' кг × ':'')+(s.r||0);
  let recTxt='';
  if(rec)recTxt=rec.e1rm?fitNum(rec.kg)+' кг × '+rec.r+' (≈ '+Math.round(rec.e1rm)+' кг на 1 повтор)':rec.bestR?rec.bestR+' повторов':rec.bestT?rec.bestT+' сек':'';
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>${escHtml(e.name)}</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll fit-exd">
      <div class="fit-tags">
        <span class="fit-tag">${FIT_CATS[e.category]}</span><span class="fit-tag">${fitEquipText(e)}</span>
        <span class="fit-tag">сложность <b class="fit-dots">${'●'.repeat(e.difficulty)}<span>${'●'.repeat(5-e.difficulty)}</span></b></span>
        ${e.impact==='high'?'<span class="fit-tag warn">ударная нагрузка</span>':''}${e.unilateral?'<span class="fit-tag">на каждую сторону</span>':''}
      </div>
      ${fitBodyMap(e.primary,e.secondary)}
      <div class="fit-exd-mus"><div><i class="p"></i>${e.primary.map(m=>FIT_MUSCLES[m]).join(', ')}</div>${e.secondary.length?`<div><i class="s"></i>${e.secondary.map(m=>FIT_MUSCLES[m]).join(', ')}</div>`:''}</div>
      <div class="fit-exd-h">Техника</div>
      <ol class="fit-exd-list">${e.cues.map(x=>`<li>${escHtml(x)}</li>`).join('')}</ol>
      <div class="fit-exd-h">Частые ошибки</div>
      <ul class="fit-exd-list bad">${e.mistakes.map(x=>`<li>${escHtml(x)}</li>`).join('')}</ul>
      <div class="fit-exd-h">Дыхание</div>
      <div class="fit-exd-txt">${escHtml(e.breathing||FIT_BREATH[e.category]||'')}</div>
      ${reg||prg?`<div class="fit-exd-h">Цепочка</div><div class="fit-exd-chain">${reg?`<button onclick="fitOpenEx('${reg.id}')">← Проще: ${escHtml(reg.name)}</button>`:''}${prg?`<button onclick="fitOpenEx('${prg.id}')">Сложнее: ${escHtml(prg.name)} →</button>`:''}</div>`:''}
      ${e.avoidIf.length?`<div class="fit-exd-txt muted">Не предлагаю, если отмечено: ${e.avoidIf.map(t=>FIT_LIMITS[t].toLowerCase()).join(', ')}.</div>`:''}
      ${hist.length?`<div class="fit-exd-h">Твоя история</div>${recTxt?`<div class="fit-exd-txt">Рекорд: <b>${recTxt}</b></div>`:''}${hist.map(h=>`<div class="fit-exd-hist"><span>${relDay(h.date)||fmtDate(dateFromKey(h.date))}</span><span>${h.sets.map(fmtSet).join(' · ')}</span></div>`).join('')}`:''}
    </div>
    <div class="panel-foot">
      <button class="pf-cancel" onclick="fitToggleList('ban','${id}')">${ban?'Снова предлагать':'⊘ Не предлагать'}</button>
      <button class="pf-save" onclick="fitToggleList('fav','${id}')">${fav?'★ В избранном':'☆ В избранное'}</button>
    </div>`;
  document.getElementById('overlay').classList.add('open');
}

function fitToggleList(k,id){
  const a=DATA.fit[k],i=a.indexOf(id);
  if(i>=0)a.splice(i,1);else a.push(id);
  saveData();fitOpenEx(id);
  if(DATA.fit.tab==='lib')fitLibList();
}

// ── вкладка «Упражнения» ────────────────────────────────────

function fitRenderLib(){
  const L=FIT_LIB;
  return`<input class="field-inp fit-search" id="fit-lib-q" type="search" placeholder="Поиск: присед, планка, гантели…" value="${escHtml(L.q)}" oninput="FIT_LIB.q=this.value;FIT_LIB.limit=60;fitLibList()"/>
    <div class="fit-chips scroll">${[['all','Все'],...Object.entries(FIT_CATS)].map(([k,n])=>`<button class="fit-chip sm${L.cat===k?' sel':''}" onclick="fitLibSet('cat','${k}')">${n}</button>`).join('')}</div>
    <div class="fit-lib-filters">
      <select class="field-inp fit-select" onchange="fitLibSet('mus',this.value)" aria-label="Мышцы"><option value="all">Все мышцы</option>${Object.entries(FIT_MUSCLES).map(([k,n])=>`<option value="${k}"${L.mus===k?' selected':''}>${n}</option>`).join('')}</select>
      <select class="field-inp fit-select" onchange="fitLibSet('eq',this.value)" aria-label="Инвентарь"><option value="all">Любой инвентарь</option><option value="none"${L.eq==='none'?' selected':''}>Без инвентаря</option>${Object.entries(FIT_EQUIP).map(([k,n])=>`<option value="${k}"${L.eq===k?' selected':''}>${n}</option>`).join('')}</select>
    </div>
    <div class="fit-chips"><button class="fit-chip sm${L.avail?' sel':''}" onclick="fitLibSet('avail',${!L.avail})">Доступно мне</button><button class="fit-chip sm${L.fav?' sel':''}" onclick="fitLibSet('fav',${!L.fav})">★ Избранное</button></div>
    <div id="fit-lib-list"></div>`;
}

function fitLibSet(k,v){FIT_LIB[k]=v;FIT_LIB.limit=60;renderFit();}

function fitLibFiltered(){
  const L=FIT_LIB,q=L.q.trim().toLowerCase(),f=DATA.fit;
  const flt=L.avail?fitMakeFilter({profile:f.profile,body:fitBody(),place:f.profile.place,readiness:{}}):null;
  return FIT_DB.ex.filter(e=>{
    if(L.cat!=='all'&&e.category!==L.cat)return false;
    if(L.mus!=='all'&&!e.primary.includes(L.mus)&&!e.secondary.includes(L.mus))return false;
    if(L.eq==='none'&&e.equipment.length)return false;
    if(L.eq!=='all'&&L.eq!=='none'&&!e.equipment.includes(L.eq))return false;
    if(L.fav&&!f.fav.includes(e.id))return false;
    if(flt&&!fitAllowed(e,flt,true))return false;
    if(q){
      const hay=[e.name,...(e.aliases||[]),...e.primary.map(m=>FIT_MUSCLES[m]),...e.equipment.map(x=>FIT_EQUIP[x])].join(' ').toLowerCase();
      if(!q.split(/\s+/).every(w=>hay.includes(w)))return false;
    }
    return true;
  });
}

function fitLibList(){
  const el=document.getElementById('fit-lib-list');if(!el)return;
  const list=fitLibFiltered(),f=DATA.fit;
  let h=`<div class="fit-lib-count">${list.length} ${fitPlural(list.length,'упражнение','упражнения','упражнений')}</div>`;
  list.slice(0,FIT_LIB.limit).forEach(e=>{
    h+=`<div class="fit-lib-row" onclick="fitOpenEx('${e.id}')">
      <div class="fit-lib-main"><div class="fit-lib-name">${escHtml(e.name)}${f.fav.includes(e.id)?' <span class="fit-star">★</span>':''}${f.ban.includes(e.id)?' <span class="fit-ban">⊘</span>':''}</div>
      <div class="fit-lib-sub">${e.primary.map(m=>FIT_MUSCLES[m]).join(', ')} · ${fitEquipText(e)}</div></div>
      <div class="fit-dots">${'●'.repeat(e.difficulty)}<span>${'●'.repeat(5-e.difficulty)}</span></div>
    </div>`;
  });
  if(list.length>FIT_LIB.limit)h+=`<button class="fit-more-btn" onclick="FIT_LIB.limit+=60;fitLibList()">Показать ещё</button>`;
  if(!list.length)h+=`<div class="fit-hint center">Ничего не нашлось — попробуй другой запрос или сбрось фильтры</div>`;
  el.innerHTML=h;
}

// ── вкладка «План» ──────────────────────────────────────────

function fitRenderPlanTab(){
  const f=DATA.fit,prog=fitProg();
  if(!f.setupDone)return fitRenderIntro();
  let h='';
  if(prog){
    const st=fitProgramState(prog,f.program),next=st.tplId?FIT_DB.tpl[st.tplId]:null;
    h+=`<div class="fit-card">
      <div class="fit-plan-sub">Программа</div><div class="fit-plan-title">${escHtml(prog.name)}</div>
      <div class="fit-plan-meta"><span>Неделя ${st.week} из ${st.weeks}</span><span>${st.idx} из ${st.total} тренировок</span>${st.deload?'<span class="fit-badge">разгрузка</span>':''}</div>
      <div class="fit-bar"><i style="width:${st.pct}%"></i></div>
      ${next?`<div class="fit-prog-next">Следующая: <b>${escHtml(next.name)}</b> — ${escHtml(next.desc||'')}</div>`:''}
      <div class="fit-plan-actions"><button onclick="fitOpenPrograms()">Сменить программу</button><button onclick="fitOpenProgram('${prog.id}')">О программе</button></div>
    </div>`;
  }else{
    h+=`<div class="fit-card">
      <div class="fit-plan-sub">Режим</div><div class="fit-plan-title">Умный режим</div>
      <div class="fit-card-sub">Без жёсткой программы: каждый день выбираю тип тренировки по самочувствию, восстановлению мышц и недельным целям — 2+ силовых и 150 минут активности.</div>
      <div class="fit-plan-actions"><button onclick="fitOpenPrograms()">Выбрать программу</button></div>
    </div>`;
  }
  h+=`<div class="section-lbl">Дни тренировок</div><div class="fit-days">${FIT_DOW.map((d,i)=>`<button class="fit-day${(f.profile.days||[]).includes(i)?' sel':''}" onclick="fitToggleDay(${i})">${d}</button>`).join('')}</div>`;
  if(prog&&prog.days<7&&(f.profile.days||[]).length!==prog.days)h+=`<div class="fit-hint">В программе ${prog.days} ${fitPlural(prog.days,'тренировка','тренировки','тренировок')} в неделю, а выбрано дней: ${(f.profile.days||[]).length}. Так тоже можно — программа просто пройдёт быстрее или медленнее.</div>`;
  h+=fitRenderProgress();
  h+=fitRenderHistory();
  h+=`<div class="section-lbl">Настройки</div><div class="fit-card fit-settings">
    <button class="fit-set-row" onclick="fitOnbStart(true)"><span>Профиль, цель и инвентарь</span><span>›</span></button>
    <button class="fit-set-row" onclick="fitToggleSound()"><span>Звук таймера</span><span class="${f.sound?'on':''}">${f.sound?'вкл':'выкл'}</span></button>
    <button class="fit-set-row" onclick="fitOpenAbout()"><span>Как это работает и безопасность</span><span>›</span></button>
  </div>`;
  return h;
}

function fitToggleDay(i){
  const d=DATA.fit.profile.days,k=d.indexOf(i);
  if(k>=0)d.splice(k,1);else{d.push(i);d.sort((a,b)=>a-b);}
  saveData();renderFit();
}
function fitToggleSound(){DATA.fit.sound=!DATA.fit.sound;saveData();renderFit();}

function fitRenderProgress(){
  const f=DATA.fit,t=todayKey(),db=FIT_DB,ss=f.sessions;
  const w=fitWeekStats(ss,t);
  const cis=[];
  for(let i=27;i>=0;i--){const k=shiftDay(t,-i),c=f.checkins[k];cis.push({v:c&&!c.skip&&c.score!=null?c.score:null,s:ss.some(s=>s.date===k)});}
  const last7=cis.slice(-7).filter(x=>x.v!=null).map(x=>x.v);
  const avg7=last7.length?Math.round(last7.reduce((a,b)=>a+b,0)/last7.length):null;
  let h=`<div class="section-lbl">Прогресс</div><div class="fit-stats">
    <div><b>${fitWorkoutsCount(DATA)}</b><span>всего тренировок</span></div>
    <div><b>${ss.filter(s=>s.date>shiftDay(t,-28)).length}</b><span>за 4 недели</span></div>
    <div><b>${w.min}</b><span>минут за 7 дней</span></div>
    <div><b>${avg7!=null?avg7:'—'}</b><span>готовность, 7 дней</span></div>
  </div>`;
  if(cis.filter(x=>x.v!=null).length>=2)h+=`<div class="fit-card"><div class="fit-card-title sm">Готовность за 4 недели</div>${fitReadyChart(cis)}</div>`;
  const ms=fitMuscleSets(ss,shiftDay(t,-6),t,db);
  const top=Object.entries(ms).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(top.length){
    const max=top[0][1];
    h+=`<div class="fit-card"><div class="fit-card-title sm">Подходы по мышцам за 7 дней</div>
      ${top.map(([m,n])=>`<div class="fit-mrow"><span>${FIT_MUSCLES[m]}</span><div class="fit-bar sm"><i style="width:${Math.round(n/max*100)}%"></i></div><b>${fitNum(n)}</b></div>`).join('')}
      <div class="fit-hint">Для роста мышц обычно хватает 10–20 рабочих подходов на группу в неделю.</div></div>`;
  }
  const rec=fitRecords(ss,db);
  const list=Object.entries(rec).filter(([id,r])=>db.byId[id]&&(r.e1rm||r.bestR||r.bestT)).sort((a,b)=>(b[1].date||'').localeCompare(a[1].date||'')).slice(0,6);
  if(list.length)h+=`<div class="fit-card"><div class="fit-card-title sm">Рекорды</div>${list.map(([id,r])=>`<div class="fit-rec" onclick="fitOpenEx('${id}')"><span>${escHtml(db.byId[id].name)}</span><b>${r.e1rm?fitNum(r.kg)+' кг × '+r.r:r.bestR?r.bestR+' повт.':r.bestT+' сек'}</b></div>`).join('')}</div>`;
  return h;
}

function fitReadyChart(cis){
  const W=300,H=86,pad=8,n=cis.length;
  const x=i=>pad+(W-2*pad)*i/(n-1),y=v=>pad+(1-v/100)*(H-pad-16);
  let path='',on=false;
  cis.forEach((c,i)=>{if(c.v==null)return;path+=(on?'L':'M')+x(i).toFixed(1)+','+y(c.v).toFixed(1)+' ';on=true;});
  let svg=`<svg class="fit-chart" viewBox="0 0 ${W} ${H}">`;
  [40,60,80].forEach(v=>{svg+=`<line x1="${pad}" x2="${W-pad}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="fit-chart-grid"/><text x="${W-pad}" y="${(y(v)-2).toFixed(1)}" class="fit-chart-txt">${v}</text>`;});
  svg+=`<path d="${path}" class="fit-chart-line"/>`;
  cis.forEach((c,i)=>{
    if(c.v!=null)svg+=`<circle cx="${x(i).toFixed(1)}" cy="${y(c.v).toFixed(1)}" r="2.2" class="fit-chart-dot"/>`;
    if(c.s)svg+=`<rect x="${(x(i)-2.5).toFixed(1)}" y="${H-8}" width="5" height="5" rx="1.2" class="fit-chart-ses"/>`;
  });
  return svg+`</svg><div class="fit-chart-leg"><span>— готовность</span><span>■ день с тренировкой</span></div>`;
}

function fitRenderHistory(){
  const ss=DATA.fit.sessions.slice(-15).reverse();
  let h=`<div class="section-lbl">История</div>`;
  if(!ss.length)return h+`<div class="fit-hint">Пока пусто — первая тренировка появится здесь.</div>`;
  return h+ss.map(s=>`<div class="fit-hist" onclick="fitOpenSession('${s.id}')">
    <div class="fit-hist-ic">${FIT_TYPE_ICON[s.type]||'●'}</div>
    <div class="fit-hist-main"><div class="fit-hist-t">${escHtml(s.title)}</div><div class="fit-hist-s">${relDay(s.date)||fmtDate(dateFromKey(s.date))} · ${s.min} мин${s.rpe?' · RPE '+s.rpe:''}${(s.prs||[]).length?' · рекордов: '+s.prs.length:''}</div></div>
    <span class="fit-hist-arrow">›</span></div>`).join('');
}

function fitOpenSession(id){
  const s=DATA.fit.sessions.find(x=>x.id===id);if(!s)return;
  const db=FIT_DB;
  const fmtSet=x=>x.t?fitFmtSec(x.t):(x.w?fitNum(x.w)+'×':'')+(x.r||0);
  const FB={easy:'легко',ok:'нормально',hard:'тяжело'};
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>${escHtml(s.title)}</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll">
      <div class="fit-tags"><span class="fit-tag">${relDay(s.date)||fmtDate(dateFromKey(s.date))}</span><span class="fit-tag">${s.min} мин</span>${s.rpe?`<span class="fit-tag">RPE ${s.rpe}</span>`:''}${s.kcal?`<span class="fit-tag">≈ ${s.kcal} ккал</span>`:''}${s.pts?`<span class="fit-tag good">+${s.pts} баллов</span>`:''}</div>
      ${(s.prs||[]).length?`<div class="fit-prs">${s.prs.map(p=>`<div>📈 ${escHtml(p)}</div>`).join('')}</div>`:''}
      ${(s.ex||[]).filter(x=>(x.sets||[]).length).map(x=>{const e=db.byId[x.id];return`<div class="fit-exd-hist"><span>${e?escHtml(e.name):x.id}</span><span>${x.sets.map(fmtSet).join(' · ')}${x.fb?' · '+FB[x.fb]:''}</span></div>`;}).join('')}
      ${(s.feel||[]).length?`<div class="fit-exd-txt">Самочувствие: ${s.feel.map(escHtml).join(', ')}</div>`:''}
      ${s.note?`<div class="fit-exd-txt">«${escHtml(s.note)}»</div>`:''}
    </div>
    <div class="panel-foot"><button class="pf-delete" onclick="fitDeleteSession('${s.id}')">Удалить</button><button class="pf-save" onclick="closeOverlay()">Закрыть</button></div>`;
  document.getElementById('overlay').classList.add('open');
}

function fitDeleteSession(id){
  if(!confirm('Удалить тренировку из истории? Баллы за неё спишутся.'))return;
  const f=DATA.fit,i=f.sessions.findIndex(x=>x.id===id);if(i<0)return;
  const s=f.sessions[i];
  f.sessions.splice(i,1);
  if(s.progId&&f.program.id===s.progId&&f.program.idx>0)f.program.idx--;
  const a=f.awards[s.date];
  if(a&&s.pts){if(s.type==='recovery')delete a.r;else delete a.w;}
  if(s.pts)addPoints(-s.pts,'fit undo');else{saveData();checkAchievements();}
  closeOverlay();renderFit();updateTopBar();showToast('Тренировка удалена');
}

// ── программы ──

function fitOpenPrograms(){
  const f=DATA.fit,rec=fitRecommend(FIT_DB.programs,f.profile,fitBody());
  const top=new Set(rec.slice(0,3).filter(r=>r.s>=4).map(r=>r.p.id)),cur=f.program.id;
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>Программы</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll">
      <div class="fit-prog-card${cur==='smart'?' cur':''}" onclick="fitStartProgram('smart')"><div class="fit-prog-card-t">Умный режим ${cur==='smart'?'<span class="fit-badge">сейчас</span>':''}</div><div class="fit-prog-card-s">Без программы — тип тренировки выбирается каждый день по самочувствию и недельным целям</div></div>
      ${rec.map(({p})=>`<div class="fit-prog-card${cur===p.id?' cur':''}" onclick="fitOpenProgram('${p.id}')">
        <div class="fit-prog-card-t">${escHtml(p.name)} ${top.has(p.id)?'<span class="fit-badge good">подходит</span>':''}${cur===p.id?'<span class="fit-badge">сейчас</span>':''}</div>
        <div class="fit-prog-card-s">${FIT_LEVELS[p.level]} · ${p.days>=7?'каждый день':p.days+' '+fitPlural(p.days,'раз','раза','раз')+' в неделю'} · ${p.weeks} нед · ~${p.minutes} мин</div>
      </div>`).join('')}
    </div>`;
  document.getElementById('overlay').classList.add('open');
}

function fitOpenProgram(id){
  const p=FIT_DB.programs.find(x=>x.id===id);if(!p)return;
  const tpls=[...new Set(p.sessions||p.rotation)].map(t=>FIT_DB.tpl[t]).filter(Boolean);
  const cur=DATA.fit.program.id===id;
  const shown=p.sessions?tpls.slice(0,3):tpls;
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>${escHtml(p.name)}</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll">
      <div class="fit-exd-txt">${escHtml(p.desc)}</div>
      <div class="fit-prog-meta">
        <div><span>Цели</span><b>${(p.goals||[]).map(g=>FIT_GOALS[g]).join(', ')}</b></div>
        <div><span>Уровень</span><b>${FIT_LEVELS[p.level]}</b></div>
        <div><span>Частота</span><b>${p.days>=7?'каждый день':p.days+' '+fitPlural(p.days,'раз','раза','раз')+' в неделю'}</b></div>
        <div><span>Длительность</span><b>${p.weeks} нед · ~${p.minutes} мин</b></div>
        <div><span>Где</span><b>${(p.place||[]).map(x=>FIT_PLACES[x]).join(', ')}</b></div>
        <div><span>Нужно</span><b>${(p.needs||[]).length?p.needs.map(q=>FIT_EQUIP[q]).join(', '):'ничего'}</b></div>
        ${(p.deload||[]).length?`<div><span>Разгрузка</span><b>${p.deload.map(w=>w+'-я неделя').join(', ')}</b></div>`:''}
      </div>
      <div class="fit-exd-h">Тренировки</div>
      ${shown.map(t=>`<div class="fit-exd-hist"><span>${escHtml(t.name)}</span><span>${escHtml(t.desc||'')}</span></div>`).join('')}
      ${p.sessions&&tpls.length>3?`<div class="fit-hint">…и дальше каждую неделю чуть длиннее — до ${escHtml(tpls[tpls.length-1].name.toLowerCase())}.</div>`:''}
    </div>
    <div class="panel-foot"><button class="pf-cancel" onclick="fitOpenPrograms()">← Все</button><button class="pf-save" onclick="fitStartProgram('${p.id}')">${cur?'Продолжить':'Начать программу'}</button></div>`;
  document.getElementById('overlay').classList.add('open');
}

function fitStartProgram(id){
  const f=DATA.fit;
  if(f.program.id===id){closeOverlay();return;}
  if(f.program.id!=='smart'&&(f.program.idx||0)>0&&!confirm('Прогресс текущей программы сбросится. Продолжить?'))return;
  f.program=id==='smart'?{id:'smart'}:{id,idx:0,start:todayKey()};
  f.day=null;saveData();closeOverlay();renderFit();
  const p=fitProg();
  showToast(p?'Программа «'+p.name+'» начата':'Включён умный режим','good');
}

// ── онбординг и профиль ─────────────────────────────────────

function fitOnbStart(edit){
  fitEnsure(DATA);
  const p=DATA.fit.profile,b=fitBody();
  FIT_ONB={step:edit?1:0,edit:!!edit,d:{sex:b.sex||'',age:b.age||'',height:b.height||'',weight:b.weight||'',goal:p.goal,level:p.level,test:Object.assign({},p.test||{}),
    place:p.place,equipHome:(p.equip.home||[]).slice(),equipOut:(p.equip.outdoor||[]).slice(),parq:(p.parq||[]).slice(),limits:(p.limits||[]).slice(),
    days:(p.days||[]).slice(),min:p.min,prefs:Object.assign({},p.prefs||{})}};
  closeOverlay();
  DATA.fit.tab='today';renderFit();window.scrollTo(0,0);
}

function fitOnbSet(k,v){FIT_ONB.d[k]=v;renderFit();}
function fitOnbToggle(k,v){const a=FIT_ONB.d[k],i=a.indexOf(v);if(i>=0)a.splice(i,1);else a.push(v);renderFit();}
function fitOnbPref(k){
  const p=FIT_ONB.d.prefs;
  if(k==='lowImpact'){p.lowImpactSelf=!p.lowImpactSelf;p.lowImpact=p.lowImpactSelf||!!p.gentle;}
  else p[k]=!p[k];
  renderFit();
}
function fitOnbGo(d){FIT_ONB.step+=d;renderFit();window.scrollTo(0,0);}

function fitOnbParq(k){
  const d=FIT_ONB.d,i=d.parq.indexOf(k);
  if(i>=0)d.parq.splice(i,1);else d.parq.push(k);
  const any=d.parq.length>0;
  d.prefs.gentle=any;d.prefs.lowImpact=any||!!d.prefs.lowImpactSelf;
  if((d.parq.includes('heart')||d.parq.includes('meds'))&&!d.limits.includes('hypertension'))d.limits.push('hypertension');
  renderFit();
}

function fitTestLevel(t){
  let s=0,n=0;
  const add=(v,a,b)=>{if(v==null||v==='')return;n++;s+=v>=a?3:v>=b?2:1;};
  add(t.pu,25,10);add(t.pl,90,45);add(t.sq,40,25);
  if(!n)return null;
  const a=s/n;return a>=2.6?'advanced':a>=1.7?'intermediate':'novice';
}

function fitRenderOnb(){
  const o=FIT_ONB,d=o.d,last=o.edit?6:7,st=o.step;
  const dots=`<div class="fit-onb-dots">${Array.from({length:last},(_,i)=>`<i class="${i+1<=st?'on':''}"></i>`).join('')}</div>`;
  const nav=(canNext,nextLbl)=>`<div class="fit-onb-nav">${st>(o.edit?1:0)?`<button class="pf-cancel" onclick="fitOnbGo(-1)">Назад</button>`:`<button class="pf-cancel" onclick="FIT_ONB=null;renderFit()">Отмена</button>`}
    <button class="pf-save"${canNext?'':' disabled'} onclick="${st===last&&o.edit?'fitOnbFinish()':'fitOnbGo(1)'}">${nextLbl||'Далее'}</button></div>`;
  const chip=(sel,on,txt,cls)=>`<button class="fit-chip${cls?' '+cls:''}${sel?' sel':''}" onclick="${on}">${txt}</button>`;
  let h=`<div class="fit-card fit-onb">`+(st>0?dots:'');
  if(st===0){
    h+=`<div class="fit-card-title">Перед стартом</div>
      <div class="fit-onb-txt">Tempo Fit подбирает тренировки по твоему самочувствию, но он не врач. Если есть хронические болезни, травмы или беременность — обсуди нагрузки со специалистом.</div>
      <div class="fit-onb-txt">Во время тренировки слушай тело: острая боль, головокружение или боль в груди — повод сразу остановиться.</div>
      <div class="fit-onb-nav"><button class="pf-cancel" onclick="FIT_ONB=null;renderFit()">Отмена</button><button class="pf-save" onclick="fitOnbGo(1)">Понятно</button></div>`;
  }else if(st===1){
    const hasW=latestWeight(DATA)!=null;
    h+=`<div class="fit-card-title">Немного о тебе</div><div class="fit-card-sub">Уже известное подставил из раздела «Тело». Это нужно, чтобы подобрать нагрузку и посчитать калории.</div>
      <div class="field-lbl">Пол</div><div class="fit-chips">${chip(d.sex==='m',"fitOnbSet('sex','m')",'Мужской')}${chip(d.sex==='f',"fitOnbSet('sex','f')",'Женский')}</div>
      <div class="fit-onb-grid">
        <div><div class="field-lbl">Возраст</div><input class="field-inp" aria-label="Возраст" type="number" inputmode="numeric" min="10" max="100" value="${d.age}" oninput="FIT_ONB.d.age=+this.value||''"/></div>
        <div><div class="field-lbl">Рост, см</div><input class="field-inp" aria-label="Рост" type="number" inputmode="numeric" min="100" max="250" value="${d.height}" oninput="FIT_ONB.d.height=+this.value||''"/></div>
        <div><div class="field-lbl">Вес, кг</div><input class="field-inp" aria-label="Вес" type="number" inputmode="decimal" step="0.1" min="25" max="300" value="${d.weight}" ${hasW?'disabled':''} oninput="FIT_ONB.d.weight=+this.value||''"/></div>
      </div>
      ${hasW?`<div class="fit-hint">Вес берётся из твоих записей во вкладке «Тело».</div>`:''}
      ${nav(true)}`;
  }else if(st===2){
    h+=`<div class="fit-card-title">Главная цель</div><div class="fit-card-sub">От неё зависят подходы, повторы и доля кардио.</div>
      <div class="fit-opt-list">${Object.entries(FIT_GOALS).map(([k,v])=>`<button class="fit-opt${d.goal===k?' sel':''}" onclick="fitOnbSet('goal','${k}')"><b>${v}</b><span>${{fatloss:'Силовые + кардио, умеренный отдых',muscle:'6–12 повторов, больше подходов на мышцу',strength:'Тяжёлые базовые движения, 4–6 повторов',endurance:'Кардио, интервалы, высокие повторы',health:'Мягкая сила, баланс, мобильность',fitness:'Всего понемногу, без крайностей'}[k]}</span></button>`).join('')}</div>
      ${nav(!!d.goal)}`;
  }else if(st===3){
    const tl=fitTestLevel(d.test);
    h+=`<div class="fit-card-title">Опыт тренировок</div>
      <div class="fit-opt-list">${Object.entries(FIT_LEVELS).map(([k,v])=>`<button class="fit-opt${d.level===k?' sel':''}" onclick="fitOnbSet('level','${k}')"><b>${v}</b><span>${{novice:'Не тренируюсь или был долгий перерыв',intermediate:'Тренируюсь регулярно от полугода',advanced:'Больше двух лет, знаю технику базы'}[k]}</span></button>`).join('')}</div>
      <div class="fit-exd-h">Мини-тест (по желанию)</div>
      <div class="fit-onb-grid">
        <div><div class="field-lbl">Отжиманий подряд</div><input class="field-inp" type="number" inputmode="numeric" min="0" value="${d.test.pu!=null?d.test.pu:''}" oninput="FIT_ONB.d.test.pu=this.value===''?null:+this.value"/></div>
        <div><div class="field-lbl">Планка, сек</div><input class="field-inp" type="number" inputmode="numeric" min="0" value="${d.test.pl!=null?d.test.pl:''}" oninput="FIT_ONB.d.test.pl=this.value===''?null:+this.value"/></div>
        <div><div class="field-lbl">Приседаний за минуту</div><input class="field-inp" type="number" inputmode="numeric" min="0" value="${d.test.sq!=null?d.test.sq:''}" oninput="FIT_ONB.d.test.sq=this.value===''?null:+this.value"/></div>
      </div>
      <button class="fit-more-btn" onclick="fitOnbApplyTest()">Проверить уровень по тесту</button>
      ${tl?`<div class="fit-hint">По тесту: <b>${FIT_LEVELS[tl]}</b>${tl!==d.level?' — можно выбрать выше':' — совпадает с выбором'}</div>`:''}
      ${nav(!!d.level)}`;
  }else if(st===4){
    h+=`<div class="fit-card-title">Где и с чем</div>
      <div class="field-lbl">Обычно тренируюсь</div><div class="fit-chips">${Object.entries(FIT_PLACES).map(([k,v])=>chip(d.place===k,`fitOnbSet('place','${k}')`,v)).join('')}</div>
      <div class="field-lbl" style="margin-top:14px;">Что есть дома</div><div class="fit-chips">${FIT_HOME_EQUIP.map(q=>chip(d.equipHome.includes(q),`fitOnbToggle('equipHome','${q}')`,FIT_EQUIP[q],'sm')).join('')}</div>
      <div class="field-lbl" style="margin-top:14px;">Что есть на улице</div><div class="fit-chips">${FIT_OUTDOOR_EQUIP.map(q=>chip(d.equipOut.includes(q),`fitOnbToggle('equipOut','${q}')`,FIT_EQUIP[q],'sm')).join('')}</div>
      <div class="fit-hint">В зале считаю, что есть всё. «Ступенька» — это и устойчивый стул, и диван.</div>
      ${nav(!!d.place)}`;
  }else if(st===5){
    h+=`<div class="fit-card-title">Здоровье и безопасность</div><div class="fit-card-sub">Короткий опрос по мотивам PAR-Q+. Ответы остаются только на твоём устройстве.</div>
      <div class="fit-parq">${FIT_PARQ.map(([k,q])=>`<div class="fit-parq-row"><span>${q}</span><div class="fit-yn">${chip(!d.parq.includes(k),d.parq.includes(k)?`fitOnbParq('${k}')`:'','Нет','sm')}${chip(d.parq.includes(k),d.parq.includes(k)?'':`fitOnbParq('${k}')`,'Да','sm')}</div></div>`).join('')}</div>
      ${d.parq.length?`<div class="fit-warn">Лучше обсудить нагрузки с врачом. Пока включаю щадящий режим: без прыжков, умеренная интенсивность.</div>`:''}
      <div class="field-lbl" style="margin-top:14px;">Что беспокоит — эти зоны буду беречь</div>
      <div class="fit-chips">${Object.entries(FIT_LIMITS).map(([k,v])=>chip(d.limits.includes(k),`fitOnbToggle('limits','${k}')`,v,'sm')).join('')}</div>
      ${d.limits.includes('pregnancy')?`<div class="fit-warn">При беременности — только щадящие тренировки, и обязательно согласуй их с врачом.</div>`:''}
      ${nav(true)}`;
  }else if(st===6){
    h+=`<div class="fit-card-title">Расписание</div>
      <div class="field-lbl">Дни тренировок</div><div class="fit-days">${FIT_DOW.map((x,i)=>`<button class="fit-day${d.days.includes(i)?' sel':''}" onclick="fitOnbToggle('days',${i})">${x}</button>`).join('')}</div>
      <div class="field-lbl" style="margin-top:14px;">Обычная длительность</div><div class="fit-chips">${[10,20,30,45,60,90].map(v=>chip(d.min===v,`fitOnbSet('min',${v})`,v+' мин','sm')).join('')}</div>
      <div class="field-lbl" style="margin-top:14px;">Предпочтения</div>
      <div class="fit-chips">${chip(d.prefs.noRun,"fitOnbPref('noRun')",'Не люблю бег','sm')}${chip(d.prefs.likeHiit,"fitOnbPref('likeHiit')",'Люблю интервалы','sm')}${chip(d.prefs.lowImpactSelf||d.prefs.lowImpact,"fitOnbPref('lowImpact')",'Без прыжков','sm')}</div>
      ${nav(d.days.length>0,o.edit?'Сохранить':'Далее')}`;
  }else{
    const tmp={goal:d.goal,level:d.level,days:d.days,place:d.place,equip:{home:d.equipHome,outdoor:d.equipOut},limits:d.limits};
    const rec=fitRecommend(FIT_DB.programs,tmp,{age:+d.age||30,height:+d.height||null,weight:+d.weight||latestWeight(DATA)||null}).slice(0,4);
    h+=`<div class="fit-card-title">С чего начнём</div><div class="fit-card-sub">Подобрал по цели, опыту, дням и инвентарю. Сменить можно в любой момент во вкладке «План».</div>
      <div class="fit-opt-list">
        ${rec.map(({p})=>`<button class="fit-opt" onclick="fitOnbFinish('${p.id}')"><b>${escHtml(p.name)}</b><span>${FIT_LEVELS[p.level]} · ${p.days>=7?'каждый день':p.days+' '+fitPlural(p.days,'раз','раза','раз')+' в неделю'} · ${p.weeks} нед · ~${p.minutes} мин</span></button>`).join('')}
        <button class="fit-opt" onclick="fitOnbFinish('smart')"><b>Умный режим</b><span>Без программы — тип тренировки каждый день по самочувствию</span></button>
      </div>
      <div class="fit-onb-nav"><button class="pf-cancel" onclick="fitOnbGo(-1)">Назад</button></div>`;
  }
  return h+`</div>`;
}

function fitOnbApplyTest(){const l=fitTestLevel(FIT_ONB.d.test);if(l){FIT_ONB.d.level=l;renderFit();}else showToast('Заполни хотя бы одно поле теста');}

function fitOnbFinish(progId){
  const o=FIT_ONB,d=o.d,f=DATA.fit,p=f.profile;
  if(d.sex)DATA.calories.gender=d.sex;
  if(d.age>=10&&d.age<=100)DATA.calories.age=+d.age;
  if(d.height>=100&&d.height<=250)DATA.weight.height=+d.height;
  if(d.weight>=25&&d.weight<=300&&latestWeight(DATA)==null){
    const t=todayKey();
    DATA.weight.log[t]={kg:+d.weight,ts:Date.now()};
    if(DATA.weight.start==null)DATA.weight.start=+d.weight;
  }
  Object.assign(p,{goal:d.goal,level:d.level,test:d.test,place:d.place,equip:{home:d.equipHome,outdoor:d.equipOut},parq:d.parq,limits:d.limits,
    days:d.days.slice().sort((a,b)=>a-b),min:d.min,prefs:d.prefs});
  if(progId)f.program=progId==='smart'?{id:'smart'}:{id:progId,idx:0,start:todayKey()};
  f.setupDone=true;f.day=null;FIT_ONB=null;
  saveData();renderFit();window.scrollTo(0,0);
  showToast(o.edit?'Профиль обновлён':'Готово! Осталось пройти чек-ин','good');
}

// ── своя тренировка ─────────────────────────────────────────

function fitOpenCustom(){
  if(!FIT_CUSTOM)FIT_CUSTOM=[];
  const db=FIT_DB;
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>Своя тренировка</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll">
      ${FIT_CUSTOM.length?FIT_CUSTOM.map((id,i)=>`<div class="fit-exd-hist"><span>${i+1}. ${escHtml(db.byId[id].name)}</span><button class="fit-x" onclick="FIT_CUSTOM.splice(${i},1);fitOpenCustom()" aria-label="Убрать">×</button></div>`).join(''):`<div class="fit-hint">Добавь упражнения — подходы и повторы подставлю сам, вес — по твоей истории.</div>`}
      <input class="field-inp fit-search" id="fit-cq" type="search" placeholder="Найти упражнение…" oninput="fitCustomList()" style="margin-top:12px;"/>
      <div id="fit-custom-list"></div>
    </div>
    <div class="panel-foot"><button class="pf-cancel" onclick="FIT_CUSTOM=null;closeOverlay()">Отмена</button><button class="pf-save" ${FIT_CUSTOM.length?'':'disabled'} onclick="fitCustomStart()">Начать · ${FIT_CUSTOM.length}</button></div>`;
  document.getElementById('overlay').classList.add('open');
  fitCustomList();
}

function fitCustomList(){
  const el=document.getElementById('fit-custom-list');if(!el)return;
  const inp=document.getElementById('fit-cq'),q=(inp?inp.value:'').trim().toLowerCase();
  const f=DATA.fit,flt=fitMakeFilter({profile:f.profile,body:fitBody(),place:f.profile.place,readiness:{}});
  const list=FIT_DB.ex.filter(e=>!FIT_CUSTOM.includes(e.id)&&(!q||(e.name+' '+(e.aliases||[]).join(' ')).toLowerCase().includes(q)))
    .sort((a,b)=>(fitAllowed(b,flt,true)?1:0)-(fitAllowed(a,flt,true)?1:0)||(f.fav.includes(b.id)?1:0)-(f.fav.includes(a.id)?1:0)).slice(0,25);
  el.innerHTML=list.map(e=>`<div class="fit-lib-row" onclick="FIT_CUSTOM.push('${e.id}');fitOpenCustom()"><div class="fit-lib-main"><div class="fit-lib-name">${escHtml(e.name)}</div><div class="fit-lib-sub">${e.primary.map(m=>FIT_MUSCLES[m]).join(', ')} · ${fitEquipText(e)}</div></div><span class="fit-plus">+</span></div>`).join('');
}

function fitCustomStart(){
  const f=DATA.fit,db=FIT_DB;
  const items=FIT_CUSTOM.map(id=>{
    const e=db.byId[id];
    if(e.category==='cardio')return{id,b:'cardio',sets:1,sec:1200,reps:null,rest:0,rpe:5,kg:null,note:''};
    if(fitIsSoft(e))return{id,b:'mob',sets:1,sec:e.measure==='time'?40:null,reps:e.measure==='reps'?[8,10]:null,rest:0,rpe:null,kg:null,note:''};
    return fitRetarget({id,b:'main',sets:3,sec:e.measure==='time'?30:null,reps:e.measure==='reps'?[8,12]:null,rest:75,rpe:7.5,kg:null,note:''},e,f.sessions,fitLvlN());
  });
  const plan={v:1,date:todayKey(),tplId:'custom',type:'custom',format:'sets',title:'Своя тренировка',desc:'',mode:'normal',items,notes:[],focus:[],program:null};
  const est=fitEstimate(plan,db,fitBody().weight||70);plan.minutes=est.min;plan.kcal=est.kcal;
  FIT_CUSTOM=null;closeOverlay();
  fitPlayerStart(plan);
}

// ── о разделе ──

function fitOpenAbout(){
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>Как работает Tempo Fit</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll fit-about">
      <div class="fit-exd-h">Готовность</div>
      <div class="fit-exd-txt">Индекс 0–100 складывается из сна (30%), энергии (25%), боли в мышцах (15%), нагрузки последних недель (15%), стресса (10%) и настроения (5%). Сон и энергия сравниваются с твоей личной нормой за 14 дней. Нагрузка — это RPE × минуты по методу Фостера и отношение последней недели к последнему месяцу (ACWR).</div>
      <div class="fit-exd-h">Как собирается тренировка</div>
      <div class="fit-exd-txt">Программа задаёт структуру — например «присед, жим, тяга, корпус». Алгоритм подбирает конкретные упражнения под твой инвентарь, ограничения и сегодняшнее состояние, назначает подходы и отдых по цели, укладывает всё в доступное время. Болящие мышцы и зоны не нагружаются. При простуде с температурой — только отдых.</div>
      <div class="fit-exd-h">Прогрессия</div>
      <div class="fit-exd-txt">Двойная прогрессия: если во всех подходах выполнен верх диапазона повторов, в следующий раз вес растёт на шаг. Для упражнений на свой вес — следующий шаг в цепочке, например от отжиманий с колен к классическим. Раз в 4–6 недель и при перегрузке — разгрузка.</div>
      <div class="fit-exd-h">Безопасность</div>
      <div class="fit-exd-txt">Tempo — не врач и не ставит диагнозов. Боль в груди, головокружение, одышка в покое, острая боль в суставе — повод остановиться и обратиться к специалисту. При хронических болезнях и беременности согласуй нагрузки с врачом.</div>
      <div class="fit-exd-h">Источники ориентиров</div>
      <div class="fit-exd-txt muted">Рекомендации ВОЗ по физической активности (2020), позиции ACSM по силовым тренировкам, NSCA, Compendium of Physical Activities (оценка калорий по MET), метод sRPE (Foster), шкала RPE/RIR. Калории — приблизительная оценка.</div>
    </div>
    <div class="panel-foot"><button class="pf-save" onclick="closeOverlay()">Понятно</button></div>`;
  document.getElementById('overlay').classList.add('open');
}

// ── виджет на главной ───────────────────────────────────────

function renderFitWidget(){
  if(!DATA)return'';
  fitEnsure(DATA);
  const f=DATA.fit,t=todayKey(),ci=f.checkins[t];
  let main,sub,right='';
  if(!f.setupDone){main='Тренировки под самочувствие';sub='Настроить за 2 минуты →';}
  else if(f.active){main='Тренировка в процессе';sub=escHtml(f.active.plan.title)+' · продолжить →';}
  else{
    const done=f.sessions.filter(s=>s.date===t);
    if(done.length){const s=done[done.length-1];main='✓ Тренировка выполнена';sub=escHtml(s.title)+' · '+s.min+' мин';}
    else if(!ci){main='Как ты сегодня?';sub='Чек-ин за 20 секунд — и тренировка подстроится';}
    else{
      let plan=f.day&&f.day.date===t?f.day.plan:null;
      if(ci.score!=null){const m=FIT_MODES[ci.mode]||FIT_MODES.normal;right=`<div class="fitw-score ${m.cls}">${ci.score}</div>`;}
      // план ещё не собран сегодня — соберём, как только загрузится база
      if(!plan&&!(f.today&&f.today.date===t&&f.today.rest)){
        if(FIT_DB){try{plan=fitTodayCtx().plan;}catch(e){}}
        else fitLoad().then(()=>{if(CURRENT_SCREEN==='home')renderHome();}).catch(()=>{});
      }
      if(f.today&&f.today.date===t&&f.today.rest){main='Сегодня отдых';sub='Восстановление — тоже часть плана';}
      else if(plan&&plan.type==='rest'){main='Сегодня отдых';sub='Самочувствие важнее плана';}
      else if(plan){main=escHtml(plan.title);sub=plan.minutes+' мин · '+(FIT_TYPES[plan.type]||'')+' · начать →';}
      else{main='Тренировка дня готова';sub='Открыть Fit →';}
    }
  }
  return`<div class="home-widget fit-widget" onclick="DATA.fit.tab='today';navTo('fit')">
    <div class="fitw-main"><div class="fitw-lbl">Tempo Fit</div><div class="fitw-title">${main}</div><div class="fitw-sub">${sub}</div></div>${right}
  </div>`;
}
