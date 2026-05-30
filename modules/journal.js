// === JOURNAL SCREEN ===

const MOODS=[
  {e:'😔',l:'Плохо',v:1},
  {e:'😕',l:'Так себе',v:2},
  {e:'😐',l:'Норм',v:3},
  {e:'🙂',l:'Хорошо',v:4},
  {e:'😄',l:'Отлично',v:5},
];

const J_QUESTIONS=[
  ['Что сегодня получилось?','Что было сложно?','Что хочешь сделать иначе завтра?'],
  ['Чем гордишься сегодня?','Что отвлекало?','За что благодарен?'],
  ['Какой момент дня самый яркий?','Где сегодня застрял?','Что нового узнал?'],
  ['Что прибавило энергии?','Что её забрало?','Что унесёшь из этого дня?'],
  ['Если бы повторить день — что изменил бы?','Что удивило?','Что сейчас на душе?'],
  ['Чем сегодня помог себе?','Где был не в моменте?','Чего ждёшь завтра?'],
  ['Что сегодня далось легче чем обычно?','Что тяжелее?','Какая мысль крутится в голове?'],
];

function getQuestionsForDay(key){
  const d=dateFromKey(key);
  const idx=(d.getFullYear()*1000+d.getMonth()*32+d.getDate())%J_QUESTIONS.length;
  return J_QUESTIONS[idx];
}

function journalSetDay(k){
  if(JOURNAL_DAY){
    saveJournalDayInline();
  }
  JOURNAL_DAY=k;
  renderJournal();
}

function saveJournalDayInline(){
  if(!JOURNAL_DAY)return;
  ['q1','q2','q3','word','free'].forEach(f=>{
    const el=document.querySelector(`[data-q="${f}"]`)||(f==='word'?document.getElementById('j-word'):null)||(f==='free'?document.getElementById('journal-text'):null);
    if(el){
      if(!DATA.journalStruct[JOURNAL_DAY])DATA.journalStruct[JOURNAL_DAY]={};
      DATA.journalStruct[JOURNAL_DAY][f]=el.value.trim();
    }
  });
  saveData();
}

function setMood(v){
  DATA.moods[JOURNAL_DAY]=v;
  saveData();
  renderJournal();
}

let SHOW_J_SEARCH=false;

function renderJournal(){
  if(!JOURNAL_DAY)JOURNAL_DAY=todayKey();
  const root=document.getElementById('ms-journal');
  const struct=DATA.journalStruct[JOURNAL_DAY]||{q1:'',q2:'',q3:'',word:'',planned:null,free:''};
  const oldEntry=DATA.journal[JOURNAL_DAY]||'';
  const finalFree=struct.free||oldEntry;
  const mood=DATA.moods[JOURNAL_DAY]||0;
  const questions=getQuestionsForDay(JOURNAL_DAY);

  let moodHtml='<div class="mood-row">';
  MOODS.forEach(m=>{
    moodHtml+=`<button class="mood-btn${mood===m.v?' sel':''}" onclick="setMood(${m.v})"><span class="mood-e">${m.e}</span><span class="mood-l">${m.l}</span></button>`;
  });
  moodHtml+='</div>';

  let html=renderDayNav(JOURNAL_DAY,'journalSetDay')+renderWeekStrip(JOURNAL_DAY,'journalSetDay');

  html+=`
    <div class="section-lbl">Поиск по записям <button class="section-lbl-act" onclick="toggleJournalSearch()">${SHOW_J_SEARCH?'Скрыть':'Открыть'}</button></div>
    <div id="j-search-box" style="display:${SHOW_J_SEARCH?'block':'none'};" class="j-search-row">
      <input class="j-search-inp" id="j-search-input" placeholder="Найти слово или фразу..." oninput="searchJournal()"/>
      <div class="j-search-results" id="j-search-results"></div>
    </div>

    <div class="section-lbl">Настроение</div>
    ${moodHtml}

    <div class="section-lbl">Слово дня</div>
    <input class="j-word-input" id="j-word" placeholder="Одно слово описывающее день..." value="${escHtml(struct.word||'')}" maxlength="30" onblur="saveJournalField('word',this.value)"/>

    <div class="section-lbl">План дня</div>
    <div class="j-checks-row">
      <button class="j-check-card${struct.planned===true?' sel':''}" onclick="setPlanned(true)">
        <div class="j-check-lbl">План на день</div>
        <div class="j-check-val">✓ Получился</div>
      </button>
      <button class="j-check-card${struct.planned===false?' sel':''}" onclick="setPlanned(false)">
        <div class="j-check-lbl">План на день</div>
        <div class="j-check-val">× Не очень</div>
      </button>
    </div>

    <div class="section-lbl">Три вопроса</div>
    <div class="j-question-card">
      <div class="j-q-text">${questions[0]}</div>
      <textarea class="j-q-input" data-q="q1" onblur="saveJournalField('q1',this.value)" placeholder="Можно одной строкой">${escHtml(struct.q1||'')}</textarea>
    </div>
    <div class="j-question-card">
      <div class="j-q-text">${questions[1]}</div>
      <textarea class="j-q-input" data-q="q2" onblur="saveJournalField('q2',this.value)" placeholder="Можно одной строкой">${escHtml(struct.q2||'')}</textarea>
    </div>
    <div class="j-question-card">
      <div class="j-q-text">${questions[2]}</div>
      <textarea class="j-q-input" data-q="q3" onblur="saveJournalField('q3',this.value)" placeholder="Можно одной строкой">${escHtml(struct.q3||'')}</textarea>
    </div>

    <div class="section-lbl">Свободная запись</div>
    <textarea class="journal-area" id="journal-text" onblur="saveJournalField('free',this.value)" placeholder="Если хочется написать что-то ещё...">${escHtml(finalFree)}</textarea>
    <div class="journal-save-row">
      <span class="journal-saved" id="journal-saved"></span>
      <button class="journal-btn" onclick="saveJournalAll()">Сохранить</button>
    </div>
  `;

  root.innerHTML=html;
}

function toggleJournalSearch(){SHOW_J_SEARCH=!SHOW_J_SEARCH;renderJournal();if(SHOW_J_SEARCH)setTimeout(()=>{const el=document.getElementById('j-search-input');if(el)el.focus();},100);}

function searchJournal(){
  const q=document.getElementById('j-search-input').value.trim().toLowerCase();
  const out=document.getElementById('j-search-results');
  if(!q){out.innerHTML='';return;}
  const results=[];
  Object.entries(DATA.journalStruct||{}).forEach(([k,v])=>{
    const all=[v.q1,v.q2,v.q3,v.word,v.free].filter(Boolean).join(' ');
    if(all.toLowerCase().includes(q))results.push({key:k,text:all});
  });
  Object.entries(DATA.journal||{}).forEach(([k,v])=>{
    if(DATA.journalStruct&&DATA.journalStruct[k])return;
    if((v||'').toLowerCase().includes(q))results.push({key:k,text:v});
  });
  results.sort((a,b)=>b.key.localeCompare(a.key));
  if(results.length===0){out.innerHTML='<div style="font-size:12px;color:var(--muted);padding:10px;">Не найдено</div>';return;}
  let html='';
  results.slice(0,15).forEach(r=>{
    const d=dateFromKey(r.key);
    const dateStr=fmtDayName(d)+', '+fmtDate(d);
    const idx=r.text.toLowerCase().indexOf(q);
    const start=Math.max(0,idx-30);
    const snip=(start>0?'…':'')+r.text.slice(start,start+90)+(r.text.length>start+90?'…':'');
    html+=`<div class="j-result-card" onclick="jumpToJournal('${r.key}')"><div class="j-result-date">${dateStr}</div><div class="j-result-snippet">${escHtml(snip)}</div></div>`;
  });
  out.innerHTML=html;
}

function jumpToJournal(k){JOURNAL_DAY=k;SHOW_J_SEARCH=false;renderJournal();}

function saveJournalField(field,val){
  if(!DATA.journalStruct[JOURNAL_DAY])DATA.journalStruct[JOURNAL_DAY]={};
  DATA.journalStruct[JOURNAL_DAY][field]=val.trim();
  saveData();
  checkAchievements();
}

function setPlanned(v){
  if(!DATA.journalStruct[JOURNAL_DAY])DATA.journalStruct[JOURNAL_DAY]={};
  DATA.journalStruct[JOURNAL_DAY].planned=DATA.journalStruct[JOURNAL_DAY].planned===v?null:v;
  saveData();
  renderJournal();
}

function saveJournalAll(){
  ['q1','q2','q3','word','free'].forEach(f=>{
    const el=document.querySelector(`[data-q="${f}"]`)||(f==='word'?document.getElementById('j-word'):null)||(f==='free'?document.getElementById('journal-text'):null);
    if(el){
      if(!DATA.journalStruct[JOURNAL_DAY])DATA.journalStruct[JOURNAL_DAY]={};
      DATA.journalStruct[JOURNAL_DAY][f]=el.value.trim();
    }
  });
  saveData();
  checkAchievements();
  const e=document.getElementById('journal-saved');
  e.textContent='Сохранено';
  e.className='journal-saved show';
  setTimeout(()=>{e.textContent='';e.className='journal-saved';},1500);
}
