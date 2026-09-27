// Самопроверка генератора Tempo Fit: node scripts/fit-selftest.js
// Прогоняет профили и состояния и проверяет, что тренировка безопасна и укладывается во время.
const fs=require('fs'),path=require('path');
const E=require('../modules/fit-engine.js');
const root=path.join(__dirname,'..');
const db=E.fitIndex(JSON.parse(fs.readFileSync(path.join(root,'fit/exercises.json'),'utf8')),JSON.parse(fs.readFileSync(path.join(root,'fit/programs.json'),'utf8')));

const DATE='2026-09-28';
let fails=0,passed=0;
const ok=(cond,msg)=>{if(cond)passed++;else{fails++;console.log('    ✗ '+msg);}};

function profile(o){return Object.assign({goal:'fitness',level:'novice',days:[0,2,4],min:30,place:'home',equip:{home:[],outdoor:['pullup_bar','dip_bars']},limits:[],prefs:{}},o);}
function ci(o){return Object.assign({sl:7.5,sq:4,en:4,so:1,zones:[],st:2,mo:4,pain:[],ill:0,flags:[],skip:false},o);}
function run(name,o){
  const checkins=o.checkins||{};const sessions=o.sessions||[];
  const rd=E.fitReadiness(o.checkin===undefined?ci({}):o.checkin,checkins,sessions,o.date||DATE);
  const plan=E.fitGenerate({db,profile:o.profile,body:o.body||{sex:'m',age:30,height:178,weight:75},checkin:o.checkin,readiness:rd,sessions,date:o.date||DATE,
    regen:o.regen||0,place:o.place,time:o.time,program:o.program||null,ban:[],fav:[]});
  console.log('• '+name+' → готовность '+rd.score+' ('+rd.mode+'), «'+plan.title+'», '+plan.minutes+' мин, '+plan.items.length+' упр.'+(plan.notes.length?' · '+plan.notes[0]:''));
  return{rd,plan};
}
// Общие проверки безопасности
function safe(res,o,label){
  const {plan,rd}=res;
  const f=E.fitMakeFilter({profile:o.profile,body:o.body||{age:30,height:178,weight:75},place:o.place||o.profile.place,readiness:rd,program:o.program?db.programs.find(p=>p.id===o.program.id):null});
  plan.items.forEach(it=>{
    const e=db.byId[it.id];
    ok(!!e,label+': упражнение '+it.id+' есть в базе');
    if(!e)return;
    ok(!(e.avoidIf||[]).some(t=>f.limits.has(t)),label+': '+e.name+' противопоказано ('+e.avoidIf.join(',')+')');
    ok(e.equipment.every(q=>f.equip.has(q))||plan.type==='run',label+': '+e.name+' требует недоступный инвентарь '+e.equipment.join(','));
    const soft=['warm','cool','mob'].includes(it.b)||['warmup','mobility','stretch'].includes(e.category);
    if(!soft){
      ok(!e.primary.some(m=>f.soreP.has(m)),label+': '+e.name+' нагружает болящие мышцы');
      if(f.lowImpact&&plan.type!=='run')ok(e.impact!=='high',label+': '+e.name+' — ударная нагрузка при low-impact');
    }
  });
}
function timeFits(res,budget,label){
  const {plan,rd}=res;
  if(!['normal','push'].includes(rd.mode)||plan.type==='run'||plan.program&&plan.program.deload)return;
  ok(Math.abs(plan.minutes-budget)<=Math.max(2,budget*0.1),label+': время '+plan.minutes+' мин вне бюджета '+budget+' ±10%');
}
const legs=['quads','glutes','hamstrings','calves','adductors','hip_flexors'];

// 1. Новичок дома без инвентаря, 20 минут, плохой сон
{const o={profile:profile({min:20}),checkin:ci({sl:5.5,sq:2,en:2}),time:20};
 const r=run('Новичок дома, 20 мин, плохой сон',o);safe(r,o,'#1');
 ok(['light','recovery'].includes(r.rd.mode),'#1: при плохом сне ожидается лёгкий режим, а не '+r.rd.mode);
 ok(r.plan.minutes<=22,'#1: тренировка не длиннее бюджета');
 ok(r.plan.items.every(it=>db.byId[it.id].equipment.every(q=>q==='step')),'#1: только упражнения без инвентаря');}

// 2. Продвинутый в зале, готовность высокая
{const o={profile:profile({level:'advanced',goal:'muscle',place:'gym',min:60}),checkin:ci({sl:8.5,sq:5,en:5,so:1,st:1,mo:5}),time:60};
 const r=run('Продвинутый в зале, полон сил',o);safe(r,o,'#2');
 ok(r.rd.mode==='push','#2: ожидался режим push, а не '+r.rd.mode);
 ok(r.plan.type!=='rest'&&r.plan.items.filter(i=>['main','acc'].includes(i.b)).length>=4,'#2: полноценная силовая');
 timeFits(r,60,'#2');}

// 3. 55 лет, больные колени
{const o={profile:profile({limits:['knees'],place:'gym',min:45}),body:{sex:'f',age:55,height:165,weight:68},time:45};
 const r=run('55 лет, больные колени',o);safe(r,o,'#3');timeFits(r,45,'#3');
 ok(r.plan.items.every(it=>db.byId[it.id].impact!=='high'),'#3: без прыжков');}

// 4. ИМТ 34, цель похудеть
{const o={profile:profile({goal:'fatloss',min:40}),body:{sex:'m',age:35,height:175,weight:104},time:40};
 const r=run('ИМТ 34, похудение',o);safe(r,o,'#4');timeFits(r,40,'#4');
 ok(r.plan.items.every(it=>db.byId[it.id].impact!=='high'),'#4: без ударной нагрузки');}

// 5. Температура → отдых
{const o={profile:profile({}),checkin:ci({ill:2})};
 const r=run('Температура',o);
 ok(r.rd.mode==='rest'&&r.plan.type==='rest'&&r.plan.items.length===0,'#5: при температуре только отдых');}

// 6. Болят ноги → тренировка без ног
{const o={profile:profile({place:'gym',level:'intermediate',min:45}),checkin:ci({so:4,zones:['quads','hamstrings','glutes','calves']}),time:45,
   program:{id:'upper_lower',idx:1}}; // по программе должен быть «Низ A»
 const r=run('Болят ноги, по плану день ног',o);safe(r,o,'#6');
 const work=r.plan.items.filter(it=>!['warm','cool','mob'].includes(it.b));
 ok(work.every(it=>!db.byId[it.id].primary.some(m=>legs.includes(m))),'#6: в основной части нет упражнений на ноги');
 ok(r.plan.tplId!=='lower_a','#6: день ног заменён');}

// 7. 10 минут времени
{const o={profile:profile({min:10}),time:10};
 const r=run('10 минут',o);safe(r,o,'#7');
 ok(r.plan.minutes<=12,'#7: влезает в 10 минут (получилось '+r.plan.minutes+')');}

// 8. ACWR 1.7 — резкий рост нагрузки
{const sessions=[];
 for(let d=40;d>=15;d-=4)sessions.push({id:'s'+d,date:E.fitShift(DATE,-d),type:'strength',tpl:'full_a',min:30,rpe:5,ex:[]});
 for(let d=6;d>=1;d--)sessions.push({id:'a'+d,date:E.fitShift(DATE,-d),type:'strength',tpl:'full_b',min:60,rpe:8,ex:[]});
 const o={profile:profile({place:'gym',level:'intermediate',min:45}),sessions,time:45};
 const r=run('ACWR высокий',o);safe(r,o,'#8');
 ok(r.rd.acwr>1.5,'#8: ACWR должен быть > 1.5 (получилось '+(r.rd.acwr&&r.rd.acwr.toFixed(2))+')');
 ok(r.rd.deload&&r.rd.mode!=='push','#8: предложена разгрузка');}

// 9. Место — улица
{const o={profile:profile({level:'intermediate',min:30}),place:'outdoor',time:30};
 const r=run('Сегодня на улице',o);safe(r,o,'#9');
 ok(r.plan.items.every(it=>db.byId[it.id].equipment.every(q=>['pullup_bar','dip_bars'].includes(q))),'#9: только уличный инвентарь');}

// 10. Детерминизм
{const o={profile:profile({place:'gym',min:45,level:'intermediate'}),time:45};
 const a=run('Детерминизм: первый прогон',o),b=run('Детерминизм: второй прогон',o);
 ok(JSON.stringify(a.plan)===JSON.stringify(b.plan),'#10: одинаковые входы → одинаковая тренировка');
 const c=run('«Другая тренировка»',Object.assign({},o,{regen:1}));
 ok(JSON.stringify(a.plan.items.map(i=>i.id))!==JSON.stringify(c.plan.items.map(i=>i.id)),'#10: «Другая тренировка» меняет упражнения');}

// 11. Боль в груди → стоп
{const r=run('Боль в груди',{profile:profile({}),checkin:ci({flags:['chest']})});
 ok(r.rd.mode==='stop'&&r.plan.items.length===0,'#11: при красных флагах тренировки нет');}

// 12. Прогрессия: верх диапазона → прибавка веса
{const e=db.byId.db_bench_press;
 const h=[{id:'p',date:E.fitShift(DATE,-3),type:'strength',min:40,rpe:7,ex:[{id:'db_bench_press',fb:'ok',sets:[{r:12,w:20},{r:12,w:20},{r:12,w:20}]}]}];
 const s=E.fitSuggest(e,{reps:[8,12]},h,true,false);
 console.log('• Прогрессия гантелей: '+s.kg+' кг · '+s.note);
 ok(s.kg===22.5,'#12: 20 кг × 12 на верхней границе → 22,5 кг (получилось '+s.kg+')');
 const s2=E.fitSuggest(e,{reps:[8,12]},[{date:DATE,ex:[{id:'db_bench_press',fb:'hard',sets:[{r:6,w:20}]}]},{date:DATE,ex:[{id:'db_bench_press',fb:'hard',sets:[{r:6,w:20}]}]}],true,false);
 ok(s2.kg===18,'#12: два провала подряд → −10% (получилось '+s2.kg+')');
 const bw=db.byId.knee_pushup;
 const s3=E.fitSuggest(bw,{reps:[8,12]},[{date:DATE,ex:[{id:'knee_pushup',fb:'ok',sets:[{r:12},{r:12}]}]}],true,false);
 ok(s3.swapTo==='pushup','#12: свой вес на верхней границе → следующий шаг цепочки (получилось '+s3.swapTo+')');
 const s4=E.fitSuggest(bw,{reps:[8,12]},[{date:DATE,ex:[{id:'knee_pushup',fb:'ok',sets:[{r:12},{r:12}]}]}],false,false);
 ok(!s4.swapTo,'#12: в лёгкий день без усложнения');}

// 13. Прогрессия в генераторе: перерос упражнение → в плане следующее
{const sessions=[{id:'x',date:E.fitShift(DATE,-2),tpl:'full_a',type:'strength',min:30,rpe:6,ex:[{id:'knee_pushup',sl:1,fb:'ok',sets:[{r:15},{r:15}]}]}];
 const o={profile:profile({min:30}),sessions,program:{id:'start_zero',idx:3},time:25};
 const r=run('Перерос отжимания с колен',o);safe(r,o,'#13');
 ok(r.plan.items.some(it=>it.id==='pushup'),'#13: вместо отжиманий с колен — классические');}

// 14. Беременность
{const o={profile:profile({limits:['pregnancy'],goal:'health',min:30}),body:{sex:'f',age:29,height:168,weight:66},time:30};
 const r=run('Беременность',o);safe(r,o,'#14');
 ok(r.plan.items.filter(i=>i.rpe).every(i=>i.rpe<=6),'#14: RPE не выше 6');}

// 15. Боль в запястьях сегодня
{const o={profile:profile({min:30,level:'intermediate'}),checkin:ci({pain:['wrists']}),time:30};
 const r=run('Болят запястья',o);safe(r,o,'#15');
 ok(!r.plan.items.some(it=>['pushup','knee_pushup','burpee','mountain_climber','high_plank'].includes(it.id)),'#15: без упоров на ладони');}

// 16. Бег с нуля дома и на улице
{const o={profile:profile({goal:'endurance'}),program:{id:'run_zero',idx:0},place:'outdoor'};
 const r=run('Бег с нуля, неделя 1',o);
 ok(r.plan.type==='run'&&r.plan.segs.filter(s=>s.k==='work').length===8,'#16: 8 отрезков бега');
 const r2=run('Бег с нуля, плохой день',Object.assign({},o,{checkin:ci({sl:5,sq:2,en:2,so:3,st:4})}));
 ok(r2.plan.type==='cardio','#16: в лёгкий день бег заменён спокойным кардио');}

// 17. Восстановление при низкой готовности
{const r=run('Всё плохо',{profile:profile({}),checkin:ci({sl:4.5,sq:1,en:1,so:5,st:5,mo:1}),time:30});
 ok(r.rd.mode==='recovery'&&r.plan.type==='recovery','#17: низкая готовность → восстановление');}

// 18. Все программы × несколько профилей: собираются, безопасны, во времени
{const bodies=[{sex:'m',age:25,height:180,weight:78},{sex:'f',age:52,height:162,weight:80}];
 let n=0;
 db.programs.forEach(p=>{
   const total=p.sessions?p.sessions.length:p.days*p.weeks;
   [0,1,2,Math.floor(total/2),total-1].forEach(idx=>{
     bodies.forEach(body=>{
       ['home','gym'].forEach(place=>{
         const prof=profile({level:p.level,goal:(p.goals||['fitness'])[0],place,min:p.minutes,equip:{home:['dumbbell','band','step','pullup_bar','bench'],outdoor:['pullup_bar','dip_bars']}});
         const o={profile:prof,body,program:{id:p.id,idx},time:p.minutes,place};
         const rd=E.fitReadiness(ci({}),{},[],DATE);
         const plan=E.fitGenerate({db,profile:prof,body,checkin:ci({}),readiness:rd,sessions:[],date:DATE,place,time:p.minutes,program:{id:p.id,idx}});
         n++;
         const label='#18 '+p.id+'['+idx+'] '+place+' '+body.age;
         ok(plan.items.length>0,label+': пустая тренировка');
         safe({plan,rd},o,label);
         if(plan.type!=='run'&&!(plan.program&&plan.program.deload))ok(Math.abs(plan.minutes-p.minutes)<=Math.max(3,p.minutes*0.15),label+': время '+plan.minutes+' vs '+p.minutes);
       });
     });
   });
 });
 console.log('• Все программы: '+n+' сборок');}

// 19. Готовность: личная норма и ACWR без истории
{const checkins={};for(let i=1;i<=10;i++)checkins[E.fitShift(DATE,-i)]={sl:6,sq:3,en:3,so:1,st:2,mo:3,score:65};
 const a=E.fitReadiness(ci({sl:6,sq:3,en:3}),checkins,[],DATE);
 const b=E.fitReadiness(ci({sl:6,sq:3,en:3}),{},[],DATE);
 console.log('• Личная норма: с нормой '+a.score+', без '+b.score);
 ok(a.score>=b.score,'#19: сон, равный личной норме, не штрафуется сильнее');
 ok(E.fitReadiness(ci({}),{},[],DATE).acwr===null,'#19: ACWR не считается без 14 дней истории');}

console.log('\n'+(fails?'✗ Провалено: '+fails+', пройдено: '+passed:'✓ Все проверки пройдены: '+passed));
process.exit(fails?1:0);
