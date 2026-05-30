// === STATS SCREEN ===

let STATS_PERIOD='week';

function renderStats(){
  const root=document.getElementById('ms-stats');
  const periods=[
    {id:'week',name:'Неделя',days:7},
    {id:'month',name:'Месяц',days:30},
    {id:'3month',name:'3 мес',days:90},
    {id:'6month',name:'6 мес',days:180},
    {id:'year',name:'Год',days:365},
  ];
  const period=periods.find(p=>p.id===STATS_PERIOD)||periods[0];

  let html=`<div class="period-tabs">`;
  periods.forEach(p=>{
    html+=`<button class="pt-btn${STATS_PERIOD===p.id?' active':''}" onclick="setStatsPeriod('${p.id}')">${p.name}</button>`;
  });
  html+=`</div>`;

  const today=new Date();
  const days=[];
  for(let i=period.days-1;i>=0;i--){
    const d=new Date(today);d.setDate(today.getDate()-i);
    days.push(todayKey(d));
  }
  const prevDays=[];
  for(let i=period.days*2-1;i>=period.days;i--){
    const d=new Date(today);d.setDate(today.getDate()-i);
    prevDays.push(todayKey(d));
  }

  const ptsCur=days.reduce((a,k)=>a+getDayPoints(k),0);
  const ptsPrev=prevDays.reduce((a,k)=>a+getDayPoints(k),0);
  const ptsTrend=trendOf(ptsCur,ptsPrev);

  let lecAtt=0,lecSkip=0;
  days.forEach(k=>{Object.entries((DATA.tasks[k]||{})).forEach(([tk,t])=>{if(tk.startsWith('lec_')){if(t.done)lecAtt++;if(t.skipped)lecSkip++;}});});
  let lecAttPrev=0,lecSkipPrev=0;
  prevDays.forEach(k=>{Object.entries((DATA.tasks[k]||{})).forEach(([tk,t])=>{if(tk.startsWith('lec_')){if(t.done)lecAttPrev++;if(t.skipped)lecSkipPrev++;}});});
  const lecTotal=lecAtt+lecSkip;
  const lecPct=lecTotal?Math.round((lecAtt/lecTotal)*100):0;
  const lecTotalPrev=lecAttPrev+lecSkipPrev;
  const lecPctPrev=lecTotalPrev?Math.round((lecAttPrev/lecTotalPrev)*100):0;
  const lecTrend=trendOf(lecPct,lecPctPrev);

  let tasksDone=0;
  days.forEach(k=>{Object.entries((DATA.tasks[k]||{})).forEach(([tk,t])=>{if(!tk.startsWith('lec_')&&t.done)tasksDone++;});});
  let tasksDonePrev=0;
  prevDays.forEach(k=>{Object.entries((DATA.tasks[k]||{})).forEach(([tk,t])=>{if(!tk.startsWith('lec_')&&t.done)tasksDonePrev++;});});
  const tasksTrend=trendOf(tasksDone,tasksDonePrev);

  let habitsDone=0;
  days.forEach(k=>{const dd=DATA.habitLogs[k]||{};Object.values(dd).forEach(v=>{if(v)habitsDone++;});});
  let habitsDonePrev=0;
  prevDays.forEach(k=>{const dd=DATA.habitLogs[k]||{};Object.values(dd).forEach(v=>{if(v)habitsDonePrev++;});});
  const habitsTrend=trendOf(habitsDone,habitsDonePrev);

  const ptsData=days.map(k=>getDayPoints(k));

  html+=`
    <div class="stat-block">
      <div class="sb-head">
        <span class="sb-title">Баллы за период</span>
        ${trendBadge(ptsTrend)}
      </div>
      <div class="sb-main">${ptsCur>=0?'+':''}${ptsCur}</div>
      <div class="sb-sub">было ${ptsPrev>=0?'+':''}${ptsPrev} в прошлом периоде</div>
      <div class="chart-wrap">${renderLineChart(ptsData,period.days<=30?days.map(k=>dateFromKey(k).getDate()):null)}</div>
    </div>

    <div class="stat-block">
      <div class="sb-head">
        <span class="sb-title">Посещаемость пар</span>
        ${trendBadge(lecTrend)}
      </div>
      <div class="donut-row">
        ${renderDonut(lecPct)}
        <div class="donut-info">
          <div class="donut-pct">${lecPct}%</div>
          <div class="donut-meta">Посещено ${lecAtt} из ${lecTotal||'—'}<br>Прогулов: ${lecSkip}</div>
        </div>
      </div>
    </div>

    <div class="stat-block">
      <div class="sb-head"><span class="sb-title">Привычки и дела</span></div>
      <div class="records-grid">
        <div class="record-cell">
          <div class="record-val">${habitsDone}</div>
          <div class="record-lbl">Привычек ${trendArrow(habitsTrend)}</div>
        </div>
        <div class="record-cell">
          <div class="record-val">${tasksDone}</div>
          <div class="record-lbl">Дел ${trendArrow(tasksTrend)}</div>
        </div>
      </div>
    </div>

    <div class="stat-block">
      <div class="sb-head"><span class="sb-title">Рекорды (за всё время)</span></div>
      <div class="records-grid">
        <div class="record-cell">
          <div class="record-val">${DATA.longestStreak||0}</div>
          <div class="record-lbl">Лучшая серия</div>
        </div>
        <div class="record-cell">
          <div class="record-val">${maxHabitStreak(DATA)}</div>
          <div class="record-lbl">Стрик привычки</div>
        </div>
        <div class="record-cell">
          <div class="record-val">${bestDayPoints()}</div>
          <div class="record-lbl">Лучший день</div>
        </div>
        <div class="record-cell">
          <div class="record-val">${Object.keys(DATA.achievements||{}).length}/${ACHIEVEMENTS.length}</div>
          <div class="record-lbl">Достижений</div>
        </div>
      </div>
    </div>
  `;

  root.innerHTML=html;
}

function setStatsPeriod(p){STATS_PERIOD=p;renderStats();}

function trendOf(cur,prev){
  if(prev===0&&cur===0)return{kind:'flat',pct:0};
  if(prev===0)return cur>0?{kind:'up',pct:100}:{kind:'down',pct:100};
  const diff=cur-prev;
  const pct=Math.round((Math.abs(diff)/Math.abs(prev))*100);
  if(Math.abs(diff)<0.001)return{kind:'flat',pct:0};
  return{kind:diff>0?'up':'down',pct};
}

function trendBadge(t){
  if(t.kind==='flat')return`<span class="sb-trend flat">— без изменений</span>`;
  const sym=t.kind==='up'?'↑':'↓';
  return`<span class="sb-trend ${t.kind}">${sym} ${t.pct}%</span>`;
}

function trendArrow(t){
  if(t.kind==='flat')return`<span style="color:var(--muted);">—</span>`;
  return`<span style="color:var(--${t.kind==='up'?'good':'bad'});">${t.kind==='up'?'↑':'↓'}</span>`;
}

function bestDayPoints(){let best=0;Object.entries(DATA.pointsLog||{}).forEach(([k,l])=>{const p=l.pos-l.neg;if(p>best)best=p;});return best;}

function renderLineChart(values,labels){
  if(values.length===0)return'';
  const w=300,h=110,pad=14;
  const min=Math.min(0,...values),max=Math.max(0,...values,1);
  const range=max-min||1;
  const n=values.length;
  const pts=values.map((v,i)=>{
    const x=pad+((w-pad*2)*(n===1?0.5:i/(n-1)));
    const y=h-pad-((v-min)/range)*(h-pad*2);
    return[x,y];
  });
  const linePath=pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const areaPath=linePath+' L'+pts[pts.length-1][0].toFixed(1)+','+(h-pad)+' L'+pts[0][0].toFixed(1)+','+(h-pad)+' Z';
  const zeroY=h-pad-((0-min)/range)*(h-pad*2);
  let svg=`<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
  svg+=`<line class="chart-grid" x1="${pad}" y1="${zeroY}" x2="${w-pad}" y2="${zeroY}" stroke-dasharray="2,2"/>`;
  svg+=`<path class="chart-area" d="${areaPath}"/>`;
  svg+=`<path class="chart-line" d="${linePath}"/>`;
  if(n<=14){pts.forEach(p=>{svg+=`<circle class="chart-dot" cx="${p[0]}" cy="${p[1]}" r="2.5"/>`;});}
  svg+=`</svg>`;
  return svg;
}

function renderDonut(pct){
  const r=32,c=2*Math.PI*r;
  const dash=(pct/100)*c;
  return`<svg class="donut-svg" viewBox="0 0 80 80"><circle class="donut-bg" cx="40" cy="40" r="${r}"/><circle class="donut-fg" cx="40" cy="40" r="${r}" stroke-dasharray="${dash} ${c}"/></svg>`;
}
