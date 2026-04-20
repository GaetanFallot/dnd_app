/**
 * Second-window document, served via `Blob` + `window.open()`.
 *
 * Ported verbatim from the legacy `js/display.js` `buildScreenHTML()` function.
 * The receiving window runs its own JS (canvas effects, WebAudio, turn-order
 * rendering) and communicates with the main app via `window.postMessage`.
 *
 * DO NOT convert this to React — it's a self-contained page that must work
 * with zero build-step on the popup side, and whose audio context is owned
 * by the popup (not the parent).
 */
export function buildSecondScreenHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Roll'n'Roles — Écran DnD</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000;cursor:none}
#bg{position:absolute;inset:0;background:#0d0a07;transition:background .7s ease;z-index:0}
#img-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .6s;z-index:1}
#img-wrap img,#img-wrap video{max-width:100%;max-height:100%;object-fit:contain;display:block}
#img-wrap.cover img,#img-wrap.cover video{object-fit:cover;width:100%;height:100%}
#img-wrap.stretch img,#img-wrap.stretch video{object-fit:fill;width:100%;height:100%}
#img-wrap.center img,#img-wrap.center video{object-fit:none}
#fx-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none}
#overlay-layer{position:absolute;inset:0;pointer-events:none;z-index:4}
#lightning-flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:6;pointer-events:none}
#idle{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10}
#idle-t{color:rgba(180,150,80,.3);font-size:clamp(1rem,3vw,2rem);letter-spacing:.4em;text-transform:uppercase;font-family:Georgia,serif}
#idle-s{color:rgba(180,150,80,.15);font-size:.85rem;letter-spacing:.3em;text-transform:uppercase;margin-top:.6rem;font-family:Georgia,serif}
#audio-gate{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:opacity .5s}
#audio-gate.hidden{opacity:0;pointer-events:none}
#audio-gate .ag-icon{font-size:4rem;margin-bottom:1rem;animation:agPulse 2s ease-in-out infinite}
#audio-gate .ag-text{color:rgba(200,180,120,.6);font-size:1.2rem;letter-spacing:.3em;text-transform:uppercase;font-family:Georgia,serif}
@keyframes agPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.1);opacity:1}}
.ov-vignette{box-shadow:inset 0 0 150px 60px rgba(0,0,0,.8)}
.ov-fog{animation:fogDrift 12s ease-in-out infinite alternate}
.ov-fire{animation:fireFlicker 2.5s ease-in-out infinite alternate}
.ov-blood{background:rgba(120,0,0,.25)!important}
.ov-magic{animation:magicPulse 4s ease-in-out infinite}
.ov-darkness{background:rgba(0,0,0,.55)!important}
.ov-waves-css{animation:waveMotion 3s ease-in-out infinite alternate}
@keyframes fogDrift{from{background:radial-gradient(ellipse at 20% 50%,rgba(120,130,150,.3) 0%,transparent 55%),radial-gradient(ellipse at 80% 50%,rgba(100,110,130,.2) 0%,transparent 45%)}to{background:radial-gradient(ellipse at 80% 50%,rgba(120,130,150,.3) 0%,transparent 55%),radial-gradient(ellipse at 20% 50%,rgba(100,110,130,.2) 0%,transparent 45%)}}
@keyframes fireFlicker{from{background:radial-gradient(ellipse at 50% 110%,rgba(255,90,0,.25) 0%,rgba(180,40,0,.1) 40%,transparent 65%)}to{background:radial-gradient(ellipse at 50% 110%,rgba(255,120,0,.35) 0%,rgba(200,60,0,.15) 40%,transparent 70%)}}
@keyframes magicPulse{0%,100%{background:radial-gradient(ellipse at 50% 50%,rgba(120,0,200,.15) 0%,transparent 60%)}50%{background:radial-gradient(ellipse at 50% 50%,rgba(60,0,200,.25) 0%,rgba(200,0,180,.1) 50%,transparent 70%)}}
@keyframes waveMotion{0%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-8px) scaleY(1.01)}100%{transform:translateY(5px) scaleY(.99)}}
#turn-order-bar{position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-110%);z-index:50;display:flex;align-items:center;gap:5px;padding:6px 16px 14px;background:linear-gradient(to bottom,rgba(8,5,2,.97),rgba(10,6,2,.82));border-bottom:1px solid rgba(200,168,75,.22);border-left:1px solid rgba(200,168,75,.13);border-right:1px solid rgba(200,168,75,.13);border-radius:0 0 14px 14px;transition:transform .5s cubic-bezier(.34,1.56,.64,1);max-width:88vw;overflow-x:auto;scrollbar-width:none}
#turn-order-bar::-webkit-scrollbar{display:none}
#turn-order-bar.visible{transform:translateX(-50%) translateY(0)}
.to-round-badge{display:flex;flex-direction:column;align-items:center;min-width:34px;padding-right:2px;flex-shrink:0}
.to-round-label{font-family:Georgia,serif;font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(200,168,75,.45)}
.to-round-num{font-family:Georgia,serif;font-size:1.05rem;color:rgba(200,168,75,.8);line-height:1.1}
.to-sep{width:1px;height:36px;background:rgba(200,168,75,.12);flex-shrink:0}
.to-fighter{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:50px;flex-shrink:0;padding:0 2px}
.to-portrait{width:44px;height:44px;border-radius:50%;border:2px solid rgba(200,168,75,.28);background:rgba(18,10,4,.9);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:1.1rem;color:rgba(200,168,75,.65);position:relative;transition:all .35s;flex-shrink:0}
.to-fighter.active .to-portrait{border-color:#c8a84b;color:#c8a84b;box-shadow:0 0 0 3px rgba(200,168,75,.15),0 0 18px rgba(200,168,75,.55);transform:scale(1.14);animation:toGlow 2s ease-in-out infinite alternate}
.to-fighter.upcoming .to-portrait{border-color:rgba(200,168,75,.48);opacity:.72}
.to-init-badge{position:absolute;bottom:-7px;right:-5px;background:rgba(8,5,2,.95);border:1px solid rgba(200,168,75,.48);border-radius:8px;font-size:.57rem;color:#c8a84b;font-family:Georgia,serif;padding:1px 4px;min-width:17px;text-align:center;line-height:1.4}
.to-fighter-name{font-family:Georgia,serif;font-size:.54rem;color:rgba(200,168,75,.55);max-width:50px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;letter-spacing:.03em}
.to-fighter.active .to-fighter-name{color:#c8a84b;font-weight:bold}
.to-pip{width:5px;height:5px;border-radius:50%;background:#c8a84b;box-shadow:0 0 6px #c8a84b;animation:toPip 1s ease-in-out infinite alternate;margin-bottom:-1px;flex-shrink:0}
@keyframes toGlow{from{box-shadow:0 0 0 3px rgba(200,168,75,.15),0 0 12px rgba(200,168,75,.45)}to{box-shadow:0 0 0 3px rgba(200,168,75,.22),0 0 24px rgba(200,168,75,.75)}}
@keyframes toPip{from{opacity:.65;transform:scale(1)}to{opacity:1;transform:scale(1.4)}}
</style></head><body>
<div id="audio-gate" onclick="unlockAudio()"><div class="ag-icon">🔊</div><div class="ag-text">Cliquer pour activer le son</div></div>
<div id="bg"></div>
<div id="img-wrap"><img id="mi" src="" alt="" style="display:none"/><video id="mv" src="" muted loop playsinline style="display:none"></video></div>
<canvas id="fx-canvas"></canvas>
<div id="overlay-layer"></div>
<div id="lightning-flash"></div>
<div id="turn-order-bar"></div>
<div id="idle"><div id="idle-t">⚔ En attente ⚔</div><div id="idle-s">Roll'n'Roles</div></div>
<script>
const bg=document.getElementById('bg'),iw=document.getElementById('img-wrap'),
  mi=document.getElementById('mi'),mv=document.getElementById('mv'),
  idle=document.getElementById('idle'),ol=document.getElementById('overlay-layer'),
  flash=document.getElementById('lightning-flash'),
  cvs=document.getElementById('fx-canvas'),ctx=cvs.getContext('2d');

let W,H,activeEffects=new Set(),masterVol=0.5,stormActive=false,audioUnlocked=false;
const effectVol={rain:.6,snow:.6,thunder:.6,fire:.6,waves:.6,wind:.6,magic:.6};

let thunderDataUrls=null;
let thunderBuffers={};

function resize(){W=cvs.width=innerWidth;H=cvs.height=innerHeight;}
resize();window.addEventListener('resize',resize);

let audioCtx=null;const audioNodes={};
function getAC(){
  if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  return audioCtx;
}

function unlockAudio(){
  const ac=getAC();
  const buf=ac.createBuffer(1,1,ac.sampleRate);
  const src=ac.createBufferSource();src.buffer=buf;src.connect(ac.destination);src.start();
  audioUnlocked=true;
  document.getElementById('audio-gate').classList.add('hidden');
  if(thunderDataUrls)decodeThunderSounds();
}

async function decodeThunderSounds(){
  if(!thunderDataUrls||!audioCtx)return;
  const ac=getAC();
  for(const [key,dataUrl] of Object.entries(thunderDataUrls)){
    try{
      const resp=await fetch(dataUrl);
      const arrayBuf=await resp.arrayBuffer();
      const audioBuf=await ac.decodeAudioData(arrayBuf);
      thunderBuffers[key]=audioBuf;
    }catch(err){console.warn('Failed to decode',key,err);}
  }
}

// ═══ RAIN ═══
let rainDrops=[];
function initRain(){const c=stormActive?800:500;rainDrops=[];for(let i=0;i<c;i++)rainDrops.push({x:Math.random()*W*1.2,y:Math.random()*H,len:Math.random()*(stormActive?35:25)+12,speed:Math.random()*(stormActive?20:12)+14,opacity:Math.random()*.4+.2,width:Math.random()*1.5+.5,wind:stormActive?(Math.random()*6+4):(Math.random()*2+1)});}
function drawRain(){rainDrops.forEach(d=>{ctx.strokeStyle='rgba(174,194,224,'+d.opacity+')';ctx.lineWidth=d.width;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.wind*2,d.y+d.len);ctx.stroke();if(d.y>H-5){ctx.fillStyle='rgba(174,194,224,'+(d.opacity*.4)+')';ctx.beginPath();ctx.arc(d.x,H-2,Math.random()*2.5+.5,0,Math.PI);ctx.fill();}d.y+=d.speed;d.x-=d.wind;if(d.y>H){d.y=Math.random()*-100;d.x=Math.random()*(W+300);}});}

// ═══ SNOW ═══
let snowFlakes=[];
function initSnow(){snowFlakes=[];for(let i=0;i<250;i++)snowFlakes.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*3.5+1,speed:Math.random()*1.8+.4,dx:Math.random()*1.2-.6,wobble:Math.random()*Math.PI*2,wobbleSpeed:Math.random()*.02+.005,opacity:Math.random()*.5+.4});}
function drawSnow(){snowFlakes.forEach(f=>{f.wobble+=f.wobbleSpeed;ctx.fillStyle='rgba(235,240,255,'+f.opacity+')';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(200,220,255,'+(f.opacity*.12)+')';ctx.beginPath();ctx.arc(f.x,f.y,f.r*2.5,0,Math.PI*2);ctx.fill();f.y+=f.speed;f.x+=f.dx+Math.sin(f.wobble)*0.6;if(f.y>H+5){f.y=-f.r*2;f.x=Math.random()*W;}if(f.x<-10)f.x=W+10;if(f.x>W+10)f.x=-10;});}

// ═══ THUNDER ═══
let thunderTimer=0,nextThunder=0,lightningBolts=[];
function initThunder(){nextThunder=stormActive?(Math.random()*40+15):(Math.random()*250+100);thunderTimer=0;lightningBolts=[];}
function drawThunder(){
  thunderTimer++;
  lightningBolts=lightningBolts.filter(bolt=>{bolt.life--;if(bolt.life<=0)return false;const a=bolt.life/bolt.maxLife;ctx.strokeStyle='rgba(200,220,255,'+a+')';ctx.lineWidth=bolt.width*a;ctx.shadowColor='rgba(150,180,255,'+(a*.8)+')';ctx.shadowBlur=25*a;ctx.beginPath();bolt.points.forEach((p,j)=>{if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();bolt.branches.forEach(br=>{ctx.strokeStyle='rgba(180,200,255,'+(a*.5)+')';ctx.lineWidth=bolt.width*.35*a;ctx.beginPath();br.forEach((p,j)=>{if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();});ctx.shadowBlur=0;return true;});
  if(thunderTimer>=nextThunder){
    thunderTimer=0;
    const bolts=stormActive?(Math.random()<.4?3:Math.random()<.5?2:1):1;
    for(let b=0;b<bolts;b++)setTimeout(()=>createLightningBolt(),b*60);
    triggerFlash(stormActive?.85:.5);
    playThunderSound();
    nextThunder=stormActive?(Math.random()*50+15):(Math.random()*300+120);
  }
}
function createLightningBolt(){const startX=Math.random()*W*.7+W*.15;let x=startX,y=0;const points=[{x,y}],branches=[];while(y<H*(Math.random()*.3+.55)){x+=Math.random()*70-35;y+=Math.random()*30+10;points.push({x,y});if(Math.random()<(stormActive?.35:.2)){let bx=x,by=y;const br=[{x:bx,y:by}];for(let i=0;i<Math.random()*5+2;i++){bx+=Math.random()*50-25+(Math.random()>.5?18:-18);by+=Math.random()*22+8;br.push({x:bx,y:by});}branches.push(br);}}lightningBolts.push({points,branches,life:22,maxLife:22,width:Math.random()*2.5+1.5});}
function triggerFlash(mx){flash.style.transition='opacity .03s';flash.style.opacity=String(Math.random()*mx*.6+mx*.2);setTimeout(()=>{flash.style.opacity='0';},50+Math.random()*30);setTimeout(()=>{if(Math.random()<.6){flash.style.opacity=String(Math.random()*mx*.35);setTimeout(()=>{flash.style.opacity='0';},35);}},100+Math.random()*60);if(stormActive&&Math.random()<.3){setTimeout(()=>{flash.style.opacity=String(Math.random()*mx*.4);setTimeout(()=>{flash.style.opacity='0';},40);},200+Math.random()*100);}}

function playThunderSound(){
  if(!audioUnlocked)return;
  const ac=getAC();
  const vol=Math.min(1,masterVol*(effectVol.thunder||.6)*(stormActive?1.3:1));
  const bufKeys=Object.keys(thunderBuffers);
  if(bufKeys.length>0){
    let pool;
    if(stormActive)pool=bufKeys.filter(k=>k.includes('storm')||k.includes('mega'));
    else pool=bufKeys.filter(k=>k.includes('close')||k.includes('distant'));
    if(!pool.length)pool=bufKeys;
    const key=pool[Math.floor(Math.random()*pool.length)];
    const src=ac.createBufferSource();
    src.buffer=thunderBuffers[key];
    const gain=ac.createGain();
    gain.gain.value=vol;
    src.connect(gain);gain.connect(ac.destination);
    src.start();
  } else {
    const dur=stormActive?4:3;
    const n=ac.sampleRate*dur;
    const buf=ac.createBuffer(1,n,ac.sampleRate);
    const d=buf.getChannelData(0);
    let v=0;for(let i=0;i<n;i++){v+=(Math.random()*2-1)*.02;v=Math.max(-1,Math.min(1,v));d[i]=v;}
    const src=ac.createBufferSource();src.buffer=buf;
    const filt=ac.createBiquadFilter();filt.type='lowpass';filt.frequency.value=stormActive?200:120;
    const gain=ac.createGain();
    gain.gain.setValueAtTime(0,ac.currentTime);
    gain.gain.linearRampToValueAtTime(vol,ac.currentTime+.04);
    gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+dur);
    const crack=ac.createBufferSource();
    const cn=ac.sampleRate*0.08;
    const cb=ac.createBuffer(1,cn,ac.sampleRate);
    const cd=cb.getChannelData(0);for(let i=0;i<cn;i++)cd[i]=Math.random()*2-1;
    crack.buffer=cb;
    const cf=ac.createBiquadFilter();cf.type='highpass';cf.frequency.value=1000;
    const cg=ac.createGain();cg.gain.setValueAtTime(vol*.8,ac.currentTime);cg.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.15);
    crack.connect(cf);cf.connect(cg);cg.connect(ac.destination);crack.start();crack.stop(ac.currentTime+.2);
    src.connect(filt);filt.connect(gain);gain.connect(ac.destination);
    src.start();src.stop(ac.currentTime+dur+.1);
  }
}

// ═══ WAVES ═══
let waveTime=0;
function drawWaves(){waveTime+=.018;const wH=H*(stormActive?.25:.18);for(let l=0;l<4;l++){const yB=H-wH+l*22,al=.14-.025*l,sp=1.2+l*.35,cols=['40,110,180','25,70,140','15,45,100','8,25,60'];ctx.fillStyle='rgba('+cols[l]+','+al+')';ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x+=3){const amp=stormActive?35:20;const y=yB+Math.sin(x*.005+waveTime*sp)*amp+Math.sin(x*.013+waveTime*sp*1.4)*(amp*.5)+Math.sin(x*.002-waveTime*.8)*(amp*.7);ctx.lineTo(x,y);}ctx.lineTo(W,H);ctx.closePath();ctx.fill();}ctx.fillStyle='rgba(220,240,255,.1)';for(let x=0;x<W;x+=2){const y=H-wH+Math.sin(x*.006+waveTime)*25+Math.sin(x*.015+waveTime*1.5)*10;if(Math.random()<(stormActive?.06:.025)){ctx.beginPath();ctx.arc(x,y+Math.random()*10-5,Math.random()*3+.5,0,Math.PI*2);ctx.fill();}}}

// ═══ WIND ═══
let windParticles=[];
function initWind(){const c=stormActive?150:80;windParticles=[];for(let i=0;i<c;i++)windParticles.push({x:Math.random()*W,y:Math.random()*H,len:Math.random()*(stormActive?80:40)+20,speed:Math.random()*(stormActive?25:15)+10,opacity:Math.random()*.15+.05,curve:Math.random()*4-2});}
function drawWind(){windParticles.forEach(p=>{ctx.strokeStyle='rgba(190,190,190,'+p.opacity+')';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);const c1x=p.x+p.len*.33,c1y=p.y+p.curve*3,c2x=p.x+p.len*.66,c2y=p.y-p.curve*2;ctx.bezierCurveTo(c1x,c1y,c2x,c2y,p.x+p.len,p.y+Math.sin(p.x*.01)*4);ctx.stroke();p.x+=p.speed;if(p.x>W+p.len){p.x=-p.len;p.y=Math.random()*H;}});}

// ═══ MAGIC ═══
let magicP=[];
function initMagic(){magicP=[];for(let i=0;i<60;i++)magicP.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+.5,speed:Math.random()*1+.3,angle:Math.random()*Math.PI*2,spin:Math.random()*.03-.015,hue:Math.random()*60+260,opacity:Math.random()*.6+.2});}
function drawMagic(){magicP.forEach(p=>{p.angle+=p.spin;p.x+=Math.cos(p.angle)*p.speed;p.y+=Math.sin(p.angle)*p.speed*.7-0.3;ctx.fillStyle='hsla('+p.hue+',70%,70%,'+p.opacity+')';ctx.shadowColor='hsla('+p.hue+',80%,60%,.4)';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(p.y<-10)p.y=H+10;if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;if(p.y>H+10)p.y=-10;});}

// ═══ PROCEDURAL AMBIENT AUDIO ═══
function noiseBuf(dur,type){const ac=getAC(),sr=ac.sampleRate,len=sr*dur,buf=ac.createBuffer(1,len,sr),d=buf.getChannelData(0);if(type==='white')for(let i=0;i<len;i++)d[i]=Math.random()*2-1;else if(type==='brown'){let v=0;for(let i=0;i<len;i++){v+=(Math.random()*2-1)*.02;v=Math.max(-1,Math.min(1,v));d[i]=v;}}else if(type==='pink'){let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;}}return buf;}
function getVol(id){return masterVol*(effectVol[id]||.6);}
function startAmb(id){
  if(!audioUnlocked)return;
  const ac=getAC();if(audioNodes[id]){try{audioNodes[id].src.stop();}catch(e){}audioNodes[id]=null;}
  let src,filt,gain,extras=[];
  if(id==='rain'){src=ac.createBufferSource();src.buffer=noiseBuf(4,'pink');src.loop=true;filt=ac.createBiquadFilter();filt.type='lowpass';filt.frequency.value=stormActive?3500:2500;const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=150;gain=ac.createGain();gain.gain.value=0;gain.gain.linearRampToValueAtTime(getVol('rain')*(stormActive?.5:.35),ac.currentTime+1.2);src.connect(filt);filt.connect(hp);hp.connect(gain);gain.connect(ac.destination);extras=[hp];}
  else if(id==='snow'){src=ac.createBufferSource();src.buffer=noiseBuf(4,'brown');src.loop=true;filt=ac.createBiquadFilter();filt.type='lowpass';filt.frequency.value=350;gain=ac.createGain();gain.gain.value=0;gain.gain.linearRampToValueAtTime(getVol('snow')*.15,ac.currentTime+2);src.connect(filt);filt.connect(gain);gain.connect(ac.destination);}
  else if(id==='fire'){src=ac.createBufferSource();src.buffer=noiseBuf(3,'white');src.loop=true;filt=ac.createBiquadFilter();filt.type='bandpass';filt.frequency.value=900;filt.Q.value=1.2;const lfo=ac.createOscillator();lfo.frequency.value=9;const lg=ac.createGain();lg.gain.value=.004;lfo.connect(lg);lg.connect(filt.frequency);lfo.start();extras=[lfo,lg];gain=ac.createGain();gain.gain.value=0;gain.gain.linearRampToValueAtTime(getVol('fire')*.2,ac.currentTime+1);src.connect(filt);filt.connect(gain);gain.connect(ac.destination);}
  else if(id==='wind'){src=ac.createBufferSource();src.buffer=noiseBuf(5,'pink');src.loop=true;filt=ac.createBiquadFilter();filt.type='bandpass';filt.frequency.value=stormActive?800:500;filt.Q.value=.6;const lfo=ac.createOscillator();lfo.frequency.value=stormActive?.5:.25;const lg=ac.createGain();lg.gain.value=stormActive?500:250;lfo.connect(lg);lg.connect(filt.frequency);lfo.start();extras=[lfo,lg];gain=ac.createGain();gain.gain.value=0;gain.gain.linearRampToValueAtTime(getVol('wind')*(stormActive?.4:.28),ac.currentTime+1.5);src.connect(filt);filt.connect(gain);gain.connect(ac.destination);}
  else if(id==='waves'){src=ac.createBufferSource();src.buffer=noiseBuf(6,'pink');src.loop=true;filt=ac.createBiquadFilter();filt.type='lowpass';filt.frequency.value=stormActive?700:450;const lfo=ac.createOscillator();lfo.frequency.value=stormActive?.2:.12;const lg=ac.createGain();lg.gain.value=stormActive?400:220;lfo.connect(lg);lg.connect(filt.frequency);lfo.start();extras=[lfo,lg];gain=ac.createGain();gain.gain.value=0;gain.gain.linearRampToValueAtTime(getVol('waves')*(stormActive?.45:.3),ac.currentTime+2);src.connect(filt);filt.connect(gain);gain.connect(ac.destination);}
  else if(id==='magic'){src=ac.createBufferSource();src.buffer=noiseBuf(4,'white');src.loop=true;filt=ac.createBiquadFilter();filt.type='bandpass';filt.frequency.value=3000;filt.Q.value=5;const lfo=ac.createOscillator();lfo.frequency.value=2;const lg=ac.createGain();lg.gain.value=1500;lfo.connect(lg);lg.connect(filt.frequency);lfo.start();extras=[lfo,lg];gain=ac.createGain();gain.gain.value=0;gain.gain.linearRampToValueAtTime(getVol('magic')*.1,ac.currentTime+1);src.connect(filt);filt.connect(gain);gain.connect(ac.destination);}
  else if(id==='thunder'){src=ac.createBufferSource();src.buffer=noiseBuf(6,'brown');src.loop=true;filt=ac.createBiquadFilter();filt.type='lowpass';filt.frequency.value=80;gain=ac.createGain();gain.gain.value=0;gain.gain.linearRampToValueAtTime(getVol('thunder')*(stormActive?.18:.06),ac.currentTime+1);src.connect(filt);filt.connect(gain);gain.connect(ac.destination);}
  if(src){src.start();audioNodes[id]={src,gain,filt,extras};}
}
function stopAmb(id){if(!audioNodes[id])return;const ac=getAC();audioNodes[id].gain.gain.linearRampToValueAtTime(0,ac.currentTime+1.2);const n=audioNodes[id];setTimeout(()=>{try{n.src.stop();n.extras.forEach(e=>{try{e.stop();}catch(x){}});}catch(e){}},1500);audioNodes[id]=null;}
function updateAmbVol(id){if(!audioNodes[id]||!audioNodes[id].gain)return;const ac=getAC();const tgts={rain:stormActive?.5:.35,snow:.15,thunder:stormActive?.18:.06,fire:.2,wind:stormActive?.4:.28,waves:stormActive?.45:.3,magic:.1};const t=getVol(id)*(tgts[id]||.3);audioNodes[id].gain.gain.linearRampToValueAtTime(t,ac.currentTime+.3);}

function animate(){ctx.clearRect(0,0,W,H);if(activeEffects.has('waves'))drawWaves();if(activeEffects.has('rain'))drawRain();if(activeEffects.has('snow'))drawSnow();if(activeEffects.has('thunder'))drawThunder();if(activeEffects.has('wind'))drawWind();if(activeEffects.has('magic'))drawMagic();requestAnimationFrame(animate);}
animate();

// ═══ MESSAGE HANDLER ═══
const CANVAS_FX=['rain','snow','thunder','waves','wind','magic'];
const SOUND_FX=['rain','snow','thunder','fire','wind','waves','magic'];
window.addEventListener('message',e=>{
  const d=e.data;if(!d||!d.type)return;
  if(d.type==='thunder-sounds'){
    thunderDataUrls=d.sounds;
    if(audioUnlocked)decodeThunderSounds();
  }
  if(d.type==='master-volume'){masterVol=d.volume;SOUND_FX.forEach(id=>{if(activeEffects.has(id)||audioNodes[id])updateAmbVol(id);});}
  if(d.type==='effect-volume'){effectVol[d.id]=d.volume;if(activeEffects.has(d.id)||audioNodes[d.id])updateAmbVol(d.id);}
  if(d.type==='vid-audio'){mv.muted=d.muted;mv.volume=Math.min(1,d.volume*(masterVol||.5));}
  if(d.type==='storm-mode'){stormActive=d.active;if(activeEffects.has('rain'))initRain();if(activeEffects.has('thunder'))initThunder();if(activeEffects.has('wind'))initWind();SOUND_FX.forEach(id=>{if(audioNodes[id]){stopAmb(id);setTimeout(()=>{if(activeEffects.has(id))startAmb(id);},200);}});}
  if(d.type==='scene'){
    idle.style.display='none';mi.style.display='none';mv.style.display='none';mv.pause();
    if(d.isVideo){bg.style.background='#000';mv.src=d.src;mv.style.display='block';mv.play();iw.className='';if(d.fit==='cover')iw.classList.add('cover');else if(d.fit==='stretch')iw.classList.add('stretch');else if(d.fit==='center')iw.classList.add('center');iw.style.opacity='1';}
    else if(d.src){bg.style.background='#000';mi.src=d.src;mi.style.display='block';iw.className='';if(d.fit==='cover')iw.classList.add('cover');else if(d.fit==='stretch')iw.classList.add('stretch');else if(d.fit==='center')iw.classList.add('center');iw.style.opacity='1';}
    else{iw.style.opacity='0';bg.style.background=d.bg||'#000';}
  }
  if(d.type==='fit'){iw.className='';if(d.fit==='cover')iw.classList.add('cover');else if(d.fit==='stretch')iw.classList.add('stretch');else if(d.fit==='center')iw.classList.add('center');}
  if(d.type==='black'){idle.style.display='none';iw.style.opacity='0';mi.style.display='none';mv.style.display='none';mv.pause();bg.style.background='#000';}
  if(d.type==='overlays'){
    const old=ol.querySelector('.css-ov');if(old)old.remove();
    const ov=document.createElement('div');ov.className='css-ov';ov.style.cssText='position:absolute;inset:0;pointer-events:none;';
    const ovs=d.overlays;
    if(ovs.includes('vignette'))ov.classList.add('ov-vignette');
    if(ovs.includes('fog'))ov.classList.add('ov-fog');
    if(ovs.includes('fire'))ov.classList.add('ov-fire');
    if(ovs.includes('blood'))ov.classList.add('ov-blood');
    if(ovs.includes('magic'))ov.classList.add('ov-magic');
    if(ovs.includes('darkness'))ov.classList.add('ov-darkness');
    if(ovs.includes('waves'))ov.classList.add('ov-waves-css');
    ol.appendChild(ov);
    const newFX=new Set(ovs.filter(x=>CANVAS_FX.includes(x)));
    if(newFX.has('rain')&&!activeEffects.has('rain'))initRain();
    if(newFX.has('snow')&&!activeEffects.has('snow'))initSnow();
    if(newFX.has('thunder')&&!activeEffects.has('thunder'))initThunder();
    if(newFX.has('wind')&&!activeEffects.has('wind'))initWind();
    if(newFX.has('magic')&&!activeEffects.has('magic'))initMagic();
    const newSnd=new Set(ovs.filter(x=>SOUND_FX.includes(x)));
    SOUND_FX.forEach(id=>{if(newSnd.has(id)&&!audioNodes[id])startAmb(id);if(!newSnd.has(id)&&audioNodes[id])stopAmb(id);});
    if(ovs.includes('fire')&&!audioNodes.fire)startAmb('fire');
    if(!ovs.includes('fire')&&audioNodes.fire)stopAmb('fire');
    activeEffects=newFX;
  }
  if(d.type==='lightning-flash'){
    // Fire the visual thunder strike regardless of whether the thunder
    // overlay is currently active — the soundboard uses this to sync
    // flashes to its own thunder track.
    const intensity=typeof d.intensity==='number'?d.intensity:0.8;
    const bolts=intensity>1?2:1;
    for(let b=0;b<bolts;b++)setTimeout(()=>createLightningBolt(),b*60);
    triggerFlash(intensity);
  }
  if(d.type==='fullscreen'&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();
  if(d.type==='turn-order'){
    const bar=document.getElementById('turn-order-bar');
    if(!d.visible||!d.combatants||!d.combatants.length){bar.classList.remove('visible');return;}
    bar.innerHTML='';
    bar.classList.add('visible');
    const rb=document.createElement('div');rb.className='to-round-badge';
    rb.innerHTML='<div class="to-round-label">Round</div><div class="to-round-num">'+d.round+'</div>';
    bar.appendChild(rb);
    d.combatants.forEach((c,i)=>{
      const sep=document.createElement('div');sep.className='to-sep';bar.appendChild(sep);
      const isActive=i===d.currentIdx;
      const isUpcoming=d.currentIdx>=0&&i===(d.currentIdx+1)%d.combatants.length&&d.combatants.length>1;
      const fighter=document.createElement('div');fighter.className='to-fighter'+(isActive?' active':isUpcoming?' upcoming':'');
      if(isActive){const pip=document.createElement('div');pip.className='to-pip';fighter.appendChild(pip);}
      const portrait=document.createElement('div');portrait.className='to-portrait';portrait.textContent=c.name.charAt(0).toUpperCase();
      const badge=document.createElement('div');badge.className='to-init-badge';badge.textContent=c.init;
      portrait.appendChild(badge);
      const name=document.createElement('div');name.className='to-fighter-name';name.textContent=c.name;
      fighter.appendChild(portrait);fighter.appendChild(name);
      bar.appendChild(fighter);
    });
    setTimeout(()=>{const a=bar.querySelector('.to-fighter.active');if(a)a.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});},60);
  }
});
</\u0073cript></body></html>`;
}
