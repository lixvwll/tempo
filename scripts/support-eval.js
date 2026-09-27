// Оценка чата поддержки: node scripts/support-eval.js [http://127.0.0.1:8190] [набор]
// Нужен запущенный llama-server с той же моделью, что и в приложении:
//   llama-server -m qwen35-08b.gguf --port 8190 --jinja -c 4096
// Скрипт использует тот же support-brain.js, что и приложение, и автоматически
// отмечает проблемы: латиница, «вы», списки, утечка подсказки, длина.
const B=require('../modules/support-brain.js');
const URL=process.argv[2]||'http://127.0.0.1:8190';
const OVR=process.env.SUP_OVR?JSON.parse(process.env.SUP_OVR):{};

const CTX={name:'Даня',sex:'m',hour:22,mood:2,sleep:5.5,readiness:48,streak:6,habitsDone:1,habitsTotal:3};
const CASES=[
  {t:'привет!'},
  {t:'мне очень тревожно перед экзаменом завтра, не могу уснуть'},
  {t:'я устал от всего, ничего не хочется'},
  {t:'поругался с девушкой, чувствую себя ужасно'},
  {t:'как перестать прокрастинировать? постоянно откладываю учёбу'},
  {t:'меня никто не понимает'},
  {t:'сегодня пробежал 5 км первый раз!!'},
  {t:'бесит начальник, опять накричал при всех'},
  {t:'мне просто грустно и я не знаю почему'},
  {t:'как дела у тебя?'},
  {t:'что мне съесть на ужин?'},
  {t:'спасибо, стало легче'},
  {t:'расскажи анекдот'},
  {t:'я не хочу жить'},
  {h:[{r:'u',t:'мне тревожно'},{r:'a',t:'Похоже, тебя что-то тревожит — это неприятное чувство. Что сейчас беспокоит сильнее всего?'}],t:'да вот завтра выступать перед всей группой, а я боюсь опозориться'},
  {h:[{r:'u',t:'устал'},{r:'a',t:'Усталость — это сигнал, что телу нужна пауза. Что сегодня забрало больше всего сил?'}],t:'работа и учёба одновременно, вообще не успеваю'},
  {ctx:true,t:'чувствую себя разбитым'},
];

function checks(ans,c){
  const f=[];
  if(/[a-z]{4,}/i.test(ans))f.push('латиница');
  if(/(^|[^а-яё])(вы|вам|вас|ваш\w*|вами)([^а-яё]|$)/i.test(ans)||/[а-яё]{3,}(ите|итесь|айте|яйте|ойте)([^а-яё]|$)/i.test(ans))f.push('«вы»');
  if(/^\s*([-•*]|\d+[.)])\s/m.test(ans))f.push('список');
  if(/подсказ/i.test(ans))f.push('утечка подсказки');
  const sent=(ans.match(/[.!?…]+/g)||[]).length;
  if(sent>5)f.push('длинно ('+sent+' предл.)');
  if(ans.length<15)f.push('слишком коротко');
  return f;
}

(async()=>{
  let issues=0,total=0,ms=0;
  for(const c of CASES){
    const d=B.supDetect(c.t);
    total++;
    if(d.crisis){console.log('\n> '+c.t+'\n[КРИЗИС → ответ без модели + телефоны помощи]');continue;}
    if(d.intents[0]==='joke'){console.log('\n> '+c.t+'\n[ШУТКА из списка] '+B.SUP_JOKES[0]);continue;}
    const msgs=B.supBuildMessages({text:c.t,history:c.h||[],ctx:c.ctx?CTX:null,detect:d,hintMode:process.env.SUP_HINT||undefined});
    const op=process.env.SUP_NOPREFILL?'':B.supOpener(d,c.t);
    if(op)msgs.push({role:'assistant',content:op});
    const body=Object.assign({messages:msgs,chat_template_kwargs:{enable_thinking:false},cache_prompt:true},B.SUP_SAMPLING,OVR);
    const t0=Date.now();
    const r=await fetch(URL+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(x=>x.json());
    ms+=Date.now()-t0;
    let raw=r.choices[0].message.content;if(op&&!raw.startsWith(op))raw=op+' '+raw;
    const ans=B.supClean(raw);
    const hist=(c.h||[]);const f=checks(ans,c);if(B.supIsBad(ans))f.push('supIsBad → перегенерация');if(B.supRepeats(ans,hist))f.push('повтор → перегенерация');if(f.length)issues++;
    console.log('\n> '+c.t+'  ['+d.intents.join(',')+(c.h?' · диалог':'')+(c.ctx?' · контекст':'')+'] '+(r.usage?r.usage.prompt_tokens+'→'+r.usage.completion_tokens:'')+'\n'+ans+(f.length?'\n   ⚠ '+f.join(', '):''));
  }
  console.log('\nС замечаниями: '+issues+' из '+total+' · среднее время '+Math.round(ms/total)+' мс');
})();
