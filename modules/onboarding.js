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
