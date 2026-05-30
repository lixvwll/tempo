// === SCHEDULE SCREEN ===

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
    t.done=false;
    addPoints(isLecture?-POINTS.lectureAttended:-POINTS.taskDone,'undo done',day);
  }else{
    if(t.skipped){
      t.skipped=false;
      addPoints(isLecture?Math.abs(POINTS.lectureSkipped):Math.abs(POINTS.taskSkipped),'undo skip',day);
    }
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
    t.skipped=false;
    addPoints(isLecture?Math.abs(POINTS.lectureSkipped):Math.abs(POINTS.taskSkipped),'undo skip',day);
  }else{
    if(t.done){
      t.done=false;
      addPoints(isLecture?-POINTS.lectureAttended:-POINTS.taskDone,'undo done',day);
    }
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
