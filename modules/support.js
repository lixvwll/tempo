// ============================================================
// === TEMPO · ПОДДЕРЖКА (ЧАТ С ТЕМПОМ) ======================
// ============================================================
// Нейросеть работает прямо в браузере через wllama (llama.cpp в WebAssembly).
// Модель лежит в репозитории кусками по 45 МБ (ai/*.partNN + ai/model.json):
// качаем их один раз, проверяем и храним в Cache API, при запуске склеиваем
// в один файл и отдаём wllama. Переписка никуда не отправляется.
// Логика распознавания, промпты и чистка ответа — в support-brain.js.

const SUP_CACHE='tempo-ai-v1';
const SUP_AI_DIR='ai/';
let SUP_W=null,SUP_MAN=null;
let SUP_STATE='idle';          // idle | checking | need | downloading | loading | ready | error | unsupported
let SUP_ERR='',SUP_BUSY=false,SUP_ABORT=null,SUP_OPENED=false;
let SUP_PROG={done:0,total:0,speed:0};
let SUP_BREATH=null;
let SUP_WMOD=null;
// iPhone/iPad: у Safari жёсткий лимит памяти вкладки (~1–1,5 ГБ) — экономим всё, что можно
const SUP_IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const SUP_OPFS_NAME=()=> 'tempo-'+(SUP_MAN?SUP_MAN.id:'model')+'.gguf';

function supEnsure(){
  if(!DATA.support)DATA.support={msgs:[],ctx:true,joke:0};
  if(!Array.isArray(DATA.support.msgs))DATA.support.msgs=[];
  if(DATA.support.ctx===undefined)DATA.support.ctx=true;
  return DATA.support;
}
function supUrl(p){return new URL(p,document.baseURI).href;}
function supMb(b){return Math.round(b/1048576);}

// ── окно ────────────────────────────────────────────────────

function supOpen(){
  if(!DATA)return;
  supEnsure();
  let el=document.getElementById('sup');
  if(!el){
    el=document.createElement('div');el.id='sup';el.className='sup';
    el.innerHTML=`<div class="sup-top">
        <button class="sup-icon" onclick="supClose()" aria-label="Закрыть">‹</button>
        <div class="sup-head"><div class="sup-name">Темп</div><div class="sup-status" id="sup-status"></div></div>
        <button class="sup-icon" onclick="supMenu()" aria-label="Меню">⋯</button>
      </div>
      <div class="sup-body" id="sup-body"></div>
      <div class="sup-foot" id="sup-foot"></div>`;
    document.body.appendChild(el);
  }
  el.classList.add('open');
  document.body.classList.add('fit-lock');
  SUP_OPENED=true;
  supRender();
  supScroll(true);
  if(SUP_STATE==='idle'||SUP_STATE==='error'&&!SUP_ERR)supCheck();
}

function supClose(){
  const el=document.getElementById('sup');
  if(el)el.classList.remove('open');
  document.body.classList.remove('fit-lock');
  SUP_OPENED=false;
  supBreathStop();
}

function supSetState(s,err){
  SUP_STATE=s;if(err!==undefined)SUP_ERR=err;
  if(SUP_OPENED){supRenderStatus();supRenderBody();supRenderFoot();}
}

function supRenderStatus(){
  const el=document.getElementById('sup-status');if(!el)return;
  const m={idle:'поддержка',checking:'проверяю модель…',need:'модель не скачана',downloading:'скачиваю модель · '+(SUP_PROG.total?Math.floor(SUP_PROG.done/SUP_PROG.total*100):0)+'%',
    loading:'загружаю в память…',ready:SUP_BUSY?'печатает…':'на устройстве · офлайн',error:'ошибка',unsupported:'не поддерживается'};
  el.textContent=m[SUP_STATE]||'';
  el.className='sup-status'+(SUP_STATE==='ready'?' ok':'');
}

function supRender(){supRenderStatus();supRenderBody();supRenderFoot();}

// ── сообщения ───────────────────────────────────────────────

function supMsgHtml(m,i){
  if(m.r==='u')return`<div class="sup-msg u"><div class="sup-bub">${escHtml(m.t)}</div></div>`;
  let h=`<div class="sup-msg a${m.crisis?' crisis':''}"><div class="sup-bub" ${i!=null?`id="sup-m${i}"`:''}>${escHtml(m.t).replace(/\n/g,'<br>')}</div>`;
  if(m.crisis)h+=`<div class="sup-help">${SUP_HELPLINES.map(x=>`<a class="sup-line" href="tel:${x.p.replace(/[^+\d]/g,'')}"><b>${escHtml(x.p)}</b><span>${escHtml(x.n)}</span></a>`).join('')}</div>`;
  if(m.tools&&m.tools.length)h+=`<div class="sup-tools">${m.tools.filter(k=>SUP_TOOLS[k]).map(k=>`<button class="sup-tool" onclick="supTool('${k}')">${SUP_TOOLS[k].label}</button>`).join('')}</div>`;
  return h+`</div>`;
}

function supRenderBody(){
  const body=document.getElementById('sup-body');if(!body)return;
  const S=supEnsure();
  let h='';
  if(SUP_STATE!=='ready')h+=supModelCard();
  if(!S.msgs.length&&SUP_STATE==='ready'){
    const name=DATA.name?', '+escHtml(DATA.name):'';
    h+=`<div class="sup-msg a"><div class="sup-bub">Привет${name}! Я Темп. Можешь рассказать, как ты, — я выслушаю и помогу разобраться. Или выбери тему ниже.</div></div>`;
  }
  S.msgs.forEach((m,i)=>{h+=supMsgHtml(m,i);});
  if(SUP_BUSY&&!S.msgs.some(m=>m.live))h+=`<div class="sup-msg a"><div class="sup-bub sup-typing"><i></i><i></i><i></i></div></div>`;
  if(SUP_BREATH)h+=supBreathHtml();
  body.innerHTML=h;
}

function supModelCard(){
  const size=SUP_MAN?supMb(SUP_MAN.size):640;
  if(SUP_STATE==='unsupported')return`<div class="sup-card"><div class="sup-card-t">Этот браузер не потянет нейросеть</div><div class="sup-card-s">${escHtml(SUP_ERR||'Нужен современный браузер с поддержкой WebAssembly.')} Попробуй свежий Chrome или Safari.</div></div>`;
  if(SUP_STATE==='checking'||SUP_STATE==='idle')return`<div class="sup-card"><div class="sup-card-s">Проверяю, скачана ли модель…</div></div>`;
  if(SUP_STATE==='loading')return`<div class="sup-card"><div class="sup-card-t">Загружаю модель в память</div><div class="sup-card-s">Обычно это занимает 5–20 секунд.</div><div class="sup-bar"><i class="indet"></i></div></div>`;
  if(SUP_STATE==='downloading'){
    const pct=SUP_PROG.total?Math.floor(SUP_PROG.done/SUP_PROG.total*100):0;
    return`<div class="sup-card"><div class="sup-card-t">Скачиваю модель · ${pct}%</div>
      <div class="sup-bar"><i style="width:${pct}%"></i></div>
      <div class="sup-card-s">${supMb(SUP_PROG.done)} из ${supMb(SUP_PROG.total)} МБ${SUP_PROG.speed?' · '+SUP_PROG.speed.toFixed(1)+' МБ/с':''}. Можно закрыть чат — загрузка продолжится, пока открыт Tempo. Если прервётся, продолжим с того же места.</div></div>`;
  }
  const mem=navigator.deviceMemory&&navigator.deviceMemory<4?`<div class="sup-warn">На этом устройстве мало памяти — нейросеть может работать медленно.</div>`:'';
  const err=SUP_STATE==='error'?`<div class="sup-warn">${escHtml(SUP_ERR||'Что-то пошло не так.')}</div>`:'';
  return`<div class="sup-card">
    <div class="sup-card-t">Темп — поддержка на твоём телефоне</div>
    <div class="sup-card-s">Можно поговорить о том, что на душе: тревога, усталость, ссора, радость. Нейросеть работает прямо на устройстве — переписка никуда не отправляется.</div>
    <div class="sup-card-s">Для этого один раз нужно скачать модель — <b>${size} МБ</b>, лучше по Wi-Fi. Потом чат работает даже без интернета.</div>
    ${mem}${err}
    <button class="wl-primary-btn" onclick="supDownload()">${SUP_STATE==='error'?'Попробовать снова':'Скачать модель · '+size+' МБ'}</button>
    <div class="sup-card-n">Темп — не психолог и не врач. Если тебе очень плохо — звони 112 или на телефон доверия 8-800-2000-122.</div>
  </div>`;
}

function supRenderFoot(){
  const foot=document.getElementById('sup-foot');if(!foot)return;
  const S=supEnsure();
  const starters=!S.msgs.length?`<div class="sup-starters">${SUP_STARTERS.map(s=>`<button onclick="supSend('${s}')">${s}</button>`).join('')}</div>`:'';
  const val=(document.getElementById('sup-inp')||{}).value||'';
  foot.innerHTML=`${starters}<div class="sup-input">
    <textarea id="sup-inp" rows="1" placeholder="Напиши, что у тебя на душе…" enterkeyhint="send" oninput="supAutosize(this)" onkeydown="supKey(event)">${escHtml(val)}</textarea>
    ${SUP_BUSY?`<button class="sup-send stop" onclick="supStop()" aria-label="Остановить">■</button>`:`<button class="sup-send" onclick="supSend()" aria-label="Отправить">↑</button>`}
  </div>`;
  supAutosize(document.getElementById('sup-inp'));
}

function supAutosize(el){if(!el)return;el.style.height='auto';el.style.height=Math.min(120,el.scrollHeight)+'px';el.style.overflowY=el.scrollHeight>120?'auto':'hidden';}
function supKey(e){if(e.key==='Enter'&&!e.shiftKey&&!('ontouchstart' in window)){e.preventDefault();supSend();}}
function supScroll(force){
  const b=document.getElementById('sup-body');if(!b)return;
  if(force||b.scrollHeight-b.scrollTop-b.clientHeight<160)b.scrollTop=b.scrollHeight;
}

// ── модель: проверка, скачивание, загрузка ──────────────────

async function supCheck(){
  if(typeof WebAssembly!=='object'||!('caches' in window)){supSetState('unsupported','Браузер не поддерживает нужные технологии.');return;}
  supSetState('checking');
  try{
    SUP_MAN=await fetch(supUrl(SUP_AI_DIR+'model.json'),{cache:'no-cache'}).then(r=>{if(!r.ok)throw 0;return r.json();});
  }catch(e){
    try{const c=await caches.open(SUP_CACHE);const r=await c.match(supUrl(SUP_AI_DIR+'model.json'));if(r)SUP_MAN=await r.json();}catch(e2){}
    if(!SUP_MAN){supSetState('error','Нет связи, а модель ещё не скачана. Подключись к интернету.');return;}
  }
  if(await supModelFile())return supLoad();
  const missing=await supMissingParts();
  if(!missing.length)supLoad();else supSetState('need','');
}

// Движок wllama и его хранилище в OPFS (файл на «диске» браузера, а не в памяти)
async function supEngine(){
  if(!SUP_WMOD)SUP_WMOD=await import(supUrl('vendor/wllama/wllama.min.js'));
  if(!SUP_W)SUP_W=new SUP_WMOD.Wllama({default:supUrl('vendor/wllama/wllama.wasm')},{suppressNativeLog:true,
    logger:{debug(){},log(){},warn(){},error:(...a)=>console.warn('[wllama]',...a)}});
  return SUP_W;
}
async function supModelFile(){
  try{
    const w=await supEngine();
    const f=await w.cacheManager.open(SUP_OPFS_NAME());
    return f&&f.size===SUP_MAN.size?f:null;
  }catch(e){return null;}
}

// Склеиваем куски из Cache API в один файл OPFS по одному куску за раз
// (в памяти максимум 45 МБ), затем удаляем куски — место не занимается дважды.
async function supAssemble(){
  const w=await supEngine(),c=await caches.open(SUP_CACHE);
  let i=0;
  const stream=new ReadableStream({
    async pull(ctrl){
      if(i>=SUP_MAN.parts.length){ctrl.close();return;}
      const p=SUP_MAN.parts[i++];
      const r=await c.match(supUrl(SUP_AI_DIR+p.f));
      if(!r){ctrl.error(new Error('нет части '+p.f));return;}
      ctrl.enqueue(new Uint8Array(await r.arrayBuffer()));
    }
  });
  await w.cacheManager.write(SUP_OPFS_NAME(),stream,{etag:SUP_MAN.sha256,originalSize:SUP_MAN.size,originalURL:supUrl(SUP_AI_DIR+'model.json')});
  const f=await supModelFile();
  if(!f)throw new Error('не удалось сохранить модель');
  for(const p of SUP_MAN.parts){try{await c.delete(supUrl(SUP_AI_DIR+p.f));}catch(e){}}
  return f;
}

async function supMissingParts(){
  const c=await caches.open(SUP_CACHE);
  const out=[];
  for(const p of SUP_MAN.parts){
    const r=await c.match(supUrl(SUP_AI_DIR+p.f));
    const len=r&&+r.headers.get('content-length');
    if(!r||len!==p.size)out.push(p);
  }
  return out;
}

async function supDownload(){
  if(SUP_STATE==='downloading')return;
  if(!SUP_MAN){await supCheck();if(!SUP_MAN)return;}
  try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist();}catch(e){}
  try{
    if(navigator.storage&&navigator.storage.estimate){
      const est=await navigator.storage.estimate();
      if(est.quota&&est.quota-(est.usage||0)<SUP_MAN.size*1.05){supSetState('error','Не хватает места: нужно около '+supMb(SUP_MAN.size)+' МБ свободной памяти.');return;}
    }
  }catch(e){}
  const c=await caches.open(SUP_CACHE);
  const missing=await supMissingParts();
  SUP_PROG={done:SUP_MAN.size-missing.reduce((a,p)=>a+p.size,0),total:SUP_MAN.size,speed:0};
  supSetState('downloading','');
  const t0=Date.now(),base=SUP_PROG.done;
  const queue=missing.slice();
  const worker=async()=>{
    while(queue.length){
      const p=queue.shift();
      let ok=false;
      for(let attempt=0;attempt<3&&!ok;attempt++){
        let got=0;
        try{
          const res=await fetch(supUrl(SUP_AI_DIR+p.f),{cache:'no-store'});
          if(!res.ok||!res.body)throw new Error('HTTP '+res.status);
          const reader=res.body.getReader(),chunks=[];
          for(;;){
            const{done,value}=await reader.read();
            if(done)break;
            chunks.push(value);got+=value.length;SUP_PROG.done+=value.length;
            SUP_PROG.speed=(SUP_PROG.done-base)/1048576/Math.max(0.5,(Date.now()-t0)/1000);
            supProgressTick();
          }
          const blob=new Blob(chunks);
          if(blob.size!==p.size)throw new Error('размер не совпал');
          if(crypto&&crypto.subtle){
            const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
            if(hash!==p.sha256)throw new Error('файл повреждён');
          }
          await c.put(supUrl(SUP_AI_DIR+p.f),new Response(blob,{headers:{'Content-Length':String(p.size),'Content-Type':'application/octet-stream'}}));
          ok=true;
        }catch(e){SUP_PROG.done-=got;if(attempt===2)throw e;await new Promise(r=>setTimeout(r,1500));}
      }
    }
  };
  try{
    await Promise.all(SUP_IOS?[worker()]:[worker(),worker(),worker()]);
    await c.put(supUrl(SUP_AI_DIR+'model.json'),new Response(JSON.stringify(SUP_MAN)));
    supLoad();
  }catch(e){
    supSetState('error','Загрузка прервалась ('+(e&&e.message||'сеть')+'). Уже скачанное сохранено — нажми, чтобы продолжить.');
  }
}

let SUP_TICK_T=0;
function supProgressTick(){
  const now=Date.now();if(now-SUP_TICK_T<250)return;SUP_TICK_T=now;
  if(SUP_OPENED){supRenderStatus();const b=document.getElementById('sup-body');if(b&&SUP_STATE==='downloading'){const card=b.querySelector('.sup-card');if(card)card.outerHTML=supModelCard();}}
}

async function supLoad(){
  supSetState('loading','');
  try{
    let file=await supModelFile();
    if(!file)file=await supAssemble();
    const w=await supEngine();
    if(w.isModelLoaded()){supSetState('ready','');return;}
    await w.loadModel([file],SUP_IOS?{n_ctx:1024,n_batch:64,n_ubatch:64,n_threads:1,n_gpu_layers:0,log_level:4}:{n_ctx:2048,n_batch:256,log_level:4});
    supSetState('ready','');
    if(SUP_OPENED)setTimeout(()=>{const i=document.getElementById('sup-inp');if(i&&!('ontouchstart' in window))i.focus();},50);
  }catch(e){
    console.warn(e);
    try{if(SUP_W)await SUP_W.exit();}catch(e2){}
    SUP_W=null;
    supSetState('error','Не удалось запустить модель: '+(e&&e.message||e)+'. Возможно, не хватает памяти — закрой другие вкладки и попробуй снова.');
  }
}

// ── контекст из Tempo ───────────────────────────────────────

function supCtx(){
  const t=todayKey(),f=DATA.fit||{},ci=(f.checkins||{})[t];
  const habitsDone=(DATA.habits||[]).filter(h=>(DATA.habitLogs[t]||{})[h.id]).length;
  return{name:DATA.name,sex:(DATA.calories||{}).gender||null,hour:new Date().getHours(),mood:(DATA.moods||{})[t]||null,
    sleep:ci&&!ci.skip?ci.sl:null,readiness:ci&&!ci.skip&&ci.score!=null?ci.score:null,streak:DATA.streak||0,
    workoutToday:(f.sessions||[]).some(s=>s.date===t),habitsDone,habitsTotal:(DATA.habits||[]).length,week:supWeekShort()};
}

// ── статистика: считает код, модель не выдумывает цифры ─────

function supDays(from,n){const out=[];for(let i=0;i<n;i++)out.push(shiftDay(todayKey(),-(from+i)));return out;}
function supWeek(days){
  const w={pts:0,habitDone:0,habitTotal:0,tasks:0,lecA:0,lecS:0,moods:[],sleeps:[],ready:[],workouts:0,wmin:0,water:0,perHabit:{}};
  const hs=DATA.habits||[],f=DATA.fit||{};
  days.forEach(k=>{
    w.pts+=getDayPoints(k);
    const hl=DATA.habitLogs[k]||{};
    hs.forEach(h=>{w.habitTotal++;if(hl[h.id]){w.habitDone++;w.perHabit[h.id]=(w.perHabit[h.id]||0)+1;}});
    Object.entries(DATA.tasks[k]||{}).forEach(([id,t])=>{if(id.startsWith('lec_')){if(t.done)w.lecA++;if(t.skipped)w.lecS++;}else if(t.done)w.tasks++;});
    if(DATA.moods&&DATA.moods[k])w.moods.push(DATA.moods[k]);
    const ci=(f.checkins||{})[k];if(ci&&!ci.skip){if(ci.sl!=null)w.sleeps.push(ci.sl);if(ci.score!=null)w.ready.push(ci.score);}
    (f.sessions||[]).filter(x=>x.date===k).forEach(x=>{if(x.type!=='recovery')w.workouts++;w.wmin+=x.min||0;});
    if(typeof waterTotalForDay==='function'&&DATA.water&&waterTotalForDay(DATA,k)>=DATA.water.goalMl)w.water++;
  });
  return w;
}
const supAvg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
function supWeekShort(){
  try{const w=supWeek(supDays(0,7));return w.pts+' баллов, привычки '+(w.habitTotal?Math.round(w.habitDone/w.habitTotal*100):0)+'%, тренировок '+w.workouts;}catch(e){return'';}
}
let SUP_TIPS=[];
function supAdvice(){
  supStatsReport();
  if(!SUP_TIPS.length)return'Судя по неделе, у тебя всё ровно — привычки, сон и активность в порядке. Можно поставить маленькую новую цель: например, одну новую привычку или ещё одну тренировку в неделю.';
  return'Если выбрать что-то одно, начни с этого:\n'+SUP_TIPS[0]+(SUP_TIPS[1]?'\n\nА потом: '+SUP_TIPS[1].charAt(0).toLowerCase()+SUP_TIPS[1].slice(1):'')+'\n\nОдин шаг за раз — так изменения держатся дольше.';
}
function supStatsReport(){
  const w=supWeek(supDays(0,7)),p=supWeek(supDays(7,7));
  const n=x=>String(Math.round(x*10)/10).replace('.',',');
  const L=[],good=[],tips=[];
  const diff=w.pts-p.pts;
  L.push('• Баллы: '+w.pts+(p.pts||w.pts?' ('+(diff>=0?'+':'')+diff+' к прошлой неделе)':''));
  L.push('• Серия входов: '+(DATA.streak||0)+' '+fitPlural(DATA.streak||0,'день','дня','дней')+' (рекорд — '+(DATA.longestStreak||0)+')');
  if(w.habitTotal){
    const pct=Math.round(w.habitDone/w.habitTotal*100),pp=p.habitTotal?Math.round(p.habitDone/p.habitTotal*100):null;
    L.push('• Привычки: '+pct+'% выполнено'+(pp!=null?' (было '+pp+'%)':''));
    const hs=(DATA.habits||[]).map(h=>({h,c:w.perHabit[h.id]||0})).sort((a,b)=>b.c-a.c);
    if(hs[0]&&hs[0].c>=5)good.push('привычка «'+hs[0].h.name+'» — '+hs[0].c+' из 7 дней');
    const weak=hs[hs.length-1];
    if(weak&&weak.c<=3)tips.push('«'+weak.h.name+'» получилась только '+weak.c+' из 7 дней. Попробуй привязать её к тому, что делаешь каждый день: после завтрака, после пар.');
    if(pct>=80)good.push('привычки почти на 100%');
  }
  if(w.tasks)L.push('• Дел сделано: '+w.tasks);
  if(w.lecA+w.lecS){L.push('• Пары: посещено '+w.lecA+' из '+(w.lecA+w.lecS));if(w.lecS>=2)tips.push('Пропущено пар: '+w.lecS+'. Посмотри, какие именно, — может, их стоит переставить в планах.');}
  if(w.workouts||w.wmin)L.push('• Тренировки: '+w.workouts+', '+w.wmin+' мин');
  const sl=supAvg(w.sleeps),rd=supAvg(w.ready),md=supAvg(w.moods);
  if(sl!=null)L.push('• Сон в среднем: '+n(sl)+' ч');
  if(rd!=null)L.push('• Готовность в среднем: '+Math.round(rd)+' из 100');
  if(md!=null)L.push('• Настроение в дневнике: '+n(md)+' из 5');
  if(w.water)L.push('• Норма воды: '+w.water+' из 7 дней');
  if(typeof weightEntriesSorted==='function'){
    const e=weightEntriesSorted(DATA),t14=shiftDay(todayKey(),-14);
    const old=e.filter(x=>x.key<=t14).slice(-1)[0]||e[0],last=e[e.length-1];
    if(last&&old&&last.key!==old.key)L.push('• Вес: '+n(last.kg)+' кг ('+(last.kg-old.kg>=0?'+':'')+n(last.kg-old.kg)+' с '+fmtDate(dateFromKey(old.key))+')');
  }
  if(diff>0&&p.pts)good.push('баллов больше, чем неделю назад');
  if((DATA.streak||0)>=7)good.push('серия '+DATA.streak+' дней — это уже привычка');
  if(w.workouts>=2)good.push('тренировок на неделе: '+w.workouts);
  if(sl!=null&&sl<7)tips.push('Сон в среднем '+n(sl)+' ч — меньше 7. Лечь на 30 минут раньше — самый дешёвый способ поднять энергию.');
  if(!w.workouts&&DATA.fit&&DATA.fit.setupDone)tips.push('На неделе не было тренировок. Начни с короткой — в Fit есть варианты на 10–20 минут.');
  if(diff<0&&p.pts&&-diff>p.pts*0.2)tips.push('Баллов меньше, чем неделю назад. Не страшно — выбери одну вещь, которую точно сделаешь завтра.');
  if(md!=null&&md<=2.5)tips.push('Настроение на неделе было низким. Если хочешь, расскажи, что давит, — разберёмся вместе.');
  SUP_TIPS=tips;
  let t='Вот твоя неделя:\n'+L.join('\n');
  if(good.length)t+='\n\nЧто получается: '+good.slice(0,3).join('; ')+'.';
  if(tips.length)t+='\n\nНа что обратить внимание:\n'+tips.slice(0,3).map(x=>'• '+x).join('\n');
  else t+='\n\nВсё ровно — так держать!';
  return t;
}

// ── отправка и генерация ────────────────────────────────────

function supPush(m){const S=supEnsure();m.ts=Date.now();S.msgs.push(m);if(S.msgs.length>200)S.msgs.splice(0,S.msgs.length-200);saveData();}

async function supSend(preset){
  if(SUP_BUSY)return;
  const inp=document.getElementById('sup-inp');
  const text=(preset!=null?preset:(inp?inp.value:'')).trim();
  if(!text)return;
  if(inp&&preset==null)inp.value='';
  const S=supEnsure();
  const history=S.msgs.slice();
  supPush({r:'u',t:text});
  const d=supDetect(text);
  // кризис и шутки — без модели: надёжно и мгновенно
  const sex=(DATA.calories||{}).gender||null;
  if(d.crisis){supPush({r:'a',t:supG(SUP_CRISIS_REPLY,sex),crisis:true,tools:['breath'],x:true});supRender();supScroll(true);return;}
  if(d.intents[0]==='advice'){supPush({r:'a',t:supAdvice(),x:true});supRender();supScroll(true);return;}
  if(d.intents[0]==='stats'){supPush({r:'a',t:supStatsReport(),x:true});supRender();supScroll(true);return;}
  if(d.intents[0]==='joke'){S.joke=((S.joke||0)+1)%SUP_JOKES.length;supPush({r:'a',t:SUP_JOKES[S.joke]+' 🙂',x:true});supRender();supScroll(true);return;}
  if(SUP_STATE!=='ready'){
    supPush({r:'a',t:SUP_STATE==='downloading'||SUP_STATE==='loading'?'Я почти готов — модель ещё загружается. Как только закончится, отвечу.':'Чтобы я мог отвечать, нужно один раз скачать модель — кнопка выше.',x:true});
    supRender();supScroll(true);return;
  }
  SUP_BUSY=true;
  const live={r:'a',t:'',live:true,tools:d.tools};
  S.msgs.push(live);
  supRender();supScroll(true);
  let answer='';
  try{
    const bad=a=>supIsBad(a)||supRepeats(a,history);
    answer=await supGenerate(text,history,d,live,0);
    if(bad(answer)){live.t='';supUpdateLive(live,'…');answer=await supGenerate(text,history,d,live,1);}
    if(bad(answer))answer=supFallback(d,text,history,sex);
  }catch(e){
    if(!(e&&(e.name==='AbortError'||/abort/i.test(e.message||''))))console.warn(e);
    answer=supClean(live.t)||'…';
  }
  live.t=answer;delete live.live;live.ts=Date.now();
  SUP_BUSY=false;SUP_ABORT=null;
  saveData();
  supRender();supScroll();
}

async function supGenerate(text,history,d,live,attempt){
  const messages=supBuildMessages({text,history,ctx:supCtx(),ctxOn:supEnsure().ctx!==false,detect:d});
  const opener=supOpener(d,text,attempt?'r'+attempt:'',(DATA.calories||{}).gender||null);
  if(opener)messages.push({role:'assistant',content:opener});
  SUP_ABORT=new AbortController();
  const s=SUP_SAMPLING;
  const stream=await SUP_W.createChatCompletion({
    messages,stream:true,abortSignal:SUP_ABORT.signal,
    temperature:s.temperature+(attempt?0.15:0),top_p:s.top_p,top_k:s.top_k,min_p:s.min_p,
    penalty_repeat:s.repeat_penalty,penalty_present:s.presence_penalty,max_tokens:s.max_tokens,
    seed:attempt?Date.now()%100000:undefined,
    chat_template_kwargs:{enable_thinking:false},cache_prompt:true,
  });
  let acc='';
  for await(const ch of stream){
    const delta=ch&&ch.choices&&ch.choices[0]&&ch.choices[0].delta&&ch.choices[0].delta.content;
    if(delta){acc+=delta;supUpdateLive(live,supJoin(opener,acc));}
  }
  return supClean(supJoin(opener,acc));
}

function supJoin(opener,acc){
  if(!opener)return acc;
  const a=acc.replace(/^\s+/,'');
  if(a.startsWith(opener))return a;
  return opener+(a?' '+a:'');
}

let SUP_LIVE_T=0;
function supUpdateLive(live,text){
  live.t=text;
  const now=Date.now();if(now-SUP_LIVE_T<60)return;SUP_LIVE_T=now;
  const S=supEnsure(),i=S.msgs.indexOf(live);
  const el=document.getElementById('sup-m'+i);
  if(el){el.innerHTML=escHtml(text.replace(/\*\*/g,'')).replace(/\n/g,'<br>')+'<span class="sup-caret"></span>';supScroll();}
  else{supRenderBody();supScroll();}
  supRenderStatus();
}

function supStop(){if(SUP_ABORT)try{SUP_ABORT.abort();}catch(e){}}

// ── техники ─────────────────────────────────────────────────

function supTool(k){
  const t=SUP_TOOLS[k];if(!t)return;
  if(t.kind==='breath'){supBreathStart();return;}
  supPush({r:'a',t:supG(t.text,(DATA.calories||{}).gender||null),x:true});
  supRender();supScroll(true);
}

// Дыхание: вдох 4 сек, выдох 6 сек, 6 циклов = 1 минута
function supBreathStart(){
  supBreathStop();
  SUP_BREATH={t0:Date.now(),timer:setInterval(supBreathTick,200)};
  supRenderBody();supScroll(true);
}
function supBreathStop(){if(SUP_BREATH){clearInterval(SUP_BREATH.timer);SUP_BREATH=null;}}
function supBreathState(){
  const el=(Date.now()-SUP_BREATH.t0)/1000;
  if(el>=60)return{done:true};
  const c=el%10;
  return c<4?{ph:'Вдох',left:Math.ceil(4-c),scale:0.55+0.45*(c/4)}:{ph:'Выдох',left:Math.ceil(10-c),scale:1-0.45*((c-4)/6)};
}
function supBreathHtml(){
  const s=supBreathState();
  if(s.done)return`<div class="sup-breath"><div class="sup-breath-t">Готово. Как ты сейчас?</div><button class="sup-tool" onclick="supBreathStop();supRenderBody()">Закрыть</button></div>`;
  return`<div class="sup-breath" id="sup-breath"><div class="sup-breath-c" id="sup-breath-c" style="transform:scale(${s.scale.toFixed(3)})"></div>
    <div class="sup-breath-t" id="sup-breath-t">${s.ph} · ${s.left}</div>
    <div class="sup-breath-s">Вдох носом 4 секунды, медленный выдох 6 секунд</div>
    <button class="sup-tool" onclick="supBreathStop();supRenderBody()">Остановить</button></div>`;
}
function supBreathTick(){
  if(!SUP_BREATH)return;
  const s=supBreathState();
  if(s.done){clearInterval(SUP_BREATH.timer);supRenderBody();supScroll(true);try{navigator.vibrate&&navigator.vibrate(120);}catch(e){}return;}
  const c=document.getElementById('sup-breath-c'),t=document.getElementById('sup-breath-t');
  if(c)c.style.transform='scale('+s.scale.toFixed(3)+')';
  if(t)t.textContent=s.ph+' · '+s.left;
}

// ── меню ────────────────────────────────────────────────────

function supMenu(){
  const S=supEnsure();
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>Поддержка</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll">
      <button class="fit-set-row" onclick="supEnsure().ctx=!supEnsure().ctx;saveData();supMenu()"><span>Учитывать данные Tempo<br><small class="sup-small">сон, настроение, готовность, серию — чтобы отвечать точнее</small></span><span class="${S.ctx?'on':''}">${S.ctx?'вкл':'выкл'}</span></button>
      <button class="fit-set-row" onclick="supClearChat()"><span>Очистить переписку</span><span>›</span></button>
      <button class="fit-set-row" onclick="supHelpInfo()"><span>Куда обратиться, если очень плохо</span><span>›</span></button>
      <button class="fit-set-row danger" onclick="supDeleteModel()"><span>Удалить модель с устройства<br><small class="sup-small">освободит ${SUP_MAN?supMb(SUP_MAN.size):640} МБ</small></span><span>×</span></button>
      <div class="fit-exd-h">О поддержке</div>
      <div class="fit-exd-txt">Темп работает на маленькой нейросети ${SUP_MAN?escHtml(SUP_MAN.name):'Qwen3.5-0.8B'} прямо на твоём устройстве: переписка не покидает телефон и хранится вместе с остальными данными Tempo. Маленькая модель может ошибаться — это собеседник для поддержки, а не психолог и не врач.</div>
    </div>`;
  document.getElementById('overlay').classList.add('open');
}

function supHelpInfo(){
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>Если очень плохо</h2><button class="close-btn" onclick="supMenu()">×</button></div>
    <div class="panel-scroll">
      <div class="fit-exd-txt">Если ты думаешь о том, чтобы причинить себе вред, или тебе невыносимо — пожалуйста, поговори с живым человеком прямо сейчас.</div>
      <div class="sup-help">${SUP_HELPLINES.map(x=>`<a class="sup-line" href="tel:${x.p.replace(/[^+\d]/g,'')}"><b>${escHtml(x.p)}</b><span>${escHtml(x.n)}</span></a>`).join('')}</div>
      <div class="fit-exd-txt muted">Если ты не в России — позвони в местную службу экстренной помощи. Можно также написать близкому человеку: «Мне сейчас тяжело, можешь побыть со мной?»</div>
    </div>`;
  document.getElementById('overlay').classList.add('open');
}

function supClearChat(){
  if(!confirm('Удалить всю переписку с Темпом?'))return;
  supEnsure().msgs=[];saveData();closeOverlay();supRender();
}

async function supDeleteModel(){
  if(!confirm('Удалить модель с устройства? Чтобы снова пользоваться чатом, её придётся скачать заново.'))return;
  try{const w=await supEngine();await w.exit();await w.cacheManager.delete(SUP_OPFS_NAME());}catch(e){}
  SUP_W=null;
  try{await caches.delete(SUP_CACHE);}catch(e){}
  closeOverlay();
  supSetState('need','');
  showToast('Модель удалена');
}
