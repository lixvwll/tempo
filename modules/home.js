// === HOME SCREEN ===
// Главная: цель дня, серия и сундук недели наверху, «Сейчас / Дальше», привычки и дела в одно касание, вода.
// Отклик на каждую отметку (звук, частицы, монеты) — в modules/joy.js.

let HOME_ENTER=false;   // проигрывать анимацию входа (ставится при переходе на главную)
let HOME_JUST=null;     // что только что отметили — для «пружины» на карточке
let HOME_RING=null;     // прошлое значение кольца цели — чтобы оно доезжало, а не прыгало

const HOME_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

function renderHome(){
  const root=document.getElementById('ms-home');
  const now=new Date(),todayK=todayKey(),nowMin=now.getHours()*60+now.getMinutes();
  const events=getDayEvents(todayK);

  let currentEvent=null,nextEvent=null;
  for(const e of events){
    if(!e.start||e.done||e.skipped)continue;
    const s=timeToMin(e.start),en=e.end?timeToMin(e.end):s+90;
    if(nowMin>=s&&nowMin<en&&!currentEvent)currentEvent=e;
    else if(nowMin<s&&!nextEvent)nextEvent=e;
  }

  const greet=(()=>{const h=now.getHours();if(h<6)return'Доброй ночи';if(h<12)return'Доброе утро';if(h<18)return'Добрый день';return'Добрый вечер';})();
  const dayPts=getDayPoints(todayK),goal=jyGoal(),pct=Math.max(0,Math.min(1,dayPts/goal));
  const goalHit=!!(DATA.goalDays||{})[todayK],dayDone=!!(DATA.dayDone||{})[todayK];
  const streak=DATA.streak||0,cs=jyChestState(),dw=dayOfWeek(now);
  const C=2*Math.PI*56,from=HOME_RING==null?pct:HOME_RING;
  const enter=HOME_ENTER?' jy-enter':'';HOME_ENTER=false;
  const lv=jyLevelOf(DATA.points||0),lvA=jyLevelXP(lv),lvB=jyLevelXP(lv+1);

  let html=`<div class="jy-home${enter}">
    <div class="jy-hello jy-rv" style="--i:0"><span>${greet}, ${escHtml(DATA.name)}</span><span class="jy-lvl" title="Уровень за все заработанные баллы">ур. ${lv} · ${jyLevelName(lv)}<i style="--p:${((DATA.points-lvA)/(lvB-lvA)*100).toFixed(1)}%"></i></span></div>

    <div class="jy-hero jy-rv" style="--i:1">
      <div class="jy-goal${goalHit?' hit':''}">
        <svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="56" fill="none" style="stroke:var(--jy-track)" stroke-width="12"/>
          <circle class="arc" id="jy-arc" cx="66" cy="66" r="56" fill="none" style="stroke:var(--jy-gc);stroke-linecap:var(--cap)" stroke-width="12" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C*(1-from)).toFixed(2)}" data-to="${(C*(1-pct)).toFixed(2)}"/></svg>
        <div class="c"><b>${dayPts}</b><small>из ${goal}</small><em>${goalHit?'цель взята!':'цель дня'}</em></div>
      </div>
      <div class="jy-side">
        <div class="jy-flame${streak>=7?' t2':''}"><span class="f">${jyJoy('🔥','streak')}</span><div><b>${streak}</b><small>${pl3(streak,'день','дня','дней')} подряд${DATA.freezes?` · ❄️${DATA.freezes}`:''}</small></div></div>
        <div class="jy-wk">${cs.ks.map((k,i)=>`<i class="${(DATA.goalDays||{})[k]?'y':''}${i===dw?' td':''}${i>dw?' fu':''}"></i>`).join('')}
          <button class="jy-chestb${cs.ready?' ready':''}${cs.open?' open':''}" onclick="${cs.ready?'jyChestModal()':'homeChestHint()'}" aria-label="Сундук недели">🎁</button></div>
        <div class="jy-wkl">${cs.open?'Сундук недели открыт ✓':cs.ready?'Сундук готов — нажми!':`${cs.n} из 5 дней с целью до сундука`}</div>
      </div>
    </div>
    ${goalHit&&!dayDone?`<button class="jy-finish jy-rv" style="--i:1.5" onclick="jyDayModal()">✨ Завершить день</button>`:''}`;

  // Сейчас / Дальше
  if(DATA.vacationMode){
    html+=`<div class="vacation-banner jy-rv" style="--i:2"><div class="vb-icon">🌴</div><div class="vb-text">Каникулы — отдыхай! Пары скрыты, но сохранены.</div></div>`;
  }else if(currentEvent||nextEvent){
    const e=currentEvent||nextEvent,isCur=!!currentEvent;
    const s=timeToMin(e.start),en=e.end?timeToMin(e.end):s+90;
    const sub=isCur?`осталось ${en-nowMin} мин`:(()=>{const m=s-nowMin;return m<60?`через ${m} мин`:`через ${Math.floor(m/60)} ч ${m%60} мин`;})();
    html+=`<div class="jy-now jy-rv" style="--i:2">
      <div class="k">${isCur?'<span class="live"></span>Сейчас · до '+(e.end||'…'):'Дальше · '+e.start}</div>
      <div class="row"><div class="tx"><div class="t">${escHtml(e.name)}</div><div class="m">${sub}${e.meta?' · '+escHtml(e.meta):''}</div></div>
        <button class="jy-go" onclick="homeDone('${e.id}',${e.isLecture})">${HOME_CHECK}Готово</button></div>
      ${isCur?`<div class="bar"><i style="width:${Math.max(2,Math.min(100,(nowMin-s)/(en-s)*100)).toFixed(1)}%"></i></div>`:''}
    </div>`;
  }

  // Привычки
  const habs=DATA.habits||[],log=DATA.habitLogs[todayK]||{};
  if(habs.length){
    const hd=habs.filter(h=>log[h.id]).length;
    html+=`<div class="jy-sec jy-rv" style="--i:3"><b>Привычки</b><small>${hd} из ${habs.length} · +${POINTS.habitDone} за каждую</small></div>
      <div class="jy-habs jy-rv" style="--i:3.5">${habs.map(h=>{const y=!!log[h.id],st=calcStreak(h.id);
        return `<button class="jy-hb${y?' y':''}${HOME_JUST==='h'+h.id?' just':''}" onclick="homeHabit('${h.id}')"><span class="ok">${HOME_CHECK}</span><span class="e">${h.emoji||'•'}</span><span class="tx"><b>${escHtml(h.name)}</b><span>${st>1?'🔥 '+st+' '+pl3(st,'день','дня','дней'):'+'+POINTS.habitDone}</span></span></button>`;}).join('')}</div>`;
  }

  // Дела на сегодня
  const rest=events.filter(e=>!e.skipped);
  if(rest.length){
    const ed=rest.filter(e=>e.done).length,list=rest.filter(e=>!e.done).concat(rest.filter(e=>e.done)).slice(0,6);
    html+=`<div class="jy-sec jy-rv" style="--i:4"><b>Дела на сегодня</b><small>${ed} из ${rest.length}</small></div>
      <div class="jy-ts jy-rv" style="--i:4.5">${list.map(e=>`<button class="jy-tk${e.done?' y':''}${HOME_JUST==='e'+e.id?' just':''}" onclick="homeDone('${e.id}',${e.isLecture})">
        <span class="ck">${HOME_CHECK}</span><span class="tx"><b>${escHtml(e.name)}</b><span>${e.start||'без времени'}${e.isLecture?' · пара':''}</span></span><span class="p">+${e.isLecture?POINTS.lectureAttended:POINTS.taskDone}</span></button>`).join('')}
        ${rest.length>6?`<button class="jy-more" onclick="navTo('schedule')">Ещё ${rest.length-6} — открыть день ›</button>`:''}</div>`;
  }else{
    html+=`<button class="jy-empty jy-rv" style="--i:4" onclick="navTo('schedule');setTimeout(openTaskEditor,250)">＋ Добавь первое дело на сегодня</button>`;
  }

  // Вода и тренировки
  const wml=waterTotalForDay(DATA,todayK),wgoal=DATA.water.goalMl||2000,wp=Math.min(1,wml/wgoal);
  html+=`<div class="jy-duo jy-rv" style="--i:5">
    <button class="jy-wat" onclick="homeWater()" style="--lv:${(wp*100).toFixed(0)}%"><span class="lvl"></span><span class="plus">+</span>
      <span class="k">💧 Вода</span><span class="v">${(wml/1000).toFixed(2).replace(/0$/,'').replace('.',',')} <small>из ${(wgoal/1000).toString().replace('.',',')} л</small></span><span class="s">${wml>=wgoal?'норма выполнена':'+ стакан 250 мл'}</span></button>
    ${renderFitMini()}
  </div>
  ${renderCaloriesWidget()}
  <div class="jy-rv" style="--i:6">${renderSkinTeaser()}</div>
  ${renderHomeExport()}
  </div>`;

  root.innerHTML=html;
  HOME_JUST=null;
  // кольцо цели доезжает до нового значения
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const a=document.getElementById('jy-arc');if(a)a.style.strokeDashoffset=a.dataset.to;}));
  HOME_RING=pct;

  if(HOME_TIMER)clearInterval(HOME_TIMER);
  HOME_TIMER=setInterval(()=>{if(CURRENT_SCREEN==='home'&&!document.querySelector('.jy-mo'))renderHome();},60000);
}

// Компактная плитка Fit рядом с водой (полный виджет — на вкладке Fit)
function renderFitMini(){
  fitEnsure(DATA);
  const f=DATA.fit,t=todayKey(),done=f.sessions.filter(s=>s.date===t&&s.type!=='recovery');
  const main=!f.setupDone?'Настроить':f.active?'В процессе':done.length?'Готово ✓':(f.checkins[t]?'Тренировка ждёт':'Чек-ин');
  const sub=!f.setupDone?'тренировки под самочувствие':f.active?'продолжить →':done.length?done[done.length-1].min+' мин':(f.checkins[t]?'открыть план →':'20 секунд');
  return `<button class="jy-fit" onclick="navTo('fit')"><span class="k">${ico('fit')} Fit</span><span class="v">${main}</span><span class="s">${sub}</span></button>`;
}
// Напоминание об экспорте — только если давно не сохранял
function renderHomeExport(){
  const last=DATA.lastExport,days=last?Math.floor((Date.now()-last)/864e5):null;
  if(last&&days<14)return '';
  if(!last&&(DATA.daysCount||0)<7)return '';
  return `<div class="jy-exp jy-rv" style="--i:7"><span>💾</span><span class="tx">${last?`Экспорт был ${days} дн. назад`:'Данные ещё не сохранялись в файл'}</span><button onclick="exportData()">Сохранить</button></div>`;
}

// --- действия с главной (всегда про сегодня) ---
function homeHabit(id){
  HABITS_DAY=todayKey();HOME_JUST='h'+id;
  toggleHabit(id);
  if(CURRENT_SCREEN==='home')renderHome();
}
function homeDone(id,isLecture){
  SCHED_DAY=todayKey();HOME_JUST='e'+id;
  markDone(id,isLecture);
  if(CURRENT_SCREEN==='home')renderHome();
}
function homeWater(){
  addWaterEntry(250,'🥛');
  if(CURRENT_SCREEN==='home')renderHome();
}
function homeChestHint(){
  const cs=jyChestState();
  if(cs.open)showToast('Сундук этой недели уже открыт — новый в понедельник');
  else showToast(`Сундук откроется после 5 дней с целью · сейчас ${cs.n} из 5`);
}
