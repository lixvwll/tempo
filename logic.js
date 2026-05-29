const STORAGE_KEY='tempo_data_v1';
const THEME_KEY='tempo_theme';

const LECTURE_TYPE='lecture';
const TASK_TYPES=[
  {id:'lecture',name:'Пара',color:'var(--warn)'},
  {id:'code',name:'Код',color:'var(--info)'},
  {id:'music',name:'Музыка',color:'#9C7BD9'},
  {id:'lang',name:'Язык',color:'var(--info)'},
  {id:'walk',name:'Прогулка',color:'var(--good)'},
  {id:'personal',name:'Личное',color:'var(--muted)'},
];

const DEFAULT_HABITS=[
  {id:'h_wake',name:'Подъём вовремя',emoji:'☀',desc:''},
  {id:'h_walk',name:'Прогулка',emoji:'🚶',desc:'Хотя бы 20 минут'},
  {id:'h_read',name:'Чтение',emoji:'📖',desc:'10–15 страниц'},
];

const HABIT_EMOJIS=['☀','🌙','📖','🎵','💻','🏃','🚶','💪','🧘','💧','🥗','📝','🌱','🎯','✨','⭐','🔥','💡','🎨','📚','🌿','☕','🍎','📞'];

const POINTS={
  login:5,
  lectureAttended:10,
  lectureSkipped:-20,
  taskDone:3,
  taskSkipped:-2,
  habitDone:5,
  habitMissed:-2,
  waterCup:2,
  waterGoal:10,
  weightLog:3,
};

// Пресеты для трекера воды (как в фитнес-приложениях)
const WATER_PRESETS=[
  {icon:'🥛',name:'Стакан',ml:200},
  {icon:'☕',name:'Кружка',ml:350},
  {icon:'🥤',name:'Стакан L',ml:300},
  {icon:'🧃',name:'Бутылка',ml:500},
  {icon:'🍶',name:'Термос',ml:400},
  {icon:'💧',name:'Большая',ml:750},
];
const DEFAULT_WATER_GOAL=2000;

let DATA=null;
let CURRENT_SCREEN='home';
let CURRENT_DAY=null;
let HOME_TIMER=null;
let JOURNAL_DAY=null;
let SCHED_DAY=null;
let WEIGHT_CHART_RANGE='4w'; // '1w','4w','3m','all'
let HABITS_DAY=null;
let EDITING_TASK=null;
let EDITING_LECTURE=null;
let SELECTED_TYPE='personal';
let SELECTED_EMOJI='✨';

function todayKey(d){d=d||new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;}
function dateFromKey(k){const[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d);}
function dayOfWeek(d){d=d||new Date();return d.getDay()===0?6:d.getDay()-1;}
function shiftDay(key,delta){const d=dateFromKey(key);d.setDate(d.getDate()+delta);return todayKey(d);}
function timeToMin(t){const[h,m]=t.split(':').map(Number);return h*60+m;}
function minToTime(min){const h=Math.floor(min/60),m=min%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
function fmtDayName(d,short){const long=['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'];const sh=['пн','вт','ср','чт','пт','сб','вс'];return short?sh[dayOfWeek(d)]:long[dayOfWeek(d)];}
function fmtMonth(d){return['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()];}
function fmtDate(d){return d.getDate()+' '+fmtMonth(d);}
function relDay(key){const t=todayKey();const y=shiftDay(t,-1);const tm=shiftDay(t,1);if(key===t)return'сегодня';if(key===y)return'вчера';if(key===tm)return'завтра';return null;}

function emptyData(name){
  return{
    name:name||'',
    created:todayKey(),
    lastVisit:null,
    points:0,
    streak:0,
    longestStreak:0,
    daysCount:0,
    theme:'dark',
    lectures:{},
    tasks:{},
    habits:DEFAULT_HABITS.map(h=>({...h})),
    habitLogs:{},
    journal:{},
    moods:{},
    pointsLog:{},
    achievements:{},
    challenges:[],
    journalStruct:{},
    weeklySummaryShown:{},
    notifPerm:null,
    weight:{start:null,goal:null,height:null,log:{}},
    water:{goalMl:DEFAULT_WATER_GOAL,log:{},bonusDays:{}},
  };
}

const ACHIEVEMENTS=[
  {id:'a_first_visit',icon:'☀',title:'Первый день',desc:'Зашёл в первый раз',group:'starter',check:d=>true},
  {id:'a_first_task',icon:'✓',title:'Первое дело',desc:'Отметил первое выполненное дело',group:'starter',check:d=>countTasksDone(d)>=1},
  {id:'a_first_lecture',icon:'📚',title:'На пары',desc:'Отметил первую посещённую пару',group:'starter',check:d=>countLecturesAttended(d)>=1},
  {id:'a_first_habit',icon:'◇',title:'Первая привычка',desc:'Отметил первую привычку',group:'starter',check:d=>countHabitsDone(d)>=1},
  {id:'a_first_journal',icon:'✎',title:'Первая запись',desc:'Записал что-то в дневнике',group:'starter',check:d=>Object.keys(d.journal||{}).filter(k=>(d.journal[k]||'').trim()).length>=1||Object.keys(d.journalStruct||{}).length>=1},
  
  {id:'a_streak_3',icon:'🔥',title:'Три дня',desc:'Серия входов 3 дня подряд',group:'streak',check:d=>(d.longestStreak||0)>=3,prog:d=>Math.min(1,(d.streak||0)/3)},
  {id:'a_streak_7',icon:'⚡',title:'Неделя',desc:'Серия входов 7 дней подряд',group:'streak',check:d=>(d.longestStreak||0)>=7,prog:d=>Math.min(1,(d.streak||0)/7)},
  {id:'a_streak_30',icon:'💎',title:'Месяц',desc:'Серия входов 30 дней подряд',group:'streak',check:d=>(d.longestStreak||0)>=30,prog:d=>Math.min(1,(d.streak||0)/30)},
  {id:'a_streak_100',icon:'👑',title:'Сто дней',desc:'Серия входов 100 дней подряд',group:'streak',check:d=>(d.longestStreak||0)>=100,prog:d=>Math.min(1,(d.streak||0)/100)},
  
  {id:'a_lectures_5',icon:'🎓',title:'Студент',desc:'Посетил 5 пар',group:'study',check:d=>countLecturesAttended(d)>=5,prog:d=>Math.min(1,countLecturesAttended(d)/5)},
  {id:'a_lectures_25',icon:'🏛',title:'Прилежный',desc:'Посетил 25 пар',group:'study',check:d=>countLecturesAttended(d)>=25,prog:d=>Math.min(1,countLecturesAttended(d)/25)},
  {id:'a_lectures_100',icon:'📖',title:'Образованный',desc:'Посетил 100 пар',group:'study',check:d=>countLecturesAttended(d)>=100,prog:d=>Math.min(1,countLecturesAttended(d)/100)},
  {id:'a_no_skip_week',icon:'✨',title:'Чистая неделя',desc:'Неделя без прогулов',group:'study',check:d=>cleanLectureWeeks(d)>=1},
  
  {id:'a_habit_streak_7',icon:'🌱',title:'Привычка',desc:'7 дней одной привычки подряд',group:'habit',check:d=>maxHabitStreak(d)>=7,prog:d=>Math.min(1,maxHabitStreak(d)/7)},
  {id:'a_habit_streak_30',icon:'🌳',title:'Укоренилось',desc:'30 дней одной привычки подряд',group:'habit',check:d=>maxHabitStreak(d)>=30,prog:d=>Math.min(1,maxHabitStreak(d)/30)},
  {id:'a_habit_perfect',icon:'⭐',title:'Идеальный день',desc:'Все привычки за один день',group:'habit',check:d=>hasPerfectHabitDay(d)},
  {id:'a_habits_100',icon:'🏆',title:'Сотня привычек',desc:'Закрыто 100 привычек суммарно',group:'habit',check:d=>countHabitsDone(d)>=100,prog:d=>Math.min(1,countHabitsDone(d)/100)},
  
  {id:'a_journal_7',icon:'📓',title:'Семь записей',desc:'Записывал в дневник 7 дней',group:'journal',check:d=>countJournalDays(d)>=7,prog:d=>Math.min(1,countJournalDays(d)/7)},
  {id:'a_journal_30',icon:'📔',title:'Месяц рефлексии',desc:'Записывал в дневник 30 дней',group:'journal',check:d=>countJournalDays(d)>=30,prog:d=>Math.min(1,countJournalDays(d)/30)},
  
  {id:'a_pts_100',icon:'🎯',title:'Первая сотня',desc:'Набрал 100 баллов',group:'points',check:d=>(d.points||0)>=100,prog:d=>Math.min(1,(d.points||0)/100)},
  {id:'a_pts_500',icon:'🚀',title:'Пятьсот',desc:'Набрал 500 баллов',group:'points',check:d=>(d.points||0)>=500,prog:d=>Math.min(1,(d.points||0)/500)},
  {id:'a_pts_2000',icon:'🌟',title:'Две тысячи',desc:'Набрал 2000 баллов',group:'points',check:d=>(d.points||0)>=2000,prog:d=>Math.min(1,(d.points||0)/2000)},
  {id:'a_perfect_day',icon:'💯',title:'Идеальный день',desc:'День без штрафных баллов и с активностью',check:d=>hasPerfectDay(d),group:'points'},
  
  {id:'a_challenge_first',icon:'🎬',title:'Первый челлендж',desc:'Завершил свой первый челлендж',group:'challenge',check:d=>(d.challenges||[]).filter(c=>c.completed).length>=1},
  {id:'a_challenge_3',icon:'🏅',title:'Тройной успех',desc:'Завершил 3 челленджа',group:'challenge',check:d=>(d.challenges||[]).filter(c=>c.completed).length>=3,prog:d=>Math.min(1,(d.challenges||[]).filter(c=>c.completed).length/3)},

  // === ВОДА ===
  {id:'a_water_first',icon:'💧',title:'Первый глоток',desc:'Выпить первый стакан воды',group:'water',check:d=>countWaterEntries(d)>=1},
  {id:'a_water_goal',icon:'🌊',title:'Водяной мастер',desc:'Выполнить дневную норму воды',group:'water',check:d=>waterGoalDaysTotal(d)>=1},
  {id:'a_water_week',icon:'💦',title:'Неделя воды',desc:'Выполнять норму воды 7 дней подряд',group:'water',check:d=>maxWaterStreak(d)>=7,prog:d=>Math.min(1,maxWaterStreak(d)/7)},
  {id:'a_water_month',icon:'🏊',title:'Месяц воды',desc:'Выполнять норму воды 30 дней подряд',group:'water',check:d=>maxWaterStreak(d)>=30,prog:d=>Math.min(1,maxWaterStreak(d)/30)},
  {id:'a_water_100',icon:'👑',title:'Легенда воды',desc:'100 дней с выполненной нормой',group:'water',check:d=>waterGoalDaysTotal(d)>=100,prog:d=>Math.min(1,waterGoalDaysTotal(d)/100)},

  // === ВЕС ===
  {id:'a_weight_first',icon:'📏',title:'Первый шаг',desc:'Записать вес первый раз',group:'weight',check:d=>Object.keys((d.weight||{}).log||{}).length>=1},
  {id:'a_weight_track7',icon:'📊',title:'Под контролем',desc:'Записывать вес 7 разных дней',group:'weight',check:d=>Object.keys((d.weight||{}).log||{}).length>=7,prog:d=>Math.min(1,Object.keys((d.weight||{}).log||{}).length/7)},
  {id:'a_weight_5',icon:'📉',title:'Минус 5 кг',desc:'Потерять 5 кг от стартового веса',group:'weight',check:d=>weightLost(d)>=5,prog:d=>Math.min(1,weightLost(d)/5)},
  {id:'a_weight_10',icon:'🎯',title:'Минус 10 кг',desc:'Потерять 10 кг от стартового веса',group:'weight',check:d=>weightLost(d)>=10,prog:d=>Math.min(1,weightLost(d)/10)},
  {id:'a_weight_goal',icon:'🏆',title:'Цель достигнута!',desc:'Достичь целевого веса',group:'weight',check:d=>weightGoalReached(d),prog:d=>weightGoalProgress(d)},
];

const ACH_GROUPS={starter:'Начало',streak:'Серии',study:'Учёба',habit:'Привычки',journal:'Дневник',points:'Баллы',challenge:'Челленджи',water:'💧 Вода',weight:'⚖ Вес'};

// === ВОДА: вспомогательные ===
function waterTotalForDay(d,key){const e=(d.water&&d.water.log&&d.water.log[key])||[];return e.reduce((a,x)=>a+(x.ml||0),0);}
function countWaterEntries(d){let n=0;Object.values((d.water||{}).log||{}).forEach(arr=>{n+=(arr||[]).length;});return n;}
function waterGoalDaysTotal(d){const goal=(d.water||{}).goalMl||DEFAULT_WATER_GOAL;let n=0;Object.keys((d.water||{}).log||{}).forEach(k=>{if(waterTotalForDay(d,k)>=goal)n++;});return n;}
function maxWaterStreak(d){
  const goal=(d.water||{}).goalMl||DEFAULT_WATER_GOAL;
  const keys=Object.keys((d.water||{}).log||{}).filter(k=>waterTotalForDay(d,k)>=goal).sort();
  let best=0,cur=0,prev=null;
  keys.forEach(k=>{
    if(prev&&shiftDay(prev,1)===k)cur++;else cur=1;
    if(cur>best)best=cur;prev=k;
  });
  return best;
}

// === ВЕС: вспомогательные ===
function weightEntriesSorted(d){const log=(d.weight||{}).log||{};return Object.keys(log).sort().map(k=>({key:k,kg:typeof log[k]==='object'?log[k].kg:log[k]}));}
function latestWeight(d){const e=weightEntriesSorted(d);return e.length?e[e.length-1].kg:null;}
function weightLost(d){const w=d.weight||{};const start=w.start;const latest=latestWeight(d);if(start==null||latest==null)return 0;return Math.max(0,start-latest);}
function weightGoalReached(d){const w=d.weight||{};const latest=latestWeight(d);if(w.goal==null||latest==null||w.start==null)return false;return latest<=w.goal&&w.start>w.goal;}
function weightGoalProgress(d){const w=d.weight||{};const latest=latestWeight(d);if(w.goal==null||latest==null||w.start==null||w.start<=w.goal)return 0;return Math.min(1,(w.start-latest)/(w.start-w.goal));}

function countTasksDone(d){let n=0;Object.values(d.tasks||{}).forEach(day=>{Object.entries(day).forEach(([k,t])=>{if(!k.startsWith('lec_')&&t.done)n++;});});return n;}
function countLecturesAttended(d){let n=0;Object.values(d.tasks||{}).forEach(day=>{Object.entries(day).forEach(([k,t])=>{if(k.startsWith('lec_')&&t.done)n++;});});return n;}
function countLecturesSkipped(d){let n=0;Object.values(d.tasks||{}).forEach(day=>{Object.entries(day).forEach(([k,t])=>{if(k.startsWith('lec_')&&t.skipped)n++;});});return n;}
function countHabitsDone(d){let n=0;Object.values(d.habitLogs||{}).forEach(day=>{Object.values(day).forEach(v=>{if(v)n++;});});return n;}
function countJournalDays(d){const set=new Set();Object.entries(d.journal||{}).forEach(([k,v])=>{if((v||'').trim())set.add(k);});Object.keys(d.journalStruct||{}).forEach(k=>set.add(k));return set.size;}
function maxHabitStreak(d){let max=0;(d.habits||[]).forEach(h=>{const s=calcStreak(h.id);if(s>max)max=s;});return max;}
function hasPerfectHabitDay(d){if(!d.habits||d.habits.length===0)return false;return Object.values(d.habitLogs||{}).some(day=>d.habits.every(h=>day[h.id]));}
function hasPerfectDay(d){return Object.entries(d.pointsLog||{}).some(([k,l])=>l.pos>=20&&l.neg===0);}
function cleanLectureWeeks(d){
  const weeks=new Map();
  Object.entries(d.tasks||{}).forEach(([k,day])=>{
    const date=dateFromKey(k);
    const ws=new Date(date);
    ws.setDate(date.getDate()-dayOfWeek(date));
    const wk=todayKey(ws);
    if(!weeks.has(wk))weeks.set(wk,{att:0,skip:0});
    Object.entries(day).forEach(([tk,t])=>{
      if(tk.startsWith('lec_')){
        if(t.done)weeks.get(wk).att++;
        if(t.skipped)weeks.get(wk).skip++;
      }
    });
  });
  let n=0;
  weeks.forEach(w=>{
    // Минимум 3 посещённые пары и ноль прогулов
    if(w.att>=3&&w.skip===0)n++;
  });
  return n;
}

function checkAchievements(){
  const unlocked=[];
  ACHIEVEMENTS.forEach(a=>{
    const condMet=a.check(DATA);
    const has=!!DATA.achievements[a.id];
    if(condMet&&!has){
      DATA.achievements[a.id]={unlockedAt:Date.now()};
      unlocked.push(a);
    }else if(!condMet&&has){
      // Отзываем если условие больше не выполняется
      delete DATA.achievements[a.id];
    }
  });
  if(unlocked.length){
    saveData();
    showAchievementToast(unlocked[0]);
    if(unlocked.length>1)setTimeout(()=>showAchievementToast(unlocked[1]),3500);
  }
  return unlocked;
}

function checkAchievements(){
  const unlocked=[];
  ACHIEVEMENTS.forEach(a=>{
    const conditionMet=a.check(DATA);
    const alreadyHas=!!DATA.achievements[a.id];
    if(conditionMet&&!alreadyHas){
      DATA.achievements[a.id]={unlockedAt:Date.now()};
      unlocked.push(a);
    }else if(!conditionMet&&alreadyHas&&a.revokable!==false){
      // Отзываем если условие больше не выполняется
      // Только для достижений которые можно отозвать (не дата-based)
      delete DATA.achievements[a.id];
    }
  });
  if(unlocked.length){
    saveData();
    showAchievementToast(unlocked[0]);
    if(unlocked.length>1)setTimeout(()=>showAchievementToast(unlocked[1]),3500);
  }
  return unlocked;
}

function showAchievementToast(a){
  document.getElementById('ta-icon').textContent=a.icon;
  document.getElementById('ta-name').textContent=a.title;
  const t=document.getElementById('toast-ach');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

function saveData(){if(!DATA)return;localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));}
function loadData(){try{const r=localStorage.getItem(STORAGE_KEY);if(!r)return null;const d=JSON.parse(r);return migrateData(d);}catch(e){return null;}}

function migrateData(d){
  if(!d.achievements)d.achievements={};
  if(!d.challenges)d.challenges=[];
  if(!d.journalStruct)d.journalStruct={};
  if(!d.weeklySummaryShown)d.weeklySummaryShown={};
  if(d.notifPerm===undefined)d.notifPerm=null;
  if(d.onboardingDone===undefined)d.onboardingDone=true;
  if(d.lastExport===undefined)d.lastExport=null;
  if(!d.weight)d.weight={start:null,goal:null,height:null,log:{}};
  if(!d.weight.log)d.weight.log={};
  if(!d.water)d.water={goalMl:DEFAULT_WATER_GOAL,log:{},bonusDays:{}};
  if(!d.water.log)d.water.log={};
  if(!d.water.bonusDays)d.water.bonusDays={};
  if(!d.water.goalMl)d.water.goalMl=DEFAULT_WATER_GOAL;
  return d;
}

function loadTheme(){const t=localStorage.getItem(THEME_KEY)||'dark';document.documentElement.setAttribute('data-theme',t);return t;}
function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  localStorage.setItem(THEME_KEY,t);
  if(DATA){DATA.theme=t;saveData();}
  document.querySelectorAll('.wt-btn').forEach(b=>b.classList.toggle('active',b.id==='wt-'+t));
  const meta=document.getElementById('theme-color-meta');
  if(meta)meta.setAttribute('content',t==='dark'?'#0e0e0e':'#fafaf8');
}
function toggleTheme(){const cur=document.documentElement.getAttribute('data-theme');setTheme(cur==='dark'?'light':'dark');}

function showToast(msg,kind){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+(kind||'');setTimeout(()=>t.className='toast '+(kind||''),2000);}

function addPoints(n,reason,dayKey){
  if(!DATA)return;
  DATA.points=(DATA.points||0)+n;
  const k=dayKey||todayKey();
  if(!DATA.pointsLog[k])DATA.pointsLog[k]={pos:0,neg:0,events:[]};
  if(n>0)DATA.pointsLog[k].pos+=n;else DATA.pointsLog[k].neg+=Math.abs(n);
  DATA.pointsLog[k].events.push({n,reason,ts:Date.now()});
  saveData();
  checkAchievements();
}

function getDayPoints(key){const l=DATA.pointsLog[key];return l?(l.pos-l.neg):0;}

function init(){
  loadTheme();
  DATA=loadData();
  if(!DATA){
    showScreen('welcome');
    document.getElementById('welcome-name').focus();
    return;
  }
  if(DATA.theme)setTheme(DATA.theme);
  showReturning();
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
}

function startFresh(){
  const name=document.getElementById('welcome-name').value.trim();
  if(!name){document.getElementById('welcome-name').focus();return;}
  DATA=emptyData(name);
  DATA.theme=document.documentElement.getAttribute('data-theme');
  DATA.lastVisit=todayKey();
  DATA.daysCount=1;
  DATA.streak=1;
  DATA.longestStreak=1;
  addPoints(POINTS.login,'login');
  saveData();
  startOnboarding();
}

function showReturning(){
  const today=todayKey();
  const last=DATA.lastVisit;
  const isFirstToday=last!==today;
  
  if(isFirstToday){
    DATA.daysCount=(DATA.daysCount||0)+1;
    if(last===shiftDay(today,-1)){
      DATA.streak=(DATA.streak||0)+1;
    }else{
      DATA.streak=1;
    }
    DATA.longestStreak=Math.max(DATA.longestStreak||0,DATA.streak);
    DATA.lastVisit=today;
    addPoints(POINTS.login,'login');
    saveData();
  }
  
  const greet=(()=>{const h=new Date().getHours();if(h<6)return'Доброй ночи';if(h<12)return'Доброе утро';if(h<18)return'Добрый день';return'Добрый вечер';})();
  document.getElementById('ret-greeting').textContent=greet;
  document.getElementById('ret-title').textContent=DATA.name+'!';
  
  const subs=[
    'Так держать — хорошо что зашёл.',
    'Серия не прерывается. Это важно.',
    'Каждый день — это инвестиция в себя.',
    'Маленькие шаги — большой путь.',
  ];
  document.getElementById('ret-sub').textContent=subs[Math.floor(Math.random()*subs.length)];
  
  document.getElementById('ret-streak').textContent=DATA.streak||0;
  document.getElementById('ret-pts').textContent=DATA.points||0;
  document.getElementById('ret-days').textContent=DATA.daysCount||0;
  
  const bonusEl=document.getElementById('ret-bonus');
  if(isFirstToday){
    bonusEl.style.display='block';
    bonusEl.textContent='+'+POINTS.login+' баллов за сегодняшний вход';
  }else{
    bonusEl.style.display='none';
  }
  
  showScreen('returning');
}

function goHome(){
  showScreen('app');
  document.getElementById('bottom-nav').style.display='block';
  navTo('home');
  setTimeout(()=>{
    checkAchievements();
    maybeShowWeeklySummary();
    setupNotifications();
  },800);
}

function navTo(screen){
  CURRENT_SCREEN=screen;
  document.querySelectorAll('.main-screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('ms-'+screen).classList.add('active');
  document.querySelectorAll('.bn-btn').forEach(b=>b.classList.toggle('active',b.dataset.screen===screen));
  if(HOME_TIMER){clearInterval(HOME_TIMER);HOME_TIMER=null;}
  if(screen==='home')renderHome();
  else if(screen==='schedule')renderSchedule();
  else if(screen==='stats')renderStats();
  else if(screen==='challenges')renderChallenges();
  else if(screen==='journal')renderJournal();
  else if(screen==='habits')renderHabits();
  else if(screen==='weight')renderWeight();
  else if(screen==='settings')renderSettings();
  updateTopBar();
}

function updateTopBar(){
  const el=document.getElementById('tb-pts');
  const todayPts=getDayPoints(todayKey());
  const total=DATA.points||0;
  el.textContent=total+(total===1?' балл':' баллов');
  el.className='tb-pts'+(total>0?' pos':total<0?' neg':'');
}

function resetUser(){
  if(!confirm('Сбросить данные и начать заново? Это удалит всё. Сначала экспортируй данные если хочешь сохранить.'))return;
  localStorage.removeItem(STORAGE_KEY);
  DATA=null;
  showScreen('welcome');
  document.getElementById('welcome-name').value='';
  document.getElementById('welcome-name').focus();
}

function getDayEvents(dayKey){
  const d=dateFromKey(dayKey);
  const dow=dayOfWeek(d);
  const events=[];
  
  const dayLectures=(DATA.lectures[dow]||[]);
  dayLectures.forEach(lec=>{
    const status=(DATA.tasks[dayKey]||{})['lec_'+lec.id]||{};
    events.push({
      id:'lec_'+lec.id,
      type:'lecture',
      name:lec.name,
      meta:[lec.room,lec.teacher].filter(Boolean).join(' · '),
      desc:lec.desc||'',
      start:lec.start,
      end:lec.end,
      isLecture:true,
      done:status.done||false,
      skipped:status.skipped||false,
    });
  });
  
  const dayTasks=(DATA.tasks[dayKey]||{});
  Object.keys(dayTasks).forEach(tid=>{
    if(tid.startsWith('lec_'))return;
    const t=dayTasks[tid];
    if(!t.name)return;
    events.push({
      id:tid,
      type:t.type||'personal',
      name:t.name,
      meta:t.desc||'',
      desc:t.desc||'',
      start:t.start||'',
      end:t.end||'',
      isLecture:false,
      done:t.done||false,
      skipped:t.skipped||false,
    });
  });
  
  events.sort((a,b)=>{
    if(!a.start&&!b.start)return 0;
    if(!a.start)return 1;
    if(!b.start)return -1;
    return timeToMin(a.start)-timeToMin(b.start);
  });
  return events;
}