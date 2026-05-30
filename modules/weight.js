// ============================================================
// === WEIGHT LOSS SYSTEM =====================================
// ============================================================

// --- helpers ---
function daysBetweenKeys(a,b){return Math.round((dateFromKey(b)-dateFromKey(a))/86400000);}

function pacePerWeek(){
  const entries=weightEntriesSorted(DATA);
  if(entries.length<2)return 0;
  const last=entries[entries.length-1];
  const windowStart=shiftDay(last.key,-28);
  const win=entries.filter(x=>x.key>=windowStart);
  const base=win.length>1?win[0]:entries[0];
  const span=Math.max(1,daysBetweenKeys(base.key,last.key));
  return (last.kg-base.kg)/span*7;
}

function bmiInfo(bmi){
  if(bmi<18.5)return{label:'Дефицит',cls:'warn'};
  if(bmi<25)return{label:'Норма',cls:'good'};
  if(bmi<30)return{label:'Избыток',cls:'warn'};
  return{label:'Ожирение',cls:'bad'};
}

function fmtKg(n){return n!=null?n.toFixed(1):'—';}

// --- water helpers ---
function addWaterEntry(ml,icon){
  const today=todayKey();
  if(!DATA.water.log[today])DATA.water.log[today]=[];
  DATA.water.log[today].push({ml,icon:icon||'💧',ts:Date.now()});
  addPoints(POINTS.waterCup,'water cup');
  const goal=DATA.water.goalMl;
  if(waterTotalForDay(DATA,today)>=goal&&!DATA.water.bonusDays[today]){
    DATA.water.bonusDays[today]=true;
    addPoints(POINTS.waterGoal,'water goal bonus');
    showToast('Норма воды выполнена! · +'+POINTS.waterGoal+' баллов','good');
  }else{
    showToast('+'+POINTS.waterCup+' балла · '+ml+' мл добавлено');
  }
  saveData();
  if(CURRENT_SCREEN==='weight')renderWeight();
  updateTopBar();
}

function removeWaterEntry(i){
  const today=todayKey();
  const arr=DATA.water.log[today]||[];
  if(!arr[i])return;
  const wasGoal=waterTotalForDay(DATA,today)>=DATA.water.goalMl;
  arr.splice(i,1);
  addPoints(-POINTS.waterCup,'water undo');
  const nowGoal=waterTotalForDay(DATA,today)>=DATA.water.goalMl;
  if(wasGoal&&!nowGoal&&DATA.water.bonusDays[today]){
    delete DATA.water.bonusDays[today];
    addPoints(-POINTS.waterGoal,'water goal undo');
  }
  saveData();
  if(CURRENT_SCREEN==='weight')renderWeight();
  updateTopBar();
}

// --- chart ---
function setWeightChartRange(r){
  WEIGHT_CHART_RANGE=r;
  renderWeight();
}

function filterEntriesByRange(entries,range){
  if(range==='all'||entries.length===0)return entries;
  const today=new Date();
  let cutoff;
  if(range==='1w')cutoff=new Date(today.getTime()-7*86400000);
  else if(range==='4w')cutoff=new Date(today.getTime()-28*86400000);
  else if(range==='3m')cutoff=new Date(today.getTime()-90*86400000);
  else return entries;
  const cutKey=cutoff.toISOString().slice(0,10);
  const filtered=entries.filter(e=>e.key>=cutKey);
  return filtered.length>=1?filtered:entries.slice(-2);
}

function renderWeightChart(entries){
  if(entries.length<2)return`<div class="wl-chart-empty">Ещё несколько записей — появится график</div>`;
  const show=filterEntriesByRange(entries,WEIGHT_CHART_RANGE);
  if(show.length<2)return`<div class="wl-chart-empty">Мало данных для этого периода</div>`;
  const vals=show.map(e=>e.kg);
  const W=300,H=100,padX=10,padTop=18,padBot=16;
  const min=Math.min(...vals)-0.3;
  const max=Math.max(...vals)+0.3;
  const range=(max-min)||1;
  const n=show.length;
  const goal=DATA.weight.goal;
  const pts=vals.map((v,i)=>{
    const x=padX+((W-padX*2)*(n===1?0.5:i/(n-1)));
    const y=padTop+(1-(v-min)/range)*(H-padTop-padBot);
    return[x,y];
  });
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const area=line+` L${pts[n-1][0].toFixed(1)},${H-padBot} L${pts[0][0].toFixed(1)},${H-padBot} Z`;
  let goalLine='';
  if(goal!=null){
    const gy=padTop+(1-(goal-min)/range)*(H-padTop-padBot);
    if(gy>=0&&gy<=H){
      goalLine=`<line x1="${padX}" y1="${gy.toFixed(1)}" x2="${W-padX}" y2="${gy.toFixed(1)}" stroke="var(--good)" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.5"/>`;
      goalLine+=`<text x="${W-padX-2}" y="${(gy-3).toFixed(1)}" font-size="7" fill="rgba(124,179,66,0.7)" font-family="system-ui" text-anchor="end">${goal} кг</text>`;
    }
  }
  let svg=`<svg class="wl-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
  svg+=`<path class="wl-chart-area" d="${area}"/>`;
  svg+=goalLine;
  svg+=`<path class="wl-chart-line" d="${line}"/>`;
  // dots
  const maxDots=show.length<=30;
  if(maxDots)pts.forEach(p=>{svg+=`<circle class="wl-chart-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.2"/>`;});
  // latest value label
  const lastPt=pts[n-1];
  svg+=`<text x="${lastPt[0].toFixed(1)}" y="${(lastPt[1]-6).toFixed(1)}" font-size="8" fill="var(--good)" font-family="system-ui" text-anchor="middle" font-weight="500">${vals[n-1].toFixed(1)}</text>`;
  // change label
  const totalDiff=vals[n-1]-vals[0];
  const diffColor=totalDiff<0?'var(--good)':totalDiff>0?'var(--bad)':'var(--muted)';
  svg+=`<text x="${W-padX}" y="${(lastPt[1]-6).toFixed(1)}" font-size="7" fill="${diffColor}" font-family="system-ui" text-anchor="end">${totalDiff<=0?'':'+'} ${totalDiff.toFixed(1)}</text>`;
  // date labels
  const dateFmt=(k)=>{const d=dateFromKey(k);return d.getDate()+' '+(d.toLocaleDateString('ru',{month:'short'})).replace('.','');};
  svg+=`<text x="${padX}" y="${H-2}" font-size="7" fill="var(--muted)" font-family="system-ui">${dateFmt(show[0].key)}</text>`;
  svg+=`<text x="${W-padX}" y="${H-2}" font-size="7" fill="var(--muted)" font-family="system-ui" text-anchor="end">${dateFmt(show[n-1].key)}</text>`;
  svg+=`</svg>`;
  return svg;
}

// --- water section (used inside weight screen) ---
function renderWaterSection(){
  const today=todayKey();
  const goal=DATA.water.goalMl;
  const entries=DATA.water.log[today]||[];
  const total=entries.reduce((a,e)=>a+e.ml,0);
  const pct=Math.min(100,Math.round(total/goal*100));
  const totalL=total>=1000?(total/1000).toFixed(2)+' л':total+' мл';
  const goalMet=total>=goal;
  const dayPts=entries.length*POINTS.waterCup+(DATA.water.bonusDays[today]?POINTS.waterGoal:0);

  // cups: filled entries + plus button
  let cupsHtml='';
  entries.forEach((e,i)=>{
    cupsHtml+=`<button class="wl-cup filled" onclick="removeWaterEntry(${i})" title="${e.ml} мл · нажми чтобы отменить">${e.icon||'💧'}<span class="wl-cup-pts">+2</span></button>`;
  });
  cupsHtml+=`<button class="wl-cup add-cup" onclick="openWaterModal()" title="Добавить воду">+</button>`;

  return`
    <div class="section-lbl" style="display:flex;align-items:center;justify-content:space-between;">
      <span>💧 Вода · сегодня</span>
      <span style="font-size:10px;color:var(--muted);">+${dayPts} баллов</span>
    </div>
    <div class="wl-water-card">
      <div class="wl-water-row">
        <div class="wl-water-info">
          <div class="wl-water-val">${totalL} <span class="wl-water-goal">/ ${goal>=1000?goal/1000+' л':goal+' мл'}</span></div>
          <div class="wl-water-sub">${entries.length} порций сегодня · +2 за каждую</div>
        </div>
        <div class="wl-water-pct${goalMet?' met':''}">${pct}%</div>
      </div>
      <div class="wl-wbar"><div class="wl-wbar-fill" style="width:${pct}%;${goalMet?'background:var(--good);':''}"></div></div>
      <div class="wl-cups">${cupsHtml}</div>
    </div>
  `;
}

// --- main render ---
function renderWeight(){
  const root=document.getElementById('ms-weight');
  const w=DATA.weight;
  const today=todayKey();
  const entries=weightEntriesSorted(DATA);
  const latest=latestWeight(DATA);
  const hasData=entries.length>0||w.goal!=null;

  // ЭКРАН БЕЗ НАСТРОЙКИ
  if(!hasData){
    root.innerHTML=`
      <div class="section-lbl">Контроль веса</div>
      <div class="wl-setup-card">
        <div class="wl-setup-icon">⚖</div>
        <div class="wl-setup-title">Следи за весом</div>
        <div class="wl-setup-sub">Задай цель, записывай вес каждый день — Tempo покажет прогресс, темп снижения и прогноз даты достижения цели. За каждую запись +${POINTS.weightLog} балла.</div>
        <button class="wl-primary-btn" onclick="openWeightSetup()">Настроить цель</button>
      </div>
      ${renderWaterSection()}
      ${renderCaloriesSection()}
    `;
    return;
  }

  // --- расчёты ---
  const start=w.start;
  const goal=w.goal;
  const lost=weightLost(DATA);
  const totalToLose=(start!=null&&goal!=null&&start>goal)?start-goal:null;
  const remaining=(latest!=null&&goal!=null)?Math.max(0,latest-goal):null;
  const pctRing=totalToLose>0?Math.min(1,lost/totalToLose):0;

  const height=w.height;
  const bmi=height&&latest?(latest/((height/100)**2)):null;
  const bmiMeta=bmi?bmiInfo(bmi):null;

  const pace=pacePerWeek(); // отрицательный = теряем
  const paceAbs=Math.abs(pace);
  const weeksLeft=(remaining>0&&pace<0)?Math.round(remaining/Math.abs(pace)):null;
  const goalDate=weeksLeft!=null?new Date(Date.now()+weeksLeft*7*86400000):null;

  // неделя: изменение
  const weekKey=shiftDay(today,-7);
  const weekEntry=entries.filter(e=>e.key<=weekKey).slice(-1)[0];
  const weekChange=weekEntry&&latest!=null?latest-weekEntry.kg:null;

  const todayEntry=w.log[today];
  const daysLogged=Object.keys(w.log).length;

  // --- section label ---
  let html=`<div class="section-lbl">⚖ Вес · сегодня</div>`;

  // --- hero card ---
  html+=`<div class="wl-hero">`;

  // верхняя строка: вес + BMI
  html+=`<div class="wl-hero-row">
    <div class="wl-hero-left">
      <div class="wl-hero-lbl">Текущий вес</div>
      <div class="wl-hero-val">${latest!=null?latest.toFixed(1):'—'}<span class="wl-hero-unit">кг</span></div>
      ${goal!=null?`<div class="wl-hero-sub">Цель: ${goal} кг · <span style="color:var(--good);">${remaining>0?'−'+remaining.toFixed(1)+' кг осталось':'цель достигнута 🎉'}</span></div>`:''}
    </div>
    ${bmi!=null?`
      <div class="wl-bmi-badge${bmiMeta?' bmi-'+bmiMeta.cls:''}">
        <div class="wl-bmi-val">${bmi.toFixed(1)}</div>
        <div class="wl-bmi-lbl">BMI</div>
        ${bmiMeta?`<div class="wl-bmi-cat">${bmiMeta.label}</div>`:''}
      </div>`:''}
  </div>`;

  // прогресс-кольцо — показываем только если есть прогресс или >1 записи
  if(totalToLose>0){
    const r=26,c=2*Math.PI*r;
    const dash=pctRing*c;
    const pctInt=Math.round(pctRing*100);
    html+=`
      <div class="wl-ring-wrap">
        <svg class="wl-ring-svg" viewBox="0 0 64 64">
          <circle class="wl-ring-bg" cx="32" cy="32" r="${r}"/>
          <circle class="wl-ring-fg" cx="32" cy="32" r="${r}" stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}"/>
        </svg>
        <div class="wl-ring-info">
          ${pctInt>0
            ?`<div class="wl-ring-pct">${pctInt}%</div>
               <div class="wl-ring-desc">пути к цели · −${lost.toFixed(1)} из ${totalToLose.toFixed(1)} кг</div>`
            :`<div class="wl-ring-pct" style="font-size:15px;line-height:1.3;">Начало</div>
               <div class="wl-ring-desc">Записывай вес каждый день — появится прогресс</div>`
          }
        </div>
      </div>
    `;
  }
  html+=`</div>`; // hero end

  // --- метрики (всегда 2 или 4 карточки, чтобы сетка не ломалась) ---
  const metricCards=[];

  if(weekChange!=null){
    const wcCls=weekChange<0?'good':weekChange>0?'bad':'';
    metricCards.push(`<div class="wl-metric-card">
      <div class="wl-mc-lbl">Эта неделя</div>
      <div class="wl-mc-val ${wcCls}">${weekChange>0?'+':''}${weekChange.toFixed(1)}</div>
      <div class="wl-mc-sub">кг за 7 дней</div>
    </div>`);
  }

  metricCards.push(`<div class="wl-metric-card">
    <div class="wl-mc-lbl">Потеряно</div>
    <div class="wl-mc-val${lost>0?' good':''}">${lost>0?'−'+lost.toFixed(1):'—'}</div>
    <div class="wl-mc-sub">кг · ${daysLogged} ${daysLogged===1?'запись':'записей'}</div>
  </div>`);

  if(paceAbs>0){
    const paceCls=paceAbs>=0.3&&paceAbs<=1?'good':paceAbs>1?'warn':'';
    metricCards.push(`<div class="wl-metric-card">
      <div class="wl-mc-lbl">Темп</div>
      <div class="wl-mc-val ${paceCls}">${paceAbs.toFixed(2)}</div>
      <div class="wl-mc-sub">кг / нед</div>
    </div>`);
  }else if(goal!=null){
    // заглушка «темп» пока мало данных
    metricCards.push(`<div class="wl-metric-card">
      <div class="wl-mc-lbl">Темп</div>
      <div class="wl-mc-val" style="color:var(--muted);font-size:16px;">—</div>
      <div class="wl-mc-sub">нужно 2+ записи</div>
    </div>`);
  }

  if(weeksLeft!=null){
    metricCards.push(`<div class="wl-metric-card">
      <div class="wl-mc-lbl">До цели</div>
      <div class="wl-mc-val warn">~${weeksLeft}</div>
      <div class="wl-mc-sub">недель</div>
    </div>`);
  }else if(goal!=null&&remaining>0){
    metricCards.push(`<div class="wl-metric-card">
      <div class="wl-mc-lbl">Осталось</div>
      <div class="wl-mc-val">${remaining.toFixed(1)}</div>
      <div class="wl-mc-sub">кг до цели</div>
    </div>`);
  }

  // сетка ломается при нечётном числе — добавляем пустышку если надо
  if(metricCards.length%2!==0){
    metricCards.push(`<div class="wl-metric-card wl-metric-empty"></div>`);
  }

  if(metricCards.length>0){
    html+=`<div class="wl-metric-grid">${metricCards.join('')}</div>`;
  }

  // --- chart ---
  if(entries.length>=2){
    const rangeShow=filterEntriesByRange(entries,WEIGHT_CHART_RANGE);
    const overallChange=rangeShow.length>=2?rangeShow[rangeShow.length-1].kg-rangeShow[0].kg:0;
    const rangeLbl={['1w']:'1 неделя',['4w']:'4 недели',['3m']:'3 месяца',['all']:'Всё время'}[WEIGHT_CHART_RANGE];
    html+=`
      <div class="wl-chart-card">
        <div class="wl-chart-head">
          <span class="wl-chart-title">График веса · ${rangeLbl}</span>
          <span class="wl-chart-trend" style="color:${overallChange<0?'var(--good)':overallChange>0?'var(--bad)':'var(--muted)'};">${overallChange<=0?'↓':'↑'} ${Math.abs(overallChange).toFixed(1)} кг</span>
        </div>
        <div class="wl-chart-tabs">
          <button class="wl-ct${WEIGHT_CHART_RANGE==='1w'?' sel':''}" onclick="setWeightChartRange('1w')">1 нед</button>
          <button class="wl-ct${WEIGHT_CHART_RANGE==='4w'?' sel':''}" onclick="setWeightChartRange('4w')">4 нед</button>
          <button class="wl-ct${WEIGHT_CHART_RANGE==='3m'?' sel':''}" onclick="setWeightChartRange('3m')">3 мес</button>
          <button class="wl-ct${WEIGHT_CHART_RANGE==='all'?' sel':''}" onclick="setWeightChartRange('all')">Все</button>
        </div>
        ${renderWeightChart(entries)}
      </div>
    `;
  }

  // --- кнопки ---
  html+=`
    <div class="wl-action-row">
      <button class="wl-primary-btn" style="flex:1;" onclick="openWeightLog()">${todayEntry?'Изменить запись':'+ Записать вес'}</button>
      <button class="wl-secondary-btn" onclick="openWeightSetup()">Цель</button>
    </div>
  `;

  // --- последние записи ---
  if(entries.length>0){
    html+=`<div class="section-lbl" style="margin-top:4px;">Последние записи</div>`;
    entries.slice(-5).reverse().forEach((e,i,arr)=>{
      const prev=arr[i+1];
      const diff=prev!=null?(e.kg-prev.kg):null;
      const diffCls=diff==null?'same':diff<0?'down':diff>0?'up':'same';
      const diffStr=diff==null?'—':diff<0?'−'+Math.abs(diff).toFixed(1):diff>0?'+'+diff.toFixed(1):'=';
      const rel=relDay(e.key)||fmtDate(dateFromKey(e.key));
      html+=`
        <div class="wl-log-card">
          <div class="wl-log-date">${rel}</div>
          <div class="wl-log-kg">${e.kg.toFixed(1)} кг</div>
          <div class="wl-log-diff ${diffCls}">${diffStr}</div>
        </div>
      `;
    });
  }

  // --- goal prediction card ---
  if(goalDate&&remaining>0){
    const opts={day:'numeric',month:'long'};
    const dateStr=goalDate.toLocaleDateString('ru-RU',opts);
    html+=`
      <div class="wl-goal-card" style="margin-top:6px;">
        <div style="font-size:20px;">🎯</div>
        <div class="wl-goal-info">
          <div class="wl-goal-title">До цели ${goal} кг — ~${weeksLeft} нед.</div>
          <div class="wl-goal-sub">При темпе ${paceAbs.toFixed(2)} кг/нед достигнешь ~ ${dateStr}</div>
        </div>
      </div>
    `;
  }

  // --- вода ---
  html+=renderWaterSection();

  // --- еда ---
  html+=renderCaloriesSection();

  root.innerHTML=html;
}

// --- weight setup modal ---
function openWeightSetup(){
  const w=DATA.weight;
  const html=`
    <div class="panel-head">
      <h2>Настройка цели</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="field-grp">
        <label class="field-lbl">Текущий вес (кг)</label>
        <input class="field-inp" id="ws-current" type="number" step="0.1" min="30" max="300" placeholder="Например: 85.0" value="${latestWeight(DATA)||''}"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Целевой вес (кг)</label>
        <input class="field-inp" id="ws-goal" type="number" step="0.1" min="30" max="300" placeholder="Например: 74.0" value="${w.goal||''}"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Рост (см) — для расчёта BMI</label>
        <input class="field-inp" id="ws-height" type="number" step="1" min="100" max="250" placeholder="Например: 175" value="${w.height||''}"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Дневная норма воды (мл)</label>
        <div class="dur-row" style="margin-bottom:8px;">
          ${[1500,2000,2500,3000].map(v=>`<button class="dur-btn${DATA.water.goalMl===v?' sel':''}" onclick="setWaterGoalPreset(${v})">${v>=1000?v/1000+'л':v}</button>`).join('')}
        </div>
        <input class="field-inp" id="ws-water-goal" type="number" step="50" min="500" max="5000" placeholder="мл" value="${DATA.water.goalMl||2000}"/>
      </div>
    </div>
    <div class="panel-foot">
      <button class="pf-cancel" onclick="closeOverlay()">Отмена</button>
      <button class="pf-save" onclick="saveWeightSetup()">Сохранить</button>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

function setWaterGoalPreset(v){
  document.getElementById('ws-water-goal').value=v;
  document.querySelectorAll('#panel .dur-btn').forEach(b=>b.classList.toggle('sel',b.textContent===(v>=1000?v/1000+'л':v+'')));
}

function saveWeightSetup(){
  const cur=parseFloat(document.getElementById('ws-current').value);
  const goal=parseFloat(document.getElementById('ws-goal').value);
  const height=parseFloat(document.getElementById('ws-height').value);
  const waterGoal=parseInt(document.getElementById('ws-water-goal').value);
  if(!isNaN(goal))DATA.weight.goal=goal;
  if(!isNaN(height))DATA.weight.height=height;
  if(!isNaN(waterGoal)&&waterGoal>=500)DATA.water.goalMl=waterGoal;
  if(!isNaN(cur)&&cur>0){
    const today=todayKey();
    if(DATA.weight.start==null)DATA.weight.start=cur;
    const existed=!!DATA.weight.log[today];
    DATA.weight.log[today]={kg:cur,ts:Date.now()};
    if(!existed)addPoints(POINTS.weightLog,'weight log');
  }
  saveData();
  closeOverlay();
  renderWeight();
  showToast('Настройки сохранены','good');
}

// --- weight log modal ---
function openWeightLog(){
  const today=todayKey();
  const existing=DATA.weight.log[today];
  const curKg=existing?existing.kg:'';
  const curNote=existing?existing.note||'':'';
  const html=`
    <div class="panel-head">
      <h2>Записать вес</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div style="text-align:center;font-size:11px;color:var(--muted);margin-bottom:16px;">${fmtDayName(new Date())+', '+fmtDate(new Date())}</div>
      <div class="field-grp">
        <label class="field-lbl">Вес сегодня (кг)</label>
        <input class="field-inp" id="wl-kg" type="number" step="0.1" min="30" max="300" placeholder="Например: 82.5" value="${curKg}" style="font-size:24px;font-weight:500;text-align:center;letter-spacing:-0.02em;"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Заметка (необязательно)</label>
        <input class="field-inp" id="wl-note" placeholder="Например: после тренировки" value="${escHtml(curNote)}"/>
      </div>
      ${existing?`<div style="font-size:11px;color:var(--muted);text-align:center;">Изменение сегодняшней записи · повторные баллы не начисляются</div>`:`<div style="background:var(--good-soft);border:0.5px solid rgba(124,179,66,0.3);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--good);">За запись +${POINTS.weightLog} балла</div>`}
    </div>
    <div class="panel-foot">
      ${existing?'<button class="pf-delete" onclick="deleteWeightLog()">Удалить</button>':''}
      <button class="pf-cancel" onclick="closeOverlay()">Отмена</button>
      <button class="pf-save" onclick="saveWeightLog()">Сохранить</button>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
  setTimeout(()=>{const el=document.getElementById('wl-kg');if(el){el.focus();el.select();}},100);
}

function saveWeightLog(){
  const kg=parseFloat(document.getElementById('wl-kg').value);
  if(!kg||kg<20||kg>500){showToast('Введи корректный вес','bad');return;}
  const note=document.getElementById('wl-note').value.trim();
  const today=todayKey();
  const existed=!!DATA.weight.log[today];
  if(DATA.weight.start==null)DATA.weight.start=kg;
  DATA.weight.log[today]={kg,ts:Date.now(),note};
  if(!existed)addPoints(POINTS.weightLog,'weight log');
  else{saveData();checkAchievements();}
  closeOverlay();
  renderWeight();
  updateTopBar();
  showToast(!existed?`Записано: ${kg} кг · +${POINTS.weightLog} балла`:`Обновлено: ${kg} кг`,'good');
}

function deleteWeightLog(){
  if(!confirm('Удалить запись веса за сегодня?'))return;
  const today=todayKey();
  delete DATA.weight.log[today];
  saveData();
  closeOverlay();
  renderWeight();
}

// --- water modal ---
let _waterSelIdx=0;
let _waterCustom=null;

function openWaterModal(){
  _waterSelIdx=0;
  _waterCustom=null;
  _renderWaterModal();
}

function _renderWaterModal(){
  const sel=WATER_PRESETS[_waterSelIdx];
  const ml=_waterCustom!=null?_waterCustom:sel.ml;
  const pts=POINTS.waterCup;
  const presets=WATER_PRESETS.map((p,i)=>`
    <button class="wl-preset-btn${i===_waterSelIdx&&_waterCustom==null?' sel':''}" onclick="selectWaterPreset(${i})">
      <div class="wl-pb-icon">${p.icon}</div>
      <div class="wl-pb-name">${p.name}</div>
      <div class="wl-pb-ml">${p.ml} мл</div>
    </button>
  `).join('');
  const html=`
    <div class="panel-head">
      <h2>Добавить воду</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="field-lbl">Быстрый выбор</div>
      <div class="wl-presets-grid">${presets}</div>
      <div class="field-lbl" style="margin-top:12px;">Или введи своё</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
        <input class="field-inp wl-custom-inp" id="wm-custom" type="number" min="1" max="3000" placeholder="мл" value="${_waterCustom!=null?_waterCustom:''}" oninput="onWaterCustomInput()"/>
        <span style="font-size:12px;color:var(--muted);">мл</span>
      </div>
      <div class="wl-pts-preview">
        <span style="font-size:18px;">${_waterCustom!=null?'💧':sel.icon}</span>
        <div>
          <div class="wl-pts-preview-val">+${pts} балла</div>
          <div class="wl-pts-preview-desc">${_waterCustom!=null?_waterCustom+' мл':sel.name+' · '+sel.ml+' мл'} · +2 к счётчику воды</div>
        </div>
      </div>
    </div>
    <div class="panel-foot">
      <button class="pf-cancel" onclick="closeOverlay()">Отмена</button>
      <button class="pf-save" onclick="confirmAddWater()">Добавить ${_waterCustom!=null?_waterCustom+' мл':sel.name+' '+sel.ml+' мл'}</button>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

function selectWaterPreset(i){
  _waterSelIdx=i;
  _waterCustom=null;
  _renderWaterModal();
}

function onWaterCustomInput(){
  const v=parseInt(document.getElementById('wm-custom').value);
  _waterCustom=v>0?v:null;
  // обновляем preview без полного ре-рендера
  const sel=WATER_PRESETS[_waterSelIdx];
  const ml=_waterCustom!=null?_waterCustom:sel.ml;
  const icon=_waterCustom!=null?'💧':sel.icon;
  const prev=document.querySelector('.wl-pts-preview-desc');
  const saveBtn=document.querySelector('.pf-save');
  if(prev)prev.textContent=ml+' мл · +2 к счётчику воды';
  if(saveBtn)saveBtn.textContent='Добавить '+(ml)+' мл';
  // снять выделение пресетов
  document.querySelectorAll('.wl-preset-btn').forEach(b=>b.classList.remove('sel'));
}

function confirmAddWater(){
  const sel=WATER_PRESETS[_waterSelIdx];
  const ml=_waterCustom!=null?_waterCustom:sel.ml;
  const icon=_waterCustom!=null?'💧':sel.icon;
  if(!ml||ml<1){showToast('Введи количество','bad');return;}
  closeOverlay();
  addWaterEntry(ml,icon);
}

// ============================================================
// === END WEIGHT LOSS SYSTEM =================================
