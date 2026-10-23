// === ИКОНКИ И ЗНАКИ ДИЗАЙНОВ ===
// Пять наборов иконок (сетка 24×24) под пять дизайнов Tempo + знаки и иконки приложения (сетка 100×100).
// ico('habits') рисует иконку текущего дизайна, ico('habits','mono') — конкретного.
// Вид иконок задаёт класс .ico-<дизайн> в style.css, поэтому их можно показывать где угодно (например, в превью магазина).

const ICO_SPARK=(cx,cy,r,k=.29)=>{const a=r*k;return `M${cx} ${cy-r}C${cx+a*.3} ${cy-a} ${cx+a} ${cy-a*.3} ${cx+r} ${cy}C${cx+a} ${cy+a*.3} ${cx+a*.3} ${cy+a} ${cx} ${cy+r}C${cx-a*.3} ${cy+a} ${cx-a} ${cy+a*.3} ${cx-r} ${cy}C${cx-a} ${cy-a*.3} ${cx-a*.3} ${cy-a} ${cx} ${cy-r}Z`;};
function icoGear(cx,cy,ro,ri,n){let d='';const st=Math.PI*2/n;for(let i=0;i<n;i++){const a=i*st-Math.PI/2;[[a-st*.2,ro],[a+st*.2,ro],[a+st*.32,ri],[a+st*.68,ri]].forEach(([an,r],j)=>{d+=(i===0&&j===0?'M':'L')+(cx+r*Math.cos(an)).toFixed(2)+' '+(cy+r*Math.sin(an)).toFixed(2);});}return d+'Z';}
const ICO_FLAME='M12 21c-3.6 0-6.5-2.5-6.5-6 0-2.6 1.5-4.4 3-5.8.2 1.6 1 2.6 2 3-.2-3.4 1.2-6.2 3.5-8.2.4 2.5 1.6 4 2.8 5.4 1 1.2 1.7 2.8 1.7 4.6 0 4-2.9 7-6.5 7z';
const ICO_STAR='m12 3.3 2.65 5.4 5.95.86-4.3 4.2 1.02 5.92L12 16.88 6.68 19.68l1.02-5.92-4.3-4.2 5.95-.86z';
const ICO_BULB='M12 3.5a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8v.3h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3.5z';
const ICO_MOON='M19 14.5A7.5 7.5 0 1 1 9.5 5a7 7 0 0 0 9.5 9.5z';
const ICO_PAL='M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-.8 2-1.8 0-1.3-1.1-1.7-1.1-2.9 0-1 .8-1.8 1.8-1.8h2c2 0 3.8-1.4 3.8-3.8C20.5 6.7 16.7 3.5 12 3.5z';

// «Ритм»: скруглённая линия 2px
const ICONS_RITM={
  now:'<path d="M5 10v4M9.67 6.5v11M14.33 4v16M19 8.5v7"/>',
  day:'<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14.5h4"/>',
  habits:'<rect x="3.5" y="3.5" width="17" height="17" rx="5.5"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>',
  fit:'<path d="M2.5 12h2M19.5 12h2M8 12h8"/><rect x="4.5" y="7.5" width="3.5" height="9" rx="1.5"/><rect x="16" y="7.5" width="3.5" height="9" rx="1.5"/>',
  more:'<rect x="4" y="4" width="6.5" height="6.5" rx="2.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2.2"/><circle cx="16.75" cy="16.75" r="3.25"/>',
  stories:`<path d="${ICO_SPARK(11,13,8)}"/><path d="M19 3v4M17 5h4"/>`,
  theme:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
  menu:'<path d="M4 8h16M4 16h10"/>',
  stats:'<path d="M4 20h16"/><path d="m5 15.5 4.5-4.5 3.5 3 6-6.5"/><path d="M15.5 7.5H19V11"/>',
  challenges:'<path d="M5.5 21V4"/><path d="M5.5 4.5h12l-2.8 4.25 2.8 4.25h-12"/>',
  journal:'<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 3.5v17M12.5 8.5h3"/>',
  tips:`<path d="${ICO_BULB}"/><path d="M9.5 19h5M10.5 21.5h3"/>`,
  settings:'<path d="M4 8h8M16 8h4M4 16h3M11 16h9"/><circle cx="14" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
  achievements:'<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.5 3.5M16 6h2.5a2.5 2.5 0 0 1-2.5 3.5"/><path d="M12 14v4M8.5 20.5h7"/>',
  about:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".5" fill="currentColor"/>',
  streak:`<path d="${ICO_FLAME}"/>`,
  skin:`<path d="${ICO_PAL}"/><circle cx="7.6" cy="11.2" r=".5" fill="currentColor"/><circle cx="10.2" cy="7.4" r=".5" fill="currentColor"/><circle cx="14.6" cy="7.6" r=".5" fill="currentColor"/>`
};

// «Точка»: геометрия; у активной иконки заливаются .f, а детали .k/.kf «выбиваются» цветом фона
const ICONS_TOCHKA={
  now:'<circle class="fo" cx="12" cy="12" r="3.6"/><path d="M12 3.75A8.25 8.25 0 1 1 3.75 12"/><path d="M3.75 12A8.25 8.25 0 0 1 12 3.75" opacity=".3"/><circle class="df" cx="3.75" cy="12" r="2.4"/>',
  day:'<rect class="f" x="4.5" y="4.5" width="15" height="15" rx="2.2"/><path class="k" d="M8 9.5h8M8 12.75h8M8 16h5"/>',
  habits:'<path class="f" d="M12 3.2 20.8 12 12 20.8 3.2 12z"/><path class="k" d="m8.9 12.1 2.1 2.1 4.1-4.2"/>',
  fit:'<path d="M7.5 12h9"/><rect class="f" x="3.5" y="7.5" width="4" height="9" rx="1.2"/><rect class="f" x="16.5" y="7.5" width="4" height="9" rx="1.2"/>',
  more:'<circle class="df" cx="5.5" cy="12" r="1.8"/><circle class="df" cx="12" cy="12" r="1.8"/><circle class="df" cx="18.5" cy="12" r="1.8"/>',
  stories:'<path class="f" d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
  theme:'<circle cx="12" cy="12" r="8"/><path class="df" d="M12 4a8 8 0 0 1 0 16z"/>',
  menu:'<path d="M4.5 9h15M4.5 15h15"/>',
  stats:'<rect class="f" x="4.5" y="13" width="3.6" height="6.5" rx=".9"/><rect class="f" x="10.2" y="8.5" width="3.6" height="11" rx=".9"/><rect class="f" x="15.9" y="4.5" width="3.6" height="15" rx=".9"/>',
  challenges:'<path d="M6 20.5V4"/><path class="f" d="M6 4.5h12.5l-3 4.25 3 4.25H6z"/>',
  journal:'<path class="f" d="M15.5 4.5 19.5 8.5 9 19H5v-4z"/><path class="k" d="m13 7 4 4"/>',
  tips:`<path class="f" d="${ICO_BULB}"/><path d="M9.5 19h5M10.5 21.5h3"/>`,
  settings:`<path class="f" d="${icoGear(12,12,9,6.6,8)}"/><circle class="k" cx="12" cy="12" r="2.8"/>`,
  achievements:`<path class="f" d="${ICO_STAR}"/>`,
  about:'<circle class="f" cx="12" cy="12" r="8.5"/><path class="k" d="M12 11v5.5"/><circle class="df kf" cx="12" cy="7.9" r="1.1"/>',
  streak:`<path class="f" d="${ICO_FLAME}"/>`,
  skin:`<path class="f" d="${ICO_PAL}"/><circle class="df kf" cx="7.6" cy="11.2" r="1.25"/><circle class="df kf" cx="10.2" cy="7.4" r="1.25"/><circle class="df kf" cx="14.6" cy="7.6" r="1.25"/>`
};

// «Метроном»: тонкая линия 1.4px + одна томатная деталь (.acc)
const ICONS_METRONOM={
  now:'<path d="M7.5 20.5 10.5 3.5h3l3 17z"/><path d="M12 16.5 16.6 7"/><circle class="acc" cx="15.3" cy="9.7" r="1.8"/>',
  day:'<path d="M6 3.5h8.5L18 7v13.5H6z"/><path d="M14.5 3.5V7H18"/><path d="M9 11.5h6M9 14.5h6"/><path d="M9 17.5h3.5"/><circle class="acc" cx="15.2" cy="17.5" r="1.1"/>',
  habits:'<path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7"/><path d="m8.5 11.5 3.2 3.2 8-8"/><circle class="acc" cx="19.7" cy="6.7" r="1.3"/>',
  fit:'<path d="M8 20.5a6 6 0 1 1 8 0z"/><path d="M8.4 11.4 7.5 7a2.5 2.5 0 0 1 2.4-3h4.2a2.5 2.5 0 0 1 2.4 3l-.9 4.4"/><circle class="acc" cx="12" cy="16.2" r="1.6"/>',
  more:'<circle class="df" cx="6" cy="12" r="1.15"/><circle class="df" cx="12" cy="12" r="1.15"/><circle class="acc" cx="18" cy="12" r="1.5"/>',
  stories:`<path d="${ICO_SPARK(10,11,6.5)}"/><path class="acc" d="${ICO_SPARK(18.5,5.5,2.6,.4)}"/>`,
  theme:`<path d="${ICO_MOON}"/><circle class="acc" cx="17.5" cy="6" r="1.2"/>`,
  menu:'<path d="M4 9h16M9 15h11"/>',
  stats:'<path d="M3.5 20.5h17"/><path d="m5 16 4.5-5 4 3 5.5-7"/><circle class="acc" cx="19" cy="7" r="1.7"/>',
  challenges:'<path d="m3 20 6.5-10 3.3 5 2.2-3 6 8z"/><path d="M15 12V4"/><path class="acc" d="m15 4 4.5 1.8L15 7.6z"/>',
  journal:'<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/><path class="acc" d="M15 4.6v5l1.3-1 1.3 1V4.5z"/>',
  tips:'<path d="M9.8 18h4.4M10.5 20.5h3"/><path d="M12 6.5a4.6 4.6 0 0 0-2.7 8.3c.4.3.6.8.6 1.3v.4h4.2v-.4c0-.5.2-1 .6-1.3A4.6 4.6 0 0 0 12 6.5z"/><path d="M12 2.5V4M5.5 5l1 1M18.5 5l-1 1M3.5 11.5H5M19 11.5h1.5"/><circle class="acc" cx="12" cy="11" r="1.2"/>',
  settings:'<path d="M9 3v6.5a3 3 0 0 0 6 0V3"/><path d="M12 12.5V19"/><circle class="acc" cx="12" cy="20.3" r="1.5"/>',
  achievements:'<circle cx="12" cy="9.5" r="5.5"/><path d="m9 14.2-1.5 6.8 4.5-2 4.5 2-1.5-6.8"/><circle class="acc" cx="12" cy="9.5" r="1.8"/>',
  about:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle class="acc" cx="12" cy="7.8" r="1.1"/>',
  streak:`<path d="${ICO_FLAME}"/><path class="acc" d="M12 18.6c-1.3 0-2.2-.9-2.2-2.1 0-1.3 1-2.3 2.2-3.4 1.2 1.1 2.2 2.1 2.2 3.4 0 1.2-.9 2.1-2.2 2.1z"/>`,
  skin:`<path d="${ICO_PAL}"/><circle class="df" cx="7.6" cy="11.2" r=".9"/><circle class="df" cx="10.2" cy="7.4" r=".9"/><circle class="acc" cx="14.6" cy="7.6" r="1.5"/>`
};

// «Стикер»: толстая линия 2.2px + пастельное пятно (.duo) своего цвета у каждого раздела
const ICO_DUO={now:'#FFE27A',day:'#A8D8FF',habits:'#A3F2DA',fit:'#FFB38A',more:'#C9B8FF',stories:'#FFB3D1',theme:'#C9B8FF',menu:'#A8D8FF',stats:'#A8D8FF',challenges:'#FFB38A',journal:'#FFE27A',tips:'#FFE27A',settings:'#A3F2DA',achievements:'#FFE27A',about:'#A8D8FF',streak:'#FFB38A',skin:'#FFB3D1'};
const ICONS_STICKER={...ICONS_RITM,
  now:'<circle cx="12" cy="12" r="4.3"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
  stats:'<rect x="4" y="12.5" width="4" height="7.5" rx="2"/><rect x="10" y="8" width="4" height="12" rx="2"/><rect x="16" y="4" width="4" height="16" rx="2"/>',
  theme:`<path d="${ICO_MOON}"/>`,
  achievements:`<path d="${ICO_STAR}"/>`,
  stories:`<path d="${ICO_SPARK(12,12,8.5)}"/>`,
  about:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle class="df" cx="12" cy="7.6" r="1.3"/>',
  skin:`<path d="${ICO_PAL}"/><circle class="df" cx="7.6" cy="11.2" r="1.2"/><circle class="df" cx="10.2" cy="7.4" r="1.2"/><circle class="df" cx="14.6" cy="7.6" r="1.2"/>`
};

// «Моно»: пиксели 12×12 (каждый пиксель — 2 единицы сетки)
const ICONS_MONO={
  day:['..#......#..','############','############','#..........#','#.##.##.##.#','#.##.##.##.#','#..........#','#.##.##....#','#.##.##....#','#..........#','############'],
  habits:['.##########.','#..........#','#..........#','#.......##.#','#......##..#','#.##..##...#','#..####....#','#...##.....#','#..........#','#..........#','.##########.'],
  fit:['.##......##.','.##......##.','###......###','############','############','###......###','.##......##.','.##......##.'],
  more:['####..####','####..####','####..####','####..####','..........','..........','####..####','####..#..#','####..#..#','####..####'],
  stories:['.....#.....','.....#.....','....###....','....###....','..#######..','###########','..#######..','....###....','....###....','.....#.....','.....#.....'],
  theme:['....####....','..##..####..','.#....#####.','.#....#####.','#.....######','#.....######','#.....######','#.....######','.#....#####.','.#....#####.','..##..####..','....####....'],
  menu:['############','............','............','############','............','............','########....'],
  stats:['........###','........###','........###','....###.###','....###.###','....###.###','###.###.###','###.###.###','###.###.###','...........','###########'],
  challenges:['#..........','##########.','#########..','########...','#########..','##########.','#..........','#..........','#..........','#..........','#..........','###........'],
  journal:['.#########','##.......#','.#.#####.#','##.......#','.#.#####.#','##.......#','.#.###...#','##.......#','.#.......#','##.......#','.#########'],
  tips:['..#####..','.#.....#.','#.......#','#..#....#','#.#.....#','#.......#','.#.....#.','..#...#..','..#####..','..#####..','...###...'],
  settings:['..##........','############','..##........','............','........##..','############','........##..','............','.....##.....','############','.....##.....'],
  achievements:['############','#.########.#','#.########.#','.#.######.#.','...######...','....####....','.....##.....','.....##.....','....####....','...######...'],
  about:['....####....','..##....##..','.#...##...#.','.#........#.','#....##....#','#....##....#','#....##....#','#....##....#','.#...##...#.','.#........#.','..##....##..','....####....'],
  streak:['....#......','....##.....','...###.....','...####.#..','..#######..','..########.','.#########.','.####.####.','.###...###.','.###...###.','..##...##..','...#####...'],
  skin:['....######..','..##......#.','.#..##.....#','#...##..##.#','#.......##.#','#.##.......#','#.##.....###','#.......#...','.#......#...','..##....#...','....#####...']
};
// Сетка серий 5×5: горящие клетки складываются в букву «t»
const ICO_T_CELLS=[[0,1],[1,0],[1,1],[1,2],[1,3],[2,1],[3,1],[4,2],[4,3]];
function icoGrid(small){
  const c=small?3.6:12,g=small?1:3.5,o=small?(24-(5*c+4*g))/2:13;let s='';
  for(let r=0;r<5;r++)for(let k=0;k<5;k++){
    const lit=ICO_T_CELLS.some(([a,b])=>a===r&&b===k);
    s+=`<rect class="${lit?'lit':'dim'}" x="${(o+k*(c+g)).toFixed(2)}" y="${(o+r*(c+g)).toFixed(2)}" width="${c}" height="${c}" rx="${small?.7:2.5}"/>`;
  }
  return s;
}
function icoPix(rows){
  const h=rows.length,w=Math.max(...rows.map(r=>r.length)),ox=(24-w*2)/2,oy=(24-h*2)/2;let s='';
  rows.forEach((r,y)=>{let x=0;while(x<r.length){if(r[x]==='#'){let e=x;while(r[e+1]==='#')e++;s+=`<rect x="${ox+x*2}" y="${oy+y*2}" width="${(e-x+1)*2}" height="2"/>`;x=e+1;}else x++;}});
  return s;
}

const SKIN_KEYS=['tochka','ritm','metronom','sticker','mono'];
function currentSkin(){return document.documentElement.getAttribute('data-skin')||'tochka';}

function ico(name,skin,on){
  skin=skin||currentSkin();
  let inner;
  if(skin==='ritm')inner=ICONS_RITM[name];
  else if(skin==='metronom')inner=ICONS_METRONOM[name];
  else if(skin==='sticker')inner=`<circle class="duo" cx="14.2" cy="14.2" r="7.2" fill="${ICO_DUO[name]||'#C9B8FF'}"/>`+ICONS_STICKER[name];
  else if(skin==='mono')inner=name==='now'?icoGrid(true):icoPix(ICONS_MONO[name]||ICONS_MONO.more);
  else inner=ICONS_TOCHKA[name];
  return `<svg class="ico ico-${skin}${on?' on':''}" viewBox="0 0 24 24" aria-hidden="true">${inner||''}</svg>`;
}

// Знаки (100×100). ink — основной цвет, acc — акцент. По умолчанию currentColor, чтобы знак брал цвет текста.
function skinMark(skin,ink,acc){
  ink=ink||'currentColor';
  if(skin==='ritm')return `<g stroke="${ink}" stroke-width="11" stroke-linecap="round"><path d="M22 41v18M40.7 26v48M59.3 16v68M78 33v34"/></g>`;
  if(skin==='metronom')return `<g fill="none" stroke="${ink}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"><path d="M30 86 43 12h14l13 74z"/><path d="M19 86h62"/><path d="M50 72 75 25"/></g><circle cx="50" cy="72" r="4.6" fill="${ink}"/><circle cx="64.4" cy="45" r="8" style="fill:${acc||'var(--accent)'}"/>`;
  if(skin==='sticker')return `<g transform="rotate(-8 50 50)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M46 18v40c0 11 6 17 17 17h4M28 38h36" stroke="#fff" stroke-width="28"/><path d="M46 18v40c0 11 6 17 17 17h4M28 38h36" stroke="#141414" stroke-width="14"/></g>`;
  if(skin==='mono')return icoGrid(false).replace(/class="lit"/g,`style="fill:${acc||'var(--mono-lit,#D4FF3A)'}"`).replace(/class="dim"/g,`style="fill:${ink};fill-opacity:.16"`);
  return `<g fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round"><path d="M16 50A34 34 0 0 1 50 16" opacity=".22"/><path d="M50 16A34 34 0 1 1 16 50"/></g><circle cx="16" cy="50" r="12" fill="${ink}"/>`;
}
function skinMarkSVG(skin,px,ink,acc){return `<svg class="skin-mark sm-${skin}" viewBox="0 0 100 100" width="${px}" height="${px}" aria-hidden="true">${skinMark(skin,ink,acc)}</svg>`;}

// Иконка приложения целиком (фон + знак), как на домашнем экране
let ICO_UID=0;
function skinAppIcon(skin){
  const id='tg'+(++ICO_UID);
  const S=(bg,inner,defs='')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${defs}</defs>${bg}${inner}</svg>`;
  const sc=(s,inner)=>`<g transform="translate(50 50) scale(${s}) translate(-50 -50)">${inner}</g>`;
  if(skin==='ritm')return S(`<rect width="100" height="100" fill="url(#${id})"/><rect width="100" height="100" fill="url(#${id}r)"/>`,sc(.66,skinMark('ritm','#141414')),
    `<linearGradient id="${id}" x1="0" y1="0" x2=".75" y2="1"><stop offset="0" stop-color="#B5F5E0"/><stop offset=".62" stop-color="#22C7A0"/><stop offset="1" stop-color="#119AB9"/></linearGradient><radialGradient id="${id}r" cx=".85" cy=".1" r=".65"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);
  if(skin==='metronom')return S('<rect width="100" height="100" fill="#F3EDE2"/>',sc(.68,skinMark('metronom','#1C1A17','#E5533D')));
  if(skin==='sticker')return S(`<rect width="100" height="100" fill="url(#${id})"/>`,
    `<g filter="url(#${id}s)">${sc(.78,skinMark('sticker'))}</g><path d="${ICO_SPARK(78,22,10,.33)}" fill="#22C7A0"/><path d="${ICO_SPARK(22,79,5,.33)}" fill="#fff"/>`,
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE68A"/><stop offset="1" stop-color="#FFA987"/></linearGradient><filter id="${id}s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".22"/></filter>`);
  if(skin==='mono')return S('<rect width="100" height="100" fill="#0A0A0A"/>',sc(.74,skinMark('mono','#fff','#D4FF3A')));
  return S('<rect width="100" height="100" fill="#0E0E0E"/>',sc(.6,skinMark('tochka','#fff')));
}
function skinAppIconHTML(skin,px){return `<span class="skin-ai" style="width:${px}px;height:${px}px">${skinAppIcon(skin)}</span>`;}

// Логотип для верхней панели: знак + слово «tempo» шрифтом дизайна
function skinLogoHTML(skin){
  skin=skin||currentSkin();
  if(skin==='ritm')return `${skinAppIconHTML('ritm',22)}<span class="tb-wm wm-ritm">tempo</span>`;
  if(skin==='metronom')return `${skinMarkSVG('metronom',20,null,'#E5533D')}<span class="tb-wm wm-metronom">Tempo</span>`;
  if(skin==='sticker')return `${skinMarkSVG('sticker',26)}<span class="tb-wm wm-sticker">tempo</span>`;
  if(skin==='mono')return `${skinMarkSVG('mono',17)}<span class="tb-wm wm-mono">tempo<i class="tb-cur"></i></span>`;
  return `${skinMarkSVG('tochka',18)}<span class="tb-wm wm-tochka">tempo</span>`;
}

// Перерисовать все статичные иконки страницы (<span data-ico="...">) и логотипы под текущий дизайн
function paintIcons(){
  document.querySelectorAll('[data-ico]').forEach(el=>{el.innerHTML=ico(el.dataset.ico);});
  const logo=document.getElementById('tb-logo');if(logo)logo.innerHTML=skinLogoHTML();
  const wl=document.getElementById('welcome-logo');if(wl)wl.innerHTML=skinLogoHTML();
  const sk=currentSkin();
  document.querySelectorAll('.st-av').forEach(el=>{el.innerHTML=skinMarkSVG(sk,18,'#fff',sk==='mono'?'#D4FF3A':'#F0603F');});
}
