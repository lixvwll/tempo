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
  
  if(currentEvent){
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

    ${renderExportBanner()}
  `;
  
  root.innerHTML=html;
  
  HOME_TIMER=setInterval(()=>{if(CURRENT_SCREEN==='home')renderHome();},60000);
}

function typeName(t){const o=TASK_TYPES.find(x=>x.id===t);return o?o.name:'';}
function escHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);}

function renderWeekStrip(activeKey,onClick){
  const today=todayKey();
  const active=dateFromKey(activeKey);
  const dow=dayOfWeek(active);
  const monday=new Date(active);monday.setDate(active.getDate()-dow);
  let html='<div class="week-strip">';
  for(let i=0;i<7;i++){
    const d=new Date(monday);d.setDate(monday.getDate()+i);
    const k=todayKey(d);
    const pts=getDayPoints(k);
    const ptsCls=pts>0?'pos':pts<0?'neg':'';
    const ptsStr=pts!==0?(pts>0?'+':'')+pts:'';
    const mood=DATA.moods[k]||0;
    const moodCls=mood?' mood-'+mood:'';
    html+=`
      <div class="ws-day${k===activeKey?' active':''}${k===today?' today':''}${moodCls}" onclick="${onClick}('${k}')">
        <div class="ws-name">${fmtDayName(d,true)}</div>
        <div class="ws-num">${d.getDate()}</div>
        <div class="ws-pts ${ptsCls}">${ptsStr}</div>
      </div>
    `;
  }
  html+='</div>';
  return html;
}

function renderDayNav(activeKey,onChange){
  const d=dateFromKey(activeKey);
  const rel=relDay(activeKey);
  const name=rel||fmtDayName(d);
  const today=todayKey();
  return `
    <div class="day-nav">
      <button class="day-arrow" onclick="${onChange}('${shiftDay(activeKey,-1)}')">‹</button>
      <div class="day-current">
        <div class="day-current-name">${name}</div>
        <div class="day-current-date">${fmtDate(d)}</div>
      </div>
      <button class="day-arrow" onclick="${onChange}('${shiftDay(activeKey,1)}')">›</button>
      ${activeKey!==today?`<button class="today-pill" onclick="${onChange}('${today}')">Сегодня</button>`:''}
    </div>
  `;
}

function renderSchedule(){
  if(!SCHED_DAY)SCHED_DAY=todayKey();
  const root=document.getElementById('ms-schedule');
  const events=getDayEvents(SCHED_DAY);
  const today=todayKey();
  const isPast=SCHED_DAY<today;
  const isFuture=SCHED_DAY>today;
  const mood=DATA.moods[SCHED_DAY]||0;
  const moodCls=mood?' mood-day-'+mood:'';
  
  let html=renderDayNav(SCHED_DAY,'schedSetDay')+renderWeekStrip(SCHED_DAY,'schedSetDay');
  
  html+=`<div class="section-lbl">Расписание дня</div>`;
  
  if(events.length===0){
    html+=`<div class="empty-day">Пусто. Добавь дело или загляни в настройки если ещё не добавил пары.</div>`;
  }else{
    events.forEach(e=>{
      const cls=(e.done?' done':'')+(e.skipped?' skipped':'')+moodCls;
      const timeStr=e.start?(e.start+(e.end?'<br>'+e.end:'')):'—';
      const meta=e.meta||(e.isLecture?'':typeName(e.type));
      html+=`
        <div class="task-card${cls}">
          <div class="task-stripe t-${e.type}"></div>
          <div class="tc-time">${timeStr}</div>
          <div class="tc-info">
            <div class="tc-name">${escHtml(e.name)}</div>
            ${meta?`<div class="tc-meta">${escHtml(meta)}</div>`:''}
          </div>
          <div class="tc-actions">
            <button class="tc-btn done-btn ${e.done?'active-done':''}" onclick="markDone('${e.id}',${e.isLecture})" title="Сделано">✓</button>
            <button class="tc-btn skip-btn ${e.skipped?'active-skip':''}" onclick="markSkip('${e.id}',${e.isLecture})" title="Пропущено">×</button>
            ${!e.isLecture?`<button class="tc-btn" onclick="editTask('${e.id}')" title="Изменить">✎</button>`:''}
          </div>
        </div>
      `;
    });
  }
  
  html+=`
    <div class="add-task-bar">
      <button class="atb-btn" onclick="openTaskEditor()">+ Добавить дело</button>
    </div>
  `;
  
  root.innerHTML=html;
}

function schedSetDay(k){SCHED_DAY=k;renderSchedule();}

function markDone(id,isLecture){
  const day=SCHED_DAY;
  if(!DATA.tasks[day])DATA.tasks[day]={};
  const t=DATA.tasks[day][id]||{};

  if(t.done){
    // Уже отмечено — снимаем галочку
    t.done=false;
    addPoints(isLecture?-POINTS.lectureAttended:-POINTS.taskDone,'undo done',day);
  }else{
    // Если был пропуск — сначала отменяем его (возвращаем списанные баллы)
    if(t.skipped){
      t.skipped=false;
      addPoints(isLecture?Math.abs(POINTS.lectureSkipped):Math.abs(POINTS.taskSkipped),'undo skip',day);
    }
    // Ставим галочку
    t.done=true;
    addPoints(isLecture?POINTS.lectureAttended:POINTS.taskDone,'done',day);
  }

  DATA.tasks[day][id]=t;
  saveData();
  renderSchedule();
  updateTopBar();
}

function markSkip(id,isLecture){
  const day=SCHED_DAY;
  if(!DATA.tasks[day])DATA.tasks[day]={};
  const t=DATA.tasks[day][id]||{};

  if(t.skipped){
    // Уже пропущено — отменяем пропуск (возвращаем баллы)
    t.skipped=false;
    addPoints(isLecture?Math.abs(POINTS.lectureSkipped):Math.abs(POINTS.taskSkipped),'undo skip',day);
  }else{
    // Если было посещение — сначала отменяем его
    if(t.done){
      t.done=false;
      addPoints(isLecture?-POINTS.lectureAttended:-POINTS.taskDone,'undo done',day);
    }
    // Ставим пропуск
    t.skipped=true;
    addPoints(isLecture?POINTS.lectureSkipped:POINTS.taskSkipped,'skip',day);
    if(isLecture)showToast('Пара пропущена · '+POINTS.lectureSkipped+' баллов','bad');
  }

  DATA.tasks[day][id]=t;
  saveData();
  renderSchedule();
  updateTopBar();
}

function openTaskEditor(taskId){
  EDITING_TASK=taskId||null;
  EDITING_LECTURE=null;
  let task=null;
  if(taskId){
    task=DATA.tasks[SCHED_DAY]?DATA.tasks[SCHED_DAY][taskId]:null;
    if(!task){EDITING_TASK=null;return;}
  }
  SELECTED_TYPE=task?(task.type||'personal'):'personal';
  
  const types=TASK_TYPES.filter(t=>t.id!=='lecture');
  const typeBtns=types.map(t=>`
    <button class="type-btn${SELECTED_TYPE===t.id?' sel':''}" onclick="selectType('${t.id}')">
      <span class="type-dot" style="background:${t.color}"></span>${t.name}
    </button>
  `).join('');
  
  const html=`
    <div class="panel-head">
      <h2>${taskId?'Изменить дело':'Новое дело'}</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="field-grp">
        <label class="field-lbl">Название</label>
        <input class="field-inp" id="tf-name" placeholder="Что нужно сделать" value="${escHtml(task?task.name:'')}" maxlength="80"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Тип</label>
        <div class="type-grid" id="type-grid">${typeBtns}</div>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Время</label>
        <div class="time-row">
          <input class="field-inp" id="tf-start" type="time" value="${task?task.start||'':''}"/>
          <input class="field-inp" id="tf-end" type="time" value="${task?task.end||'':''}"/>
        </div>
        <div class="dur-row" id="dur-row">
          <button class="dur-btn" onclick="setDur(15)">15 мин</button>
          <button class="dur-btn" onclick="setDur(30)">30 мин</button>
          <button class="dur-btn" onclick="setDur(60)">1 час</button>
          <button class="dur-btn" onclick="setDur(90)">1.5 часа</button>
          <button class="dur-btn" onclick="setDur(120)">2 часа</button>
        </div>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Описание (необязательно)</label>
        <textarea class="field-inp" id="tf-desc" placeholder="Подробности, заметки">${escHtml(task?task.desc||'':'')}</textarea>
      </div>
    </div>
    <div class="panel-foot">
      ${taskId?'<button class="pf-delete" onclick="deleteTask()">Удалить</button>':''}
      <button class="pf-cancel" onclick="closeOverlay()">Отмена</button>
      <button class="pf-save" onclick="saveTask()">Сохранить</button>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

function selectType(t){SELECTED_TYPE=t;document.querySelectorAll('#type-grid .type-btn').forEach((b,i)=>{const types=TASK_TYPES.filter(x=>x.id!=='lecture');b.classList.toggle('sel',types[i].id===t);});}

function setDur(min){
  const startEl=document.getElementById('tf-start');
  if(!startEl.value){const now=new Date();startEl.value=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');}
  const sm=timeToMin(startEl.value);
  document.getElementById('tf-end').value=minToTime(sm+min);
  document.querySelectorAll('#dur-row .dur-btn').forEach(b=>b.classList.toggle('sel',b.textContent.includes(min===60?'1 час':min===90?'1.5':min===120?'2':min+' мин')));
}

function saveTask(){
  const name=document.getElementById('tf-name').value.trim();
  if(!name){showToast('Введи название','bad');return;}
  const start=document.getElementById('tf-start').value;
  const end=document.getElementById('tf-end').value;
  const desc=document.getElementById('tf-desc').value.trim();
  if(!DATA.tasks[SCHED_DAY])DATA.tasks[SCHED_DAY]={};
  const id=EDITING_TASK||('t_'+Date.now());
  const existing=DATA.tasks[SCHED_DAY][id]||{};
  DATA.tasks[SCHED_DAY][id]={
    ...existing,
    name,type:SELECTED_TYPE,start,end,desc,
    done:existing.done||false,
    skipped:existing.skipped||false,
  };
  saveData();
  closeOverlay();
  renderSchedule();
}

function editTask(id){openTaskEditor(id);}

function deleteTask(){
  if(!EDITING_TASK)return;
  if(!confirm('Удалить это дело?'))return;
  delete DATA.tasks[SCHED_DAY][EDITING_TASK];
  saveData();
  closeOverlay();
  renderSchedule();
}

function closeOverlay(){document.getElementById('overlay').classList.remove('open');EDITING_TASK=null;EDITING_LECTURE=null;}

const MOODS=[
  {e:'😔',l:'Плохо',v:1},
  {e:'😕',l:'Так себе',v:2},
  {e:'😐',l:'Норм',v:3},
  {e:'🙂',l:'Хорошо',v:4},
  {e:'😄',l:'Отлично',v:5},
];

function journalSetDay(k){
  if(JOURNAL_DAY){
    saveJournalDayInline();
  }
  JOURNAL_DAY=k;
  renderJournal();
}

function saveJournalDayInline(){
  if(!JOURNAL_DAY)return;
  ['q1','q2','q3','word','free'].forEach(f=>{
    const el=document.querySelector(`[data-q="${f}"]`)||(f==='word'?document.getElementById('j-word'):null)||(f==='free'?document.getElementById('journal-text'):null);
    if(el){
      if(!DATA.journalStruct[JOURNAL_DAY])DATA.journalStruct[JOURNAL_DAY]={};
      DATA.journalStruct[JOURNAL_DAY][f]=el.value.trim();
    }
  });
  saveData();
}

function setMood(v){
  DATA.moods[JOURNAL_DAY]=v;
  saveData();
  renderJournal();
}

function renderHabits(){
  const root=document.getElementById('ms-habits');
  const today=todayKey();
  const todayLog=DATA.habitLogs[today]||{};
  
  let html=`<div class="section-lbl">Сегодня · ${fmtDate(new Date())}</div>`;
  
  if(DATA.habits.length===0){
    html+=`<div class="empty-day">Привычек пока нет. Добавь свои ниже.</div>`;
  }else{
    DATA.habits.forEach(h=>{
      const done=!!todayLog[h.id];
      const streak=calcStreak(h.id);
      const streakStr=streak>0?(streak+(streak===1?' день':' дн')):'';
      html+=`
        <div class="habit-item${done?' done':''}" onclick="toggleHabit('${h.id}')">
          <div class="hcheck"><div class="hcheck-mark"></div></div>
          <div class="h-emoji">${h.emoji}</div>
          <div class="h-info">
            <div class="h-name">${escHtml(h.name)}</div>
            ${h.desc?`<div class="h-desc">${escHtml(h.desc)}</div>`:''}
          </div>
          ${streak>=3?`<div class="h-streak hot">🔥 ${streakStr}</div>`:streak>0?`<div class="h-streak">${streakStr}</div>`:''}
        </div>
      `;
    });
  }
  
  html+=`<div class="section-lbl" style="margin-top:24px">Управление привычками</div>`;
  
  DATA.habits.forEach((h,idx)=>{
    html+=`
      <div class="habit-manage" id="hm-${h.id}">
        <div class="hm-top">
          <div class="h-emoji">${h.emoji}</div>
          <div class="hm-info">
            <div class="hm-name">${escHtml(h.name)}</div>
            <div class="hm-meta">${escHtml(h.desc||'без описания')}</div>
          </div>
          <div class="hm-actions">
            <button class="icon-btn" onclick="toggleHabitEdit('${h.id}')">✎</button>
            <button class="icon-btn danger" onclick="deleteHabit('${h.id}')">×</button>
          </div>
        </div>
        <div class="hm-edit">
          <input class="field-inp" id="he-name-${h.id}" placeholder="Название" value="${escHtml(h.name)}"/>
          <input class="field-inp" id="he-desc-${h.id}" placeholder="Описание (необязательно)" value="${escHtml(h.desc||'')}"/>
          <div class="emoji-picker" id="he-emoji-${h.id}">
            ${HABIT_EMOJIS.map(e=>`<button class="ep-btn${e===h.emoji?' sel':''}" onclick="selectHabitEmoji('${h.id}','${e}')">${e}</button>`).join('')}
          </div>
          <div style="display:flex;gap:6px;">
            <button class="pf-cancel" onclick="toggleHabitEdit('${h.id}')">Отмена</button>
            <button class="pf-save" style="flex:2" onclick="saveHabitEdit('${h.id}')">Сохранить</button>
          </div>
        </div>
      </div>
    `;
  });
  
  html+=`
    <div class="add-habit">
      <div style="font-size:13px;font-weight:500;margin-bottom:10px;">Новая привычка</div>
      <div class="ah-row">
        <input class="ah-inp" id="new-habit-name" placeholder="Например: пить воду" maxlength="40"/>
      </div>
      <div class="ah-row">
        <input class="ah-inp" id="new-habit-desc" placeholder="Описание (необязательно)" maxlength="60"/>
      </div>
      <div class="emoji-picker" id="new-habit-emoji">
        ${HABIT_EMOJIS.map(e=>`<button class="ep-btn${e===SELECTED_EMOJI?' sel':''}" onclick="selectNewHabitEmoji('${e}')">${e}</button>`).join('')}
      </div>
      <button class="ah-add" onclick="addNewHabit()">Добавить привычку</button>
    </div>
  `;
  
  root.innerHTML=html;
}

function calcStreak(habitId){
  let streak=0;
  let d=new Date();
  const todayK=todayKey(d);
  const todayDone=DATA.habitLogs[todayK]&&DATA.habitLogs[todayK][habitId];
  if(!todayDone){
    d.setDate(d.getDate()-1);
  }
  while(true){
    const k=todayKey(d);
    if(DATA.habitLogs[k]&&DATA.habitLogs[k][habitId]){streak++;d.setDate(d.getDate()-1);}
    else break;
  }
  return streak;
}

function toggleHabit(id){
  const t=todayKey();
  if(!DATA.habitLogs[t])DATA.habitLogs[t]={};
  if(DATA.habitLogs[t][id]){
    DATA.habitLogs[t][id]=false;
    addPoints(-POINTS.habitDone,'habit undo');
  }else{
    DATA.habitLogs[t][id]=true;
    addPoints(POINTS.habitDone,'habit done');
  }
  saveData();
  renderHabits();
  updateTopBar();
}

function toggleHabitEdit(id){document.getElementById('hm-'+id).querySelector('.hm-edit').classList.toggle('open');}

function selectHabitEmoji(id,e){
  document.querySelectorAll('#he-emoji-'+id+' .ep-btn').forEach(b=>b.classList.toggle('sel',b.textContent===e));
  document.getElementById('hm-'+id).dataset.emoji=e;
}

function saveHabitEdit(id){
  const h=DATA.habits.find(x=>x.id===id);
  if(!h)return;
  h.name=document.getElementById('he-name-'+id).value.trim()||h.name;
  h.desc=document.getElementById('he-desc-'+id).value.trim();
  const newEmoji=document.getElementById('hm-'+id).dataset.emoji;
  if(newEmoji)h.emoji=newEmoji;
  saveData();
  renderHabits();
}

function deleteHabit(id){
  if(!confirm('Удалить привычку?'))return;
  DATA.habits=DATA.habits.filter(h=>h.id!==id);
  saveData();
  renderHabits();
}

function selectNewHabitEmoji(e){
  SELECTED_EMOJI=e;
  document.querySelectorAll('#new-habit-emoji .ep-btn').forEach(b=>b.classList.toggle('sel',b.textContent===e));
}

function addNewHabit(){
  const name=document.getElementById('new-habit-name').value.trim();
  if(!name){showToast('Введи название','bad');return;}
  const desc=document.getElementById('new-habit-desc').value.trim();
  DATA.habits.push({id:'h_'+Date.now(),name,desc,emoji:SELECTED_EMOJI});
  saveData();
  showToast('Привычка добавлена','good');
  renderHabits();
}

const DAY_NAMES=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];

function renderSettings(){
  const root=document.getElementById('ms-settings');
  const curTheme=document.documentElement.getAttribute('data-theme');
  
  let html=`
    <div class="section-lbl">Профиль</div>
    <div class="set-card">
      <div class="set-row">
        <div>
          <div class="set-label">Имя</div>
          <div class="set-desc">${escHtml(DATA.name)}</div>
        </div>
        <button class="icon-btn" onclick="editName()">Изменить</button>
      </div>
      <div class="set-row">
        <div>
          <div class="set-label">Тема</div>
          <div class="set-desc">Выбор оформления</div>
        </div>
        <div class="set-control">
          <button class="theme-btn${curTheme==='dark'?' active':''}" onclick="setTheme('dark')">Тёмная</button>
          <button class="theme-btn${curTheme==='light'?' active':''}" onclick="setTheme('light')">Светлая</button>
        </div>
      </div>
    </div>
    
    <div class="section-lbl">Расписание пар <button class="section-lbl-act" onclick="openLectureEditor()">+ Добавить</button></div>
  `;
  
  for(let dow=0;dow<7;dow++){
    const lectures=DATA.lectures[dow]||[];
    if(lectures.length===0)continue;
    html+=`<div style="font-size:11px;color:var(--muted);margin:14px 0 6px;font-weight:500;">${DAY_NAMES[dow]}</div>`;
    lectures.sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
    lectures.forEach(lec=>{
      html+=`
        <div class="lecture-card">
          <div class="lc-top">
            <div class="lc-time">${lec.start}<br>${lec.end}</div>
            <div class="lc-info">
              <div class="lc-name">${escHtml(lec.name)}</div>
              <div class="lc-meta">${escHtml([lec.room,lec.teacher].filter(Boolean).join(' · ')||'без деталей')}</div>
            </div>
            <div class="lc-actions">
              <button class="icon-btn" onclick="openLectureEditor(${dow},'${lec.id}')">✎</button>
              <button class="icon-btn danger" onclick="deleteLecture(${dow},'${lec.id}')">×</button>
            </div>
          </div>
        </div>
      `;
    });
  }
  
  if(Object.keys(DATA.lectures).every(d=>(DATA.lectures[d]||[]).length===0)){
    html+=`<div class="empty-day">Расписание пары не добавлены. Нажми «+ Добавить» сверху чтобы создать первую.</div>`;
  }
  
  html+=`
    <div class="section-lbl" style="margin-top:24px;">Уведомления</div>
    <div class="set-card">
      <div class="set-row">
        <div>
          <div class="set-label">Напоминания за 15 минут</div>
          <div class="set-desc">${Notification&&Notification.permission==='granted'?'Включены':Notification&&Notification.permission==='denied'?'Заблокированы в браузере':'Включи чтобы не пропускать пары и дела'}</div>
        </div>
        ${Notification&&Notification.permission==='granted'?'<span style="color:var(--good);font-size:11px;">✓</span>':`<button class="icon-btn" onclick="requestNotifPermission()">Включить</button>`}
      </div>
    </div>
    
    <div class="section-lbl" style="margin-top:24px;">Данные</div>
    <div class="set-card">
      <div class="set-row">
        <div>
          <div class="set-label">Экспорт</div>
          <div class="set-desc">Скачать всё в JSON</div>
        </div>
        <button class="icon-btn" onclick="exportData()">Скачать</button>
      </div>
      <div class="set-row">
        <div>
          <div class="set-label">Импорт</div>
          <div class="set-desc">Загрузить из файла JSON</div>
        </div>
        <button class="icon-btn" onclick="triggerImport()">Загрузить</button>
      </div>
      <div class="set-row">
        <div>
          <div class="set-label" style="color:var(--bad);">Сбросить всё</div>
          <div class="set-desc">Удалить все данные и начать заново</div>
        </div>
        <button class="icon-btn danger" onclick="resetUser()">Сбросить</button>
      </div>
    </div>
    
    <div class="section-lbl" style="margin-top:24px;">Система баллов</div>
    <div class="set-card">
      <div class="set-row"><div class="set-label">Вход в день</div><div style="color:var(--good);font-weight:500;">+${POINTS.login}</div></div>
      <div class="set-row"><div class="set-label">Посещение пары</div><div style="color:var(--good);font-weight:500;">+${POINTS.lectureAttended}</div></div>
      <div class="set-row"><div class="set-label">Прогул пары</div><div style="color:var(--bad);font-weight:500;">${POINTS.lectureSkipped}</div></div>
      <div class="set-row"><div class="set-label">Выполнено дело</div><div style="color:var(--good);font-weight:500;">+${POINTS.taskDone}</div></div>
      <div class="set-row"><div class="set-label">Пропущено дело</div><div style="color:var(--bad);font-weight:500;">${POINTS.taskSkipped}</div></div>
      <div class="set-row"><div class="set-label">Привычка</div><div style="color:var(--good);font-weight:500;">+${POINTS.habitDone}</div></div>
    </div>
    
    <div style="text-align:center;font-size:11px;color:var(--muted);margin-top:24px;">Tempo 2.2</div>
  `;
  
  root.innerHTML=html;
}

function editName(){
  const n=prompt('Новое имя:',DATA.name);
  if(n&&n.trim()){DATA.name=n.trim();saveData();renderSettings();}
}

function openLectureEditor(dow,lecId){
  EDITING_LECTURE={dow:dow!==undefined?dow:null,id:lecId||null};
  let lec={name:'',room:'',teacher:'',desc:'',start:'09:45',end:'11:20'};
  if(dow!==undefined&&lecId){
    const found=(DATA.lectures[dow]||[]).find(l=>l.id===lecId);
    if(found)lec={...found};
  }
  
  const dayBtns=DAY_NAMES.map((n,i)=>`<button class="type-btn${(dow!==undefined&&i===dow)||(dow===undefined&&i===0)?' sel':''}" data-dow="${i}" onclick="selectLecDay(${i})">${n.slice(0,2)}</button>`).join('');
  
  const html=`
    <div class="panel-head">
      <h2>${lecId?'Изменить пару':'Новая пара'}</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="field-grp">
        <label class="field-lbl">День недели</label>
        <div class="type-grid" id="lec-days" style="grid-template-columns:repeat(7,1fr);">${dayBtns}</div>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Название предмета</label>
        <input class="field-inp" id="lf-name" placeholder="Например: Математика" value="${escHtml(lec.name)}" maxlength="80"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Время</label>
        <div class="time-row">
          <input class="field-inp" id="lf-start" type="time" value="${lec.start}"/>
          <input class="field-inp" id="lf-end" type="time" value="${lec.end}"/>
        </div>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Аудитория</label>
        <input class="field-inp" id="lf-room" placeholder="247 ауд" value="${escHtml(lec.room||'')}" maxlength="40"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Преподаватель</label>
        <input class="field-inp" id="lf-teacher" placeholder="Иванов И.И." value="${escHtml(lec.teacher||'')}" maxlength="60"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Описание (необязательно)</label>
        <textarea class="field-inp" id="lf-desc" placeholder="Заметки">${escHtml(lec.desc||'')}</textarea>
      </div>
    </div>
    <div class="panel-foot">
      ${lecId?'<button class="pf-delete" onclick="deleteLectureFromEditor()">Удалить</button>':''}
      <button class="pf-cancel" onclick="closeOverlay()">Отмена</button>
      <button class="pf-save" onclick="saveLecture()">Сохранить</button>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

function selectLecDay(i){
  EDITING_LECTURE.dow=i;
  document.querySelectorAll('#lec-days .type-btn').forEach(b=>b.classList.toggle('sel',Number(b.dataset.dow)===i));
}

function saveLecture(){
  const dow=EDITING_LECTURE.dow!==null?EDITING_LECTURE.dow:0;
  const name=document.getElementById('lf-name').value.trim();
  if(!name){showToast('Введи название','bad');return;}
  const lec={
    id:EDITING_LECTURE.id||('l_'+Date.now()),
    name,
    start:document.getElementById('lf-start').value,
    end:document.getElementById('lf-end').value,
    room:document.getElementById('lf-room').value.trim(),
    teacher:document.getElementById('lf-teacher').value.trim(),
    desc:document.getElementById('lf-desc').value.trim(),
  };
  if(EDITING_LECTURE.id){
    for(let d=0;d<7;d++){
      if(DATA.lectures[d]){
        DATA.lectures[d]=DATA.lectures[d].filter(l=>l.id!==EDITING_LECTURE.id);
      }
    }
  }
  if(!DATA.lectures[dow])DATA.lectures[dow]=[];
  DATA.lectures[dow].push(lec);
  saveData();
  closeOverlay();
  renderSettings();
}

function deleteLecture(dow,id){
  if(!confirm('Удалить эту пару из расписания?'))return;
  DATA.lectures[dow]=(DATA.lectures[dow]||[]).filter(l=>l.id!==id);
  saveData();
  renderSettings();
}

function deleteLectureFromEditor(){
  if(!EDITING_LECTURE||!EDITING_LECTURE.id)return;
  if(!confirm('Удалить эту пару из расписания?'))return;
  for(let d=0;d<7;d++){
    if(DATA.lectures[d]){DATA.lectures[d]=DATA.lectures[d].filter(l=>l.id!==EDITING_LECTURE.id);}
  }
  saveData();
  closeOverlay();
  renderSettings();
}

function exportData(){
  const blob=new Blob([JSON.stringify(DATA,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='tempo-'+(DATA.name||'user').toLowerCase().replace(/\s+/g,'-')+'-'+todayKey()+'.json';
  a.click();
  URL.revokeObjectURL(url);
  DATA.lastExport=Date.now();
  saveData();
  showToast('Файл сохранён','good');
  if(CURRENT_SCREEN==='home')renderHome();
}

function triggerImport(){document.getElementById('import-file').click();}

document.getElementById('import-file').addEventListener('change',function(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(!d.name)throw new Error('not valid');
      DATA=migrateData(d);
      saveData();
      if(DATA.theme)setTheme(DATA.theme);
      showToast('Данные загружены','good');
      showScreen('returning');
      showReturning();
    }catch(err){
      showToast('Не удалось загрузить файл','bad');
    }
  };
  r.readAsText(f);
  e.target.value='';
});

// === ACHIEVEMENTS PANEL ===
function openAchievements(){
  const groups={};
  ACHIEVEMENTS.forEach(a=>{
    const g=a.group||'other';
    if(!groups[g])groups[g]=[];
    groups[g].push(a);
  });
  
  const total=ACHIEVEMENTS.length;
  const unlocked=Object.keys(DATA.achievements||{}).length;
  
  let html=`
    <div class="panel-head">
      <h2>Достижения</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="ach-summary">
        <div class="ach-sum-num">${unlocked}<span style="font-size:18px;color:var(--muted);">/${total}</span></div>
        <div class="ach-sum-info">
          <div class="ach-sum-lbl">Получено</div>
          <div style="font-size:13px;">${unlocked===0?'Ещё ни одного — впереди всё':unlocked===total?'Все собраны!':'Продолжай в том же духе'}</div>
          <div class="ach-sum-bar"><div class="ach-sum-fill" style="width:${(unlocked/total)*100}%"></div></div>
        </div>
      </div>
  `;
  
  Object.entries(ACH_GROUPS).forEach(([key,name])=>{
    const items=groups[key]||[];
    if(items.length===0)return;
    html+=`<div class="section-lbl" style="margin-top:14px;">${name}</div><div class="ach-grid">`;
    items.forEach(a=>{
      const got=DATA.achievements[a.id];
      const cls=got?'unlocked':'locked';
      const prog=a.prog?a.prog(DATA):0;
      const date=got?new Date(got.unlockedAt):null;
      const dateStr=date?(date.getDate()+' '+fmtMonth(date)):'';
      html+=`
        <div class="ach-card ${cls}">
          <div class="ach-icon">${a.icon}</div>
          <div class="ach-info">
            <div class="ach-title">${escHtml(a.title)}</div>
            <div class="ach-desc">${escHtml(a.desc)}</div>
            ${!got&&a.prog?`<div class="ach-prog"><div class="ach-prog-fill" style="width:${prog*100}%"></div></div>`:''}
            ${got?`<div class="ach-meta">Получено · ${dateStr}</div>`:''}
          </div>
        </div>
      `;
    });
    html+=`</div>`;
  });
  
  html+=`</div>`;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

// === STATS ===
let STATS_PERIOD='week';

function renderStats(){
  const root=document.getElementById('ms-stats');
  const periods=[
    {id:'week',name:'Неделя',days:7},
    {id:'month',name:'Месяц',days:30},
    {id:'3month',name:'3 мес',days:90},
    {id:'6month',name:'6 мес',days:180},
    {id:'year',name:'Год',days:365},
  ];
  const period=periods.find(p=>p.id===STATS_PERIOD)||periods[0];
  
  let html=`<div class="period-tabs">`;
  periods.forEach(p=>{
    html+=`<button class="pt-btn${STATS_PERIOD===p.id?' active':''}" onclick="setStatsPeriod('${p.id}')">${p.name}</button>`;
  });
  html+=`</div>`;
  
  const today=new Date();
  const days=[];
  for(let i=period.days-1;i>=0;i--){
    const d=new Date(today);d.setDate(today.getDate()-i);
    days.push(todayKey(d));
  }
  const prevDays=[];
  for(let i=period.days*2-1;i>=period.days;i--){
    const d=new Date(today);d.setDate(today.getDate()-i);
    prevDays.push(todayKey(d));
  }
  
  const ptsCur=days.reduce((a,k)=>a+getDayPoints(k),0);
  const ptsPrev=prevDays.reduce((a,k)=>a+getDayPoints(k),0);
  const ptsTrend=trendOf(ptsCur,ptsPrev);
  
  let lecAtt=0,lecSkip=0;
  days.forEach(k=>{Object.entries((DATA.tasks[k]||{})).forEach(([tk,t])=>{if(tk.startsWith('lec_')){if(t.done)lecAtt++;if(t.skipped)lecSkip++;}});});
  let lecAttPrev=0,lecSkipPrev=0;
  prevDays.forEach(k=>{Object.entries((DATA.tasks[k]||{})).forEach(([tk,t])=>{if(tk.startsWith('lec_')){if(t.done)lecAttPrev++;if(t.skipped)lecSkipPrev++;}});});
  const lecTotal=lecAtt+lecSkip;
  const lecPct=lecTotal?Math.round((lecAtt/lecTotal)*100):0;
  const lecTotalPrev=lecAttPrev+lecSkipPrev;
  const lecPctPrev=lecTotalPrev?Math.round((lecAttPrev/lecTotalPrev)*100):0;
  const lecTrend=trendOf(lecPct,lecPctPrev);
  
  let tasksDone=0;
  days.forEach(k=>{Object.entries((DATA.tasks[k]||{})).forEach(([tk,t])=>{if(!tk.startsWith('lec_')&&t.done)tasksDone++;});});
  let tasksDonePrev=0;
  prevDays.forEach(k=>{Object.entries((DATA.tasks[k]||{})).forEach(([tk,t])=>{if(!tk.startsWith('lec_')&&t.done)tasksDonePrev++;});});
  const tasksTrend=trendOf(tasksDone,tasksDonePrev);
  
  let habitsDone=0;
  days.forEach(k=>{const dd=DATA.habitLogs[k]||{};Object.values(dd).forEach(v=>{if(v)habitsDone++;});});
  let habitsDonePrev=0;
  prevDays.forEach(k=>{const dd=DATA.habitLogs[k]||{};Object.values(dd).forEach(v=>{if(v)habitsDonePrev++;});});
  const habitsTrend=trendOf(habitsDone,habitsDonePrev);
  
  // Sparkline data — points per day
  const ptsData=days.map(k=>getDayPoints(k));
  
  html+=`
    <div class="stat-block">
      <div class="sb-head">
        <span class="sb-title">Баллы за период</span>
        ${trendBadge(ptsTrend)}
      </div>
      <div class="sb-main">${ptsCur>=0?'+':''}${ptsCur}</div>
      <div class="sb-sub">было ${ptsPrev>=0?'+':''}${ptsPrev} в прошлом периоде</div>
      <div class="chart-wrap">${renderLineChart(ptsData,period.days<=30?days.map(k=>dateFromKey(k).getDate()):null)}</div>
    </div>
    
    <div class="stat-block">
      <div class="sb-head">
        <span class="sb-title">Посещаемость пар</span>
        ${trendBadge(lecTrend)}
      </div>
      <div class="donut-row">
        ${renderDonut(lecPct)}
        <div class="donut-info">
          <div class="donut-pct">${lecPct}%</div>
          <div class="donut-meta">Посещено ${lecAtt} из ${lecTotal||'—'}<br>Прогулов: ${lecSkip}</div>
        </div>
      </div>
    </div>
    
    <div class="stat-block">
      <div class="sb-head"><span class="sb-title">Привычки и дела</span></div>
      <div class="records-grid">
        <div class="record-cell">
          <div class="record-val">${habitsDone}</div>
          <div class="record-lbl">Привычек ${trendArrow(habitsTrend)}</div>
        </div>
        <div class="record-cell">
          <div class="record-val">${tasksDone}</div>
          <div class="record-lbl">Дел ${trendArrow(tasksTrend)}</div>
        </div>
      </div>
    </div>
    
    <div class="stat-block">
      <div class="sb-head"><span class="sb-title">Рекорды (за всё время)</span></div>
      <div class="records-grid">
        <div class="record-cell">
          <div class="record-val">${DATA.longestStreak||0}</div>
          <div class="record-lbl">Лучшая серия</div>
        </div>
        <div class="record-cell">
          <div class="record-val">${maxHabitStreak(DATA)}</div>
          <div class="record-lbl">Стрик привычки</div>
        </div>
        <div class="record-cell">
          <div class="record-val">${bestDayPoints()}</div>
          <div class="record-lbl">Лучший день</div>
        </div>
        <div class="record-cell">
          <div class="record-val">${Object.keys(DATA.achievements||{}).length}/${ACHIEVEMENTS.length}</div>
          <div class="record-lbl">Достижений</div>
        </div>
      </div>
    </div>
  `;
  
  root.innerHTML=html;
}

function setStatsPeriod(p){STATS_PERIOD=p;renderStats();}

function trendOf(cur,prev){
  if(prev===0&&cur===0)return{kind:'flat',pct:0};
  if(prev===0)return cur>0?{kind:'up',pct:100}:{kind:'down',pct:100};
  const diff=cur-prev;
  const pct=Math.round((Math.abs(diff)/Math.abs(prev))*100);
  if(Math.abs(diff)<0.001)return{kind:'flat',pct:0};
  return{kind:diff>0?'up':'down',pct};
}

function trendBadge(t){
  if(t.kind==='flat')return`<span class="sb-trend flat">— без изменений</span>`;
  const sym=t.kind==='up'?'↑':'↓';
  return`<span class="sb-trend ${t.kind}">${sym} ${t.pct}%</span>`;
}

function trendArrow(t){
  if(t.kind==='flat')return`<span style="color:var(--muted);">—</span>`;
  return`<span style="color:var(--${t.kind==='up'?'good':'bad'});">${t.kind==='up'?'↑':'↓'}</span>`;
}

function bestDayPoints(){let best=0;Object.entries(DATA.pointsLog||{}).forEach(([k,l])=>{const p=l.pos-l.neg;if(p>best)best=p;});return best;}

function renderLineChart(values,labels){
  if(values.length===0)return'';
  const w=300,h=110,pad=14;
  const min=Math.min(0,...values),max=Math.max(0,...values,1);
  const range=max-min||1;
  const n=values.length;
  const pts=values.map((v,i)=>{
    const x=pad+((w-pad*2)*(n===1?0.5:i/(n-1)));
    const y=h-pad-((v-min)/range)*(h-pad*2);
    return[x,y];
  });
  const linePath=pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const areaPath=linePath+' L'+pts[pts.length-1][0].toFixed(1)+','+(h-pad)+' L'+pts[0][0].toFixed(1)+','+(h-pad)+' Z';
  const zeroY=h-pad-((0-min)/range)*(h-pad*2);
  let svg=`<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
  svg+=`<line class="chart-grid" x1="${pad}" y1="${zeroY}" x2="${w-pad}" y2="${zeroY}" stroke-dasharray="2,2"/>`;
  svg+=`<path class="chart-area" d="${areaPath}"/>`;
  svg+=`<path class="chart-line" d="${linePath}"/>`;
  if(n<=14){pts.forEach(p=>{svg+=`<circle class="chart-dot" cx="${p[0]}" cy="${p[1]}" r="2.5"/>`;});}
  svg+=`</svg>`;
  return svg;
}

function renderDonut(pct){
  const r=32,c=2*Math.PI*r;
  const dash=(pct/100)*c;
  return`<svg class="donut-svg" viewBox="0 0 80 80"><circle class="donut-bg" cx="40" cy="40" r="${r}"/><circle class="donut-fg" cx="40" cy="40" r="${r}" stroke-dasharray="${dash} ${c}"/></svg>`;
}

// === CHALLENGES ===
function renderChallenges(){
  const root=document.getElementById('ms-challenges');
  const active=DATA.challenges.filter(c=>!c.completed&&!c.failed);
  const archive=DATA.challenges.filter(c=>c.completed||c.failed);
  
  let html=`<div class="section-lbl">Активные челленджи</div>`;
  
  if(active.length===0){
    html+=`<div class="empty-day" style="margin-bottom:10px;">Челленджей пока нет. Создай первый — выбери что хочешь держать N дней подряд.</div>`;
  }else{
    active.forEach(c=>{
      const stats=challengeStats(c);
      html+=renderChallengeCard(c,stats);
    });
  }
  
  html+=`<button class="ch-add" onclick="openChallengeEditor()">+ Создать челлендж</button>`;
  
  if(archive.length>0){
    html+=`<div class="ch-archive-section"><div class="section-lbl">Архив</div>`;
    archive.slice().reverse().forEach(c=>{
      const result=c.completed?'completed':'failed';
      const txt=c.completed?'Завершён':('Сорвался на дне '+(c.failedDay||'—'));
      html+=`
        <div class="ch-arch-card">
          <div class="ch-arch-info">
            <div class="ch-arch-name">${escHtml(c.name)}</div>
            <div class="ch-arch-result ${result}">${txt} · ${c.duration} дней</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="icon-btn" onclick="restoreChallenge('${c.id}')" title="Начать заново">↻</button>
            <button class="icon-btn danger" onclick="deleteChallengePermanent('${c.id}')" title="Удалить навсегда">×</button>
          </div>
        </div>
      `;
    });
    html+=`</div>`;
  }
  
  root.innerHTML=html;
}

function challengeStats(c){
  const start=dateFromKey(c.startDate);
  const today=new Date();today.setHours(0,0,0,0);start.setHours(0,0,0,0);
  const dayNum=Math.floor((today-start)/86400000)+1;
  const days=Math.max(1,Math.min(c.duration,dayNum));
  const todayK=todayKey();
  const markedToday=(c.marks||{})[todayK];
  return{dayNum,days,markedToday,daysCompleted:Object.values(c.marks||{}).filter(v=>v).length};
}

function getMilestoneText(c,stats){
  const d=stats.dayNum;
  if(d===1)return'Первый день. Самое сложное — начать. Это уже сделано.';
  if(d===2)return'Второй день. Уже не случайность — это намерение.';
  if(d===3)return'Три дня. Мозг начинает перестраиваться.';
  if(d===5)return'Пять дней. Уже виден характер.';
  if(d===7)return'Неделя. Это уже не эксперимент — это решение.';
  if(d===10)return'Десять дней. Каждый следующий — по инерции легче.';
  if(d===14)return'Две недели. Большинство сходит в этой точке. Ты — нет.';
  if(d===21)return'Двадцать один день. Говорят за это время формируется привычка. Ты дошёл.';
  if(d===30)return'Месяц! Это уже часть тебя.';
  if(d===50)return'Пятьдесят дней. Серьёзно.';
  if(d===100)return'Сто дней. Ты вошёл в редкий клуб.';
  if(d>=c.duration)return'Челлендж завершён. Отметь финал.';
  return null;
}

function renderChallengeCard(c,stats){
  const pct=(stats.daysCompleted/c.duration)*100;
  const milestone=getMilestoneText(c,stats);
  const isComplete=stats.daysCompleted>=c.duration;
  const todayK=todayKey();
  const markedToday=stats.markedToday;
  
  return`
    <div class="ch-card${isComplete?' completed':''}">
      <div class="ch-head">
        <div class="ch-name">${escHtml(c.name)}</div>
        <div class="ch-days-pill">${stats.daysCompleted}/${c.duration} дней</div>
      </div>
      ${c.desc?`<div class="ch-desc">${escHtml(c.desc)}</div>`:''}
      <div class="ch-progress"><div class="ch-progress-fill" style="width:${pct}%"></div></div>
      <div class="ch-progress-row">
        <span>День ${stats.dayNum} из ${c.duration}</span>
        <span>${Math.round(pct)}%</span>
      </div>
      ${milestone?`<div class="ch-milestone">${escHtml(milestone)}</div>`:''}
      ${isComplete?`
        <div class="ch-actions">
          <button class="ch-mark-btn" onclick="completeChallenge('${c.id}')">Завершить челлендж</button>
          <button class="ch-fail-btn" onclick="deleteChallengePermanent('${c.id}')" title="Удалить">×</button>
        </div>
      `:`
        <div class="ch-actions">
          <button class="ch-mark-btn ${markedToday?'done':''}" onclick="markChallengeDay('${c.id}')">${markedToday?'✓ Сегодня держусь':'Отметить сегодня'}</button>
          <button class="ch-fail-btn" onclick="failChallenge('${c.id}')" title="Сорвался">⚠</button>
          <button class="ch-fail-btn" onclick="deleteChallengePermanent('${c.id}')" title="Удалить">×</button>
        </div>
      `}
    </div>
  `;
}

function openChallengeEditor(){
  const html=`
    <div class="panel-head">
      <h2>Новый челлендж</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="field-grp">
        <label class="field-lbl">Что держим</label>
        <input class="field-inp" id="cf-name" placeholder="Например: не ем сахар" maxlength="60"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Описание (необязательно)</label>
        <textarea class="field-inp" id="cf-desc" placeholder="Подробнее — что считается срывом, какие условия"></textarea>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Срок</label>
        <div class="duration-grid" id="dur-grid">
          <button class="dur-card-btn" data-d="3" onclick="selectDur(3)"><span class="dur-card-num">3</span><span class="dur-card-lbl">дня</span></button>
          <button class="dur-card-btn sel" data-d="7" onclick="selectDur(7)"><span class="dur-card-num">7</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="14" onclick="selectDur(14)"><span class="dur-card-num">14</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="21" onclick="selectDur(21)"><span class="dur-card-num">21</span><span class="dur-card-lbl">день</span></button>
          <button class="dur-card-btn" data-d="30" onclick="selectDur(30)"><span class="dur-card-num">30</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="60" onclick="selectDur(60)"><span class="dur-card-num">60</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="90" onclick="selectDur(90)"><span class="dur-card-num">90</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="100" onclick="selectDur(100)"><span class="dur-card-num">100</span><span class="dur-card-lbl">дней</span></button>
        </div>
      </div>
    </div>
    <div class="panel-foot">
      <button class="pf-cancel" onclick="closeOverlay()">Отмена</button>
      <button class="pf-save" onclick="createChallenge()">Создать</button>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
  window._chDur=7;
}

function selectDur(d){
  window._chDur=d;
  document.querySelectorAll('#dur-grid .dur-card-btn').forEach(b=>b.classList.toggle('sel',Number(b.dataset.d)===d));
}

function createChallenge(){
  const name=document.getElementById('cf-name').value.trim();
  if(!name){showToast('Введи название','bad');return;}
  const desc=document.getElementById('cf-desc').value.trim();
  const dur=window._chDur||7;
  const c={
    id:'c_'+Date.now(),
    name,desc,duration:dur,
    startDate:todayKey(),
    marks:{},
    created:Date.now(),
    completed:false,
    failed:false,
  };
  DATA.challenges.push(c);
  saveData();
  closeOverlay();
  renderChallenges();
  showToast('Челлендж создан · Удачи','good');
}

function markChallengeDay(id){
  const c=DATA.challenges.find(x=>x.id===id);
  if(!c)return;
  const k=todayKey();
  if(!c.marks)c.marks={};
  c.marks[k]=!c.marks[k];
  saveData();
  renderChallenges();
  if(c.marks[k]){
    const stats=challengeStats(c);
    if(stats.daysCompleted>=c.duration){showToast('Челлендж пройден!','good');}
  }
}

function failChallenge(id){
  if(!confirm('Отметить как сорванный? Челлендж уйдёт в архив, можно начать заново.'))return;
  const c=DATA.challenges.find(x=>x.id===id);
  if(!c)return;
  c.failed=true;
  c.failedDay=challengeStats(c).dayNum;
  c.endedAt=Date.now();
  saveData();
  renderChallenges();
}

function completeChallenge(id){
  const c=DATA.challenges.find(x=>x.id===id);
  if(!c)return;
  c.completed=true;
  c.endedAt=Date.now();
  saveData();
  checkAchievements();
  renderChallenges();
  showToast('Челлендж завершён · Молодец','good');
}

function restoreChallenge(id){
  if(!confirm('Восстановить челлендж и начать заново с сегодня?'))return;
  const c=DATA.challenges.find(x=>x.id===id);
  if(!c)return;
  c.completed=false;
  c.failed=false;
  c.failedDay=null;
  c.startDate=todayKey();
  c.marks={};
  saveData();
  renderChallenges();
}

function deleteChallengePermanent(id){
  if(!confirm('Удалить челлендж навсегда? Это действие нельзя отменить.'))return;
  DATA.challenges=DATA.challenges.filter(c=>c.id!==id);
  saveData();
  renderChallenges();
  showToast('Челлендж удалён');
}

// === JOURNAL REDESIGNED ===
const J_QUESTIONS=[
  ['Что сегодня получилось?','Что было сложно?','Что хочешь сделать иначе завтра?'],
  ['Чем гордишься сегодня?','Что отвлекало?','За что благодарен?'],
  ['Какой момент дня самый яркий?','Где сегодня застрял?','Что нового узнал?'],
  ['Что прибавило энергии?','Что её забрало?','Что унесёшь из этого дня?'],
  ['Если бы повторить день — что изменил бы?','Что удивило?','Что сейчас на душе?'],
  ['Чем сегодня помог себе?','Где был не в моменте?','Чего ждёшь завтра?'],
  ['Что сегодня далось легче чем обычно?','Что тяжелее?','Какая мысль крутится в голове?'],
];

function getQuestionsForDay(key){
  const d=dateFromKey(key);
  const idx=(d.getFullYear()*1000+d.getMonth()*32+d.getDate())%J_QUESTIONS.length;
  return J_QUESTIONS[idx];
}

function renderJournal(){
  if(!JOURNAL_DAY)JOURNAL_DAY=todayKey();
  const root=document.getElementById('ms-journal');
  const struct=DATA.journalStruct[JOURNAL_DAY]||{q1:'',q2:'',q3:'',word:'',planned:null,free:''};
  const oldEntry=DATA.journal[JOURNAL_DAY]||'';
  const finalFree=struct.free||oldEntry;
  const mood=DATA.moods[JOURNAL_DAY]||0;
  const questions=getQuestionsForDay(JOURNAL_DAY);
  
  let moodHtml='<div class="mood-row">';
  MOODS.forEach(m=>{
    moodHtml+=`<button class="mood-btn${mood===m.v?' sel':''}" onclick="setMood(${m.v})"><span class="mood-e">${m.e}</span><span class="mood-l">${m.l}</span></button>`;
  });
  moodHtml+='</div>';
  
  let html=renderDayNav(JOURNAL_DAY,'journalSetDay')+renderWeekStrip(JOURNAL_DAY,'journalSetDay');
  
  html+=`
    <div class="section-lbl">Поиск по записям <button class="section-lbl-act" onclick="toggleJournalSearch()">${SHOW_J_SEARCH?'Скрыть':'Открыть'}</button></div>
    <div id="j-search-box" style="display:${SHOW_J_SEARCH?'block':'none'};" class="j-search-row">
      <input class="j-search-inp" id="j-search-input" placeholder="Найти слово или фразу..." oninput="searchJournal()"/>
      <div class="j-search-results" id="j-search-results"></div>
    </div>
    
    <div class="section-lbl">Настроение</div>
    ${moodHtml}
    
    <div class="section-lbl">Слово дня</div>
    <input class="j-word-input" id="j-word" placeholder="Одно слово описывающее день..." value="${escHtml(struct.word||'')}" maxlength="30" onblur="saveJournalField('word',this.value)"/>
    
    <div class="section-lbl">План дня</div>
    <div class="j-checks-row">
      <button class="j-check-card${struct.planned===true?' sel':''}" onclick="setPlanned(true)">
        <div class="j-check-lbl">План на день</div>
        <div class="j-check-val">✓ Получился</div>
      </button>
      <button class="j-check-card${struct.planned===false?' sel':''}" onclick="setPlanned(false)">
        <div class="j-check-lbl">План на день</div>
        <div class="j-check-val">× Не очень</div>
      </button>
    </div>
    
    <div class="section-lbl">Три вопроса</div>
    <div class="j-question-card">
      <div class="j-q-text">${questions[0]}</div>
      <textarea class="j-q-input" data-q="q1" onblur="saveJournalField('q1',this.value)" placeholder="Можно одной строкой">${escHtml(struct.q1||'')}</textarea>
    </div>
    <div class="j-question-card">
      <div class="j-q-text">${questions[1]}</div>
      <textarea class="j-q-input" data-q="q2" onblur="saveJournalField('q2',this.value)" placeholder="Можно одной строкой">${escHtml(struct.q2||'')}</textarea>
    </div>
    <div class="j-question-card">
      <div class="j-q-text">${questions[2]}</div>
      <textarea class="j-q-input" data-q="q3" onblur="saveJournalField('q3',this.value)" placeholder="Можно одной строкой">${escHtml(struct.q3||'')}</textarea>
    </div>
    
    <div class="section-lbl">Свободная запись</div>
    <textarea class="journal-area" id="journal-text" onblur="saveJournalField('free',this.value)" placeholder="Если хочется написать что-то ещё...">${escHtml(finalFree)}</textarea>
    <div class="journal-save-row">
      <span class="journal-saved" id="journal-saved"></span>
      <button class="journal-btn" onclick="saveJournalAll()">Сохранить</button>
    </div>
  `;
  
  root.innerHTML=html;
}

let SHOW_J_SEARCH=false;
function toggleJournalSearch(){SHOW_J_SEARCH=!SHOW_J_SEARCH;renderJournal();if(SHOW_J_SEARCH)setTimeout(()=>{const el=document.getElementById('j-search-input');if(el)el.focus();},100);}

function searchJournal(){
  const q=document.getElementById('j-search-input').value.trim().toLowerCase();
  const out=document.getElementById('j-search-results');
  if(!q){out.innerHTML='';return;}
  const results=[];
  Object.entries(DATA.journalStruct||{}).forEach(([k,v])=>{
    const all=[v.q1,v.q2,v.q3,v.word,v.free].filter(Boolean).join(' ');
    if(all.toLowerCase().includes(q))results.push({key:k,text:all});
  });
  Object.entries(DATA.journal||{}).forEach(([k,v])=>{
    if(DATA.journalStruct&&DATA.journalStruct[k])return;
    if((v||'').toLowerCase().includes(q))results.push({key:k,text:v});
  });
  results.sort((a,b)=>b.key.localeCompare(a.key));
  if(results.length===0){out.innerHTML='<div style="font-size:12px;color:var(--muted);padding:10px;">Не найдено</div>';return;}
  let html='';
  results.slice(0,15).forEach(r=>{
    const d=dateFromKey(r.key);
    const dateStr=fmtDayName(d)+', '+fmtDate(d);
    const idx=r.text.toLowerCase().indexOf(q);
    const start=Math.max(0,idx-30);
    const snip=(start>0?'…':'')+r.text.slice(start,start+90)+(r.text.length>start+90?'…':'');
    html+=`<div class="j-result-card" onclick="jumpToJournal('${r.key}')"><div class="j-result-date">${dateStr}</div><div class="j-result-snippet">${escHtml(snip)}</div></div>`;
  });
  out.innerHTML=html;
}

function jumpToJournal(k){JOURNAL_DAY=k;SHOW_J_SEARCH=false;renderJournal();}

function saveJournalField(field,val){
  if(!DATA.journalStruct[JOURNAL_DAY])DATA.journalStruct[JOURNAL_DAY]={};
  DATA.journalStruct[JOURNAL_DAY][field]=val.trim();
  saveData();
  checkAchievements();
}

function setPlanned(v){
  if(!DATA.journalStruct[JOURNAL_DAY])DATA.journalStruct[JOURNAL_DAY]={};
  DATA.journalStruct[JOURNAL_DAY].planned=DATA.journalStruct[JOURNAL_DAY].planned===v?null:v;
  saveData();
  renderJournal();
}

function saveJournalAll(){
  ['q1','q2','q3','word','free'].forEach(f=>{
    const el=document.querySelector(`[data-q="${f}"]`)||(f==='word'?document.getElementById('j-word'):null)||(f==='free'?document.getElementById('journal-text'):null);
    if(el){
      if(!DATA.journalStruct[JOURNAL_DAY])DATA.journalStruct[JOURNAL_DAY]={};
      DATA.journalStruct[JOURNAL_DAY][f]=el.value.trim();
    }
  });
  saveData();
  checkAchievements();
  const e=document.getElementById('journal-saved');
  e.textContent='Сохранено';
  e.className='journal-saved show';
  setTimeout(()=>{e.textContent='';e.className='journal-saved';},1500);
}

// === WEEKLY SUMMARY ===
function maybeShowWeeklySummary(){
  const now=new Date();
  const isSunday=now.getDay()===0;
  if(!isSunday)return;
  const weekKey=todayKey();
  if(DATA.weeklySummaryShown&&DATA.weeklySummaryShown[weekKey])return;
  showWeeklySummary();
  DATA.weeklySummaryShown[weekKey]=true;
  saveData();
}

function showWeeklySummary(){
  const today=new Date();
  const days=[],prevDays=[];
  for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);days.push(todayKey(d));}
  for(let i=13;i>=7;i--){const d=new Date(today);d.setDate(today.getDate()-i);prevDays.push(todayKey(d));}
  
  const ptsCur=days.reduce((a,k)=>a+getDayPoints(k),0);
  const ptsPrev=prevDays.reduce((a,k)=>a+getDayPoints(k),0);
  
  let lecAtt=0,lecSkip=0,tasksDone=0,habitsDone=0;
  days.forEach(k=>{
    Object.entries(DATA.tasks[k]||{}).forEach(([tk,t])=>{
      if(tk.startsWith('lec_')){if(t.done)lecAtt++;if(t.skipped)lecSkip++;}
      else if(t.done)tasksDone++;
    });
    Object.values(DATA.habitLogs[k]||{}).forEach(v=>{if(v)habitsDone++;});
  });
  
  const ptsTrend=trendOf(ptsCur,ptsPrev);
  
  const quotes=[
    'Неделя сложилась так как сложилась — это уже факт. Что важно — что ты возвращаешься.',
    'Каждая неделя — это маленькая жизнь. Эта закончилась, начинается новая.',
    'Не сравнивай себя со вчерашним. Сравнивай только с тем кем ты не хочешь быть.',
    'Прогресс не линейный. Иногда стоишь — это тоже путь.',
    'Главное не скорость, а направление. Ты идёшь куда нужно.',
  ];
  const quote=quotes[Math.floor(Math.random()*quotes.length)];
  
  const html=`
    <div class="panel-head">
      <h2>Итоги недели</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="summary-wrap">
        <div class="summary-mark">воскресенье</div>
        <div class="summary-title">Неделя позади</div>
        <div class="summary-sub">Вот как она прошла — без оценок, просто факты.</div>
        
        <div class="summary-block">
          <div class="summary-row">
            <span class="summary-lbl">Баллы за неделю</span>
            <span><span class="summary-val">${ptsCur>=0?'+':''}${ptsCur}</span><span class="summary-trend ${ptsTrend.kind}">${ptsTrend.kind==='up'?'↑':ptsTrend.kind==='down'?'↓':'—'} ${ptsTrend.kind==='flat'?'':ptsTrend.pct+'%'}</span></span>
          </div>
        </div>
        
        <div class="summary-block">
          <div class="summary-row"><span class="summary-lbl">Пары посещены</span><span class="summary-val">${lecAtt}</span></div>
          <div class="summary-row" style="margin-top:6px;"><span class="summary-lbl">Прогулов</span><span class="summary-val" style="color:${lecSkip>0?'var(--bad)':'var(--text)'};">${lecSkip}</span></div>
        </div>
        
        <div class="summary-block">
          <div class="summary-row"><span class="summary-lbl">Дел сделано</span><span class="summary-val">${tasksDone}</span></div>
          <div class="summary-row" style="margin-top:6px;"><span class="summary-lbl">Привычек закрыто</span><span class="summary-val">${habitsDone}</span></div>
        </div>
        
        <div class="summary-quote">${quote}</div>
        
        <button class="ret-btn" onclick="closeOverlay()">К новой неделе</button>
      </div>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

// === NOTIFICATIONS ===
let NOTIF_TIMER=null;
function setupNotifications(){
  if(!('Notification'in window))return;
  if(Notification.permission==='granted'){startNotificationLoop();}
}

function requestNotifPermission(){
  if(!('Notification'in window)){showToast('Уведомления не поддерживаются','bad');return;}
  Notification.requestPermission().then(p=>{
    DATA.notifPerm=p;
    saveData();
    renderSettings();
    if(p==='granted'){
      showToast('Уведомления включены','good');
      startNotificationLoop();
    }
  });
}

function startNotificationLoop(){
  if(NOTIF_TIMER)clearInterval(NOTIF_TIMER);
  const sentKey='tempo_notif_sent';
  NOTIF_TIMER=setInterval(()=>{
    if(Notification.permission!=='granted')return;
    const now=new Date();
    const todayK=todayKey();
    const events=getDayEvents(todayK);
    const nowMin=now.getHours()*60+now.getMinutes();
    const sent=JSON.parse(sessionStorage.getItem(sentKey)||'{}');
    events.forEach(e=>{
      if(!e.start||e.done||e.skipped)return;
      const s=timeToMin(e.start);
      const diff=s-nowMin;
      if(diff>=14&&diff<=16&&!sent[todayK+'_'+e.id]){
        new Notification('Через 15 минут: '+e.name,{body:e.meta||typeName(e.type),icon:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iIzY1OTkyMiIvPjwvc3ZnPg=='});
        sent[todayK+'_'+e.id]=true;
        sessionStorage.setItem(sentKey,JSON.stringify(sent));
      }
    });
  },60000);
}

// === ONBOARDING ===
const ONB_STEPS=4;
let onbStep=0;
let onbSelectedHabits=[];
let onbLastExport=null;

const ONB_HABIT_SUGGESTIONS=[
  {emoji:'☀',name:'Подъём вовремя',desc:'Вставать в одно и то же время'},
  {emoji:'🚶',name:'Прогулка',desc:'Хотя бы 20 минут на улице'},
  {emoji:'📖',name:'Чтение',desc:'10–15 страниц в день'},
  {emoji:'💧',name:'Вода',desc:'8 стаканов воды в день'},
  {emoji:'💻',name:'Программирование',desc:'Практика каждый день'},
  {emoji:'🌍',name:'Иностранный язык',desc:'15 минут изучения'},
  {emoji:'🎵',name:'Музыка',desc:'Заниматься инструментом или DAW'},
  {emoji:'💪',name:'Спорт',desc:'Физическая активность'},
];

function startOnboarding(){
  onbStep=0;
  onbSelectedHabits=[];
  showScreen('onboarding');
  renderOnbStep();
}

function renderOnbStep(){
  const box=document.getElementById('onb-box');
  const dots=Array.from({length:ONB_STEPS},(_,i)=>`<div class="onb-dot${i===onbStep?' active':''}"></div>`).join('');

  if(onbStep===0){
    box.innerHTML=`
      <div class="onb-step-dots">${dots}</div>
      <div class="onb-icon">👋</div>
      <div class="onb-title">Привет, ${escHtml(DATA.name)}!</div>
      <div class="onb-sub">Tempo — это планер, дневник и трекер привычек в одном. Давай быстро настроим всё под тебя — займёт меньше минуты.</div>
      <button class="wb-primary onb-action" onclick="onbNext()">Начать настройку</button>
      <button class="onb-skip" onclick="onbFinish()">Пропустить</button>
    `;
  }else if(onbStep===1){
    const btns=ONB_HABIT_SUGGESTIONS.map(h=>`
      <button class="oqh-btn${onbSelectedHabits.includes(h.name)?' sel':''}" onclick="onbToggleHabit('${h.name}','${h.emoji}','${h.desc}')">
        <span class="oqh-emoji">${h.emoji}</span>
        <span class="oqh-info"><span class="oqh-name">${h.name}</span><span class="oqh-desc">${h.desc}</span></span>
      </button>
    `).join('');
    box.innerHTML=`
      <div class="onb-step-dots">${dots}</div>
      <div class="onb-icon">◇</div>
      <div class="onb-title">Выбери привычки</div>
      <div class="onb-sub">Выбери которые хочешь отслеживать. Потом можно добавить или убрать.</div>
      <div class="onb-quick-habit">${btns}</div>
      <button class="wb-primary onb-action" onclick="onbNext()">Далее ${onbSelectedHabits.length>0?'('+onbSelectedHabits.length+')':''}</button>
      <button class="onb-skip" onclick="onbNext()">Пропустить</button>
    `;
  }else if(onbStep===2){
    const dowNames=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    const addedLectures=Object.values(DATA.lectures||{}).flat();
    const lecList=addedLectures.length===0?
      `<div style="font-size:12px;color:var(--muted);text-align:center;padding:12px 0;">Пока пусто — добавь первую пару</div>`:
      addedLectures.slice(-3).map(l=>`
        <div style="background:var(--surface);border:0.5px solid var(--border);border-radius:var(--r);padding:9px 12px;margin-bottom:5px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div>
            <div style="font-size:12px;font-weight:500;">${escHtml(l.name)}</div>
            <div style="font-size:11px;color:var(--muted);">${l.start}–${l.end}</div>
          </div>
          <button style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;" onclick="onbDeleteLecture('${l.id}')">×</button>
        </div>
      `).join('');

    const dayBtns=dowNames.map((n,i)=>`
      <button style="flex:1;background:var(--surface);border:0.5px solid var(--border2);color:var(--text);font-size:11px;padding:7px 2px;border-radius:7px;cursor:pointer;font-family:inherit;transition:all 0.15s;" 
        data-onb-dow="${i}" onclick="onbSelectDow(${i})">${n}</button>
    `).join('');

    box.innerHTML=`
      <div class="onb-step-dots">${dots}</div>
      <div class="onb-icon">▤</div>
      <div class="onb-title">Расписание пар</div>
      <div class="onb-sub" style="margin-bottom:16px;">Добавь пары — они будут появляться каждую неделю автоматически.</div>
      
      <div id="onb-lec-list" style="margin-bottom:12px;">${lecList}</div>
      
      <div style="background:var(--surface);border:0.5px solid var(--border2);border-radius:var(--r);padding:12px;margin-bottom:16px;">
        <div style="display:flex;gap:4px;margin-bottom:8px;" id="onb-dow-row">${dayBtns}</div>
        <input class="field-inp" id="onb-lec-name" placeholder="Название предмета" style="margin-bottom:6px;"/>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
          <input class="field-inp" id="onb-lec-start" type="time" value="09:45"/>
          <input class="field-inp" id="onb-lec-end" type="time" value="11:20"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <input class="field-inp" id="onb-lec-room" placeholder="Аудитория"/>
          <input class="field-inp" id="onb-lec-teacher" placeholder="Преподаватель"/>
        </div>
        <button class="wb-primary" style="padding:10px;" onclick="onbAddLecture()">+ Добавить пару</button>
      </div>
      
      <button class="wb-primary onb-action" onclick="onbNext()">Готово${addedLectures.length>0?' ('+addedLectures.length+')':''}</button>
      <button class="onb-skip" onclick="onbNext()">Пропустить</button>
    `;
    window._onbDow=0;
    document.querySelector('[data-onb-dow="0"]').style.background='var(--accent)';
    document.querySelector('[data-onb-dow="0"]').style.color='var(--bg)';
    document.querySelector('[data-onb-dow="0"]').style.borderColor='var(--accent)';
  }else if(onbStep===3){
    box.innerHTML=`
      <div class="onb-step-dots">${dots}</div>
      <div class="onb-icon">●</div>
      <div class="onb-title">Как работают баллы</div>
      <div class="onb-sub">За каждое действие начисляются или списываются баллы. Они показывают насколько хорошо проходит твой день.</div>
      <div class="onb-pts-row">
        <div class="onb-pts-card"><div class="onb-pts-val pos">+5</div><div class="onb-pts-lbl">За вход в день</div></div>
        <div class="onb-pts-card"><div class="onb-pts-val pos">+10</div><div class="onb-pts-lbl">Посетил пару</div></div>
        <div class="onb-pts-card"><div class="onb-pts-val neg">−20</div><div class="onb-pts-lbl">Прогул пары</div></div>
        <div class="onb-pts-card"><div class="onb-pts-val pos">+5</div><div class="onb-pts-lbl">Привычка</div></div>
        <div class="onb-pts-card"><div class="onb-pts-val pos">+3</div><div class="onb-pts-lbl">Сделал дело</div></div>
        <div class="onb-pts-card"><div class="onb-pts-val neg">−2</div><div class="onb-pts-lbl">Пропустил дело</div></div>
      </div>
      <button class="wb-primary onb-action" onclick="onbFinish()">Готово — начать</button>
    `;
  }
}

function onbToggleHabit(name,emoji,desc){
  if(onbSelectedHabits.includes(name)){
    onbSelectedHabits=onbSelectedHabits.filter(n=>n!==name);
  }else{
    onbSelectedHabits.push(name);
  }
  renderOnbStep();
}

function onbNext(){
  if(onbStep===1&&onbSelectedHabits.length>0){
    DATA.habits=[];
    ONB_HABIT_SUGGESTIONS.filter(h=>onbSelectedHabits.includes(h.name)).forEach(h=>{
      DATA.habits.push({id:'h_'+Date.now()+'_'+Math.random().toString(36).slice(2),name:h.name,emoji:h.emoji,desc:h.desc});
    });
    if(DATA.habits.length===0)DATA.habits=DEFAULT_HABITS.map(h=>({...h}));
    saveData();
  }
  onbStep++;
  if(onbStep>=ONB_STEPS){onbFinish();return;}
  renderOnbStep();
}

function onbGoToLectures(){
  onbFinish();
  setTimeout(()=>{navTo('settings');},300);
}

function onbSelectDow(i){
  window._onbDow=i;
  document.querySelectorAll('[data-onb-dow]').forEach(b=>{
    const sel=Number(b.dataset.onbDow)===i;
    b.style.background=sel?'var(--accent)':'var(--surface)';
    b.style.color=sel?'var(--bg)':'var(--text)';
    b.style.borderColor=sel?'var(--accent)':'var(--border2)';
  });
}

function onbAddLecture(){
  const name=document.getElementById('onb-lec-name').value.trim();
  if(!name){showToast('Введи название предмета','bad');return;}
  const dow=window._onbDow||0;
  if(!DATA.lectures[dow])DATA.lectures[dow]=[];
  DATA.lectures[dow].push({
    id:'l_'+Date.now(),
    name,
    start:document.getElementById('onb-lec-start').value||'09:45',
    end:document.getElementById('onb-lec-end').value||'11:20',
    room:document.getElementById('onb-lec-room').value.trim(),
    teacher:document.getElementById('onb-lec-teacher').value.trim(),
    desc:'',
  });
  saveData();
  document.getElementById('onb-lec-name').value='';
  document.getElementById('onb-lec-room').value='';
  document.getElementById('onb-lec-teacher').value='';
  renderOnbStep();
}

function onbDeleteLecture(id){
  for(let d=0;d<7;d++){
    if(DATA.lectures[d])DATA.lectures[d]=DATA.lectures[d].filter(l=>l.id!==id);
  }
  saveData();
  renderOnbStep();
}

function onbFinish(){
  DATA.onboardingDone=true;
  saveData();
  goHome();
}

// === ABOUT PANEL ===
function openAbout(){
  const html=`
    <div class="panel-head">
      <h2>О приложении</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="about-section">
        <div class="about-section-title">Что такое Tempo</div>
        <div class="about-text">Tempo — персональный планер, дневник и трекер привычек. Он создан чтобы помочь выстроить ежедневную структуру, отслеживать прогресс и видеть как складывается жизнь — день за днём, привычка за привычкой.</div>
      </div>

      <div class="about-eco-block">
        <div class="about-eco-icon">🌱</div>
        <div class="about-eco-text">Tempo спроектирован с принципом локальной работы. Мы намеренно отказались от серверной инфраструктуры — это исключает передачу персональных данных третьим сторонам, снижает углеродный след продукта и обеспечивает полный контроль пользователя над своей информацией. Никаких серверов. Никаких баз данных. Ноль трафика в облако.</div>
      </div>

      <div class="about-section">
        <div class="about-section-title">Данные и приватность</div>
        <div class="about-text">Все данные хранятся исключительно в localStorage вашего браузера. Мы не имеем к ним доступа — физически. Экспортируйте JSON-файл регулярно чтобы не потерять данные при очистке кэша браузера.</div>
      </div>

      <div class="about-section">
        <div class="about-section-title">Версия</div>
        <div class="about-text" style="color:var(--muted);">Tempo 2.2</div>
      </div>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

// === EXPORT BANNER ===
function renderExportBanner(){
  const last=DATA.lastExport;
  let subText='';
  if(!last){
    subText='Экспорт ещё не делался';
  }else{
    const d=new Date(last);
    const days=Math.floor((Date.now()-last)/86400000);
    subText=days===0?'Экспорт сегодня':days===1?'Экспорт вчера':`Экспорт ${days} дн. назад`;
  }
  return`
    <div class="export-banner">
      <span class="eb-icon">💾</span>
      <div class="eb-info">
        <div class="eb-title">Сохранение данных</div>
        <div class="eb-sub">${subText}</div>
      </div>
      <button class="eb-btn" onclick="exportData()">Экспорт</button>
      <button class="eb-tip-btn" tabindex="0">?
        <div class="eb-tooltip">Данные хранятся в браузере и не исчезнут сами по себе. Но если очистить кэш — они удалятся. Экспортируй JSON-файл и храни его как бэкап.</div>
      </button>
    </div>
  `;
}

// === CLOSE WARNING ===
let closeWarnShown=false;

function setupCloseWarning(){
  window.addEventListener('beforeunload',function(e){
    if(!DATA)return;
    e.preventDefault();
    e.returnValue='';
    setTimeout(()=>{
      if(!closeWarnShown){
        closeWarnShown=true;
        document.getElementById('close-warn').classList.add('open');
      }
    },200);
  });
}

function dismissCloseWarn(){
  document.getElementById('close-warn').classList.remove('open');
  closeWarnShown=false;
}

function exportDataAndDismiss(){
  exportData();
  dismissCloseWarn();
}

// === STORIES ===
let STORIES_DATA=null;
let STORIES_IDX=0;
let STORIES_TIMER=null;
let STORIES_DURATION=6000;
let STORIES_PAUSED=false;
let STORIES_START_TIME=0;
let STORIES_ELAPSED=0;

const STORIES_SEEN_KEY='tempo_stories_seen';

function loadStoriesSeen(){
  try{return JSON.parse(localStorage.getItem(STORIES_SEEN_KEY)||'[]');}catch(e){return [];}
}
function saveStoriesSeen(arr){localStorage.setItem(STORIES_SEEN_KEY,JSON.stringify(arr));}

async function fetchStories(){
  if(STORIES_DATA)return STORIES_DATA;
  try{
    const res=await fetch('news.json?_='+Date.now());
    if(!res.ok)throw new Error('not ok');
    const data=await res.json();
    STORIES_DATA=data;
    return data;
  }catch(e){
    // fallback на встроенные если файл недоступен
    STORIES_DATA={version:'1.0',items:[
      {id:'fallback',type:'tip',emoji:'💾',title:'Не теряй данные',body:'Экспортируй JSON раз в неделю и храни в облаке. Данные в браузере исчезнут если очистить кэш.',color:'amber',date:''}
    ]};
    return STORIES_DATA;
  }
}

async function checkStoriesUnread(){
  const data=await fetchStories();
  if(!data||!data.items)return false;
  const seen=loadStoriesSeen();
  const hasUnread=data.items.some(i=>!seen.includes(i.id));
  const dot=document.getElementById('tb-stories-dot');
  if(dot)dot.style.display=hasUnread?'block':'none';
  return hasUnread;
}

async function openStoriesFromBar(){
  const data=await fetchStories();
  if(!data||!data.items||data.items.length===0){
    showToast('Советы пока не загружены');
    return;
  }
  STORIES_IDX=0;
  showStory();
  document.getElementById('stories').classList.add('open');
  document.getElementById('stories').classList.remove('closing');
}

function showStory(){
  if(!STORIES_DATA||!STORIES_DATA.items[STORIES_IDX])return;
  const item=STORIES_DATA.items[STORIES_IDX];
  const body=document.getElementById('st-body');

  const color=item.color||'default';
  body.parentElement.querySelector('.st-body').className='st-body st-bg-'+color;

  document.getElementById('st-emoji').textContent=item.emoji||'✨';
  document.getElementById('st-title').textContent=item.title||'';
  document.getElementById('st-text').textContent=item.body||'';
  document.getElementById('st-meta-icon').textContent=item.type==='update'?'◆':'💡';
  document.getElementById('st-meta-time').textContent=item.type==='update'?'обновление':'совет';

  // Прогресс-бары
  const row=document.getElementById('st-progress-row');
  row.innerHTML='';
  STORIES_DATA.items.forEach((_,i)=>{
    const bar=document.createElement('div');
    bar.className='st-progress'+(i<STORIES_IDX?' done':'');
    const fill=document.createElement('div');
    fill.className='st-progress-fill';
    if(i===STORIES_IDX){fill.id='st-progress-active';}
    else if(i<STORIES_IDX){fill.style.width='100%';}
    bar.appendChild(fill);
    row.appendChild(bar);
  });

  // Отметить как просмотренное
  const seen=loadStoriesSeen();
  if(!seen.includes(item.id)){seen.push(item.id);saveStoriesSeen(seen);}

  // Запустить canvas анимацию
  startStoryCanvas(color);

  startStoryTimer();
}

function startStoryTimer(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  STORIES_START_TIME=Date.now();
  STORIES_ELAPSED=0;
  STORIES_PAUSED=false;
  
  function tick(){
    if(STORIES_PAUSED)return;
    const now=Date.now();
    const elapsed=STORIES_ELAPSED+(now-STORIES_START_TIME);
    const pct=Math.min(100,(elapsed/STORIES_DURATION)*100);
    const fill=document.getElementById('st-progress-active');
    if(fill)fill.style.width=pct+'%';
    if(pct>=100){
      storyNext();
      return;
    }
    STORIES_TIMER=requestAnimationFrame(tick);
  }
  STORIES_TIMER=requestAnimationFrame(tick);
}

function storyNext(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  STORIES_IDX++;
  if(STORIES_IDX>=STORIES_DATA.items.length){
    closeStories();
    return;
  }
  showStory();
}

function storyPrev(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  if(STORIES_IDX>0){
    STORIES_IDX--;
    showStory();
  }else{
    showStory();
  }
}

function closeStories(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  stopStoryCanvas();
  const el=document.getElementById('stories');
  el.classList.add('closing');
  setTimeout(()=>{
    el.classList.remove('open','closing');
    checkStoriesUnread();
  },220);
}

// Hold to pause (long press)
document.addEventListener('DOMContentLoaded',()=>{
  const stEl=document.getElementById('stories');
  if(!stEl)return;
  let holdTimer=null;
  const startHold=(e)=>{
    if(e.target.classList.contains('st-close'))return;
    holdTimer=setTimeout(()=>{
      STORIES_PAUSED=true;
      STORIES_ELAPSED+=Date.now()-STORIES_START_TIME;
    },200);
  };
  const endHold=()=>{
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
    if(STORIES_PAUSED){
      STORIES_PAUSED=false;
      STORIES_START_TIME=Date.now();
      startStoryTimer();
    }
  };
  stEl.addEventListener('mousedown',startHold);
  stEl.addEventListener('touchstart',startHold,{passive:true});
  stEl.addEventListener('mouseup',endHold);
  stEl.addEventListener('touchend',endHold);
  stEl.addEventListener('mouseleave',endHold);
});

// Keyboard navigation
document.addEventListener('keydown',(e)=>{
  if(!document.getElementById('stories').classList.contains('open'))return;
  if(e.key==='Escape')closeStories();
  else if(e.key==='ArrowRight'||e.key===' ')storyNext();
  else if(e.key==='ArrowLeft')storyPrev();
});

// === STORIES CANVAS ANIMATION ===
let ST_RAF=null;
let ST_PARTICLES=[];
let ST_TICK=0;

const ST_EFFECTS={
  amber:{
    bg1:'#1a1000',bg2:'#2a1800',
    init(W,H){
      this.pts=[];
      for(let i=0;i<16;i++){
        this.pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.6,vy:-Math.random()*.5-.2,r:Math.random()*2+.8,a:Math.random()*.6+.2,da:-.003-.002*Math.random()});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.85,H*.1,0,W*.85,H*.1,H*.6);
      g.addColorStop(0,'rgba(186,117,23,0.22)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.a+=p.da;
        if(p.a<=0){p.x=Math.random()*W;p.y=H+5;p.a=.5+Math.random()*.4;p.vy=-Math.random()*.5-.2;}
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(250,199,117,${p.a*.7})`;ctx.fill();
      });
      for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2+t*.002;
        const len=40+20*Math.sin(t*.03+i);
        ctx.beginPath();ctx.moveTo(W*.85,H*.08);
        ctx.lineTo(W*.85+Math.cos(a)*len,H*.08+Math.sin(a)*len);
        ctx.strokeStyle=`rgba(250,199,117,${.05+.04*Math.sin(t*.04+i)})`;
        ctx.lineWidth=1;ctx.stroke();
      }
    }
  },
  coral:{
    init(W,H){
      this.pts=[];
      for(let i=0;i<20;i++){
        this.pts.push({x:Math.random()*W,y:H+Math.random()*40,vx:(Math.random()-.5)*.8,vy:-Math.random()*.9-.4,r:Math.random()*2.5+.6,a:.7+Math.random()*.3});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.2,H*.85,0,W*.2,H*.85,H*.5);
      g.addColorStop(0,'rgba(216,90,48,0.28)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.a-=.005;
        if(p.a<=0||p.y<-10){p.x=Math.random()*W;p.y=H+10;p.a=.6+Math.random()*.3;p.vy=-Math.random()*.9-.4;}
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(245,196,179,${p.a*.65})`;ctx.fill();
        if(p.r>1.5){
          ctx.beginPath();ctx.arc(p.x,p.y,p.r*2.5,0,Math.PI*2);
          ctx.fillStyle=`rgba(245,196,179,${p.a*.08})`;ctx.fill();
        }
      });
    }
  },
  green:{
    init(W,H){
      this.dots=[];
      for(let i=0;i<35;i++){
        this.dots.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2.5+.5,phase:Math.random()*Math.PI*2,speed:.02+Math.random()*.03});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.4,H*.55);
      g.addColorStop(0,'rgba(99,153,34,0.18)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.dots.forEach(d=>{
        const a=.12+.12*Math.sin(t*d.speed+d.phase);
        const r=d.r*(1+.3*Math.sin(t*d.speed*.7+d.phase));
        ctx.beginPath();ctx.arc(d.x,d.y,r,0,Math.PI*2);
        ctx.fillStyle=`rgba(192,221,151,${a})`;ctx.fill();
      });
    }
  },
  purple:{
    init(W,H){
      this.stars=[];
      for(let i=0;i<18;i++){
        this.stars.push({x:Math.random()*W,y:Math.random()*H,s:Math.random()*3+1.5,phase:Math.random()*Math.PI*2,rot:Math.random()*Math.PI});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H*.3,0,W*.5,H*.3,H*.6);
      g.addColorStop(0,'rgba(83,74,183,0.2)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.stars.forEach(s=>{
        const a=.15+.2*Math.sin(t*.04+s.phase);
        const sz=s.s*(1+.25*Math.sin(t*.05+s.phase));
        ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot+t*.008);
        ctx.fillStyle=`rgba(206,203,246,${a})`;
        ctx.beginPath();
        for(let i=0;i<4;i++){
          ctx.save();ctx.rotate(i*Math.PI/2);
          ctx.beginPath();ctx.moveTo(0,-sz*2.8);ctx.quadraticCurveTo(sz*.4,-sz*.4,sz*2.8,0);ctx.quadraticCurveTo(sz*.4,sz*.4,0,sz*2.8);ctx.quadraticCurveTo(-sz*.4,sz*.4,-sz*2.8,0);ctx.quadraticCurveTo(-sz*.4,-sz*.4,0,-sz*2.8);
          ctx.fillStyle=`rgba(206,203,246,${a*.8})`;ctx.fill();ctx.restore();
        }
        ctx.restore();
        ctx.beginPath();ctx.arc(s.x,s.y,sz*.6,0,Math.PI*2);
        ctx.fillStyle=`rgba(239,239,254,${a*.9})`;ctx.fill();
      });
    }
  },
  blue:{
    init(W,H){
      this.lines=[];
      for(let i=0;i<6;i++) this.lines.push({phase:Math.random()*Math.PI*2,amp:15+Math.random()*25,freq:.015+Math.random()*.01,y:H*(.2+i*.12)});
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,H*.6);
      g.addColorStop(0,'rgba(24,95,165,0.2)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.lines.forEach((l,i)=>{
        ctx.beginPath();
        for(let x=0;x<=W;x+=3){
          const y=l.y+l.amp*Math.sin(x*l.freq+t*.04+l.phase);
          x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle=`rgba(133,183,235,${.06+i*.02})`;
        ctx.lineWidth=1.2;ctx.stroke();
      });
    }
  },
  teal:{
    init(W,H){
      this.grid=[];
      const sz=28;
      for(let x=0;x<W+sz;x+=sz){
        for(let y=0;y<H+sz;y+=sz){
          this.grid.push({x,y,phase:Math.random()*Math.PI*2});
        }
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      this.grid.forEach(d=>{
        const a=.04+.07*Math.sin(t*.04+d.phase);
        ctx.fillStyle=`rgba(93,202,165,${a})`;
        ctx.fillRect(d.x+10,d.y+10,4,4);
      });
      const g=ctx.createRadialGradient(W*.1,H*.9,0,W*.1,H*.9,H*.5);
      g.addColorStop(0,'rgba(15,110,86,0.25)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    }
  },
  pink:{
    init(W,H){
      this.bubbles=[];
      for(let i=0;i<14;i++){
        this.bubbles.push({x:Math.random()*W,y:H+Math.random()*80,r:Math.random()*14+4,vy:-.3-Math.random()*.3,phase:Math.random()*Math.PI*2});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.8,H*.2,0,W*.8,H*.2,H*.5);
      g.addColorStop(0,'rgba(153,53,86,0.22)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.bubbles.forEach(b=>{
        b.y+=b.vy;b.x+=.4*Math.sin(t*.025+b.phase);
        if(b.y<-b.r*2){b.y=H+b.r;b.x=Math.random()*W;}
        const prog=Math.max(0,1-b.y/H);
        const a=prog*.15;
        ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(244,192,209,${a*2.5})`;ctx.lineWidth=.8;ctx.stroke();
        ctx.fillStyle=`rgba(153,53,86,${a*.7})`;ctx.fill();
        ctx.beginPath();ctx.arc(b.x-b.r*.3,b.y-b.r*.3,b.r*.25,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${a*3})`;ctx.fill();
      });
    }
  },
  amber2:{
    init(W,H){
      this.embers=[];
      for(let i=0;i<22;i++){
        this.embers.push({x:Math.random()*W,y:H+Math.random()*60,vy:-Math.random()*1.2-.4,vx:(Math.random()-.5)*.6,r:Math.random()*3+1,a:.5+Math.random()*.4,da:.004+Math.random()*.005});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H,0,W*.5,H,H*.7);
      g.addColorStop(0,'rgba(153,60,29,0.3)');g.addColorStop(.5,'rgba(186,117,23,0.1)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.embers.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.a-=p.da;
        if(p.a<=0){p.x=W*.3+Math.random()*W*.4;p.y=H+5;p.a=.5+Math.random()*.4;p.vy=-Math.random()*1.2-.4;}
        const hot=p.a>.4;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${hot?'250,234,218':'250,199,117'},${p.a*.7})`;ctx.fill();
        if(p.r>1.5){
          ctx.beginPath();ctx.arc(p.x,p.y,p.r*2,0,Math.PI*2);
          ctx.fillStyle=`rgba(250,199,117,${p.a*.07})`;ctx.fill();
        }
      });
    }
  },
  default:{
    init(W,H){
      this.pts=[];
      for(let i=0;i<20;i++) this.pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*2+.8,phase:Math.random()*Math.PI*2});
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      this.pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
        const a=.08+.08*Math.sin(t*.04+p.phase);
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(200,200,200,${a})`;ctx.fill();
      });
    }
  }
};

const COLOR_TO_EFFECT={
  amber:'amber',coral:'coral',green:'green',purple:'purple',
  blue:'blue',teal:'teal',pink:'pink',fire:'amber2',default:'default'
};

function startStoryCanvas(color){
  stopStoryCanvas();
  const canvas=document.getElementById('st-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const effectKey=COLOR_TO_EFFECT[color]||'default';
  const effect=ST_EFFECTS[effectKey];
  if(!effect)return;

  function resize(){
    canvas.width=Math.round(canvas.offsetWidth||window.innerWidth);
    canvas.height=Math.round(canvas.offsetHeight||window.innerHeight);
    if(canvas.width<10)canvas.width=390;
    if(canvas.height<10)canvas.height=844;
    effect.init(canvas.width,canvas.height);
  }
  resize();

  let tick=0;
  function loop(){
    const stories=document.getElementById('stories');
    if(!stories||!stories.classList.contains('open'))return;
    try{effect.draw(ctx,canvas.width,canvas.height,tick++);}catch(e){}
    ST_RAF=requestAnimationFrame(loop);
  }
  ST_RAF=requestAnimationFrame(loop);
}

function stopStoryCanvas(){
  if(ST_RAF){cancelAnimationFrame(ST_RAF);ST_RAF=null;}
  const canvas=document.getElementById('st-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

init();
setupCloseWarning();
setTimeout(checkStoriesUnread,1000);