// ============================================================
// === CALORIES MODULE (section inside weight screen) =========
// ============================================================

// ── data helpers ────────────────────────────────────────────

function calEnsure(){
  if(!DATA.calories) DATA.calories={goalKcal:0,log:{},savedFoods:[],age:null,gender:null,activity:null,setupDone:false};
  if(!DATA.calories.log) DATA.calories.log={};
  if(!DATA.calories.savedFoods) DATA.calories.savedFoods=[];
  return DATA.calories;
}

function caloriesTodayLog(){
  const c=calEnsure();
  const k=todayKey();
  if(!c.log[k]) c.log[k]=[];
  return c.log[k];
}

function caloriesTodayTotal(){
  return caloriesTodayLog().reduce((s,e)=>s+e.kcal,0);
}

function calGoal(){
  return calEnsure().goalKcal||0;
}

function calSavedFoods(){
  return calEnsure().savedFoods;
}

// ── BMR calculator (Mifflin-St Jeor) ────────────────────────

function calcBMR(weight,height,age,gender){
  if(!weight||!height||!age||!gender) return 0;
  if(gender==='m') return Math.round(10*weight + 6.25*height - 5*age + 5);
  return Math.round(10*weight + 6.25*height - 5*age - 161);
}

const ACTIVITY_LEVELS=[
  {id:'sedentary',  name:'Минимальная',  desc:'Сидячий образ жизни, без тренировок',mult:1.2},
  {id:'light',      name:'Лёгкая',       desc:'Тренировки 1–3 раза в неделю',mult:1.375},
  {id:'moderate',   name:'Умеренная',    desc:'Тренировки 3–5 раз в неделю',mult:1.55},
  {id:'active',     name:'Высокая',      desc:'Тренировки 6–7 раз в неделю',mult:1.725},
  {id:'very_active',name:'Очень высокая',desc:'Тяжёлые нагрузки каждый день',mult:1.9},
];

function calcTDEE(bmr,activityId){
  const a=ACTIVITY_LEVELS.find(x=>x.id===activityId);
  return a?Math.round(bmr*a.mult):bmr;
}

// ── section renderer ────────────────────────────────────────

function renderCaloriesSection(){
  const c=calEnsure();

  // ── Состояние «не настроено» — показываем setup
  if(!c.setupDone||!c.goalKcal){
    return `
      <div class="section-lbl" style="margin-top:20px;">🍽 Питание</div>
      <div class="wl-setup-card">
        <div class="wl-setup-icon">🍽</div>
        <div class="wl-setup-title">Счётчик калорий</div>
        <div class="wl-setup-sub">Рассчитаем дневную норму по формуле Миффлина — нужен рост, вес, возраст, пол и уровень активности. Или задай цель вручную.</div>
        <button class="wl-primary-btn" onclick="openCalSetup()">Рассчитать норму</button>
      </div>
    `;
  }

  // ── Настроено — показываем трекер
  const log=caloriesTodayLog();
  const total=caloriesTodayTotal();
  const goal=c.goalKcal;
  const pct=Math.min(100,Math.round(total/goal*100));
  const remaining=goal-total;
  const barColor=pct>=100?'var(--bad)':pct>=80?'var(--warn)':'var(--info)';

  let itemsHtml='';
  if(log.length===0){
    itemsHtml=`<div class="cal-empty">Пока пусто — нажми «+» чтобы записать что поел.</div>`;
  }else{
    log.forEach((e,i)=>{
      itemsHtml+=`
        <div class="cal-entry" onclick="calToggleEntry(this)">
          <div class="cal-entry-icon">${e.icon||'🍽'}</div>
          <div class="cal-entry-info">
            <div class="cal-entry-name">${escHtml(e.name)}</div>
            <div class="cal-entry-meta">${e.kcalPer100}&#8239;ккал/100г · ${e.grams}&#8239;г</div>
          </div>
          <div class="cal-entry-right">
            <div class="cal-entry-kcal">${e.kcal}</div>
            <div class="cal-entry-unit">ккал</div>
          </div>
          <div class="cal-entry-actions">
            <button class="cal-entry-del-btn" onclick="event.stopPropagation();calDeleteEntry(${i})">Удалить</button>
          </div>
        </div>`;
    });
  }

  return `
    <div class="section-lbl" style="margin-top:20px;">🍽 Питание · сегодня</div>
    <div class="cal-progress-card">
      <div class="cal-prog-row">
        <div>
          <div class="cal-prog-label">Съедено</div>
          <div class="cal-prog-nums">
            <span class="cal-prog-eaten">${total}</span>
            <span class="cal-prog-of">/ ${goal} ккал</span>
          </div>
        </div>
        <div class="cal-prog-right">
          <div class="cal-prog-rem-val" style="color:${remaining<0?'var(--bad)':'var(--info)'}">
            ${remaining<0?'+'+Math.abs(remaining):remaining}
          </div>
          <div class="cal-prog-rem-lbl">${remaining<0?'перебор':'осталось'}</div>
        </div>
      </div>
      <div class="cal-bar-track">
        <div class="cal-bar-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>
      <div class="cal-prog-bottom">
        <span class="cal-bar-pct">${pct}%</span>
        <button class="cal-goal-btn" onclick="openCalGoalModal()" title="Изменить цель">
          <span class="cal-goal-icon">🎯</span>
          <span class="cal-goal-val">${goal}&#8239;ккал/день</span>
        </button>
      </div>
    </div>

    <button class="cal-add-btn" onclick="openCalAddModal()">
      <span class="cal-add-plus">+</span>
      <span>Добавить продукт</span>
    </button>

    <div class="cal-list">${itemsHtml}</div>
  `;
}

// ── SETUP modal (BMR calculator) ─────────────────────────────

let _calSetupGender='m';
let _calSetupActivity='moderate';

function openCalSetup(){
  const c=calEnsure();
  const w=DATA.weight;
  const weight=latestWeight(DATA)||'';
  const height=w.height||'';
  const age=c.age||'';
  _calSetupGender=c.gender||'m';
  _calSetupActivity=c.activity||'moderate';

  _renderCalSetup(weight,height,age);
}

function _renderCalSetup(weight,height,age){
  const genderBtns=`
    <div class="cal-gender-row">
      <button class="cal-gender-btn${_calSetupGender==='m'?' sel':''}" onclick="_calSetGender('m','${weight}','${height}','${age}')">♂ Мужской</button>
      <button class="cal-gender-btn${_calSetupGender==='f'?' sel':''}" onclick="_calSetGender('f','${weight}','${height}','${age}')">♀ Женский</button>
    </div>
  `;

  const actBtns=ACTIVITY_LEVELS.map(a=>`
    <button class="cal-act-btn${_calSetupActivity===a.id?' sel':''}" onclick="_calSetActivity('${a.id}')">
      <div class="cal-act-name">${a.name}</div>
      <div class="cal-act-desc">${a.desc}</div>
    </button>
  `).join('');

  // Pre-calc if we have all values
  const wV=parseFloat(weight)||0;
  const hV=parseFloat(height)||0;
  const aV=parseInt(age)||0;
  let previewHtml='';
  if(wV>0&&hV>0&&aV>0){
    const bmr=calcBMR(wV,hV,aV,_calSetupGender);
    const tdee=calcTDEE(bmr,_calSetupActivity);
    const deficit=Math.round(tdee*0.8);
    previewHtml=`
      <div class="cal-preview-card">
        <div class="cal-preview-row">
          <div class="cal-preview-item">
            <div class="cal-preview-val">${bmr}</div>
            <div class="cal-preview-lbl">Базовый обмен</div>
          </div>
          <div class="cal-preview-item">
            <div class="cal-preview-val">${tdee}</div>
            <div class="cal-preview-lbl">С активностью</div>
          </div>
          <div class="cal-preview-item accent">
            <div class="cal-preview-val">${deficit}</div>
            <div class="cal-preview-lbl">Дефицит −20%</div>
          </div>
        </div>
        <div class="cal-preview-hint">Рекомендуем ${deficit} ккал/день для похудения (дефицит 20%)</div>
      </div>
    `;
  }

  const html=`
    <div class="panel-head">
      <h2>Расчёт нормы калорий</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="cal-setup-formula">Формула Миффлина-Сан Жеора</div>

      <div class="field-grp">
        <label class="field-lbl">Пол</label>
        ${genderBtns}
      </div>

      <div class="field-grp">
        <label class="field-lbl">Вес (кг)</label>
        <input class="field-inp" id="cal-s-weight" type="number" step="0.1" min="30" max="300" placeholder="Например: 85" value="${weight}" oninput="calSetupRecalc()"/>
      </div>

      <div class="field-grp">
        <label class="field-lbl">Рост (см)</label>
        <input class="field-inp" id="cal-s-height" type="number" min="100" max="250" placeholder="Например: 175" value="${height}" oninput="calSetupRecalc()"/>
      </div>

      <div class="field-grp">
        <label class="field-lbl">Возраст (лет)</label>
        <input class="field-inp" id="cal-s-age" type="number" min="10" max="100" placeholder="Например: 22" value="${age}" oninput="calSetupRecalc()"/>
      </div>

      <div class="field-grp">
        <label class="field-lbl">Уровень активности</label>
        <div class="cal-act-list">${actBtns}</div>
      </div>

      <div id="cal-setup-preview">${previewHtml}</div>

      <div class="field-grp">
        <label class="field-lbl">Цель ккал/день</label>
        <input class="field-inp" id="cal-s-goal" type="number" min="500" max="6000" placeholder="Введите или используйте расчёт" value="${wV>0&&hV>0&&aV>0?Math.round(calcTDEE(calcBMR(wV,hV,aV,_calSetupGender),_calSetupActivity)*0.8):''}" data-auto="1" oninput="this.dataset.auto='0'"/>
        <div class="cal-setup-tip">Можете ввести своё значение или нажмите «Рассчитать» выше</div>
      </div>

      <button class="pf-save" onclick="calSetupSave()">Сохранить</button>
      <div style="height:20px;"></div>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');

  // Auto-fill goal
  calSetupRecalc();
}

function _calSetGender(g){
  _calSetupGender=g;
  // Re-read current values from inputs
  const w=document.getElementById('cal-s-weight')?.value||'';
  const h=document.getElementById('cal-s-height')?.value||'';
  const a=document.getElementById('cal-s-age')?.value||'';
  _renderCalSetup(w,h,a);
}

function _calSetActivity(id){
  _calSetupActivity=id;
  const w=document.getElementById('cal-s-weight')?.value||'';
  const h=document.getElementById('cal-s-height')?.value||'';
  const a=document.getElementById('cal-s-age')?.value||'';
  _renderCalSetup(w,h,a);
}

function calSetupRecalc(){
  const wV=parseFloat(document.getElementById('cal-s-weight')?.value)||0;
  const hV=parseFloat(document.getElementById('cal-s-height')?.value)||0;
  const aV=parseInt(document.getElementById('cal-s-age')?.value)||0;
  const previewEl=document.getElementById('cal-setup-preview');
  const goalEl=document.getElementById('cal-s-goal');

  if(wV>0&&hV>0&&aV>0){
    const bmr=calcBMR(wV,hV,aV,_calSetupGender);
    const tdee=calcTDEE(bmr,_calSetupActivity);
    const deficit=Math.round(tdee*0.8);

    if(previewEl){
      previewEl.innerHTML=`
        <div class="cal-preview-card">
          <div class="cal-preview-row">
            <div class="cal-preview-item">
              <div class="cal-preview-val">${bmr}</div>
              <div class="cal-preview-lbl">Базовый обмен</div>
            </div>
            <div class="cal-preview-item">
              <div class="cal-preview-val">${tdee}</div>
              <div class="cal-preview-lbl">С активностью</div>
            </div>
            <div class="cal-preview-item accent">
              <div class="cal-preview-val">${deficit}</div>
              <div class="cal-preview-lbl">Дефицит −20%</div>
            </div>
          </div>
          <div class="cal-preview-hint">Рекомендуем ${deficit} ккал/день для похудения (дефицит 20%)</div>
        </div>
      `;
    }
    // Auto-fill goal if empty or was auto-set
    if(goalEl&&(!goalEl.value||goalEl.dataset.auto==='1')){
      goalEl.value=deficit;
      goalEl.dataset.auto='1';
    }
  }else{
    if(previewEl) previewEl.innerHTML='';
  }
}

function calSetupSave(){
  const weight=parseFloat(document.getElementById('cal-s-weight')?.value);
  const height=parseInt(document.getElementById('cal-s-height')?.value);
  const age=parseInt(document.getElementById('cal-s-age')?.value);
  const goal=parseInt(document.getElementById('cal-s-goal')?.value);

  if(!goal||goal<500||goal>6000){showToast('Введи цель от 500 до 6000 ккал');return;}

  const c=calEnsure();
  c.goalKcal=goal;
  c.age=age||null;
  c.gender=_calSetupGender;
  c.activity=_calSetupActivity;
  c.setupDone=true;

  // Sync height to weight module if provided
  if(height&&height>=100&&height<=250) DATA.weight.height=height;

  saveData();
  closeOverlay();
  renderWeight();
  showToast('Цель: '+goal+' ккал/день','good');
}

// ── ADD FOOD modal ──────────────────────────────────────────

function openCalAddModal(prefill){
  const saved=calSavedFoods();
  const pName=prefill?escHtml(prefill.name):'';
  const pKcal=prefill?prefill.kcalPer100:'';

  const savedChips=saved.map((f,i)=>
    `<button class="cal-chip" onclick="calPickSaved(${i})">${escHtml(f.name)}<span class="cal-chip-del" onclick="event.stopPropagation();calDeleteSaved(${i})">×</span></button>`
  ).join('');

  const savedSection=saved.length>0
    ?`<div class="field-lbl" style="margin-bottom:8px;">Сохранённые продукты</div>
       <div class="cal-chips">${savedChips}</div>`
    :'';

  const html=`
    <div class="panel-head">
      <h2>Добавить продукт</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      ${savedSection}

      <div class="field-grp">
        <label class="field-lbl">Название</label>
        <input class="field-inp" id="cal-name" type="text" placeholder="Например, гречка" maxlength="50" value="${pName}" oninput="calRecalc()">
      </div>

      <div style="display:flex;gap:10px;">
        <div class="field-grp" style="flex:1;">
          <label class="field-lbl">Ккал / 100г</label>
          <input class="field-inp" id="cal-kcal100" type="number" min="0" max="900" placeholder="340" value="${pKcal}" oninput="calRecalc()">
        </div>
        <div class="field-grp" style="flex:1;">
          <label class="field-lbl">Сколько граммов</label>
          <input class="field-inp" id="cal-grams" type="number" min="1" max="5000" placeholder="200" oninput="calRecalc()">
        </div>
      </div>

      <div class="cal-result-box" id="cal-result-box" style="display:none">
        <span class="cal-result-label">Итого</span>
        <span class="cal-result-kcal" id="cal-result-kcal">0 ккал</span>
      </div>

      <button class="pf-save" onclick="calSubmitAdd()">Добавить</button>
      <div style="height:20px;"></div>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');

  if(prefill) setTimeout(()=>{
    const g=document.getElementById('cal-grams');
    if(g) g.focus();
  },100);
}

function calPickSaved(idx){
  const f=calSavedFoods()[idx];
  if(!f) return;
  const n=document.getElementById('cal-name');
  const k=document.getElementById('cal-kcal100');
  if(n) n.value=f.name;
  if(k) k.value=f.kcalPer100;
  calRecalc();
  const g=document.getElementById('cal-grams');
  if(g) g.focus();
}

function calRecalc(){
  const k=parseFloat(document.getElementById('cal-kcal100')?.value)||0;
  const g=parseFloat(document.getElementById('cal-grams')?.value)||0;
  const box=document.getElementById('cal-result-box');
  const val=document.getElementById('cal-result-kcal');
  if(!box||!val) return;
  if(k>0&&g>0){
    const kcal=Math.round(k*g/100);
    val.textContent=kcal+' ккал';
    box.style.display='flex';
  }else{
    box.style.display='none';
  }
}

function calSubmitAdd(){
  const name=(document.getElementById('cal-name')?.value||'').trim();
  const kcalPer100=parseFloat(document.getElementById('cal-kcal100')?.value);
  const grams=parseFloat(document.getElementById('cal-grams')?.value);

  if(!name){showToast('Введи название продукта');return;}
  if(!kcalPer100||kcalPer100<=0){showToast('Введи калории на 100г');return;}
  if(!grams||grams<=0){showToast('Введи количество граммов');return;}

  const kcal=Math.round(kcalPer100*grams/100);
  const icon=calPickIcon(name);

  const saved=calSavedFoods();
  const alreadySaved=saved.some(f=>f.name.toLowerCase()===name.toLowerCase());

  const entry={name,kcalPer100,grams,kcal,icon,ts:Date.now()};
  caloriesTodayLog().push(entry);
  saveData();
  closeOverlay();
  renderWeight();
  showToast('+'+kcal+' ккал · '+name);

  // Offer to save if not already saved
  if(!alreadySaved){
    setTimeout(()=>openCalSavePrompt(name,kcalPer100,icon),400);
  }
}

// ── SAVE PROMPT ──────────────────────────────────────────────

function openCalSavePrompt(name,kcalPer100,icon){
  const safeName=escHtml(name).replace(/'/g,"\\'");
  const html=`
    <div class="panel-head">
      <h2>Сохранить продукт?</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll" style="text-align:center;padding-top:10px;">
      <div style="font-size:44px;margin-bottom:10px;">${icon}</div>
      <div style="font-size:15px;color:var(--text2);margin-bottom:20px;line-height:1.5;">
        Добавить «${escHtml(name)}» (${kcalPer100} ккал/100г) в сохранённые продукты?<br>В следующий раз можно будет выбрать одним нажатием.
      </div>
      <button class="pf-save" onclick="calConfirmSave('${safeName}',${kcalPer100},'${icon}')">Да, сохранить</button>
      <button class="pf-cancel" style="margin-top:8px;" onclick="closeOverlay()">Нет, не нужно</button>
      <div style="height:20px;"></div>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

function calConfirmSave(name,kcalPer100,icon){
  const saved=calSavedFoods();
  if(!saved.some(f=>f.name.toLowerCase()===name.toLowerCase())){
    saved.push({name,kcalPer100,icon});
    saveData();
  }
  closeOverlay();
  showToast('«'+name+'» сохранён','good');
}

// ── toggle entry actions ─────────────────────────────────────

function calToggleEntry(el){
  // Close all other open entries
  document.querySelectorAll('.cal-entry.open').forEach(e=>{
    if(e!==el) e.classList.remove('open');
  });
  el.classList.toggle('open');
}

// ── DELETE saved food ────────────────────────────────────────

function calDeleteSaved(idx){
  const saved=calSavedFoods();
  if(idx<0||idx>=saved.length) return;
  const name=saved[idx].name;
  saved.splice(idx,1);
  saveData();
  // Re-open modal to refresh chips
  closeOverlay();
  setTimeout(()=>openCalAddModal(),200);
  showToast('«'+name+'» удалён из продуктов');
}

// ── DELETE food entry ────────────────────────────────────────

function calDeleteEntry(idx){
  const log=caloriesTodayLog();
  if(idx<0||idx>=log.length) return;
  const e=log[idx];
  log.splice(idx,1);
  saveData();
  renderWeight();
  showToast('Удалено · '+e.name);
}

// ── CHANGE GOAL modal ────────────────────────────────────────

function openCalGoalModal(){
  const cur=calGoal();
  const html=`
    <div class="panel-head">
      <h2>Цель калорий</h2>
      <button class="close-btn" onclick="closeOverlay()">×</button>
    </div>
    <div class="panel-scroll">
      <div class="field-grp">
        <label class="field-lbl">Ккал в день</label>
        <input class="field-inp" id="cal-goal-input" type="number" min="500" max="6000" value="${cur}" placeholder="1500">
      </div>
      <div class="cal-goal-presets">
        <button class="cal-chip" onclick="document.getElementById('cal-goal-input').value=1200">1200</button>
        <button class="cal-chip" onclick="document.getElementById('cal-goal-input').value=1500">1500</button>
        <button class="cal-chip" onclick="document.getElementById('cal-goal-input').value=1800">1800</button>
        <button class="cal-chip" onclick="document.getElementById('cal-goal-input').value=2000">2000</button>
        <button class="cal-chip" onclick="document.getElementById('cal-goal-input').value=2500">2500</button>
      </div>
      <button class="pf-save" onclick="calSaveGoal()">Сохранить</button>
      <button class="pf-cancel" style="margin-top:8px;" onclick="openCalSetup()">Пересчитать по формуле</button>
      <div style="height:20px;"></div>
    </div>
  `;
  document.getElementById('panel').innerHTML=html;
  document.getElementById('overlay').classList.add('open');
}

function calSaveGoal(){
  const v=parseInt(document.getElementById('cal-goal-input')?.value);
  if(!v||v<500||v>6000){showToast('Введи от 500 до 6000 ккал');return;}
  calEnsure().goalKcal=v;
  saveData();
  closeOverlay();
  renderWeight();
  showToast('Цель: '+v+' ккал/день','good');
}

// ── icon picker ──────────────────────────────────────────────

function calPickIcon(name){
  const n=name.toLowerCase();
  if(/овсян|каш|хлопь/.test(n)) return '🥣';
  if(/яйц|омлет/.test(n)) return '🍳';
  if(/курин|грудк|курица/.test(n)) return '🍗';
  if(/рис|греч|булгур|кускус|пшен/.test(n)) return '🍚';
  if(/макарон|паст|спагетт/.test(n)) return '🍝';
  if(/хлеб|тост/.test(n)) return '🍞';
  if(/йогурт|творог|кефир/.test(n)) return '🥛';
  if(/салат|овощ|помидор|огурец|перец/.test(n)) return '🥗';
  if(/банан/.test(n)) return '🍌';
  if(/яблок/.test(n)) return '🍎';
  if(/сыр/.test(n)) return '🧀';
  if(/рыб|лосось|тунец/.test(n)) return '🐟';
  if(/мяс|говяд|свинин|фарш/.test(n)) return '🥩';
  if(/суп|борщ/.test(n)) return '🍲';
  if(/орех|миндаль|кешью/.test(n)) return '🥜';
  if(/шоколад|конфет|сладк/.test(n)) return '🍫';
  if(/кофе/.test(n)) return '☕';
  if(/чай/.test(n)) return '🍵';
  return '🍽';
}

// ── home widget ──────────────────────────────────────────────

function renderCaloriesWidget(){
  const c=calEnsure();
  if(!c.setupDone||!c.goalKcal) return ''; // Don't show widget if not set up

  const total=caloriesTodayTotal();
  const goal=c.goalKcal;
  const pct=Math.min(100,Math.round(total/goal*100));
  const remaining=goal-total;
  const barColor=pct>=100?'var(--bad)':pct>=80?'var(--warn)':'var(--info)';

  return `
    <div class="home-widget cal-widget" onclick="navTo('weight')">
      <div class="cal-w-header">
        <span class="cal-w-title">Питание</span>
        <span class="cal-w-pct" style="color:${barColor}">${pct}%</span>
      </div>
      <div class="cal-w-nums">
        <span class="cal-w-eaten">${total}</span>
        <span class="cal-w-of"> / ${goal} ккал</span>
      </div>
      <div class="cal-w-bar">
        <div class="cal-w-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>
      <div class="cal-w-sub">${remaining<0?'перебор на '+Math.abs(remaining)+' ккал':'осталось '+remaining+' ккал'}</div>
    </div>
  `;
}
