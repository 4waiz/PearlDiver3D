import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Water } from 'three/examples/jsm/objects/Water2.js';

/* ------------ DOM helpers ------------ */
const UI = document.querySelector('#ui');
const add = html => { const d=document.createElement('div'); d.innerHTML=html.trim(); const n=d.firstChild; UI.appendChild(n); return n; };
const qs = (s,root=document)=>root.querySelector(s);
const on = (sel,fn)=>qs(sel).addEventListener('click',fn);

/* ------------ HUD + Panels ------------ */
const hud = add(`<div id="hud" class="bubblebar hidden">
  <div><strong>Time</strong> <span id="time">05:00</span></div>
  <div><strong>O₂</strong><div id="o2bar"><span id="o2fill" style="width:100%"></span></div></div>
  <div><strong>Score</strong> <span id="score">0</span></div>
  <div><strong>Bank</strong> x<span id="mult">1.0</span></div>
  <div><strong>Carried</strong> <span id="carried">0</span></div>
</div>`);
const quest = add(`<div id="quest" class="chip hidden">Quest goes here…</div>`);
const cross = add(`<div id="crosshair">+</div>`);

const menu = add(`<div id="menu" class="panel card">
  <h1>Pearl Quest 3D</h1>
  <p class="tag">Innovate Your Heritage Game</p>
  <div class="buttons">
    <button id="btnStart" class="pill big">Start Game</button>
    <button id="btnHow" class="ghost">How to Play</button>
    <button id="btnSettings" class="ghost">Settings</button>
    <button id="btnLeaderboard" class="ghost">Leaderboard</button>
    <button id="btnCredits" class="ghost">Credits</button>
  </div>
</div>`);

const modePanel = add(`<div id="mode" class="panel card hidden">
  <h2>Select Mode</h2>
  <div class="buttons">
    <button id="chooseStory" class="pill big">Story Mode</button>
    <button id="chooseFree"  class="pill big">Free Dive (Score)</button>
  </div>
  <button class="back pill">Back</button>
</div>`);

const storyPanel = add(`<div id="story" class="panel card hidden">
  <h2>Choose Chapter</h2>
  <div id="chapters" class="buttons"></div>
  <div class="buttons">
    <button id="continueStory" class="ghost">Continue Last Chapter</button>
    <button class="back pill">Back</button>
  </div>
</div>`);

const cinema = add(`<div id="cinema" class="panel card hidden">
  <h2>Welcome to <span>Pearl Quest 3D</span></h2>
  <p>Begin at the island — click below when ready.</p>
  <button id="continueBtn" class="pill big">Click to Dive</button>
</div>`);

const pausePanel = add(`<div id="pause" class="panel card hidden">
  <h2>Paused</h2>
  <div class="buttons">
    <button id="resumeBtn" class="pill">Resume</button>
    <button id="restartBtn" class="ghost">Restart</button>
    <button id="menuBtn" class="ghost">Main Menu</button>
  </div>
  <p class="hint">Press <b>P</b> to toggle pause.</p>
</div>`);

const how = add(`<div id="how" class="panel card hidden">
  <h2>How to Play</h2>
  <ul class="how">
    <li><b>WASD</b> move • <b>Space/Ctrl</b> up/down • <b>Shift</b> boost</li>
    <li><b>E</b> interact (collect/bank)</li>
    <li><b>P</b> pause • <b>M</b> mute • <b>F</b> fullscreen</li>
  </ul>
  <button class="back pill">Back</button>
</div>`);

const settings = add(`<div id="settings" class="panel card hidden">
  <h2>Settings</h2>
  <div class="row">
    <label>Mouse sensitivity</label>
    <input id="sens" type="range" min="0.2" max="1.6" step="0.05" value="1"/>
  </div>
  <div class="row">
    <label>Music</label>
    <button id="muteBtn" class="ghost">Mute/Unmute (M)</button>
  </div>
  <div class="row">
    <label>Graphics</label>
    <button id="hqBtn" class="ghost">Toggle High Quality</button>
  </div>
  <button class="back pill">Back</button>
</div>`);

const board = add(`<div id="board" class="panel card hidden">
  <h2>Top Divers</h2>
  <ol id="leaders"></ol>
  <button class="back pill">Back</button>
</div>`);

const credits = add(`<div id="credits" class="panel card hidden">
  <h2>Credits</h2>
  <p><b>Design & Development:</b> Awaiz Ahmed — Software Engineering Student</p>
  <p>Built for <b>Innovate Your Heritage Game</b></p>
  <button class="back pill">Back</button>
</div>`);

const prompt = add(`<div id="prompt" class="panel card hidden small"></div>`);
const over = add(`<div id="over" class="panel card hidden">
  <h2 id="overTitle">Mission Complete</h2>
  <p id="overMsg">Your score: <span id="finalScore">0</span></p>
  <div class="save">
    <input id="playerName" placeholder="Enter your name"/>
    <button id="saveBtn" class="pill">Save to Leaderboard</button>
  </div>
  <div class="buttons">
    <button id="again" class="pill">Play Again</button>
    <button class="back pill">Main Menu</button>
  </div>
</div>`);

/* Radar + legend */
const radarWrap = add(`<div id="radarWrap"><canvas id="radar" width="180" height="180"></canvas></div>`);
const legend = add(`<div id="legend"><span><b class="boat"></b>Boat</span>&nbsp;&nbsp;<span><b class="island"></b>Island</span>&nbsp;&nbsp;<span><b class="pearl"></b>Pearls</span></div>`);
const radar = radarWrap.querySelector('#radar'); const rctx = radar.getContext('2d');

/* Underwater tint overlay */
const tint = document.createElement('div');
tint.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:6;background:radial-gradient(circle at 50% 60%, rgba(0,110,155,.25), rgba(0,70,110,.65));opacity:0;transition:opacity .25s ease;`;
document.body.appendChild(tint);

/* ------------ Show/Hide helpers ------------ */
function show(p){
  [menu,modePanel,storyPanel,cinema,pausePanel,how,settings,board,credits,over].forEach(x=>x.classList.add('hidden'));
  p.classList.remove('hidden'); hud.classList.add('hidden'); quest.classList.add('hidden');
  controls.unlock(); state.running=false;
}
function hideAll(){
  [menu,modePanel,storyPanel,cinema,pausePanel,how,settings,board,credits,over].forEach(x=>x.classList.add('hidden'));
  hud.classList.remove('hidden'); quest.classList.remove('hidden');
}

/* ------------ Buttons ------------ */
on('#btnStart',()=>show(modePanel));
modePanel.querySelector('.back').addEventListener('click',()=>show(menu));
on('#chooseStory',()=>{ renderChapters(); show(storyPanel); });
on('#chooseFree', ()=> startAdventure());
storyPanel.querySelector('.back').addEventListener('click',()=>show(modePanel));
on('#continueStory',()=> beginChapter(state.chapterIndex||0,false));

on('#btnHow',()=>show(how));
on('#btnSettings',()=>show(settings));
on('#btnLeaderboard',()=>{ renderLeaders(); show(board); });
on('#btnCredits',()=>show(credits));
on('#continueBtn',()=>endIntro());
on('#resumeBtn',resume);
on('#restartBtn',()=>{ state.mode==='story'?beginChapter(state.chapterIndex,true):startAdventure(); });
on('#menuBtn',()=>show(menu));
on('#again',startAdventure);
on('#saveBtn',saveScore);

settings.querySelector('#sens').addEventListener('input',e=> state.sens=parseFloat(e.target.value));
on('#muteBtn',()=> master.gain.value = master.gain.value>0 ? 0 : .6);
on('#hqBtn',()=> state.hq=!state.hq);
how.querySelector('.back').addEventListener('click',()=>show(menu));
settings.querySelector('.back').addEventListener('click',()=>show(menu));
board.querySelector('.back').addEventListener('click',()=>show(menu));
credits.querySelector('.back').addEventListener('click',()=>show(menu));

/* ------------ Audio ------------ */
const AC = new (window.AudioContext||window.webkitAudioContext)();
const master = AC.createGain(); master.connect(AC.destination); master.gain.value=.6;
const tone=(f=440,d=.12,type='sine',v=.3)=>{const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.value=0;o.connect(g);g.connect(master);o.start();g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.stop(t+d)}
const collect=()=>{tone(900,.12,'sine',.4);tone(1350,.12,'sine',.25)}

/* ------------ Three.js scene ------------ */
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('bg'), antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
const scene = new THREE.Scene(); scene.background=new THREE.Color(0x87c9f5); scene.fog=new THREE.FogExp2(0x8ed0f7,.0022);
const camera = new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,4000); camera.position.set(0,6,60);
const controls = new PointerLockControls(camera,document.body); scene.add(controls.getObject());
addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

/* Desktop pointer-lock only */
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints>0);
if (isTouch) { document.body.classList.add('mobile'); qs('#touchUI')?.classList.remove('hidden'); }
document.addEventListener('mousedown',()=>{ if(!isTouch && state.running && !controls.isLocked) controls.lock(); });

/* BLOCK mobile zoom/gestures when using joysticks */
if (isTouch) {
  const uiLayer = document.getElementById('touchUI');
  // iOS gesture events
  ['gesturestart','gesturechange','gestureend'].forEach(ev => {
    document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  });
  // Prevent default scrolling/zooming on our UI layer
  ['touchstart','touchmove','touchend','touchcancel'].forEach(ev => {
    uiLayer.addEventListener(ev, e => e.preventDefault(), { passive: false });
  });
}

/* Lights / sun / sky / clouds */
const hemi=new THREE.HemisphereLight(0xcde8ff,0x416d66,.95); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffeecc,1.0); sun.position.set(160,220,100); scene.add(sun);
const sky=new THREE.Mesh(new THREE.SphereGeometry(3000,32,32), new THREE.MeshBasicMaterial({color:0x87c9f5, side:THREE.BackSide})); scene.add(sky);
const clouds=makeClouds(16); scene.add(clouds);

/* Water2 (double-sided) */
const waterNormals=new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;});
const water=new Water(new THREE.PlaneGeometry(4000,4000),{color:'#0a7fb0',scale:6,flowDirection:new THREE.Vector2(1,1),textureWidth:1024,textureHeight:1024,normalMap0:waterNormals,normalMap1:waterNormals});
water.rotation.x=-Math.PI/2; water.position.y=.15; water.material.side=THREE.DoubleSide; scene.add(water);

/* Seabed + caustics */
const causticsTex=new THREE.DataTexture(genCaustics(256,256),256,256,THREE.RGBAFormat); causticsTex.needsUpdate=true; causticsTex.wrapS=causticsTex.wrapT=THREE.RepeatWrapping;
const caust=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000), new THREE.MeshBasicMaterial({map:causticsTex,color:0xe6c88f,transparent:true,opacity:.08}));
caust.rotation.x=-Math.PI/2; caust.position.y=-2; scene.add(caust);
const seabed=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000,220,220), new THREE.MeshPhongMaterial({color:0x7c7a5e,flatShading:true}));
seabed.rotation.x=-Math.PI/2; displacePlane(seabed.geometry,(x,z)=>noise2(x*.003,z*.003)*22-36); scene.add(seabed);

/* Island + palms */
const ISLAND_Y=3.2; const island=new THREE.Group(); scene.add(island);
const islandMesh=new THREE.Mesh(new THREE.CircleGeometry(120,64), new THREE.MeshPhongMaterial({color:0xd6c29a})); islandMesh.rotation.x=-Math.PI/2; islandMesh.position.y=ISLAND_Y; island.add(islandMesh);
for(let i=0;i<18;i++){ const p=makePalm(); const r=75+Math.random()*35, a=Math.random()*Math.PI*2; p.position.set(Math.cos(a)*r,ISLAND_Y,Math.sin(a)*r); island.add(p); }
const foamRing=new THREE.Mesh(new THREE.RingGeometry(120,126,180), new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.24,side:THREE.DoubleSide})); foamRing.rotation.x=-Math.PI/2; foamRing.position.y=.16; scene.add(foamRing);

/* Dhow + bank ring */
const dhow=new THREE.Group();
const hull=new THREE.Mesh(new THREE.BoxGeometry(40,8,14), new THREE.MeshPhongMaterial({color:0x7a5533})); hull.position.y=2; hull.rotation.y=.3; dhow.add(hull);
const mast=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,26,10), new THREE.MeshPhongMaterial({color:0x7a5533})); mast.position.set(0,13,0); dhow.add(mast);
const sail=new THREE.Mesh(new THREE.PlaneGeometry(28,16,20,1), new THREE.MeshPhongMaterial({color:0xffffff,side:THREE.DoubleSide})); sail.position.set(11,10,0); sail.rotation.set(0,Math.PI/2.4,0); dhow.add(sail);
dhow.position.set(-30,1,-200); scene.add(dhow);
const bankRing=new THREE.Mesh(new THREE.TorusGeometry(22,.7,16,64), new THREE.MeshBasicMaterial({color:0xffe28a})); bankRing.rotation.x=Math.PI/2; bankRing.position.set(-30,-6,-200); scene.add(bankRing);

/* World pins */
function labelSprite(text,color='#ffe28a'){const c=document.createElement('canvas'),w=256,h=128; c.width=w;c.height=h;const x=c.getContext('2d'); x.fillStyle='rgba(5,33,41,.6)';x.fillRect(12,12,w-24,h-40);x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=3;x.strokeRect(12,12,w-24,h-40);x.fillStyle=color;x.font='bold 42px ui-sans-serif,system-ui,Segoe UI,Roboto,Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,h/2);const tex=new THREE.CanvasTexture(c);return new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}))}
const boatPin=labelSprite('Boat','#ffe28a'); boatPin.scale.set(28,14,1); boatPin.position.set(0,22,0); dhow.add(boatPin);
const islandPin=labelSprite('Island','#ffffff'); islandPin.scale.set(28,14,1); islandPin.position.set(0,24,0); island.add(islandPin);

/* Nearest pearl beacon */
const beacon=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,50,12,1,true), new THREE.MeshBasicMaterial({color:0x74fff2,transparent:true,opacity:.35,side:THREE.DoubleSide})); beacon.visible=false; scene.add(beacon);
let beaconTimer=0; function updateBeacon(){const me=controls.getObject().position; let best=null,min=Infinity; for(const pr of pearls){ if(!pr.userData.active) continue; const d=pr.position.distanceTo(me); if(d<min){min=d;best=pr;} } if(best){beacon.visible=true; beacon.position.copy(best.position); beacon.position.y+=25;} else beacon.visible=false;}

/* Spawners */
let oysters=[], pearls=[], jellies=[], artifacts=[], fish=[], stars=null;

function spawnOysters(n){
  const oG=new THREE.SphereGeometry(2,16,16),
        oM1=new THREE.MeshPhongMaterial({color:0xa28f72,flatShading:true}),
        oM2=new THREE.MeshPhongMaterial({color:0xc1b496,flatShading:true}),
        pM=new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xaa8844,shininess:120,specular:0xffffff});
  for(let i=0;i<n;i++){
    const top=new THREE.Mesh(oG,oM2), bot=new THREE.Mesh(oG,oM1); top.scale.set(1.2,.4,1.2); bot.scale.set(1.2,.4,1.2); bot.rotation.z=Math.PI;
    const o=new THREE.Group(); o.add(top); o.add(bot);
    const x=rand(-1200,1200), z=rand(-1200,1200), y=-30+noise2(x*.004,z*.004)*14;
    o.position.set(x,y,z); o.userData.open=0; scene.add(o); oysters.push(o);
    const p=new THREE.Mesh(new THREE.SphereGeometry(.8,16,16), pM.clone()); p.position.set(x,y+.8,z); p.userData.active=true; scene.add(p); pearls.push(p);
  }
}
function spawnJellies(n){
  for(let i=0;i<n;i++){ const j=makeJelly(); j.position.set(rand(-1200,1200),-20,rand(-1200,1200)); j.userData.phase=Math.random()*Math.PI*2; jellies.push(j); scene.add(j); }
}
function spawnFish(n=60){
  const mat=new THREE.MeshPhongMaterial({color:0x6be0ff,emissive:0x1c496b,flatShading:true});
  for(let i=0;i<n;i++){ const body=new THREE.Mesh(new THREE.ConeGeometry(0.6,1.8,8),mat.clone()); const f=new THREE.Group(); body.rotation.x=Math.PI/2; f.add(body); f.position.set(rand(-1400,1400),rand(-60,-8),rand(-1400,1400)); f.userData={angle:Math.random()*Math.PI*2,speed:6+Math.random()*6,height:f.position.y,sway:Math.random()*2}; scene.add(f); fish.push(f); }
}

/* Game state + chapters */
const state={running:false,paused:false,mode:null,chapterIndex:0,chapter:null,startTime:0,timeLimit:300,score:0,carried:0,mult:1,oxy:100,hq:true,sens:1};
const CHAPTERS=[
  {name:'Chapter 1 — Shallow Waters', quest:'Collect 5 pearls and bank them', time:240, setup:()=>{ dayLighting();  spawnOysters(30); spawnJellies(8);  spawnFish(40);} },
  {name:'Chapter 2 — The Falcon’s Compass', quest:'Find the Falcon Compass and bank 1 pearl', time:260, setup:()=>{ sunsetLighting(); spawnOysters(25); spawnJellies(12); addArtifact('compass'); spawnFish(60);} },
  {name:'Chapter 3 — Moonlight Harvest', quest:'Night dive: collect 10 pearls and avoid jellies', time:240, setup:()=>{ nightLighting(); addStars(); spawnOysters(36); spawnJellies(16); spawnFish(80);} }
];
function renderChapters(){ const wrap=qs('#chapters'); wrap.innerHTML=''; CHAPTERS.forEach((ch,i)=>{ const b=document.createElement('button'); b.className='pill'; b.textContent=ch.name.replace('Chapter ','Ch '); b.addEventListener('click',()=>beginChapter(i,true)); wrap.appendChild(b); }); }
function startAdventure(){ resetWorld(); state.mode='adventure'; state.timeLimit=300; state.score=0; state.carried=0; state.mult=1; state.oxy=100; playIntroThen(()=>{ spawnOysters(60); spawnJellies(18); spawnFish(90); setQuest('Collect as many pearls as you can and bank them!'); }); }
function beginChapter(i,fresh=false){ resetWorld(); state.mode='story'; state.chapterIndex=i; const ch=CHAPTERS[i]; state.chapter=ch; state.timeLimit=ch.time; state.score=fresh?0:state.score; ch.setup(); playIntroThen(()=>{ prompt.innerHTML=`<h3>${ch.name}</h3><p>${ch.quest}</p>`; prompt.classList.remove('hidden'); setTimeout(()=>prompt.classList.add('hidden'),2600); setQuest(ch.quest); }); }
function endChapter(){ state.running=false; controls.unlock(); const last=(state.mode==='story'&&state.chapterIndex===CHAPTERS.length-1); qs('#overTitle').textContent= last?'Season Complete — You Win!':'Mission Complete'; qs('#finalScore').textContent=state.score; show(over); if(state.mode==='story' && !last) state.chapterIndex++; }
function playIntroThen(after){ controls.getObject().position.set(0,6,60); camera.lookAt(-30,6,-200); hideAll(); cinema.classList.remove('hidden'); state.afterIntro=after; }
function endIntro(){ cinema.classList.add('hidden'); state.startTime=performance.now(); state.running=true; if(typeof state.afterIntro==='function') state.afterIntro(); if(!isTouch) controls.lock(); }
function resume(){ pausePanel.classList.add('hidden'); if(!isTouch) controls.lock(); state.paused=false; }

/* World helpers */
function resetWorld(){ [...oysters,...pearls,...jellies,...artifacts,...fish].forEach(m=>scene.remove(m)); oysters=[]; pearls=[]; jellies=[]; artifacts=[]; fish=[]; if(stars){scene.remove(stars); stars=null;} dayLighting(); controls.getObject().position.set(0,6,60); [prompt,cinema].forEach(x=>x.classList.add('hidden')); quest.classList.add('hidden'); }
function setQuest(txt){ quest.textContent=txt; quest.classList.remove('hidden'); }
function dayLighting(){ scene.background.set(0x87c9f5); scene.fog.color.set(0x8ed0f7); scene.fog.density=.0022; hemi.intensity=.95; sun.color.set(0xffeecc); sun.intensity=1.0; tint.style.opacity=0; }
function sunsetLighting(){ scene.background.set(0xffc387); scene.fog.color.set(0xff9866); scene.fog.density=.003; hemi.intensity=.8; sun.color.set(0xffc387); sun.intensity=.8; tint.style.opacity=0; }
function nightLighting(){ scene.background.set(0x03161c); scene.fog.color.set(0x0b3c4a); scene.fog.density=.010; hemi.intensity=.5; sun.intensity=.25; tint.style.opacity=0.15; }
function addStars(){ const starGeo=new THREE.BufferGeometry(); const N=2000; const pos=new Float32Array(N*3); for(let i=0;i<N;i++){ const r=2200+Math.random()*400, th=Math.random()*Math.PI*2, ph=Math.random()*Math.PI; pos[i*3]=Math.sin(ph)*Math.cos(th)*r; pos[i*3+1]=Math.cos(ph)*r; pos[i*3+2]=Math.sin(ph)*Math.sin(th)*r; } starGeo.setAttribute('position', new THREE.BufferAttribute(pos,3)); const starMat=new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:true}); stars=new THREE.Points(starGeo,starMat); scene.add(stars); }
function addArtifact(kind){ if(kind==='compass'){ const g=new THREE.TorusKnotGeometry(1.2,.35,80,12); const m=new THREE.MeshPhongMaterial({color:0xffdd88,emissive:0x553300,shininess:80}); const mesh=new THREE.Mesh(g,m); mesh.position.set(rand(-900,900),-24,rand(-900,900)); mesh.userData.kind='compass'; scene.add(mesh); artifacts.push(mesh);} const chest=new THREE.Mesh(new THREE.BoxGeometry(3,2,2), new THREE.MeshPhongMaterial({color:0x8b5a2b})); chest.position.set(rand(-900,900),-28,rand(-900,900)); chest.userData.kind='chest'; scene.add(chest); artifacts.push(chest); }

/* Input / movement */
const keys={};
addEventListener('keydown',e=>{ keys[e.code]=true; if(e.code==='KeyP'){ state.paused=!state.paused; pausePanel.classList.toggle('hidden',!state.paused); if(state.paused) controls.unlock(); else if(!isTouch) controls.lock(); } if(e.code==='KeyE'){ interact(); } if(e.code==='KeyM'){ master.gain.value = master.gain.value>0 ? 0 : .6; }});
addEventListener('keyup',e=> keys[e.code]=false);

const vel=new THREE.Vector3();

/* ---------- Mobile virtual joysticks ---------- */
let leftStick={dx:0,dy:0,active:false}, rightStick={dx:0,dy:0,active:false};
let tUp=false, tDown=false;

function bindStick(rootId,out){
  const root=document.getElementById(rootId); if(!root) return;
  const knob=root.querySelector('.knob'); let pid=null, rect=null, radius=0;
  const setKnob=(px,py)=> knob.style.transform=`translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
  const reset=()=>{ out.dx=0; out.dy=0; out.active=false; setKnob(0,0); };

  root.addEventListener('pointerdown',e=>{
    e.preventDefault();
    if(pid!==null) return;
    root.setPointerCapture(e.pointerId);
    pid=e.pointerId; rect=root.getBoundingClientRect(); radius=rect.width*0.5;
    move(e);
    out.active=true;
  });

  const move=e=>{
    e.preventDefault();
    if(pid!==e.pointerId) return;
    const cx=rect.left+radius, cy=rect.top+radius;
    const dx=e.clientX-cx, dy=e.clientY-cy;
    const len=Math.hypot(dx,dy)||1;
    const cl=Math.min(len, radius-20);
    const nx=dx/len*cl, ny=dy/len*cl;
    setKnob(nx,ny);
    out.dx =  dx/ radius;
    out.dy =  dy/ radius;
  };

  const up=e=>{
    e.preventDefault();
    if(pid!==e.pointerId) return;
    root.releasePointerCapture(e.pointerId);
    pid=null;
    reset();
  };

  root.addEventListener('pointermove',move);
  root.addEventListener('pointerup',up);
  root.addEventListener('pointercancel',up);
  reset();
}
if(isTouch){
  bindStick('joyL',leftStick); bindStick('joyR',rightStick);
  qs('#tUp')   ?.addEventListener('touchstart',()=>tUp=true,{passive:false});
  qs('#tUp')   ?.addEventListener('touchend',()=>tUp=false,{passive:false});
  qs('#tDown') ?.addEventListener('touchstart',()=>tDown=true,{passive:false});
  qs('#tDown') ?.addEventListener('touchend',()=>tDown=false,{passive:false});
  qs('#tUse')  ?.addEventListener('touchstart',()=>interact(),{passive:false});
  qs('#tPause')?.addEventListener('touchstart',()=>{ state.paused=!state.paused; pausePanel.classList.toggle('hidden',!state.paused); },{passive:false});
}

/* Movement step */
function step(dt){
  const speed=(keys['ShiftLeft']||keys['ShiftRight'])?28:16;
  vel.set(0,0,0);

  // Desktop keys
  if(keys['KeyW']) vel.z+=1;
  if(keys['KeyS']) vel.z-=1;
  if(keys['KeyA']) vel.x-=1;
  if(keys['KeyD']) vel.x+=1;
  if(keys['Space']) vel.y+=1;
  if(keys['ControlLeft']||keys['ControlRight']) vel.y-=1;

  // Mobile sticks
  if(isTouch){
    vel.x += leftStick.dx;
    vel.z += -leftStick.dy;      // drag up = forward
    if(tUp)   vel.y += 1;
    if(tDown) vel.y -= 1;

    // look
    const yawObj=controls.getObject();
    const look=1.6*(state.sens||1);
    yawObj.rotation.y   -= rightStick.dx * look * dt;
    camera.rotation.x    = THREE.MathUtils.clamp(
      camera.rotation.x - rightStick.dy*(look*0.8)*dt,
      -Math.PI/2+0.05, Math.PI/2-0.05
    );
  }

  vel.normalize().multiplyScalar(speed*dt);
  controls.moveRight(vel.x);
  controls.moveForward(vel.z);
  controls.getObject().position.y += vel.y;
  controls.getObject().position.y = THREE.MathUtils.clamp(controls.getObject().position.y,-72,40);

  // Water / O2 feedback
  const uw = controls.getObject().position.y < 0;
  if(uw){ state.oxy=Math.max(0,state.oxy-0.012*dt*60); scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,.012,.08); scene.fog.color.set(0x2a7ea6); tint.style.opacity=.55; }
  else  { state.oxy=Math.min(100,state.oxy+0.35);       scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,.0025,.08); scene.fog.color.set(0x8ed0f7); tint.style.opacity=0; }
}

function interact(){
  if(!state.running||state.paused) return;
  const p=controls.getObject().position;

  // collect nearest pearl
  let nearest=null, dist=4;
  for(const pr of pearls){ if(!pr.userData.active) continue; const d=pr.position.distanceTo(p); if(d<dist){dist=d; nearest=pr;} }
  if(nearest){ nearest.userData.active=false; nearest.visible=false; state.carried++; collect(); return; }

  // bank
  if(p.distanceTo(bankRing.position)<22){
    if(state.carried>0){ state.score+=Math.floor(state.carried*12*state.mult); state.carried=0; state.mult=Math.min(6,state.mult+.8); }
    state.oxy=Math.min(100,state.oxy+.65);
  }

  // artifacts
  for(const a of artifacts){
    if(a.visible && a.position.distanceTo(p)<4){
      a.visible=false; tone(784,.3,'triangle',.3);
      state.score += (a.userData.kind==='chest'?200:120);
      prompt.innerHTML=(a.userData.kind==='chest')
        ? '<h3>Treasure Chest!</h3><p>Trade tokens and ornaments from historic souqs.</p>'
        : '<h3>Artifact Found!</h3><p>The Falcon Compass guided navigators using stars and currents.</p>';
      prompt.classList.remove('hidden'); setTimeout(()=>prompt.classList.add('hidden'),3000);
    }
  }
}

/* HUD / leaderboard */
const timeEl=qs('#time'), scoreEl=qs('#score'), multEl=qs('#mult'), carriedEl=qs('#carried'), oxyFill=qs('#o2fill');
const fmt=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
function setOxy(v){ v=Math.max(0,Math.min(100,v)); oxyFill.style.width=v+'%'; oxyFill.style.background = v>50 ? 'linear-gradient(90deg,#60eac2,#1aa5a1)' : (v>25 ? 'linear-gradient(90deg,#ffd166,#f3a712)' : 'linear-gradient(90deg,#ef476f,#e63946)'); }
function updateHUD(){ hud.classList.remove('hidden'); const rem=Math.max(0,state.timeLimit-Math.floor((performance.now()-state.startTime)/1000)); timeEl.textContent=fmt(rem); scoreEl.textContent=state.score; multEl.textContent=state.mult.toFixed(1); carriedEl.textContent=state.carried; setOxy(state.oxy); if(rem<=0) endChapter(); }
function saveScore(){ const name=(qs('#playerName').value||'Anon').slice(0,30); const row={name,score:state.score,when:Date.now()}; const key='pq3d.leaders'; const arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.push(row); arr.sort((a,b)=>b.score-a.score); localStorage.setItem(key, JSON.stringify(arr.slice(0,20))); renderLeaders(); show(board); }
function renderLeaders(){ const key='pq3d.leaders'; const arr=JSON.parse(localStorage.getItem(key)||'[]'); const ol=qs('#leaders'); ol.innerHTML = arr.map(r=>`<li>${r.name} — <b>${r.score}</b></li>`).join('') || '<li>No scores yet</li>'; }

/* -------- Radar drawing (arrow flipped 180°) -------- */
function drawRadar(){
  const ctx=rctx, W=radar.width, H=radar.height, cx=W/2, cy=H/2;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(4,25,31,0.65)'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(96,234,194,.35)'; ctx.lineWidth=2;
  for(let i=1;i<=3;i++){ ctx.beginPath(); ctx.arc(cx,cy,(i*cx)/3,0,Math.PI*2); ctx.stroke(); }

  const fwd=new THREE.Vector3(); controls.getDirection(fwd).normalize();
  const right=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
  const yaw=Math.atan2(fwd.x,fwd.z);

  // center arrow rotated 180°
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(-yaw + Math.PI);
  ctx.fillStyle='#60eac2'; ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(-7,7); ctx.lineTo(7,7); ctx.closePath(); ctx.fill(); ctx.restore();

  const me=controls.getObject().position.clone(); const scale=0.05; const radius=cx-8;
  function pip(pos,color='#b5f5ff',size=4){
    const d=new THREE.Vector3().subVectors(pos,me);
    const xLocal=d.dot(right), yLocal=d.dot(fwd);
    const x=cx + xLocal*scale, y=cy - yLocal*scale;
    if((x-cx)*(x-cx)+(y-cy)*(y-cy) > radius*radius) return;
    ctx.fillStyle=color; ctx.fillRect(x-size/2,y-size/2,size,size);
  }
  pip(dhow.position,'#ffe28a',5);
  pip(island.position,'#ffffff',5);
  let shown=0; for(const pr of pearls){ if(pr.userData.active){ pip(pr.position,'#b5f5ff',3); if(++shown>120) break; } }
}

/* ------------ Animation loop ------------ */
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); const dt=(animate._t?(now-animate._t):16)/1000; animate._t=now;
  if(state.running && !state.paused){
    step(dt); updateHUD();
    clouds.children.forEach((c,i)=>{ c.position.x += Math.sin(now*.0001+i)*.02; });
    const p=controls.getObject().position;
    for(const o of oysters){ const d=o.position.distanceTo(p); o.userData.open+=((d<6?1:0)-o.userData.open)*0.1; o.children[0].rotation.z=-o.userData.open*1.1; }
    pearls.forEach(pr=> pr.rotation.y += dt*1.5);
    jellies.forEach(j=>{ j.userData.phase+=dt*.7; j.position.y=-22+Math.sin(j.userData.phase)*4; j.position.x+=Math.sin(j.userData.phase*.6)*.12; j.position.z+=Math.cos(j.userData.phase*.5)*.12; if(j.position.distanceTo(p)<2.6){ state.oxy=Math.max(0,state.oxy-18*dt*1.5); } });
    fish.forEach(f=>{ f.userData.angle += dt*(.4+Math.random()*.2); f.position.x += Math.cos(f.userData.angle)*dt*f.userData.speed; f.position.z += Math.sin(f.userData.angle*.9)*dt*f.userData.speed; f.position.y = f.userData.height + Math.sin(now*.001 + f.userData.sway)*2; });
    caust.material.map.offset.x += dt*0.02; caust.material.map.offset.y += dt*0.04;
    beaconTimer += dt; if(beaconTimer>1.0){ updateBeacon(); beaconTimer=0; }
    drawRadar();
  }
  renderer.setPixelRatio(state.hq?Math.min(devicePixelRatio,2):1);
  renderer.render(scene,camera);
}
animate();

/* ------------ Utils ------------ */
function rand(a,b){return a+Math.random()*(b-a)}
function noise2(x,y){return(Math.sin(x*2.1+Math.sin(y*1.3))*.5+Math.sin(y*2.7+Math.sin(x*.7))*.5)}
function displacePlane(g,fn){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,fn(x,z))}p.needsUpdate=true;g.computeVertexNormals()}
function makePalm(){const g=new THREE.Group();const h=10;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.4,.6,h,8),new THREE.MeshPhongMaterial({color:0x7a5533}));trunk.position.y=h/2;g.add(trunk);for(let i=0;i<6;i++){const leaf=new THREE.Mesh(new THREE.PlaneGeometry(6,2),new THREE.MeshLambertMaterial({color:0x1e6f5c,side:THREE.DoubleSide}));leaf.position.set(0,h+3,0);leaf.rotation.set(0,i*Math.PI/3,-Math.PI/6);g.add(leaf)}return g}
function makeJelly(){const g=new THREE.Group();const bell=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,16),new THREE.MeshPhongMaterial({color:0xbf80ff,emissive:0x442266,shininess:60}));g.add(bell);const mat=new THREE.LineBasicMaterial({color:0xd2a0ff});for(let i=0;i<6;i++){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(rand(-.6,.6),-2.4-rand(0,1),rand(-.6,.6))]);g.add(new THREE.Line(geo,mat))}return g}
function genCaustics(w,h){const d=new Uint8Array(w*h*4);let i=0;for(let y=0;y<h;y++){for(let x=0;x<w;x++){const n=(Math.sin(x*.2)+Math.sin(y*.27)+Math.sin((x+y)*.13))*.33;const v=Math.max(0,Math.min(255,180+n*70));d[i++]=v;d[i++]=v;d[i++]=255;d[i++]=255}}return d}
function makeClouds(n=16){const grp=new THREE.Group();for(let i=0;i<n;i++){const tex=cloudTexture(256,128);const mat=new THREE.SpriteMaterial({map:tex,depthWrite:false,transparent:true,opacity:.65});const spr=new THREE.Sprite(mat);spr.scale.set(300+Math.random()*200,150+Math.random()*120,1);spr.position.set((Math.random()-.5)*2500,280+Math.random()*80,(Math.random()-.5)*2500);grp.add(spr)}return grp}
function cloudTexture(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');const grd=ctx.createLinearGradient(0,0,0,h);grd.addColorStop(0,'rgba(255,255,255,.9)');grd.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);for(let i=0;i<20;i++){const r=20+Math.random()*40;const x=Math.random()*w;const y=Math.random()*(h*.6);const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}return new THREE.CanvasTexture(c)}
