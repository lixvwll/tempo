// === HABITS SCREEN ===

function habitSetDay(k){HABITS_DAY=k;renderHabits();}

function renderHabits(){
  if(!HABITS_DAY)HABITS_DAY=todayKey();
  const root=document.getElementById('ms-habits');
  const today=todayKey();
  const isPast=HABITS_DAY<today;
  const isFuture=HABITS_DAY>today;
  const dayLog=DATA.habitLogs[HABITS_DAY]||{};

  const doneCount=DATA.habits.filter(h=>!!dayLog[h.id]).length;
  const total=DATA.habits.length;
  const dayLabel=relDay(HABITS_DAY)||fmtDate(dateFromKey(HABITS_DAY));

  let html=renderDayNav(HABITS_DAY,'habitSetDay')+renderWeekStrip(HABITS_DAY,'habitSetDay');

  if(isPast){
    html+=`<div class="habit-past-banner">
      <span>✎</span>
      <span>Редактируешь прошлый день — баллы пересчитаются автоматически</span>
    </div>`;
  }else if(isFuture){
    html+=`<div class="habit-past-banner" style="background:var(--info-soft);border-color:rgba(91,157,232,0.25);color:var(--info);">
      <span>📅</span>
      <span>Будущий день — отметить привычки заранее</span>
    </div>`;
  }

  if(total>0){
    const pct=Math.round(doneCount/total*100);
    html+=`
      <div class="habit-day-progress">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px;">
          <span>${dayLabel}</span>
          <span>${doneCount}/${total} · ${pct}%</span>
        </div>
        <div class="hdp-bar"><div class="hdp-fill" style="width:${pct}%;${pct===100?'background:var(--good);':''}"></div></div>
      </div>
    `;
  }

  html+=`<div class="section-lbl">Привычки</div>`;

  if(DATA.habits.length===0){
    html+=`<div class="empty-day">Привычек пока нет. Добавь свои ниже.</div>`;
  }else{
    DATA.habits.forEach(h=>{
      const done=!!dayLog[h.id];
      const streak=calcStreak(h.id);
      const streakStr=streak>0?(streak+(streak===1?' день':'дн')):'';
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

  DATA.habits.forEach(h=>{
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
  if(!todayDone){d.setDate(d.getDate()-1);}
  while(true){
    const k=todayKey(d);
    if(DATA.habitLogs[k]&&DATA.habitLogs[k][habitId]){streak++;d.setDate(d.getDate()-1);}
    else break;
  }
  return streak;
}

function toggleHabit(id){
  const day=HABITS_DAY||todayKey();
  if(!DATA.habitLogs[day])DATA.habitLogs[day]={};
  if(DATA.habitLogs[day][id]){
    DATA.habitLogs[day][id]=false;
    addPoints(-POINTS.habitDone,'habit undo',day);
  }else{
    DATA.habitLogs[day][id]=true;
    addPoints(POINTS.habitDone,'habit done',day);
    const streak=calcStreak(id);
    if(streak>0&&streak%7===0)showToast(`🔥 ${streak} дней подряд!`,'good');
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
