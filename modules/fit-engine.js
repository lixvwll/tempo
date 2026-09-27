// ============================================================
// === TEMPO FIT · ENGINE =====================================
// ============================================================
// Чистая логика раздела Fit — без DOM и без обращения к DATA.
// Всё нужное передаётся аргументами, поэтому файл работает и в браузере
// (глобальные функции), и в node (scripts/fit-selftest.js).
//
// Данные
//  fit/exercises.json  {version, exercises:[Exercise]}
//    Exercise  {id, name, aliases[], category, pattern, primary[], secondary[],
//               equipment[] (пусто = без инвентаря), location[] (home|gym|outdoor),
//               difficulty 1–5, impact low|high, fatigue 1–5, unilateral, measure reps|time,
//               met, avoidIf[], regression, progression, cues[], mistakes[], breathing, tags[]}
//  fit/programs.json   {version, templates:{id:Template}, programs:[Program], smart:{type:[tplId]}}
//    Template  {name, type strength|circuit|hiit|cardio|run|mobility|recovery, desc, focus[], slots[], extra[], run}
//    Slot      {role main|acc|core|mob|bal|hiit, patterns[], muscles[], cats[], ids[], pr 1–3}
//    Program   {id, name, desc, goals[], level, days, weeks, minutes, place[], needs[], only[],
//               rx, lowImpact, tags[], rotation[] | sessions[], deload[]}
//  DATA.fit (значения по умолчанию — fitEnsure в logic.js)
//    profile   {goal, level, days[пн=0…вс=6], min, place, equip:{home[],outdoor[]}, limits[], parq[], prefs{}, test{}}
//    program   {id, idx, start} — id:'smart' = умный режим без программы
//    checkins  {date: {sl, sq, en, so, zones[], st, mo, pain[], ill 0–2, flags[], time, place, skip, score, mode}}
//    sessions  [{id, date, tpl, type, title, start, min, rpe, load, kcal, mode, feel[], note, pts, prog, prs[],
//               ex:[{id, sl, fb easy|ok|hard, sets:[{r, w, t}]}]}]  — по возрастанию даты
//    active    незаконченная тренировка: план + прогресс плеера
//    day       {date, key, plan} — план на сегодня, чтобы замены упражнений не терялись

// ── словари ─────────────────────────────────────────────────

const FIT_MUSCLES={chest:'Грудь',lats:'Широчайшие',upper_back:'Верх спины',traps:'Трапеции',delts_front:'Передняя дельта',delts_side:'Средняя дельта',delts_rear:'Задняя дельта',biceps:'Бицепс',triceps:'Трицепс',forearms:'Предплечья',abs:'Пресс',obliques:'Косые мышцы',lower_back:'Разгибатели спины',glutes:'Ягодицы',hip_flexors:'Сгибатели бедра',quads:'Квадрицепсы',hamstrings:'Бицепс бедра',adductors:'Приводящие',calves:'Икры'};

// Зоны для чек-ина («где болит») → мышечные группы
const FIT_ZONES={
  chest:{n:'Грудь',m:['chest']},
  back:{n:'Спина',m:['lats','upper_back','traps']},
  shoulders:{n:'Плечи',m:['delts_front','delts_side','delts_rear']},
  arms:{n:'Руки',m:['biceps','triceps','forearms']},
  core:{n:'Пресс',m:['abs','obliques']},
  lower_back:{n:'Поясница',m:['lower_back']},
  glutes:{n:'Ягодицы',m:['glutes']},
  quads:{n:'Перед бедра',m:['quads','hip_flexors','adductors']},
  hamstrings:{n:'Зад бедра',m:['hamstrings']},
  calves:{n:'Икры',m:['calves']},
};

const FIT_LIMITS={knees:'Колени',lower_back:'Поясница',shoulders:'Плечи',wrists:'Запястья',elbows:'Локти',neck:'Шея',ankles:'Голеностоп',hypertension:'Высокое давление',pregnancy:'Беременность'};
const FIT_PAIN=['knees','lower_back','shoulders','wrists','elbows','neck','ankles'];

const FIT_EQUIP={dumbbell:'Гантели',barbell:'Штанга',kettlebell:'Гиря',band:'Резинки',pullup_bar:'Турник',dip_bars:'Брусья',bench:'Скамья',step:'Ступенька / опора',ab_wheel:'Ролик для пресса',jump_rope:'Скакалка',machine:'Тренажёры',cable:'Блочный тренажёр',plyo_box:'Тумба для прыжков',treadmill:'Беговая дорожка',bike:'Велотренажёр',rower:'Гребной тренажёр',elliptical:'Эллипс',bicycle:'Велосипед',pool:'Бассейн'};
const FIT_HOME_EQUIP=['dumbbell','kettlebell','band','pullup_bar','dip_bars','bench','step','ab_wheel','jump_rope','barbell','bike','treadmill','bicycle'];
const FIT_OUTDOOR_EQUIP=['pullup_bar','dip_bars','step','jump_rope','band','bicycle'];
const FIT_GYM_EQUIP=Object.keys(FIT_EQUIP).filter(e=>e!=='bicycle');

const FIT_CATS={strength:'Сила',core:'Кор',cardio:'Кардио',hiit:'Интервалы',mobility:'Мобильность',stretch:'Растяжка',warmup:'Разминка'};
const FIT_PATTERNS=['squat','hinge','lunge','push_h','push_v','pull_h','pull_v','carry','core_anti_ext','core_anti_rot','core_rot','core_flex','core_lat','isolation','balance','plyo','conditioning','locomotion','cyclic','mobility','stretch','warmup','breath'];
const FIT_GOALS={fatloss:'Похудеть',muscle:'Набрать мышцы',strength:'Стать сильнее',endurance:'Выносливость',health:'Здоровье и мобильность',fitness:'Поддерживать форму'};
const FIT_LEVELS={novice:'Новичок',intermediate:'Есть опыт',advanced:'Продвинутый'};
const FIT_PLACES={home:'Дом',gym:'Зал',outdoor:'Улица'};
const FIT_TYPES={strength:'Силовая',circuit:'Круговая',hiit:'Интервальная',cardio:'Кардио',run:'Бег',mobility:'Мобильность',recovery:'Восстановление',custom:'Своя',rest:'Отдых'};

const FIT_MODES={
  push:    {name:'Можно прибавить',cls:'good',vol:1.1,rpe:0.5,prog:true},
  normal:  {name:'Обычный день',   cls:'info',vol:1,  rpe:0,  prog:true},
  light:   {name:'Полегче',        cls:'warn',vol:0.65,rpeCap:7,prog:false},
  recovery:{name:'Восстановление', cls:'bad', vol:0.5,rpeCap:5,prog:false},
  rest:    {name:'Отдых',          cls:'bad', vol:0,  prog:false},
  stop:    {name:'Стоп',           cls:'bad', vol:0,  prog:false},
};
const FIT_MODE_ORDER=['stop','rest','recovery','light','normal','push'];

// Назначения по цели: [подходы, [повторы от, до], отдых сек, целевой RPE].
// Ориентиры — рекомендации ACSM/NSCA по силе, гипертрофии и выносливости.
const FIT_RX={
  strength: {main:[4,[4,6],150,8],   acc:[3,[8,12],90,8],   core:[3,null,60,7]},
  muscle:   {main:[4,[6,10],120,8],  acc:[3,[10,15],75,8.5],core:[3,null,60,8]},
  fatloss:  {main:[3,[10,12],60,7.5],acc:[2,[12,15],45,7.5],core:[2,null,45,7]},
  endurance:{main:[3,[12,20],45,7],  acc:[2,[15,20],30,7],  core:[3,null,30,7]},
  health:   {main:[2,[8,12],75,6.5], acc:[2,[10,12],60,6.5],core:[2,null,45,6]},
  fitness:  {main:[3,[8,12],90,7.5], acc:[3,[10,15],60,7.5],core:[3,null,45,7]},
};

// Насколько тип тренировки подходит цели (для умного режима)
const FIT_GOAL_TYPE={
  fatloss:  {strength:1,  circuit:1.1,cardio:1,  hiit:0.9,mobility:0.4},
  muscle:   {strength:1.5,circuit:0.5,cardio:0.5,hiit:0.4,mobility:0.4},
  strength: {strength:1.6,circuit:0.4,cardio:0.4,hiit:0.3,mobility:0.4},
  endurance:{strength:0.8,circuit:1,  cardio:1.3,hiit:1.1,mobility:0.5},
  health:   {strength:1,  circuit:0.7,cardio:1,  hiit:0.3,mobility:1},
  fitness:  {strength:1.1,circuit:0.9,cardio:0.9,hiit:0.8,mobility:0.6},
};

const FIT_ROLE_CATS={main:['strength'],acc:['strength'],core:['core'],mob:['mobility','stretch'],bal:['strength','mobility'],hiit:['hiit'],cardio:['cardio']};
const FIT_FORMAT={strength:'sets',circuit:'circuit',hiit:'circuit',cardio:'cardio',run:'intervals',mobility:'flow',recovery:'flow'};
const FIT_LOADED=['barbell','dumbbell','kettlebell','machine','cable'];
// Главные мышцы паттерна: основное упражнение должно грузить именно их, а не вспомогательные
const FIT_MOVERS={push_h:['chest'],push_v:['delts_front','delts_side'],pull_h:['lats','upper_back'],pull_v:['lats'],squat:['quads','glutes'],hinge:['hamstrings','glutes'],lunge:['quads','glutes']};

// ── мелкие хелперы ──────────────────────────────────────────

function fitParse(k){const[y,m,d]=k.split('-').map(Number);return Date.UTC(y,m-1,d);}
function fitKeyOf(ms){const d=new Date(ms);return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');}
function fitShift(k,n){return fitKeyOf(fitParse(k)+n*86400000);}
function fitDiff(a,b){return Math.round((fitParse(b)-fitParse(a))/86400000);}
function fitDow(k){const d=new Date(fitParse(k)).getUTCDay();return d===0?6:d-1;}
function fitClamp(v,a,b){return Math.max(a,Math.min(b,v));}
function fitNum(n){return String(Math.round(n*10)/10).replace('.',',');}
function fitPlural(n,one,few,many){const a=Math.abs(n)%100,b=a%10;if(a>10&&a<20)return many;if(b>1&&b<5)return few;if(b===1)return one;return many;}
function fitRound(w,step){return Math.round(w/step)*step;}

function fitRng(seed){
  let h=1779033703^String(seed).length;
  const s=String(seed);
  for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);
  let a=(h^h>>>16)>>>0;
  return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}

function fitIndex(exData,progData){
  const ex=(exData&&exData.exercises)||[];
  const byId={};ex.forEach(e=>{byId[e.id]=e;});
  return{ex,byId,tpl:(progData&&progData.templates)||{},programs:(progData&&progData.programs)||[],smart:(progData&&progData.smart)||{}};
}

function fitBMI(body){if(!body||!body.weight||!body.height)return null;const h=body.height/100;return body.weight/(h*h);}
function fitIsLoaded(e){return e.equipment.some(q=>FIT_LOADED.includes(q));}
function fitIsSoft(e){return e.category==='warmup'||e.category==='mobility'||e.category==='stretch';}

// ── нагрузка и история ──────────────────────────────────────

// Нагрузка тренировки по Фостеру: sRPE × минуты
function fitLoad(s){return (s.rpe||5)*(s.min||0);}

// Отношение острой нагрузки (7 дней) к хронической (28 дней) — только при истории от 14 дней
function fitACWR(sessions,date){
  const past=sessions.filter(s=>s.date<date);
  if(!past.length)return null;
  const first=past.reduce((m,s)=>s.date<m?s.date:m,past[0].date);
  const span=fitDiff(first,date);
  if(span<14)return null;
  const y=fitShift(date,-1);
  const sum=(from)=>past.filter(s=>s.date>=from&&s.date<=y).reduce((a,s)=>a+fitLoad(s),0);
  const acute=sum(fitShift(date,-7));
  const chronic=sum(fitShift(date,-28))/Math.min(4,span/7);
  if(chronic<=0)return acute>0?2:null;
  return acute/chronic;
}

// Сколько дней подряд (до вчера включительно) были тренировки
function fitTrainStreak(sessions,date){
  const days=new Set(sessions.filter(s=>s.type!=='recovery'&&s.type!=='mobility').map(s=>s.date));
  let n=0,k=fitShift(date,-1);
  while(days.has(k)){n++;k=fitShift(k,-1);}
  return n;
}

// Личная норма за 14 дней: средние для сравнения и медианы для значений по умолчанию в чек-ине
function fitNorm(checkins,date){
  const vals={sl:[],sq:[],en:[],so:[],st:[],mo:[]};
  for(let i=1;i<=14;i++){
    const c=checkins[fitShift(date,-i)];
    if(!c||c.skip)continue;
    Object.keys(vals).forEach(k=>{if(c[k]!=null)vals[k].push(c[k]);});
  }
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const med=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
  const def={};Object.keys(vals).forEach(k=>{def[k]=med(vals[k]);});
  return{n:vals.en.length,sl:avg(vals.sl),en:avg(vals.en),def};
}

// ── индекс готовности ───────────────────────────────────────

function fitReadiness(ci,checkins,sessions,date){
  checkins=checkins||{};sessions=sessions||[];
  const r={score:65,mode:'normal',reasons:[],warnings:[],soreMuscles:[],soreStrong:false,limits:[],deload:false,acwr:null,skipped:false,lowImpact:false};

  // нагрузка: ACWR, серия тренировок подряд, тяжёлая вчерашняя
  const acwr=fitACWR(sessions,date);r.acwr=acwr;
  let load=1,loadWhy=null;
  if(acwr!=null){
    load=acwr<=0.8?1:acwr<=1.3?1-(acwr-0.8)*0.3:acwr<=1.5?0.85-(acwr-1.3)*1.75:Math.max(0,0.5-(acwr-1.5));
    if(acwr>1.3)loadWhy='Нагрузка за неделю выше привычной (×'+fitNum(acwr)+')';
    else if(acwr<0.8)loadWhy='Нагрузка ниже привычной — мышцы отдохнули';
  }
  const streak=fitTrainStreak(sessions,date);
  const stScore=streak<=1?1:streak===2?0.85:streak===3?0.65:0.45;
  if(stScore<load){load=stScore;loadWhy=streak+' '+fitPlural(streak,'день','дня','дней')+' подряд с тренировками';}
  if(sessions.some(s=>s.date===fitShift(date,-1)&&(s.rpe||0)>=8)){load=Math.max(0,load-0.15);loadWhy='Вчера была тяжёлая тренировка';}

  const norm=fitNorm(checkins,date);
  if(!ci||ci.skip){
    r.skipped=true;
    r.score=Math.round(0.8*65+0.2*load*100);
    r.reasons.push({t:'Без чек-ина — считаю, что день обычный',v:0});
    if(loadWhy)r.reasons.push({t:loadWhy,v:Math.round(20*(load-0.6))});
  }else{
    const sl=ci.sl!=null?ci.sl:7,sq=ci.sq||3,en=ci.en||3,so=ci.so||1,st=ci.st||2,mo=ci.mo||3;
    const slAbs=fitClamp((sl-4)/3.5,0,1),sqN=(sq-1)/4;
    let sleep,slWhy='Сон '+fitNum(sl)+' ч';
    if(norm.n>=4&&norm.sl!=null){
      // отклонение от своей нормы важнее абсолютного числа
      sleep=0.5*slAbs+0.3*sqN+0.2*fitClamp(0.5+(sl-norm.sl)/3,0,1);
      if(sl<norm.sl-0.75)slWhy+=' — меньше твоей нормы';else if(sl>norm.sl+0.75)slWhy+=' — больше обычного';
    }else{
      sleep=0.65*slAbs+0.35*sqN;
      if(sl<6)slWhy+=' — маловато';else if(sl>=7.5)slWhy+=' — хорошо';
    }
    if(sq<=2)slWhy+=', качество так себе';
    let energy=(en-1)/4;
    if(norm.n>=4&&norm.en!=null)energy=0.75*energy+0.25*fitClamp(0.5+(en-norm.en)/2.5,0,1);
    const zoneNames=(ci.zones||[]).map(z=>FIT_ZONES[z]?FIT_ZONES[z].n.toLowerCase():'').filter(Boolean);
    // Веса: сон и энергия сильнее всего предсказывают, как пойдёт тренировка; болящие мышцы
    // дополнительно исключаются из плана, поэтому в индексе у них вес меньше
    const parts=[
      {w:.30,x:sleep,t:slWhy},
      {w:.25,x:energy,t:['','Сил почти нет','Энергии маловато','Энергия средняя','Энергии хватает','Энергия на максимуме'][en]},
      {w:.15,x:1-(so-1)/4,t:['','Мышцы не болят','Лёгкая крепатура','Мышцы заметно болят','Сильная крепатура','Болит почти всё'][so]+(zoneNames.length&&so>1?': '+zoneNames.join(', '):'')},
      {w:.15,x:load,t:loadWhy||'Нагрузка в норме'},
      {w:.10,x:1-(st-1)/4,t:['','Спокойно','Лёгкий стресс','Стресс средний','Сильный стресс','Очень сильный стресс'][st]},
      {w:.05,x:(mo-1)/4,t:['','Настроение на нуле','Настроение так себе','Настроение ровное','Настроение хорошее','Настроение отличное'][mo]},
    ];
    r.score=Math.round(100*parts.reduce((a,p)=>a+p.w*p.x,0));
    r.reasons=parts.map(p=>({t:p.t,v:Math.round(p.w*100*(p.x-0.6))})).filter(p=>Math.abs(p.v)>=2).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)).slice(0,3);
    if(!r.reasons.length)r.reasons.push({t:'Всё ровно — обычный рабочий день',v:0});
    const zm=[];(ci.zones||[]).forEach(z=>{if(FIT_ZONES[z])zm.push(...FIT_ZONES[z].m);});
    if(so>=2)r.soreMuscles=zm;
    r.soreStrong=so>=4;
    r.limits=(ci.pain||[]).slice();
  }
  r.score=fitClamp(r.score,0,100);

  let mode=r.score>=80?'push':r.score>=60?'normal':r.score>=40?'light':'recovery';
  const cap=(m,why)=>{if(FIT_MODE_ORDER.indexOf(m)<FIT_MODE_ORDER.indexOf(mode))mode=m;if(why)r.warnings.push(why);};
  if(ci&&!ci.skip){
    if((ci.flags||[]).length)cap('stop','Боль в груди, головокружение или одышка в покое — сегодня без тренировки. Если симптомы повторяются или не проходят, обратись к врачу.');
    if(ci.ill===2)cap('rest','Температура или ломота — телу нужен отдых. Тренировка сейчас только затянет болезнь.');
    else if(ci.ill===1)cap('light','Лёгкое недомогание — только спокойная нагрузка. Станет хуже — отдыхай.');
    if(ci.sl!=null&&ci.sl<5)cap('light','Сон меньше 5 часов — сегодня без рекордов.');
    (ci.pain||[]).forEach(p=>{
      let n=0;
      for(let i=1;i<=5;i++){const c=checkins[fitShift(date,-i)];if(c&&(c.pain||[]).includes(p))n++;}
      if(n>=2)r.warnings.push('Боль ('+(FIT_LIMITS[p]||p).toLowerCase()+') уже несколько дней — стоит показаться врачу. Пока исключаю нагрузку на эту зону.');
    });
  }
  if(acwr!=null&&acwr>1.5){cap('normal','Нагрузка резко выросла — сегодня облегчаю тренировку.');r.deload=true;}
  let low=r.score<50?1:0;
  for(let i=1;i<=2;i++){const c=checkins[fitShift(date,-i)];if(c&&!c.skip&&c.score!=null&&c.score<50)low++;}
  if(low>=3){r.deload=true;r.warnings.push('Третий день подряд готовность ниже 50 — снижаю объём. Если так пойдёт дальше, стоит разобраться со сном и стрессом.');}
  r.mode=mode;
  if(mode==='light'||mode==='recovery')r.lowImpact=true;
  return r;
}

// ── фильтр упражнений ───────────────────────────────────────

function fitPlaceEquip(profile,place){
  if(place==='gym')return FIT_GYM_EQUIP.slice();
  return ((profile&&profile.equip&&profile.equip[place])||[]).slice();
}

function fitMakeFilter(o){
  const p=o.profile||{},rd=o.readiness||{},body=o.body||{};
  const place=o.place||p.place||'home';
  const bmi=fitBMI(body);
  const limits=new Set([...(p.limits||[]),...(rd.limits||[])]);
  const lvl={novice:1,intermediate:3,advanced:4}[p.level||'novice']||1;
  const age=body.age||30;
  const lowImpact=!!(rd.lowImpact||(p.prefs&&p.prefs.lowImpact)||(bmi&&bmi>=30)||age>=60||limits.has('knees')||limits.has('ankles')||limits.has('pregnancy')||(o.program&&o.program.lowImpact));
  return{
    place,equip:new Set(fitPlaceEquip(p,place)),only:o.program&&o.program.only?new Set(o.program.only):null,
    limits,soreP:new Set(rd.soreMuscles||[]),soreS:rd.soreStrong?new Set(rd.soreMuscles||[]):null,
    maxDif:Math.min(5,lvl+1)-(limits.has('pregnancy')?1:0),targetDif:{1:1.5,3:2.7,4:3.5}[lvl],lvl,
    lowImpact,age,bmi,ban:new Set(o.ban||[]),fav:new Set(o.fav||[]),noRun:!!(p.prefs&&p.prefs.noRun),
  };
}

// soft — для разминки, растяжки и мобильности: сложность и болящие мышцы не мешают
function fitAllowed(e,f,soft){
  if(f.ban.has(e.id))return false;
  if(e.location&&e.location.length&&!e.location.includes(f.place))return false;
  for(const q of e.equipment)if(!f.equip.has(q))return false;
  if(f.only&&e.equipment.some(q=>!f.only.has(q)))return false;
  if((e.avoidIf||[]).some(t=>f.limits.has(t)))return false;
  if(f.lowImpact&&e.impact==='high')return false;
  if(f.noRun&&(e.tags||[]).includes('run'))return false;
  if(soft)return true;
  if(e.difficulty>f.maxDif)return false;
  if(e.primary.some(m=>f.soreP.has(m)))return false;
  if(f.soreS&&e.secondary.some(m=>f.soreS.has(m)))return false;
  return true;
}

function fitSlotMatch(e,slot){
  if(!slot.patterns&&!slot.muscles&&!slot.ids)return true;
  if(slot.patterns&&slot.patterns.includes(e.pattern))return true;
  if(slot.muscles&&e.primary.some(m=>slot.muscles.includes(m)))return true;
  if(slot.ids&&slot.ids.includes(e.id))return true;
  return false;
}

// Утомление мышц за последние 3 дня (в «подходах» с затуханием)
function fitMuscleFatigue(sessions,date,db){
  const f={},decay=[1,0.7,0.35,0.15];
  sessions.forEach(s=>{
    const d=fitDiff(s.date,date);
    if(d<0||d>3)return;
    const k=decay[d]*((s.rpe||6)/7);
    (s.ex||[]).forEach(x=>{
      const e=db.byId[x.id];
      if(!e||fitIsSoft(e))return;
      const n=(x.sets||[]).length;
      e.primary.forEach(m=>{f[m]=(f[m]||0)+n*k;});
      e.secondary.forEach(m=>{f[m]=(f[m]||0)+n*k*0.5;});
    });
  });
  return f;
}

// Итоги последних 7 дней (включая date)
function fitWeekStats(sessions,date){
  const from=fitShift(date,-6);
  const w={n:0,min:0,strengthDays:0,cardioMin:0,hiit:0,days:0};
  const days=new Set(),sd=new Set();
  sessions.forEach(s=>{
    if(s.date<from||s.date>date)return;
    w.n++;w.min+=s.min||0;days.add(s.date);
    if(s.type==='strength'||s.type==='circuit')sd.add(s.date);
    if(s.type==='cardio'||s.type==='run')w.cardioMin+=s.min||0;
    if(s.type==='hiit'){w.hiit++;w.cardioMin+=2*(s.min||0);}
    if(s.type==='circuit')w.cardioMin+=Math.round((s.min||0)*0.5);
  });
  w.days=days.size;w.strengthDays=sd.size;
  return w;
}

// ── программы ───────────────────────────────────────────────

function fitProgramState(prog,st){
  if(!prog||!st)return null;
  const total=prog.sessions?prog.sessions.length:prog.days*prog.weeks;
  const idx=Math.min(st.idx||0,total);
  const week=Math.min(prog.weeks,Math.floor(idx/prog.days)+1);
  const tplId=idx>=total?null:(prog.sessions?prog.sessions[idx]:prog.rotation[idx%prog.rotation.length]);
  return{idx,total,week,weeks:prog.weeks,pct:Math.round(idx/total*100),deload:(prog.deload||[]).includes(week),tplId,done:idx>=total};
}

function fitRecommend(programs,profile,body){
  const lv={novice:1,intermediate:2,advanced:3};
  const bmi=fitBMI(body),age=(body&&body.age)||30,days=(profile.days||[]).length||3;
  const eq=new Set([...fitPlaceEquip(profile,profile.place||'home'),...(profile.place==='gym'?[]:[])]);
  return programs.map(p=>{
    let s=0;
    if((p.goals||[]).includes(profile.goal))s+=3;
    const d=Math.abs((lv[p.level]||1)-(lv[profile.level]||1));s+=d===0?2:d===1?0.5:-2;
    const dd=Math.abs(p.days-days);s+=dd===0?2:dd===1?1:0;
    if((p.place||[]).includes(profile.place))s+=1.5;
    if((p.needs||[]).some(n=>!eq.has(n)))s-=4;
    const tags=p.tags||[];
    if(tags.includes('50+'))s+=age>=50?2:-1.5;
    if(bmi&&bmi>=30){if(p.lowImpact)s+=1;if(tags.includes('impact'))s-=2;}
    if((profile.limits||[]).includes('lower_back')&&tags.includes('back'))s+=1.5;
    if(tags.includes('beginner')&&profile.level!=='novice')s-=2.5;
    s+=0.8*(p.needs||[]).filter(n=>eq.has(n)).length; // программа использует то, что у человека есть
    return{p,s};
  }).sort((a,b)=>b.s-a.s);
}

// ── умный режим: какой тип тренировки нужнее сегодня ─────────

function fitChooseSmart(c){
  const{db,profile:p,readiness:rd,sessions,date,f,rng}=c;
  if(rd.mode==='recovery')return{id:'recovery_flow',why:['Готовность низкая — сегодня восстановление']};
  const gw=FIT_GOAL_TYPE[p.goal]||FIT_GOAL_TYPE.fitness;
  const week=fitWeekStats(sessions,date);
  const fat=fitMuscleFatigue(sessions,date,db);
  const yest=sessions.filter(s=>s.date===fitShift(date,-1));
  const recent=sessions.filter(s=>{const d=fitDiff(s.date,date);return d>=0&&d<=3;});
  let best=null;
  Object.entries(db.smart).forEach(([type,ids])=>{
    ids.forEach(id=>{
      const t=db.tpl[id];if(!t)return;
      let s=gw[type]!=null?gw[type]:0.5;
      if(type==='strength'){if(week.strengthDays<2)s+=0.6;else if(week.strengthDays>=4)s-=0.4;}
      if(type==='cardio'||type==='hiit')s+=0.4*Math.max(0,1-week.cardioMin/150);
      if(type==='hiit'){
        if(week.hiit>=2)s-=0.8;
        if(yest.some(x=>x.type==='hiit'))s-=0.8;
        if(p.prefs&&p.prefs.likeHiit)s+=0.3;
        if(f.lowImpact)s-=0.5;
      }
      if(rd.mode==='light'){if(type==='hiit'||type==='circuit')s-=10;if(type==='mobility')s+=0.3;if(type==='cardio')s+=0.4;}
      const focus=t.focus||[];
      if(focus.length){
        const fresh=focus.reduce((a,m)=>a+Math.max(0,1-(fat[m]||0)/8),0)/focus.length;
        s*=0.3+0.7*fresh;
        const sore=focus.filter(m=>f.soreP.has(m)).length;
        if(sore)s-=1.2*sore/focus.length;
      }
      if(yest.some(x=>x.tpl===id))s-=0.5;else if(recent.some(x=>x.tpl===id))s-=0.2;
      s+=rng()*0.15;
      if(!best||s>best.s)best={id,s,type};
    });
  });
  if(!best)return{id:'mobility_full',why:[]};
  const why=[];
  if(best.type==='strength'&&week.strengthDays<2)why.push('Силовых на этой неделе: '+week.strengthDays+' из 2 — добираем');
  if((best.type==='cardio'||best.type==='hiit')&&week.cardioMin<150)why.push('Кардио за неделю: '+week.cardioMin+' мин из 150');
  return{id:best.id,why};
}

// ── назначения и прогрессия ─────────────────────────────────

function fitRxFor(role,e,x){
  const t=FIT_RX[x.goal]||FIT_RX.fitness;
  const base=role==='main'?t.main:role==='core'?t.core:t.acc;
  let sets=base[0],reps=base[1]?base[1].slice():null,rest=base[2],rpe=base[3],sec=null;
  if(x.lvlN===1){sets=Math.max(2,sets-1);if(x.goal==='strength'&&role==='main')reps=[6,8];}
  if(x.lvlN===3&&role==='main')sets+=1;
  if(x.f.age>=50)rest+=15;
  if(e.measure==='time'){sec={1:25,2:35,3:45}[x.lvlN];if(e.pattern==='balance')sec=30;reps=null;}
  if(e.pattern==='carry'){sec=30+10*x.lvlN;reps=null;}
  if(!reps&&!sec)reps=[10,15];
  if(role==='core'&&reps)reps=x.goal==='strength'?[8,12]:[10,15];
  // тяжёлые упражнения на свой вес (подтягивания, пистолеты) — диапазон ниже
  if(reps&&!fitIsLoaded(e)&&e.pattern!=='isolation'&&e.difficulty>=3)reps=e.difficulty>=4?[3,8]:[5,10];
  if(role==='bal'){sets=2;rest=20;rpe=null;}
  const m=FIT_MODES[x.mode]||FIT_MODES.normal;
  if(x.deload){sets=Math.max(1,Math.round(sets*0.6));if(rpe!=null)rpe-=1.5;}
  else if(m.vol<1)sets=Math.max(1,Math.round(sets*m.vol));
  if(rpe!=null)rpe=Math.round(Math.min(rpe+(m.rpe||0),x.rpeCap,role==='main'?9:8.5)*2)/2;
  return{sets,reps,sec,rest,rpe};
}

function fitExHistory(sessions,id){
  const out=[];
  for(let i=sessions.length-1;i>=0;i--){
    const s=sessions[i];
    (s.ex||[]).forEach(x=>{if(x.id===id&&(x.sets||[]).length)out.push({date:s.date,sets:x.sets,fb:x.fb});});
  }
  return out;
}

function fitInc(e,w){
  if(e.equipment.includes('kettlebell'))return 4;
  if(e.equipment.includes('dumbbell'))return w<10?1:w<20?2:2.5;
  return Math.max(2.5,fitRound(w*0.05,2.5));
}

// Двойная прогрессия: верх диапазона во всех подходах → прибавляем вес
// (или берём следующее упражнение в цепочке, если упражнение на свой вес)
function fitSuggest(e,rx,sessions,allowProg,deload){
  const h=fitExHistory(sessions,e.id);
  const res={kg:null,sec:null,note:'',swapTo:null};
  const loaded=fitIsLoaded(e);
  if(!h.length){
    if(loaded&&rx.reps)res.note='Подбери вес так, чтобы последние 2 повтора давались тяжело';
    return res;
  }
  const last=h[0],prev=h[1];
  if(rx.sec!=null){
    const minT=Math.min(...last.sets.map(s=>s.t||0));
    if(allowProg&&!deload&&minT>=rx.sec&&last.fb!=='hard'){
      if(minT>=60&&e.progression){res.swapTo=e.progression;res.note='Держишь уже '+minT+' сек — пора усложнить';}
      else{res.sec=Math.min(120,Math.max(rx.sec,minT+5));res.note='В прошлый раз '+minT+' сек — добавляем 5';}
    }else if(minT>0&&minT<rx.sec)res.sec=Math.max(15,fitRound(minT,5));
    return res;
  }
  if(!rx.reps)return res;
  const lo=rx.reps[0],hi=rx.reps[1];
  const failed=s=>s.sets.some(x=>(x.r||0)<lo)||s.fb==='hard';
  if(loaded){
    const w0=Math.max(...last.sets.map(s=>s.w||0));
    if(!w0){res.note='Подбери вес так, чтобы последние 2 повтора давались тяжело';return res;}
    const step=e.equipment.includes('dumbbell')?1:e.equipment.includes('kettlebell')?4:2.5;
    const hitTop=last.sets.filter(s=>(s.w||0)===w0).every(s=>(s.r||0)>=hi)&&last.fb!=='hard';
    if(deload){res.kg=Math.max(step,fitRound(w0*0.85,step));res.note='Разгрузка: вес ниже на 15%';}
    else if(hitTop&&allowProg){const inc=fitInc(e,w0);res.kg=w0+inc;res.note='+'+fitNum(inc)+' кг — в прошлый раз все подходы на верхней границе';}
    else if(failed(last)&&prev&&failed(prev)){res.kg=Math.max(step,fitRound(w0*0.9,step));res.note='Снижаем на 10% — два раза подряд было тяжело';}
    else if(failed(last)){res.kg=w0;res.note='Держим вес — в прошлый раз было тяжело';}
    else{res.kg=w0;res.note=hitTop?'Держим вес — сегодня без прибавки':'Как в прошлый раз — добери до '+hi+' повторов';}
    return res;
  }
  const hitTop=last.sets.every(s=>(s.r||0)>=hi)&&last.fb!=='hard';
  if(hitTop&&allowProg&&!deload&&e.progression){res.swapTo=e.progression;res.note='up';}
  else if((last.sets[0].r||0)<Math.max(1,lo-2)&&e.regression){res.swapTo=e.regression;res.note='down';}
  else if(!hitTop)res.note='В прошлый раз: '+last.sets.map(s=>s.r||0).join(' / ')+' — попробуй добавить повтор';
  return res;
}

// ── оценка времени и калорий ────────────────────────────────

function fitItemWork(it,e){
  const sides=e&&e.unilateral?2:1;
  if(it.sec!=null)return it.sec*sides;
  const reps=it.reps?(it.reps[0]+it.reps[1])/2:10;
  return (reps*3.2+6)*sides;
}

function fitEstimate(plan,db,kg){
  kg=kg||70;
  let sec=0,met=0;
  const add=(w,e,r,mm)=>{sec+=w+r;met+=w*(mm||(e?e.met||4:4))+r*1.8;};
  const flow=it=>{const e=db.byId[it.id];for(let i=0;i<(it.sets||1);i++)add(fitItemWork(it,e),e,i<(it.sets||1)-1?(it.rest||10):8);};
  const items=plan.items||[];
  if(plan.format==='circuit'){
    items.filter(it=>it.b==='warm').forEach(flow);
    const circ=items.filter(it=>it.b!=='warm'&&it.b!=='cool'&&it.b!=='fin');
    for(let r=0;r<(plan.rounds||1);r++){
      circ.forEach(it=>{const e=db.byId[it.id];add(fitItemWork(it,e),e,it.rest||15);});
      if(r<(plan.rounds||1)-1)add(0,null,plan.restRound||60);
    }
    items.filter(it=>it.b==='fin'||it.b==='cool').forEach(flow);
  }else if(plan.format==='intervals'){
    const runMet=(db.byId[plan.act]||{}).met||8;
    (plan.segs||[]).forEach(s=>add(s.sec,null,0,s.k==='work'?runMet:s.k==='rest'?3.5:4));
    items.filter(it=>it.b==='cool').forEach(flow);
  }else{
    items.forEach(it=>{
      const e=db.byId[it.id];
      const n=it.sets||1;
      const soft=it.b==='warm'||it.b==='cool'||it.b==='mob'||plan.format==='flow';
      for(let i=0;i<n;i++)add(fitItemWork(it,e),e,i<n-1?(it.rest||0):(soft?8:40));
    });
  }
  return{sec:Math.round(sec),min:Math.max(1,Math.round(sec/60)),kcal:Math.round(kg*met/3600)};
}

// ── сборка тренировки ───────────────────────────────────────

function fitPick(slot,x,used,anchorId){
  const cats=slot.cats||FIT_ROLE_CATS[slot.role]||['strength'];
  const soft=slot.role==='mob'||cats.every(c=>c==='mobility'||c==='stretch'||c==='warmup');
  const cands=x.db.ex.filter(e=>cats.includes(e.category)&&!used.has(e.id)&&fitSlotMatch(e,slot)&&fitAllowed(e,x.f,soft));
  if(!cands.length)return null;
  let best=null;
  cands.forEach(e=>{
    let s=10;
    if(slot.ids){const i=slot.ids.indexOf(e.id);if(i>=0)s+=8-i*0.4;}
    if(slot.patterns&&slot.patterns[0]===e.pattern)s+=2;
    if(slot.muscles)s+=2*e.primary.filter(m=>slot.muscles.includes(m)).length;
    if(!soft)s-=2*Math.abs(e.difficulty-x.f.targetDif);
    if(x.f.fav.has(e.id))s+=4;
    if(anchorId&&e.id===anchorId)s+=9;
    else if(x.recent.has(e.id))s-=slot.role==='main'?1:4;
    if(x.hist.has(e.id))s+=1;
    if(x.light&&e.fatigue>3)s-=2*(e.fatigue-3);
    if(x.f.age>=50&&e.impact==='high')s-=3;
    if(slot.role==='main'&&e.pattern!=='isolation')s+=1;
    if(slot.role==='main'){s+=e.fatigue>=3?1.5:e.fatigue<=1?-2:0;if((FIT_MOVERS[e.pattern]||[]).includes(e.primary[0]))s+=2;}
    if(fitIsLoaded(e)&&!soft)s+=1.5; // есть железо — используем его
    if(x.f.place==='outdoor'&&(e.tags||[]).includes('lying'))s-=4;
    if(slot.role==='main'&&x.f.place==='gym'&&x.lvlN>1&&e.equipment.some(q=>q==='barbell'||q==='dumbbell'))s+=1;
    s+=x.rng()*2;
    if(!best||s>best.s)best={e,s};
  });
  return best.e;
}

function fitWarmup(x,focus,target,used){
  const items=[];let t=0;
  const gen=(x.f.lowImpact||x.goal==='health'||x.f.age>=50?['march_in_place','step_jack']:['jumping_jack','march_in_place']).map(id=>x.db.byId[id]).find(e=>e&&fitAllowed(e,x.f,true));
  if(gen){items.push({id:gen.id,b:'warm',sets:1,sec:60,reps:null,rest:0});t+=70;used.add(gen.id);}
  const pool=x.db.ex.filter(e=>(e.category==='warmup'||e.category==='mobility')&&e.pattern!=='breath'&&!(e.tags||[]).includes('lying')&&!used.has(e.id)&&fitAllowed(e,x.f,true));
  const scored=pool.map(e=>({e,s:2*e.primary.filter(m=>focus.includes(m)).length+e.secondary.filter(m=>focus.includes(m)).length+(e.category==='warmup'?1.5:0)+x.rng()*1.5})).sort((a,b)=>b.s-a.s);
  for(const o of scored){
    if(t>=target||items.length>=6)break;
    const e=o.e;
    const it={id:e.id,b:'warm',sets:1,sec:e.measure==='time'?30:null,reps:e.measure==='reps'?[8,10]:null,rest:0};
    items.push(it);used.add(e.id);t+=fitItemWork(it,e)+8;
  }
  return items;
}

function fitCooldown(x,focus,target,used){
  const items=[];let t=0;
  const pool=x.db.ex.filter(e=>e.category==='stretch'&&!used.has(e.id)&&fitAllowed(e,x.f,true));
  const scored=pool.map(e=>({e,s:2*e.primary.filter(m=>focus.includes(m)).length+e.secondary.filter(m=>focus.includes(m)).length+x.rng()*1.5})).sort((a,b)=>b.s-a.s);
  for(const o of scored){
    if(t>=target||items.length>=4)break;
    const it={id:o.e.id,b:'cool',sets:1,sec:30,reps:null,rest:0};
    items.push(it);used.add(o.e.id);t+=fitItemWork(it,o.e)+8;
  }
  return items;
}

function fitFocusOf(items,db){
  const cnt={};
  items.forEach(it=>{
    if(!['main','acc','core','bal','hiit','fin','cardio'].includes(it.b))return;
    const e=db.byId[it.id];if(!e)return;
    e.primary.forEach(m=>{cnt[m]=(cnt[m]||0)+(it.b==='main'?2:1);});
  });
  return Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).slice(0,5);
}

// Упражнение для слота + назначение + прогрессия
function fitMakeItem(slot,x,used,note){
  const anchor=x.anchor(slot.i,slot.role);
  let e=fitPick(slot,x,used,anchor);
  if(!e)return null;
  let rx=fitRxFor(slot.role,e,x),sug=null;
  if(slot.role!=='mob'&&slot.role!=='bal'){
    sug=fitSuggest(e,rx,x.sessions,x.allowProg,x.deload);
    if(sug.swapTo){
      const sw=x.db.byId[sug.swapTo];
      const f2=Object.assign({},x.f,{maxDif:x.f.maxDif+1});
      if(sw&&!used.has(sw.id)&&fitAllowed(sw,f2)){
        const from=e.name;
        e=sw;rx=fitRxFor(slot.role,e,x);
        const s2=fitSuggest(e,rx,x.sessions,x.allowProg,x.deload);
        const msg=sug.note==='up'?'Ты перерос «'+from+'» — пробуем сложнее':sug.note==='down'?'Вместо «'+from+'» — вариант попроще, чтобы техника была чистой':sug.note;
        sug=Object.assign(s2,{note:msg});
      }else if(sug.note==='up'||sug.note==='down')sug.note='';
    }
  }
  used.add(e.id);
  const it={id:e.id,b:slot.role,sl:slot.i,pr:slot.pr||2,sets:rx.sets,reps:rx.reps,sec:rx.sec,rest:rx.rest,rpe:rx.rpe,kg:null,note:note||''};
  if(slot.role==='mob'){it.sets=1;it.rpe=null;it.rest=0;if(e.measure==='time'){it.sec=40;it.reps=null;}else{it.reps=[8,10];it.sec=null;}}
  if(sug){if(sug.kg!=null)it.kg=sug.kg;if(sug.sec!=null&&it.sec!=null)it.sec=sug.sec;if(sug.note)it.note=sug.note;}
  return it;
}

function fitBuildSets(tpl,x){
  const used=new Set(),items=[];
  let need1=0,got1=0;
  (tpl.slots||[]).forEach((s,i)=>{
    const slot=Object.assign({},s,{i});
    if(slot.pr===1)need1++;
    const it=fitMakeItem(slot,x,used);
    if(it){items.push(it);if(slot.pr===1)got1++;}
  });
  const work=items.filter(it=>it.b!=='mob');
  const viable=work.length>=3&&(need1===0||got1>=Math.ceil(need1/2));
  if(x.mode==='push'&&!x.deload){const m=items.find(it=>it.b==='main');if(m)m.sets++;}
  const focus=fitFocusOf(items,x.db);
  const warm=fitWarmup(x,focus,fitClamp(x.budget*0.12,180,420),used);
  const mobs=items.filter(it=>it.b==='mob');
  const cool=fitCooldown(x,focus,fitClamp(x.budget*0.08,90,240),used);
  const main=items.filter(it=>it.b!=='mob');
  const all=()=>[...warm,...main,...mobs,...cool];
  const est=()=>fitEstimate({format:'sets',items:all()},x.db,x.kg).sec;
  // Не влезаем во время: сначала убираем второстепенное, потом лишние подходы,
  // и только потом — целые упражнения. Разнообразие важнее пятого подхода.
  const lastOf=pr=>{let k=-1;main.forEach((it,i)=>{if(it.pr===pr)k=i;});return k;};
  const cutSets=(filter,min)=>{const it=main.filter(q=>filter(q)&&q.sets>min).sort((a,b)=>b.sets-a.sets)[0];if(it){it.sets--;return true;}return false;};
  const steps=[
    ()=>{const k=lastOf(3);if(k>=0&&main.length>3){main.splice(k,1);return true;}return false;},
    ()=>cutSets(q=>q.b==='main',3),
    ()=>cutSets(q=>q.b!=='main',2),
    ()=>{if(warm.length>3){warm.pop();return true;}return false;},
    ()=>{if(mobs.length>1){mobs.pop();return true;}return false;},
    ()=>{const k=lastOf(2);if(k>=0&&main.length>4){main.splice(k,1);return true;}return false;},
    ()=>cutSets(q=>q.b==='main',2),
    ()=>{if(cool.length>1){cool.pop();return true;}return false;},
    ()=>{const k=lastOf(2);if(k>=0&&main.length>3){main.splice(k,1);return true;}return false;},
    ()=>cutSets(q=>true,1),
    ()=>{if(warm.length>2){warm.pop();return true;}return false;},
    ()=>{if(mobs.length){mobs.pop();return true;}return false;},
    ()=>{if(main.length>2){main.pop();return true;}return false;},
  ];
  let g=0;
  while(est()>x.budget*1.08&&g++<60){if(!steps.some(fn=>fn()))break;}
  // не добиваем время в лёгкий день и на разгрузке — там короче и есть смысл
  if(!x.light&&!x.deload){
    let ei=0;g=0;
    while(est()<x.budget*0.9&&g++<25){
      if(tpl.extra&&ei<tpl.extra.length){
        const slot=Object.assign({},tpl.extra[ei],{i:100+ei,pr:3});ei++;
        const it=fitMakeItem(slot,x,used);
        if(it){main.push(it);if(est()>x.budget*1.08)main.pop();}
        continue;
      }
      const add=main.filter(it=>(it.b==='main'&&it.sets<5)||(it.b==='acc'&&it.sets<4)).sort((a,b)=>(a.b==='main'?0:1)-(b.b==='main'?0:1)||a.sets-b.sets)[0];
      if(add){add.sets++;if(est()>x.budget*1.08){add.sets--;}else continue;}
      if(!main.some(it=>it.b==='fin')&&['fatloss','endurance','fitness'].includes(x.goal)){
        const left=Math.floor((x.budget*0.97-est())/60);
        if(left>=3){
          const fin=fitPick({role:'fin',cats:x.f.lowImpact?['cardio']:['cardio','hiit'],patterns:['conditioning','locomotion','cyclic','plyo']},x,used);
          if(fin){used.add(fin.id);main.push({id:fin.id,b:'fin',pr:3,sets:1,reps:null,sec:Math.min(900,left*60),rest:0,rpe:Math.min(7,x.rpeCap),kg:null,note:'Финишер: ровный рабочий темп'});}
        }
      }
      break;
    }
  }
  return{format:'sets',items:[...warm,...main,...mobs,...cool],viable,focus};
}

function fitBuildCircuit(tpl,x){
  const used=new Set(),circ=[];
  const isHiit=tpl.type==='hiit';
  let need1=0,got1=0;
  (tpl.slots||[]).forEach((s,i)=>{
    const slot=Object.assign({},s,{i});
    if(slot.pr===1)need1++;
    const it=fitMakeItem(slot,x,used);
    if(!it)return;
    if(slot.pr===1)got1++;
    if(isHiit){it.sec={1:30,2:40,3:45}[x.lvlN];it.reps=null;it.rest={1:30,2:20,3:15}[x.lvlN];it.kg=it.kg||null;}
    else{
      const e=x.db.byId[it.id];
      it.reps=e.measure==='time'||e.pattern==='carry'?null:(x.goal==='endurance'?[15,20]:[12,15]);
      it.sec=it.reps?null:{1:30,2:40,3:45}[x.lvlN];
      it.rest=15;
    }
    it.sets=1;
    circ.push(it);
  });
  const viable=circ.length>=3&&(need1===0||got1>=Math.ceil(need1/2));
  const focus=fitFocusOf(circ,x.db);
  const warm=fitWarmup(x,focus,fitClamp(x.budget*0.14,180,420),used);
  const cool=fitCooldown(x,focus,fitClamp(x.budget*0.08,90,240),used);
  const restRound=isHiit?60:90;
  const plan={format:'circuit',items:[],rounds:1,restRound,viable,focus};
  const fin=[];
  const total=r=>fitEstimate({format:'circuit',rounds:r,restRound,items:[...warm,...circ,...fin,...cool]},x.db,x.kg).sec;
  const base=()=>fitEstimate({format:'circuit',rounds:0,items:[...warm,...cool]},x.db,x.kg).sec;
  const roundSec=()=>fitEstimate({format:'circuit',rounds:1,items:circ},x.db,x.kg).sec+restRound;
  const minRounds=isHiit?3:2;
  let rounds=Math.round((x.budget-base())/roundSec());
  while(rounds<minRounds&&circ.length>4){
    let k=-1;circ.forEach((it,i)=>{if(it.pr>=2)k=i;});
    if(k<0)break;
    circ.splice(k,1);
    rounds=Math.round((x.budget-base())/roundSec());
  }
  rounds=fitClamp(rounds,2,6);
  while(rounds>2&&total(rounds)>x.budget*1.08)rounds--;
  if(x.deload||x.light)rounds=Math.max(2,rounds-1);
  else{
    // добираем время: в HIIT — чуть длиннее рабочие отрезки, дальше — финишер
    let g=0;
    const cap={1:30,2:40,3:45}[x.lvlN]+10;
    while(isHiit&&total(rounds)<x.budget*0.9&&g++<4){
      circ.forEach(it=>{if(it.sec!=null&&it.sec<cap)it.sec+=5;});
      if(total(rounds)>x.budget*1.08){circ.forEach(it=>{if(it.sec!=null)it.sec-=5;});break;}
    }
    const left=Math.floor((x.budget*0.97-total(rounds))/60);
    if(left>=3){
      const e=fitPick({role:'fin',cats:x.f.lowImpact?['cardio']:['cardio','hiit'],patterns:['conditioning','locomotion','cyclic','plyo']},x,used);
      if(e){used.add(e.id);fin.push({id:e.id,b:'fin',pr:3,sets:1,reps:null,sec:Math.min(600,left*60),rest:0,rpe:Math.min(7,x.rpeCap),kg:null,note:'Финишер: ровный рабочий темп'});}
    }
  }
  plan.rounds=rounds;
  plan.items=[...warm,...circ,...fin,...cool];
  return plan;
}

function fitBuildCardio(tpl,x){
  const used=new Set();
  const e=fitPick({role:'cardio',cats:['cardio'],ids:tpl.prefer||null},x,used);
  if(!e)return{format:'cardio',items:[],viable:false,focus:[]};
  used.add(e.id);
  const cool=fitCooldown(x,e.primary,150,used);
  const coolSec=fitEstimate({format:'flow',items:cool},x.db,x.kg).sec;
  const warmSec=x.budget>=1500?300:180;
  const main=Math.max(300,fitRound(x.budget-warmSec-coolSec,60));
  const rpe=x.light?4.5:(x.goal==='endurance'&&x.mode==='push'?6.5:5.5);
  const items=[
    {id:e.id,b:'warm',sets:1,sec:warmSec,reps:null,rest:0,rpe:3,kg:null,note:'Разогрев: лёгкий темп'},
    {id:e.id,b:'cardio',sets:1,sec:main,reps:null,rest:0,rpe,kg:null,note:x.light?'Совсем спокойно — дыхание ровное':'Разговорный темп: можешь говорить фразами'},
    ...cool,
  ];
  return{format:'cardio',items,viable:true,focus:e.primary.slice(0,4)};
}

function fitBuildRun(tpl,x){
  const used=new Set();
  const pick=ids=>ids.map(id=>x.db.byId[id]).find(e=>e&&fitAllowed(e,Object.assign({},x.f,{lowImpact:false,noRun:false}),true));
  const act=pick(x.f.place==='gym'?['treadmill_run','run_in_place']:x.f.place==='outdoor'?['run_easy']:['run_in_place','run_easy']);
  const r=tpl.run||{};
  const segs=[{k:'warm',n:'Разминка: быстрая ходьба',sec:300}];
  if(r.cont)segs.push({k:'work',n:'Бег без остановки',sec:r.cont});
  else for(let i=0;i<(r.reps||1);i++){
    segs.push({k:'work',n:'Бег',sec:r.work});
    if(i<r.reps-1)segs.push({k:'rest',n:'Ходьба',sec:r.rest});
  }
  segs.push({k:'cool',n:'Заминка: спокойная ходьба',sec:300});
  if(act)used.add(act.id);
  const cool=fitCooldown(x,['calves','quads','hamstrings','hip_flexors'],150,used);
  const runSec=segs.filter(s=>s.k==='work').reduce((a,s)=>a+s.sec,0);
  const items=[{id:act?act.id:'run_easy',b:'cardio',sets:1,sec:runSec,reps:null,rest:0,rpe:6,kg:null,note:'Бег в темпе, на котором можно говорить'},...cool];
  const notes=[];
  if(x.f.place==='home')notes.push('Бег лучше на улице или на дорожке — дома заменяю бегом на месте.');
  if(x.f.bmi&&x.f.bmi>=30)notes.push('Бег даёт ударную нагрузку. Если колени беспокоят — меняй бег на быструю ходьбу, это тоже работает.');
  return{format:'intervals',items,segs,act:act?act.id:'run_easy',viable:true,focus:['quads','calves','glutes'],notes};
}

function fitBuildFlow(tpl,x){
  const used=new Set(),items=[];
  (tpl.slots||[]).forEach((s,i)=>{
    const slot=Object.assign({},s,{i,role:s.role||'mob'});
    const it=fitMakeItem(slot,x,used);
    if(!it)return;
    const e=x.db.byId[it.id];
    it.sets=1;it.rest=0;it.rpe=null;it.kg=null;
    if(e.measure==='time'||fitIsSoft(e)&&e.measure!=='reps'){it.sec=40;it.reps=null;}else{it.reps=e.pattern==='balance'?null:[10,12];if(!it.reps)it.sec=30;}
    items.push(it);
  });
  const timed=items.filter(it=>it.sec!=null);
  const est=()=>fitEstimate({format:'flow',items},x.db,x.kg).sec;
  let total=est();
  if(timed.length){
    const fixed=total-timed.reduce((a,it)=>a+fitItemWork(it,x.db.byId[it.id]),0);
    const sides=timed.reduce((a,it)=>a+(x.db.byId[it.id].unilateral?2:1),0);
    const sec=fitClamp(fitRound((x.budget-fixed)/sides,5),25,90);
    timed.forEach(it=>{it.sec=sec;});
  }
  let g=0;
  while(est()>x.budget*1.1&&items.length>4&&g++<20){
    let k=-1;items.forEach((it,i)=>{if(it.pr>=2)k=i;});
    items.splice(k<0?items.length-1:k,1);
  }
  return{format:'flow',items,viable:items.length>=3,focus:fitFocusOf(items.map(it=>Object.assign({},it,{b:'acc'})),x.db)};
}

function fitBuildTpl(tpl,tplId,x){
  x.anchor=(slotIdx,role)=>{
    if(x.regen||(role!=='main'&&role!=='acc'))return null;
    for(let i=x.sessions.length-1;i>=0;i--){
      const s=x.sessions[i];
      if(s.tpl!==tplId)continue;
      const e=(s.ex||[]).find(q=>q.sl===slotIdx);
      return e?e.id:null;
    }
    return null;
  };
  const t=tpl.type;
  if(t==='strength')return fitBuildSets(tpl,x);
  if(t==='circuit'||t==='hiit')return fitBuildCircuit(tpl,x);
  if(t==='cardio')return fitBuildCardio(tpl,x);
  if(t==='run')return fitBuildRun(tpl,x);
  return fitBuildFlow(tpl,x);
}

// Главная функция: одинаковые входные данные → одинаковая тренировка
function fitGenerate(c){
  const db=c.db,p=c.profile||{},rd=c.readiness,sessions=c.sessions||[];
  if(rd.mode==='stop'||rd.mode==='rest'){
    return{v:1,date:c.date,type:'rest',format:'none',mode:rd.mode,title:rd.mode==='stop'?'Сегодня без тренировки':'День отдыха',items:[],minutes:0,kcal:0,notes:[],focus:[]};
  }
  const rng=fitRng([c.date,c.regen||0,p.goal,p.level,c.place||p.place,c.time||p.min,c.forceTpl||''].join('|'));
  const prog=c.program&&c.program.id&&c.program.id!=='smart'?db.programs.find(q=>q.id===c.program.id):null;
  const pst=prog?fitProgramState(prog,c.program):null;
  const place=c.place||p.place||'home';
  const f=fitMakeFilter({profile:p,body:c.body,place,readiness:rd,program:prog,ban:c.ban,fav:c.fav});
  const lvlN={novice:1,intermediate:2,advanced:3}[p.level||'novice']||1;
  const age=(c.body&&c.body.age)||30;
  const deload=!!((pst&&pst.deload)||rd.deload);
  const mode=FIT_MODES[rd.mode]||FIT_MODES.normal;
  let rpeCap=10;
  if(lvlN===1&&sessions.length<6)rpeCap=7;
  if(age>=50)rpeCap=Math.min(rpeCap,7.5);
  if(f.limits.has('pregnancy'))rpeCap=Math.min(rpeCap,6);
  if(f.limits.has('hypertension')||(p.prefs&&p.prefs.gentle))rpeCap=Math.min(rpeCap,7);
  if(mode.rpeCap)rpeCap=Math.min(rpeCap,mode.rpeCap);
  if(deload)rpeCap=Math.min(rpeCap,6.5);
  const recentIds=new Set();sessions.slice(-2).forEach(s=>(s.ex||[]).forEach(q=>recentIds.add(q.id)));
  const histIds=new Set();sessions.forEach(s=>(s.ex||[]).forEach(q=>histIds.add(q.id)));
  const x={db,f,rng,sessions,lvlN,goal:(prog&&prog.rx)||p.goal||'fitness',mode:rd.mode,deload,light:rd.mode==='light'||rd.mode==='recovery',
    allowProg:!!mode.prog&&!deload,rpeCap,budget:Math.max(8,c.time||p.min||30)*60,kg:(c.body&&c.body.weight)||70,
    recent:recentIds,hist:histIds,regen:c.regen||0};
  const notes=[];
  let tplId=c.forceTpl||null,fromProgram=false;
  if(!tplId){
    if(rd.mode==='recovery'){tplId='recovery_flow';if(prog&&pst&&!pst.done)notes.push('Тренировку программы переносим — сегодня восстановление.');}
    else if(prog&&pst&&!pst.done){tplId=pst.tplId;fromProgram=true;}
    else{const ch=fitChooseSmart({db,profile:p,readiness:rd,sessions,date:c.date,f,rng});tplId=ch.id;notes.push(...ch.why);}
  }
  let tpl=db.tpl[tplId];
  if(tpl&&rd.mode==='light'&&(tpl.type==='hiit'||tpl.type==='run')){
    notes.push(tpl.type==='run'?'Сегодня полегче — вместо бега спокойное кардио. Программа подождёт.':'Сегодня полегче — вместо интервалов спокойное кардио.');
    tplId='cardio_steady';tpl=db.tpl[tplId];fromProgram=false;
  }
  if(!tpl){tplId='mobility_full';tpl=db.tpl[tplId];fromProgram=false;}
  let built=fitBuildTpl(tpl,tplId,x);
  if(!built.viable&&fromProgram&&prog.rotation){
    const n=prog.rotation.length,cur=prog.rotation.indexOf(tplId);
    for(let k=1;k<n&&!built.viable;k++){
      const altId=prog.rotation[(cur+k)%n];
      if(altId===tplId)continue;
      const b2=fitBuildTpl(db.tpl[altId],altId,x);
      if(b2.viable){notes.push('Нужные мышцы ещё не восстановились — поменял порядок: сегодня «'+db.tpl[altId].name+'».');tplId=altId;tpl=db.tpl[altId];built=b2;}
    }
  }
  if(!built.viable){
    const ch=fitChooseSmart({db,profile:p,readiness:rd,sessions,date:c.date,f,rng});
    const tried=new Set([tplId]);
    let id=ch.id;
    const order=[id,...Object.values(db.smart).flat(),'cardio_steady','mobility_full'];
    for(const alt of order){
      if(tried.has(alt)||!db.tpl[alt])continue;
      tried.add(alt);
      const b2=fitBuildTpl(db.tpl[alt],alt,x);
      if(b2.viable){notes.push('По плану было «'+tpl.name+'», но сегодня для неё не хватает условий — собрал «'+db.tpl[alt].name+'».');tplId=alt;tpl=db.tpl[alt];built=b2;fromProgram=false;break;}
    }
  }
  if(built.notes)notes.push(...built.notes);
  if(f.soreP.size&&['strength','circuit','hiit'].includes(tpl.type))notes.push('Не нагружаю то, что болит: '+[...f.soreP].map(m=>FIT_MUSCLES[m].toLowerCase()).join(', ')+'.');
  if(f.limits.size&&['strength','circuit','hiit'].includes(tpl.type)){const lim=[...f.limits].filter(l=>(rd.limits||[]).includes(l));if(lim.length)notes.push('Берегу: '+lim.map(l=>FIT_LIMITS[l].toLowerCase()).join(', ')+' — упражнения с нагрузкой на эту зону убраны.');}
  if(deload&&tpl.type!=='recovery')notes.push(pst&&pst.deload?'Неделя разгрузки: меньше подходов и веса, чтобы тело успело восстановиться.':'Облегчённый день: меньше объёма, без прибавок.');
  const plan={v:1,date:c.date,tplId,type:tpl.type,format:built.format||FIT_FORMAT[tpl.type],title:tpl.name,desc:tpl.desc||'',mode:rd.mode,
    rounds:built.rounds||null,restRound:built.restRound||null,segs:built.segs||null,act:built.act||null,items:built.items,notes,focus:built.focus||[],
    program:fromProgram&&prog?{id:prog.id,name:prog.name,week:pst.week,weeks:pst.weeks,idx:pst.idx,deload:pst.deload}:null};
  const est=fitEstimate(plan,db,x.kg);
  plan.minutes=est.min;plan.kcal=est.kcal;plan.budget=Math.round(x.budget/60);
  return plan;
}

// Варианты замены упражнения в плане
function fitAlternatives(item,plan,db,f){
  const e=db.byId[item.id];if(!e)return[];
  const soft=['warm','cool','mob'].includes(item.b)||fitIsSoft(e);
  const used=new Set(plan.items.map(i=>i.id));
  const group=c=>c==='mobility'||c==='stretch'||c==='warmup'?'soft':c;
  return db.ex.filter(q=>q.id!==e.id&&!used.has(q.id)&&group(q.category)===group(e.category)&&(q.pattern===e.pattern||q.primary.some(m=>e.primary.includes(m)))&&fitAllowed(q,f,soft))
    .map(q=>({q,s:(q.pattern===e.pattern?3:0)+q.primary.filter(m=>e.primary.includes(m)).length-Math.abs(q.difficulty-e.difficulty)*0.7+(f.fav.has(q.id)?2:0)+(fitIsLoaded(q)&&fitIsLoaded(e)?1.5:0)}))
    .sort((a,b)=>b.s-a.s).slice(0,10).map(o=>o.q);
}

// Пересчёт назначения при замене упражнения в плане
function fitRetarget(item,e,sessions,lvlN){
  const it=Object.assign({},item,{id:e.id,kg:null,note:''});
  if(e.measure==='time'&&it.sec==null){it.sec={1:25,2:35,3:45}[lvlN||1];it.reps=null;}
  if(e.measure==='reps'&&it.reps==null&&!['warm','cool','mob','cardio','fin'].includes(it.b)&&e.pattern!=='carry'){it.reps=[8,12];it.sec=null;}
  if(fitIsLoaded(e)&&it.reps){const s=fitSuggest(e,{reps:it.reps},sessions,true,false);it.kg=s.kg;it.note=s.note;}
  return it;
}

// ── рекорды и статистика ────────────────────────────────────

function fitE1RM(w,r){return w>0&&r>0&&r<=12?w*(1+r/30):0;}

function fitRecords(sessions,db){
  const rec={};
  sessions.forEach(s=>(s.ex||[]).forEach(x=>{
    const e=db.byId[x.id];if(!e||fitIsSoft(e))return;
    const R=rec[x.id]||(rec[x.id]={e1rm:0,kg:0,r:0,bestR:0,bestT:0,date:null});
    (x.sets||[]).forEach(st=>{
      const e1=fitE1RM(st.w||0,st.r||0);
      if(e1>R.e1rm){R.e1rm=e1;R.kg=st.w;R.r=st.r;R.date=s.date;}
      if(!(st.w>0)&&(st.r||0)>R.bestR){R.bestR=st.r;if(!R.e1rm)R.date=s.date;}
      if((st.t||0)>R.bestT){R.bestT=st.t;if(!R.e1rm&&!R.bestR)R.date=s.date;}
    });
  }));
  return rec;
}

function fitSessionPRs(session,prevSessions,db){
  const before=fitRecords(prevSessions,db);const out=[];
  (session.ex||[]).forEach(x=>{
    const e=db.byId[x.id],b=before[x.id];
    if(!e||!b||fitIsSoft(e))return;
    let best=null;
    (x.sets||[]).forEach(st=>{
      const e1=fitE1RM(st.w||0,st.r||0);
      if(e1>0&&b.e1rm>0&&e1>b.e1rm*1.001){if(!best||best.k!=='e1rm'||e1>best.v)best={k:'e1rm',v:e1,t:e.name+': '+fitNum(st.w)+' кг × '+st.r};}
      else if(!best&&!(st.w>0)&&b.bestR>0&&(st.r||0)>b.bestR)best={k:'reps',v:st.r,t:e.name+': '+st.r+' '+fitPlural(st.r,'повтор','повтора','повторов')};
      else if(!best&&b.bestT>0&&(st.t||0)>b.bestT)best={k:'time',v:st.t,t:e.name+': '+st.t+' сек'};
    });
    if(best)out.push(best.t);
  });
  return out;
}

function fitMuscleSets(sessions,from,to,db){
  const m={};
  sessions.forEach(s=>{
    if(s.date<from||s.date>to)return;
    (s.ex||[]).forEach(x=>{
      const e=db.byId[x.id];
      if(!e||fitIsSoft(e)||e.category==='cardio')return;
      const n=(x.sets||[]).length;
      e.primary.forEach(k=>{m[k]=(m[k]||0)+n;});
      e.secondary.forEach(k=>{m[k]=(m[k]||0)+n*0.5;});
    });
  });
  return m;
}

if(typeof module!=='undefined'&&module.exports){
  module.exports={FIT_MUSCLES,FIT_ZONES,FIT_LIMITS,FIT_PAIN,FIT_EQUIP,FIT_HOME_EQUIP,FIT_OUTDOOR_EQUIP,FIT_GYM_EQUIP,FIT_CATS,FIT_PATTERNS,FIT_GOALS,FIT_LEVELS,FIT_PLACES,FIT_TYPES,FIT_MODES,FIT_RX,
    fitShift,fitDiff,fitDow,fitRng,fitIndex,fitBMI,fitLoad,fitACWR,fitTrainStreak,fitNorm,fitReadiness,fitMakeFilter,fitAllowed,fitMuscleFatigue,fitWeekStats,
    fitProgramState,fitRecommend,fitChooseSmart,fitSuggest,fitEstimate,fitGenerate,fitAlternatives,fitRetarget,fitE1RM,fitRecords,fitSessionPRs,fitMuscleSets,fitExHistory,fitIsLoaded};
}
