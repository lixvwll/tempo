// === HOME SCREEN ===

function renderHome(){
  const root=document.getElementById('ms-home');
  const now=new Date();
  const todayK=todayKey();
  const events=getDayEvents(todayK);
  const nowMin=now.getHours()*60+now.getMinutes();

  let currentEvent=null,nextEvent=null;
  for(const e of events){
    if(!e.start||e.done||e.skipped)continue;
    const s=timeToMin(e.start);
    const en=e.end?timeToMin(e.end):s+90;
    if(nowMin>=s&&nowMin<en){currentEvent=e;}
    else if(nowMin<s&&!nextEvent){nextEvent=e;}
  }

  const upcoming=events.filter(e=>{
    if(e.done||e.skipped)return false;
    if(currentEvent&&e.id===currentEvent.id)return false;
    if(!e.start)return false;
    const s=timeToMin(e.start);
    return s>=nowMin;
  }).slice(0,4);

  const dayStart=6*60,dayEnd=23*60;
  const progPct=Math.max(0,Math.min(100,((nowMin-dayStart)/(dayEnd-dayStart))*100));

  const dayPts=getDayPoints(todayK);
  const habitsToday=DATA.habitLogs[todayK]||{};
  const habitsDone=DATA.habits.filter(h=>habitsToday[h.id]).length;

  const greet=(()=>{const h=now.getHours();if(h<6)return'Доброй ночи';if(h<12)return'Доброе утро';if(h<18)return'Добрый день';return'Добрый вечер';})();

  const timeStr=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const dateStr=fmtDayName(now)+', '+fmtDate(now);

  let html=`
    <div class="home-greet">${greet}, ${escHtml(DATA.name)}</div>
    <div class="home-time">${timeStr}<span class="hr-date">${dateStr}</span></div>

    <div class="day-progress">
      <div class="dp-bar">
        <div class="dp-fill" style="width:${progPct}%"></div>
        <div class="dp-marker" style="left:calc(${progPct}% - 1px)"></div>
      </div>
      <div class="dp-labels"><span>06:00</span><span>23:00</span></div>
    </div>
  `;

  if(DATA.vacationMode){
    html+=`
      <div class="vacation-banner">
        <div class="vb-icon">🌴</div>
        <div class="vb-text">Каникулы — отдыхай! Пары скрыты, но сохранены.</div>
      </div>
    `;
  }else if(currentEvent){
    html+=`
      <div class="now-card urgent">
        <div class="nc-label">Сейчас</div>
        <div class="nc-title">${escHtml(currentEvent.name)}</div>
        ${currentEvent.meta?`<div class="nc-meta">${escHtml(currentEvent.meta)}</div>`:''}
        <div class="nc-time">${currentEvent.start} – ${currentEvent.end||'…'} · ${typeName(currentEvent.type)}</div>
      </div>
    `;
  }else if(nextEvent){
    const minTo=timeToMin(nextEvent.start)-nowMin;
    const inStr=minTo<60?`через ${minTo} мин`:`через ${Math.floor(minTo/60)}ч ${minTo%60}мин`;
    html+=`
      <div class="now-card">
        <div class="nc-label">Дальше</div>
        <div class="nc-title">${escHtml(nextEvent.name)}</div>
        ${nextEvent.meta?`<div class="nc-meta">${escHtml(nextEvent.meta)}</div>`:''}
        <div class="nc-time">${nextEvent.start} · ${inStr}</div>
      </div>
    `;
  }else{
    html+=`
      <div class="now-card">
        <div class="nc-label">Сейчас</div>
        <div class="nc-empty">Свободное время. Можно отдохнуть или закрыть привычки.</div>
      </div>
    `;
  }

  if(upcoming.length>0){
    html+=`<div class="next-list"><div class="nl-label">Дальше сегодня</div>`;
    upcoming.forEach(e=>{
      let status='';
      if(e.done)status='<span class="nl-status done">✓</span>';
      else if(e.skipped)status='<span class="nl-status skipped">×</span>';
      html+=`
        <div class="nl-item" onclick="navTo('schedule')">
          <span class="nl-time">${e.start||'—'}</span>
          <span class="nl-dot t-${e.type}"></span>
          <span class="nl-name">${escHtml(e.name)}</span>
          ${status}
        </div>
      `;
    });
    html+=`</div>`;
  }

  html+=`
    <div class="day-stats">
      <div class="ds-card">
        <div class="ds-lbl">Баллы дня</div>
        <div class="ds-val ${dayPts>0?'pos':dayPts<0?'neg':''}">${dayPts>0?'+':''}${dayPts}</div>
        <div class="ds-sub">сегодня</div>
      </div>
      <div class="ds-card">
        <div class="ds-lbl">Серия</div>
        <div class="ds-val">${DATA.streak||0}</div>
        <div class="ds-sub">${DATA.streak===1?'день':'дней'} подряд</div>
      </div>
      <div class="ds-card">
        <div class="ds-lbl">Привычки</div>
        <div class="ds-val">${habitsDone}/${DATA.habits.length}</div>
        <div class="ds-sub">сегодня</div>
      </div>
    </div>

    <div class="cta-row">
      <button class="cta-btn" onclick="navTo('schedule')">Расписание</button>
      <button class="cta-btn" onclick="navTo('habits')">Привычки</button>
    </div>

    ${renderCaloriesWidget()}

    ${renderExportBanner()}
  `;

  root.innerHTML=html;

  HOME_TIMER=setInterval(()=>{if(CURRENT_SCREEN==='home')renderHome();},60000);
}
