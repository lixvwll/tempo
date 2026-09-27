// Проверка базы Tempo Fit: node scripts/fit-validate.js
// Уникальность id, ссылки regression/progression и слотов, словари, обязательные поля.
const fs=require('fs'),path=require('path');
const E=require('../modules/fit-engine.js');
const root=path.join(__dirname,'..');
const ex=JSON.parse(fs.readFileSync(path.join(root,'fit/exercises.json'),'utf8')).exercises;
const pr=JSON.parse(fs.readFileSync(path.join(root,'fit/programs.json'),'utf8'));
const errors=[],warns=[];
const err=m=>errors.push(m),warn=m=>warns.push(m);

const ids=new Set();
const REQ=['id','name','category','pattern','primary','secondary','equipment','location','difficulty','impact','fatigue','measure','met','avoidIf','cues','mistakes'];
const muscles=new Set(Object.keys(E.FIT_MUSCLES)),equip=new Set(Object.keys(E.FIT_EQUIP)),cats=new Set(Object.keys(E.FIT_CATS));
const patterns=new Set(E.FIT_PATTERNS),limits=new Set(Object.keys(E.FIT_LIMITS)),places=new Set(Object.keys(E.FIT_PLACES));

ex.forEach(e=>{
  const w=m=>err(e.id+': '+m);
  if(ids.has(e.id))w('повторяющийся id');
  ids.add(e.id);
  if(!/^[a-z0-9_]+$/.test(e.id))w('id не в формате slug');
  REQ.forEach(k=>{if(e[k]==null||e[k]==='')w('нет поля '+k);});
  if(!cats.has(e.category))w('неизвестная категория '+e.category);
  if(!patterns.has(e.pattern))w('неизвестный паттерн '+e.pattern);
  [...e.primary,...e.secondary].forEach(m=>{if(!muscles.has(m))w('неизвестная мышца '+m);});
  if(!e.primary.length)w('пустой список основных мышц');
  e.equipment.forEach(q=>{if(!equip.has(q))w('неизвестный инвентарь '+q);});
  e.location.forEach(l=>{if(!places.has(l))w('неизвестное место '+l);});
  e.avoidIf.forEach(t=>{if(!limits.has(t))w('неизвестное ограничение '+t);});
  if(!(e.difficulty>=1&&e.difficulty<=5))w('сложность вне 1–5');
  if(!(e.fatigue>=1&&e.fatigue<=5))w('утомление вне 1–5');
  if(!['low','high'].includes(e.impact))w('impact должен быть low|high');
  if(!['reps','time'].includes(e.measure))w('measure должен быть reps|time');
  if(!(e.met>0&&e.met<15))w('подозрительный MET '+e.met);
  if(!Array.isArray(e.cues)||e.cues.length<3||e.cues.length>5)w('техника: нужно 3–5 пунктов');
  if(!Array.isArray(e.mistakes)||e.mistakes.length<2)w('ошибки: нужно минимум 2');
  if(e.regression===e.id||e.progression===e.id)w('ссылается сам на себя');
});
const byId={};ex.forEach(e=>{byId[e.id]=e;});
ex.forEach(e=>{
  ['regression','progression'].forEach(k=>{
    if(e[k]&&!byId[e[k]])err(e.id+': '+k+' → несуществующее '+e[k]);
    if(e[k]&&byId[e[k]]&&byId[e[k]].category!==e.category&&!(byId[e[k]].category==='strength'&&e.category==='hiit')&&!(e.category==='strength'&&byId[e[k]].category==='hiit'))warn(e.id+': '+k+' в другой категории ('+byId[e[k]].category+')');
  });
  if(e.progression&&byId[e.progression]&&byId[e.progression].difficulty<e.difficulty)warn(e.id+': прогрессия проще исходного');
  if(e.regression&&byId[e.regression]&&byId[e.regression].difficulty>e.difficulty)warn(e.id+': регрессия сложнее исходного');
});

const tpl=pr.templates;
const TYPES=['strength','circuit','hiit','cardio','run','mobility','recovery'];
const ROLES=['main','acc','core','mob','bal','hiit','cardio'];
Object.entries(tpl).forEach(([id,t])=>{
  const w=m=>err('шаблон '+id+': '+m);
  if(!t.name)w('нет названия');
  if(!TYPES.includes(t.type))w('неизвестный тип '+t.type);
  (t.focus||[]).forEach(m=>{if(!muscles.has(m))w('неизвестная мышца в focus '+m);});
  [...(t.slots||[]),...(t.extra||[])].forEach((s,i)=>{
    if(!ROLES.includes(s.role))w('слот '+i+': неизвестная роль '+s.role);
    (s.patterns||[]).forEach(p=>{if(!patterns.has(p))w('слот '+i+': неизвестный паттерн '+p);});
    (s.muscles||[]).forEach(m=>{if(!muscles.has(m))w('слот '+i+': неизвестная мышца '+m);});
    (s.cats||[]).forEach(c=>{if(!cats.has(c))w('слот '+i+': неизвестная категория '+c);});
    (s.ids||[]).forEach(x=>{if(!byId[x])w('слот '+i+': несуществующее упражнение '+x);});
    // каждый слот должен находить хоть одного кандидата в базе
    const sc=s.cats||({main:['strength'],acc:['strength'],core:['core'],mob:['mobility','stretch'],bal:['strength','mobility'],hiit:['hiit'],cardio:['cardio']})[s.role];
    const n=ex.filter(e=>sc.includes(e.category)&&(!s.patterns&&!s.muscles&&!s.ids||(s.patterns||[]).includes(e.pattern)||(s.muscles||[]).some(m=>e.primary.includes(m))||(s.ids||[]).includes(e.id))).length;
    if(!n)w('слот '+i+': нет ни одного подходящего упражнения');
  });
  if(['strength','circuit','hiit','mobility','recovery'].includes(t.type)&&!(t.slots||[]).length)w('нет слотов');
  if(t.type==='run'&&!(t.run&&(t.run.cont||(t.run.reps&&t.run.work))))w('нет параметров бега');
  (t.prefer||[]).forEach(x=>{if(!byId[x])w('prefer: несуществующее упражнение '+x);});
});
Object.entries(pr.smart||{}).forEach(([k,list])=>list.forEach(id=>{if(!tpl[id])err('smart.'+k+': нет шаблона '+id);}));
const pids=new Set();
pr.programs.forEach(p=>{
  const w=m=>err('программа '+p.id+': '+m);
  if(pids.has(p.id))w('повторяющийся id');pids.add(p.id);
  ['name','desc','level','days','weeks','minutes'].forEach(k=>{if(p[k]==null)w('нет поля '+k);});
  (p.goals||[]).forEach(g=>{if(!E.FIT_GOALS[g])w('неизвестная цель '+g);});
  if(!E.FIT_LEVELS[p.level])w('неизвестный уровень '+p.level);
  if(p.rx&&!E.FIT_RX[p.rx])w('неизвестный rx '+p.rx);
  (p.needs||[]).concat(p.only||[]).forEach(q=>{if(!equip.has(q))w('неизвестный инвентарь '+q);});
  (p.place||[]).forEach(l=>{if(!places.has(l))w('неизвестное место '+l);});
  const list=p.sessions||p.rotation;
  if(!list||!list.length)w('нет rotation/sessions');
  (list||[]).forEach(id=>{if(!tpl[id])w('нет шаблона '+id);});
  if(p.sessions&&p.sessions.length!==p.days*p.weeks)w('sessions: '+p.sessions.length+' ≠ days×weeks ('+p.days*p.weeks+')');
  (p.deload||[]).forEach(d=>{if(d<1||d>p.weeks)w('разгрузка вне диапазона недель');});
});

const count={};ex.forEach(e=>{count[e.category]=(count[e.category]||0)+1;});
console.log('Упражнений: '+ex.length,count);
console.log('Шаблонов: '+Object.keys(tpl).length+', программ: '+pr.programs.length);
warns.forEach(m=>console.log('  ⚠ '+m));
if(errors.length){errors.forEach(m=>console.log('  ✗ '+m));console.log('Ошибок: '+errors.length);process.exit(1);}
console.log('✓ База валидна');
