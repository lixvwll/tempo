// === SETTINGS SCREEN ===

const DAY_NAMES=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];

function renderSettings(){
  const root=document.getElementById('ms-settings');
  const curTheme=document.documentElement.getAttribute('data-theme');

  let html=`
    <div class="section-lbl" style="display:flex;align-items:center;justify-content:space-between;">
      <span>⚙ Настройки</span>
      <button class="icon-btn" style="font-size:11px;color:var(--muted);" onclick="navTo('home')">← Назад</button>
    </div>
    <div class="section-lbl" style="margin-top:4px;">Профиль</div>
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
      <div class="set-row"><div class="set-label">Стакан воды</div><div style="color:var(--good);font-weight:500;">+${POINTS.waterCup}</div></div>
      <div class="set-row"><div class="set-label">Норма воды за день</div><div style="color:var(--good);font-weight:500;">+${POINTS.waterGoal}</div></div>
      <div class="set-row"><div class="set-label">Запись веса</div><div style="color:var(--good);font-weight:500;">+${POINTS.weightLog}</div></div>
    </div>

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
        <div class="about-text" style="color:var(--muted);">Tempo 2.3 · Weight Loss System</div>
      </div>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}
