import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCollection, fsAdd, fsSet, fsDelete } from '../../hooks/useFirestore'
import { SCENES } from '../../data/dnd5e'
import styles from '../../styles/dm.module.css'
import SceneGrid from './SceneGrid'
import OverlayPanel from './OverlayPanel'
import InitiativeTracker from './InitiativeTracker'
import MonsterDock from './MonsterDock'
import MonsterBrowser from './MonsterBrowser'

// Screen HTML builder (mirroring original display.js approach)
function buildScreenHTML() {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Écran DnD</title>
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
.ov-darkness{background:rgba(0,0,0,.55)!important}
.ov-magic{animation:magicPulse 4s ease-in-out infinite}
@keyframes fogDrift{from{background:radial-gradient(ellipse at 20% 50%,rgba(120,130,150,.3) 0%,transparent 55%),radial-gradient(ellipse at 80% 50%,rgba(100,110,130,.2) 0%,transparent 45%)}to{background:radial-gradient(ellipse at 80% 50%,rgba(120,130,150,.3) 0%,transparent 55%),radial-gradient(ellipse at 20% 50%,rgba(100,110,130,.2) 0%,transparent 45%)}}
@keyframes fireFlicker{from{background:radial-gradient(ellipse at 50% 110%,rgba(255,90,0,.25) 0%,rgba(180,40,0,.1) 40%,transparent 65%)}to{background:radial-gradient(ellipse at 50% 110%,rgba(255,120,0,.35) 0%,rgba(200,60,0,.15) 40%,transparent 70%)}}
@keyframes magicPulse{0%,100%{background:radial-gradient(ellipse at 50% 50%,rgba(120,0,200,.15) 0%,transparent 60%)}50%{background:radial-gradient(ellipse at 50% 50%,rgba(60,0,200,.25) 0%,rgba(200,0,180,.1) 50%,transparent 70%)}}
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
let W,H,activeEffects=new Set(),masterVol=0.5,audioUnlocked=false,currentFit='cover';
const effectVol={rain:.6,snow:.6,thunder:.6,fire:.6,wind:.6,magic:.6};
let rainDrops=[],snowFlakes=[],lightningBolts=[],thunderTimer=0,nextThunder=150;
let animFrame=null;
function resize(){W=cvs.width=innerWidth;H=cvs.height=innerHeight;}
resize();window.addEventListener('resize',resize);
let audioCtx=null;
function getAC(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}
function unlockAudio(){getAC();audioUnlocked=true;document.getElementById('audio-gate').classList.add('hidden');}
// Rain
function initRain(){rainDrops=[];for(let i=0;i<500;i++)rainDrops.push({x:Math.random()*W*1.2,y:Math.random()*H,len:Math.random()*25+12,speed:Math.random()*12+14,opacity:Math.random()*.4+.2,width:Math.random()*1.5+.5,wind:Math.random()*2+1});}
function drawRain(){rainDrops.forEach(d=>{ctx.strokeStyle='rgba(174,194,224,'+d.opacity+')';ctx.lineWidth=d.width;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.wind*2,d.y+d.len);ctx.stroke();d.y+=d.speed;d.x-=d.wind;if(d.y>H){d.y=Math.random()*-100;d.x=Math.random()*(W+300);}});}
// Snow
function initSnow(){snowFlakes=[];for(let i=0;i<250;i++)snowFlakes.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*3.5+1,speed:Math.random()*1.8+.4,dx:Math.random()*1.2-.6,wobble:Math.random()*Math.PI*2,wobbleSpeed:Math.random()*.02+.005,opacity:Math.random()*.5+.4});}
function drawSnow(){snowFlakes.forEach(f=>{f.wobble+=f.wobbleSpeed;ctx.fillStyle='rgba(235,240,255,'+f.opacity+')';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();f.y+=f.speed;f.x+=f.dx+Math.sin(f.wobble)*0.6;if(f.y>H+5){f.y=-f.r*2;f.x=Math.random()*W;}if(f.x<-10)f.x=W+10;if(f.x>W+10)f.x=-10;});}
// Thunder
function initThunder(){nextThunder=Math.random()*250+100;thunderTimer=0;lightningBolts=[];}
function drawThunder(){
  thunderTimer++;
  if(thunderTimer>=nextThunder){
    thunderTimer=0;nextThunder=Math.random()*250+100;
    const x=Math.random()*W;
    flash.style.opacity='0.7';setTimeout(()=>flash.style.opacity='0',120);
    lightningBolts.push({x,life:30,segments:genLightning(x,0)});
  }
  lightningBolts=lightningBolts.filter(b=>{
    b.life--;
    ctx.strokeStyle='rgba(200,210,255,'+Math.min(1,b.life/15)+')';
    ctx.lineWidth=2;ctx.beginPath();
    b.segments.forEach((s,i)=>{if(i===0)ctx.moveTo(s.x,s.y);else ctx.lineTo(s.x,s.y);});
    ctx.stroke();
    return b.life>0;
  });
}
function genLightning(x,y){const segs=[{x,y}];let cx=x,cy=y;while(cy<H){cy+=Math.random()*60+20;cx+=Math.random()*60-30;segs.push({x:cx,y:cy});}return segs;}
// Fire
function drawFire(){
  const grad=ctx.createLinearGradient(0,H,0,H*0.5);
  grad.addColorStop(0,'rgba(255,90,0,0.3)');
  grad.addColorStop(0.5,'rgba(200,60,0,0.1)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grad;
  ctx.fillRect(0,H*0.5,W,H*0.5);
}
// Magic
let magicT=0;
function drawMagic(){
  magicT+=0.02;
  const r=Math.sin(magicT)*50+150;
  const grad=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,r);
  grad.addColorStop(0,'rgba(120,0,200,0.15)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
}
// Main loop
function loop(){
  animFrame=requestAnimationFrame(loop);
  ctx.clearRect(0,0,W,H);
  if(activeEffects.has('rain'))drawRain();
  if(activeEffects.has('snow'))drawSnow();
  if(activeEffects.has('thunder'))drawThunder();
  if(activeEffects.has('fire'))drawFire();
  if(activeEffects.has('magic'))drawMagic();
}
loop();
// Overlay divs
function applyOverlays(overlays){
  ol.innerHTML='';
  overlays.forEach(id=>{
    const div=document.createElement('div');
    div.style.cssText='position:absolute;inset:0;';
    if(id==='vignette')div.style.boxShadow='inset 0 0 150px 60px rgba(0,0,0,.8)';
    else if(id==='fog'){div.className='ov-fog';div.style.background='radial-gradient(ellipse at 50% 50%,rgba(120,130,150,.3) 0%,transparent 55%)';}
    else if(id==='fire'){div.className='ov-fire';}
    else if(id==='darkness')div.style.background='rgba(0,0,0,.55)';
    else if(id==='magic'){div.className='ov-magic';}
    ol.appendChild(div);
  });
}
// postMessage handler
window.addEventListener('message',e=>{
  const d=e.data;
  if(!d||!d.type)return;
  if(d.type==='scene'){
    idle.style.display='none';
    if(d.color){bg.style.background=d.color;iw.style.opacity='0';}
    if(d.src){
      iw.className='cover';
      if(d.isVideo){mi.style.display='none';mv.style.display='';mv.src=d.src;mv.play().catch(()=>{});}
      else{mv.style.display='none';mv.src='';mi.style.display='';mi.src=d.src;}
      iw.style.opacity='1';
    }
    if(!d.src){iw.style.opacity='0';}
  }
  if(d.type==='overlays'){
    const canvas=['rain','snow','thunder','fire','magic'];
    const overlay=['vignette','fog','darkness'];
    activeEffects.clear();
    (d.active||[]).forEach(id=>{if(canvas.includes(id))activeEffects.add(id);});
    if(activeEffects.has('rain')&&!rainDrops.length)initRain();
    if(activeEffects.has('snow')&&!snowFlakes.length)initSnow();
    if(activeEffects.has('thunder'))initThunder();
    applyOverlays((d.active||[]).filter(id=>overlay.includes(id)));
  }
  if(d.type==='fit'){iw.className=d.fit||'cover';}
  if(d.type==='black'){bg.style.background='#000';iw.style.opacity='0';}
  if(d.type==='fullscreen'){document.documentElement.requestFullscreen?.();}
});
</script></body></html>`
}

export default function DMScreen() {
  const { user } = useAuth()
  const [secondWindow, setSecondWindow] = useState(null)
  const [currentScene, setCurrentScene] = useState(null)
  const [activeOverlays, setActiveOverlays] = useState(new Set())
  const [currentFit, setCurrentFit] = useState('cover')
  const [masterVolume, setMasterVolume] = useState(50)
  const [monsterBrowserOpen, setMonsterBrowserOpen] = useState(false)
  const [customSounds, setCustomSounds] = useState([])
  const soundsPath = user ? `users/${user.uid}/scenes` : null

  // Custom scenes from Firestore
  const { docs: customScenes } = useCollection(user ? `users/${user.uid}/scenes` : null)
  const { docs: firestoreMonsters } = useCollection(user ? `users/${user.uid}/monsters` : null)

  const winRef = useRef(null)

  function openSecondScreen() {
    if (winRef.current && !winRef.current.closed) {
      winRef.current.close()
      winRef.current = null
      setSecondWindow(null)
      return
    }
    const blob = new Blob([buildScreenHTML()], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, 'DnDScreen', 'width=1280,height=720,menubar=no,toolbar=no,location=no')
    if (!win) { alert('Autorisez les popups !'); return }
    winRef.current = win
    setSecondWindow(win)
    win.onload = () => {
      URL.revokeObjectURL(url)
      if (currentScene) sendScene(currentScene, win)
      sendOverlays(activeOverlays, win)
    }
    const t = setInterval(() => {
      if (win.closed) { clearInterval(t); winRef.current = null; setSecondWindow(null) }
    }, 800)
  }

  const send = useCallback((msg, win) => {
    const w = win || winRef.current
    if (w && !w.closed) w.postMessage(msg, '*')
  }, [])

  const sendScene = useCallback((scene, win) => {
    if (!scene) return
    send({ type: 'scene', color: scene.bg, src: scene.src || null, isVideo: !!scene.isVideo }, win)
  }, [send])

  const sendOverlays = useCallback((overlays, win) => {
    send({ type: 'overlays', active: [...overlays] }, win)
  }, [send])

  function selectScene(scene) {
    setCurrentScene(scene)
    sendScene(scene)
  }

  function toggleOverlay(id) {
    setActiveOverlays(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      sendOverlays(next)
      return next
    })
  }

  function clearOverlays() {
    setActiveOverlays(new Set())
    sendOverlays(new Set())
  }

  function setFit(fit) {
    setCurrentFit(fit)
    send({ type: 'fit', fit })
  }

  function blackScreen() {
    setCurrentScene(null)
    send({ type: 'black' })
  }

  function requestFullscreen() {
    send({ type: 'fullscreen' })
  }

  async function handleUpload(e) {
    const files = [...e.target.files]
    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      const reader = new FileReader()
      reader.onload = async ev => {
        const scene = {
          id: Date.now() + Math.random(),
          name: file.name.replace(/\.[^.]+$/, ''),
          src: ev.target.result,
          isVideo,
          emoji: isVideo ? '🎬' : '🖼️',
          tag: 'Import',
          bg: '#1a1410',
        }
        if (user) {
          await fsAdd(`users/${user.uid}/scenes`, scene)
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  async function deleteCustomScene(id) {
    if (!user) return
    await fsDelete(`users/${user.uid}/scenes`, id)
    if (currentScene?.id === id) setCurrentScene(null)
  }

  // Custom sounds
  function addCustomSound(e) {
    const files = [...e.target.files]
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setCustomSounds(prev => [...prev, { id: Date.now(), name: file.name, src: ev.target.result }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function playCustomSound(src) {
    try {
      const audio = new Audio(src)
      audio.volume = masterVolume / 100
      audio.play()
    } catch (e) {}
  }

  const screenOnline = secondWindow && !secondWindow.closed

  return (
    <div className={styles.dmLayout}>

      {/* LEFT SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>⚔ DM Screen</span>
          <Link to="/" className={styles.backBtn}>← Accueil</Link>
        </div>

        <div className={styles.sidebarScroll}>

          {/* Second screen */}
          <div className={styles.sectionLabel}>Écran secondaire</div>
          <button
            className={`${styles.launchBtn}${screenOnline ? ' ' + styles.active : ''}`}
            onClick={openSecondScreen}
          >
            <span className={`${styles.statusDot}${screenOnline ? ' ' + styles.online : ''}`} />
            <span>{screenOnline ? '✓ Écran 2 ouvert' : '🖥️ Ouvrir l\'écran 2'}</span>
          </button>
          <div className={styles.infoBox}>
            <strong>Comment faire :</strong><br />
            1. Ouvre l'écran 2<br />
            2. Glisse sur l'écran secondaire<br />
            3. F11 plein écran<br />
            4. Clique une scène !
          </div>

          {/* Fit */}
          <div className={styles.sectionLabel}>Affichage</div>
          <div className={styles.fitBtns}>
            {[
              { id: 'contain', label: '⬜ Contenir' },
              { id: 'cover', label: '⬛ Remplir' },
              { id: 'stretch', label: '↔ Étirer' },
              { id: 'center', label: '· Centrer' },
            ].map(f => (
              <button
                key={f.id}
                className={`${styles.fitBtn}${currentFit === f.id ? ' ' + styles.active : ''}`}
                onClick={() => setFit(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Overlays */}
          <OverlayPanel
            activeOverlays={activeOverlays}
            onToggle={toggleOverlay}
            onClear={clearOverlays}
            masterVolume={masterVolume}
            onMasterVolume={setMasterVolume}
            styles={styles}
          />

          {/* Soundboard */}
          <div className={styles.sectionLabel}>🎲 Soundboard</div>
          <div className={styles.sbGrid}>
            <button className={`${styles.sbBtn} ${styles.thunder}`} onClick={() => playSound('thunder', masterVolume)} title="Tonnerre">
              <span className={styles.sbIcon}>⚡</span><span>Tonnerre</span>
            </button>
          </div>
          <div className={styles.customSbGrid}>
            {customSounds.map(s => (
              <div key={s.id} className={styles.customSbItem}>
                <button className={styles.customSbPlayBtn} onClick={() => playCustomSound(s.src)}>▶</button>
                <span className={styles.customSbName}>{s.name}</span>
                <button style={{ background: 'none', border: 'none', color: '#7a6a55', cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => setCustomSounds(prev => prev.filter(x => x.id !== s.id))}>×</button>
              </div>
            ))}
          </div>
          <button className={styles.sbImportBtn} onClick={() => document.getElementById('sbInput').click()}>
            ＋ Importer un son
          </button>
          <input id="sbInput" type="file" accept="audio/*" multiple style={{ display: 'none' }} onChange={addCustomSound} />

          {/* Upload */}
          <div className={styles.sectionLabel}>Importer (image / vidéo)</div>
          <div className={styles.uploadZone}>
            <input type="file" accept="image/*,video/mp4,video/webm" multiple onChange={handleUpload} />
            <div className={styles.uploadIcon}>🗺️</div>
            <div className={styles.uploadText}>Images, battlemaps, .mp4, .webm…<br />Clic ou glisser-déposer</div>
          </div>

        </div>
      </aside>

      {/* MAIN AREA */}
      <main className={styles.mainArea}>
        {/* Now playing */}
        <div className={styles.nowPlaying}>
          <div className={styles.npThumb}>
            <div
              className={styles.npThumbInner}
              style={currentScene?.src
                ? { backgroundImage: `url(${currentScene.src})` }
                : { background: currentScene?.bg || '' }
              }
            />
          </div>
          <div className={styles.npInfo}>
            <div className={styles.npLabel}>Affiché sur l'écran 2</div>
            <div className={`${styles.npName}${!currentScene ? ' ' + styles.npNone : ''}`}>
              {currentScene?.name || 'Aucune scène sélectionnée'}
            </div>
          </div>
          <div className={styles.btnRow}>
            <button className={styles.actionBtn} onClick={requestFullscreen}>⛶ Plein écran</button>
            <button className={styles.actionBtn} onClick={blackScreen}>■ Noir</button>
          </div>
        </div>

        {/* Scene grid */}
        <div className={styles.scenesArea}>
          <SceneGrid
            scenes={SCENES}
            customScenes={customScenes}
            currentScene={currentScene}
            onSelect={selectScene}
            onDeleteCustom={deleteCustomScene}
            styles={styles}
          />
        </div>
      </main>

      {/* RIGHT PANEL */}
      <section className={styles.rightPanel}>
        <InitiativeTracker styles={styles} />
        <MonsterDock
          firestoreMonsters={firestoreMonsters}
          user={user}
          onOpenBrowser={() => setMonsterBrowserOpen(true)}
          styles={styles}
        />
      </section>

      {/* Monster Browser Modal */}
      {monsterBrowserOpen && (
        <MonsterBrowser
          user={user}
          onClose={() => setMonsterBrowserOpen(false)}
          styles={styles}
        />
      )}

    </div>
  )
}

function playSound(type, volume) {
  // Simple synthesized sound using Web Audio API
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (type === 'thunder') {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.5))
      }
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()
      gain.gain.value = volume / 100
      source.buffer = buffer
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start()
    }
  } catch (e) {}
}
