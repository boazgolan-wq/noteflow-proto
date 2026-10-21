'use strict';
(()=>{const $=id=>document.getElementById(id);
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const midi=n=>{const m=n.match(/^([A-G]#?)(\d)$/);return (+m[2]+1)*12+NAMES.indexOf(m[1]);};
const name=m=>NAMES[m%12]+(Math.floor(m/12)-1);
const LBL={};'CDEFGAB'.split('').forEach((c,i)=>LBL[c]=T.notes[i]);
const COLORS=['#00e5ff','#ff3df2','#ffd23f','#3dff8b','#ff7a3d','#8b7bff'];
const PERF=0.12,GOOD=0.3,LEAD=2;
let DATA,ALL=[],lesson,steps=[],t0=0,playing=false,pausedAt=0,speed=1,score=0,combo=0,maxCombo=0,hits={p:0,g:0,m:0},raf,beatDur=1,lastBeat=-1,metro=true;
const progress=JSON.parse(localStorage.getItem('pianoProgress')||'{}');
$('appname').textContent=CONFIG.APP_NAME;
const sel=$('lang');Object.keys(I18N).forEach(l=>{const o=document.createElement('option');o.value=l;o.textContent=l.toUpperCase();o.selected=l===LANG;sel.appendChild(o);});
sel.onchange=()=>{location.search='?lang='+sel.value;};
// ---------- keyboard ----------
const kb=$('kb');let keyEls={};
function buildKeyboard(lo,hi){kb.textContent='';keyEls={};const a=midi(lo),b=midi(hi);const ws=[];for(let m=a;m<=b;m++)if(!NAMES[m%12].includes('#'))ws.push(m);
const W=100/ws.length;let wi=0;for(let m=a;m<=b;m++){const n=name(m),blk=n.includes('#');const el=document.createElement('div');el.className='key '+(blk?'black':'white');
if(blk){el.style.left=(wi*W-W*0.3)+'%';el.style.width=(W*0.6)+'%';}else{el.style.left=(wi*W)+'%';el.style.width=W+'%';wi++;}
const r=document.createElement('div');r.className='ring';el.appendChild(r);const l=document.createElement('span');l.className='lbl';l.textContent=blk?'':LBL[n[0]];el.appendChild(l);
el.dataset.note=n;kb.appendChild(el);keyEls[n]=el;}resizeFx();}
const active=new Map();
function noteAt(x,y){const el=document.elementFromPoint(x,y);const k=el&&el.closest&&el.closest('.key');return k&&k.dataset.note;}
function press(id,n){if(!n||active.get(id)===n)return;release(id);active.set(id,n);keyEls[n].classList.add('down');Audio_.play(n);burst(n);hit(n);}
function release(id){const n=active.get(id);if(n){keyEls[n]&&keyEls[n].classList.remove('down');active.delete(id);}}
kb.addEventListener('pointerdown',e=>{e.preventDefault();press(e.pointerId,noteAt(e.clientX,e.clientY));});
kb.addEventListener('pointermove',e=>{if(active.has(e.pointerId))press(e.pointerId,noteAt(e.clientX,e.clientY));});
['pointerup','pointercancel','pointerleave'].forEach(t=>kb.addEventListener(t,e=>release(e.pointerId)));
// ---------- particles ----------
const fx=$('fx'),fc=fx.getContext('2d');let parts=[],fxRaf=0;
function resizeFx(){const r=fx.getBoundingClientRect(),d=devicePixelRatio||1;fx.width=r.width*d;fx.height=r.height*d;fc.setTransform(d,0,0,d,0,0);}
addEventListener('resize',resizeFx);addEventListener('orientationchange',()=>setTimeout(resizeFx,200));
function burst(n,color){const el=keyEls[n];if(!el)return;const r=el.getBoundingClientRect(),w=fx.getBoundingClientRect();const x=r.left-w.left+r.width/2,y=r.top-w.top+r.height*0.75;
const c=color||getComputedStyle(el).getPropertyValue('--c').trim()||'#00e5ff';parts.push({ring:1,x,y,r:4,life:1,c});
for(let i=0;i<16;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*4;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2.5,life:1,c,size:2+Math.random()*3});}
if(!fxRaf)fxRaf=requestAnimationFrame(fxLoop);}
function fxLoop(){fc.clearRect(0,0,fx.clientWidth,fx.clientHeight);fc.globalCompositeOperation='lighter';
parts=parts.filter(p=>(p.life-=p.ring?0.04:0.025)>0);for(const p of parts){fc.globalAlpha=p.life;
if(p.ring){p.r+=3;fc.strokeStyle=p.c;fc.lineWidth=3;fc.beginPath();fc.arc(p.x,p.y,p.r,0,7);fc.stroke();}
else{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;fc.fillStyle=p.c;fc.beginPath();fc.arc(p.x,p.y,p.size,0,7);fc.fill();}}
fc.globalAlpha=1;fxRaf=parts.length?requestAnimationFrame(fxLoop):0;}
// ---------- menu ----------
function unlocked(i){return i===0||progress[ALL[i-1].id]>=1;}
function renderMenu(){const box=$('levels');box.textContent='';DATA.levels.forEach(lv=>{const d=document.createElement('div');d.className='level';const h=document.createElement('h2');h.textContent=T.levels[lv.id];d.appendChild(h);
lv.lessons.forEach(ls=>{const i=ALL.indexOf(ls),ok=unlocked(i);const b=document.createElement('button');b.className='lesson'+(ok?'':' locked');
const s=document.createElement('span');const num=document.createElement('span');num.className='num';num.textContent=ok?i+1:'🔒';s.append(num,document.createTextNode(T.lessons[ls.id]));
const st=document.createElement('span');st.className='st';st.textContent='★'.repeat(progress[ls.id]||0);b.append(s,st);
b.onclick=()=>{if(!ok){toast(T.locked);return;}if(i>=DATA.paywallAfter){$('premium').classList.add('show');return;}open(ls);};d.appendChild(b);});box.appendChild(d);});}
// ---------- game ----------
function open(ls){lesson=ls;$('ltitle').textContent=T.lessons[ls.id];$('menu').classList.remove('active');$('game').classList.add('active');buildKeyboard(ls.range[0],ls.range[1]);reset();}
function reset(){cancelAnimationFrame(raf);playing=false;pausedAt=0;score=combo=maxCombo=0;hits={p:0,g:0,m:0};lastBeat=-1;beatDur=60/lesson.bpm;
let t=LEAD,ci=0;steps=lesson.steps.map(([n,d])=>{const notes=n.split('+');const o={notes,t,d:d*beatDur,state:0,got:new Map(),c:notes.length>1?COLORS[1+(ci++%(COLORS.length-1))]:COLORS[0]};t+=d*beatDur;return o;});
$('play').textContent=T.start;hud();paint(0);}
function now(){return playing?(performance.now()/1000-t0)*speed:pausedAt;}
$('play').onclick=()=>{Audio_.init();if(playing){pausedAt=now();playing=false;$('play').textContent=T.resume;cancelAnimationFrame(raf);}
else{t0=performance.now()/1000-pausedAt/speed;playing=true;$('play').textContent=T.pause;loop();}};
$('speed').onchange=e=>{const c=now();speed=+e.target.value;if(playing)t0=performance.now()/1000-c/speed;else pausedAt=c;};
$('metro').onclick=()=>{metro=!metro;$('metro').textContent=metro?'♩ ✓':'♩ ✕';$('metro').setAttribute('aria-pressed',metro);};
$('back').onclick=()=>{cancelAnimationFrame(raf);playing=false;$('game').classList.remove('active');$('menu').classList.add('active');renderMenu();};
function judge(t,c){const j=$('judge');j.textContent=t;j.style.color=c;j.classList.remove('pop');void j.offsetWidth;j.classList.add('pop');}
function current(){return steps.find(s=>!s.state);}
function hit(n){if(!playing)return;const c=now(),s=current();if(!s||!s.notes.includes(n)||Math.abs(s.t-c)>GOOD)return;s.got.set(n,Math.abs(s.t-c));
if(s.got.size<s.notes.length)return;const dt=Math.max(...s.got.values());s.notes.forEach(k=>burst(k,s.c));
if(dt<=PERF){s.state=1;hits.p++;score+=100*s.notes.length*(1+Math.floor(combo/8));judge(T.perfectJ,'#3dff8b');}else{s.state=2;hits.g++;score+=50*s.notes.length;judge(T.goodJ,'#00e5ff');}
combo++;maxCombo=Math.max(maxCombo,combo);const m=document.querySelector('.meter');m.classList.remove('hot');void m.offsetWidth;m.classList.add('hot');if(combo%8===0)praise('combo');hud();}
function hud(){$('score').textContent=score;$('combo').textContent=combo;document.querySelector('.meter').style.setProperty('--m',(combo%8)/8||(combo?1:0));
const tot=hits.p+hits.g+hits.m;$('acc').textContent=(tot?Math.round((hits.p+hits.g*0.5)/tot*100):100)+'%';}
function paint(c){Object.values(keyEls).forEach(e=>{e.classList.remove('target','next');e.style.removeProperty('--p');});
const i=steps.findIndex(s=>!s.state);if(i<0)return;const s=steps[i],p=Math.max(0,Math.min(1,1-(s.t-c)/beatDur));
s.notes.forEach(n=>{const e=keyEls[n];if(!e)return;if(!s.got.has(n)){e.classList.add('target');e.style.setProperty('--c',s.c);e.style.setProperty('--p',p);}});
const nx=steps[i+1];if(nx)nx.notes.forEach(n=>{const e=keyEls[n];if(e&&!e.classList.contains('target'))e.classList.add('next');});}
function loop(){const c=now();for(const s of steps)if(!s.state&&c-s.t>GOOD){s.state=3;hits.m++;combo=0;judge(T.missJ,'#ff4d6d');hud();}
const b=Math.floor((c-LEAD)/beatDur+1e-6);if(b>lastBeat&&c>=LEAD-beatDur*4){lastBeat=b;if(metro)Audio_.tick(((b%4)+4)%4===0);document.querySelectorAll('#beat i').forEach((d,k)=>d.classList.toggle('on',k===((b%4)+4)%4));}
paint(c);if(steps.every(s=>s.state))return finish();raf=requestAnimationFrame(loop);}
function finish(){playing=false;Object.values(keyEls).forEach(e=>e.classList.remove('target','next'));const tot=steps.length,acc=(hits.p+hits.g*0.5)/tot;const st=acc>=0.9?3:acc>=0.7?2:acc>=0.5?1:0;
const idx=ALL.indexOf(lesson),wasLocked=idx<ALL.length-1&&!(progress[lesson.id]>=1);
if(st>(progress[lesson.id]||0)){progress[lesson.id]=st;localStorage.setItem('pianoProgress',JSON.stringify(progress));}
$('rtitle').textContent=st?T.great:T.almost;const S=$('stars');S.textContent='';for(let k=0;k<3;k++){const sp=document.createElement('span');sp.textContent=k<st?'★':'☆';S.appendChild(sp);}
$('rstats').textContent=T.stats.replace('{a}',Math.round(acc*100)).replace('{p}',hits.p).replace('{g}',hits.g).replace('{m}',hits.m).replace('{c}',maxCombo).replace('{s}',score);
$('result').classList.add('show');if(st)Object.keys(keyEls).forEach((n,k)=>setTimeout(()=>burst(n,COLORS[k%COLORS.length]),k*40));
if(st&&wasLocked)praise('unlock',true);else if(hits.p===tot)praise('perfect',true);else if(st)praise('done',true);}
let lastPraise=0;const pick=a=>a[Math.floor(Math.random()*a.length)];
function toast(txt){const el=$('toast');el.textContent=txt;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function praise(kind,force){const t=performance.now();if(!force&&t-lastPraise<4000)return;lastPraise=t;toast(pick(T.praise[kind]));}
$('again').onclick=()=>{$('result').classList.remove('show');reset();};
$('tomenu').onclick=()=>{$('result').classList.remove('show');$('back').onclick();};
$('pclose').onclick=()=>$('premium').classList.remove('show');
fetch('lessons/lessons.json').then(r=>r.json()).then(d=>{DATA=d;ALL=d.levels.flatMap(l=>l.lessons);renderMenu();});
window.__piano={open:id=>open(ALL.find(l=>l.id===id)),seek:s=>{pausedAt=s;paint(s);},unlockAll:()=>{ALL.forEach(l=>progress[l.id]=progress[l.id]||1);renderMenu();}};
})();
