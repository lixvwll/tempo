// === STATS SCREEN — «Хайлайты» ===
// Неделя или месяц в карточках, человеческим языком: «Чтение — 6 из 7 дней».
// Карточки появляются по мере прокрутки, цифры набегают, новый рекорд — с конфетти,
// карточки с подробностями раскрываются по нажатию. Цвета и шрифты — из текущего дизайна.

let STATS_PERIOD='week';
let ST2_IO=null;
const ST2_MEM={};

// Цвет главной карточки под дизайн и тему: [фон, текст]
const ST2_POST={
  tochka:{dark:['#F2F2EF','#0e0e0e'],light:['#151515','#fff']},
  ritm:{dark:['linear-gradient(160deg,#A3F2DA,#22C7A0 78%,#139FC0 130%)','#141414']},
  metronom:{dark:['#F3EDE2','#1C1A17'],light:['#E5533D','#FBF3E8']},
  sticker:{dark:['linear-gradient(150deg,#FFE68A,#FFB38A)','#141414']},
  mono:{dark:['#D4FF3A','#0A0A0A']},
};
function st2Poster(){const s=ST2_POST[currentSkin()]||ST2_POST.tochka,t=document.documentElement.getAttribute('data-theme');return(t==='light'&&s.light)||s.dark;}
const ST2_GROUPS=[
  ['Привычки',r=>r.startsWith('habit')],
  ['Дела и пары',r=>/^(undo )?(done|skip)$/.test(r)],
  ['Вода',r=>r.startsWith('water')],
  ['Fit',r=>r.startsWith('fit')],
  ['Вход',r=>r==='login'],
  ['Другое',()=>true],
];

// --- данные ---
function st2Keys(n,off){const t=todayKey(),a=[];for(let i=n-1+off;i>=off;i--)a.push(shiftDay(t,-i));return a;}
function st2Period(p){
  const n=p==='month'?30:7,days=st2Keys(n,0),prev=st2Keys(n,n);
  return{p,n,W:p==='week',days,prev,range:fmtDate(dateFromKey(days[0]))+' – '+fmtDate(dateFromKey(days[n-1]))};
}
const st2Sum=(keys,f)=>keys.reduce((a,k)=>a+(f(k)||0),0);
const st2Active=k=>!!(DATA.pointsLog||{})[k];
const st2Hab=(k,id)=>!!((DATA.habitLogs||{})[k]||{})[id];
function st2Tasks(k){let t=0,l=0;Object.entries((DATA.tasks||{})[k]||{}).forEach(([id,x])=>{if(!x||!x.done)return;if(id.startsWith('lec_'))l++;else t++;});return{t,l};}
const st2Mood=k=>(DATA.moods||{})[k]||0;
const st2Water=k=>waterTotalForDay(DATA,k);
function st2Src(keys){
  const m=ST2_GROUPS.map(()=>0);
  keys.forEach(k=>(((DATA.pointsLog||{})[k]||{}).events||[]).forEach(e=>{const g=ST2_GROUPS.findIndex(x=>x[1](e.reason||''));m[g]+=e.n||0;}));
  return ST2_GROUPS.map((g,i)=>[g[0],m[i]]).filter(x=>x[1]>0);
}
function st2Record(P){
  const all=Object.keys(DATA.pointsLog||{});
  let rk=null,rv=-Infinity;all.forEach(k=>{const v=getDayPoints(k);if(v>rv){rv=v;rk=k;}});
  const before=all.filter(k=>k<P.days[0]);let pk=null,pv=-Infinity;before.forEach(k=>{const v=getDayPoints(k);if(v>pv){pv=v;pk=k;}});
  return{isNew:!!rk&&P.days.includes(rk)&&before.length>=3&&rv>pv&&rv>0,rk,rv,pk,pv};
}

// --- форматирование ---
const st2Pl=(n,a,b,c)=>{n=Math.abs(Math.round(n))%100;const m=n%10;if(n>10&&n<20)return c;if(m>1&&m<5)return b;if(m===1)return a;return c;};
const st2Sp=n=>String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const st2Ru=(n,dg=1)=>(Math.round(n*10**dg)/10**dg).toFixed(dg).replace('.',',');
function st2F(n,f){if(f==='sign')return(n<0?'−':'+')+st2Sp(n);if(f==='dec1')return st2Ru(n);if(f==='l')return st2Ru(n)+' л';return st2Sp(n);}
const st2Cap=s=>s[0].toUpperCase()+s.slice(1);
const st2Joy=(emo,icon)=>['tochka','mono'].includes(currentSkin())?ico(icon):emo;
const st2MoodE=v=>(typeof MOODS!=='undefined'&&MOODS[v-1])?MOODS[v-1].e:'·';

// --- анимации ---
function st2Count(el){
  const to=+el.dataset.count,key=el.dataset.key,f=el.dataset.fmt||'int',delay=+(el.dataset.delay||0),dur=+(el.dataset.dur||1100);
  const from=key&&ST2_MEM[key]!=null?ST2_MEM[key]:0;if(key)ST2_MEM[key]=to;
  el.textContent=st2F(from,f);
  setTimeout(()=>{const t0=performance.now();const step=t=>{const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,4);el.textContent=st2F(from+(to-from)*e,f);
    if(p<1)requestAnimationFrame(step);else{el.textContent=st2F(to,f);if(el.dataset.bounce){el.classList.remove('st2-pop');void el.offsetWidth;el.classList.add('st2-pop');}}};requestAnimationFrame(step);},delay);
}
function st2Animate(root){
  // Пока карточка не показалась на экране или не раскрыта, её содержимое не трогаем
  const ok=el=>{const more=el.closest('.st2-more');if(more&&!more.closest('.st2-card.open'))return false;const c=el.closest('.st2-card');return !c||c.classList.contains('in');};
  root.querySelectorAll('[data-count]').forEach(el=>{if(ok(el)&&!el._go){el._go=1;st2Count(el);}});
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    root.querySelectorAll('[data-h]').forEach(el=>{if(ok(el))el.style.height=(+el.dataset.h*100)+'%';});
    root.querySelectorAll('[data-w]').forEach(el=>{if(ok(el))el.style.width=(+el.dataset.w*100)+'%';});
    root.querySelectorAll('[data-ring]').forEach(el=>{if(ok(el))el.style.strokeDashoffset=el.dataset.ring;});
    root.querySelectorAll('[data-pop]').forEach(el=>{if(ok(el))el.classList.add('on');});
    root.querySelectorAll('[data-wl]').forEach(el=>{if(ok(el))el.style.transform=`translateY(${el.dataset.wl}px)`;});
    root.querySelectorAll('[data-confetti]').forEach(el=>{if(ok(el)&&!el._cf){el._cf=1;setTimeout(()=>st2Burst(el),+el.dataset.confetti||0);}});
  }));
}
function st2Burst(el){
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let fx=document.getElementById('st2-fx');
  if(!fx){fx=document.createElement('div');fx.id='st2-fx';fx.className='st2-fx';document.body.appendChild(fx);}
  const b=el.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;
  const cols=['--ch1','--ch2','--ch3','--ch4','--ch5','--hot'];
  for(let k=0;k<30;k++){
    const s=document.createElement('i'),ang=Math.random()*Math.PI*2,dist=70+Math.random()*110;
    s.className='st2-cf';
    s.style.cssText=`left:${x}px;top:${y}px;background:var(${cols[k%cols.length]});--x:${Math.cos(ang)*dist}px;--y:${Math.sin(ang)*dist-40}px;--r:${(Math.random()-.5)*720}deg;animation-delay:${Math.random()*80}ms`;
    fx.appendChild(s);setTimeout(()=>s.remove(),1500);
  }
}
function st2Ring(p,r,sw,col,d){
  const C=2*Math.PI*r,c=r+sw/2;
  return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" style="stroke:color-mix(in srgb,var(${col}) 18%,transparent)" stroke-width="${sw}"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" style="stroke:var(${col});stroke-linecap:var(--cap);--d:${d}ms" stroke-width="${sw}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}" data-ring="${(C*(1-Math.min(1,Math.max(0,p)))).toFixed(2)}"/>`;
}

// --- экран ---
function renderStats(){
  if(STATS_PERIOD!=='month')STATS_PERIOD='week';
  const root=document.getElementById('ms-stats');
  const P=st2Period(STATS_PERIOD);
  Object.keys(ST2_MEM).forEach(k=>delete ST2_MEM[k]);
  root.innerHTML=`
    <div class="st2-hdr st2-enter">
      <div class="st2-rv" style="--i:0"><div class="st2-kick" id="st2-range">${P.range}</div><div class="st2-h1" id="st2-title">Главное за ${P.W?'неделю':'месяц'}</div></div>
      <div class="st2-rv" style="--i:1"><div class="st2-sg" id="st2-sg" style="--k:${P.W?0:1}"><i></i>
        <button class="${P.W?'on':''}" onclick="setStatsPeriod('week')">Неделя</button>
        <button class="${P.W?'':'on'}" onclick="setStatsPeriod('month')">Месяц</button></div></div>
    </div>
    <div class="st2-ct" id="st2-ct"></div>`;
  window.scrollTo(0,0);
  st2Fill();
}
function setStatsPeriod(p){
  if(p===STATS_PERIOD||!document.getElementById('st2-ct'))return;
  STATS_PERIOD=p;
  const P=st2Period(p),sg=document.getElementById('st2-sg');
  sg.style.setProperty('--k',P.W?0:1);
  sg.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===(P.W?0:1)));
  document.getElementById('st2-range').textContent=P.range;
  document.getElementById('st2-title').textContent='Главное за '+(P.W?'неделю':'месяц');
  const ct=document.getElementById('st2-ct'),scrolled=window.scrollY>60;
  if(scrolled)window.scrollTo({top:0,behavior:'smooth'});
  ct.classList.add('out');
  setTimeout(st2Fill,scrolled?320:180);
}
function st2Toggle(card){
  card.classList.toggle('open');
  const h=card.querySelector('.st2-hint');if(h)h.textContent=card.classList.contains('open')?'Нажми, чтобы свернуть':'Нажми, чтобы раскрыть';
  if(card.classList.contains('open'))st2Animate(card.querySelector('.st2-more'));
}
function st2Fill(){
  const ct=document.getElementById('st2-ct');if(!ct)return;
  ct.innerHTML=st2Cards(st2Period(STATS_PERIOD));
  ct.classList.remove('out','st2-enter');void ct.offsetWidth;ct.classList.add('st2-enter');
  st2Animate(ct);
  const cards=[...ct.querySelectorAll('.st2-card')];
  if(ST2_IO)ST2_IO.disconnect();
  if(!('IntersectionObserver' in window)){cards.forEach(c=>{c.classList.add('in');st2Animate(c);});return;}
  let shown=0;
  ST2_IO=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting)return;
    const c=e.target,delay=shown<4?shown*110+150:60;shown++;
    ST2_IO.unobserve(c);
    setTimeout(()=>{c.classList.add('in');st2Animate(c);},delay);
  }),{threshold:.2,rootMargin:'0px 0px -40px 0px'});
  cards.forEach(c=>ST2_IO.observe(c));
}

function st2Cards(P){
  const W=P.W,n=P.n,days=P.days;
  const card=(cls,style,inner,more)=>`<div class="st2-card ${cls}" style="${style||''}"${more?' role="button" tabindex="0" onclick="st2Toggle(this)"':''}>${inner}${more?`<div class="st2-more"><div><div class="st2-in2">${more}</div></div></div><div class="st2-hint">Нажми, чтобы раскрыть</div>`:''}</div>`;
  const out=[];

  // 1. Баллы
  const cur=st2Sum(days,getDayPoints),prev=st2Sum(P.prev,getDayPoints),hasPrev=P.prev.some(st2Active);
  const act=days.filter(st2Active).length,mx=Math.max(Math.abs(cur),Math.abs(prev),1);
  const pc=st2Poster();
  const say=!hasPrev?(W?'Первая неделя с Tempo — отличный старт':'Первый месяц с Tempo — отличный старт')
    :cur>prev?`На ${st2Sp(cur-prev)} больше, чем ${W?'на прошлой неделе':'в прошлом месяце'}`
    :cur===prev?`Ровно как ${W?'на прошлой неделе':'в прошлом месяце'}`
    :`${act} ${st2Pl(act,'активный день','активных дня','активных дней')} — ${W?'неделя':'месяц'} в копилке`;
  const src=st2Src(days),smx=Math.max(...src.map(x=>x[1]),1);
  out.push(card('poster',`background:${pc[0]};color:${pc[1]}`,
    `<span class="st2-stk">${cur>prev||!hasPrev?st2Joy('🎉','achievements'):st2Joy('🌱','habits')}</span>
     <div class="st2-k">Баллы</div>
     <div class="st2-mega" data-count="${cur}" data-fmt="sign" data-key="pts" data-bounce="1" data-dur="1300">+0</div>
     <div class="st2-say st2-say-tight">${say}</div>
     ${hasPrev?`<div class="st2-vs"><div><span>${W?'Прошлая неделя':'Прошлый месяц'}</span><i data-w="${Math.max(0,prev)/mx}" style="--d:300ms"></i><b>${st2Sp(prev)}</b></div>
       <div><span>${W?'Эта неделя':'Этот месяц'}</span><i class="c" data-w="${Math.max(0,cur)/mx}" style="--d:500ms"></i><b>${st2Sp(cur)}</b></div></div>`:''}`,
    src.length?`<div class="st2-src">${src.map(([l,v],k)=>`<div><span>${l}</span><i data-w="${v/smx}" style="--d:${k*60}ms"></i><b>+${v}</b></div>`).join('')}</div>`:''));

  // 2. Новый рекорд
  const rec=st2Record(P);
  if(rec.isNew){
    const rd=dateFromKey(rec.rk),hb=(DATA.habits||[]).filter(h=>st2Hab(rec.rk,h.id)).length,tk=st2Tasks(rec.rk),ft=fitSessionsOf(DATA).some(s=>s.date===rec.rk&&s.type!=='recovery');
    const parts=[hb?`${hb} ${st2Pl(hb,'привычка','привычки','привычек')}`:'',tk.t?`${tk.t} ${st2Pl(tk.t,'дело','дела','дел')}`:'',tk.l?`${tk.l} ${st2Pl(tk.l,'пара','пары','пар')}`:'',ft?'тренировка':''].filter(Boolean);
    out.push(card('','',`<div class="st2-k"><span class="st2-newb" data-confetti="350">Новый рекорд</span></div>
      <div class="st2-say">${st2Cap(fmtDayName(rd))}, ${fmtDate(rd)} — <em data-count="${rec.rv}" data-fmt="sign" data-delay="200">+0</em> за день</div>
      <div class="st2-p">Больше, чем когда-либо. Прошлый рекорд — +${rec.pv} (${fmtDate(dateFromKey(rec.pk))}).${parts.length?' В этот день: '+parts.join(', ')+'.':''}</div>`));
  }

  // 3. Привычки
  const habs=DATA.habits||[];
  if(habs.length){
    const rank=habs.map(h=>[h,days.filter(k=>st2Hab(k,h.id)).length]).sort((a,b)=>b[1]-a[1]);
    const top=rank[0];
    const row=(h,r,anim)=>`<div class="st2-r"><span>${h.emoji||'•'}</span><div class="st2-row${W?'':' m'}">${days.map((k,j)=>`<i class="${st2Hab(k,h.id)?'y':''}"${anim?` data-pop style="--d:${200+r*120+j*(W?50:14)}ms"`:''}></i>`).join('')}</div><b>${days.filter(k=>st2Hab(k,h.id)).length}/${n}</b></div>`;
    out.push(card('','',`<div class="st2-k">${ico('habits')} Привычки</div>
      ${top[1]?`<div class="st2-say">${top[0].emoji||''} ${escHtml(top[0].name)} — <em data-count="${top[1]}" data-delay="200">0</em> из ${n} ${st2Pl(n,'дня','дней','дней')}</div><div class="st2-p">Самая стабильная привычка ${W?'недели':'месяца'}.</div>`
        :`<div class="st2-say">Привычки ждут отметок</div><div class="st2-p">Отметь первую — и здесь появится прогресс.</div>`}
      <div class="st2-dots">${rank.slice(0,3).map(([h],r)=>row(h,r,true)).join('')}</div>`,
      rank.length>3?`<div class="st2-dots st2-dots-more">${rank.slice(3).map(([h],r)=>row(h,r,false)).join('')}</div>`:''));
  }

  // 4. Серия
  const st=DATA.streak||0,best=Math.max(DATA.longestStreak||0,st);
  if(st>0){
    out.push(card('','',`<div class="st2-k"><span class="st2-flick">${st2Joy('🔥','streak')}</span> Серия</div>
      <div class="st2-say"><em data-count="${st}" data-delay="200">0</em> ${st2Pl(st,'день','дня','дней')} подряд</div>
      <div class="st2-p">${best>st?`До твоего рекорда — ${best-st} ${st2Pl(best-st,'день','дня','дней')}. Ты справишься.`:st>1?'Это твой рекорд! Каждый новый день — новая вершина.':'Первый день серии. Заходи завтра — и она вырастет.'}</div>
      <div class="st2-prog"><i data-w="${best?Math.min(1,st/best):1}" style="--d:300ms"></i></div><div class="st2-progl"><span>сейчас ${st}</span><span>рекорд ${best}</span></div>`));
  }

  // 5. Дела
  const tasks=st2Sum(days,k=>st2Tasks(k).t),lec=st2Sum(days,k=>st2Tasks(k).l);
  if(tasks+lec>0){
    const val=k=>{const x=st2Tasks(k);return x.t+x.l;};
    const wd=W?days.map(k=>({l:fmtDayName(dateFromKey(k),true),v:val(k),k}))
      :[0,1,2,3,4,5,6].map(w=>{const ks=days.filter(k=>dayOfWeek(dateFromKey(k))===w);return{l:['пн','вт','ср','чт','пт','сб','вс'][w],v:ks.length?ks.reduce((a,k)=>a+val(k),0)/ks.length:0,w};});
    const wmx=Math.max(...wd.map(x=>x.v),1),wbi=wd.findIndex(x=>x.v===wmx);
    const wdName=W?fmtDayName(dateFromKey(wd[wbi].k)):['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'][wd[wbi].w];
    out.push(card('','',`<div class="st2-k">${ico('day')} Дела</div>
      <div class="st2-say"><em data-count="${tasks}" data-delay="200">0</em> ${st2Pl(tasks,'дело','дела','дел')}${lec?` и ${lec} ${st2Pl(lec,'пара','пары','пар')}`:''}</div>
      <div class="st2-p">Самый продуктивный день — ${wdName}${W?'':' (в среднем)'}.</div>
      <div class="st2-wd">${wd.map((x,k)=>`<div class="${k===wbi?'hi':''}"><i data-h="${Math.max(.06,x.v/wmx)}" style="--d:${200+k*60}ms"></i>${x.l}</div>`).join('')}</div>`,
      W?`<div class="st2-src">${days.map(k=>{const d=dateFromKey(k),v=val(k);return `<div><span>${fmtDayName(d,true)}, ${d.getDate()}</span><i style="width:${v/wmx*100}%;background:var(--ch2)"></i><b>${v}</b></div>`;}).join('')}</div>`:''));
  }

  // 6. Настроение
  const moods=days.map(st2Mood).filter(Boolean);
  if(moods.length){
    const mAvg=moods.reduce((a,b)=>a+b,0)/moods.length,allM=Object.values(DATA.moods||{}).filter(Boolean),mAll=allM.reduce((a,b)=>a+b,0)/allM.length;
    out.push(card('','',`<div class="st2-k">${st2MoodE(Math.round(mAvg))} Настроение</div>
      <div class="st2-say">В среднем <em data-count="${mAvg}" data-fmt="dec1" data-delay="200">0</em> из 5${allM.length>moods.length?` — ${mAvg>=mAll?'выше':'чуть ниже'} обычного`:''}</div>
      <div class="st2-p">${allM.length>moods.length?`Твоё обычное — ${st2Ru(mAll)}.`:`Отмечено ${moods.length} ${st2Pl(moods.length,'день','дня','дней')} из ${n}.`}</div>
      ${W?`<div class="st2-moods">${days.map((k,j)=>`<span><em data-pop style="--d:${250+j*90}ms">${st2Mood(k)?st2MoodE(st2Mood(k)):'·'}</em>${fmtDayName(dateFromKey(k),true)}</span>`).join('')}</div>`:''}`));
  }

  // 7. Вода
  const wDays=days.filter(k=>st2Water(k)>0);
  if(wDays.length){
    const goal=(DATA.water&&DATA.water.goalMl)||2000,avg=wDays.reduce((a,k)=>a+st2Water(k),0)/wDays.length/1000,normD=days.filter(k=>st2Water(k)>=goal).length;
    out.push(card('','',`<div class="st2-k">💧 Вода</div>
      <div class="st2-say"><em data-count="${avg}" data-fmt="l" data-delay="200">0</em> в день</div>
      <div class="st2-p">Норма ${st2Ru(goal/1000)} л — в ${normD} из ${n} ${st2Pl(n,'дня','дней','дней')}.</div>
      <div class="st2-glass"><svg viewBox="0 0 70 92"><defs><clipPath id="st2gl"><path d="M8 6h54l-6 80H14z"/></clipPath></defs><path d="M8 6h54l-6 80H14z" fill="none" style="stroke:var(--border3)" stroke-width="2"/>
        <g clip-path="url(#st2gl)"><rect class="st2-wl" x="0" y="0" width="70" height="200" style="fill:var(--ch2);opacity:.85;transform:translateY(92px)" data-wl="${(92-Math.min(1,avg*1000/goal)*80).toFixed(0)}"/></g></svg>
        <div class="st2-wdays">${days.slice(-14).map((k,j)=>`<i class="${st2Water(k)>=goal?'y':''}" data-pop style="--d:${300+j*40}ms">${dateFromKey(k).getDate()}</i>`).join('')}</div></div>`));
  }

  // 8. Тренировки
  const fits=fitSessionsOf(DATA).filter(s=>days.includes(s.date)&&s.type!=='recovery');
  if(fits.length){
    const fmin=fits.reduce((a,s)=>a+(s.min||0),0),goalN=W?3:13,fm=fits.map(s=>st2Mood(s.date)).filter(Boolean);
    const rings=[[fits.length/goalN,'цель','--ch1'],[fmin/(W?120:520),'минут','--ch3']];
    if(fm.length)rings.push([fm.reduce((a,b)=>a+b,0)/fm.length/5,'настроение','--ch4']);
    out.push(card('','',`<div class="st2-k">${ico('fit')} Тренировки</div>
      <div class="st2-say"><em data-count="${fits.length}" data-delay="200">0</em> ${st2Pl(fits.length,'тренировка','тренировки','тренировок')} · ${fmin} ${st2Pl(fmin,'минута','минуты','минут')}</div>
      <div class="st2-p">${W?'Цель — 3 в неделю'+(fits.length>=3?': выполнена 💪':''):'В среднем '+st2Ru(fits.length/4.3)+' в неделю'}.</div>
      <div class="st2-rings">${rings.map(([p,l,c],k)=>`<div><svg viewBox="0 0 46 46">${st2Ring(p,19,6,c,200+k*150)}</svg><b>${Math.round(Math.min(1,p)*100)}%</b><span>${l}</span></div>`).join('')}</div>`));
  }

  out.push(`<div class="st2-end st2-rv" style="--i:2"><b>${W?'Вот такая неделя':'Вот такой месяц'}${['tochka','mono'].includes(currentSkin())?'':' ✨'}</b><span>Цифры обновляются каждый день</span>
    <button class="st2-btn" onclick="setStatsPeriod('${W?'month':'week'}')">${W?'Посмотреть месяц':'Посмотреть неделю'}</button></div>`);
  return out.join('');
}

// Сравнение двух периодов — используется в недельной сводке (onboarding.js)
function trendOf(cur,prev){
  if(prev===0&&cur===0)return{kind:'flat',pct:0};
  if(prev===0)return cur>0?{kind:'up',pct:100}:{kind:'down',pct:100};
  const diff=cur-prev;
  const pct=Math.round((Math.abs(diff)/Math.abs(prev))*100);
  if(Math.abs(diff)<0.001)return{kind:'flat',pct:0};
  return{kind:diff>0?'up':'down',pct};
}
