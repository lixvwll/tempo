// === РАДОСТЬ: звуки, частицы, монеты, комбо и большие моменты ===
// Лестница наград: отметка → комбо → цель дня → итог дня → серия → уровень → сундук недели.
// Подключено к addPoints (logic.js): любая отметка в любой вкладке получает отклик в точке касания.
// У каждого дизайна свой тембр звука и свои частицы. Звук выключается в Настройках.

const JY_MILESTONES=[3,7,14,30,50,100,150,200,365];
const JY_FREEZE_AT=[7,30,100,200,365];
const JY_LEVELS=['','Новичок','Первые шаги','В темпе','Ровный шаг','Ритмичный','Устойчивый','Метроном','Дирижёр','Виртуоз','Маэстро','Легенда'];
const jyLevelOf=xp=>Math.floor(Math.sqrt(Math.max(0,xp)/120))+1;
const jyLevelXP=l=>120*(l-1)*(l-1);
const jyLevelName=l=>JY_LEVELS[l]||('Легенда '+(l-10));
const jyGoal=()=>(DATA&&DATA.dayGoal)||40;
const jySkin=()=>(typeof currentSkin==='function'?currentSkin():'tochka');
const jyReduced=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const jyJoy=(emo,icon)=>['tochka','mono'].includes(jySkin())?ico(icon):emo;
function jyWeekKeys(){const t=todayKey(),dw=dayOfWeek(dateFromKey(t));return Array.from({length:7},(_,k)=>shiftDay(t,k-dw));}
function jyChestState(){const ks=jyWeekKeys(),n=ks.filter(k=>(DATA.goalDays||{})[k]).length;return{ks,n,open:!!(DATA.chests||{})[ks[0]],ready:n>=5&&!(DATA.chests||{})[ks[0]]};}

// ---------- звук: синтез прямо в браузере, без файлов ----------
let JY_AC=null;
function jyAc(){
  if(DATA&&DATA.sound===false)return null;
  if(!JY_AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{JY_AC=new C();}catch(e){return null;}}
  if(JY_AC.state==='suspended')JY_AC.resume();
  return JY_AC;
}
const JY_TIMBRE={tochka:{w:'sine',a:.005,d:.45,v:.12,h:.25},ritm:{w:'triangle',a:.002,d:.22,v:.17,h:.4},metronom:{w:'sine',a:.003,d:.6,v:.13,h:.35,tick:1},sticker:{w:'sine',a:.003,d:.22,v:.15,bend:1.35},mono:{w:'square',a:.001,d:.13,v:.045}};
function jyNote(f,t0,dur,vol){
  const c=jyAc();if(!c)return;const T=JY_TIMBRE[jySkin()]||JY_TIMBRE.tochka,now=c.currentTime+(t0||0),d=dur||T.d,v=vol||T.v;
  const g=c.createGain();g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(v,now+T.a);g.gain.exponentialRampToValueAtTime(.0001,now+d);g.connect(c.destination);
  const o=c.createOscillator();o.type=T.w;o.frequency.setValueAtTime(f,now);if(T.bend)o.frequency.exponentialRampToValueAtTime(f*T.bend,now+.07);o.connect(g);o.start(now);o.stop(now+d+.05);
  if(T.h){const o2=c.createOscillator(),g2=c.createGain();o2.type='sine';o2.frequency.setValueAtTime(f*2,now);g2.gain.setValueAtTime(T.h,now);o2.connect(g2).connect(g);o2.start(now);o2.stop(now+d+.05);}
}
function jyNoise(t0,dur,freq,vol){
  const c=jyAc();if(!c)return;const now=c.currentTime+t0,len=Math.floor(c.sampleRate*dur),b=c.createBuffer(1,len,c.sampleRate),ch=b.getChannelData(0);
  for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*(1-i/len);
  const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=2;const g=c.createGain();g.gain.value=vol;s.connect(f).connect(g).connect(c.destination);s.start(now);
}
const JY_SC=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.51,1567.98,1760,2093];
const JYS={
  pop:k=>{jyNote(JY_SC[Math.min(k,JY_SC.length-1)]);if((JY_TIMBRE[jySkin()]||{}).tick)jyNoise(0,.04,2400,.2);},
  coin:()=>{jyNote(1318.51,0,.08,.08);jyNote(1975.53,.06,.26,.08);},
  undo:()=>jyNote(392,0,.16,.08),
  fanfare:()=>{[523.25,659.25,783.99,1046.5].forEach((f,i)=>jyNote(f,i*.1,.45));[523.25,659.25,783.99,1046.5].forEach(f=>jyNote(f,.45,1.1,.07));},
  star:i=>{jyNote([783.99,987.77,1318.51][i],0,.55);jyNote([1567.98,1975.53,2637][i],.05,.4,.05);},
  level:()=>{[392,523.25,659.25,783.99,1046.5,1318.51].forEach((f,i)=>jyNote(f,i*.07,.35));[523.25,659.25,783.99,1046.5].forEach(f=>jyNote(f,.5,1.4,.06));},
  shake:k=>{jyNoise(0,.12,180+k*60,.4);jyNote(110+k*20,0,.15,.09);},
  open:()=>{jyNoise(0,.5,900,.28);[1046.5,1318.51,1567.98,2093,2637].forEach((f,i)=>jyNote(f,.1+i*.06,.5,.09));},
  whoosh:()=>jyNoise(0,.4,1400,.22),
};
function jyBuzz(p){if(DATA&&DATA.sound===false)return;if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return;try{navigator.vibrate&&navigator.vibrate(p||8);}catch(e){}}

// ---------- частицы на canvas ----------
const JY_PAL={tochka:['#ffffff','#d9d9d9','#FFC83D','#ffe9a8','#9a9a9a'],ritm:['#2FD9AE','#3BB8E0','#FF8A5B','#B9A6FF','#FFD84D'],metronom:['#E5533D','#D9A441','#A9C48F','#F3EDE2','#8a7f72'],sticker:['#FFD84D','#A8D8FF','#A3F2DA','#FFB38A','#C9B8FF','#FFB3D1'],mono:['#D4FF3A','#EDEDED','#D4FF3A','#8a8a8a']};
const JY_EMO={sticker:['⭐','💛','✨','🎉','🌈','💖','🍀'],metronom:['♪','♫','♩','♬']};
let JY_CV=null,JY_CX=null,JY_PS=[],JY_RUN=false,JY_DPR=1;
function jyCanvas(){
  if(!JY_CV){JY_CV=document.createElement('canvas');JY_CV.className='jy-cv';document.body.appendChild(JY_CV);JY_CX=JY_CV.getContext('2d');window.addEventListener('resize',jySize);jySize();}
  return JY_CV;
}
function jySize(){if(!JY_CV)return;JY_DPR=window.devicePixelRatio||1;JY_CV.width=innerWidth*JY_DPR;JY_CV.height=innerHeight*JY_DPR;}
function jyLoop(){
  const X=JY_CX;X.setTransform(JY_DPR,0,0,JY_DPR,0,0);X.clearRect(0,0,innerWidth,innerHeight);
  JY_PS=JY_PS.filter(p=>{
    p.vx*=p.dr;p.vy=p.vy*p.dr+p.g;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;p.t++;p.life--;
    X.save();X.globalAlpha=Math.min(1,p.life/30);X.translate(p.x,p.y);
    if(p.k==='px'){X.fillStyle=p.c;X.fillRect(-p.s/2,-p.s/2,p.s,p.s);}
    else{
      X.rotate(p.r);
      if(p.k==='rect'){X.scale(1,Math.cos(p.t*p.fl));X.fillStyle=p.c;X.fillRect(-p.s/2,-p.s/3,p.s,p.s*.66);}
      else if(p.k==='cap'){X.scale(1,Math.cos(p.t*p.fl));X.fillStyle=p.c;X.beginPath();if(X.roundRect)X.roundRect(-p.s*.25,-p.s*.7,p.s*.5,p.s*1.4,p.s*.25);else X.rect(-p.s*.25,-p.s*.7,p.s*.5,p.s*1.4);X.fill();}
      else if(p.k==='dot'){X.fillStyle=p.c;X.beginPath();X.arc(0,0,p.s/2,0,6.283);X.fill();}
      else if(p.k==='star'){X.fillStyle=p.c;X.beginPath();for(let i=0;i<10;i++){const rr=i%2?p.s*.22:p.s*.55,an=i*Math.PI/5;X.lineTo(Math.cos(an)*rr,Math.sin(an)*rr);}X.fill();}
      else if(p.k==='emo'){X.font=`${p.s}px serif`;X.textAlign='center';X.textBaseline='middle';X.fillStyle=p.c;X.fillText(p.e,0,0);}
      else if(p.k==='spark'){X.strokeStyle=p.c;X.lineWidth=2;X.beginPath();X.moveTo(0,0);X.lineTo(-p.vx*3,-p.vy*3);X.stroke();}
    }
    X.restore();
    return p.life>0&&p.y<innerHeight+40;
  });
  if(JY_PS.length)requestAnimationFrame(jyLoop);else{JY_RUN=false;X.clearRect(0,0,innerWidth,innerHeight);}
}
function jyKinds(){const s=jySkin();return s==='mono'?['px']:s==='ritm'?['cap','rect','dot']:s==='sticker'?['emo','dot','star']:s==='metronom'?['emo','rect','dot']:['rect','dot','star'];}
function jyParticle(x,y,ang,sp,o){
  o=o||{};if(jyReduced())return;jyCanvas();
  const s=jySkin(),pal=JY_PAL[s]||JY_PAL.tochka,ks=o.kinds||jyKinds(),k=ks[Math.floor(Math.random()*ks.length)],em=JY_EMO[s];
  const p={x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,g:o.g!=null?o.g:.22,dr:o.dr||.985,r:Math.random()*6,vr:(Math.random()-.5)*.3,t:0,fl:.08+Math.random()*.12,life:o.life||(90+Math.random()*50),
    k,c:pal[Math.floor(Math.random()*pal.length)],s:(o.size||9)*(.7+Math.random()*.7)};
  if(k==='emo'){p.e=em?em[Math.floor(Math.random()*em.length)]:'✨';p.s=(o.size||9)*2.1;if(s==='metronom')p.c=['#E5533D','#D9A441','#A9C48F'][Math.floor(Math.random()*3)];}
  if(k==='px'){p.vr=0;p.s=Math.random()<.5?6:9;p.dr=.96;}
  JY_PS.push(p);if(!JY_RUN){JY_RUN=true;requestAnimationFrame(jyLoop);}
}
function jyBurstAt(x,y,n,sp,o){for(let i=0;i<(n||24);i++)jyParticle(x,y,Math.random()*6.283,(sp||7)*(.4+Math.random()*.8),o);}
function jyBurstEl(el,n,sp,o){if(!el)return;const r=el.getBoundingClientRect();jyBurstAt(r.left+r.width/2,r.top+r.height/2,n,sp,o);}
function jyCannons(){const W=innerWidth,H=innerHeight;for(let i=0;i<70;i++)setTimeout(()=>{jyParticle(0,H*.82,-Math.PI/3+(Math.random()-.5)*.6,13+Math.random()*7,{size:10});jyParticle(W,H*.82,-Math.PI*2/3+(Math.random()-.5)*.6,13+Math.random()*7,{size:10});},i*9);}
function jyFireworks(n){for(let k=0;k<(n||4);k++)setTimeout(()=>{jyBurstAt(innerWidth*(.2+Math.random()*.6),innerHeight*(.15+Math.random()*.25),40,6,{g:.08,dr:.97,kinds:jySkin()==='mono'?['px']:['dot','spark'],size:6,life:70});jyNote(JY_SC[4+k%5],0,.3,.06);jyNoise(0,.15,500,.2);},k*380);}
function jyRain(n){for(let i=0;i<(n||60);i++)setTimeout(()=>jyParticle(Math.random()*innerWidth,-20,Math.PI/2,2+Math.random()*3,{g:.12,size:10,life:220}),i*25);}
function jyFlash(){if(jyReduced())return;const f=document.createElement('div');f.className='jy-flash';document.body.appendChild(f);setTimeout(()=>f.remove(),520);}
function jyShake(){if(jyReduced())return;const a=document.getElementById('app');if(!a)return;a.classList.remove('jy-shake');void a.offsetWidth;a.classList.add('jy-shake');}

// ---------- монеты и «+5» ----------
let JY_TAP={x:innerWidth/2,y:innerHeight/2,t:0},JY_COMBO=0,JY_LAST=0,JY_PILL_HOLD=0;
document.addEventListener('pointerdown',e=>{JY_TAP={x:e.clientX,y:e.clientY,t:Date.now()};},true);
function jyPlus(x,y,txt){if(jyReduced())return;const d=document.createElement('div');d.className='jy-plus';d.textContent=txt;d.style.left=x+'px';d.style.top=y+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),950);}
function jyCoins(x,y,n,onDone){
  const pill=document.getElementById('tb-pts');
  if(!pill||!pill.offsetParent||jyReduced()){if(onDone)onDone();return;}
  const b=pill.getBoundingClientRect(),bx=b.left+14,by=b.top+b.height/2;let got=0;
  for(let i=0;i<n;i++){
    const c=document.createElement('i');c.className='jy-coin';document.body.appendChild(c);
    const sx=x+(Math.random()-.5)*(n>1?40:0),sy=y+(Math.random()-.5)*(n>1?20:0),mx=(sx+bx)/2+(Math.random()-.5)*120,my=Math.min(sy,by)-60-Math.random()*80;
    const an=c.animate([{transform:`translate(${sx}px,${sy}px) scale(.3)`,opacity:0},{transform:`translate(${mx}px,${my}px) scale(1.25)`,opacity:1,offset:.45},{transform:`translate(${bx}px,${by}px) scale(.5)`,opacity:1}],
      {duration:700+Math.random()*180,delay:i*70,easing:'cubic-bezier(.45,0,.35,1)',fill:'forwards'});
    an.onfinish=()=>{c.remove();got++;JYS.coin();pill.classList.remove('jy-bump');void pill.offsetWidth;pill.classList.add('jy-bump');if(got===n){JY_PILL_HOLD=0;updateTopBar();if(onDone)onDone();}};
  }
}
function jyCombo(m){
  document.querySelectorAll('.jy-combo').forEach(x=>x.remove());
  const c=document.createElement('div');c.className='jy-combo';c.innerHTML=`<b>Комбо ×${m}!</b><i></i>`;document.body.appendChild(c);
  if(m>=4)jyShake();
  setTimeout(()=>c.remove(),4000);
}

// Вызывается из addPoints (logic.js) при каждом начислении
function joyOnPoints(n,reason){
  if(!DATA)return;
  const tap=Date.now()-JY_TAP.t<900&&reason!=='login';
  if(tap&&n>0){
    const now=Date.now();JY_COMBO=now-JY_LAST<4000?JY_COMBO+1:0;JY_LAST=now;
    const big=reason==='water goal bonus';
    JYS.pop(big?8:JY_COMBO);jyBuzz(big?[15,30,15]:8);
    jyBurstAt(JY_TAP.x,JY_TAP.y,big?50:12+Math.min(JY_COMBO,6)*4,big?9:4+Math.min(JY_COMBO,6),{size:big?9:7});
    jyPlus(JY_TAP.x,JY_TAP.y-(big?30:0),'+'+n);
    JY_PILL_HOLD=Date.now()+1400;
    jyCoins(JY_TAP.x,JY_TAP.y,big?5:1);
    if(JY_COMBO>=1&&!big)jyCombo(JY_COMBO+1);
  }else if(tap&&n<0)JYS.undo();
  setTimeout(jyAfterPoints,30);
}
function jyAfterPoints(){
  if(!DATA)return;
  const t=todayKey();
  if(!DATA.goalDays)DATA.goalDays={};
  if(!DATA.goalDays[t]&&getDayPoints(t)>=jyGoal()){DATA.goalDays[t]=true;saveData();jyGoalHit();}
  const L=jyLevelOf(DATA.points||0);
  if(L>(DATA.level||1)){DATA.level=L;saveData();jyQueue('level');}
}

// ---------- цель дня ----------
function jyGoalHit(){
  JYS.fanfare();jyBuzz([20,40,20]);jyFlash();jyCannons();
  const ring=document.querySelector('.jy-goal');if(ring)jyBurstEl(ring,60,9,{size:10});
  const b=document.createElement('div');b.className='jy-ban';
  const st=jyChestState();
  b.innerHTML=`<span class="e">${jyJoy('🎯','achievements')}</span><div><b>Цель дня взята!</b><span>${st.ready?'Сундук недели открыт — загляни на главную':'Засчитано дней на неделе: '+st.n+' из 5 до сундука'}</span></div>`;
  document.body.appendChild(b);setTimeout(()=>{b.classList.add('out');setTimeout(()=>b.remove(),400);},3000);
  if(CURRENT_SCREEN==='home')setTimeout(()=>renderHome(),700);
}

// ---------- очередь больших моментов ----------
let JY_Q=[],JY_BUSY=false;
function jyQueue(k){if(!JY_Q.includes(k))JY_Q.push(k);setTimeout(jyNext,600);}
function jyNext(){
  if(JY_BUSY||!JY_Q.length||!DATA||!document.getElementById('screen-app').classList.contains('active'))return;
  const k=JY_Q.shift();JY_BUSY=true;
  ({level:jyLevelModal,streak:jyStreakModal}[k]||(()=>{JY_BUSY=false;jyNext();}))();
}
function jyModal(html,onGo){
  const m=document.createElement('div');m.className='jy-mo';m.innerHTML=html;document.body.appendChild(m);
  const close=()=>{m.classList.add('out');setTimeout(()=>{m.remove();JY_BUSY=false;jyNext();},300);};
  m.addEventListener('click',e=>{const b=e.target.closest('[data-jy]');if(!b)return;if(b.dataset.jy==='go'&&onGo)onGo(b,close);else close();});
  return m;
}
const JY_RAYS='<div class="jy-rays"></div>';

// итог дня: три звезды
function jyDayStars(){
  const t=todayKey(),habs=DATA.habits||[],log=(DATA.habitLogs||{})[t]||{},ev=getDayEvents(t);
  const hd=habs.filter(h=>log[h.id]).length,ed=ev.filter(e=>e.done).length;
  return{stars:[!!(DATA.goalDays||{})[t],habs.length>0&&hd===habs.length,ev.length===0||ed===ev.length],hd,hn:habs.length,ed,en:ev.length,pts:getDayPoints(t)};
}
function jyDayModal(){
  if(JY_BUSY||!DATA)return;const t=todayKey();if((DATA.dayDone||{})[t])return;
  JY_BUSY=true;const D=jyDayStars(),n=D.stars.filter(Boolean).length;
  const m=jyModal(`${JY_RAYS}<div class="jy-stars">${D.stars.map(()=>'<span>⭐</span>').join('')}</div><h2>День пройден!</h2>
    <p>${n===3?'Идеально: три звезды из трёх':'Отличный день. Звёзд: '+n+' из 3'}</p>
    <div class="jy-ls"><div style="animation-delay:.4s"><span>🎯 Цель дня</span><b>${D.pts} / ${jyGoal()}</b></div>
      <div class="${D.stars[1]?'':'no'}" style="animation-delay:.5s"><span>✅ Привычки</span><b>${D.hd} / ${D.hn}</b></div>
      <div class="${D.stars[2]?'':'no'}" style="animation-delay:.6s"><span>📝 Дела</span><b>${D.ed} / ${D.en}</b></div></div>
    <button class="jy-btn" data-jy="go">Забрать +10</button><button class="jy-skip" data-jy="x">Позже</button>`,
    (b,close)=>{b.disabled=true;if(!DATA.dayDone)DATA.dayDone={};DATA.dayDone[t]=true;JYS.whoosh();addPoints(10,'day bonus');saveData();updateTopBar();setTimeout(()=>{close();if(CURRENT_SCREEN==='home')renderHome();},1100);});
  const st=m.querySelectorAll('.jy-stars span');
  D.stars.forEach((on,i)=>{if(!on)return;setTimeout(()=>{st[i].classList.add('on');JYS.star(i);jyBuzz(15);jyBurstEl(st[i],30+i*12,6+i,{size:9});if(i===2){jyShake();jyFlash();}},700+i*550);});
}
function jyStreakModal(){
  const s=DATA.streak||0,fr=JY_FREEZE_AT.includes(s);
  const m=jyModal(`${JY_RAYS}<div class="jy-big">${jyJoy('🔥','streak')}</div><h2>${s} ${pl3(s,'день','дня','дней')} подряд!</h2>
    <p>${s>=30?'Это уже образ жизни. Ты невероятен.':s>=7?'Неделя огня. Так и рождаются привычки.':'Огонь разгорается — не останавливайся.'}</p>
    <div class="jy-rw">${fr?'<span>❄️ +1 заморозка серии</span>':''}<span>🔥 Огонь стал ярче</span></div><button class="jy-btn" data-jy="go">Огонь!</button>`,(b,close)=>close());
  setTimeout(()=>{JYS.fanfare();jyBurstEl(m.querySelector('.jy-big'),70,10,{size:11});jyShake();},600);
}
function jyLevelModal(){
  const L=DATA.level||jyLevelOf(DATA.points||0),old=L-1;
  const m=jyModal(`${JY_RAYS}<div class="jy-lvb"><svg viewBox="0 0 100 100"><defs><linearGradient id="jylg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c9"/><stop offset=".5" style="stop-color:var(--gold)"/><stop offset="1" style="stop-color:color-mix(in srgb,var(--gold) 60%,#000)"/></linearGradient></defs><path d="M50 3 91 26v48L50 97 9 74V26z" fill="url(#jylg)"/><path d="M50 13 82 31v38L50 87 18 69V31z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/></svg><b data-jlv>${old}</b></div>
    <h2>Новый уровень!</h2><p>Уровень ${L} · «${jyLevelName(L)}». За всё время ты заработал ${(DATA.points||0).toLocaleString('ru-RU')} баллов.</p>
    <div class="jy-rw"><span>🪙 +20 баллов</span><span>🏆 Звание «${jyLevelName(L)}»</span></div><button class="jy-btn" data-jy="go">Забрать +20</button>`,
    (b,close)=>{b.disabled=true;addPoints(20,'level bonus');saveData();updateTopBar();setTimeout(close,1100);});
  setTimeout(()=>{const n=m.querySelector('[data-jlv]');n.classList.add('flip');setTimeout(()=>n.textContent=L,380);JYS.level();jyFireworks(5);jyFlash();jyShake();jyBuzz([30,50,30]);updateTopBar();},700);
}
// сундук недели
const JY_LOOT=[['🪙','+25 баллов','В копилку на новый дизайн','обычное',25,40],['💰','+50 баллов','Хороший улов!','редкое',50,25],['💎','+75 баллов','Большой куш','эпическое',75,10],['❄️','Заморозка серии','Пропустишь день — серия не сгорит','полезное','freeze',25]];
function jyChestModal(){
  if(JY_BUSY||!DATA)return;const st=jyChestState();if(!st.ready)return;
  JY_BUSY=true;let taps=0;
  const m=jyModal(`<div class="jy-rays" style="opacity:.5"></div><div class="jy-chest" data-cb>🎁</div><h2>Сундук недели</h2><p data-ct>5 дней с целью — ты заслужил. Нажми на сундук три раза</p>`,null);
  const cb=m.querySelector('[data-cb]');
  cb.addEventListener('click',e=>{
    e.stopPropagation();taps++;cb.className='jy-chest s'+Math.min(taps,3);JYS.shake(taps);jyBuzz(10*taps);jyBurstEl(cb,8*taps,3+taps,{size:6});
    m.querySelector('[data-ct]').textContent=taps===1?'Ещё!':taps===2?'Почти…':'';
    if(taps<3)return;
    let r=Math.random()*100,L=JY_LOOT[0];for(const x of JY_LOOT){if((r-=x[5])<0){L=x;break;}}
    if(!DATA.chests)DATA.chests={};DATA.chests[st.ks[0]]={at:Date.now(),loot:L[1]};
    if(L[4]==='freeze')DATA.freezes=(DATA.freezes||0)+1;
    saveData();
    setTimeout(()=>{jyFlash();jyShake();JYS.open();jyBurstEl(cb,80,11,{size:11});jyRain(50);
      m.innerHTML=`${JY_RAYS}<div class="jy-loot"><div class="e">${L[0]}</div><b>${L[1]}</b><span>${L[2]}</span><small>${L[3]}</small></div><h2 style="font-size:26px">Твоя награда</h2><button class="jy-btn" data-jy="go">Забрать</button>`;
      m.querySelector('[data-jy]').addEventListener('click',ev=>{ev.stopImmediatePropagation();ev.currentTarget.disabled=true;
        if(typeof L[4]==='number')addPoints(L[4],'chest');else showToast('❄️ Заморозка серии сохранена','good');
        updateTopBar();setTimeout(()=>{m.classList.add('out');setTimeout(()=>{m.remove();JY_BUSY=false;jyNext();if(CURRENT_SCREEN==='home')renderHome();},300);},1000);});
    },420);
  });
}

// ---------- серия: вехи и заморозка ----------
function jyCheckStreak(){
  if(!DATA)return;const s=DATA.streak||0;
  if(JY_MILESTONES.includes(s)&&DATA.streakCel!==s){DATA.streakCel=s;if(JY_FREEZE_AT.includes(s))DATA.freezes=(DATA.freezes||0)+1;saveData();jyQueue('streak');}
}
const pl3=(n,a,b,c)=>{n=Math.abs(n)%100;const m=n%10;if(n>10&&n<20)return c;if(m>1&&m<5)return b;if(m===1)return a;return c;};

// ---------- достижения: эффект поверх старого тоста ----------
function jyAchievementFx(){
  const t=document.getElementById('toast-ach');if(!t)return;
  t.classList.remove('jy-shine');void t.offsetWidth;t.classList.add('jy-shine');
  JYS.star(2);jyBuzz(15);setTimeout(()=>jyBurstEl(document.getElementById('ta-icon'),26,5,{size:7}),250);
}

// ---------- таб-бар: бегущий индикатор и «пружина» ----------
function jyNav(){
  const inner=document.querySelector('#bottom-nav .bn-inner');if(!inner)return;
  let ind=inner.querySelector('.jy-ind');if(!ind){ind=document.createElement('span');ind.className='jy-ind';ind.innerHTML='<i></i>';inner.prepend(ind);}
  const btn=inner.querySelector('.bn-btn.active');
  ind.style.opacity=btn?1:0;
  if(btn){ind.style.width=btn.offsetWidth+'px';ind.style.height=btn.offsetHeight+'px';ind.style.transform=`translate(${btn.offsetLeft}px,${btn.offsetTop}px)`;}
}
window.addEventListener('resize',()=>{if(typeof jyNav==='function')jyNav();});
document.addEventListener('click',e=>{
  const b=e.target.closest('#bottom-nav .bn-btn');if(!b)return;
  b.classList.remove('jy-bumpi');void b.offsetWidth;b.classList.add('jy-bumpi');jyBuzz(6);
},true);
