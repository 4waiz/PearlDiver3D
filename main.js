
// Heritage Pearl Quest 3D — Built with Three.js (via CDN).
// Professional single-file ES module with scenes, story, and adventure.

import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/PointerLockControls.js';

// -------------------- UI Elements --------------------
const hud = q('#hud');
const timeEl=q('#time'), oxyEl=q('#oxygen'), scoreEl=q('#score'), multEl=q('#mult'), carriedEl=q('#carried');
const menu=q('#menu'), pause=q('#pause'), how=q('#how'), settings=q('#settings'), board=q('#board'), credits=q('#credits'), prompt=q('#prompt'), over=q('#over');
const btn = (sel, fn)=> q(sel).addEventListener('click', fn);
btn('#btnAdventure', startAdventure);
btn('#btnStory', startStory);
btn('#btnHow', ()=> showPanel(how));
btn('#btnSettings', ()=> showPanel(settings));
btn('#btnLeaderboard', ()=> {populateLeaders(); showPanel(board);});
btn('#btnCredits', ()=> showPanel(credits));
btn('#resumeBtn', resumeGame);
btn('#restartBtn', ()=>{ if(state.mode==='story') beginStoryChapter(state.chapterIndex,true); else startAdventure(); });
btn('#menuBtn', ()=> showPanel(menu));
$$('.back').forEach(b=> b.addEventListener('click', ()=> showPanel(menu)));
btn('#again', startAdventure);
btn('#saveBtn', saveScore);
btn('#muteBtn', ()=> toggleMute());
btn('#hqBtn', ()=> { state.hq = !state.hq; });
q('#sens').addEventListener('input', e=> state.sens = parseFloat(e.target.value));

// -------------------- Helpers --------------------
function q(s){ return document.querySelector(s); }
function $$(s){ return document.querySelectorAll(s); }
function showPanel(p){ [menu,pause,how,settings,board,credits,over,prompt].forEach(x=> x.classList.add('hidden')); p.classList.remove('hidden'); hud.classList.add('hidden'); controls.unlock(); state.running=false; }
function hidePanels(){ [menu,pause,how,settings,board,credits,over,prompt].forEach(x=> x.classList.add('hidden')); hud.classList.remove('hidden'); }

// -------------------- Audio --------------------
const actx = new (window.AudioContext || window.webkitAudioContext)();
let master = actx.createGain(); master.connect(actx.destination); master.gain.value = 0.7;
let muted=false;
function tone(f=440,d=0.14,type='sine',vol=0.4){
  const t0=actx.currentTime; const o=actx.createOscillator(); o.type=type; o.frequency.value=f;
  const g=actx.createGain(); g.gain.value=0; o.connect(g); g.connect(master); o.start();
  g.gain.linearRampToValueAtTime(vol, t0+0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0+d); o.stop(t0+d);
}
function collectSfx(){ tone(900,0.12,'sine',0.5); tone(1350,0.12,'sine',0.25); }
function uiSfx(){ tone(660,0.09,'square',0.25); }
function completeSfx(){ tone(523,0.2,'triangle',0.4); tone(659,0.25,'triangle',0.35); tone(784,0.3,'triangle',0.3); }
function stingSfx(){ tone(190,0.3,'sawtooth',0.6); }
function ambientStart(){ if(state.amb) state.amb.stop(); const o=actx.createOscillator(); o.type='sine'; o.frequency.value=110; const g=actx.createGain(); g.gain.value=0.03; o.connect(g); g.connect(master); o.start(); state.amb=o; }
function ambientStop(){ if(state.amb){ state.amb.stop(); state.amb=null; } }
function toggleMute(){ muted=!muted; master.gain.value = muted?0:0.7; }

// -------------------- Three.js --------------------
const canvas = q('#bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x041824);
scene.fog = new THREE.FogExp2(0x0b2a45, 0.012);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 2000);
camera.position.set(0,-8,40);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// lighting
const hemi = new THREE.HemisphereLight(0x9bd1ff, 0x0b2a45, 0.9); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(120,200,80); scene.add(dir);

// god rays
const rayMat = new THREE.MeshBasicMaterial({ color:0x99c9ff, transparent:true, opacity:0.05, depthWrite:false });
for(let i=0;i<5;i++){ const ray=new THREE.Mesh(new THREE.PlaneGeometry(800,400), rayMat.clone()); ray.position.set(300-i*60,180,-100-i*40); ray.rotation.set(-1.2,0.2*i,-0.2); scene.add(ray); }

// caustics
const causticsTex = new THREE.DataTexture(genCaustics(256,256),256,256,THREE.RGBAFormat); causticsTex.needsUpdate=true; causticsTex.wrapS=causticsTex.wrapT=THREE.RepeatWrapping;
const caustics = new THREE.Mesh(new THREE.PlaneGeometry(1200,1200), new THREE.MeshBasicMaterial({ map: causticsTex, color:0x88aaff, transparent:true, opacity:0.06 }));
caustics.rotation.x = -Math.PI/2; caustics.position.y=-2; scene.add(caustics);

// seabed
const seabed = new THREE.Mesh(new THREE.PlaneGeometry(1400,1400,160,160), new THREE.MeshPhongMaterial({ color:0x7c7a5e, flatShading:true }));
seabed.rotation.x = -Math.PI/2; displacePlane(seabed.geometry,(x,z)=> noise2(x*0.004,z*0.004)*14 - 34); scene.add(seabed);

// kelp
const kelp = new THREE.Group(); scene.add(kelp);
for(let i=0;i<160;i++){ const k=makeKelp(); k.position.set(rand(-550,550),-32,rand(-550,550)); kelp.add(k); }

// dhow
const dhow = new THREE.Group();
const hull = new THREE.Mesh(new THREE.BoxGeometry(34,6,12), new THREE.MeshPhongMaterial({ color:0x6e4b3a })); hull.position.y = 2; hull.rotation.y=0.3; dhow.add(hull);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,22,10), new THREE.MeshPhongMaterial({ color:0x6e4b3a })); mast.position.set(0,11,0); dhow.add(mast);
const sail = new THREE.Mesh(new THREE.PlaneGeometry(24,14), new THREE.MeshPhongMaterial({ color:0xffffff, side:THREE.DoubleSide })); sail.position.set(9,8,0); sail.rotation.set(0,Math.PI/2.4,0); dhow.add(sail);
scene.add(dhow);

const bankRing = new THREE.Mesh(new THREE.TorusGeometry(18, 0.6, 16, 48), new THREE.MeshBasicMaterial({ color:0xffe28a }));
bankRing.rotation.x = Math.PI/2; bankRing.position.set(0,-6,0); scene.add(bankRing);

// oysters / pearls / jellies (populated per mode/chapter)
let oysters=[], pearls=[], jellies=[], artifacts=[];

// -------------------- Game State --------------------
const state = {
  running:false, paused:false, mode:null, // 'story'|'adventure'
  chapterIndex:0, chapter:null, startTime:0, timeLimit:300,
  score:0, carried:0, mult:1, oxy:100, hq:true, sens:1, amb:null
};

// Story chapters
const CHAPTERS = [
  { name:"Chapter 1 — Shallow Waters",
    intro:"Your grandfather's dhow rests above. Collect <b>5 pearls</b> and bank them to honor his first harvest.",
    goals:{ pearls:5, bank:true },
    time:180, facts:"Pearling once formed the backbone of the UAE's coastal economy.",
    setup: (i)=>{ scene.fog.density=0.012; },
  },
  { name:"Chapter 2 — The Falcon's Compass",
    intro:"Find the lost <b>Falcon Compass</b>, an artifact used by navigators to align with the stars. It lies somewhere on the seabed.",
    goals:{ artifact:'compass' },
    time:240, facts:"Traditional navigators relied on sea currents, winds, and the stars — symbolized by the falcon.",
    setup: (i)=>{ addArtifact('compass'); scene.fog.density=0.014; },
  },
  { name:"Chapter 3 — Moonlight Harvest",
    intro:"A rare calm night. Gather <b>10 pearls</b> under dim light and bank them before time runs out.",
    goals:{ pearls:10, bank:true },
    time:210, facts:"Pearl merchants gathered at souqs to trade natural pearls across the Gulf and beyond.",
    setup: (i)=>{ scene.background.set(0x020a14); hemi.intensity=0.6; dir.intensity=0.35; },
  },
];

// -------------------- Mode starters --------------------
function startAdventure(){
  uiSfx();
  resetWorld();
  state.mode='adventure'; state.timeLimit = 300; state.score=0; state.carried=0; state.mult=1; state.oxy=100;
  hidePanels(); controls.lock(); ambientStart();
  spawnOysters(45); spawnJellies(18);
  state.startTime = performance.now(); state.running=true; updateHUD();
}
function startStory(){
  uiSfx(); resetWorld(); state.mode='story'; state.chapterIndex=0; beginStoryChapter(0,true);
}
function beginStoryChapter(i, fresh=false){
  resetWorld();
  const ch = CHAPTERS[i]; state.chapter=ch; state.chapterIndex=i;
  state.timeLimit = ch.time; state.score = fresh?0:state.score; state.carried=0; state.mult=1; state.oxy=100;
  ch.setup(i);
  spawnOysters(i===2?28:18); spawnJellies(i===2?14:10);
  controls.unlock();
  menu.classList.add('hidden'); hud.classList.add('hidden');
  prompt.innerHTML = `<h3>${ch.name}</h3><p>${ch.intro}</p><button id="go">Begin Dive</button>`; 
  prompt.classList.remove('hidden');
  q('#go').onclick = ()=>{ prompt.classList.add('hidden'); hud.classList.remove('hidden'); controls.lock(); ambientStart(); state.startTime=performance.now(); state.running=true; };
}

// -------------------- Entities --------------------
function resetWorld(){
  [...oysters,...pearls,...jellies,...artifacts].forEach(m=> scene.remove(m));
  oysters=[]; pearls=[]; jellies=[]; artifacts=[];
  scene.background.set(0x041824); hemi.intensity=0.9; dir.intensity=0.6; scene.fog.density=0.012;
  controls.getObject().position.set(0,-8,40);
}
function spawnOysters(n){
  const oysterGeo=new THREE.SphereGeometry(2,16,16);
  const oysterMat1=new THREE.MeshPhongMaterial({ color:0xa28f72, flatShading:true });
  const oysterMat2=new THREE.MeshPhongMaterial({ color:0xc1b496, flatShading:true });
  const pearlMat=new THREE.MeshPhongMaterial({ color:0xffffff, emissive:0x6666aa, shininess:120, specular:0xffffff });
  for(let i=0;i<n;i++){
    const top=new THREE.Mesh(oysterGeo,oysterMat2), bot=new THREE.Mesh(oysterGeo,oysterMat1);
    top.scale.set(1.2,0.4,1.2); bot.scale.set(1.2,0.4,1.2); bot.rotation.z=Math.PI;
    const o=new THREE.Group(); o.add(top); o.add(bot);
    const x=rand(-500,500), z=rand(-500,500), y=-30+noise2(x*0.006,z*0.006)*8;
    o.position.set(x,y,z); o.userData.open=0; scene.add(o); oysters.push(o);
    const p=new THREE.Mesh(new THREE.SphereGeometry(0.8,16,16), pearlMat.clone()); p.position.set(x,y+0.8,z); p.userData.active=true; scene.add(p); pearls.push(p);
  }
}
function spawnJellies(n){
  for(let i=0;i<n;i++){ const j=makeJelly(); j.position.set(rand(-520,520),-20,rand(-520,520)); j.userData.phase=Math.random()*Math.PI*2; jellies.push(j); scene.add(j); }
}
function addArtifact(kind){
  if(kind==='compass'){
    const g = new THREE.TorusKnotGeometry(1.2,0.35, 80,12);
    const m = new THREE.MeshPhongMaterial({ color:0xffdd88, emissive:0x553300, shininess:80 });
    const mesh = new THREE.Mesh(g,m);
    mesh.position.set(rand(-420,420), -24, rand(-420,420));
    mesh.userData.kind='compass'; scene.add(mesh); artifacts.push(mesh);
  }
}

// -------------------- Update & Render --------------------
const keys={}; window.addEventListener('keydown', e=>{ keys[e.code]=true; if(e.code==='KeyP'){togglePause();} if(e.code==='KeyM'){toggleMute();} if(e.code==='KeyF'){toggleFS();} if(e.code==='KeyE'){interact();} });
window.addEventListener('keyup', e=> keys[e.code]=false);

function resumeGame(){ pause.classList.add('hidden'); controls.lock(); state.paused=false; }
function togglePause(){ if(!state.running) return; state.paused=!state.paused; pause.classList.toggle('hidden', !state.paused); if(state.paused) controls.unlock(); else controls.lock(); }

function updateHUD(){
  hud.classList.remove('hidden');
  const rem = Math.max(0, state.timeLimit - Math.floor((performance.now()-state.startTime)/1000));
  timeEl.textContent = fmtTime(rem);
  oxyEl.textContent = `${Math.round(state.oxy)}%`;
  scoreEl.textContent = state.score;
  multEl.textContent = state.mult.toFixed(1);
  carriedEl.textContent = state.carried;
  if(rem<=0) return endChapterOrGame();
}
function fmtTime(t){ const m=String(Math.floor(t/60)).padStart(2,'0'); const s=String(t%60).padStart(2,'0'); return `${m}:${s}`; }

function interact(){
  if(!state.running || state.paused) return;
  // collect nearby pearl
  const p = controls.getObject().position; let nearest=null; let dist=4;
  for(const pr of pearls){ if(!pr.userData.active) continue; const d=pr.position.distanceTo(p); if(d<dist){dist=d; nearest=pr;} }
  if(nearest){ nearest.userData.active=false; nearest.visible=false; state.carried++; collectSfx(); return; }
  // bank at dhow
  if(controls.getObject().position.distanceTo(bankRing.position) < 18){
    if(state.carried>0){ state.score += Math.floor(state.carried*12*state.mult); state.carried=0; state.mult=Math.min(6, state.mult+0.8); tone(880,0.15,'square',0.24); }
    state.oxy=Math.min(100, state.oxy+0.35);
  }
  // artifacts
  for(const a of artifacts){
    if(a.visible && a.position.distanceTo(p)<4){
      a.visible=false; completeSfx();
      state.score += 120;
      prompt.innerHTML = `<h3>Artifact Found!</h3><p>The Falcon Compass guided traditional navigators using stars and currents.</p>`;
      prompt.classList.remove('hidden'); setTimeout(()=> prompt.classList.add('hidden'), 3000);
      if(state.mode==='story' && state.chapter.goals.artifact==='compass'){ state.chapter.goals.artifactDone=true; }
    }
  }
}

function bankIfClose(){
  const d = controls.getObject().position.distanceTo(bankRing.position);
  if(d<18){ state.oxy=Math.min(100, state.oxy+0.35); } else { state.mult=Math.max(1, state.mult-0.002); }
}

function chapterGoalsMet(){
  if(state.mode!=='story') return false;
  const g = state.chapter.goals;
  const pearlsCollected = (state.score/12); // rough proxy not exact when artifacts used; we can also count by carried logic
  let ok=true;
  if(g.pearls) ok = ok && (state.score >= g.pearls*12 || state.carried>=g.pearls);
  if(g.artifact==='compass') ok = ok && !!g.artifactDone;
  if(g.bank) ok = ok && (controls.getObject().position.distanceTo(bankRing.position)<18 || state.carried===0);
  return ok;
}

function endChapterOrGame(){
  state.running=false; ambientStop(); controls.unlock();
  let msg="";
  if(state.mode==='story'){
    if(chapterGoalsMet() || state.timeLimit<=0){
      msg = chapterGoalsMet() ? "Chapter complete!" : "Time's up!";
      if(chapterGoalsMet()) completeSfx();
      if(state.chapterIndex < CHAPTERS.length-1){
        // proceed to next
        prompt.innerHTML = `<h3>${msg}</h3><p>${state.chapter.facts}</p><button id="next">Next Chapter</button>`;
        prompt.classList.remove('hidden');
        q('#next').onclick = ()=> beginStoryChapter(state.chapterIndex+1,false);
        return;
      } else {
        msg = "Story complete!";
        saveProgress();
      }
    }
  } else {
    msg = "Dive complete!";
  }
  // show game over
  q('#finalScore').textContent = state.score;
  q('#overMsg').innerHTML = `${msg} Your score: <span id="finalScore">${state.score}</span>`;
  showPanel(over);
}

function saveProgress(){
  localStorage.setItem('hpq_story_complete','1');
}

// -------------------- Movement & Simulation --------------------
const vel = new THREE.Vector3();
function step(dt){
  const speed = (keys['ShiftLeft']||keys['ShiftRight'])?28:16;
  vel.set(0,0,0);
  if(keys['KeyW']) vel.z -= 1;
  if(keys['KeyS']) vel.z += 1;
  if(keys['KeyA']) vel.x -= 1;
  if(keys['KeyD']) vel.x += 1;
  if(keys['Space']) vel.y += 1;
  if(keys['ControlLeft']||keys['ControlRight']) vel.y -= 1;
  vel.normalize().multiplyScalar(speed*dt);
  controls.moveRight(vel.x);
  controls.moveForward(vel.z);
  controls.getObject().position.y += vel.y;
  controls.getObject().position.x = THREE.MathUtils.clamp(controls.getObject().position.x, -560,560);
  controls.getObject().position.z = THREE.MathUtils.clamp(controls.getObject().position.z, -560,560);
  controls.getObject().position.y = THREE.MathUtils.clamp(controls.getObject().position.y, -64, 26);
  state.oxy -= (0.011*(keys['ShiftLeft']||keys['ShiftRight']?1.8:1))*dt*60; state.oxy=Math.max(0, state.oxy);
}

function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); const dt=(animate._last? (now-animate._last):16)/1000; animate._last=now;
  if(state.running && !state.paused){
    step(dt);
    bankIfClose();
    updateHUD();

    // open oysters near player and spin pearls
    const p=controls.getObject().position;
    for(const o of oysters){
      const d=o.position.distanceTo(p); o.userData.open += ((d<6?1:0)-o.userData.open)*0.1;
      o.children[0].rotation.z = -o.userData.open*1.1;
    }
    for(const pr of pearls){ pr.rotation.y += dt*1.5; }

    // jellies
    for(const j of jellies){
      j.userData.phase += dt*0.7;
      j.position.y = -22 + Math.sin(j.userData.phase)*4;
      j.position.x += Math.sin(j.userData.phase*0.6)*0.12;
      j.position.z += Math.cos(j.userData.phase*0.5)*0.12;
      if(j.position.distanceTo(p)<2.8){ state.oxy=Math.max(0,state.oxy-18*dt*1.5); stingSfx(); }
    }

    // textures motion
    caustics.material.map.offset.x += dt*0.02; caustics.material.map.offset.y += dt*0.04;
  }
  renderer.setPixelRatio( (state.hq? Math.min(devicePixelRatio, 2) : 1) );
  renderer.render(scene, camera);
}
animate();

// -------------------- Leaderboard --------------------
function leaders(){ try{ return JSON.parse(localStorage.getItem('hpq_leaders')||'[]'); } catch(e){ return []; } }
function setLeaders(list){ localStorage.setItem('hpq_leaders', JSON.stringify(list)); }
function populateLeaders(){ const list=leaders(); const ol=q('#leaders'); ol.innerHTML=''; list.forEach((e,i)=>{ const li=document.createElement('li'); li.textContent=`${i+1}. ${e.name} — ${e.score}`; ol.appendChild(li); }); }
function saveScore(){
  const name = (q('#playerName').value||'Player').slice(0,24);
  const list = leaders(); list.push({ name, score: state.score, t: Date.now() }); list.sort((a,b)=>b.score-a.score);
  setLeaders(list.slice(0,10)); populateLeaders(); uiSfx();
}

// -------------------- Utils --------------------
function rand(a,b){ return a + Math.random()*(b-a); }
function noise2(x,y){ return (Math.sin(x*2.1+Math.sin(y*1.3))*0.5 + Math.sin(y*2.7+Math.sin(x*0.7))*0.5); }
function displacePlane(geom, fn){ geom.computeBoundingBox(); const pos=geom.attributes.position; for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); pos.setY(i, fn(x,z)); } pos.needsUpdate=true; geom.computeVertexNormals(); }
function makeKelp(){ const g=new THREE.CapsuleGeometry(0.3,6,3,6); const m=new THREE.MeshLambertMaterial({ color:0x2fa67a }); const b=new THREE.Mesh(g,m); b.scale.set(1, rand(1,2.5), 1); b.rotation.z = rand(-0.5,0.5); return b; }
function makeJelly(){ const g=new THREE.Group(); const bell=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,16), new THREE.MeshPhongMaterial({ color:0xbf80ff, emissive:0x442266, shininess:60 })); g.add(bell); const mat=new THREE.LineBasicMaterial({ color:0xd2a0ff }); for(let i=0;i<6;i++){ const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(rand(-0.6,0.6), -2.4-rand(0,1), rand(-0.6,0.6))]); g.add(new THREE.Line(geo,mat)); } return g; }
function genCaustics(w,h){ const data=new Uint8Array(w*h*4); let idx=0; for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ const n=(Math.sin(x*0.2)+Math.sin(y*0.27)+Math.sin((x+y)*0.13))*0.33; const v=Math.max(0,Math.min(255,180+n*70)); data[idx++]=v; data[idx++]=v; data[idx++]=255; data[idx++]=255; } } return data; }
function toggleFS(){ if(!document.fullscreenElement) document.body.requestFullscreen(); else document.exitFullscreen(); }

// -------------------- Resize --------------------
addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

// -------------------- Startup --------------------
showPanel(menu);
populateLeaders();
