// === STORIES — «Постер» ===
// Каждая история — свой яркий цвет на весь экран, крупный заголовок и эмодзи-наклейка.
// Контент — news.json: from/until — когда показывать сезонную историю,
// stat — крупная цифра, cta.screen — кнопка, открывающая экран Tempo.
let STORIES_DATA=null;
let STORIES_IDX=0;
let STORIES_TIMER=null;
let STORIES_DURATION=6000;
let STORIES_PAUSED=false;
let STORIES_START_TIME=0;
let STORIES_ELAPSED=0;
let ST_HELD=false; // было удержание — следующий тап не листает

const STORIES_SEEN_KEY='tempo_stories_seen';

function loadStoriesSeen(){
  try{return JSON.parse(localStorage.getItem(STORIES_SEEN_KEY)||'[]');}catch(e){return [];}
}
function saveStoriesSeen(arr){localStorage.setItem(STORIES_SEEN_KEY,JSON.stringify(arr));}

const TIPS_LIBRARY_CARD={
  id:'_tips_library',type:'library',kicker:'Коллекция',emoji:'📚',
  title:'Библиотека советов',
  body:'Короткие советы с подробным разбором — всё полезное в одном месте. Выбери тему:',
  color:'teal',date:''
};

const ST_CTA_SCREENS=['home','schedule','habits','fit','stats','challenges','journal','settings'];
// Цвет истории: основной, второй (уходит в угол градиента) и светлый оттенок сверху
const ST_PAL={
  amber:{c:'#F5A524',c2:'#FF7A1A',tint:'#FFDB8F'},
  teal:{c:'#22C7A0',c2:'#139FC0',tint:'#A3F2DA'},
  purple:{c:'#8D7DFF',c2:'#C37CFF',tint:'#D3CBFF'},
  blue:{c:'#4E9BFF',c2:'#3BC8FF',tint:'#AFD6FF'},
  green:{c:'#7CC744',c2:'#C9E24C',tint:'#D2F0AC'},
  coral:{c:'#FF6B4A',c2:'#FFA043',tint:'#FFC6AD'},
  pink:{c:'#F2689E',c2:'#B36CFF',tint:'#FFC8DD'},
};
const ST_ARROW='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

async function fetchStories(){
  if(STORIES_DATA)return STORIES_DATA;
  fetchTips(); // темы для карточки библиотеки — заранее (modules/tips.js)
  try{
    const res=await fetch('news.json?_='+Date.now());
    if(!res.ok)throw new Error('not ok');
    const data=await res.json();
    // сезонные истории сами исчезают после until и не показываются раньше from
    const t=todayKey();
    data.items=data.items.filter(i=>(!i.from||i.from<=t)&&(!i.until||i.until>=t));
    data.items.push(TIPS_LIBRARY_CARD);
    STORIES_DATA=data;
    return data;
  }catch(e){
    STORIES_DATA={version:'1.0',items:[
      {id:'fallback',type:'tip',kicker:'Данные',emoji:'💾',title:'Не теряй данные',body:'Экспортируй данные раз в месяц и храни файл в облаке. Данные в браузере исчезнут, если очистить кэш.',color:'amber',date:''},
      TIPS_LIBRARY_CARD
    ]};
    return STORIES_DATA;
  }
}

async function checkStoriesUnread(){
  const data=await fetchStories();
  if(!data||!data.items)return false;
  const seen=loadStoriesSeen();
  const hasUnread=data.items.some(i=>!seen.includes(i.id));
  const dot=document.getElementById('tb-stories-dot');
  if(dot)dot.style.display=hasUnread?'block':'none';
  return hasUnread;
}

async function openStoriesFromBar(){
  const data=await fetchStories();
  if(!data||!data.items||data.items.length===0){
    showToast('Советы пока не загружены');
    return;
  }
  // начинаем с первой непросмотренной истории
  const seen=loadStoriesSeen();
  const first=data.items.findIndex(i=>!seen.includes(i.id));
  STORIES_IDX=first>0?first:0;
  const el=document.getElementById('stories');
  el.classList.remove('closing','paused');
  el.classList.add('open');
  showStory();
}

function showStory(){
  if(!STORIES_DATA||!STORIES_DATA.items[STORIES_IDX])return;
  const item=STORIES_DATA.items[STORIES_IDX];
  const isLib=item.type==='library';

  const p=ST_PAL[item.color]||ST_PAL.teal;
  const fr=document.getElementById('st-frame');
  fr.style.setProperty('--c',p.c);fr.style.setProperty('--c2',p.c2);fr.style.setProperty('--tint',p.tint);

  const label=item.kicker||(item.type==='update'?'Обновление':'Совет');
  document.getElementById('st-meta-time').textContent=label.toLowerCase();

  let h=`<div class="st-sticker" aria-hidden="true">${escHtml(item.emoji||'✨')}</div><div class="st-content">`+
    `<div class="st-kicker">${escHtml(label)}</div>`;
  if(item.stat)h+=`<div class="st-num">${escHtml(item.stat.value)}</div><div class="st-num-lbl">${escHtml(item.stat.label)}</div>`;
  const n=isLib&&TIPS_DATA?TIPS_DATA.tips.length:0;
  const body=n?`${n} ${tlPlural(n,'короткий совет','коротких совета','коротких советов')} — проверенные, с источниками. Выбери тему:`:item.body;
  h+=`<div class="st-title">${escHtml(item.title)}</div><div class="st-text">${escHtml(body)}</div>`;
  const screen=item.cta&&ST_CTA_SCREENS.includes(item.cta.screen)?item.cta.screen:null;
  if(isLib){
    const cats=(TIPS_DATA&&TIPS_DATA.categories)||[];
    if(cats.length)h+=`<div class="st-chips">${cats.map(c=>`<button class="st-chip" data-cat="${escHtml(c.id)}"><em>${escHtml(c.emoji)}</em>${escHtml(c.name)}</button>`).join('')}</div>`;
    h+=`<button class="st-cta" data-lib="1">Открыть библиотеку ${ST_ARROW}</button>`;
  }else if(screen){
    h+=`<button class="st-cta" data-screen="${screen}">${escHtml(item.cta.label||'Открыть')} ${ST_ARROW}</button>`;
  }
  document.getElementById('st-stage').innerHTML=h+'</div>';

  const row=document.getElementById('st-progress-row');
  row.innerHTML='';
  STORIES_DATA.items.forEach((_,i)=>{
    const bar=document.createElement('div');
    bar.className='st-bar';
    const fill=document.createElement('div');
    fill.className='st-bar-fill';
    if(i===STORIES_IDX)fill.id='st-progress-active';
    else if(i<STORIES_IDX)fill.style.width='100%';
    bar.appendChild(fill);
    row.appendChild(bar);
  });

  const seen=loadStoriesSeen();
  if(!seen.includes(item.id)){seen.push(item.id);saveStoriesSeen(seen);}

  if(isLib){
    // библиотека ждёт выбора, сама не листается
    if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
    const fill=document.getElementById('st-progress-active');
    if(fill)fill.style.width='100%';
  }else{
    // время на чтение: чем длиннее текст, тем дольше (6–11 секунд)
    STORIES_DURATION=Math.min(11000,Math.max(6000,3000+((item.title||'').length+(item.body||'').length)*28));
    startStoryTimer();
  }
}

function startStoryTimer(){STORIES_ELAPSED=0;stRun();}
function stRun(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  STORIES_START_TIME=Date.now();
  STORIES_PAUSED=false;
  const tick=()=>{
    if(STORIES_PAUSED)return;
    const pct=Math.min(100,(STORIES_ELAPSED+Date.now()-STORIES_START_TIME)/STORIES_DURATION*100);
    const fill=document.getElementById('st-progress-active');
    if(fill)fill.style.width=pct+'%';
    if(pct>=100){storyNext();return;}
    STORIES_TIMER=requestAnimationFrame(tick);
  };
  STORIES_TIMER=requestAnimationFrame(tick);
}
// пауза продолжает с того же места, а не с начала истории
function stPause(on){
  const el=document.getElementById('stories');
  const cur=STORIES_DATA&&STORIES_DATA.items[STORIES_IDX];
  if(!cur||cur.type==='library')return;
  if(on){
    if(STORIES_PAUSED)return;
    STORIES_PAUSED=true;STORIES_ELAPSED+=Date.now()-STORIES_START_TIME;
    if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
    el.classList.add('paused');
  }else{
    if(!STORIES_PAUSED)return;
    el.classList.remove('paused');
    stRun();
  }
}

function stTap(dir){
  if(ST_HELD){ST_HELD=false;return;}
  dir>0?storyNext():storyPrev();
}

function storyNext(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  const cur=STORIES_DATA&&STORIES_DATA.items[STORIES_IDX];
  if(cur&&cur.type==='library'){
    openTipsLib();
    return;
  }
  STORIES_IDX++;
  if(STORIES_IDX>=STORIES_DATA.items.length){closeStories();return;}
  showStory();
}

function storyPrev(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  if(STORIES_IDX>0)STORIES_IDX--;
  showStory();
}

function closeStories(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  STORIES_PAUSED=false;
  const el=document.getElementById('stories');
  el.classList.add('closing');
  setTimeout(()=>{
    el.classList.remove('open','closing','paused');
    checkStoriesUnread();
  },220);
}

function stCta(screen){
  closeStories();
  setTimeout(()=>navTo(screen),230);
}
function stOpenTipsCat(id){openTipsLib(id);}

// Удержание — пауза, свайп вниз — закрыть, свайп вбок — листать; кнопки в истории
document.addEventListener('DOMContentLoaded',()=>{
  const stEl=document.getElementById('stories');
  if(!stEl)return;
  // Pointer Events — один путь и для мыши, и для пальца (без «эмулированных» кликов после касания)
  let holdTimer=null,sx=0,sy=0,down=false;
  stEl.addEventListener('pointerdown',e=>{
    ST_HELD=false;
    if(e.target.closest('button'))return;
    down=true;sx=e.clientX;sy=e.clientY;
    holdTimer=setTimeout(()=>{ST_HELD=true;stPause(true);},220);
  });
  const endHold=e=>{
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
    if(STORIES_PAUSED)stPause(false);
    if(!down)return;
    down=false;
    if(e.type!=='pointerup')return;
    const dx=e.clientX-sx,dy=e.clientY-sy;
    if(dy>90&&Math.abs(dy)>Math.abs(dx)*1.5){ST_HELD=true;closeStories();}
    else if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){ST_HELD=true;dx<0?storyNext():storyPrev();}
  };
  stEl.addEventListener('pointerup',endHold);
  stEl.addEventListener('pointercancel',endHold);
  stEl.addEventListener('pointerleave',endHold);
  document.getElementById('st-stage').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    e.stopPropagation();
    if(b.dataset.screen)stCta(b.dataset.screen);
    else if(b.dataset.cat)stOpenTipsCat(b.dataset.cat);
    else if(b.dataset.lib)openTipsLib();
  });
  // ушли из приложения — история ждёт
  document.addEventListener('visibilitychange',()=>{
    if(stEl.classList.contains('open'))stPause(document.hidden);
  });
});

document.addEventListener('keydown',(e)=>{
  if(!document.getElementById('stories').classList.contains('open'))return;
  if(document.getElementById('tips-lib').classList.contains('open')||document.getElementById('tip-view').classList.contains('open'))return;
  if(e.key==='Escape')closeStories();
  else if(e.key==='ArrowRight'||e.key===' ')storyNext();
  else if(e.key==='ArrowLeft')storyPrev();
});
