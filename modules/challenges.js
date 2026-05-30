// === CHALLENGES SCREEN ===

function renderChallenges(){
  const root=document.getElementById('ms-challenges');
  const active=DATA.challenges.filter(c=>!c.completed&&!c.failed);
  const archive=DATA.challenges.filter(c=>c.completed||c.failed);

  let html=`<div class="section-lbl">Активные челленджи</div>`;

  if(active.length===0){
    html+=`<div class="empty-day" style="margin-bottom:10px;">Челленджей пока нет. Создай первый — выбери что хочешь держать N дней подряд.</div>`;
  }else{
    active.forEach(c=>{
      const stats=challengeStats(c);
      html+=renderChallengeCard(c,stats);
    });
  }

  html+=`<button class="ch-add" onclick="openChallengeEditor()">+ Создать челлендж</button>`;

  if(archive.length>0){
    html+=`<div class="ch-archive-section"><div class="section-lbl">Архив</div>`;
    archive.slice().reverse().forEach(c=>{
      const result=c.completed?'completed':'failed';
      const txt=c.completed?'Завершён':('Сорвался на дне '+(c.failedDay||'—'));
      html+=`
        <div class="ch-arch-card">
          <div class="ch-arch-info">
            <div class="ch-arch-name">${escHtml(c.name)}</div>
            <div class="ch-arch-result ${result}">${txt} · ${c.duration} дней</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="icon-btn" onclick="restoreChallenge('${c.id}')" title="Начать заново">↻</button>
            <button class="icon-btn danger" onclick="deleteChallengePermanent('${c.id}')" title="Удалить навсегда">×</button>
          </div>
        </div>
      `;
    });
    html+=`</div>`;
  }

  root.innerHTML=html;
}

function challengeStats(c){
  const start=dateFromKey(c.startDate);
  const today=new Date();today.setHours(0,0,0,0);start.setHours(0,0,0,0);
  const dayNum=Math.floor((today-start)/86400000)+1;
  const days=Math.max(1,Math.min(c.duration,dayNum));
  const todayK=todayKey();
  const markedToday=(c.marks||{})[todayK];
  return{dayNum,days,markedToday,daysCompleted:Object.values(c.marks||{}).filter(v=>v).length};
}

function getMilestoneText(c,stats){
  const d=stats.dayNum;
  if(d===1)return'Первый день. Самое сложное — начать. Это уже сделано.';
  if(d===2)return'Второй день. Уже не случайность — это намерение.';
  if(d===3)return'Три дня. Мозг начинает перестраиваться.';
  if(d===5)return'Пять дней. Уже виден характер.';
  if(d===7)return'Неделя. Это уже не эксперимент — это решение.';
  if(d===10)return'Десять дней. Каждый следующий — по инерции легче.';
  if(d===14)return'Две недели. Большинство сходит в этой точке. Ты — нет.';
  if(d===21)return'Двадцать один день. Говорят за это время формируется привычка. Ты дошёл.';
  if(d===30)return'Месяц! Это уже часть тебя.';
  if(d===50)return'Пятьдесят дней. Серьёзно.';
  if(d===100)return'Сто дней. Ты вошёл в редкий клуб.';
  if(d>=c.duration)return'Челлендж завершён. Отметь финал.';
  return null;
}

function renderChallengeCard(c,stats){
  const pct=(stats.daysCompleted/c.duration)*100;
  const milestone=getMilestoneText(c,stats);
  const isComplete=stats.daysCompleted>=c.duration;
  const todayK=todayKey();
  const markedToday=stats.markedToday;

  return`
    <div class="ch-card${isComplete?' completed':''}">
      <div class="ch-head">
        <div class="ch-name">${escHtml(c.name)}</div>
        <div class="ch-days-pill">${stats.daysCompleted}/${c.duration} дней</div>
      </div>
      ${c.desc?`<div class="ch-desc">${escHtml(c.desc)}</div>`:''}
      <div class="ch-progress"><div class="ch-progress-fill" style="width:${pct}%"></div></div>
      <div class="ch-progress-row">
        <span>День ${stats.dayNum} из ${c.duration}</span>
        <span>${Math.round(pct)}%</span>
      </div>
      ${milestone?`<div class="ch-milestone">${escHtml(milestone)}</div>`:''}
      ${isComplete?`
        <div class="ch-actions">
          <button class="ch-mark-btn" onclick="completeChallenge('${c.id}')">Завершить челлендж</button>
          <button class="ch-fail-btn" onclick="deleteChallengePermanent('${c.id}')" title="Удалить">×</button>
        </div>
      `:`
        <div class="ch-actions">
          <button class="ch-mark-btn ${markedToday?'done':''}" onclick="markChallengeDay('${c.id}')">${markedToday?'✓ Сегодня держусь':'Отметить сегодня'}</button>
          <button class="ch-fail-btn" onclick="failChallenge('${c.id}')" title="Сорвался">⚠</button>
          <button class="ch-fail-btn" onclick="deleteChallengePermanent('${c.id}')" title="Удалить">×</button>
        </div>
      `}
    </div>
  `;
}

function openChallengeEditor(){
  const html=`
    <div class="panel-head">
      <h2>Новый челлендж</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="field-grp">
        <label class="field-lbl">Что держим</label>
        <input class="field-inp" id="cf-name" placeholder="Например: не ем сахар" maxlength="60"/>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Описание (необязательно)</label>
        <textarea class="field-inp" id="cf-desc" placeholder="Подробнее — что считается срывом, какие условия"></textarea>
      </div>
      <div class="field-grp">
        <label class="field-lbl">Срок</label>
        <div class="duration-grid" id="dur-grid">
          <button class="dur-card-btn" data-d="3" onclick="selectDur(3)"><span class="dur-card-num">3</span><span class="dur-card-lbl">дня</span></button>
          <button class="dur-card-btn sel" data-d="7" onclick="selectDur(7)"><span class="dur-card-num">7</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="14" onclick="selectDur(14)"><span class="dur-card-num">14</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="21" onclick="selectDur(21)"><span class="dur-card-num">21</span><span class="dur-card-lbl">день</span></button>
          <button class="dur-card-btn" data-d="30" onclick="selectDur(30)"><span class="dur-card-num">30</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="60" onclick="selectDur(60)"><span class="dur-card-num">60</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="90" onclick="selectDur(90)"><span class="dur-card-num">90</span><span class="dur-card-lbl">дней</span></button>
          <button class="dur-card-btn" data-d="100" onclick="selectDur(100)"><span class="dur-card-num">100</span><span class="dur-card-lbl">дней</span></button>
        </div>
      </div>
    </div>
    <div class="panel-foot">
      <button class="pf-cancel" onclick="closeOverlay()">Отмена</button>
      <button class="pf-save" onclick="createChallenge()">Создать</button>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
  window._chDur=7;
}

function selectDur(d){
  window._chDur=d;
  document.querySelectorAll('#dur-grid .dur-card-btn').forEach(b=>b.classList.toggle('sel',Number(b.dataset.d)===d));
}

function createChallenge(){
  const name=document.getElementById('cf-name').value.trim();
  if(!name){showToast('Введи название','bad');return;}
  const desc=document.getElementById('cf-desc').value.trim();
  const dur=window._chDur||7;
  const c={
    id:'c_'+Date.now(),
    name,desc,duration:dur,
    startDate:todayKey(),
    marks:{},
    created:Date.now(),
    completed:false,
    failed:false,
  };
  DATA.challenges.push(c);
  saveData();
  closeOverlay();
  renderChallenges();
  showToast('Челлендж создан · Удачи','good');
}

function markChallengeDay(id){
  const c=DATA.challenges.find(x=>x.id===id);
  if(!c)return;
  const k=todayKey();
  if(!c.marks)c.marks={};
  c.marks[k]=!c.marks[k];
  saveData();
  renderChallenges();
  if(c.marks[k]){
    const stats=challengeStats(c);
    if(stats.daysCompleted>=c.duration){showToast('Челлендж пройден!','good');}
  }
}

function failChallenge(id){
  if(!confirm('Отметить как сорванный? Челлендж уйдёт в архив, можно начать заново.'))return;
  const c=DATA.challenges.find(x=>x.id===id);
  if(!c)return;
  c.failed=true;
  c.failedDay=challengeStats(c).dayNum;
  c.endedAt=Date.now();
  saveData();
  renderChallenges();
}

function completeChallenge(id){
  const c=DATA.challenges.find(x=>x.id===id);
  if(!c)return;
  c.completed=true;
  c.endedAt=Date.now();
  saveData();
  checkAchievements();
  renderChallenges();
  showToast('Челлендж завершён · Молодец','good');
}

function restoreChallenge(id){
  if(!confirm('Восстановить челлендж и начать заново с сегодня?'))return;
  const c=DATA.challenges.find(x=>x.id===id);
  if(!c)return;
  c.completed=false;
  c.failed=false;
  c.failedDay=null;
  c.startDate=todayKey();
  c.marks={};
  saveData();
  renderChallenges();
}

function deleteChallengePermanent(id){
  if(!confirm('Удалить челлендж навсегда? Это действие нельзя отменить.'))return;
  DATA.challenges=DATA.challenges.filter(c=>c.id!==id);
  saveData();
  renderChallenges();
  showToast('Челлендж удалён');
}
