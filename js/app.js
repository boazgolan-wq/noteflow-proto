'use strict';
(()=>{const $=id=>document.getElementById(id);
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];const KEYS=[];
for(let o=4;o<=5;o++)NAMES.forEach(n=>KEYS.push(n+o));KEYS.push('C6');
const HE={};'CDEFGAB'.split('').forEach((c,i)=>HE[c]=T.notes[i]);
$('appname').textContent=CONFIG.APP_NAME;const ls_=$('lang');Object.keys(I18N).forEach(l=>{const o=document.createElement('option');o.value=l;o.textContent=l.toUpperCase();if(l===LANG)o.selected=true;ls_.appendChild(o);});ls_.onchange=()=>{location.search='?lang='+ls_.value;};
let DATA,lesson,notes=[],t0=0,playing=false,pausedAt=0,speed=1,score=0,combo=0,maxCombo=0,hits={p:0,g:0,m:0},raf;
const progress=JSON.parse(localStorage.getItem('pianoProgress')||'{}');
const LEAD=2.5,PERF=0.1,GOOD=0.22;const keyEls={};
// keyboard
const kb=$('kb');const whites=KEYS.filter(k=>!k.includes('#'));const W=100/whites.length;let wi=0;
KEYS.forEach(k=>{const el=document.createElement('div');el.className='key '+(k.includes('#')?'black':'white');
if(k.includes('#')){el.style.left=(wi*W-W*0.32)+'%';el.style.width=(W*0.64)+'%';}else{el.style.left=(wi*W)+'%';el.style.width=W+'%';el.textContent=HE[k[0]];wi++;}
el.dataset.note=k;kb.appendChild(el);keyEls[k]=el;});
function keyRect(k){const e=keyEls[k],r=e.getBoundingClientRect(),kr=kb.getBoundingClientRect();return {x:r.left-kr.left,w:r.width,black:k.includes('#')};}
const active=new Map();
function noteAt(x,y){const el=document.elementFromPoint(x,y);return el&&el.dataset&&el.dataset.note;}
function press(id,n){if(!n||active.get(id)===n)return;release(id);active.set(id,n);keyEls[n].classList.add('down');Audio_.play(n);judgeHit(n);}
function release(id){const n=active.get(id);if(n){keyEls[n].classList.remove('down');active.delete(id);}}
kb.addEventListener('pointerdown',e=>{e.preventDefault();kb.setPointerCapture&&kb.releasePointerCapture&&0;press(e.pointerId,noteAt(e.clientX,e.clientY));});
kb.addEventListener('pointermove',e=>{if(active.has(e.pointerId))press(e.pointerId,noteAt(e.clientX,e.clientY));});
['pointerup','pointercancel','pointerleave'].forEach(t=>kb.addEventListener(t,e=>release(e.pointerId)));
// menu
function unlocked(i,all){return i===0||progress[all[i-1].id]>=1;}
function renderMenu(){const box=$('levels');box.textContent='';const all=DATA.levels.flatMap(l=>l.lessons);
DATA.levels.forEach(lv=>{const d=document.createElement('div');d.className='level';const h=document.createElement('h2');h.textContent=T.levels[lv.id]||lv.name;d.appendChild(h);
lv.lessons.forEach(ls=>{const i=all.indexOf(ls),ok=unlocked(i,all);const b=document.createElement('button');b.className='lesson'+(ok?'':' locked');
const s=document.createElement('span');s.textContent=(ok?'':'🔒 ')+(T.lessons[ls.id]||ls.title)+' '+('★'.repeat(progress[ls.id]||0));
const tg=document.createElement('span');tg.className='tag '+(ls.free?'free':'prem');tg.textContent=ls.free?T.free:T.premium;
b.append(s,tg);b.onclick=()=>{if(!ok){flash(T.locked);return;}if(!ls.free){$('premium').classList.add('show');return;}open(ls);};d.appendChild(b);});box.appendChild(d);});}
function flash(t){const j=$('judge');show(t,'#fff');}
// game
const cv=$('cv'),cx=cv.getContext('2d');
function resize(){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;cv.width=r.width*d;cv.height=r.height*d;cx.setTransform(d,0,0,d,0,0);}
addEventListener('resize',resize);
function open(ls){lesson=ls;$('ltitle').textContent=T.lessons[ls.id]||ls.title;$('menu').classList.remove('active');$('game').classList.add('active');resize();reset();draw();}
function reset(){cancelAnimationFrame(raf);playing=false;pausedAt=0;score=combo=maxCombo=0;hits={p:0,g:0,m:0};
const beat=60/lesson.bpm;let t=LEAD;notes=lesson.notes.map(([n,d])=>{const o={n,t,d:d*beat,state:0};t+=d*beat;return o;});$('play').textContent=T.start;hud();}
function now(){return playing?(performance.now()/1000-t0)*speed:pausedAt;}
$('play').onclick=()=>{Audio_.init();if(playing){pausedAt=now();playing=false;$('play').textContent=T.resume;cancelAnimationFrame(raf);}
else{t0=performance.now()/1000-pausedAt/speed;playing=true;$('play').textContent=T.pause;loop();}};
$('speed').onchange=e=>{const c=now();speed=+e.target.value;if(playing)t0=performance.now()/1000-c/speed;else pausedAt=c;};
$('back').onclick=()=>{reset();$('game').classList.remove('active');$('menu').classList.add('active');renderMenu();};
function show(t,c){const j=$('judge');j.textContent=t;j.style.color=c;j.style.opacity=1;clearTimeout(j._t);j._t=setTimeout(()=>j.style.opacity=0,450);}
function judgeHit(n){if(!playing)return;const c=now();let best=null;
for(const o of notes)if(!o.state&&o.n===n&&Math.abs(o.t-c)<=GOOD&&(!best||Math.abs(o.t-c)<Math.abs(best.t-c)))best=o;
if(!best)return;const dt=Math.abs(best.t-c);if(dt<=PERF){best.state=1;hits.p++;score+=100*(1+Math.floor(combo/5));show(T.perfectJ,'#5f5');}
else{best.state=2;hits.g++;score+=50;show(T.goodJ,'#7cf');}combo++;if(combo%8===0)praise('combo');maxCombo=Math.max(maxCombo,combo);hud();}
let lastPraise=0;const pick=a=>a[Math.floor(Math.random()*a.length)];
function praise(kind,force){const t=performance.now();if(!force&&t-lastPraise<4000)return;lastPraise=t;const el=$('toast');el.textContent=pick(T.praise[kind]);el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function hud(){$('score').textContent=score;$('combo').textContent=combo;const tot=hits.p+hits.g+hits.m;
$('acc').textContent=(tot?Math.round((hits.p+hits.g*0.5)/tot*100):100)+'%';}
function loop(){const c=now();for(const o of notes)if(!o.state&&c-o.t>GOOD){o.state=3;hits.m++;combo=0;show(T.missJ,'#f55');hud();}
Object.values(keyEls).forEach(e=>e.classList.remove('hint'));notes.forEach(o=>{if(!o.state&&Math.abs(o.t-c)<0.25)keyEls[o.n].classList.add('hint');});
draw();if(notes.every(o=>o.state)&&c>notes[notes.length-1].t+0.5)return finish();raf=requestAnimationFrame(loop);}
function draw(){const w=cv.clientWidth,h=cv.clientHeight,c=now(),pps=h/LEAD;cx.clearRect(0,0,w,h);
whites.forEach((k,i)=>{cx.fillStyle=i%2?'#14183a':'#171c42';const r=keyRect(k);cx.fillRect(r.x,0,r.w,h);});
cx.fillStyle='#5b6cff';cx.fillRect(0,h-3,w,3);
for(const o of notes){if(o.state===1||o.state===2)continue;const r=keyRect(o.n);const yb=h-(o.t-c)*pps,len=Math.max(o.d*pps*0.85,14);
if(yb<0||yb-len>h)continue;cx.fillStyle=o.state===3?'#733':(r.black?'#c8f':'#7cf');const pad=r.w*0.1;
cx.beginPath();cx.roundRect?cx.roundRect(r.x+pad,yb-len,r.w-2*pad,len,6):cx.rect(r.x+pad,yb-len,r.w-2*pad,len);cx.fill();
cx.fillStyle='#0f1226';cx.font='bold 11px sans-serif';cx.textAlign='center';cx.fillText(o.n.includes('#')?'#':HE[o.n[0]],r.x+r.w/2,yb-6);}}
function finish(){playing=false;const tot=notes.length,acc=(hits.p+hits.g*0.5)/tot;const st=acc>=0.9?3:acc>=0.7?2:acc>=0.5?1:0;
const all=DATA.levels.flatMap(l=>l.lessons),wasLocked=all.indexOf(lesson)<all.length-1&&!(progress[lesson.id]>=1);
if(st>(progress[lesson.id]||0)){progress[lesson.id]=st;localStorage.setItem('pianoProgress',JSON.stringify(progress));}
$('rtitle').textContent=st?T.great:T.almost;$('stars').textContent='★'.repeat(st)+'☆'.repeat(3-st);
$('rstats').textContent=T.stats.replace('{a}',Math.round(acc*100)).replace('{p}',hits.p).replace('{g}',hits.g).replace('{m}',hits.m).replace('{c}',maxCombo).replace('{s}',score);$('result').classList.add('show');
if(st&&wasLocked)praise('unlock',true);else if(hits.p===tot)praise('perfect',true);else if(st)praise('done',true);}
$('again').onclick=()=>{$('result').classList.remove('show');reset();draw();};
$('tomenu').onclick=()=>{$('result').classList.remove('show');$('back').onclick();};
$('pclose').onclick=()=>$('premium').classList.remove('show');
fetch('lessons/lessons.json').then(r=>r.json()).then(d=>{DATA=d;renderMenu();});
window.__piano={open:id=>open(DATA.levels.flatMap(l=>l.lessons).find(l=>l.id===id)),seek:s=>{pausedAt=s;draw();}};
})();
