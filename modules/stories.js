// === STORIES — Liquid Glass ===
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

const TIPS_LIBRARY_CARD={
  id:'_tips_library',type:'library',emoji:'📚',
  title:'Библиотека советов',
  body:'Сон, продуктивность, похудение, вода, привычки и мотивация — всё в одном месте. Нажми чтобы открыть.',
  color:'teal',date:''
};

let TIPS_DATA=null;

async function fetchStories(){
  if(STORIES_DATA)return STORIES_DATA;
  try{
    const res=await fetch('news.json?_='+Date.now());
    if(!res.ok)throw new Error('not ok');
    const data=await res.json();
    data.items.push(TIPS_LIBRARY_CARD);
    STORIES_DATA=data;
    return data;
  }catch(e){
    STORIES_DATA={version:'1.0',items:[
      {id:'fallback',type:'tip',emoji:'💾',title:'Не теряй данные',body:'Экспортируй JSON раз в неделю и храни в облаке. Данные в браузере исчезнут если очистить кэш.',color:'amber',date:''},
      TIPS_LIBRARY_CARD
    ]};
    return STORIES_DATA;
  }
}

async function fetchTips(){
  if(TIPS_DATA)return TIPS_DATA;
  try{
    const res=await fetch('tips.json?_='+Date.now());
    if(!res.ok)throw new Error('not ok');
    TIPS_DATA=await res.json();
    return TIPS_DATA;
  }catch(e){return null;}
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

function setLiquidColor(color){
  const el=document.getElementById('stories');
  el.className=el.className.replace(/st-lq-\S+/g,'').trim();
  el.classList.add('st-lq-'+(color||'default'));
}

function showStory(){
  if(!STORIES_DATA||!STORIES_DATA.items[STORIES_IDX])return;
  const item=STORIES_DATA.items[STORIES_IDX];
  const isLib=item.type==='library';

  setLiquidColor(item.color||'default');

  document.getElementById('st-emoji').textContent=item.emoji||'✨';
  document.getElementById('st-title').textContent=item.title||'';
  document.getElementById('st-text').textContent=item.body||'';

  const metaIcon=document.getElementById('st-meta-icon');
  const metaTime=document.getElementById('st-meta-time');
  const typeLabel=document.getElementById('st-card-type-label');

  if(isLib){
    metaIcon.textContent='📚';
    metaTime.textContent='коллекция';
    if(typeLabel)typeLabel.textContent='коллекция';
  }else{
    metaIcon.textContent=item.type==='update'?'◆':'💡';
    metaTime.textContent=item.type==='update'?'обновление':'совет';
    if(typeLabel)typeLabel.textContent=item.type==='update'?'обновление':'совет';
  }

  // Library card CTA button
  let cta=document.getElementById('st-lib-cta');
  if(isLib){
    if(!cta){
      cta=document.createElement('button');
      cta.id='st-lib-cta';
      cta.className='st-lib-cta';
      cta.textContent='Открыть';
      cta.onclick=()=>openTipsLib();
      document.querySelector('.st-glass-card').appendChild(cta);
    }
    cta.style.display='';
  }else if(cta){
    cta.style.display='none';
  }

  const row=document.getElementById('st-progress-row');
  row.innerHTML='';
  STORIES_DATA.items.forEach((_,i)=>{
    const bar=document.createElement('div');
    bar.className='st-progress'+(i<STORIES_IDX?' done':'');
    const fill=document.createElement('div');
    fill.className='st-progress-fill';
    if(i===STORIES_IDX)fill.id='st-progress-active';
    else if(i<STORIES_IDX)fill.style.width='100%';
    bar.appendChild(fill);
    row.appendChild(bar);
  });

  const seen=loadStoriesSeen();
  if(!seen.includes(item.id)){seen.push(item.id);saveStoriesSeen(seen);}

  startStoryCanvas(item.color||'default');

  if(isLib){
    // Library card stays, no auto-advance
    if(STORIES_TIMER)cancelAnimationFrame(STORIES_TIMER);
    const fill=document.getElementById('st-progress-active');
    if(fill)fill.style.width='100%';
  }else{
    startStoryTimer();
  }
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
    if(pct>=100){storyNext();return;}
    STORIES_TIMER=requestAnimationFrame(tick);
  }
  STORIES_TIMER=requestAnimationFrame(tick);
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
  stopStoryCanvas();
  const el=document.getElementById('stories');
  el.classList.add('closing');
  setTimeout(()=>{
    el.classList.remove('open','closing');
    el.className=el.className.replace(/st-lq-\S+/g,'').trim();
    checkStoriesUnread();
  },220);
}

// Hold to pause
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

document.addEventListener('keydown',(e)=>{
  if(!document.getElementById('stories').classList.contains('open'))return;
  if(e.key==='Escape')closeStories();
  else if(e.key==='ArrowRight'||e.key===' ')storyNext();
  else if(e.key==='ArrowLeft')storyPrev();
});

// === CANVAS EFFECTS — theme-aware ===
let ST_RAF=null;

function stIsLight(){
  return document.documentElement.getAttribute('data-theme')==='light';
}

// Color sets per effect: [dark, light]
const ST_PALETTES={
  amber:{
    dark:{glow:'250,199,117',ray:'250,220,160',core:'255,240,210',spec:'255,255,255',glowA:.12,rayA:.04},
    light:{glow:'160,100,10',ray:'140,85,5',core:'120,70,0',spec:'80,50,0',glowA:.08,rayA:.06}
  },
  coral:{
    dark:{stroke:'255,200,180',fill:'245,130,80',spec:'255,255,255'},
    light:{stroke:'180,60,30',fill:'160,50,20',spec:'120,30,10'}
  },
  green:{
    dark:{outer:'192,221,151',core:'220,245,190',spec:'255,255,255',glow:'124,179,66'},
    light:{outer:'50,110,20',core:'40,90,15',spec:'30,70,10',glow:'60,120,25'}
  },
  purple:{
    dark:{star:'220,218,255',center:'240,240,255',spec:'255,255,255',glow:'127,119,221'},
    light:{star:'80,60,180',center:'60,40,150',spec:'50,30,120',glow:'100,80,200'}
  },
  blue:{
    dark:{wave:'180,210,245',drop:'220,235,255',peak:'255,255,255',glow:'91,157,232'},
    light:{wave:'30,80,160',drop:'20,60,140',peak:'15,50,120',glow:'50,100,200'}
  },
  teal:{
    dark:{dot:'92,228,184',ring:'92,228,184',hl:'200,255,230'},
    light:{dot:'10,120,80',ring:'10,120,80',hl:'5,80,55'}
  },
  pink:{
    dark:{spec1:'255,255,255',spec2:'255,255,255'},
    light:{spec1:'120,30,60',spec2:'100,20,50'}
  },
  default:{
    dark:{outer:'200,200,220',core:'230,230,240',spec:'255,255,255'},
    light:{outer:'80,80,100',core:'60,60,80',spec:'40,40,60'}
  }
};

function stPal(color){
  const p=ST_PALETTES[color]||ST_PALETTES.default;
  return stIsLight()?p.light:p.dark;
}

const ST_EFFECTS={
  amber:{
    init(W,H){
      this.pts=[];
      for(let i=0;i<20;i++){
        this.pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:-Math.random()*.5-.15,r:Math.random()*2.5+.8,a:Math.random()*.5+.3,phase:Math.random()*Math.PI*2});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const c=stPal('amber');
      const g=ctx.createRadialGradient(W*.8,H*.12,0,W*.8,H*.12,H*.5);
      g.addColorStop(0,`rgba(${c.glow},${c.glowA})`);g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2+t*.002;
        const len=50+25*Math.sin(t*.025+i);
        ctx.beginPath();ctx.moveTo(W*.82,H*.1);
        ctx.lineTo(W*.82+Math.cos(a)*len,H*.1+Math.sin(a)*len);
        ctx.strokeStyle=`rgba(${c.ray},${c.rayA+.03*Math.sin(t*.03+i)})`;
        ctx.lineWidth=1.5;ctx.stroke();
      }
      this.pts.forEach(p=>{
        p.x+=p.vx+Math.sin(t*.02+p.phase)*.3;p.y+=p.vy;
        p.a=.2+.3*Math.sin(t*.04+p.phase);
        if(p.y<-10){p.x=Math.random()*W;p.y=H+5;p.a=.5;}
        ctx.beginPath();ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.ray},${p.a*.06})`;ctx.fill();
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.core},${p.a*.7})`;ctx.fill();
        ctx.beginPath();ctx.arc(p.x-p.r*.3,p.y-p.r*.3,p.r*.3,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.spec},${p.a*.4})`;ctx.fill();
      });
    }
  },

  coral:{
    init(W,H){
      this.bubbles=[];
      for(let i=0;i<16;i++){
        this.bubbles.push({x:Math.random()*W,y:H+Math.random()*60,r:Math.random()*12+5,vy:-.4-Math.random()*.4,vx:(Math.random()-.5)*.3,phase:Math.random()*Math.PI*2});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const c=stPal('coral');
      const g=ctx.createRadialGradient(W*.25,H*.8,0,W*.25,H*.8,H*.5);
      g.addColorStop(0,`rgba(${c.fill},0.12)`);g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.bubbles.forEach(b=>{
        b.y+=b.vy;b.x+=b.vx+Math.sin(t*.02+b.phase)*.4;
        if(b.y<-b.r*2){b.y=H+b.r;b.x=Math.random()*W;}
        const prog=Math.max(0,1-b.y/H);
        const a=prog*.2;
        ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${c.stroke},${a*2})`;ctx.lineWidth=.8;ctx.stroke();
        ctx.fillStyle=`rgba(${c.fill},${a*.3})`;ctx.fill();
        ctx.beginPath();ctx.arc(b.x-b.r*.3,b.y-b.r*.3,b.r*.25,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.spec},${a*2.5})`;ctx.fill();
        ctx.beginPath();ctx.arc(b.x+b.r*.2,b.y+b.r*.25,b.r*.12,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.spec},${a*1.2})`;ctx.fill();
      });
    }
  },

  green:{
    init(W,H){
      this.dots=[];
      for(let i=0;i<30;i++){
        this.dots.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*3+1,phase:Math.random()*Math.PI*2,speed:.02+Math.random()*.025});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const c=stPal('green');
      const g=ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.4,H*.5);
      g.addColorStop(0,`rgba(${c.glow},0.08)`);g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.dots.forEach(d=>{
        const pulse=.5+.5*Math.sin(t*d.speed+d.phase);
        const a=pulse*.25;
        const r=d.r*(1+.3*pulse);
        ctx.beginPath();ctx.arc(d.x,d.y,r*4,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.outer},${a*.12})`;ctx.fill();
        ctx.beginPath();ctx.arc(d.x,d.y,r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.core},${a})`;ctx.fill();
        ctx.beginPath();ctx.arc(d.x-r*.2,d.y-r*.2,r*.35,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.spec},${a*.6})`;ctx.fill();
      });
    }
  },

  purple:{
    init(W,H){
      this.stars=[];
      for(let i=0;i<22;i++){
        this.stars.push({x:Math.random()*W,y:Math.random()*H,s:Math.random()*3+1.5,phase:Math.random()*Math.PI*2,rot:Math.random()*Math.PI,speed:.03+Math.random()*.03});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const c=stPal('purple');
      const g=ctx.createRadialGradient(W*.5,H*.3,0,W*.5,H*.3,H*.55);
      g.addColorStop(0,`rgba(${c.glow},0.1)`);g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.stars.forEach(s=>{
        const twinkle=.5+.5*Math.sin(t*s.speed+s.phase);
        const a=twinkle*.25;
        const sz=s.s*(1+.2*twinkle);
        ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot+t*.006);
        ctx.beginPath();
        ctx.moveTo(0,-sz*3);ctx.quadraticCurveTo(sz*.3,-sz*.3,sz*3,0);
        ctx.quadraticCurveTo(sz*.3,sz*.3,0,sz*3);
        ctx.quadraticCurveTo(-sz*.3,sz*.3,-sz*3,0);
        ctx.quadraticCurveTo(-sz*.3,-sz*.3,0,-sz*3);
        ctx.fillStyle=`rgba(${c.star},${a*.6})`;ctx.fill();
        ctx.beginPath();ctx.arc(0,0,sz*.7,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.center},${a})`;ctx.fill();
        ctx.beginPath();ctx.arc(-sz*.15,-sz*.2,sz*.25,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.spec},${a*.7})`;ctx.fill();
        ctx.restore();
      });
    }
  },

  blue:{
    init(W,H){
      this.lines=[];
      for(let i=0;i<7;i++){
        this.lines.push({phase:Math.random()*Math.PI*2,amp:18+Math.random()*22,freq:.012+Math.random()*.008,y:H*(.15+i*.11),speed:.03+Math.random()*.02});
      }
      this.drops=[];
      for(let i=0;i<10;i++){
        this.drops.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+.5,phase:Math.random()*Math.PI*2});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const c=stPal('blue');
      const g=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,H*.55);
      g.addColorStop(0,`rgba(${c.glow},0.08)`);g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.lines.forEach((l,i)=>{
        ctx.beginPath();
        for(let x=0;x<=W;x+=3){
          const y=l.y+l.amp*Math.sin(x*l.freq+t*l.speed+l.phase);
          x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle=`rgba(${c.wave},${.06+i*.015})`;
        ctx.lineWidth=1.2;ctx.stroke();
        if(i%2===0){
          for(let x=0;x<W;x+=80){
            const y=l.y+l.amp*Math.sin(x*l.freq+t*l.speed+l.phase);
            ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);
            ctx.fillStyle=`rgba(${c.peak},${.06+.04*Math.sin(t*.05+x*.01)})`;ctx.fill();
          }
        }
      });
      this.drops.forEach(d=>{
        const a=.08+.08*Math.sin(t*.04+d.phase);
        ctx.beginPath();ctx.arc(d.x,d.y,d.r*2.5,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.wave},${a*.5})`;ctx.fill();
        ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.drop},${a})`;ctx.fill();
      });
    }
  },

  teal:{
    init(W,H){
      this.grid=[];
      const sz=30;
      for(let x=0;x<W+sz;x+=sz){
        for(let y=0;y<H+sz;y+=sz){
          this.grid.push({x,y,phase:Math.random()*Math.PI*2,speed:.03+Math.random()*.02});
        }
      }
      this.rings=[];
      for(let i=0;i<4;i++){
        this.rings.push({x:Math.random()*W,y:Math.random()*H,r:0,maxR:60+Math.random()*40,speed:.8+Math.random()*.5});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const c=stPal('teal');
      this.grid.forEach(d=>{
        const a=.03+.06*Math.sin(t*d.speed+d.phase);
        ctx.fillStyle=`rgba(${c.dot},${a})`;
        ctx.fillRect(d.x+12,d.y+12,3,3);
      });
      this.rings.forEach(r=>{
        r.r+=r.speed;
        if(r.r>r.maxR){r.r=0;r.x=Math.random()*W;r.y=Math.random()*H;}
        const a=(1-r.r/r.maxR)*.12;
        ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${c.ring},${a})`;ctx.lineWidth=1;ctx.stroke();
        ctx.beginPath();ctx.arc(r.x,r.y,r.r*.3,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.hl},${a*.3})`;ctx.fill();
      });
    }
  },

  pink:{
    init(W,H){
      this.bubbles=[];
      for(let i=0;i<14;i++){
        this.bubbles.push({x:Math.random()*W,y:H+Math.random()*80,r:Math.random()*14+5,vy:-.25-Math.random()*.3,phase:Math.random()*Math.PI*2});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const c=stPal('pink');
      const lt=stIsLight();
      const g=ctx.createRadialGradient(W*.75,H*.2,0,W*.75,H*.2,H*.5);
      g.addColorStop(0,lt?'rgba(180,60,100,0.1)':'rgba(212,83,126,0.1)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      this.bubbles.forEach(b=>{
        b.y+=b.vy;b.x+=.4*Math.sin(t*.02+b.phase);
        if(b.y<-b.r*2){b.y=H+b.r;b.x=Math.random()*W;}
        const prog=Math.max(0,1-b.y/H);
        const a=prog*.15;
        const hue=Math.sin(t*.01+b.phase);
        let r2,g2,b2;
        if(lt){
          r2=Math.floor(150+hue*30);g2=Math.floor(40+hue*30);b2=Math.floor(80+hue*20);
        }else{
          r2=Math.floor(220+hue*30);g2=Math.floor(160+hue*50);b2=Math.floor(200-hue*20);
        }
        ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${r2},${g2},${b2},${a*2.5})`;ctx.lineWidth=.8;ctx.stroke();
        ctx.fillStyle=`rgba(${r2},${g2},${b2},${a*.4})`;ctx.fill();
        ctx.beginPath();ctx.arc(b.x-b.r*.3,b.y-b.r*.3,b.r*.28,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.spec1},${a*3})`;ctx.fill();
        ctx.beginPath();ctx.arc(b.x+b.r*.15,b.y+b.r*.2,b.r*.1,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.spec2},${a*1.5})`;ctx.fill();
      });
    }
  },

  default:{
    init(W,H){
      this.pts=[];
      for(let i=0;i<20;i++){
        this.pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*2.5+1,phase:Math.random()*Math.PI*2});
      }
    },
    draw(ctx,W,H,t){
      ctx.clearRect(0,0,W,H);
      const c=stPal('default');
      this.pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1;
        if(p.y<0||p.y>H)p.vy*=-1;
        const a=.06+.1*Math.sin(t*.03+p.phase);
        ctx.beginPath();ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.outer},${a*.2})`;ctx.fill();
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.core},${a})`;ctx.fill();
        ctx.beginPath();ctx.arc(p.x-p.r*.25,p.y-p.r*.25,p.r*.3,0,Math.PI*2);
        ctx.fillStyle=`rgba(${c.spec},${a*.5})`;ctx.fill();
      });
    }
  }
};

const COLOR_TO_EFFECT={
  amber:'amber',coral:'coral',green:'green',purple:'purple',
  blue:'blue',teal:'teal',pink:'pink',default:'default'
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

// === TIPS LIBRARY ===
let TIPS_LIB_VIEW='categories'; // 'categories' | 'category'
let TIPS_LIB_CAT=null;

async function openTipsLib(){
  const data=await fetchTips();
  if(!data||!data.categories){showToast('Советы не загружены');return;}
  TIPS_LIB_VIEW='categories';
  TIPS_LIB_CAT=null;
  renderTipsCategories(data);
  const el=document.getElementById('tips-lib');
  el.classList.add('open');
  el.classList.remove('closing');
  document.getElementById('tips-lib-title').textContent='Библиотека советов';
}

function closeTipsLib(){
  if(TIPS_LIB_VIEW==='category'){
    TIPS_LIB_VIEW='categories';
    TIPS_LIB_CAT=null;
    renderTipsCategories(TIPS_DATA);
    document.getElementById('tips-lib-title').textContent='Библиотека советов';
    return;
  }
  const el=document.getElementById('tips-lib');
  el.classList.add('closing');
  setTimeout(()=>{el.classList.remove('open','closing');},220);
}

function renderTipsCategories(data){
  const wrap=document.getElementById('tips-lib-content');
  let h='<div class="tips-cats">';
  data.categories.forEach(cat=>{
    const n=cat.tips?cat.tips.length:0;
    const word=n===1?'совет':(n>=2&&n<=4?'совета':'советов');
    h+=`<div class="tips-cat-card tc-${cat.color||'default'}" onclick="openTipsCategory('${cat.id}')">
      <div class="tips-cat-emoji">${cat.emoji}</div>
      <div class="tips-cat-name">${cat.name}</div>
      <div class="tips-cat-count">${n} ${word}</div>
    </div>`;
  });
  h+='</div>';
  wrap.innerHTML=h;
  wrap.scrollTop=0;
}

function openTipsCategory(catId){
  if(!TIPS_DATA)return;
  const cat=TIPS_DATA.categories.find(c=>c.id===catId);
  if(!cat)return;
  TIPS_LIB_VIEW='category';
  TIPS_LIB_CAT=catId;
  document.getElementById('tips-lib-title').textContent=cat.emoji+' '+cat.name;

  const wrap=document.getElementById('tips-lib-content');
  const cl='tlc-'+(cat.color||'default');
  let h='<div class="tips-list">';
  cat.tips.forEach((tip,i)=>{
    h+=`<div class="tips-list-card ${cl}" onclick="openTipDetail('${catId}',${i})">
      <div class="tips-list-title">${tip.title}</div>
      <div class="tips-list-body">${tip.body}</div>
    </div>`;
  });
  h+='</div>';
  wrap.innerHTML=h;
  wrap.scrollTop=0;
}

function openTipDetail(catId,tipIdx){
  if(!TIPS_DATA)return;
  const cat=TIPS_DATA.categories.find(c=>c.id===catId);
  if(!cat||!cat.tips[tipIdx])return;
  const tip=cat.tips[tipIdx];

  document.getElementById('tip-detail-emoji').textContent=cat.emoji;
  document.getElementById('tip-detail-title').textContent=tip.title;
  document.getElementById('tip-detail-body').textContent=tip.detail||tip.body;

  document.getElementById('tip-detail-overlay').classList.add('open');
  document.getElementById('tip-detail').classList.add('open');
}

function closeTipDetail(){
  document.getElementById('tip-detail').classList.remove('open');
  document.getElementById('tip-detail-overlay').classList.remove('open');
}
