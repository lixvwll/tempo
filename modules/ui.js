// === UI UTILITIES ===
// Shared rendering helpers, overlay, toast, export banner, close warning

function typeName(t){const o=TASK_TYPES.find(x=>x.id===t);return o?o.name:'';}
function escHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);}

function renderWeekStrip(activeKey,onClick){
  const today=todayKey();
  const active=dateFromKey(activeKey);
  const dow=dayOfWeek(active);
  const monday=new Date(active);monday.setDate(active.getDate()-dow);
  let html='<div class="week-strip">';
  for(let i=0;i<7;i++){
    const d=new Date(monday);d.setDate(monday.getDate()+i);
    const k=todayKey(d);
    const pts=getDayPoints(k);
    const ptsCls=pts>0?'pos':pts<0?'neg':'';
    const ptsStr=pts!==0?(pts>0?'+':'')+pts:'';
    const mood=DATA.moods[k]||0;
    const moodCls=mood?' mood-'+mood:'';
    html+=`
      <div class="ws-day${k===activeKey?' active':''}${k===today?' today':''}${moodCls}" onclick="${onClick}('${k}')">
        <div class="ws-name">${fmtDayName(d,true)}</div>
        <div class="ws-num">${d.getDate()}</div>
        <div class="ws-pts ${ptsCls}">${ptsStr}</div>
      </div>
    `;
  }
  html+='</div>';
  return html;
}

function renderDayNav(activeKey,onChange){
  const d=dateFromKey(activeKey);
  const rel=relDay(activeKey);
  const name=rel||fmtDayName(d);
  const today=todayKey();
  return `
    <div class="day-nav">
      <button class="day-arrow" onclick="${onChange}('${shiftDay(activeKey,-1)}')">&#8249;</button>
      <div class="day-current">
        <div class="day-current-name">${name}</div>
        <div class="day-current-date">${fmtDate(d)}</div>
      </div>
      <button class="day-arrow" onclick="${onChange}('${shiftDay(activeKey,1)}')">&#8250;</button>
      ${activeKey!==today?`<button class="today-pill" onclick="${onChange}('${today}')">Сегодня</button>`:''}
    </div>
  `;
}

function closeOverlay(){document.getElementById('overlay').classList.remove('open');EDITING_TASK=null;EDITING_LECTURE=null;}

// === EXPORT BANNER ===
function renderExportBanner(){
  const last=DATA.lastExport;
  let subText='';
  if(!last){
    subText='Экспорт ещё не делался';
  }else{
    const d=new Date(last);
    const days=Math.floor((Date.now()-last)/86400000);
    subText=days===0?'Экспорт сегодня':days===1?'Экспорт вчера':`Экспорт ${days} дн. назад`;
  }
  return`
    <div class="export-banner">
      <span class="eb-icon">💾</span>
      <div class="eb-info">
        <div class="eb-title">Сохранение данных</div>
        <div class="eb-sub">${subText}</div>
      </div>
      <button class="eb-btn" onclick="exportData()">Экспорт</button>
      <button class="eb-tip-btn" tabindex="0">?
        <div class="eb-tooltip">Данные хранятся в браузере и не исчезнут сами по себе. Но если очистить кэш — они удалятся. Экспортируй JSON-файл и храни его как бэкап.</div>
      </button>
    </div>
  `;
}

// === CLOSE WARNING ===
let closeWarnShown=false;

function setupCloseWarning(){
  window.addEventListener('beforeunload',function(e){
    if(!DATA)return;
    e.preventDefault();
    e.returnValue='';
    setTimeout(()=>{
      if(!closeWarnShown){
        closeWarnShown=true;
        document.getElementById('close-warn').classList.add('open');
      }
    },200);
  });
}

function dismissCloseWarn(){
  document.getElementById('close-warn').classList.remove('open');
  closeWarnShown=false;
}

function exportDataAndDismiss(){
  exportData();
  dismissCloseWarn();
}

// ============================================================
// MORE MENU (bottom sheet — Статистика, Челленджи, Дневник)
// ============================================================

const MORE_SCREENS=['stats','challenges','journal'];
const MENU_SCREENS=['stats','challenges','journal','settings'];

function openMoreMenu(){
  // Подсвечиваем активный экран если он в шторке
  document.querySelectorAll('#burger-menu .bm-item[data-screen]').forEach(btn=>{
    btn.classList.toggle('active-menu',btn.dataset.screen===CURRENT_SCREEN);
  });
  document.getElementById('burger-backdrop').classList.add('open');
  document.getElementById('burger-menu').classList.add('open');
  document.getElementById('bn-menu-btn').classList.add('menu-open');
}

function closeMoreMenu(){
  document.getElementById('burger-backdrop').classList.remove('open');
  document.getElementById('burger-menu').classList.remove('open');
  document.getElementById('bn-menu-btn').classList.remove('menu-open');
}

function navFromMenu(screen){
  closeMoreMenu();
  setTimeout(()=>navTo(screen),180);
}

// ============================================================
// TOP MENU (dropdown — Настройки, Достижения, О приложении)
// ============================================================

function openTopMenu(){
  closeMoreMenu();
  document.getElementById('top-menu-backdrop').classList.add('open');
  document.getElementById('top-menu').classList.add('open');
  // Подсвечиваем настройки если активны
  document.querySelectorAll('#top-menu .bm-item[data-screen]').forEach(btn=>{
    btn.classList.toggle('active-menu',btn.dataset.screen===CURRENT_SCREEN);
  });
}

function closeTopMenu(){
  document.getElementById('top-menu-backdrop').classList.remove('open');
  document.getElementById('top-menu').classList.remove('open');
}

function navFromTopMenu(screen){
  closeTopMenu();
  setTimeout(()=>navTo(screen),150);
}

// Обновляем активность кнопки "Ещё" при навигации к menu-экранам
function updateMenuButtonState(screen){
  const menuBtn=document.getElementById('bn-menu-btn');
  if(!menuBtn)return;
  const isMoreScreen=MORE_SCREENS.includes(screen);
  menuBtn.classList.toggle('active-menu-screen',isMoreScreen);
  menuBtn.style.color=isMoreScreen?'var(--text)':'';
}
