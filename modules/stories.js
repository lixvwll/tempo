// === STORIES ===
let STORIES_DATA=null;
let STORIES_IDX=0;
let STORIES_TIMER=null;
let STORIES_DURATION=6000;
let STORIES_PAUSED=false;
let STORIES_START_TIME=0;
let STORIES_ELAPSED=0;

const STORIES_SEEN_KEY='tempo_stories_seen';

function loadStoriesSeen(){
  try{return JSON.parse(localStorage.getItem(STORIES_SEEN_KEY)||'[]');}catch(e){return [];}
}
function saveStoriesSeen(arr){localStorage.setItem(STORIES_SEEN_KEY,JSON.stringify(arr));}

async function fetchStories(){
  if(STORIES_DATA)return STORIES_DATA;
  try{
    const res=await fetch('news.json?_='+Date.now());
    if(!res.ok)throw new Error('not ok');
    const data=await res.json();
    STORIES_DATA=data;
    return data;
  }catch(e){
    // fallback на встроенные если файл недоступен
    STORIES_DATA={version:'1.0',items:[
      {id:'fallback',type:'tip',emoji:'💾',title:'Не теряй данные',body:'Экспортируй JSON раз в неделю и храни в облаке. Данные в браузере исчезнут если очистить кэш.',color:'amber',date:''}
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
  STORIES_IDX=0;
  showStory();
  document.getElementById('stories').classList.add('open');
  document.getElementById('stories').classList.remove('closing');
}

function showStory(){
  if(!STORIES_DATA||!STORIES_DATA.items[STORIES_IDX])return;
  const item=STORIES_DATA.items[STORIES_IDX];
  const body=document.getElementById('st-body');

  const color=item.color||'default';
  body.parentElement.querySelector('.st-body').className='st-body st-bg-'+color;

  document.getElementById('st-emoji').textContent=item.emoji||'✨';
  document.getElementById('st-title').textContent=item.title||'';
  document.getElementById('st-text').textContent=item.body||'';
  document.getElementById('st-meta-icon').textContent=item.type==='update'?'◆':'💡';
  document.getElementById('st-meta-time').textContent=item.type==='update'?'обновление':'совет';

  // Прогресс-бары
  const row=document.getElementById('st-progress-row');
  row.innerHTML='';
  STORIES_DATA.items.forEach((_,i)=>{
    const bar=document.createElement('div');
    bar.className='st-progress'+(i<STORIES_IDX?' done':'');
    const fill=document.createElement('div');
    fill.className='st-progress-fill';
    if(i===STORIES_IDX){fill.id='st-progress-active';}
    else if(i<STORIES_IDX){fill.style.width='100%';}
    bar.appendChild(fill);
    row.appendChild(bar);
  });

  // Отметить как просмотренное
  const seen=loadStoriesSeen();
  if(!seen.includes(item.id)){seen.push(item.id);saveStoriesSeen(seen);}

  // Запустить canvas анимацию
  startStoryCanvas(color);

  startStoryTimer();
}

function startStoryTimer(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  STORIES_START_TIME=Date.now();
  STORIES_ELAPSED=0;
  STORIES_PAUSED=false;
  
  function tick(){
    if(STORIES_PAUSED)return;
    const now=Date.now();
    const elapsed=STORIES_ELAPSED+(now-STORIES_START_TIME);
    const pct=Math.min(100,(elapsed/STORIES_DURATION)*100);
    const fill=document.getElementById('st-progress-active');
    if(fill)fill.style.width=pct+'%';
    if(pct>=100){
      storyNext();
      return;
    }
    STORIES_TIMER=requestAnimationFrame(tick);
  }
  STORIES_TIMER=requestAnimationFrame(tick);
}

function storyNext(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  STORIES_IDX++;
  if(STORIES_IDX>=STORIES_DATA.items.length){
    closeStories();
    return;
  }
  showStory();
}

function storyPrev(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  if(STORIES_IDX>0){
    STORIES_IDX--;
    showStory();
  }else{
    showStory();
  }
}

function closeStories(){
  if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
  stopStoryCanvas();
  const el=document.getElementById('stories');
  el.classList.add('closing');
  setTimeout(()=>{
    el.classList.remove('open','closing');
    checkStoriesUnread();
  },220);
}

// Hold to pause (long press)
document.addEventListener('DOMContentLoaded',()=>{
  const stEl=document.getElementById('stories');
  if(!stEl)return;
  let holdTimer=null;
  const startHold=(e)=>{
    if(e.target.classList.contains('st-close'))return;
    holdTimer=setTimeout(()=>{
      STORIES_PAUSED=true;
      STORIES_ELAPSED+=Date.now()-STORIES_START_TIME;
    },200);
  };
  const endHold=()=>{
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
    if(STORIES_PAUSED){
      STORIES_PAUSED=false;
      STORIES_START_TIME=Date.now();
      startStoryTimer();
    }
  };
  stEl.addEventListener('mousedown',startHold);
  stEl.addEventListener('touchstart',startHold,{passive:true});
  stEl.addEventListener('mouseup',endHold);
  stEl.addEventListener('touchend',endHold);
  stEl.addEventListener('mouseleave',endHold);
});

// Keyboard navigation
document.addEventListener('keydown',(e)=>{
  if(!document.getElementById('stories').classList.contains('open'))return;
  if(e.key==='Escape')closeStories();
  else if(e.key==='ArrowRight'||e.key===' ')storyNext();
  else if(e.key==='ArrowLeft')storyPrev();
});

// === STORIES CANVAS ANIMATION ===
let ST_RAF=null;
let ST_PARTICLES=[];
let ST_TICK=0;

const ST_EFFECTS={
  amber:{
    bg1:'#1a1000',bg2:'#2a1800',
    init(W,H){
      this.pts=[];
      for(let i=0;i<16;i++){
        this.pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.6,vy:-Math.random()*.5-.2,r:Math.random()*2+.8,a:Math.random()*.6+.2,da:-.003-.002*Math.random()});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.85,H*.1,0,W*.85,H*.1,H*.6);
      g.addColorStop(0,'rgba(186,117,23,0.22)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.a+=p.da;
        if(p.a<=0){p.x=Math.random()*W;p.y=H+5;p.a=.5+Math.random()*.4;p.vy=-Math.random()*.5-.2;}
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(250,199,117,${p.a*.7})`;ctx.fill();
      });
      for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2+t*.002;
        const len=40+20*Math.sin(t*.03+i);
        ctx.beginPath();ctx.moveTo(W*.85,H*.08);
        ctx.lineTo(W*.85+Math.cos(a)*len,H*.08+Math.sin(a)*len);
        ctx.strokeStyle=`rgba(250,199,117,${.05+.04*Math.sin(t*.04+i)})`;
        ctx.lineWidth=1;ctx.stroke();
      }
    }
  },
  coral:{
    init(W,H){
      this.pts=[];
      for(let i=0;i<20;i++){
        this.pts.push({x:Math.random()*W,y:H+Math.random()*40,vx:(Math.random()-.5)*.8,vy:-Math.random()*.9-.4,r:Math.random()*2.5+.6,a:.7+Math.random()*.3});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.2,H*.85,0,W*.2,H*.85,H*.5);
      g.addColorStop(0,'rgba(216,90,48,0.28)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.a-=.005;
        if(p.a<=0||p.y<-10){p.x=Math.random()*W;p.y=H+10;p.a=.6+Math.random()*.3;p.vy=-Math.random()*.9-.4;}
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(245,196,179,${p.a*.65})`;ctx.fill();
        if(p.r>1.5){
          ctx.beginPath();ctx.arc(p.x,p.y,p.r*2.5,0,Math.PI*2);
          ctx.fillStyle=`rgba(245,196,179,${p.a*.08})`;ctx.fill();
        }
      });
    }
  },
  green:{
    init(W,H){
      this.dots=[];
      for(let i=0;i<35;i++){
        this.dots.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2.5+.5,phase:Math.random()*Math.PI*2,speed:.02+Math.random()*.03});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.4,H*.55);
      g.addColorStop(0,'rgba(99,153,34,0.18)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.dots.forEach(d=>{
        const a=.12+.12*Math.sin(t*d.speed+d.phase);
        const r=d.r*(1+.3*Math.sin(t*d.speed*.7+d.phase));
        ctx.beginPath();ctx.arc(d.x,d.y,r,0,Math.PI*2);
        ctx.fillStyle=`rgba(192,221,151,${a})`;ctx.fill();
      });
    }
  },
  purple:{
    init(W,H){
      this.stars=[];
      for(let i=0;i<18;i++){
        this.stars.push({x:Math.random()*W,y:Math.random()*H,s:Math.random()*3+1.5,phase:Math.random()*Math.PI*2,rot:Math.random()*Math.PI});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H*.3,0,W*.5,H*.3,H*.6);
      g.addColorStop(0,'rgba(83,74,183,0.2)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.stars.forEach(s=>{
        const a=.15+.2*Math.sin(t*.04+s.phase);
        const sz=s.s*(1+.25*Math.sin(t*.05+s.phase));
        ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot+t*.008);
        ctx.fillStyle=`rgba(206,203,246,${a})`;
        ctx.beginPath();
        for(let i=0;i<4;i++){
          ctx.save();ctx.rotate(i*Math.PI/2);
          ctx.beginPath();ctx.moveTo(0,-sz*2.8);ctx.quadraticCurveTo(sz*.4,-sz*.4,sz*2.8,0);ctx.quadraticCurveTo(sz*.4,sz*.4,0,sz*2.8);ctx.quadraticCurveTo(-sz*.4,sz*.4,-sz*2.8,0);ctx.quadraticCurveTo(-sz*.4,-sz*.4,0,-sz*2.8);
          ctx.fillStyle=`rgba(206,203,246,${a*.8})`;ctx.fill();ctx.restore();
        }
        ctx.restore();
        ctx.beginPath();ctx.arc(s.x,s.y,sz*.6,0,Math.PI*2);
        ctx.fillStyle=`rgba(239,239,254,${a*.9})`;ctx.fill();
      });
    }
  },
  blue:{
    init(W,H){
      this.lines=[];
      for(let i=0;i<6;i++) this.lines.push({phase:Math.random()*Math.PI*2,amp:15+Math.random()*25,freq:.015+Math.random()*.01,y:H*(.2+i*.12)});
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,H*.6);
      g.addColorStop(0,'rgba(24,95,165,0.2)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.lines.forEach((l,i)=>{
        ctx.beginPath();
        for(let x=0;x<=W;x+=3){
          const y=l.y+l.amp*Math.sin(x*l.freq+t*.04+l.phase);
          x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle=`rgba(133,183,235,${.06+i*.02})`;
        ctx.lineWidth=1.2;ctx.stroke();
      });
    }
  },
  teal:{
    init(W,H){
      this.grid=[];
      const sz=28;
      for(let x=0;x<W+sz;x+=sz){
        for(let y=0;y<H+sz;y+=sz){
          this.grid.push({x,y,phase:Math.random()*Math.PI*2});
        }
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      this.grid.forEach(d=>{
        const a=.04+.07*Math.sin(t*.04+d.phase);
        ctx.fillStyle=`rgba(93,202,165,${a})`;
        ctx.fillRect(d.x+10,d.y+10,4,4);
      });
      const g=ctx.createRadialGradient(W*.1,H*.9,0,W*.1,H*.9,H*.5);
      g.addColorStop(0,'rgba(15,110,86,0.25)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    }
  },
  pink:{
    init(W,H){
      this.bubbles=[];
      for(let i=0;i<14;i++){
        this.bubbles.push({x:Math.random()*W,y:H+Math.random()*80,r:Math.random()*14+4,vy:-.3-Math.random()*.3,phase:Math.random()*Math.PI*2});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.8,H*.2,0,W*.8,H*.2,H*.5);
      g.addColorStop(0,'rgba(153,53,86,0.22)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.bubbles.forEach(b=>{
        b.y+=b.vy;b.x+=.4*Math.sin(t*.025+b.phase);
        if(b.y<-b.r*2){b.y=H+b.r;b.x=Math.random()*W;}
        const prog=Math.max(0,1-b.y/H);
        const a=prog*.15;
        ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(244,192,209,${a*2.5})`;ctx.lineWidth=.8;ctx.stroke();
        ctx.fillStyle=`rgba(153,53,86,${a*.7})`;ctx.fill();
        ctx.beginPath();ctx.arc(b.x-b.r*.3,b.y-b.r*.3,b.r*.25,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${a*3})`;ctx.fill();
      });
    }
  },
  amber2:{
    init(W,H){
      this.embers=[];
      for(let i=0;i<22;i++){
        this.embers.push({x:Math.random()*W,y:H+Math.random()*60,vy:-Math.random()*1.2-.4,vx:(Math.random()-.5)*.6,r:Math.random()*3+1,a:.5+Math.random()*.4,da:.004+Math.random()*.005});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H,0,W*.5,H,H*.7);
      g.addColorStop(0,'rgba(153,60,29,0.3)');g.addColorStop(.5,'rgba(186,117,23,0.1)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.embers.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.a-=p.da;
        if(p.a<=0){p.x=W*.3+Math.random()*W*.4;p.y=H+5;p.a=.5+Math.random()*.4;p.vy=-Math.random()*1.2-.4;}
        const hot=p.a>.4;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${hot?'250,234,218':'250,199,117'},${p.a*.7})`;ctx.fill();
        if(p.r>1.5){
          ctx.beginPath();ctx.arc(p.x,p.y,p.r*2,0,Math.PI*2);
          ctx.fillStyle=`rgba(250,199,117,${p.a*.07})`;ctx.fill();
        }
      });
    }
  },
  default:{
    init(W,H){
      this.pts=[];
      for(let i=0;i<20;i++) this.pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*2+.8,phase:Math.random()*Math.PI*2});
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      this.pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
        const a=.08+.08*Math.sin(t*.04+p.phase);
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(200,200,200,${a})`;ctx.fill();
      });
    }
  }
};

const COLOR_TO_EFFECT={
  amber:'amber',coral:'coral',green:'green',purple:'purple',
  blue:'blue',teal:'teal',pink:'pink',fire:'amber2',default:'default'
};

function startStoryCanvas(color){
  stopStoryCanvas();
  const canvas=document.getElementById('st-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const effectKey=COLOR_TO_EFFECT[color]||'default';
  const effect=ST_EFFECTS[effectKey];
  if(!effect)return;

  function resize(){
    canvas.width=Math.round(canvas.offsetWidth||window.innerWidth);
    canvas.height=Math.round(canvas.offsetHeight||window.innerHeight);
    if(canvas.width<10)canvas.width=390;
    if(canvas.height<10)canvas.height=844;
    effect.init(canvas.width,canvas.height);
  }
  resize();

  let tick=0;
  function loop(){
    const stories=document.getElementById('stories');
    if(!stories||!stories.classList.contains('open'))return;
    try{effect.draw(ctx,canvas.width,canvas.height,tick++);}catch(e){}
    ST_RAF=requestAnimationFrame(loop);
  }
  ST_RAF=requestAnimationFrame(loop);
}

function stopStoryCanvas(){
  if(ST_RAF){cancelAnimationFrame(ST_RAF);ST_RAF=null;}
  const canvas=document.getElementById('st-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
}
