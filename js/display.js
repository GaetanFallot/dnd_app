let secondWindow=null,currentScene=null,customScenes=[],activeOverlays=new Set(),currentFit='cover',masterVolume=0.5,stormMode=false;

function setMasterVolume(v){masterVolume=v/100;if(secondWindow&&!secondWindow.closed)secondWindow.postMessage({type:'master-volume',volume:masterVolume},'*');}
function setEffectVolume(id,v,el){
  effectVolumes[id]=v/100;
  const pct=el.parentElement.querySelector('.ov-pct');if(pct)pct.textContent=v+'%';
  if(secondWindow&&!secondWindow.closed) secondWindow.postMessage({type:'effect-volume',id,volume:v/100},'*');
}
function toggleStormMode(){
  stormMode=!stormMode;document.getElementById('stormBtn').classList.toggle('active',stormMode);
  if(stormMode){
    ['rain','thunder','wind','darkness'].forEach(id=>{
      if(!activeOverlays.has(id)){activeOverlays.add(id);document.getElementById('ov-'+id).classList.add('active');showSlider(id);}
    });
    effectVolumes.rain=1;effectVolumes.thunder=1;effectVolumes.wind=0.8;
    updateSliderUI('rain',100);updateSliderUI('thunder',100);updateSliderUI('wind',80);
  }
  sendOverlays();
  if(secondWindow&&!secondWindow.closed)secondWindow.postMessage({type:'storm-mode',active:stormMode},'*');
  showToast(stormMode?'⛈️ TEMPÊTE ++ ACTIVÉE':'Tempête désactivée');
}
function updateSliderUI(id,val){
  const row=document.getElementById('vol-row-'+id);if(!row)return;
  const sl=row.querySelector('input'),pct=row.querySelector('.ov-pct');
  if(sl)sl.value=val;if(pct)pct.textContent=val+'%';
  if(secondWindow&&!secondWindow.closed)secondWindow.postMessage({type:'effect-volume',id,volume:val/100},'*');
}
function showSlider(id){const r=document.getElementById('vol-row-'+id);if(r)r.classList.add('visible');}
function hideSlider(id){const r=document.getElementById('vol-row-'+id);if(r)r.classList.remove('visible');}

function renderScenes(){const g=document.getElementById('sceneGrid');g.innerHTML='';SCENES.forEach(s=>g.appendChild(buildCard(s,false)));}
function renderCustomScenes(){const g=document.getElementById('customGrid'),sec=document.getElementById('customSection');if(!customScenes.length){sec.style.display='none';return;}sec.style.display='';g.innerHTML='';customScenes.forEach(s=>g.appendChild(buildCard(s,true)));}
function buildCard(scene,isCustom){
  const card=document.createElement('div');card.className='scene-card'+(currentScene?.id===scene.id?' active':'');card.onclick=()=>selectScene(scene);
  const bg=document.createElement('div');bg.className='scene-bg';
  if(scene.src){bg.style.backgroundImage=`url(${scene.src})`;bg.style.backgroundSize='cover';}
  else{bg.style.background=scene.bg;if(scene.overlay){const ov=document.createElement('div');ov.style.cssText=`position:absolute;inset:0;background:${scene.overlay};`;card.appendChild(ov);}}
  const emoji=document.createElement('div');emoji.className='scene-emoji';emoji.textContent=scene.emoji||'🖼️';
  const grad=document.createElement('div');grad.className='scene-grad';
  const info=document.createElement('div');info.className='scene-info';info.innerHTML=`<div class="scene-name">${scene.name}</div><div class="scene-tag">${scene.tag||''}</div>`;
  const check=document.createElement('div');check.className='check-mark';check.textContent='✓';
  card.appendChild(bg);card.appendChild(emoji);card.appendChild(grad);card.appendChild(info);card.appendChild(check);
  if(isCustom){
    const del=document.createElement('button');del.className='delete-btn';del.textContent='✕';del.onclick=e=>{e.stopPropagation();_idbDeleteScene(scene.id);customScenes=customScenes.filter(s=>s.id!==scene.id);if(currentScene?.id===scene.id){currentScene=null;updateNP(null);}renderCustomScenes();};card.appendChild(del);
    const edit=document.createElement('button');edit.className='edit-btn';edit.textContent='✎';edit.onclick=e=>{e.stopPropagation();_editCustomScene(scene,card);};card.appendChild(edit);
  }
  return card;
}
function selectScene(scene){currentScene=scene;renderScenes();renderCustomScenes();updateNP(scene);sendScene(scene);showVidAudioRow(!!scene?.isVideo);}
function updateNP(scene){
  const name=document.getElementById('npName'),thumb=document.getElementById('npThumb');
  if(!scene){name.textContent='Aucune scène sélectionnée';name.className='np-name np-none';thumb.style.backgroundImage='';thumb.style.background='';return;}
  name.textContent=scene.name;name.className='np-name';
  if(scene.src){thumb.style.backgroundImage=`url(${scene.src})`;thumb.style.background='';}
  else{thumb.style.backgroundImage='';thumb.style.background=scene.bg;}
}

function toggleSecondScreen(){if(secondWindow&&!secondWindow.closed){secondWindow.close();secondWindow=null;updateBtn(false);}else openSecondScreen();}
function openSecondScreen(){
  const blob=new Blob([buildScreenHTML()],{type:'text/html'});const url=URL.createObjectURL(blob);
  secondWindow=window.open(url,'DnDScreen','width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
  if(!secondWindow){showToast('⚠️ Autorisez les popups !');return;}
  updateBtn(true);
  secondWindow.onload=()=>{
    URL.revokeObjectURL(url);
    // Send thunder sounds to second screen
    secondWindow.postMessage({type:'thunder-sounds',sounds:THUNDER_SOUNDS},'*');
    secondWindow.postMessage({type:'sb-real-thunder',data:_SB_THUNDER_DATA},'*');
    secondWindow.postMessage({type:'sb-real-sword',data:_SB_SWORD_DATA},'*');
    secondWindow.postMessage({type:'sb-real-fireball',data:_SB_FIREBALL_DATA},'*');
    if(currentScene)sendScene(currentScene);sendOverlays();
    secondWindow.postMessage({type:'master-volume',volume:masterVolume},'*');
    Object.entries(effectVolumes).forEach(([id,vol])=>secondWindow.postMessage({type:'effect-volume',id,volume:vol},'*'));
    if(stormMode)secondWindow.postMessage({type:'storm-mode',active:true},'*');
    if(vidAudioOn)secondWindow.postMessage({type:'vid-audio',muted:false,volume:effectVolumes.vidaudio||0.6},'*');
    showToast('✓ Écran 2 ouvert');
  };
  const t=setInterval(()=>{if(secondWindow?.closed){clearInterval(t);secondWindow=null;updateBtn(false);}},800);
}

function buildScreenHTML(){
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Écran DnD</title>
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
</style></head><body>
<div id="audio-gate" onclick="unlockAudio()"><div class="ag-icon">🔊</div><div class="ag-text">Cliquer pour activer le son</div></div>
<div id="bg"></div>
<div id="img-wrap"><img id="mi" src="" alt="" style="display:none"/><video id="mv" src="" muted loop playsinline style="display:none"></video></div>
<canvas id="fx-canvas"></canvas>
<div id="overlay-layer"></div>
<div id="lightning-flash"></div>
<div id="idle"><div id="idle-t">⚔ En attente ⚔</div><div id="idle-s">DM Screen Controller</div></div>
<script>
const bg=document.getElementById('bg'),iw=document.getElementById('img-wrap'),
  mi=document.getElementById('mi'),mv=document.getElementById('mv'),
  idle=document.getElementById('idle'),ol=document.getElementById('overlay-layer'),
  flash=document.getElementById('lightning-flash'),
  cvs=document.getElementById('fx-canvas'),ctx=cvs.getContext('2d');

let W,H,activeEffects=new Set(),masterVol=0.5,stormActive=false,audioUnlocked=false;
const effectVol={rain:.6,snow:.6,thunder:.6,fire:.6,waves:.6,wind:.6,magic:.6};

// Thunder: raw base64 data + decoded AudioBuffers
let thunderDataUrls=null;
let thunderBuffers={};

function resize(){W=cvs.width=innerWidth;H=cvs.height=innerHeight;}
resize();window.addEventListener('resize',resize);

// ═══ AUDIO CONTEXT ═══
let audioCtx=null;const audioNodes={};
function getAC(){
  if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  return audioCtx;
}

function unlockAudio(){
  const ac=getAC();
  // Play a silent buffer to fully unlock audio
  const buf=ac.createBuffer(1,1,ac.sampleRate);
  const src=ac.createBufferSource();src.buffer=buf;src.connect(ac.destination);src.start();
  audioUnlocked=true;
  document.getElementById('audio-gate').classList.add('hidden');
  // Decode any pending thunder sounds
  if(thunderDataUrls)decodeThunderSounds();
  console.log('Audio unlocked!');
}

// Decode base64 MP3 -> AudioBuffer via Web Audio API
async function decodeThunderSounds(){
  if(!thunderDataUrls||!audioCtx)return;
  const ac=getAC();
  for(const [key,dataUrl] of Object.entries(thunderDataUrls)){
    try{
      const resp=await fetch(dataUrl);
      const arrayBuf=await resp.arrayBuffer();
      const audioBuf=await ac.decodeAudioData(arrayBuf);
      thunderBuffers[key]=audioBuf;
      console.log('Decoded thunder:',key,'duration:',audioBuf.duration.toFixed(1)+'s');
    }catch(err){console.warn('Failed to decode',key,err);}
  }
  console.log('Thunder buffers ready:',Object.keys(thunderBuffers).length);
  // Decode real thunder WAV if pending
  if(window._pendingRealThunder){
    const data=window._pendingRealThunder; window._pendingRealThunder=null;
    fetch(data).then(r=>r.arrayBuffer()).then(arr=>audioCtx.decodeAudioData(arr)).then(buf=>{
      thunderBuffers['__real_thunder__']=buf;
      console.log('Real thunder buffer ready (deferred)');
    }).catch(e=>console.warn(e));
  }
  // Decode other real buffers if pending
  if(window._sbRealSwordData){ _decodeRealBuf('sword',window._sbRealSwordData); window._sbRealSwordData=null; }
  if(window._sbRealFireballData){ _decodeRealBuf('fireball',window._sbRealFireballData); window._sbRealFireballData=null; }
}

// ═══ RAIN ═══
let rainDrops=[];
function initRain(){const c=stormActive?800:500;rainDrops=[];for(let i=0;i<c;i++)rainDrops.push({x:Math.random()*W*1.2,y:Math.random()*H,len:Math.random()*(stormActive?35:25)+12,speed:Math.random()*(stormActive?20:12)+14,opacity:Math.random()*.4+.2,width:Math.random()*1.5+.5,wind:stormActive?(Math.random()*6+4):(Math.random()*2+1)});}
function drawRain(){rainDrops.forEach(d=>{ctx.strokeStyle='rgba(174,194,224,'+d.opacity+')';ctx.lineWidth=d.width;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.wind*2,d.y+d.len);ctx.stroke();if(d.y>H-5){ctx.fillStyle='rgba(174,194,224,'+(d.opacity*.4)+')';ctx.beginPath();ctx.arc(d.x,H-2,Math.random()*2.5+.5,0,Math.PI);ctx.fill();}d.y+=d.speed;d.x-=d.wind;if(d.y>H){d.y=Math.random()*-100;d.x=Math.random()*(W+300);}});}

// ═══ SNOW ═══
let snowFlakes=[];
function initSnow(){snowFlakes=[];for(let i=0;i<250;i++)snowFlakes.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*3.5+1,speed:Math.random()*1.8+.4,dx:Math.random()*1.2-.6,wobble:Math.random()*Math.PI*2,wobbleSpeed:Math.random()*.02+.005,opacity:Math.random()*.5+.4});}
function drawSnow(){snowFlakes.forEach(f=>{f.wobble+=f.wobbleSpeed;ctx.fillStyle='rgba(235,240,255,'+f.opacity+')';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(200,220,255,'+(f.opacity*.12)+')';ctx.beginPath();ctx.arc(f.x,f.y,f.r*2.5,0,Math.PI*2);ctx.fill();f.y+=f.speed;f.x+=f.dx+Math.sin(f.wobble)*0.6;if(f.y>H+5){f.y=-f.r*2;f.x=Math.random()*W;}if(f.x<-10)f.x=W+10;if(f.x>W+10)f.x=-10;});}

// ═══ THUNDER & LIGHTNING ═══
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

// Play thunder via Web Audio API (decoded buffers) with procedural fallback
// Helper to decode any real WAV buffer by role
const _realBufs={};
async function _decodeRealBuf(role, dataUrl){
  try{
    const ac=getAC();
    const resp=await fetch(dataUrl);
    const arr=await resp.arrayBuffer();
    _realBufs[role]=await ac.decodeAudioData(arr);
    console.log('Real buf ready:',role);
  }catch(e){console.warn('decode err',role,e);}
}

function playThunderSound(){
  if(!audioUnlocked)return;
  const ac=getAC();
  const vol=Math.min(1,masterVol*(effectVol.thunder||.6)*(stormActive?1.3:1));

  // Prefer the real thunder WAV
  if(thunderBuffers['__real_thunder__']){
    const src=ac.createBufferSource();
    src.buffer=thunderBuffers['__real_thunder__'];
    const gain=ac.createGain(); gain.gain.value=vol;
    src.connect(gain); gain.connect(ac.destination); src.start();
    return;
  }

  const bufKeys=Object.keys(thunderBuffers).filter(k=>k!=='__real_thunder__');
  if(bufKeys.length>0){
    // Pick appropriate sound
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
    console.log('Playing thunder:',key,'vol:',vol.toFixed(2));
  } else {
    // Procedural fallback
    console.log('Thunder fallback (procedural)');
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
    // Add crack
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

// ═══ AMBIENT AUDIO (procedural noise) ═══
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

// ═══ MAIN LOOP ═══
function animate(){ctx.clearRect(0,0,W,H);if(activeEffects.has('waves'))drawWaves();if(activeEffects.has('rain'))drawRain();if(activeEffects.has('snow'))drawSnow();if(activeEffects.has('thunder'))drawThunder();if(activeEffects.has('wind'))drawWind();if(activeEffects.has('magic'))drawMagic();requestAnimationFrame(animate);}
animate();

// ═══ MESSAGE HANDLER ═══
const CANVAS_FX=['rain','snow','thunder','waves','wind','magic'];
const SOUND_FX=['rain','snow','thunder','fire','wind','waves','magic'];
window.addEventListener('message',e=>{
  const d=e.data;if(!d||!d.type)return;
  if(d.type==='thunder-sounds'){
    thunderDataUrls=d.sounds;
    console.log('Received thunder data:',Object.keys(d.sounds).length,'sounds');
    if(audioUnlocked)decodeThunderSounds();
  }
  if(d.type==='sb-real-thunder'){
    const _decode = async ()=>{
      try{
        const ac=getAC();
        const resp=await fetch(d.data);
        const arr=await resp.arrayBuffer();
        thunderBuffers['__real_thunder__']=await ac.decodeAudioData(arr);
        console.log('Real thunder buffer ready');
      }catch(e){console.warn('real thunder decode err',e);}
    };
    if(audioUnlocked)_decode(); else window._pendingRealThunder=d.data;
  }
  if(d.type==='sb-real-sword'){
    window._sbRealSwordData=d.data;
    if(audioUnlocked) _decodeRealBuf('sword', d.data);
  }
  if(d.type==='sb-real-fireball'){
    window._sbRealFireballData=d.data;
    if(audioUnlocked) _decodeRealBuf('fireball', d.data);
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
  if(d.type==='fullscreen'&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();
  if(d.type==='sb-visual') triggerSbVisual(d.effect);
});

// ═══ SOUNDBOARD VISUALS (screen 2) ═══
function triggerSbVisual(effect){
  switch(effect){
    case 'lightning':       doLightningFlash(3, 220, '#e8f0ff'); break;
    case 'lightning_fast':  doLightningFlash(5, 120, '#d0e8ff'); break;
    case 'fireball':        doFireballFlash(); break;
    case 'fire_whoosh':     doColorFlash('rgba(255,80,0,0.22)', 600); break;
    case 'sword':           doSwordFlash(); break;
    case 'sword_draw':      doColorFlash('rgba(180,220,255,0.12)', 400); break;
    case 'magic':           doMagicFlash(); break;
    case 'impact':          doImpactFlash(); break;
  }
}

function doLightningFlash(strikes, totalMs, color){
  let done=0;
  const gap = totalMs / (strikes*2);
  const go = ()=>{
    if(done>=strikes) return;
    flash.style.background=color;
    flash.style.opacity=String(0.75+Math.random()*.2);
    flash.style.transition='opacity 0ms';
    // draw a jagged bolt on canvas
    drawBolt(color);
    setTimeout(()=>{
      flash.style.transition='opacity '+Math.round(gap*.8)+'ms';
      flash.style.opacity='0';
      done++;
      setTimeout(go, gap*(1+Math.random()));
    }, gap*(0.3+Math.random()*.3));
  };
  go();
}

function drawBolt(color){
  const c=document.getElementById('fx-canvas');
  const cx=c.getContext('2d');
  cx.save();
  cx.strokeStyle=color||'#c8e8ff';
  cx.lineWidth=3+Math.random()*4;
  cx.shadowColor='#a0c8ff';
  cx.shadowBlur=18;
  cx.globalAlpha=0.85;
  cx.beginPath();
  let x=W*.3+Math.random()*W*.4, y=0;
  cx.moveTo(x,y);
  while(y<H){
    x+=( Math.random()-0.5)*160;
    y+=40+Math.random()*60;
    cx.lineTo(Math.max(0,Math.min(W,x)),Math.min(H,y));
  }
  cx.stroke();
  // branch
  if(Math.random()>.4){
    const bx=x-80+Math.random()*160, by=y-180+Math.random()*100;
    cx.beginPath(); cx.moveTo(bx,by); cx.lineWidth=1.5;
    cx.lineTo(bx+(Math.random()-.5)*120, by+80+Math.random()*80);
    cx.stroke();
  }
  cx.restore();
  setTimeout(()=>{ cx.clearRect(0,0,W,H); }, 120);
}

function doFireballFlash(){
  // orange-red radial burst
  const c=document.getElementById('fx-canvas');
  const cx=c.getContext('2d');
  const x=W/2, y=H/2;
  let r=0, maxR=Math.max(W,H)*.7, alpha=1;
  const step=()=>{
    cx.clearRect(0,0,W,H);
    const g=cx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,'rgba(255,220,80,'+alpha+')');
    g.addColorStop(0.3,'rgba(255,100,0,'+alpha*.8+')');
    g.addColorStop(0.7,'rgba(180,30,0,'+alpha*.4+')');
    g.addColorStop(1,'rgba(0,0,0,0)');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    r+=maxR/18; alpha-=0.06;
    if(alpha>0) requestAnimationFrame(step); else cx.clearRect(0,0,W,H);
  };
  step();
  doColorFlash('rgba(255,60,0,0.30)', 400);
}

function doSwordFlash(){
  const c=document.getElementById('fx-canvas');
  const cx=c.getContext('2d');
  // Diagonal slash
  cx.save();
  cx.strokeStyle='rgba(200,230,255,0.9)';
  cx.lineWidth=6;
  cx.shadowColor='#a0d0ff';
  cx.shadowBlur=24;
  cx.beginPath();
  cx.moveTo(W*.15+Math.random()*W*.1, H*.1);
  cx.lineTo(W*.85-Math.random()*W*.1, H*.9);
  cx.stroke();
  cx.restore();
  doColorFlash('rgba(180,220,255,0.18)', 300);
  setTimeout(()=>cx.clearRect(0,0,W,H), 160);
}

function doMagicFlash(){
  const c=document.getElementById('fx-canvas');
  const cx=c.getContext('2d');
  let alpha=0.8, r=30;
  const x=W/2,y=H/2;
  const step=()=>{
    cx.clearRect(0,0,W,H);
    // Pulsing arcane circle
    cx.save();
    cx.strokeStyle='rgba(160,80,255,'+alpha+')';
    cx.lineWidth=3;
    cx.shadowColor='#a050ff';
    cx.shadowBlur=20;
    cx.beginPath();cx.arc(x,y,r,0,Math.PI*2);cx.stroke();
    cx.beginPath();cx.arc(x,y,r*.6,0,Math.PI*2);cx.stroke();
    cx.restore();
    // sparks
    for(let i=0;i<6;i++){
      const a=Math.random()*Math.PI*2, d=r*(.8+Math.random()*.4);
      const px=x+Math.cos(a)*d, py=y+Math.sin(a)*d;
      cx.fillStyle='rgba(200,150,255,'+alpha+')';
      cx.fillRect(px-2,py-2,4,4);
    }
    r+=18; alpha-=0.07;
    if(alpha>0) requestAnimationFrame(step); else cx.clearRect(0,0,W,H);
  };
  step();
  doColorFlash('rgba(120,40,200,0.22)', 500);
}

function doImpactFlash(){
  // Screen shake simulation + white flash
  const el=document.body;
  el.style.transition='transform 0ms';
  el.style.transform='translate(6px,4px)';
  setTimeout(()=>{el.style.transform='translate(-5px,-3px)';},60);
  setTimeout(()=>{el.style.transform='translate(3px,-2px)';},120);
  setTimeout(()=>{el.style.transform='translate(0,0)';},180);
  doColorFlash('rgba(255,200,80,0.25)', 300);
}

function doColorFlash(color, dur){
  flash.style.background=color;
  flash.style.transition='opacity 0ms';
  flash.style.opacity='1';
  setTimeout(()=>{
    flash.style.transition='opacity '+dur+'ms';
    flash.style.opacity='0';
  }, 40);
}
<\/script></body></html>`;
}

function sendScene(scene){if(!secondWindow||secondWindow.closed)return;secondWindow.postMessage({type:'scene',src:scene.src||null,bg:scene.bg||'#000',fit:currentFit,isVideo:!!scene.isVideo},'*');}
function sendOverlays(){if(!secondWindow||secondWindow.closed)return;secondWindow.postMessage({type:'overlays',overlays:[...activeOverlays]},'*');}
function setFit(fit){currentFit=fit;document.querySelectorAll('.fit-btn').forEach(b=>b.classList.remove('active'));document.getElementById('fit-'+fit).classList.add('active');if(secondWindow&&!secondWindow.closed)secondWindow.postMessage({type:'fit',fit},'*');}
function toggleOverlay(name){if(activeOverlays.has(name)){activeOverlays.delete(name);hideSlider(name);}else{activeOverlays.add(name);showSlider(name);}document.getElementById('ov-'+name).classList.toggle('active',activeOverlays.has(name));sendOverlays();}
function clearOverlays(){activeOverlays.clear();stormMode=false;document.getElementById('stormBtn').classList.remove('active');document.querySelectorAll('.ov-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.ov-slider-row').forEach(r=>r.classList.remove('visible'));sendOverlays();if(secondWindow&&!secondWindow.closed)secondWindow.postMessage({type:'storm-mode',active:false},'*');}
// ── Scene IndexedDB persistence ──
function _idbOpen(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('dm_screen',2);
    req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains('handles'))db.createObjectStore('handles');if(!db.objectStoreNames.contains('scenes'))db.createObjectStore('scenes',{keyPath:'id'});};
    req.onsuccess=e=>res(e.target.result);
    req.onerror=()=>rej(req.error);
  });
}
async function _idbSaveScene(scene){try{const db=await _idbOpen();const tx=db.transaction('scenes','readwrite');tx.objectStore('scenes').put(scene);await new Promise(r=>tx.oncomplete=r);}catch(e){console.warn('scene save error',e);}}
async function _idbDeleteScene(id){try{const db=await _idbOpen();const tx=db.transaction('scenes','readwrite');tx.objectStore('scenes').delete(id);await new Promise(r=>tx.oncomplete=r);}catch(e){console.warn('scene delete error',e);}}
async function _loadCustomScenes(){try{const db=await _idbOpen();const tx=db.transaction('scenes','readonly');const all=await new Promise((res,rej)=>{const r=tx.objectStore('scenes').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});if(all&&all.length){customScenes=all;renderCustomScenes();}}catch(e){console.warn('scene load error',e);}}

function _editCustomScene(scene,card){
  const nameEl=card.querySelector('.scene-name');
  const oldName=scene.name;
  const input=document.createElement('input');
  input.value=oldName;
  input.style.cssText='background:rgba(0,0,0,.75);border:1px solid var(--gold);color:#fff;font-family:Cinzel,serif;font-size:.68rem;width:100%;padding:1px 4px;outline:none;';
  nameEl.replaceWith(input);
  input.focus();input.select();
  const save=()=>{const v=input.value.trim()||oldName;scene.name=v;_idbSaveScene(scene);renderCustomScenes();if(currentScene?.id===scene.id)document.getElementById('npName').textContent=v;};
  input.addEventListener('blur',save);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}if(e.key==='Escape'){scene.name=oldName;renderCustomScenes();}});
}
function toggleCollapse(section){
  const body=document.getElementById(section+'Body');
  const arrow=document.getElementById(section+'-arrow');
  if(!body)return;
  const isCollapsed=body.style.display==='none';
  body.style.display=isCollapsed?'':'none';
  if(arrow)arrow.style.transform=isCollapsed?'':'rotate(-90deg)';
}
function handleUpload(event){const files=event.target.files;if(!files.length)return;Array.from(files).forEach(file=>{const isVideo=file.type.startsWith('video/');const reader=new FileReader();reader.onload=e=>{const scene={id:'custom_'+Date.now()+'_'+Math.random(),name:file.name.replace(/\.[^.]+$/,'').replace(/[_\-]/g,' '),tag:isVideo?'Vidéo importée':'Image personnalisée',src:e.target.result,emoji:isVideo?'🎬':'🗺️',isVideo};customScenes.push(scene);_idbSaveScene(scene);renderCustomScenes();showToast('✓ '+scene.name+' ajouté'+(isVideo?'e':''));};reader.readAsDataURL(file);});event.target.value='';}
function updateBtn(on){document.getElementById('launchBtn').classList.toggle('active',on);document.getElementById('statusDot').classList.toggle('on',on);document.getElementById('launchText').textContent=on?'🖥️ Fermer l\'écran 2':'🖥️ Ouvrir l\'écran 2';}
function requestFullscreen(){if(secondWindow&&!secondWindow.closed){secondWindow.postMessage({type:'fullscreen'},'*');showToast('Plein écran…');}else showToast('⚠️ L\'écran 2 n\'est pas ouvert');}
function blackScreen(){if(secondWindow&&!secondWindow.closed){secondWindow.postMessage({type:'black'},'*');showToast('Écran mis au noir');}else showToast('⚠️ L\'écran 2 n\'est pas ouvert');}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}
const zone=document.getElementById('uploadZone');
zone.addEventListener('dragover',e=>{e.preventDefault();zone.style.borderColor='var(--gold)';});
zone.addEventListener('dragleave',()=>{zone.style.borderColor='';});
zone.addEventListener('drop',e=>{e.preventDefault();zone.style.borderColor='';if(e.dataTransfer.files.length)handleUpload({target:{files:e.dataTransfer.files,value:''}});});
renderScenes();
_loadCustomScenes();

// ═══ INITIATIVE TRACKER ═══