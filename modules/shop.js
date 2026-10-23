// === ДИЗАЙНЫ И МАГАЗИН ДИЗАЙНОВ ===
// База — «Точка». Остальные дизайны покупаются за баллы.
// Баллы считаем раздельно: DATA.points — заработано всего (на нём держатся достижения, покупки его не трогают),
// DATA.spent — потрачено в магазине, баланс = points − spent. Купленные дизайны — DATA.skins, включённый — DATA.skin.

const SKIN_KEY='tempo_skin';
let SKIN_TRIAL=null; // дизайн на примерке (не сохраняется)

// t — цвета для превью в магазине и для theme-color браузера (те же, что в style.css)
const SKINS=[
  {id:'tochka',name:'Точка',price:0,desc:'Строгий монохром. Базовый дизайн Tempo',fonts:'Inter Tight',
    fd:"'Inter Tight'",fn:"'Inter Tight'",fu:"'Inter Tight'",nameStyle:'font-weight:700;letter-spacing:-.035em',
    t:{dark:{bg:'#0e0e0e',sf:'#181818',sf2:'#262626',tx:'#fff',mu:'rgba(255,255,255,.45)',bd:'rgba(255,255,255,.09)',ac:'#fff',onac:'#0e0e0e'},
       light:{bg:'#fafaf8',sf:'#fff',sf2:'#ebeae5',tx:'#1a1a1a',mu:'rgba(0,0,0,.45)',bd:'rgba(0,0,0,.08)',ac:'#1a1a1a',onac:'#fff'}}},
  {id:'metronom',name:'Метроном',price:300,desc:'Бумага, засечки и томатный акцент',fonts:'Playfair Display + Manrope',
    fd:"'Playfair Display'",fn:"'Playfair Display'",fu:"'Manrope'",nameStyle:'font-style:italic;font-weight:600',
    t:{dark:{bg:'#15130F',sf:'#1F1C17',sf2:'#332E26',tx:'#F3EDE2',mu:'rgba(243,237,226,.46)',bd:'rgba(243,237,226,.1)',ac:'#F0603F',onac:'#fff'},
       light:{bg:'#F4EFE6',sf:'#FBF8F2',sf2:'#E3DACA',tx:'#1C1A17',mu:'rgba(28,26,23,.48)',bd:'rgba(28,26,23,.1)',ac:'#D9442A',onac:'#fff'}}},
  {id:'ritm',name:'Ритм',price:450,desc:'Мятный градиент, как в сториз',fonts:'Unbounded + Onest',
    fd:"'Unbounded'",fn:"'Unbounded'",fu:"'Onest'",nameStyle:'font-weight:700;letter-spacing:-.04em',
    t:{dark:{bg:'#0e0e0e',sf:'#181818',sf2:'#2a2a2a',tx:'#fff',mu:'rgba(255,255,255,.45)',bd:'rgba(255,255,255,.09)',ac:'#2FD9AE',onac:'#0b2a22'},
       light:{bg:'#fafaf8',sf:'#fff',sf2:'#e6e5df',tx:'#141414',mu:'rgba(0,0,0,.45)',bd:'rgba(0,0,0,.08)',ac:'#0F9E7E',onac:'#fff'}}},
  {id:'mono',name:'Моно',price:700,desc:'Табло, пиксели и лаймовый маркер',fonts:'Martian Mono + Geologica',
    fd:"'Geologica'",fn:"'Martian Mono'",fu:"'Geologica'",nameStyle:"font-family:'Martian Mono';font-weight:600;letter-spacing:-.04em",
    t:{dark:{bg:'#0A0A0A',sf:'#131313',sf2:'#262626',tx:'#EDEDED',mu:'#7a7a7a',bd:'rgba(255,255,255,.1)',ac:'#D4FF3A',onac:'#0A0A0A',lit:'#D4FF3A'},
       light:{bg:'#F1F1EC',sf:'#fff',sf2:'#DADAD3',tx:'#0A0A0A',mu:'#6E6E68',bd:'rgba(0,0,0,.1)',ac:'#C8F51E',onac:'#0A0A0A',lit:'#0A0A0A'}}},
  {id:'sticker',name:'Стикер',price:1000,desc:'Пастель, наклейки и много радости',fonts:'Nunito',
    fd:"'Nunito'",fn:"'Nunito'",fu:"'Nunito'",nameStyle:'font-weight:900;letter-spacing:-.03em',
    t:{dark:{bg:'#101014',sf:'#1B1B22',sf2:'#30303B',tx:'#fff',mu:'rgba(255,255,255,.48)',bd:'rgba(255,255,255,.08)',ac:'#FFD84D',onac:'#141414'},
       light:{bg:'#FFF8EE',sf:'#fff',sf2:'#EDE2D2',tx:'#1A1A1A',mu:'rgba(0,0,0,.46)',bd:'rgba(0,0,0,.07)',ac:'#FFC933',onac:'#141414'}}},
];

function skinById(id){return SKINS.find(s=>s.id===id)||SKINS[0];}
function getBalance(){return DATA?(DATA.points||0)-(DATA.spent||0):0;}
function skinPl(n,a,b,c){n=Math.abs(n)%100;const m=n%10;if(n>10&&n<20)return c;if(m>1&&m<5)return b;if(m===1)return a;return c;}
function skinPts(n){return n+' '+skinPl(n,'балл','балла','баллов');}
function ownsSkin(id){return id==='tochka'||!!(DATA&&(DATA.skins||[]).includes(id));}
function activeSkinId(){
  let id=SKIN_TRIAL||(DATA&&DATA.skin);
  if(!id){try{id=localStorage.getItem(SKIN_KEY);}catch(e){}}
  return SKIN_KEYS.includes(id)?id:'tochka';
}
// Сколько баллов в среднем набирается за день (по последним двум неделям) — чтобы честно писать «≈ N дней»
function avgDailyPoints(){
  if(!DATA||!DATA.pointsLog)return 60;
  const today=todayKey();let sum=0,n=0;
  for(let i=1;i<=14;i++){const l=DATA.pointsLog[shiftDay(today,-i)];if(l){sum+=l.pos-l.neg;n++;}}
  return n?Math.max(15,Math.round(sum/n)):60;
}
function skinDays(left){const d=Math.max(1,Math.ceil(left/avgDailyPoints()));return d+' '+skinPl(d,'день','дня','дней');}

// --- применение дизайна ---
function applySkin(){
  const id=activeSkinId();
  document.documentElement.setAttribute('data-skin',id);
  if(!SKIN_TRIAL){try{localStorage.setItem(SKIN_KEY,id);}catch(e){}}
  updateThemeColor();
  paintIcons();
  renderSkinTrial();
}
function updateThemeColor(){
  const t=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  const meta=document.getElementById('theme-color-meta');
  if(meta)meta.setAttribute('content',skinById(currentSkin()).t[t].bg);
}
function rerenderApp(){
  if(document.getElementById('screen-app').classList.contains('active'))navTo(CURRENT_SCREEN);
}

// --- карточка на главной ---
function renderSkinTeaser(){
  if(!DATA)return '';
  const rest=SKINS.filter(s=>!ownsSkin(s.id)).sort((a,b)=>a.price-b.price);
  if(!rest.length)return '';
  const nx=rest[0],bal=getBalance(),can=bal>=nx.price,left=nx.price-bal;
  const pct=Math.max(4,Math.round(Math.max(0,bal)/nx.price*100));
  return `
    <button class="skin-tease" onclick="openShop()">
      <span class="st-ics">${rest.slice(0,3).map(s=>skinAppIconHTML(s.id,30)).join('')}</span>
      <span class="st-tx">
        <b>${can?'Хватает на новый дизайн':'До нового дизайна '+skinPts(left)}</b>
        <span class="st-s">«${nx.name}» · ${skinPts(nx.price)}${can?'':' · ≈ '+skinDays(left)}</span>
        ${can?'':`<span class="st-bar"><i style="width:${pct}%"></i></span>`}
      </span>
      <span class="st-ar">›</span>
    </button>`;
}

// --- строка в настройках ---
function renderSkinSettingRow(){
  return `
    <div class="set-row">
      <div>
        <div class="set-label">Дизайн</div>
        <div class="set-desc">«${skinById(DATA.skin||'tochka').name}» · баланс ${skinPts(getBalance())}</div>
      </div>
      <button class="icon-btn" onclick="openShop()">Сменить</button>
    </div>`;
}

// --- магазин ---
function skinPreview(s){
  const th=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  const t=s.t[th];
  const nav=['now','day','habits','fit','more'].map((n,i)=>`<span class="skp-n${i===0?' on':''}">${ico(n,s.id,i===0)}</span>`).join('');
  return `<div class="skp skp-${s.id}" style="--pbg:${t.bg};--psf:${t.sf};--psf2:${t.sf2};--ptx:${t.tx};--pmu:${t.mu};--pbd:${t.bd};--pac:${t.ac};--ponac:${t.onac};--pfd:${s.fd};--pfn:${s.fn};--pfu:${s.fu};--mono-lit:${t.lit||'#D4FF3A'}">
    <div class="skp-top">${skinLogoHTML(s.id)}</div>
    <div class="skp-time">09:41</div>
    <div class="skp-bar"><i></i></div>
    <div class="skp-card"><b>Сейчас</b><span>Английский</span></div>
    <div class="skp-stats"><i></i><i></i><i></i></div>
    <div class="skp-rows"><i></i><i></i></div>
    <div class="skp-nav">${nav}</div>
  </div>`;
}
function skinCard(s){
  const own=ownsSkin(s.id),act=DATA.skin===s.id&&!SKIN_TRIAL,trying=SKIN_TRIAL===s.id;
  const bal=getBalance(),can=bal>=s.price,left=s.price-bal;
  let b;
  if(act)b=`<span class="sh-chip">${SH_CHECK}Включён</span>`;
  else if(own)b=`<button class="sh-btn" onclick="useSkin('${s.id}')">Включить</button>`;
  else{
    b=trying?`<span class="sh-chip">Примеряешь</span>`:`<button class="sh-btn gh" onclick="trySkin('${s.id}')">Примерить</button>`;
    b+=can?`<button class="sh-btn" onclick="askBuySkin('${s.id}')">Купить · ${s.price}</button>`
          :`<span class="sh-need"><i style="width:${Math.max(3,Math.round(Math.max(0,bal)/s.price*100))}%"></i></span><span class="sh-need-l">${s.price} · ещё ${left} ≈ ${skinDays(left)}</span>`;
  }
  const meta=s.price?(own?'Куплен':skinPts(s.price)):'Бесплатно · база';
  return `
    <div class="sh-card${act?' act':''}">
      ${skinPreview(s)}
      <div class="sh-info">
        <div class="sh-name" style="font-family:${s.fd};${s.nameStyle}">${s.name}</div>
        <div class="sh-desc">${s.desc}</div>
        <div class="sh-meta">${meta} · ${s.fonts}</div>
        <div class="sh-acts">${b}</div>
      </div>
    </div>`;
}
const SH_CHECK='<svg viewBox="0 0 24 24" class="sh-ck"><path d="m5.5 12.5 4 4 9-9.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function renderShop(){
  const el=document.getElementById('skin-shop');if(!el||!DATA)return;
  const sc=el.querySelector('.sh-scroll'),top=sc?sc.scrollTop:0;
  const bal=getBalance();
  el.innerHTML=`
    <div class="sh-scroll"><div class="sh-in">
      <div class="sh-head">
        <button class="sh-back" onclick="closeShop()" aria-label="Назад">‹</button>
        <div class="sh-h1">Дизайны</div>
      </div>
      <div class="sh-bal">
        <div class="sh-bal-n">${bal}</div>
        <div class="sh-bal-l">${skinPl(bal,'балл','балла','баллов')} можно потратить</div>
        <div class="sh-bal-s"><span>заработано ${DATA.points||0}</span><span>потрачено ${DATA.spent||0}</span></div>
      </div>
      <div class="sh-note">Покупка списывает баллы с баланса, а счёт в достижениях остаётся прежним. Баллы дают привычки, дела, вода и тренировки.</div>
      ${SKINS.map(skinCard).join('')}
    </div></div>`;
  el.querySelector('.sh-scroll').scrollTop=top;
}
function openShop(){
  if(!DATA)return;
  if(typeof closeTopMenu==='function')closeTopMenu();
  if(typeof closeMoreMenu==='function')closeMoreMenu();
  const el=document.getElementById('skin-shop');
  renderShop();
  el.querySelector('.sh-scroll').scrollTop=0;
  el.classList.remove('closing');
  el.classList.add('open');
}
function closeShop(){
  const el=document.getElementById('skin-shop');
  if(!el.classList.contains('open'))return;
  el.classList.add('closing');
  setTimeout(()=>el.classList.remove('open','closing'),200);
}

// --- примерка ---
function trySkin(id){
  SKIN_TRIAL=id;
  applySkin();
  closeShop();
  navTo('home');
  showToast('Примерка: походи по вкладкам');
}
function endSkinTrial(silent){
  if(!SKIN_TRIAL)return;
  SKIN_TRIAL=null;
  applySkin();
  rerenderApp();
  if(!silent)showToast('Вернули твой дизайн');
}
function renderSkinTrial(){
  const el=document.getElementById('skin-trial');if(!el)return;
  document.body.classList.toggle('skin-trialing',!!SKIN_TRIAL);
  if(!SKIN_TRIAL){el.classList.remove('open');el.innerHTML='';return;}
  const s=skinById(SKIN_TRIAL),bal=getBalance(),can=bal>=s.price;
  el.innerHTML=`
    <div class="sk-tr-tx"><b>Примерка «${s.name}»</b><span>${can?'Нравится? Оставь себе':'Не хватает '+skinPts(s.price-bal)}</span></div>
    ${can?`<button class="sh-btn" onclick="askBuySkin('${s.id}')">Купить · ${s.price}</button>`:''}
    <button class="sk-tr-x" onclick="endSkinTrial()" aria-label="Закончить примерку">×</button>`;
  el.classList.add('open');
}

// --- покупка ---
function askBuySkin(id){
  const s=skinById(id),bal=getBalance();
  if(bal<s.price){showToast('Не хватает '+skinPts(s.price-bal),'bad');return;}
  const el=document.getElementById('skin-cf');
  el.innerHTML=`
    <div class="skc-bd" onclick="closeSkinConfirm()"></div>
    <div class="skc-sheet">
      <div class="bm-handle"></div>
      ${skinAppIconHTML(s.id,66)}
      <div class="skc-t">Купить «${s.name}»?</div>
      <div class="skc-p">Спишется ${skinPts(s.price)}. Счёт в достижениях не изменится, а дизайн останется с тобой навсегда.</div>
      <div class="skc-row"><span>Баланс</span><b>${bal} → ${bal-s.price}</b></div>
      <button class="sh-btn big" onclick="buySkin('${s.id}')">Купить и включить</button>
      <button class="skc-x" onclick="closeSkinConfirm()">Не сейчас</button>
    </div>`;
  el.classList.add('open');
}
function closeSkinConfirm(){document.getElementById('skin-cf').classList.remove('open');}
function buySkin(id){
  const s=skinById(id);
  if(ownsSkin(id)||getBalance()<s.price){closeSkinConfirm();return;}
  DATA.spent=(DATA.spent||0)+s.price;
  if(!DATA.skins.includes(id))DATA.skins.push(id);
  DATA.skin=id;
  SKIN_TRIAL=null;
  saveData();
  closeSkinConfirm();
  closeShop();
  applySkin();
  navTo('home');
  showSkinCelebrate(id);
}
function useSkin(id){
  if(!ownsSkin(id))return;
  DATA.skin=id;
  SKIN_TRIAL=null;
  saveData();
  applySkin();
  renderShop();
  rerenderApp();
  showToast('Дизайн «'+skinById(id).name+'» включён');
}
function showSkinCelebrate(id){
  const s=skinById(id),el=document.getElementById('skin-cel');
  const sparks=Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2,r=110+Math.random()*70;
    return `<span class="skl-sp" style="--x:${(Math.cos(a)*r).toFixed(0)}px;--y:${(Math.sin(a)*r).toFixed(0)}px;animation-delay:${(Math.random()*.15).toFixed(2)}s">${ico('stories',id)}</span>`;}).join('');
  el.innerHTML=`${sparks}${skinAppIconHTML(id,112)}
    <div class="skl-t">«${s.name}» теперь твой</div>
    <div class="skl-s">Дизайн уже включён. Переключиться обратно можно в ≡ → Дизайны.</div>
    <button class="sh-btn big" onclick="document.getElementById('skin-cel').classList.remove('open')">Посмотреть</button>`;
  el.classList.add('open');
}
