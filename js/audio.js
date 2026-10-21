'use strict';
const Audio_ = (()=>{let ctx,master;
function init(){if(ctx)return;ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=0.5;
const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);}
function freq(n){const m=n.match(/^([A-G])(#?)(\d)$/);const s={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]?1:0);return 440*Math.pow(2,((+m[3]+1)*12+s-69)/12);}
function play(n){init();if(ctx.state==='suspended')ctx.resume();const f=freq(n),t=ctx.currentTime,g=ctx.createGain(),lp=ctx.createBiquadFilter();
lp.type='lowpass';lp.frequency.setValueAtTime(f*8,t);lp.frequency.exponentialRampToValueAtTime(f*2,t+1.2);
g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.6,t+0.005);g.gain.exponentialRampToValueAtTime(0.25,t+0.3);g.gain.exponentialRampToValueAtTime(0.001,t+2.2);
[[1,'triangle',1],[2,'sine',0.35],[3,'sine',0.15],[1.003,'sawtooth',0.05]].forEach(([h,type,a])=>{const o=ctx.createOscillator(),og=ctx.createGain();o.type=type;o.frequency.value=f*h;og.gain.value=a;o.connect(og);og.connect(lp);o.start(t);o.stop(t+2.3);});
lp.connect(g);g.connect(master);}
return {init,play,freq};})();
