// ============================================================
// === TEMPO FIT · ПЛЕЕР ТРЕНИРОВКИ ===========================
// ============================================================
// Пошагово: подход → отдых → следующий подход. Все таймеры считаются
// от timestamp (until), поэтому не сбиваются в фоне и переживают перезагрузку.
// Прогресс хранится в DATA.fit.active.

let FIT_TICK=null,FIT_WAKE=null,FIT_AUDIO=null;

const FIT_RPE_TXT=['','очень легко','легко','легко','умеренно','умеренно','тяжеловато','тяжело','очень тяжело','почти предел','максимум'];
const FIT_FEEL=['Бодро','Нормально','Устал','Что-то болело'];

// Шаги плеера выводятся из плана, поэтому в active хранится только позиция
function fitPlayerSteps(plan){
  const steps=[],items=plan.items;
  const push=(i,set,of,x)=>steps.push(Object.assign({i,set,of},x||{}));
  if(plan.format==='intervals'){
    (plan.segs||[]).forEach((s,k)=>steps.push({seg:k,of:plan.segs.length}));
    items.forEach((it,i)=>{if(it.b==='cool')push(i,1,1);});
    return steps;
  }
  if(plan.format==='circuit'){
    items.forEach((it,i)=>{if(it.b==='warm')push(i,1,1);});
    const circ=items.map((it,i)=>i).filter(i=>!['warm','cool','fin'].includes(items[i].b));
    for(let r=1;r<=(plan.rounds||1);r++)circ.forEach((i,k)=>push(i,r,plan.rounds||1,{round:r,last:k===circ.length-1}));
    items.forEach((it,i)=>{if(it.b==='fin'||it.b==='cool')push(i,1,1);});
    return steps;
  }
  items.forEach((it,i)=>{for(let s=1;s<=(it.sets||1);s++)push(i,s,it.sets||1);});
  return steps;
}

function fitPlayerCtx(){
  const a=DATA.fit.active;if(!a)return null;
  const steps=fitPlayerSteps(a.plan),st=steps[a.pos]||null;
  const it=st&&st.i!=null?a.plan.items[st.i]:null;
  return{a,steps,st,it,e:it?FIT_DB.byId[it.id]:null};
}

function fitIsSoftItem(it){return['warm','cool','mob'].includes(it.b);}
// таймер стартует сам в разминке, растяжке, кругах, кардио и интервалах; в силовой — по кнопке
function fitAutoTimed(plan,it){return it.sec!=null&&(fitIsSoftItem(it)||['circuit','flow','cardio','intervals'].includes(plan.format));}
function fitItemDur(it,e){return it.sec*(e&&e.unilateral?2:1);}
function fitClock(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

// ── запуск / открытие ───────────────────────────────────────

function fitPlayerStart(plan){
  const f=DATA.fit;
  if(f.active&&!confirm('Есть незаконченная тренировка. Начать новую вместо неё?')){fitPlayerOpen();return;}
  fitAudioUnlock();
  f.active={plan:JSON.parse(JSON.stringify(plan)),startedAt:Date.now(),pos:0,phase:'work',log:{},fb:{},until:null,dur:0,timerOn:false,
    paused:false,pausedLeft:null,pausedAt:null,pausedMs:0,cur:null,segDone:0,side2:false,finish:{rpe:null,feel:[],note:''}};
  fitPlayerEnterWork(null);
  saveData();
  fitPlayerOpen();
}

function fitPlayerOpen(){
  if(!FIT_DB){fitLoad().then(fitPlayerOpen).catch(()=>showToast('Не удалось загрузить упражнения','bad'));return;}
  if(!DATA.fit.active)return;
  let el=document.getElementById('fit-player');
  if(!el){el=document.createElement('div');el.id='fit-player';el.className='fit-player';document.body.appendChild(el);}
  el.classList.add('open');
  document.body.classList.add('fit-lock');
  fitWakeLock(true);
  fitPlayerCatchUp();
  fitPlayerRender();
  if(!FIT_TICK)FIT_TICK=setInterval(fitPlayerTick,250);
}

function fitPlayerClose(){
  const el=document.getElementById('fit-player');
  if(el)el.classList.remove('open');
  document.body.classList.remove('fit-lock');
  fitWakeLock(false);
  if(FIT_TICK){clearInterval(FIT_TICK);FIT_TICK=null;}
  if(CURRENT_SCREEN==='fit')renderFit();else if(CURRENT_SCREEN==='home')renderHome();
}

function fitPlayerAbort(){
  if(!confirm('Отменить тренировку? Записанные подходы не сохранятся.'))return;
  DATA.fit.active=null;saveData();closeOverlay();fitPlayerClose();
  showToast('Тренировка отменена');
}

// ── переходы между шагами ───────────────────────────────────

// Вход в шаг: запускает таймер, если он нужен. base — конец предыдущего
// отрезка, чтобы интервалы шли по часам, даже если приложение было свёрнуто.
function fitPlayerEnterWork(base){
  const c=fitPlayerCtx(),a=c.a;
  a.phase='work';a.timerOn=false;a.until=null;a.dur=0;a.side2=false;a.cur=null;
  if(!c.st){a.phase='finish';return;}
  if(c.st.seg!=null){
    const seg=a.plan.segs[c.st.seg];
    a.dur=seg.sec;a.until=(base||Date.now())+seg.sec*1000;a.timerOn=true;
  }else if(fitAutoTimed(a.plan,c.it)){
    a.dur=fitItemDur(c.it,c.e);a.until=Date.now()+a.dur*1000;a.timerOn=true;
  }
}

function fitPlayerStartTimer(){
  const c=fitPlayerCtx();if(!c||!c.it)return;
  fitAudioUnlock();
  c.a.dur=fitItemDur(c.it,c.e);c.a.until=Date.now()+c.a.dur*1000;c.a.timerOn=true;c.a.paused=false;
  saveData();fitPlayerRender();
}

function fitPlayerPause(){
  const a=DATA.fit.active;if(!a||!a.until)return;
  if(a.paused){a.until=Date.now()+a.pausedLeft;a.pausedMs+=Date.now()-(a.pausedAt||Date.now());a.paused=false;a.pausedLeft=null;}
  else{a.pausedLeft=Math.max(0,a.until-Date.now());a.pausedAt=Date.now();a.paused=true;}
  saveData();fitPlayerRender();
}

// Шаг выполнен: записываем результат и решаем, что дальше
function fitPlayerLog(entry){
  const c=fitPlayerCtx();if(!c||!c.it)return;
  if(entry&&!fitIsSoftItem(c.it)){(c.a.log[c.st.i]||(c.a.log[c.st.i]=[])).push(entry);}
  const needFb=!['circuit','flow'].includes(c.a.plan.format)&&['main','acc','core','fin','cardio'].includes(c.it.b)&&c.st.set===c.st.of&&!c.a.fb[c.st.i]&&(c.a.log[c.st.i]||[]).length>0&&c.it.sec==null;
  if(needFb){c.a.phase='fb';c.a.timerOn=false;c.a.until=null;saveData();fitPlayerRender();return;}
  fitPlayerAfter();
}

function fitPlayerAfter(){
  const c=fitPlayerCtx();if(!c)return;
  const a=c.a,plan=a.plan,st=c.st;
  let rest=0;
  if(st&&st.seg==null&&c.it){
    if(plan.format==='circuit'&&st.round)rest=st.last?(st.round<st.of?plan.restRound||60:0):(c.it.rest||15);
    else if(st.set<st.of)rest=c.it.rest||0;
  }
  const prevUntil=st&&st.seg!=null?a.until:null;
  a.pos++;
  if(a.pos>=c.steps.length){a.phase='finish';a.until=null;a.timerOn=false;fitBeep(3);}
  else if(rest>0){a.phase='rest';a.dur=rest;a.until=Date.now()+rest*1000;a.timerOn=true;a.cur=null;}
  else fitPlayerEnterWork(prevUntil);
  saveData();fitPlayerRender();
}

function fitPlayerDoneSet(){
  const c=fitPlayerCtx();if(!c||!c.it)return;
  fitAudioUnlock();
  const a=c.a,it=c.it,e=c.e;
  if(it.sec!=null){
    const left=a.paused?(a.pausedLeft||0)/1000:Math.max(0,((a.until||0)-Date.now())/1000);
    const t=a.timerOn?Math.min(it.sec,Math.round(Math.max(0,a.dur-left)/(e&&e.unilateral?2:1))):it.sec;
    fitPlayerLog({t:Math.max(1,t)});
    return;
  }
  const cur=fitPlayerCur();
  const entry={r:Math.max(0,cur.r|0)};
  if(fitIsLoaded(e)&&cur.w>0)entry.w=cur.w;
  fitPlayerLog(entry);
}

function fitPlayerSkip(){
  const c=fitPlayerCtx();if(!c)return;
  const a=c.a;
  if(c.st.seg!=null){a.until=Date.now();a.paused=false;fitPlayerAfter();return;}
  if(a.plan.format!=='circuit'){
    // пропускаем оставшиеся подходы этого упражнения
    while(a.pos+1<c.steps.length&&c.steps[a.pos+1].i===c.st.i)a.pos++;
  }
  a.phase='work';
  a.pos++;
  if(a.pos>=c.steps.length){a.phase='finish';a.until=null;a.timerOn=false;}
  else fitPlayerEnterWork(null);
  saveData();fitPlayerRender();
}

function fitPlayerFb(v){
  const c=fitPlayerCtx();if(!c)return;
  if(v)c.a.fb[c.st.i]=v;
  fitPlayerAfter();
}

function fitPlayerRestAdj(d){
  const a=DATA.fit.active;if(!a||a.phase!=='rest')return;
  a.until+=d*1000;a.dur=Math.max(5,a.dur+d);
  if(a.until<Date.now()+1000)a.until=Date.now()+1000;
  saveData();fitPlayerTick();
}

function fitPlayerFinishNow(){
  const a=DATA.fit.active;if(!a)return;
  a.phase='finish';a.timerOn=false;a.until=null;
  closeOverlay();saveData();fitPlayerRender();
}

function fitPlayerBack(){
  const c=fitPlayerCtx();if(!c)return;
  if(c.a.pos>=c.steps.length)c.a.pos=c.steps.length-1;
  fitPlayerEnterWork(null);saveData();fitPlayerRender();
}

// ── текущие значения подхода ────────────────────────────────

function fitPlayerCur(){
  const c=fitPlayerCtx(),a=c.a;
  if(a.cur&&a.cur.pos===a.pos)return a.cur;
  const it=c.it,e=c.e,logged=a.log[c.st.i]||[];
  const lastSet=logged[logged.length-1];
  let r=it.reps?Math.round((it.reps[0]+it.reps[1])/2):10;
  if(lastSet&&lastSet.r)r=lastSet.r;
  let w=it.kg||(lastSet&&lastSet.w)||0;
  if(!w&&e&&fitIsLoaded(e)){const h=fitExHistory(DATA.fit.sessions,e.id)[0];if(h)w=Math.max(...h.sets.map(s=>s.w||0))||0;}
  a.cur={pos:a.pos,r,w};
  return a.cur;
}

function fitWStep(e){return e.equipment.includes('kettlebell')?4:e.equipment.includes('dumbbell')?1:2.5;}

function fitPlayerAdj(k,d){
  const c=fitPlayerCtx(),cur=fitPlayerCur();
  if(k==='r')cur.r=Math.max(0,cur.r+d);
  else cur.w=Math.max(0,Math.round((cur.w+d*fitWStep(c.e))*10)/10);
  saveData();fitPlayerRender();
}

function fitPlayerSetVal(k,v){
  const cur=fitPlayerCur(),n=parseFloat(String(v).replace(',','.'));
  if(!isNaN(n))cur[k]=k==='r'?Math.max(0,Math.round(n)):Math.max(0,n);
  saveData();
}

// ── таймер ──────────────────────────────────────────────────

function fitPlayerCatchUp(){
  const a=DATA.fit.active;if(!a)return;
  let g=0;
  while(a.phase!=='finish'&&a.timerOn&&!a.paused&&a.until&&Date.now()>=a.until&&g++<400){
    const c=fitPlayerCtx();
    if(a.phase==='rest'){fitPlayerEnterWorkQuiet();continue;}
    if(c.st&&c.st.seg!=null){
      const seg=a.plan.segs[c.st.seg];
      if(seg.k==='work')a.segDone+=seg.sec;
      const prev=a.until;a.pos++;
      if(a.pos>=c.steps.length){a.phase='finish';a.timerOn=false;a.until=null;break;}
      fitPlayerEnterWork(prev);continue;
    }
    if(c.it){
      if(!fitIsSoftItem(c.it))(a.log[c.st.i]||(a.log[c.st.i]=[])).push({t:c.it.sec});
      fitPlayerAfterQuiet();continue;
    }
    break;
  }
  saveData();
}
function fitPlayerEnterWorkQuiet(){fitPlayerEnterWork(null);}
function fitPlayerAfterQuiet(){
  const c=fitPlayerCtx(),a=c.a,st=c.st,plan=a.plan;
  let rest=0;
  if(plan.format==='circuit'&&st.round)rest=st.last?(st.round<st.of?plan.restRound||60:0):(c.it.rest||15);
  else if(st.set<st.of)rest=c.it.rest||0;
  a.pos++;
  if(a.pos>=c.steps.length){a.phase='finish';a.until=null;a.timerOn=false;}
  else if(rest>0){a.phase='rest';a.dur=rest;a.until=Date.now()+rest*1000;a.timerOn=true;}
  else fitPlayerEnterWork(null);
}

function fitPlayerTick(){
  const a=DATA&&DATA.fit&&DATA.fit.active;
  const el=document.getElementById('fit-player');
  if(!a||!el||!el.classList.contains('open'))return;
  const now=Date.now();
  if(!a.paused&&a.timerOn&&a.until&&now>=a.until){
    const c=fitPlayerCtx();
    if(a.phase==='rest'){fitBeep(2);fitPlayerEnterWork(null);saveData();fitPlayerRender();return;}
    if(a.phase==='work'&&c.st){
      if(c.st.seg!=null){
        const seg=a.plan.segs[c.st.seg];
        if(seg.k==='work')a.segDone+=seg.sec;
        fitBeep(c.st.seg+1<a.plan.segs.length?2:3);
        fitPlayerAfter();return;
      }
      fitBeep(2);
      fitPlayerLog(fitIsSoftItem(c.it)?null:{t:c.it.sec});
      return;
    }
  }
  const left=a.paused?(a.pausedLeft||0)/1000:a.until?(a.until-now)/1000:0;
  const t=document.getElementById('fp-timer');
  if(t)t.textContent=fitClock(Math.ceil(left));
  const ring=document.getElementById('fp-ring');
  if(ring&&a.dur){const C=2*Math.PI*54;ring.setAttribute('stroke-dasharray',(Math.max(0,Math.min(1,left/a.dur))*C).toFixed(1)+' '+C.toFixed(1));}
  const el2=document.getElementById('fp-elapsed');
  if(el2)el2.textContent=fitClock((now-a.startedAt-a.pausedMs-(a.paused?now-(a.pausedAt||now):0))/1000);
  // смена стороны на половине времени
  const c=fitPlayerCtx();
  if(a.phase==='work'&&c&&c.e&&c.e.unilateral&&c.it&&c.it.sec!=null&&a.timerOn&&!a.paused&&!a.side2&&left<=a.dur/2){
    a.side2=true;fitBeep(1);
    const s=document.getElementById('fp-side');if(s)s.textContent='Вторая сторона';
  }
  const lt=document.getElementById('fp-left');
  if(lt&&c&&c.st&&c.st.seg!=null){
    const rest=a.plan.segs.slice(c.st.seg+1).reduce((x,s)=>x+s.sec,0);
    lt.textContent=fitClock(left+rest);
  }
}

async function fitWakeLock(on){
  try{
    if(on){
      if('wakeLock' in navigator&&!FIT_WAKE){FIT_WAKE=await navigator.wakeLock.request('screen');FIT_WAKE.addEventListener('release',()=>{FIT_WAKE=null;});}
    }else if(FIT_WAKE){await FIT_WAKE.release();FIT_WAKE=null;}
  }catch(e){FIT_WAKE=null;}
}

document.addEventListener('visibilitychange',()=>{
  const el=document.getElementById('fit-player');
  if(document.visibilityState==='visible'&&el&&el.classList.contains('open')&&DATA&&DATA.fit&&DATA.fit.active){
    fitWakeLock(true);fitPlayerCatchUp();fitPlayerRender();
  }
});

function fitAudioUnlock(){
  if(!DATA.fit.sound)return;
  try{
    if(!FIT_AUDIO)FIT_AUDIO=new(window.AudioContext||window.webkitAudioContext)();
    if(FIT_AUDIO.state==='suspended')FIT_AUDIO.resume();
  }catch(e){}
}

function fitBeep(n){
  try{if(navigator.vibrate)navigator.vibrate(n>1?[180,90,180]:120);}catch(e){}
  if(!DATA.fit.sound||!FIT_AUDIO)return;
  try{
    const ctx=FIT_AUDIO;
    for(let k=0;k<n;k++){
      const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+k*0.22;
      o.type='sine';o.frequency.value=k===n-1&&n>1?1175:880;
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.25,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
      o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.2);
    }
  }catch(e){}
}

// ── отрисовка ───────────────────────────────────────────────

function fitPlayerRender(){
  const el=document.getElementById('fit-player');if(!el)return;
  const c=fitPlayerCtx();
  if(!c){fitPlayerClose();return;}
  const a=c.a,plan=a.plan;
  const pct=Math.round(Math.min(a.pos,c.steps.length)/c.steps.length*100);
  let h=`<div class="fp-top">
    <button class="fp-icon" onclick="fitPlayerClose()" aria-label="Свернуть">⌄</button>
    <div class="fp-top-mid"><div class="fp-top-t">${escHtml(plan.title)}</div><div class="fp-top-s"><span id="fp-elapsed">0:00</span> · шаг ${Math.min(a.pos+1,c.steps.length)} из ${c.steps.length}</div></div>
    <button class="fp-icon" onclick="fitPlayerMenu()" aria-label="Меню">⋯</button>
  </div><div class="fp-prog"><i style="width:${pct}%"></i></div><div class="fp-body">`;
  if(a.phase==='finish')h+=fitPlayerFinishHtml(c);
  else if(a.phase==='rest')h+=fitPlayerRestHtml(c);
  else if(a.phase==='fb')h+=fitPlayerFbHtml(c);
  else if(c.st&&c.st.seg!=null)h+=fitPlayerSegHtml(c);
  else h+=fitPlayerWorkHtml(c);
  h+=`</div>`;
  el.innerHTML=h;
  fitPlayerTick();
}

function fitRingHtml(big){
  const C=2*Math.PI*54;
  return`<div class="fp-ring${big?' big':''}"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="fp-ring-bg"/><circle id="fp-ring" cx="60" cy="60" r="54" class="fp-ring-fg" stroke-dasharray="${C.toFixed(1)} ${C.toFixed(1)}"/></svg><div class="fp-timer" id="fp-timer">0:00</div></div>`;
}

function fitStepLabel(c){
  const it=c.it,st=c.st;
  if(it.b==='warm')return'Разминка';
  if(it.b==='cool')return'Заминка';
  if(it.b==='fin')return'Финишер';
  if(c.a.plan.format==='circuit'&&st.round)return'Круг '+st.round+' из '+st.of;
  if(c.a.plan.format==='flow')return FIT_TYPES[c.a.plan.type]||'Поток';
  if(it.b==='mob')return'Мобильность';
  if(it.b==='cardio')return'Кардио';
  return'Подход '+st.set+' из '+st.of;
}

function fitPlayerWorkHtml(c){
  const a=c.a,it=c.it,e=c.e,logged=a.log[c.st.i]||[];
  const soft=fitIsSoftItem(it);
  const target=[];
  if(it.sec!=null)target.push(fitFmtSec(it.sec)+(e.unilateral?' на каждую сторону':''));
  else if(it.reps)target.push(it.reps[0]+(it.reps[1]!==it.reps[0]?'–'+it.reps[1]:'')+' повторов'+(e.unilateral?' на сторону':''));
  if(it.kg)target.push(fitNum(it.kg)+' кг');
  if(it.rpe)target.push('RPE '+fitNum(it.rpe));
  let h=`<div class="fp-block">${fitStepLabel(c)}</div>
    <div class="fp-name" onclick="fitOpenEx('${e.id}')">${escHtml(e.name)} <span>ⓘ</span></div>
    <div class="fp-target">${target.join(' · ')}</div>
    ${it.note&&!/^Подбери вес/.test(it.note)?`<div class="fp-note">${escHtml(it.note)}</div>`:''}
    <div class="fp-cues">${e.cues.slice(0,3).map(x=>`<div>· ${escHtml(x)}</div>`).join('')}</div>`;
  if(it.sec!=null){
    if(a.timerOn){
      h+=fitRingHtml(true);
      if(e.unilateral)h+=`<div class="fp-side" id="fp-side">${a.side2?'Вторая сторона':'Первая сторона'}</div>`;
      h+=`<div class="fp-actions"><button class="fp-btn ghost" onclick="fitPlayerPause()">${a.paused?'▶ Продолжить':'❚❚ Пауза'}</button><button class="fp-btn" onclick="fitPlayerDoneSet()">Готово</button></div>`;
    }else{
      h+=`<div class="fp-bigval">${fitFmtSec(it.sec)}</div><div class="fp-actions"><button class="fp-btn" onclick="fitPlayerStartTimer()">▶ Старт</button></div>`;
    }
  }else if(soft){
    h+=`<div class="fp-actions"><button class="fp-btn" onclick="fitPlayerDoneSet()">Готово</button></div>`;
  }else{
    const cur=fitPlayerCur(),loaded=fitIsLoaded(e);
    h+=`<div class="fp-inputs">
      <div class="fp-in"><div class="fp-in-lbl">Повторы</div><div class="fp-step"><button onclick="fitPlayerAdj('r',-1)" aria-label="Меньше">−</button><input type="number" inputmode="numeric" value="${cur.r}" onchange="fitPlayerSetVal('r',this.value)"/><button onclick="fitPlayerAdj('r',1)" aria-label="Больше">+</button></div></div>
      ${loaded?`<div class="fp-in"><div class="fp-in-lbl">Вес, кг</div><div class="fp-step"><button onclick="fitPlayerAdj('w',-1)" aria-label="Меньше">−</button><input type="number" inputmode="decimal" step="0.5" value="${cur.w||''}" placeholder="0" onchange="fitPlayerSetVal('w',this.value)"/><button onclick="fitPlayerAdj('w',1)" aria-label="Больше">+</button></div></div>`:''}
    </div>
    <div class="fp-actions"><button class="fp-btn" onclick="fitPlayerDoneSet()">${c.a.plan.format==='circuit'?'Готово':'Подход сделан ✓'}</button></div>`;
  }
  if(logged.length)h+=`<div class="fp-logged">${logged.map((s,i)=>`<span>${i+1}: ${s.t?s.t+' с':(s.w?fitNum(s.w)+'×':'')+(s.r||0)}</span>`).join('')}</div>`;
  h+=`<div class="fp-sec"><button onclick="fitPlayerSkip()">Пропустить</button>${!logged.length&&!soft?`<button onclick="fitPlayerSwap()">Заменить</button>`:''}</div>`;
  return h;
}

function fitPlayerRestHtml(c){
  const nx=c.st,a=c.a;
  let next='';
  if(nx&&nx.seg==null&&nx.i!=null){
    const it=a.plan.items[nx.i],e=FIT_DB.byId[it.id];
    next=`<div class="fp-next"><div class="fp-next-lbl">Дальше</div><div class="fp-next-t">${escHtml(e.name)}</div><div class="fp-next-s">${fitStepLabel({a,it,st:nx})} · ${fitRxText(it,e,true)}</div></div>`;
  }
  return`<div class="fp-block">Отдых</div>
    ${fitRingHtml(true)}
    <div class="fp-actions"><button class="fp-btn ghost sm" onclick="fitPlayerRestAdj(-15)">−15 сек</button><button class="fp-btn ghost sm" onclick="fitPlayerRestAdj(15)">+15 сек</button></div>
    <div class="fp-actions"><button class="fp-btn" onclick="fitPlayerEnterWork(null);saveData();fitPlayerRender()">Пропустить отдых</button></div>
    ${next}`;
}

function fitPlayerFbHtml(c){
  const e=c.e;
  return`<div class="fp-block">Упражнение закончено</div>
    <div class="fp-name">Как прошло «${escHtml(e.name)}»?</div>
    <div class="fp-target">Tempo подстроит вес и повторы в следующий раз</div>
    <div class="fp-fb">
      <button onclick="fitPlayerFb('easy')"><b>Легко</b><span>мог бы ещё 3+ повтора</span></button>
      <button onclick="fitPlayerFb('ok')"><b>Нормально</b><span>1–2 повтора в запасе</span></button>
      <button onclick="fitPlayerFb('hard')"><b>Тяжело</b><span>на пределе или сломалась техника</span></button>
    </div>
    <div class="fp-sec"><button onclick="fitPlayerFb(null)">Пропустить</button></div>`;
}

function fitPlayerSegHtml(c){
  const a=c.a,seg=a.plan.segs[c.st.seg];
  return`<div class="fp-block">Отрезок ${c.st.seg+1} из ${a.plan.segs.length}</div>
    <div class="fp-seg k-${seg.k}">${escHtml(seg.n)}</div>
    ${fitRingHtml(true)}
    <div class="fp-target">До конца: <span id="fp-left">—</span></div>
    <div class="fit-seg-line fp-segline">${a.plan.segs.map((s,k)=>`<i class="k-${s.k}${k===c.st.seg?' cur':''}${k<c.st.seg?' past':''}" style="flex:${s.sec}"></i>`).join('')}</div>
    <div class="fp-actions"><button class="fp-btn ghost" onclick="fitPlayerPause()">${a.paused?'▶ Продолжить':'❚❚ Пауза'}</button><button class="fp-btn" onclick="fitPlayerSkip()">Следующий ›</button></div>`;
}

function fitPlayerFinishHtml(c){
  const a=c.a;
  const all=a.pos>=c.steps.length;
  const sets=Object.values(a.log).reduce((x,l)=>x+l.length,0);
  const vol=Object.values(a.log).flat().reduce((x,s)=>x+(s.r||0)*(s.w||0),0);
  const min=Math.max(1,Math.round((Date.now()-a.startedAt-a.pausedMs)/60000));
  const r=a.finish.rpe;
  return`<div class="fp-block">${all?'Готово!':'Завершение'}</div>
    <div class="fp-name">${all?'Тренировка завершена':'Завершить тренировку?'}</div>
    <div class="fp-sum"><div><b>${min}</b><span>${fitPlural(min,'минута','минуты','минут')}</span></div><div><b>${sets}</b><span>${fitPlural(sets,'подход','подхода','подходов')}</span></div><div><b>${vol?Math.round(vol):'—'}</b><span>кг объёма</span></div></div>
    <div class="fp-q">Насколько тяжело было в целом?</div>
    <div class="fp-rpe">${[1,2,3,4,5,6,7,8,9,10].map(v=>`<button class="${r===v?'sel':''}" onclick="DATA.fit.active.finish.rpe=${v};saveData();fitPlayerRender()">${v}</button>`).join('')}</div>
    <div class="fp-rpe-lbl">${r?r+' — '+FIT_RPE_TXT[r]:'1 — совсем легко, 10 — предел сил'}</div>
    <div class="fp-q">Как ощущения?</div>
    <div class="fit-chips center">${FIT_FEEL.map(x=>`<button class="fit-chip sm${a.finish.feel.includes(x)?' sel':''}" onclick="fitPlayerFeel('${x}')">${x}</button>`).join('')}</div>
    <textarea class="field-inp fp-note-inp" placeholder="Заметка (необязательно)" oninput="DATA.fit.active.finish.note=this.value">${escHtml(a.finish.note||'')}</textarea>
    <div class="fp-actions"><button class="fp-btn" onclick="fitPlayerSave()">Сохранить тренировку</button></div>
    ${!all?`<div class="fp-sec"><button onclick="fitPlayerBack()">Вернуться к тренировке</button></div>`:''}`;
}

function fitPlayerFeel(x){
  const l=DATA.fit.active.finish.feel,i=l.indexOf(x);
  if(i>=0)l.splice(i,1);else l.push(x);
  saveData();fitPlayerRender();
}

function fitPlayerMenu(){
  document.getElementById('panel').innerHTML=`
    <div class="panel-head"><h2>Тренировка</h2><button class="close-btn" onclick="closeOverlay()">×</button></div>
    <div class="panel-scroll">
      <button class="fit-set-row" onclick="fitPlayerFinishNow()"><span>Завершить и сохранить</span><span>›</span></button>
      <button class="fit-set-row" onclick="DATA.fit.sound=!DATA.fit.sound;saveData();if(DATA.fit.sound)fitAudioUnlock();fitPlayerMenu()"><span>Звук таймера</span><span class="${DATA.fit.sound?'on':''}">${DATA.fit.sound?'вкл':'выкл'}</span></button>
      <button class="fit-set-row" onclick="closeOverlay();fitPlayerClose()"><span>Свернуть — продолжу позже</span><span>›</span></button>
      <button class="fit-set-row danger" onclick="fitPlayerAbort()"><span>Отменить тренировку</span><span>×</span></button>
    </div>`;
  document.getElementById('overlay').classList.add('open');
}

function fitPlayerSwap(){
  const c=fitPlayerCtx();if(!c||!c.it)return;
  const f=DATA.fit,t=todayKey(),ci=f.checkins[t]||null;
  const place=(ci&&ci.place)||f.profile.place;
  const rd=fitReadiness(ci,f.checkins,f.sessions.filter(s=>s.date<t),t);
  const alts=fitAlternatives(c.it,c.a.plan,FIT_DB,fitSwapFilter(place,rd,fitProg()));
  fitShowSwapPanel(c.e,alts,'fitPlayerDoSwap(',null);
}

function fitPlayerDoSwap(id){
  const c=fitPlayerCtx(),e=FIT_DB.byId[id];if(!c||!e)return;
  c.a.plan.items[c.st.i]=fitRetarget(c.it,e,DATA.fit.sessions,fitLvlN());
  fitPlayerEnterWork(null);
  saveData();closeOverlay();fitPlayerRender();
}

// ── сохранение ──────────────────────────────────────────────

function fitPlayerSave(){
  const f=DATA.fit,a=f.active;if(!a)return;
  const plan=a.plan,date=todayKey(new Date(a.startedAt));
  const min=Math.max(1,Math.round((Date.now()-a.startedAt-a.pausedMs)/60000));
  const ex=plan.items.map((it,i)=>({id:it.id,sl:it.sl==null?null:it.sl,fb:a.fb[i]||null,sets:(a.log[i]||[]).slice()})).filter(x=>x.sets.length);
  if(plan.format==='intervals'&&a.segDone>0){
    const run=plan.items.find(it=>it.b==='cardio');
    if(run)ex.unshift({id:run.id,sl:null,fb:null,sets:[{t:a.segDone}]});
  }
  if(!ex.length&&min<3&&!confirm('Почти ничего не записано. Всё равно сохранить?'))return;
  const rpe=a.finish.rpe||(plan.type==='recovery'||plan.type==='mobility'?3:6);
  const kcal=plan.kcal&&plan.minutes?Math.round(plan.kcal/plan.minutes*Math.min(min,plan.minutes*1.5)):0;
  const s={id:'s'+Date.now().toString(36),date,tpl:plan.tplId,type:plan.type,title:plan.title,start:a.startedAt,min,rpe,load:rpe*min,kcal,mode:plan.mode,
    feel:a.finish.feel.slice(),note:(a.finish.note||'').trim(),prog:!!plan.program,progId:plan.program?plan.program.id:null,prs:[],pts:0,ex};
  s.prs=fitSessionPRs(s,f.sessions,FIT_DB);
  let completed=null;
  if(plan.program&&f.program.id===plan.program.id){
    f.program.idx=(f.program.idx||0)+1;
    const prog=fitProg(),st=prog&&fitProgramState(prog,f.program);
    if(st&&st.done){f.done.push({id:prog.id,date});completed=prog;f.program={id:'smart'};}
  }
  const aw=f.awards[date]||(f.awards[date]={});
  if(plan.type==='recovery'){if(!aw.r){aw.r=1;s.pts=POINTS.fitRecovery;}}
  else if(!aw.w){aw.w=1;s.pts=POINTS.fitWorkout;}
  f.sessions.push(s);
  f.sessions.sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:(x.start||0)-(y.start||0));
  f.active=null;
  if(f.today&&f.today.date===date){f.today.more=false;f.today.recovery=false;f.today.force=false;}
  f.tab='today';
  if(s.pts)addPoints(s.pts,'fit workout',date);else{saveData();checkAchievements();}
  fitPlayerClose();
  updateTopBar();
  if(completed)fitCelebrate(completed);
  else showToast(s.prs.length?'Новый рекорд! '+s.prs[0]:'Тренировка сохранена'+(s.pts?' · +'+s.pts+' баллов':''),'good');
}

function fitCelebrate(prog){
  document.getElementById('panel').innerHTML=`
    <div class="vacation-celebration">
      <div class="vc-emoji">🎓</div>
      <div class="vc-title">Программа пройдена!</div>
      <div class="vc-text">«${escHtml(prog.name)}» — от первой до последней тренировки. Это настоящая дисциплина. Выбери следующую программу или продолжай в умном режиме.</div>
      <button class="pf-save" onclick="fitOpenPrograms()" style="margin-top:16px;width:100%;">Выбрать следующую</button>
    </div>`;
  document.getElementById('overlay').classList.add('open');
}
