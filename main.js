// Pearl Quest 3D — Grand Edition
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// -------------------- Localization --------------------
const L = {
  en: {
    time:'Time', o2:'O₂', score:'Score', bank:'Bank', carried:'Carried',
    tagline:'Innovate Your Heritage Game', welcome:'Welcome to <span>Pearl Quest 3D</span>',
    welcomeSub:"Begin at the island—dive when you're ready.",
    pause:'Paused', pauseHint:'Press <b>P</b> to toggle pause.',
    how:'How to Play', settings:'Settings', leaders:'Top Divers', credits:'Credits',
    story:'Story', free:'Free Dive', howTips:`<li><b>WASD</b> move • <b>Space/Ctrl</b> up/down • <b>Shift</b> boost</li>
             <li><b>E</b> interact: collect pearls / artifacts / bank at the dhow / open chest</li>
             <li><b>P</b> pause • <b>M</b> mute • <b>F</b> fullscreen</li>
             <li>Oxygen drains <em>underwater</em>, refills on the island/surface.</li>`,
    quest1:'Collect 5 pearls and bank them', quest2:'Find the Falcon Compass and bank 1 pearl',
    quest3:'Night dive: collect 10 pearls and avoid jellies',
    chapter1:'Chapter 1 — Shallow Waters', chapter2:'Chapter 2 — The Falcon’s Compass', chapter3:'Chapter 3 — Moonlight Harvest',
    complete:'Mission Complete', win:'Season Complete — You Win!'
  },
  ar: {
    time:'الوقت', o2:'الأكسجين', score:'النقاط', bank:'الحصالة', carried:'محفوظ',
    tagline:'ابتكر لعبتك التراثية', welcome:'مرحباً بك في <span>Pearl Quest 3D</span>',
    welcomeSub:'ابدأ من الجزيرة ثم اغص عندما تكون مستعداً.',
    pause:'إيقاف مؤقت', pauseHint:'اضغط <b>P</b> للتبديل.',
    how:'طريقة اللعب', settings:'الإعدادات', leaders:'أفضل الغواصين', credits:'الشكر',
    story:'قصة', free:'غوص حر', howTips:`<li><b>WASD</b> للحركة • <b>مسافة/كنترول</b> صعود/نزول • <b>Shift</b> تسريع</li>
             <li><b>E</b> للتفاعل: اجمع اللؤلؤ / الأثر / التخزين عند السفينة / افتح الصندوق</li>
             <li><b>P</b> إيقاف مؤقت • <b>M</b> كتم • <b>F</b> ملء الشاشة</li>
             <li>ينخفض الأكسجين تحت الماء ويُعاد تعبئته على السطح/الجزيرة.</li>`,
    quest1:'اجمع ٥ لآلئ وقم بإيداعها', quest2:'اعثر على بوصلة الصقر وأودع لؤلؤة واحدة',
    quest3:'غوص ليلي: اجمع ١٠ لآلئ وتجنب القناديل',
    chapter1:'الفصل ١ — المياه الضحلة', chapter2:'الفصل ٢ — بوصلة الصقر', chapter3:'الفصل ٣ — حصاد ضوء القمر',
    complete:'انتهت المهمة', win:'اكتمل الموسم — فزت!'
  }
};
let lang = localStorage.getItem('hpq_lang') || 'en';
function t(k){ return L[lang][k] || k; }
function applyLanguage(){
  qs('#lblTime').textContent=t('time'); qs('#lblO2').textContent=t('o2'); qs('#lblScore').textContent=t('score'); qs('#lblBank').textContent=t('bank'); qs('#lblCarry').textContent=t('carried');
  qs('#tagLine').textContent=t('tagline');
  qs('#welcomeTitle').innerHTML=t('welcome'); qs('#welcomeSub').textContent=t('welcomeSub');
  qs('#pausedTitle').textContent=t('pause'); qs('#pausedHint').innerHTML=t('pauseHint');
  qs('#howTitle').textContent=t('how'); qs('#settingsTitle').textContent=t('settings'); qs('#leaderTitle').textContent=t('leaders'); qs('#creditsTitle').textContent=t('credits');
  qs('#howList').innerHTML=t('howTips');
}

// -------------------- UI --------------------
const hud = qs('#hud');
const timeEl=qs('#time'), scoreEl=qs('#score'), multEl=qs('#mult'), carriedEl=qs('#carried');
const oxyFill = qs('#o2fill'), questChip=qs('#quest');
const menu=qs('#menu'), pauseP=qs('#pause'), how=qs('#how'), settings=qs('#settings'), board=qs('#board'), credits=qs('#credits'), prompt=qs('#prompt'), over=qs('#over'), cinema=qs('#cinema'), fade=qs('#fade');
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
qs('#sens').addEventListener('input', e=> state.sens = parseFloat(e.target.value));
qs('#continueBtn').addEventListener('click', ()=> endIntro(true));
qs('#langBtn').addEventListener('click', ()=>{ lang = (lang==='en'?'ar':'en'); localStorage.setItem('hpq_lang', lang); applyLanguage(); });

function qs(s){ return document.querySelector(s); }
function $$(s){ return document.querySelectorAll(s); }
function showPanel(p){ [menu,pauseP,how,settings,board,credits,over,prompt,cinema].forEach(x=> x.classList.add('hidden')); p.classList.remove('hidden'); hud.classList.add('hidden'); questChip.classList.add('hidden'); controls.unlock(); state.running=false; }
function hidePanels(){ [menu,pauseP,how,settings,board,credits,over,prompt,cinema].forEach(x=> x.classList.add('hidden')); hud.classList.remove('hidden'); questChip.classList.remove('hidden'); }

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
function stingSfx(){ tone(190,0.2,'sawtooth',0.5); }
function ambientStart(){ if(state.amb) state.amb.stop(); const o=actx.createOscillator(); o.type='sine'; o.frequency.value=110; const g=actx.createGain(); g.gain.value=0.03; o.connect(g); g.connect(master); o.start(); state.amb=o; }
function ambientStop(){ if(state.amb){ state.amb.stop(); state.amb=null; } }
function toggleMute(){ muted=!muted; master.gain.value = muted?0:0.7; }

// -------------------- Three.js --------------------
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x74b6e3);
scene.fog = new THREE.FogExp2(0x84c2e3, 0.0025);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 4000);
camera.position.set(0,6,60);
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());
document.addEventListener('mousedown', ()=>{ if(state.running && !state.paused && !controls.isLocked){ controls.lock(); } });

// lighting
const hemi = new THREE.HemisphereLight(0xcde8ff, 0x416d66, 0.95); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(160,220,100); scene.add(dir);

// Sky dome
const skyGeo = new THREE.SphereGeometry(3000, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({ color: 0x74b6e3, side: THREE.BackSide });
const sky = new THREE.Mesh(skyGeo, skyMat); scene.add(sky);

// Water
const waterGeo = new THREE.PlaneGeometry(4000, 4000, 240, 240);
const waterMat = new THREE.MeshPhongMaterial({ color: 0x1a7b90, transparent:true, opacity:0.55, side:THREE.DoubleSide, shininess:30, specular:0x99ddee });
const water = new THREE.Mesh(waterGeo, waterMat); water.rotation.x = -Math.PI/2; water.position.y = 0; scene.add(water);

// Caustics + seabed
const causticsTex = new THREE.DataTexture(genCaustics(256,256),256,256,THREE.RGBAFormat); causticsTex.needsUpdate=true; causticsTex.wrapS=causticsTex.wrapT=THREE.RepeatWrapping;
const caustics = new THREE.Mesh(new THREE.PlaneGeometry(4000,4000), new THREE.MeshBasicMaterial({ map: causticsTex, color:0xe6c88f, transparent:true, opacity:0.08 }));
caustics.rotation.x = -Math.PI/2; caustics.position.y=-2; scene.add(caustics);

const seabed = new THREE.Mesh(new THREE.PlaneGeometry(4000,4000,220,220), new THREE.MeshPhongMaterial({ color:0x7c7a5e, flatShading:true }));
seabed.rotation.x = -Math.PI/2; displacePlane(seabed.geometry,(x,z)=> noise2(x*0.003,z*0.003)*22 - 36); scene.add(seabed);

// Island + palms + majlis
const island = new THREE.Group(); scene.add(island);
const islandGeo = new THREE.CircleGeometry(120, 64);
const islandMat = new THREE.MeshPhongMaterial({ color:0xd6c29a });
const islandMesh = new THREE.Mesh(islandGeo, islandMat);
islandMesh.rotation.x = -Math.PI/2; islandMesh.position.y = 3.2; island.add(islandMesh);
// palms
for (let i=0;i<18;i++){ const palm = makePalm(); const r = 75 + Math.random()*35, a = Math.random()*Math.PI*2; palm.position.set(Math.cos(a)*r, 3.2, Math.sin(a)*r); island.add(palm); }
// grass
const grass = new THREE.Group(); island.add(grass);
for(let i=0;i<200;i++){ const r = 10 + Math.random()*105, a = Math.random()*Math.PI*2; const tuft=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.4,6), new THREE.MeshLambertMaterial({ color:0x1e6f5c })); tuft.position.set(Math.cos(a)*r, 3.25, Math.sin(a)*r); grass.add(tuft); }

// shore foam
const foamRing = new THREE.Mesh(new THREE.RingGeometry(120, 126, 180), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.20, side:THREE.DoubleSide }));
foamRing.rotation.x = -Math.PI/2; foamRing.position.y = 0.2; scene.add(foamRing);

// Dhow (bank)
const dhow = new THREE.Group();
const hull = new THREE.Mesh(new THREE.BoxGeometry(40,8,14), new THREE.MeshPhongMaterial({ color:0x7a5533 })); hull.position.y = 2; hull.rotation.y=0.3; dhow.add(hull);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,26,10), new THREE.MeshPhongMaterial({ color:0x7a5533 })); mast.position.set(0,13,0); dhow.add(mast);
const sail = new THREE.Mesh(new THREE.PlaneGeometry(28,16,20,1), new THREE.MeshPhongMaterial({ color:0xffffff, side:THREE.DoubleSide })); sail.position.set(11,10,0); sail.rotation.set(0,Math.PI/2.4,0); dhow.add(sail);
dhow.position.set(-30,1,-200); scene.add(dhow);
const bankRing = new THREE.Mesh(new THREE.TorusGeometry(22, 0.7, 16, 64), new THREE.MeshBasicMaterial({ color:0xffe28a }));
bankRing.rotation.x = Math.PI/2; bankRing.position.set(-30,-6,-200); scene.add(bankRing);

// Majlis tent + carpet (Al Sadu pattern via data texture)
const majlis = new THREE.Group(); island.add(majlis);
const carpetTex = new THREE.DataTexture(genSadu(256,128),256,128,THREE.RGBAFormat); carpetTex.needsUpdate=true; carpetTex.wrapS=carpetTex.wrapT=THREE.RepeatWrapping;
const carpet = new THREE.Mesh(new THREE.PlaneGeometry(30,14), new THREE.MeshBasicMaterial({ map:carpetTex, side:THREE.DoubleSide })); carpet.rotation.x=-Math.PI/2; carpet.position.set(25,3.21,8); majlis.add(carpet);
const canopy = new THREE.Mesh(new THREE.PlaneGeometry(30,14), new THREE.MeshLambertMaterial({ color:0xd9d2be, side:THREE.DoubleSide })); canopy.position.set(25,10,8); canopy.rotation.set(-Math.PI/12,0,0); majlis.add(canopy);
const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,14,8), new THREE.MeshPhongMaterial({ color:0x7a5533 })); poleL.position.set(10,7,1); majlis.add(poleL);
const poleR = poleL.clone(); poleR.position.set(40,7,15); majlis.add(poleR);

// Lanterns with flicker
const lanterns=[];
function addLantern(x,y,z){
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.6,16,16), new THREE.MeshPhongMaterial({ color:0xfff0d1, emissive:0xffc773 }));
  bulb.position.set(x,y,z); scene.add(bulb);
  const L = new THREE.PointLight(0xffc773, 1.4, 40); L.position.set(x,y,z); scene.add(L);
  lanterns.push({ bulb, L, t:Math.random()*1000 });
}
addLantern(25,6,8); addLantern(10,6,1); addLantern(40,6,15);

// UAE Flag (waving plane)
const flag = makeFlag(); flag.position.set(55,10,20); island.add(flag);

// Underwater flora & fauna
const kelp = new THREE.Group(); scene.add(kelp);
for(let i=0;i<200;i++){ const k=makeKelp(); k.position.set(rand(-1500,1500),-32,rand(-1500,1500)); kelp.add(k); }
const coralGroup = new THREE.Group(); scene.add(coralGroup);
for(let i=0;i<120;i++){ const col=(i%2===0)?0xff8a75:0xf4a261; const geo=new THREE.ConeGeometry(rand(0.6,1.2),rand(1.2,2.4),6); const mat=new THREE.MeshPhongMaterial({ color:col, emissive:0x240a05, shininess:16 }); const c=new THREE.Mesh(geo,mat); c.position.set(rand(-1500,1500), -33, rand(-1500,1500)); coralGroup.add(c); }
const fishGroup = new THREE.Group(); scene.add(fishGroup);
for(let i=0;i<200;i++){ fishGroup.add(makeFish()); }

// pearls / jellies / artifacts / bubbles / stars
let oysters=[], pearls=[], jellies=[], artifacts=[], bubbles=[], stars=null;

// -------------------- Game State --------------------
const state = {
  running:false, paused:false, mode:null,
  chapterIndex:0, chapter:null, startTime:0, timeLimit:300,
  score:0, carried:0, mult:1, oxy:100, hq:true, sens:1, amb:null,
  inIntro:false, tIntro:0, afterIntro:null
};

// Chapters
const CHAPTERS = [
  { nameKey:'chapter1', questKey:'quest1', time:240, setup: ()=>{ dayLighting(); spawnOysters(30); spawnJellies(8); } },
  { nameKey:'chapter2', questKey:'quest2', time:260, setup: ()=>{ sunsetLighting(); spawnOysters(25); spawnJellies(12); addArtifact('compass'); } },
  { nameKey:'chapter3', questKey:'quest3', time:240, setup: ()=>{ nightLighting(); addStars(); spawnOysters(36); spawnJellies(16); } },
];

// -------------------- Mode starters --------------------
function startAdventure(){ uiSfx(); resetWorld(); state.mode='adventure'; state.timeLimit=300; state.score=0; state.carried=0; state.mult=1; state.oxy=100; playIntroThen(()=>{ spawnOysters(60); spawnJellies(18); setQuest('Collect as many pearls as you can and bank them for score!'); }); }
function startStory(){ uiSfx(); resetWorld(); state.mode='story'; state.chapterIndex=0; beginStoryChapter(0,true); }
function beginStoryChapter(i, fresh=false){
  resetWorld();
  const ch=CHAPTERS[i]; state.chapter=ch; state.chapterIndex=i;
  state.timeLimit=ch.time; state.score=fresh?0:state.score; state.carried=0; state.mult=1; state.oxy=100;
  ch.setup(i);
  playIntroThen(()=>{
    const name=t(ch.nameKey), q=t(ch.questKey);
    prompt.innerHTML = `<h3>${name}</h3><p>${q}</p>`; prompt.classList.remove('hidden'); setTimeout(()=>prompt.classList.add('hidden'), 2600);
    setQuest(q);
  });
}

function setQuest(txt){ questChip.textContent = txt; questChip.classList.remove('hidden'); }

function playIntroThen(after){
  controls.getObject().position.set(0, 6, 60); camera.lookAt(-30,6,-200);
  hidePanels();
  cinema.classList.remove('hidden');
  state.inIntro = true; state.tIntro = 0; state.afterIntro = after;
  ambientStart();
}
function endIntro(immediate){
  cinema.classList.add('hidden');
  fade.classList.add('show');
  setTimeout(()=>{
    fade.classList.remove('show');
    state.inIntro=false;
    state.startTime = performance.now();
    state.running = true;
    if (typeof state.afterIntro === 'function') state.afterIntro();
    controls.lock();
  }, immediate? 250 : 1200);
}

// -------------------- Entities --------------------
function resetWorld(){
  [...oysters,...pearls,...jellies,...artifacts,...bubbles].forEach(m=> scene.remove(m));
  oysters=[]; pearls=[]; jellies=[]; artifacts=[]; bubbles=[];
  if(stars){ scene.remove(stars); stars=null; }
  dayLighting(); // default to day
  controls.getObject().position.set(0,6,60);
  [prompt, cinema].forEach(x=> x.classList.add('hidden'));
  questChip.classList.add('hidden');
}
function spawnOysters(n){
  const oysterGeo=new THREE.SphereGeometry(2,16,16);
  const oysterMat1=new THREE.MeshPhongMaterial({ color:0xa28f72, flatShading:true });
  const oysterMat2=new THREE.MeshPhongMaterial({ color:0xc1b496, flatShading:true });
  const pearlMat=new THREE.MeshPhongMaterial({ color:0xffffff, emissive:0xaa8844, shininess:120, specular:0xffffff });
  for(let i=0;i<n;i++){
    const top=new THREE.Mesh(oysterGeo,oysterMat2), bot=new THREE.Mesh(oysterGeo,oysterMat1);
    top.scale.set(1.2,0.4,1.2); bot.scale.set(1.2,0.4,1.2); bot.rotation.z=Math.PI;
    const o=new THREE.Group(); o.add(top); o.add(bot);
    const x=rand(-1500,1500), z=rand(-1500,1500), y=-30+noise2(x*0.004,z*0.004)*14;
    o.position.set(x,y,z); o.userData.open=0; scene.add(o); oysters.push(o);
    const p=new THREE.Mesh(new THREE.SphereGeometry(0.8,16,16), pearlMat.clone()); p.position.set(x,y+0.8,z); p.userData.active=true; scene.add(p); pearls.push(p);
  }
}
function spawnJellies(n){ for(let i=0;i<n;i++){ const j=makeJelly(); j.position.set(rand(-1500,1500),-20,rand(-1500,1500)); j.userData.phase=Math.random()*Math.PI*2; jellies.push(j); scene.add(j); } }
function addArtifact(kind){
  if(kind==='compass'){
    const g=new THREE.TorusKnotGeometry(1.2,0.35,80,12); const m=new THREE.MeshPhongMaterial({ color:0xffdd88, emissive:0x553300, shininess:80 });
    const mesh=new THREE.Mesh(g,m); mesh.position.set(rand(-900,900),-24,rand(-900,900)); mesh.userData.kind='compass'; scene.add(mesh); artifacts.push(mesh);
  }
  const chest = new THREE.Mesh(new THREE.BoxGeometry(3,2,2), new THREE.MeshPhongMaterial({ color:0x8b5a2b }));
  chest.position.set(rand(-900,900), -28, rand(-900,900)); chest.userData.kind='chest'; scene.add(chest); artifacts.push(chest);
}

// Lighting variants
function dayLighting(){ scene.background.set(0x74b6e3); scene.fog.color.set(0x84c2e3); scene.fog.density=0.0025; hemi.intensity=0.95; dir.intensity=0.8; sky.material.color.set(0x74b6e3); }
function sunsetLighting(){ scene.background.set(0xffc387); scene.fog.color.set(0xff9866); scene.fog.density=0.003; hemi.intensity=0.8; dir.color.set(0xffe0b3); dir.intensity=0.7; sky.material.color.set(0xffc387); }
function nightLighting(){ scene.background.set(0x03161c); scene.fog.color.set(0x0b3c4a); scene.fog.density=0.010; hemi.intensity=0.5; dir.intensity=0.25; sky.material.color.set(0x03161c); }
function addStars(){ const starGeo=new THREE.BufferGeometry(); const N=2000; const pos=new Float32Array(N*3); for(let i=0;i<N;i++){ const r=2200+Math.random()*400, th=Math.random()*Math.PI*2, ph=Math.random()*Math.PI; pos[i*3]=Math.sin(ph)*Math.cos(th)*r; pos[i*3+1]=Math.cos(ph)*r; pos[i*3+2]=Math.sin(ph)*Math.sin(th)*r; } starGeo.setAttribute('position', new THREE.BufferAttribute(pos,3)); const starMat=new THREE.PointsMaterial({ color:0xffffff, size:2, sizeAttenuation:true }); stars=new THREE.Points(starGeo, starMat); scene.add(stars); }

// -------------------- Update & Render --------------------
const keys={}; window.addEventListener('keydown', e=>{ keys[e.code]=true; if(e.code==='KeyP'){togglePause();} if(e.code==='KeyM'){toggleMute();} if(e.code==='KeyF'){toggleFS();} if(e.code==='KeyE'){interact();} });
window.addEventListener('keyup', e=> keys[e.code]=false);

function resumeGame(){ pauseP.classList.add('hidden'); controls.lock(); state.paused=false; }
function togglePause(){ if(!state.running) return; state.paused=!state.paused; pauseP.classList.toggle('hidden', !state.paused); if(state.paused) controls.unlock(); else controls.lock(); }

function updateHUD(){
  hud.classList.remove('hidden');
  const rem = Math.max(0, state.timeLimit - Math.floor((performance.now()-state.startTime)/1000));
  timeEl.textContent = fmtTime(rem);
  scoreEl.textContent = state.score; multEl.textContent = state.mult.toFixed(1); carriedEl.textContent = state.carried;
  setOxyBar(state.oxy);
  if(rem<=0) return endChapterOrGame();
}
function fmtTime(t){ const m=String(Math.floor(t/60)).padStart(2,'0'); const s=String(t%60).padStart(2,'0'); return `${m}:${s}`; }
function setOxyBar(v){ v=Math.max(0,Math.min(100,v)); oxyFill.style.width = `${v}%`; oxyFill.style.background = v>50? 'linear-gradient(90deg,#60eac2,#1aa5a1)': (v>25? 'linear-gradient(90deg,#ffd166,#f3a712)' : 'linear-gradient(90deg,#ef476f,#e63946)'); }

function interact(){
  if(!state.running || state.paused) return;
  const p = controls.getObject().position; let nearest=null; let dist=4;
  for(const pr of pearls){ if(!pr.userData.active) continue; const d=pr.position.distanceTo(p); if(d<dist){dist=d; nearest=pr;} }
  if(nearest){ nearest.userData.active=false; nearest.visible=false; state.carried++; collectSfx(); return; }
  if(controls.getObject().position.distanceTo(bankRing.position) < 22){
    if(state.carried>0){ state.score += Math.floor(state.carried*12*state.mult); state.carried=0; state.mult=Math.min(6, state.mult+0.8); tone(880,0.15,'square',0.24); }
    state.oxy=Math.min(100, state.oxy+0.65);
  }
  for(const a of artifacts){
    if(a.visible && a.position.distanceTo(p)<4){
      a.visible=false; completeSfx();
      state.score += (a.userData.kind==='chest'? 200 : 120);
      prompt.innerHTML = (a.userData.kind==='chest')
        ? `<h3>Treasure Chest!</h3><p>Trade tokens and ornaments from historic souqs.</p>`
        : `<h3>Artifact Found!</h3><p>The Falcon Compass guided navigators using stars and currents.</p>`;
      prompt.classList.remove('hidden'); setTimeout(()=> prompt.classList.add('hidden'), 3000);
    }
  }
}

function bankIfClose(){
  const d = controls.getObject().position.distanceTo(bankRing.position);
  if(d<22){ state.oxy=Math.min(100, state.oxy+0.65); } else { state.mult=Math.max(1, state.mult-0.002); }
}

function endChapterOrGame(){
  state.running=false; ambientStop(); controls.unlock();
  const isLast = state.mode==='story' && state.chapterIndex===CHAPTERS.length-1;
  const title = isLast? t('win'): t('complete');
  qs('#overTitle').textContent = title;
  qs('#finalScore').textContent = state.score;
  qs('#overMsg').innerHTML = `${title}. <br/> ${t('score')}: <span id="finalScore">${state.score}</span>`;
  showPanel(over);
  if(state.mode==='story' && !isLast){ state.chapterIndex++; }
}

// -------------------- Movement & Simulation --------------------
const vel = new THREE.Vector3();
function step(dt){
  const speed = (keys['ShiftLeft']||keys['ShiftRight'])?28:16;
  vel.set(0,0,0);
  if(keys['KeyW']) vel.z += 1;   // forward
  if(keys['KeyS']) vel.z -= 1;   // backward
  if(keys['KeyA']) vel.x -= 1;
  if(keys['KeyD']) vel.x += 1;
  if(keys['Space']) vel.y += 1;
  if(keys['ControlLeft']||keys['ControlRight']) vel.y -= 1;
  vel.normalize().multiplyScalar(speed*dt);
  controls.moveRight(vel.x);
  controls.moveForward(vel.z);
  controls.getObject().position.y += vel.y;

  // bounds
  controls.getObject().position.x = THREE.MathUtils.clamp(controls.getObject().position.x, -1980,1980);
  controls.getObject().position.z = THREE.MathUtils.clamp(controls.getObject().position.z, -1980,1980);
  controls.getObject().position.y = THREE.MathUtils.clamp(controls.getObject().position.y, -72, 40);

  // oxygen
  const underwater = controls.getObject().position.y < 0;
  if (underwater) {
    state.oxy -= (0.012*(keys['ShiftLeft']||keys['ShiftRight']?1.8:1))*dt*60;
    maybeBubble(controls.getObject().position);
    scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.010, 0.05);
    sky.material.color.lerp(new THREE.Color(0x03161c), 0.05);
  } else {
    state.oxy = Math.min(100, state.oxy + 0.35);
    scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.0025, 0.05);
    sky.material.color.lerp(new THREE.Color(0x74b6e3), 0.05);
  }
  state.oxy = Math.max(0, state.oxy);
}

function animate(){
  requestAnimationFrame(animate);
  const now = performance.now(); const dt=(animate._last? (now-animate._last):16)/1000; animate._last=now;

  if(state.running && !state.paused){
    // water waves
    const posAttr = water.geometry.attributes.position;
    for(let i=0;i<posAttr.count;i++){
      const x=posAttr.getX(i), z=posAttr.getZ(i);
      const y = Math.sin((x+now*0.05)*0.01)*0.6 + Math.cos((z+now*0.04)*0.01)*0.4;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true; water.geometry.computeVertexNormals();

    step(dt);
    bankIfClose();
    updateHUD();

    const p=controls.getObject().position;
    for(const o of oysters){ const d=o.position.distanceTo(p); o.userData.open += ((d<6?1:0)-o.userData.open)*0.1; o.children[0].rotation.z = -o.userData.open*1.1; }
    for(const pr of pearls){ pr.rotation.y += dt*1.5; }

    for(const j of jellies){
      j.userData.phase += dt*0.7;
      j.position.y = -22 + Math.sin(j.userData.phase)*4;
      j.position.x += Math.sin(j.userData.phase*0.6)*0.12;
      j.position.z += Math.cos(j.userData.phase*0.5)*0.12;
      if(j.position.distanceTo(p)<2.8){ state.oxy=Math.max(0,state.oxy-18*dt*1.5); stingSfx(); }
    }

    fishGroup.children.forEach(f=>{
      f.userData.a += dt * f.userData.speed;
      f.position.x += Math.cos(f.userData.a) * f.userData.speed * 10;
      f.position.z += Math.sin(f.userData.a*0.9) * f.userData.speed * 10;
      f.position.y = -18 + Math.sin(f.userData.a*2) * 3;
      if (f.position.length() > 2000) { f.position.set(rand(-1500,1500), -18, rand(-1500,1500)); }
      f.rotation.y = Math.atan2(f.userData.vx||1, f.userData.vz||1);
    });

    caustics.material.map.offset.x += dt*0.02; caustics.material.map.offset.y += dt*0.04;

    // lantern flicker
    lanterns.forEach(o=>{ o.t+=dt; o.L.intensity = 1.2 + Math.sin(o.t*10)*0.2 + (Math.random()*0.2-0.1); });
    // foam pulse
    foamRing.material.opacity = 0.18 + Math.sin(now*0.002)*0.05;

    // flag wave
    if(flag.userData.wave){ flag.userData.wave(now); }
  }
  renderer.setPixelRatio( (state.hq? Math.min(devicePixelRatio, 2) : 1) );
  renderer.render(scene, camera);
}

// -------------------- Bubbles --------------------
function maybeBubble(pos){
  if (Math.random() < 0.2){
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color:0xcfeffc, transparent:true, opacity:0.6 }));
    b.position.copy(pos); bubbles.push(b); scene.add(b);
  }
  bubbles.forEach((b, i)=>{
    b.position.y += 0.15;
    b.material.opacity -= 0.008;
    if (b.material.opacity <= 0) { scene.remove(b); bubbles.splice(i,1); }
  });
}

// -------------------- Leaderboard --------------------
function leaders(){ try{ return JSON.parse(localStorage.getItem('hpq_leaders')||'[]'); } catch(e){ return []; } }
function setLeaders(list){ localStorage.setItem('hpq_leaders', JSON.stringify(list)); }
function populateLeaders(){ const list=leaders(); const ol=document.getElementById('leaders'); ol.innerHTML=''; list.forEach((e,i)=>{ const li=document.createElement('li'); li.textContent=`${i+1}. ${e.name} — ${e.score}`; ol.appendChild(li); }); }
function saveScore(){ const name=(document.getElementById('playerName').value||'Player').slice(0,24); const list=leaders(); list.push({ name, score: state.score, t: Date.now() }); list.sort((a,b)=>b.score-a.score); setLeaders(list.slice(0,10)); populateLeaders(); uiSfx(); }

// -------------------- Utils --------------------
function rand(a,b){ return a + Math.random()*(b-a); }
function noise2(x,y){ return (Math.sin(x*2.1+Math.sin(y*1.3))*0.5 + Math.sin(y*2.7+Math.sin(x*0.7))*0.5); }
function displacePlane(geom, fn){ const pos=geom.attributes.position; for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); pos.setY(i, fn(x,z)); } pos.needsUpdate=true; geom.computeVertexNormals(); }
function makeKelp(){ const g=new THREE.CapsuleGeometry(0.3,6,3,6); const m=new THREE.MeshLambertMaterial({ color:0x1e6f5c }); const b=new THREE.Mesh(g,m); b.scale.set(1, rand(1,2.5), 1); b.rotation.z = rand(-0.5,0.5); return b; }
function makePalm(){ const grp=new THREE.Group(); const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,10,8), new THREE.MeshPhongMaterial({ color:0x7a5533 })); trunk.position.y=3.2+5; grp.add(trunk); for(let i=0;i<6;i++){ const leaf=new THREE.Mesh(new THREE.PlaneGeometry(6,2), new THREE.MeshLambertMaterial({ color:0x1e6f5c, side:THREE.DoubleSide })); leaf.position.set(0,13,0); leaf.rotation.set(0, i*Math.PI/3, -Math.PI/6); grp.add(leaf);} return grp; }
function makeJelly(){ const g=new THREE.Group(); const bell=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,16), new THREE.MeshPhongMaterial({ color:0xbf80ff, emissive:0x442266, shininess:60 })); g.add(bell); const mat=new THREE.LineBasicMaterial({ color:0xd2a0ff }); for(let i=0;i<6;i++){ const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(rand(-0.6,0.6), -2.4-rand(0,1), rand(-0.6,0.6))]); g.add(new THREE.Line(geo,mat)); } return g; }
function makeFish(){ const g=new THREE.ConeGeometry(0.6, 1.8, 8); const m=new THREE.MeshLambertMaterial({ color: (Math.random()<0.5? 0xf4a261:0x2bc4ad) }); const f=new THREE.Mesh(g,m); f.rotation.x = Math.PI/2; f.position.set(rand(-1500,1500), -18, rand(-1500,1500)); f.userData.speed = rand(0.5,1.4); f.userData.a=Math.random()*6.28; return f; }
function genCaustics(w,h){ const data=new Uint8Array(w*h*4); let idx=0; for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ const n=(Math.sin(x*0.2)+Math.sin(y*0.27)+Math.sin((x+y)*0.13))*0.33; const v=Math.max(0,Math.min(255,180+n*70)); data[idx++]=v; data[idx++]=v; data[idx++]=255; data[idx++]=255; } } return data; }
function genSadu(w,h){ const data=new Uint8Array(w*h*4); let i=0; for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ const band = Math.floor(x/16)%4; let col=[200,0,0]; if(band===1) col=[0,0,0]; if(band===2) col=[230,230,230]; if(band===3) col=[160,0,0]; const a = (y%8<2 || x%16<2)? 255:255; data[i++]=col[0]; data[i++]=col[1]; data[i++]=col[2]; data[i++]=a; } } return data; }
function toggleFS(){ if(!document.fullscreenElement) document.body.requestFullscreen(); else document.exitFullscreen(); }

// UAE Flag maker
function makeFlag(){
  const geo = new THREE.PlaneGeometry(14,8, 20, 6);
  const mat = new THREE.MeshBasicMaterial({ side:THREE.DoubleSide, map:flagTexture(), transparent:false });
  const mesh = new THREE.Mesh(geo, mat);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,14,10), new THREE.MeshPhongMaterial({ color:0x888888 }));
  pole.position.set(-7.5, -0.5, 0); mesh.add(pole);
  mesh.userData.wave = (t)=>{
    const pos = geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i)+7; // 0 at pole
      const y = pos.getY(i);
      const z = Math.sin( (x*0.7 + t*0.004) ) * 0.6 * (x/14);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  return mesh;
}
function flagTexture(){
  const c=document.createElement('canvas'); c.width=280; c.height=160; const ctx=c.getContext('2d');
  // UAE flag: vertical red band (left), then green/white/black stripes
  ctx.fillStyle='#ff0000'; ctx.fillRect(0,0,70,160);
  ctx.fillStyle='#00732f'; ctx.fillRect(70,0,210,53);
  ctx.fillStyle='#ffffff'; ctx.fillRect(70,53,210,54);
  ctx.fillStyle='#000000'; ctx.fillRect(70,107,210,53);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}

// -------------------- Resize --------------------
addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

// -------------------- Startup --------------------
applyLanguage();
showPanel(menu);
populateLeaders();

// Kick off render loop
animate();
