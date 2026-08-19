"use strict";

// ─────────────────────────────────────────────────────────────
// Constants & Configuration
// ─────────────────────────────────────────────────────────────
const WIDTH    = 1280;
const HEIGHT   = 720;
const BASE_MAX_AMMO = 6;

const SCORE_KEY       = "typeEmDead.highScore";
const BEST_COMBO_KEY  = "typeEmDead.bestCombo";
const KILLS_KEY       = "typeEmDead.totalKills";
const CASH_KEY        = "typeEmDead.bountyCash";
const UPGRADES_KEY    = "typeEmDead.upgrades";
const DIFFICULTY_KEY  = "typeEmDead.difficulty";
const LEADERBOARD_KEY = "typeEmDead.leaderboard";
const ACHIEVEMENTS_KEY= "typeEmDead.achievements";

const CREAM = [255, 235, 184];
const INK   = [39,  24,  18];
const GOLD  = [255, 195, 64];
const RED   = [204, 54,  43];
const GREEN = [80,  200, 100];
const CYAN  = [80,  220, 240];
const PURPLE= [160, 80,  220];

const ENEMY_TYPES = {
  RUSTLER:    { words: ["dusty","spur","cactus","saddle","prairie","wagon","lasso","ranch","bronco","adobe","mesa","creek","gulch","tumbleweed","posse"], coat:[105,61,42],   hat:[76,43,25],   cooldown:5.8,  phases:1, reward:100, tag:"STEADY SHOT" },
  GUNSLINGER: { words: ["draw","quick","duel","bolt","aim","lead","shot","fire","gun","bang","fast","cold","steel","spark","grit"],          coat:[49,69,91],    hat:[30,41,53],   cooldown:4.05, phases:1, reward:150, tag:"FAST DRAW"   },
  OUTLAW:     { words: ["rattler","saloon","railroad","dynamite","canyon","renegade","hideout","ambush","bandit","bounty","outlaw","marshal","wanted","fugitive"], coat:[116,40,38], hat:[75,25,25], cooldown:5.0, phases:1, reward:220, tag:"HARD TARGET" },
  CAPTAIN:    { words: ["deadeye","showdown","blackjack","sixshooter","frontier","governor","territory","stagecoach","ironclad","warlord"], coat:[74,44,101], hat:[45,25,67], cooldown:4.45, phases:2, reward:450, tag:"ARMOURED • 2 ROUNDS" },
  BOSS:       { words: ["tycoon","locomotive","avalanche","sovereign","ironclad","overlord","catastrophe","annihilation","conqueror","juggernaut"], coat:[25,25,35], hat:[180,150,50], cooldown:3.8, phases:4, reward:1200, tag:"SHOWDOWN TARGET" },
  CIVILIAN:   { words: ["innocent","friend","doctor","mayor","baker","teacher"], coat:[60,140,80], hat:[180,160,120], cooldown:9.0, phases:1, reward:-250, tag:"CIVILIAN • DO NOT SHOOT!", isCivilian: true },
  BONUS:      { words: ["gold","luck","boon","prize","jackpot"], coat:[220,180,40], hat:[255,215,80], cooldown:3.8, phases:1, reward:0, tag:"GOLDEN BANDIT • QUICK!", isBonus: true }
};

// Difficulty presets — picked before every ride, persisted for convenience.
const DIFFICULTIES = {
  EASY:   { id:"EASY",   label:"GREENHORN",  subtitle:"FORGIVING FRONTIER", cooldownMult:1.35, spawnDelayMult:1.26, ammoBonus:2,  healthBonus:1,  civForgive:true,  civMult:0.60, allowHealing:true  },
  NORMAL: { id:"NORMAL", label:"GUNSLINGER", subtitle:"THE TRUE WEST",      cooldownMult:1.0,  spawnDelayMult:1.0,  ammoBonus:0,  healthBonus:0,  civForgive:false, civMult:1.00, allowHealing:true  },
  HARD:   { id:"HARD",   label:"IRON TRAIL", subtitle:"NO MERCY. NO REGEN.",cooldownMult:0.76, spawnDelayMult:0.72, ammoBonus:0,  healthBonus:-1, civForgive:false, civMult:1.65, allowHealing:false },
};
const DIFFICULTY_ORDER = ["EASY", "NORMAL", "HARD"];

const WAVE_NAMES = [
  "DRY GULCH", "CINDER CREEK", "CARRION RIDGE", "GHOST TOWN",
  "RED ROCK PASS", "BLACKWATER", "CINDER FLATS", "RATTLESNAKE RUN"
];

// Named bosses have visible silhouettes and different combat rules.
const BOSS_VARIANTS = [
  { name:"THE IRON HORSE",     title:"THE IRON HORSE", coat:[36,40,50], hat:[192,146,43], badge:[230,195,78], words:["locomotive","ironclad","tycoon","overlord","juggernaut"], phases:5, cooldown:4.4, gimmick:"ARMOR", flavor:"ARMOURED • BREAK EVERY PLATE" },
  { name:"DEADSHOT VANCE",     title:"THE LAST LONGSHOT", coat:[36,56,76], hat:[25,32,43],  badge:[110,210,240],words:["scope","rifle","sight","range","eagle"], phases:4, cooldown:5.3, gimmick:"SNIPER", chargeDuration:2.25, flavor:"SNIPER • STOP THE RETICLE" },
  { name:"LA SOMBRA",          title:"THE MIDNIGHT DUEL", coat:[59,24,68], hat:[210,80,220], badge:[230,120,235],words:["phantasm","vendetta","obsidian","nightfall","eclipse"], phases:4, cooldown:3.55, gimmick:"FURY", flavor:"RELENTLESS • KEEP MOVING" },
];

// Simple persisted achievements, checked once per run in Game.finishRun().
const ACHIEVEMENTS = [
  { id:"sharpshooter", name:"SHARPSHOOTER", check: g => g.accuracy() >= 95 },
  { id:"clean_hands",  name:"CLEAN HANDS",  check: g => !g.civilianHitThisRun },
  { id:"boss_slayer",  name:"BOSS SLAYER",  check: g => g.bossKilledThisRun },
  { id:"speed_demon",  name:"SPEED DEMON",  check: g => g.wpm() >= 60 },
];

const FONTS = {
  title:   "bold 72px Georgia, 'Times New Roman', serif",
  heading: "bold 36px Georgia, 'Times New Roman', serif",
  body:    "bold 22px Arial, Helvetica, sans-serif",
  small:   "bold 16px Arial, Helvetica, sans-serif",
  tiny:    "bold 13px Arial, Helvetica, sans-serif",
  word:    "bold 28px Georgia, 'Times New Roman', serif",
  code:    "bold 22px 'Courier New', monospace"
};

// ─────────────────────────────────────────────────────────────
// Canvas Vector Helpers
// ─────────────────────────────────────────────────────────────
function rgb(c)        { return `rgb(${c[0]},${c[1]},${c[2]})`; }
function rgba(c, a)    { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function randRange(a,b){ return a + Math.random()*(b-a); }
function randInt(a,b)  { return Math.floor(randRange(a,b)); }
function choice(arr)   { return arr[Math.floor(Math.random()*arr.length)]; }

let ctx = null;

function drawDeputyBadge(x, y) {
  ctx.save();
  rectShape([20, 15, 12], [x, y, 160, 36], 0, 8);
  rectShape([255, 195, 64], [x, y, 160, 36], 1.5, 8);

  ctx.font = "bold 24px Georgia, serif";
  ctx.fillStyle = "rgb(255, 195, 64)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("★", x + 10, y + 18);

  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillStyle = "rgb(255, 235, 184)";
  ctx.fillText("DEPUTY'S BADGE", x + 39, y + 18);
  ctx.restore();
}

function polygon(color, points) {
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i=1; i<points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath(); ctx.fill();
}
function ellipseRect(color, rect, width=0) {
  const [x,y,w,h] = rect;
  ctx.beginPath();
  ctx.ellipse(x+w/2, y+h/2, Math.max(w/2,0.01), Math.max(h/2,0.01), 0, 0, Math.PI*2);
  if (width) { ctx.lineWidth=width; ctx.strokeStyle=rgb(color); ctx.stroke(); }
  else       { ctx.fillStyle=rgb(color); ctx.fill(); }
}
function circle(color, cx, cy, r, width=0) {
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(r,0.01), 0, Math.PI*2);
  if (width) { ctx.lineWidth=width; ctx.strokeStyle=rgb(color); ctx.stroke(); }
  else       { ctx.fillStyle=rgb(color); ctx.fill(); }
}
function line(color, p1, p2, width=1) {
  ctx.beginPath(); ctx.lineCap="round";
  ctx.lineWidth=width; ctx.strokeStyle=rgb(color);
  ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]); ctx.stroke();
}
function roundRectPath(x,y,w,h,r) {
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y); ctx.lineTo(x+w-rr,y); ctx.arcTo(x+w,y,x+w,y+rr,rr);
  ctx.lineTo(x+w,y+h-rr); ctx.arcTo(x+w,y+h,x+w-rr,y+h,rr);
  ctx.lineTo(x+rr,y+h); ctx.arcTo(x,y+h,x,y+h-rr,rr);
  ctx.lineTo(x,y+rr); ctx.arcTo(x,y,x+rr,y,rr); ctx.closePath();
}
function rectShape(color, r, width=0, radius=0) {
  const [x,y,w,h]=r;
  if (radius) roundRectPath(x,y,w,h,radius);
  else { ctx.beginPath(); ctx.rect(x,y,w,h); }
  if (width) { ctx.lineWidth=width; ctx.strokeStyle=rgb(color); ctx.stroke(); }
  else       { ctx.fillStyle=rgb(color); ctx.fill(); }
}
function textTL(text, x, y, font, color) {
  ctx.font=font; ctx.textAlign="left"; ctx.textBaseline="top";
  ctx.fillStyle=rgb(color); ctx.fillText(text,x,y);
}
function textWidth(text, font) {
  ctx.font=font; return ctx.measureText(text).width;
}

// ─────────────────────────────────────────────────────────────
// Audio Engine with Pre-Buffered White Noise
// ─────────────────────────────────────────────────────────────
let audioCtx = null;
let globalNoiseBuffer = null;
let SOUND_MUTED = false;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return audioCtx;
}

function getNoiseBuffer(ac) {
  if (!globalNoiseBuffer) {
    const bufSize = ac.sampleRate * 2;
    globalNoiseBuffer = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = globalNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  }
  return globalNoiseBuffer;
}

function playTone(type, freq, duration, volume=0.18, decay=true) {
  if (SOUND_MUTED) return;
  const ac = getAudioCtx(); if (!ac) return;
  try {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (decay) osc.frequency.exponentialRampToValueAtTime(freq*0.3, ac.currentTime+duration);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime+duration);
  } catch(e) {}
}

function playNoise(duration, volume=0.12) {
  if (SOUND_MUTED) return;
  const ac = getAudioCtx(); if (!ac) return;
  try {
    const src  = ac.createBufferSource();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type="bandpass"; filter.frequency.value=800; filter.Q.value=0.5;
    src.buffer = getNoiseBuffer(ac);
    src.connect(filter); filter.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+duration);
    src.start(); src.stop(ac.currentTime+duration);
  } catch(e) {}
}

const SFX = {
  shot()     { playNoise(0.08, 0.25); playTone("sawtooth",180,0.12,0.1); },
  hit()      { playTone("square",220,0.18,0.14); playTone("sawtooth",110,0.22,0.08); },
  kill()     { playNoise(0.14,0.3); playTone("sawtooth",90,0.28,0.18); playTone("sine",440,0.18,0.10); },
  miss()     { playTone("sawtooth",160,0.15,0.10); },
  reload()   { playTone("square",300,0.07,0.08,false); setTimeout(()=>playTone("square",420,0.07,0.08,false),80); },
  deadeye()  { playTone("sine",300,0.5,0.25,false); playTone("triangle",600,0.5,0.15,false); },
  explosion(){ playNoise(0.4, 0.4); playTone("sawtooth",60,0.4,0.3); },
  civilian() { playTone("sine",200,0.3,0.25); playTone("square",150,0.3,0.2); }
};

// ─────────────────────────────────────────────────────────────
// Particle System (Sparks, Smoke, Flying Hats)
// ─────────────────────────────────────────────────────────────
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.hats = [];
  }

  spark(x, y, count=5) {
    for (let i=0; i<count; i++) {
      const angle = randRange(0, Math.PI*2);
      const speed = randRange(40, 140);
      this.particles.push({
        x, y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed - randRange(20,60),
        life: 1.0, decay: randRange(2.5,4.5), r: randRange(2,5),
        color: choice([[255,220,80],[255,180,40],[255,140,20],[255,255,200]])
      });
    }
  }

  smoke(x, y, count=3) {
    for (let i=0; i<count; i++) {
      this.particles.push({
        x: x + randRange(-10, 10), y,
        vx: randRange(-15, 15), vy: randRange(-40, -80),
        life: 1.0, decay: randRange(1.2, 2.0), r: randRange(8, 16),
        color: [180, 170, 160]
      });
    }
  }

  popHat(x, y, hatColor) {
    this.hats.push({
      x, y, vx: randRange(-60, 60), vy: randRange(-180, -260),
      rot: 0, vRot: randRange(-6, 6), color: hatColor, life: 1.2
    });
  }

  update(dt) {
    for (const p of this.particles) {
      p.x += p.vx*dt; p.y += p.vy*dt;
      p.vy += 120*dt;
      p.life -= p.decay*dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const h of this.hats) {
      h.x += h.vx*dt; h.y += h.vy*dt;
      h.vy += 400*dt; h.rot += h.vRot*dt;
      h.life -= dt;
    }
    this.hats = this.hats.filter(h => h.life > 0);
  }

  draw() {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(p.life, 1.0);
      ctx.fillStyle = rgb(p.color);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
    for (const h of this.hats) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);
      rectShape(h.color, [-20, -8, 40, 16], 0, 4);
      ctx.restore();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Persistence & Upgrades
// ─────────────────────────────────────────────────────────────
function loadInt(key) {
  try { const v=parseInt(localStorage.getItem(key),10); return Number.isFinite(v)?Math.max(0,v):0; } catch(e){return 0;}
}
function saveInt(key, value) {
  try { localStorage.setItem(key, String(value)); } catch(e){}
}

function loadUpgrades() {
  const defaults = { ammo: 0, health: 0, deadeye: 0, reload: 0, mercy: 0 };
  try {
    const data = localStorage.getItem(UPGRADES_KEY);
    return data ? Object.assign(defaults, JSON.parse(data)) : defaults;
  } catch(e) { return defaults; }
}
function saveUpgrades(u) {
  try { localStorage.setItem(UPGRADES_KEY, JSON.stringify(u)); } catch(e){}
}

function loadDifficulty() {
  try {
    const v = localStorage.getItem(DIFFICULTY_KEY);
    return DIFFICULTIES[v] ? v : "NORMAL";
  } catch(e) { return "NORMAL"; }
}
function saveDifficulty(id) {
  try { localStorage.setItem(DIFFICULTY_KEY, id); } catch(e){}
}

function loadLeaderboard() {
  try { const d = localStorage.getItem(LEADERBOARD_KEY); return d ? JSON.parse(d) : []; }
  catch(e) { return []; }
}
function recordLeaderboardEntry(score, level) {
  const list = loadLeaderboard();
  list.push({ score, level });
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 5);
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top)); } catch(e){}
  return top;
}

function loadAchievements() {
  try { const d = localStorage.getItem(ACHIEVEMENTS_KEY); return d ? JSON.parse(d) : []; }
  catch(e) { return []; }
}
function saveAchievements(list) {
  try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(list)); } catch(e){}
}

// ─────────────────────────────────────────────────────────────
// Enemy Entity Class
// ─────────────────────────────────────────────────────────────
class Enemy {
  constructor(kind, x, groundY, level, now, staggerOffset=0, diffMult=1) {
    this.kind       = kind;
    this.data       = ENEMY_TYPES[kind];
    this.x          = x;
    this.groundY    = groundY;
    this.scale      = randRange(0.80, 1.05);
    this.phase      = Math.random()*Math.PI*2;
    this.word       = choice(this.data.words);
    this.typed      = "";
    this.phasesLeft = this.data.phases;
    this.cooldown   = Math.max(2.0, this.data.cooldown - level*0.12) * diffMult;
    this.nextFire   = now + randRange(3.0, this.cooldown+1.25) + staggerOffset;
    this.hitUntil   = 0.0;
    this.dead       = false;
    this.cleanWord  = true;
    this.isExplosive= Math.random() < 0.18 && !this.data.isCivilian && !this.data.isBonus && kind !== "BOSS";
    this.currentX   = x;
    this.variant    = null; // set by the game for scripted named bosses
  }

  get expected() { return this.typed.length < this.word.length ? this.word[this.typed.length] : ""; }
  
  getScreenX(now) { 
    return Math.round(this.x + Math.sin(now * 1.8 + this.phase) * 6); 
  }

  fireDue(now) {
    if (now < this.nextFire) return false;
    this.nextFire = now + this.cooldown * randRange(0.92, 1.16);
    return true;
  }

  advanceWord(now) {
    this.phasesLeft -= 1;
    this.hitUntil    = now + 0.22;
    if (this.phasesLeft <= 0) { this.dead = true; return true; }
    const oldWord = this.word;
    const wordPool = this.variant ? this.variant.words : this.data.words;
    const pool    = wordPool.filter(w => w !== oldWord);
    this.word     = choice(pool.length ? pool : wordPool);
    this.typed    = "";
    this.cleanWord= true;
    this.nextFire = now + this.cooldown + 1.1;
    return false;
  }

  draw(now, selected) {
    const x=this.getScreenX(now), baseY=this.groundY, scale=this.scale;
    const width=Math.trunc(104*scale), height=Math.trunc(176*scale);
    const top=baseY-height;
    const coat=this.variant ? this.variant.coat : this.data.coat;
    const hat=this.variant ? this.variant.hat : this.data.hat;

    ellipseRect([34,20,12],[x-width,baseY-9,width*2,28]);

    const legY=baseY-Math.trunc(50*scale);
    polygon(INK,[[x-Math.trunc(30*scale),legY],[x-Math.trunc(7*scale),legY],[x-Math.trunc(11*scale),baseY],[x-Math.trunc(42*scale),baseY]]);
    polygon(INK,[[x+Math.trunc(5*scale),legY],[x+Math.trunc(28*scale),legY],[x+Math.trunc(45*scale),baseY],[x+Math.trunc(15*scale),baseY]]);

    polygon(coat, [
      [x - Math.trunc(43 * scale), baseY - Math.trunc(52 * scale) - 3],
      [x - Math.trunc(34 * scale), top + Math.trunc(78 * scale) - 3],
      [x, top + Math.trunc(65 * scale) - 3],
      [x + Math.trunc(35 * scale), top + Math.trunc(83 * scale) - 3],
      [x + Math.trunc(45 * scale), baseY - Math.trunc(52 * scale) - 3]
    ]);

    ellipseRect(INK,[x-Math.trunc(24*scale),top+Math.trunc(25*scale),Math.trunc(48*scale),Math.trunc(51*scale)]);
    ellipseRect([213,153,98],[x-Math.trunc(20*scale),top+Math.trunc(27*scale),Math.trunc(40*scale),Math.trunc(43*scale)]);

    rectShape(INK,[x-Math.trunc(29*scale),top-Math.trunc(4*scale),Math.trunc(58*scale),Math.trunc(34*scale)],0,6);
    rectShape(hat,[x-Math.trunc(25*scale),top-Math.trunc(1*scale),Math.trunc(50*scale),Math.trunc(29*scale)],0,4);

    if (now<this.hitUntil) circle([255,237,124],x,top+Math.trunc(58*scale),Math.trunc(42*scale),3);
    if (selected)          circle(GOLD,x,top+Math.trunc(49*scale),Math.trunc(34*scale),2);

    const labelY    = Math.max(120, top-50);
    const typedUp   = this.typed.toUpperCase();
    const restUp    = this.word.slice(this.typed.length).toUpperCase();
    const typedW    = textWidth(typedUp, FONTS.word);
    const restW     = textWidth(restUp, FONTS.word);
    const totalWidth= typedW+restW;
    const plateWidth= Math.max(158, totalWidth+38);
    const plate     = [x-plateWidth/2, labelY, plateWidth, 58];

    // Plate background: red flash on miss, bright gold when selected, normal otherwise
    const isMissFlash  = this.missFlashUntil && now < this.missFlashUntil;
    const plateBg      = isMissFlash ? [80,10,10] : [39,26,20];
    const plateBorder  = isMissFlash ? RED
                       : this.data.isCivilian ? GREEN
                       : this.data.isBonus ? GOLD
                       : this.isExplosive ? RED
                       : selected ? GOLD
                       : [150,91,40];
    const plateBorderW = selected ? 3 : 2; // thicker border when locked on

    rectShape(plateBg, plate, 0, 8);
    rectShape(plateBorder, plate, plateBorderW, 8);

    // When locked on, draw a subtle glow behind the plate
    if (selected && !isMissFlash) {
      ctx.save();
      ctx.shadowColor = rgb(GOLD);
      ctx.shadowBlur  = 12;
      rectShape(GOLD, plate, 1, 8);
      ctx.restore();
    }

    textTL(typedUp, x-totalWidth/2, labelY+12, FONTS.word, isMissFlash ? RED : GOLD);
    textTL(restUp,  x-totalWidth/2+typedW, labelY+12, FONTS.word, (this.isExplosive || this.data.isBonus) ? GOLD : CREAM);

    const subText = this.variant ? `${this.variant.name} • ${this.variant.flavor}`
                  : this.data.isBonus ? "✦ GOLDEN BANDIT — QUICK!"
                  : this.isExplosive ? "💥 EXPLOSIVE ROUND"
                  : `${this.kind} • ${this.data.tag}`;
    const subW    = textWidth(subText, FONTS.tiny);
    textTL(subText, x-subW/2, labelY-17, FONTS.tiny, this.data.isCivilian ? GREEN : (this.data.isBonus || this.isExplosive) ? GOLD : CREAM);

    if (!this.data.isCivilian && !this.data.isBonus && this.kind !== "BOSS") {
      const threat = clamp((this.nextFire-now)/this.cooldown, 0.0, 1.0);
      const bar    = [x-48, labelY+63, 96, 5];
      rectShape([51,29,23], bar, 0, 3);
      const barColor = threat>0.6?RED:(threat>0.3?[220,160,30]:GREEN);
      rectShape(barColor,[bar[0],bar[1],Math.round(bar[2]*threat),bar[3]],0,3);
    }

    // Bosses telegraph their shot with a growing warning ring + label.
    if (this.kind === "BOSS") {
      const timeToFire = this.nextFire - now;
      const isSniper = this.variant && this.variant.gimmick === "SNIPER";
      const warningTime = isSniper ? this.variant.chargeDuration : 1.2;
      if (timeToFire < warningTime && timeToFire > -0.3) {
        const braceRatio = 1 - clamp(timeToFire / warningTime, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * braceRatio;
        const ringColor = isSniper ? [110,210,240] : RED;
        circle(ringColor, x, top + Math.trunc(58*scale), Math.trunc((50 + 22*braceRatio) * scale), 4);
        if (isSniper) {
          line(ringColor, [x-66*scale, top+58*scale], [x-28*scale, top+58*scale], 2);
          line(ringColor, [x+28*scale, top+58*scale], [x+66*scale, top+58*scale], 2);
          line(ringColor, [x, top-9*scale], [x, top+27*scale], 2);
          line(ringColor, [x, top+89*scale], [x, top+125*scale], 2);
        }
        const braceText = isSniper ? "RETICLE CHARGING!" : "BRACE!";
        const bw = textWidth(braceText, FONTS.small);
        textTL(braceText, x - bw/2, top - 75, FONTS.small, ringColor);
        ctx.restore();
      }
    }

    if (this.variant) {
      // A visible badge and a variant-specific hat treatment make bosses read
      // as characters rather than enlarged regular enemies.
      const badge = this.variant.badge || GOLD;
      polygon(badge, [[x,top+88*scale],[x+8*scale,top+99*scale],[x+21*scale,top+102*scale],[x+11*scale,top+111*scale],[x+14*scale,top+125*scale],[x,top+117*scale],[x-14*scale,top+125*scale],[x-11*scale,top+111*scale],[x-21*scale,top+102*scale],[x-8*scale,top+99*scale]]);
      if (this.variant.gimmick === "SNIPER") {
        rectShape([18,22,25],[x+19*scale,top+41*scale,37*scale,7*scale],0,4);
        circle([110,210,240],x+52*scale,top+44*scale,8*scale);
      } else if (this.variant.gimmick === "ARMOR") {
        rectShape([145,150,160],[x-34*scale,top+102*scale,68*scale,10*scale],2,3);
      }
    }

    if (this.data.isBonus) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now * 9);
      circle(GOLD, x, top+70*scale, 54*scale, 4);
      ctx.restore();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Game Core Class
// ─────────────────────────────────────────────────────────────
class Game {
  constructor(images) {
    this.images     = images;
    this.background = coverCanvas(images.town, WIDTH, HEIGHT);
    this.particles  = new ParticleSystem();

    this.dust = Array.from({length:85}, ()=>[randInt(0,WIDTH),randInt(160,HEIGHT-70),choice([1,1,2,2,3]),randRange(13,42)]);
    this.tumbleweeds = Array.from({length:4}, ()=>[randInt(0,WIDTH),choice([565,610,655]),randRange(13,25),randRange(18,40)]);
    this.spawnSpots = [[144,475],[302,455],[480,525],[644,500],[805,510],[962,470],[1123,515]];

    this.highScore  = loadInt(SCORE_KEY);
    this.bestCombo  = loadInt(BEST_COMBO_KEY);
    this.totalKills = loadInt(KILLS_KEY);
    this.bountyCash = loadInt(CASH_KEY);
    this.upgrades   = loadUpgrades();
    this.difficultyId = loadDifficulty();
    this.leaderboard = loadLeaderboard();
    this.unlockedAchievements = loadAchievements();
    this.newlyUnlocked = [];

    this.fadeAlpha  = 0.0;
    this.fadeDir    = -1;
    this.fadeTarget = null;

    this.deadeyeActive = false;
    this.deadeyeEnergy = 0;
    this.muted = false;
    this.shopReturn = "TITLE";

    this.state = "TITLE";
    this.reset(0.0);
    this.state = "TITLE";
  }

  get difficulty() { return DIFFICULTIES[this.difficultyId]; }
  get maxAmmo()    { return Math.max(3, BASE_MAX_AMMO + this.upgrades.ammo*2 + this.difficulty.ammoBonus); }
  get maxHealth()  { return Math.max(1, 3 + this.upgrades.health + this.difficulty.healthBonus); }
  get reloadTime() { return Math.max(0.35, 0.75 - this.upgrades.reload*0.15); }
  get deadeyeGainPerHit() { return 3 + this.upgrades.deadeye; }
  get level()      { return this.wave || 1; }
  get isBossWave() { return this.wave > 0 && this.wave % 5 === 0; }
  get waveQuota()  { return this.isBossWave ? 1 : 6 + Math.min(8, Math.floor((this.wave - 1) * 1.25)); }
  get climate() {
    const climates = [
      { name:"HIGH NOON", tint:[227,106,28], alpha:0.10 },
      { name:"DUSK",      tint:[154,52,46],  alpha:0.30 },
      { name:"NIGHT",     tint:[8,18,55],    alpha:0.52 },
      { name:"SANDSTORM", tint:[193,137,67], alpha:0.38 }
    ];
    return climates[Math.floor((this.wave - 1) / 3) % climates.length];
  }

  waveName() {
    if (this.isBossWave && this.bossVariant) return `SHOWDOWN ${this.wave}: ${this.bossVariant.title}`;
    return `WAVE ${this.wave}: ${WAVE_NAMES[(this.wave - 1) % WAVE_NAMES.length]}`;
  }

  reset(now) {
    this.enemies     = [];
    this.effects     = [];
    this.score       = 0;
    this.kills       = 0;
    this.combo       = 0;
    this.maxCombo    = 0;
    this.health      = this.maxHealth;
    this.ammo        = this.maxAmmo;
    this.selected    = null;
    this.reloadUntil = 0.0;
    this.message     = "THE WEST IS UNFORGIVING. STAY ALERT!";
    this.messageUntil= now+2.5;
    this.nextSpawn   = now+0.55;
    this.invulnerableUntil=0.0;
    this.shakeUntil  = 0.0;
    this.shotShakeUntil=0.0;
    this.playerFlashUntil=0.0;
    this.paused      = false;
    this.deadeyeActive= false;
    this.deadeyeEnergy= 0;
    this.correctKeys = 0;
    this.missEvents  = 0;
    this.startTime   = now;
    this.endTime     = now;
    this.lastHitTime = 0;
    this.phase2Until = 0;
    this.wave        = 1;
    this.waveKills   = 0;
    this.bossVariant = null;
    this.bossSpawned = false;
    this.civilianPasses = (this.difficulty.civForgive ? 1 : 0) + this.upgrades.mercy;
    this.civilianHitThisRun = false;
    this.bossKilledThisRun = false;
    this.runRecorded = false;
    this.shopReturn = "TITLE";
    this.particles   = new ParticleSystem();
    this.beginWave(now, false);
  }

  beginWave(now, showCard=true) {
    this.enemies = [];
    this.selected = null;
    this.waveKills = 0;
    this.bossSpawned = false;
    this.bossVariant = this.isBossWave ? choice(BOSS_VARIANTS) : null;
    this.nextSpawn = now + (this.isBossWave ? 0.6 : 0.45);
    this.messageUntil = now;
    if (this.isBossWave && showCard) {
      this.waveCardUntil = now + 3.0;
      this.state = "WAVE_CARD";
    } else {
      this.state = "PLAYING";
      this.addMessage(`${this.waveName()} — ${this.waveQuota} TARGETS`, now, 1.6);
    }
  }

  startNextWave(now) {
    this.wave += 1;
    this.ammo = this.maxAmmo;
    this.reloadUntil = 0;
    this.beginWave(now, true);
  }

  completeWave(now) {
    this.enemies = [];
    this.selected = null;
    this.deadeyeActive = false;
    this.breatherUntil = now + 1.65;
    this.state = "BREATHER";
    this.addMessage(`WAVE ${this.wave} CLEARED — RETURN TO THE SALOON`, now, 1.55);
    SFX.kill();
  }

  recordHighScore() {
    if (this.score > this.highScore) { this.highScore = this.score; saveInt(SCORE_KEY, this.highScore); }
    if (this.maxCombo > this.bestCombo) { this.bestCombo = this.maxCombo; saveInt(BEST_COMBO_KEY, this.bestCombo); }
  }
  recordKills() {
    this.totalKills += this.kills; saveInt(KILLS_KEY, this.totalKills);
    this.bountyCash += Math.floor(this.score / 10); saveInt(CASH_KEY, this.bountyCash);
  }

  accuracy() { const t=this.correctKeys+this.missEvents; return t?Math.round(100*this.correctKeys/t):100; }
  wpm()      { return Math.round(this.correctKeys/5/Math.max(1,(this.endTime-this.startTime)/60)); }

  togglePause(now) {
    this.paused = !this.paused;
    if (this.paused) { this.pauseFrozenNow=now; this.addMessage("PAUSED — PRESS F1 TO RESUME",now,9999); return; }
    const d = now - this.pauseFrozenNow;
    this.nextSpawn += d; if (this.reloadUntil) this.reloadUntil += d;
    this.invulnerableUntil += d; this.shakeUntil += d;
    for (const e of this.enemies) e.nextFire += d;
  }

  toggleDeadeye(now) {
    if (this.deadeyeEnergy >= 25 && !this.deadeyeActive) {
      this.deadeyeActive = true;
      this.addMessage("DEADEYE ACTIVATED — BULLET TIME!", now, 1.5);
      SFX.deadeye();
    } else if (this.deadeyeActive) {
      this.deadeyeActive = false;
    }
  }

  addMessage(text, now, duration=1.35) { this.message=text; this.messageUntil=now+duration; }

  chooseEnemyKind() {
    if (this.isBossWave) return "BOSS";
    const roll = Math.random();
    const civilianChance = Math.min(0.20, 0.075 * this.difficulty.civMult);
    const bonusChance = this.wave >= 2 ? 0.055 : 0.025;
    if (roll < civilianChance) return "CIVILIAN";
    if (roll < civilianChance + bonusChance) return "BONUS";
    if (this.level >= 3 && roll < 0.27) return "CAPTAIN";
    if (this.level >= 2 && roll < 0.55) return "OUTLAW";
    if (roll < 0.75) return "GUNSLINGER";
    return "RUSTLER";
  }

  spawnEnemy(now) {
    const openSpots = this.spawnSpots.filter(spot => this.enemies.every(e => Math.abs(spot[0]-e.x) > 130));
    const [x,y] = choice(openSpots.length ? openSpots : this.spawnSpots);
    const stagger = this.enemies.length * 0.8;
    const kind = this.chooseEnemyKind();
    if (kind === "BOSS" && this.bossSpawned) return;
    const enemy = new Enemy(kind, x, y, this.level, now, stagger, this.difficulty.cooldownMult);
    if (kind === "BOSS") {
      enemy.variant = this.bossVariant;
      enemy.word = choice(enemy.variant.words);
      enemy.phasesLeft = enemy.variant.phases;
      enemy.cooldown = enemy.variant.cooldown * this.difficulty.cooldownMult;
      enemy.nextFire = now + enemy.cooldown + 1.35;
      enemy.isExplosive = false;
      this.bossSpawned = true;
    }
    this.enemies.push(enemy);
  }

  startReload(now) {
    if (this.reloadUntil > now || this.ammo === this.maxAmmo) return;
    this.reloadUntil = now + this.reloadTime;
    this.addMessage("SPINNING CYLINDER...", now, this.reloadTime);
    SFX.reload();
  }

  finishRun(now) {
    if (this.runRecorded) return;
    this.runRecorded = true;
    this.endTime = now;
    this.recordHighScore();
    this.recordKills();
    this.state = "GAME_OVER";
  }

  grantCleanBonus(target, wasClean=target.cleanWord, wordLength=target.word.length) {
    if (!wasClean || target.data.isCivilian) return 0;
    const reward = 20 + wordLength * 6;
    this.bountyCash += Math.ceil(reward / 2);
    saveInt(CASH_KEY, this.bountyCash);
    return reward;
  }

  grantGoldenLoot(now) {
    const ammoGain = Math.min(2, this.maxAmmo - this.ammo);
    this.ammo += ammoGain;
    const cashGain = 90;
    this.bountyCash += cashGain;
    let healed = 0;
    if (this.difficulty.allowHealing && this.health < this.maxHealth) {
      this.health += 1;
      healed = 1;
    }
    saveInt(CASH_KEY, this.bountyCash);
    const healthText = healed ? " +1 VIGOR" : "";
    this.addMessage(`GOLDEN HAUL! +${ammoGain} AMMO  +$${cashGain}${healthText}`, now, 1.35);
  }

  registerBanditKill(target, now) {
    this.kills += 1;
    this.waveKills += target.kind === "BOSS" ? this.waveQuota : 1;
    if (target.kind === "BOSS") this.bossKilledThisRun = true;
    if (this.waveKills >= this.waveQuota) this.completeWave(now);
  }

  handleLetter(letter, now) {
    if (this.reloadUntil > now) {
      this.addMessage("RELOADING — HOLD ON!", now, 0.4);
      return;
    }
    if (this.ammo <= 0) { this.startReload(now); return; }

    let target = this.selected;
    if (target && target.dead) target = this.selected = null;

    // Wrong letter on a locked target — show exactly what went wrong, keep target locked
    if (target && target.expected !== letter) {
      this.missEvents += 1;
      this.combo = 0;
      SFX.miss();
      const expected = target.expected.toUpperCase();
      const got      = letter.toUpperCase();
      this.addMessage(`WRONG KEY  [ expected ${expected}  got ${got} ]`, now, 0.9);
      target.missFlashUntil = now + 0.35;
      target.typed = "";
      target.cleanWord = false;
      return;
    }

    // Auto-pick the most urgent bandit (fullest threat bar = about to fire)
    if (!target) {
      const candidates = this.enemies.filter(e => !e.data.isCivilian && e.expected === letter);
      if (!candidates.length) {
        const civ = this.enemies.find(e => e.data.isCivilian && e.expected === letter);
        if (civ) {
          this.addMessage("THAT IS A CIVILIAN — DON'T SHOOT!", now, 1.2);
          SFX.miss();
          return;
        }
        this.addMessage("NO BANDIT STARTS WITH  ' " + letter.toUpperCase() + " '", now, 0.6);
        this.missEvents += 1;
        SFX.miss();
        return;
      }
      target = candidates.reduce((a, b) => a.nextFire < b.nextFire ? a : b);
      this.selected = target;
      this.addMessage(`LOCKED ON: ${target.kind}`, now, 0.55);
    }

    target.typed += letter;
    target.hitUntil = now + 0.1;
    this.ammo -= 1;
    this.combo += 1;
    this.deadeyeEnergy = clamp(this.deadeyeEnergy + this.deadeyeGainPerHit, 0, 100);
    this.lastHitTime = now;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.correctKeys += 1;

    this.playerFlashUntil = now + 0.09;
    this.shotShakeUntil  = now + 0.06;
    this.effects.push(["tracer", target.getScreenX(now), target.groundY - Math.trunc(105*target.scale), now+0.1]);
    this.particles.spark(target.getScreenX(now), target.groundY - 80, 4);
    this.particles.smoke(730, 480, 2);
    SFX.shot();

    if (target.typed.length === target.word.length) {
      const wasClean = target.cleanWord;
      const completedWordLength = target.word.length;
      if (target.data.isCivilian) {
        if (this.civilianPasses > 0) {
          this.civilianPasses -= 1;
          this.addMessage("MERCY PASS SPENT — CIVILIAN ESCAPED!", now, 1.25);
        } else {
          this.health -= 1;
          this.civilianHitThisRun = true;
          this.score = Math.max(0, this.score + target.data.reward);
          this.addMessage("YOU SHOT AN INNOCENT CIVILIAN!", now, 1.2);
        }
        this.particles.spark(target.getScreenX(now), target.groundY - 100, 12);
        SFX.civilian();
        target.dead = true;
        this.selected = null;
        if (this.health <= 0) this.finishRun(now);
        return;
      }

      if (target.advanceWord(now)) {
        const cleanReward = this.grantCleanBonus(target, wasClean, completedWordLength);
        const reward = target.data.reward + this.combo*10 + cleanReward;
        this.score += reward;
        this.recordHighScore();

        this.particles.spark(target.getScreenX(now), target.groundY-105, 16);
        this.particles.popHat(target.getScreenX(now), target.groundY-160, target.data.hat);

        if (target.isExplosive) {
          SFX.explosion();
          this.shakeUntil = now + 0.4;
          this.addMessage("EXPLOSIVE ROUND DETONATED!", now, 1.0);
          for (const neighbor of this.enemies) {
            if (neighbor !== target && Math.abs(neighbor.x - target.x) < 280) neighbor.dead = true;
          }
        } else {
          SFX.kill();
        }

        this.shakeUntil = now + 0.22;
        if (target.data.isBonus) this.grantGoldenLoot(now);
        else this.addMessage(`${target.kind} DOWN! +${reward}${cleanReward ? "  • CLEAN WORD!" : ""}`, now, 1.0);
        this.registerBanditKill(target, now);
        this.selected = null;
      } else {
        const cleanReward = this.grantCleanBonus(target, wasClean, completedWordLength);
        if (cleanReward) {
          this.score += cleanReward;
          this.recordHighScore();
        }
        this.phase2Until = now + 0.6;
        this.addMessage(`ARMOUR CRACKED — KEEP FIRING!${cleanReward ? `  +${cleanReward} CLEAN` : ""}`, now, 0.9);
        SFX.hit();
      }
    }
    if (this.ammo === 0) this.startReload(now);
  }

  takeHit(enemy, now, damage=1) {
    if (now < this.invulnerableUntil || enemy.data.isCivilian) return;
    this.health -= damage; this.selected = null; this.combo = 0;
    this.invulnerableUntil = now + 0.7;
    this.shakeUntil = now + 0.25;
    this.effects.push(["incoming", enemy.getScreenX(now), enemy.groundY-100, now+0.22]);
    this.addMessage(damage > 1 ? "SNIPER ROUND! TAKING HEAVY FIRE!" : "TAKING FIRE!", now, 0.8);
    SFX.hit();
    if (this.health <= 0) this.finishRun(now);
  }

  update(now, dt) {
    if (this.fadeAlpha > 0) {
      this.fadeAlpha = clamp(this.fadeAlpha + this.fadeDir * dt * 2.5, 0, 1);
      if (this.fadeDir === 1 && this.fadeAlpha >= 1 && this.fadeTarget) {
        this.fadeTarget(); this.fadeTarget = null; this.fadeDir = -1;
      }
    }

    if (this.state === "PLAYING" && this.paused) return;

    const timeScale = this.deadeyeActive ? 0.35 : 1.0;
    const effectiveDt = dt * timeScale;

    if (this.deadeyeActive) {
      this.deadeyeEnergy -= dt * 22;
      if (this.deadeyeEnergy <= 0) { this.deadeyeActive = false; this.addMessage("DEADEYE EXHAUSTED", now, 0.8); }
    }

    for (const p of this.dust) { p[0] -= p[3]*effectiveDt; if (p[0]<-5) { p[0]=WIDTH+randInt(0,30); p[1]=randInt(160,HEIGHT-70); } }
    for (const w of this.tumbleweeds) { w[0] -= w[3]*effectiveDt; if (w[0]<-45) { w[0]=WIDTH+randInt(100,300); w[1]=choice([565,610,655]); } }

    if (this.state === "BREATHER") {
      if (now >= this.breatherUntil) {
        this.state = "SHOP";
        this.shopReturn = "NEXT_WAVE";
      }
      return;
    }

    if (this.state === "WAVE_CARD") {
      if (now >= this.waveCardUntil) {
        this.state = "PLAYING";
        this.addMessage(`${this.waveName()} — DEFEAT THE BOSS`, now, 1.4);
      }
      return;
    }

    if (this.state !== "PLAYING") return;

    this.particles.update(effectiveDt);

    if (this.reloadUntil && now >= this.reloadUntil) { this.reloadUntil = 0; this.ammo = this.maxAmmo; }
    const maxEnemies = this.isBossWave ? 1 : Math.min(5, 2 + Math.floor(this.level*0.55));
    if (now >= this.nextSpawn && this.enemies.length < maxEnemies && this.waveKills < this.waveQuota) {
      this.spawnEnemy(now);
      const baseDelay = this.isBossWave ? 4.0 : Math.max(0.72, 2.35 - this.level*0.10);
      this.nextSpawn = now + baseDelay * this.difficulty.spawnDelayMult;
    }

    for (const e of this.enemies) {
      if (e.fireDue(now)) {
        if (e.data.isCivilian || e.data.isBonus) {
          e.dead = true;
          if (e.data.isBonus) this.addMessage("THE GOLDEN BANDIT GOT AWAY!", now, 0.8);
        } else {
          const damage = e.variant && e.variant.gimmick === "SNIPER" ? 2 : 1;
          this.takeHit(e, now, damage);
        }
      }
    }

    this.enemies = this.enemies.filter(e => !e.dead);
    this.effects = this.effects.filter(e => e[3] > now);

    // Combo decays if the player goes quiet for too long — see the
    // countdown ring drawn around the combo readout in drawHud().
    if (this.combo > 1 && this.lastHitTime > 0 && now - this.lastHitTime > 4.0) {
      this.combo = 0;
      this.addMessage("COMBO LOST — KEEP FIRING TO REBUILD IT", now, 0.8);
    }
  }

  // ─────────────────────────────── Rendering ───────────────────
  drawAmbience() {
    ctx.drawImage(this.background, 0, 0);

    const climate = this.climate;
    ctx.save(); ctx.fillStyle = rgba(climate.tint, climate.alpha); ctx.fillRect(0,0,WIDTH,HEIGHT); ctx.restore();

    if (climate.name === "NIGHT") {
      ctx.save();
      ctx.fillStyle = "rgba(255,244,196,0.8)";
      for (let i=0; i<28; i++) circle([255,244,196], (i*97+41)%WIDTH, 45+(i*53)%260, i%4===0 ? 2 : 1);
      ctx.restore();
    }

    for (const [x,y,radius] of this.dust) {
      ctx.fillStyle = climate.name === "SANDSTORM" ? "rgba(247,204,126,0.42)" : "rgba(255,226,164,0.2)";
      ctx.beginPath(); ctx.ellipse(x+radius*2,y+radius,radius,radius,0,0,Math.PI*2); ctx.fill();
    }
  }

  drawHud(now) {
    // Deputy badge in the top-left corner
    drawDeputyBadge(16, 14);

    // ── Health ──
    rectShape([32, 20, 14], [16, 56, 210, 56], 0, 10);
    rectShape([70, 45, 28], [16, 56, 210, 56], 2, 10);
    textTL("SHERIFF'S VIGOR", 28, 62, FONTS.tiny, GOLD);
    for (let i = 0; i < this.maxHealth; i++) {
      const x = 36 + i * 34;
      const active = i < this.health;
      circle(active ? [180, 40, 35] : [50, 30, 22], x, 92, 10);
      if (active) {
        circle([255, 90, 70], x, 90, 5);
      }
    }

    // ── Top-center: Level + Combo ──
    const levelTxt = this.isBossWave
      ? `SHOWDOWN ${this.level}  •  ${this.climate.name}`
      : `WAVE ${this.level}: ${WAVE_NAMES[(this.level - 1) % WAVE_NAMES.length]}`;
    const lw = textWidth(levelTxt, FONTS.small);
    rectShape([32, 20, 14], [WIDTH/2 - lw/2 - 18, 14, lw + 36, 36], 0, 8);
    rectShape([90, 60, 30], [WIDTH/2 - lw/2 - 18, 14, lw + 36, 36], 2, 8);
    textTL(levelTxt, WIDTH/2 - lw/2, 22, FONTS.small, GOLD);

    if (this.combo > 1) {
      const comboTxt = `COMBO ×${this.combo}`;
      const cw = textWidth(comboTxt, FONTS.body);
      textTL(comboTxt, WIDTH/2 - cw/2, 58, FONTS.body, this.combo >= 8 ? [255, 120, 40] : GOLD);

      // Countdown ring: warns the combo is about to decay from inactivity.
      const decayStart = 2.5, decayEnd = 4.0;
      const timeSinceHit = now - this.lastHitTime;
      if (timeSinceHit > decayStart) {
        const ratio = clamp((decayEnd - timeSinceHit) / (decayEnd - decayStart), 0, 1);
        const rcx = WIDTH/2 - cw/2 - 16, rcy = 68;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = rgb(RED);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rcx, rcy, 9, -Math.PI/2, -Math.PI/2 + Math.PI*2*ratio);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Bosses get their own persistent phase meter instead of a tiny threat bar.
    const boss = this.enemies.find(e => e.kind === "BOSS");
    if (boss) {
      const total = boss.variant ? boss.variant.phases : boss.data.phases;
      const remaining = clamp(boss.phasesLeft / total, 0, 1);
      const bossLabel = `${boss.variant.name.toUpperCase()}  •  PHASE ${total - boss.phasesLeft + 1}/${total}`;
      const barX = WIDTH/2 - 255, barY = 100, barW = 510;
      rectShape([27,16,15],[barX,barY,barW,50],0,9);
      rectShape(boss.variant.badge || RED,[barX,barY,barW,50],2,9);
      rectShape(boss.variant.gimmick === "SNIPER" ? CYAN : RED,[barX+8,barY+30,Math.round((barW-16)*remaining),10],0,5);
      textTL(bossLabel, WIDTH/2-textWidth(bossLabel,FONTS.tiny)/2, barY+10, FONTS.tiny, CREAM);
    }

    // ── Top-right: Bounty ──
    rectShape([32, 20, 14], [WIDTH - 250, 14, 234, 78], 0, 10);
    rectShape([70, 45, 28], [WIDTH - 250, 14, 234, 78], 2, 10);
    textTL("BOUNTY", WIDTH - 238, 22, FONTS.tiny, GOLD);
    const st = "$" + String(this.score).padStart(5, "0");
    textTL(st, WIDTH - 238, 44, FONTS.heading, GOLD);
    const hs = "BEST $" + this.highScore;
    textTL(hs, WIDTH - 238, 72, FONTS.tiny, CREAM);
    if (this.muted) textTL("MUTED", WIDTH - 82, 22, FONTS.tiny, [200, 90, 80]);

    // ── Bottom-right: Revolver ──
    const reloading = this.reloadUntil > now;
    const reloadPulse = reloading && Math.sin(now * 8) > 0;
    rectShape([32, 20, 14], [WIDTH - 250, HEIGHT - 118, 234, 90], 0, 10);
    rectShape(reloading ? (reloadPulse ? RED : [90, 45, 20]) : [70, 45, 28],
              [WIDTH - 250, HEIGHT - 118, 234, 90], 2, 10);
    textTL("REVOLVER", WIDTH - 236, HEIGHT - 110, FONTS.tiny, CREAM);
    for (let b = 0; b < this.maxAmmo; b++) {
      const bx = WIDTH - 232 + b * 22;
      const loaded = b < this.ammo && !reloading;
      circle(loaded ? GOLD : [55, 38, 28], bx, HEIGHT - 62, 8);
      if (loaded) circle([255, 230, 140], bx, HEIGHT - 64, 3);
    }
    if (reloading) {
      textTL("RELOADING...", WIDTH - 200, HEIGHT - 42, FONTS.tiny, GOLD);
    }

    // ── Bottom-left: Deadeye ──
    rectShape([32, 20, 14], [16, HEIGHT - 118, 230, 50], 0, 10);
    rectShape([70, 45, 28], [16, HEIGHT - 118, 230, 50], 2, 10);
    const energyW = Math.round(2.1 * this.deadeyeEnergy);
    const ready = this.deadeyeEnergy >= 25;
    rectShape(this.deadeyeActive ? [255, 180, 40] : (ready ? GOLD : [70, 50, 35]),
              [22, HEIGHT - 112, energyW, 38], 0, 6);
    const deadeyeLabel = this.deadeyeActive
      ? "DEADEYE ACTIVE"
      : ready
        ? "DEADEYE READY — PRESS SHIFT"
        : `DEADEYE  ${Math.round(this.deadeyeEnergy)}%`;
    if (ready && !this.deadeyeActive) {
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now * 6);
      textTL(deadeyeLabel, 30, HEIGHT - 102, FONTS.tiny, INK);
      ctx.restore();
    } else {
      textTL(deadeyeLabel, 30, HEIGHT - 102, FONTS.tiny, CREAM);
    }

    // ── Controls hint — simplified, action-focused ──
    const hintLeft  = this.selected
      ? `TYPING:  ${this.selected.word.toUpperCase()}   •   BACKSPACE to switch target`
      : "TYPE THE FIRST LETTER OF ANY BANDIT'S WORD to lock on";
    const hintRight = "SPACE: reload   SHIFT: deadeye   F1: pause   0: mute   ESC: menu";

    const hlW = textWidth(hintLeft,  FONTS.tiny);
    const hrW = textWidth(hintRight, FONTS.tiny);
    const hintBarY = HEIGHT - 42;

    // Left hint — context-sensitive (changes when locked on)
    rectShape([32, 20, 14], [16, hintBarY, hlW + 24, 28], 0, 6);
    rectShape(this.selected ? GOLD : [70,45,28], [16, hintBarY, hlW + 24, 28], 1, 6);
    textTL(hintLeft, 28, hintBarY + 7, FONTS.tiny, this.selected ? GOLD : CREAM);

    // Right hint — always visible controls
    rectShape([32, 20, 14], [WIDTH - hrW - 40, hintBarY, hrW + 24, 28], 0, 6);
    textTL(hintRight, WIDTH - hrW - 28, hintBarY + 7, FONTS.tiny, CREAM);

    // ── Floating message ──
    if (now < this.messageUntil) {
      const mw = textWidth(this.message, FONTS.body);
      rectShape([20, 12, 8], [WIDTH/2 - mw/2 - 20, HEIGHT - 168, mw + 40, 40], 0, 8);
      textTL(this.message, WIDTH/2 - mw/2, HEIGHT - 160, FONTS.body, GOLD);
    }

    // Pause overlay
    if (this.paused) {
      ctx.save();
      ctx.fillStyle = "rgba(10, 6, 4, 0.65)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const pt = "PAUSED";
      textTL(pt, WIDTH/2 - textWidth(pt, FONTS.title)/2, HEIGHT/2 - 40, FONTS.title, GOLD);
      const pr = "Press  F1  to resume";
      textTL(pr, WIDTH/2 - textWidth(pr, FONTS.body)/2, HEIGHT/2 + 40, FONTS.body, CREAM);
      ctx.restore();
    }
  }

  drawSheriff(now) {
    const firing = now < this.playerFlashUntil;
    ctx.save();
    if (this.images.cowboy) {
      // The supplied cowboy is the player's readable, foreground silhouette.
      ctx.globalAlpha = now < this.invulnerableUntil && Math.floor(now * 14) % 2 ? 0.45 : 0.94;
      ctx.drawImage(this.images.cowboy, 652, 438, 155, 228);
    } else {
      ellipseRect([42,24,14],[680,635,130,20]);
      polygon([160,47,35],[[700,630],[716,500],[774,500],[798,630]]);
      ellipseRect([213,153,98],[720,468,55,58]);
      rectShape([82,45,24],[700,450,98,25],0,7);
    }
    if (firing && this.images.muzzle) {
      ctx.globalAlpha = 0.88;
      ctx.drawImage(this.images.muzzle, 746, 446, 86, 86);
    } else if (firing) {
      circle([255,190,64], 780, 485, 23);
    }
    ctx.restore();
  }

  drawPlaying(now) {
    this.drawAmbience();

    if (this.deadeyeActive) {
      ctx.save(); ctx.fillStyle = "rgba(255,200,50,0.15)"; ctx.fillRect(0,0,WIDTH,HEIGHT); ctx.restore();
    }

    const shaking = now < this.shakeUntil || now < this.shotShakeUntil;
    const shakeMag = now < this.shakeUntil ? 7 : 3;

    ctx.save();
    if (shaking) {
      ctx.translate(randInt(-shakeMag, shakeMag+1), randInt(-shakeMag, shakeMag+1));
    }

    // ── Clear targeting indicator: arrow + "TARGET" label above locked enemy ──
    if (this.selected && !this.selected.dead) {
      const sx = this.selected.getScreenX(now);
      const sy = this.selected.groundY - Math.trunc(176 * this.selected.scale) - 70;

      // Pulsing arrow pointing down at the selected enemy
      const pulse = 0.5 + 0.5 * Math.sin(now * 6);
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * pulse;

      // Arrow shaft
      ctx.fillStyle = rgb(GOLD);
      ctx.beginPath();
      ctx.moveTo(sx,      sy + 22);  // tip
      ctx.lineTo(sx - 10, sy + 8);
      ctx.lineTo(sx - 4,  sy + 8);
      ctx.lineTo(sx - 4,  sy - 4);
      ctx.lineTo(sx + 4,  sy - 4);
      ctx.lineTo(sx + 4,  sy + 8);
      ctx.lineTo(sx + 10, sy + 8);
      ctx.closePath();
      ctx.fill();

      // "TARGET" label
      const tl = "TARGET";
      const tw = textWidth(tl, FONTS.tiny);
      ctx.globalAlpha = 0.85 + 0.15 * pulse;
      textTL(tl, sx - tw / 2, sy - 20, FONTS.tiny, GOLD);

      // Faint tracer line from gun to target
      ctx.globalAlpha = 0.18 + 0.1 * pulse;
      line(GOLD, [741, 510], [sx, this.selected.groundY - 80], 1.5);

      ctx.restore();
    }

    const sorted = [...this.enemies].sort((a,b) => a.groundY - b.groundY);
    for (const e of sorted) e.draw(now, e === this.selected);

    for (const [kind,x,y,until] of this.effects) {
      if (kind === "tracer") line([255,228,115], [741,510], [x,y], 3);
      else if (kind === "incoming") line(RED, [x,y], [WIDTH/2, HEIGHT-10], 4);
    }

    this.particles.draw();
    this.drawSheriff(now);
    ctx.restore();

    this.drawHud(now);
  }

  shopItems() {
    return [
      { key:"1", prop:"ammo",    name:"EXPANDED CYLINDER", desc:"+2 max ammo",                  max:2, cost:280 },
      { key:"2", prop:"health",  name:"IRON VISAGE",       desc:"+1 starting vigor",            max:2, cost:460 },
      { key:"3", prop:"reload",  name:"QUICK-LOAD SPRINGS",desc:"reload 0.15s faster",          max:3, cost:320 },
      { key:"4", prop:"deadeye", name:"EAGLE EYE",         desc:"Deadeye charges faster",       max:3, cost:360 },
      { key:"5", prop:"mercy",   name:"PARDON STAR",       desc:"one civilian mistake per ride",max:1, cost:540 },
    ];
  }

  buyUpgrade(key, now) {
    const item = this.shopItems().find(candidate => candidate.key === key);
    if (!item) return;
    const level = this.upgrades[item.prop];
    const cost = item.cost + level * 80;
    if (level >= item.max) {
      this.addMessage(`${item.name} IS MAXED OUT`, now, 0.9);
      return;
    }
    if (this.bountyCash < cost) {
      this.addMessage(`NEED $${cost - this.bountyCash} MORE BOUNTY CASH`, now, 0.9);
      SFX.miss();
      return;
    }
    this.bountyCash -= cost;
    this.upgrades[item.prop] += 1;
    saveUpgrades(this.upgrades);
    saveInt(CASH_KEY, this.bountyCash);
    this.addMessage(`${item.name} UPGRADED`, now, 1.0);
    SFX.reload();
  }

  drawShop() {
    this.drawAmbience();
    ctx.save();
    ctx.fillStyle = "rgba(10, 6, 4, 0.55)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();

    drawDeputyBadge(30, 25);

    rectShape([40, 25, 15], [WIDTH/2 - 340, 48, 680, 624], 0, 14);
    rectShape([100, 65, 30], [WIDTH/2 - 340, 48, 680, 624], 3, 14);

    const title = "SALOON GUNSMITH";
    textTL(title, WIDTH/2 - textWidth(title, FONTS.heading)/2, 78, FONTS.heading, GOLD);

    const cashText = `YOUR BOUNTY CASH:  $${this.bountyCash}`;
    textTL(cashText, WIDTH/2 - textWidth(cashText, FONTS.body)/2, 128, FONTS.body, GREEN);

    const saloonNote = this.shopReturn === "NEXT_WAVE"
      ? `WAVE ${this.wave} CLEARED — RESUPPLY BEFORE THE NEXT RIDE`
      : "PERMANENT GEAR FOR EVERY RIDE";
    textTL(saloonNote, WIDTH/2 - textWidth(saloonNote, FONTS.tiny)/2, 168, FONTS.tiny, CREAM);

    const items = this.shopItems();

    items.forEach((item, i) => {
      const y = 208 + i * 68;
      const level = this.upgrades[item.prop];
      const cost = item.cost + level * 80;
      rectShape([55, 35, 22], [WIDTH/2 - 300, y, 600, 56], 0, 8);
      rectShape(level >= item.max ? GOLD : [90, 55, 30], [WIDTH/2 - 300, y, 600, 56], 2, 8);
      textTL(`[${item.key}]  ${item.name}  [${level}/${item.max}]`, WIDTH/2 - 280, y + 9, FONTS.small, CREAM);
      textTL(item.desc, WIDTH/2 - 280, y + 33, FONTS.tiny, [190, 170, 136]);
      const status = level >= item.max ? "MAXED" : `$${cost}`;
      const statusW = textWidth(status, FONTS.small);
      textTL(status, WIDTH/2 + 276 - statusW, y + 19, FONTS.small, level >= item.max ? GOLD : GREEN);
    });

    const tip = "Golden bandits and clean words pay out immediately.";
    textTL(tip, WIDTH/2 - textWidth(tip, FONTS.tiny)/2, 560, FONTS.tiny, CREAM);

    const exitPrompt = this.shopReturn === "NEXT_WAVE" ? "SPACE / ENTER — RIDE INTO THE NEXT WAVE" : "ESCAPE — RETURN TO THE TRAIL SELECT";
    textTL(exitPrompt, WIDTH/2 - textWidth(exitPrompt, FONTS.small)/2, 620, FONTS.small, GOLD);
  }

  drawTitle(now, gameOver=false) {
    this.drawAmbience();
    ctx.save();
    ctx.fillStyle = "rgba(12, 8, 5, 0.70)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();

    drawDeputyBadge(30, 25);

    rectShape([40, 25, 15], [WIDTH/2 - 360, 28, 720, 106], 0, 12);
    rectShape([160, 105, 42], [WIDTH/2 - 360, 28, 720, 106], 3, 12);

    const mainTitle = "TYPE 'EM DEAD";
    textTL(mainTitle, WIDTH/2 - textWidth(mainTitle, FONTS.title)/2, 42, FONTS.title, GOLD);

    const subtitle = gameOver ? "THE TRAIL REMEMBERS EVERY WORD" : "A WESTERN TYPING SHOOTER";
    textTL(subtitle, WIDTH/2 - textWidth(subtitle, FONTS.small)/2, 104, FONTS.small, CREAM);

    const poster = [WIDTH/2 - 270, 156, 540, 430];
    rectShape([240, 205, 140], poster, 0, 10);
    rectShape([90, 50, 30], poster, 6, 10);
    rectShape([160, 110, 60], [poster[0] + 12, poster[1] + 12, poster[2] - 24, poster[3] - 24], 2, 6);

    const headline = gameOver ? "THE DUST GOT YOU" : "CHOOSE YOUR TRAIL";
    textTL(headline, WIDTH/2 - textWidth(headline, FONTS.heading)/2, 184, FONTS.heading, RED);

    if (gameOver) {
      const lines = [
        `BOUNTY COLLECTED:  $${this.score}`,
        `WAVE REACHED:      ${this.level}`,
        `BANDITS DOWNED:    ${this.kills}`,
        `BEST COMBO:        ×${this.maxCombo}`,
        `ACCURACY:          ${this.accuracy()}%`,
        `TYPING SPEED:      ${this.wpm()} WPM`,
      ];
      lines.forEach((l, i) => {
        textTL(l, WIDTH/2 - 180, 252 + i * 36, FONTS.small, INK);
      });
    } else {
      DIFFICULTY_ORDER.forEach((id, index) => {
        const diff = DIFFICULTIES[id];
        const selected = id === this.difficultyId;
        const y = 244 + index * 76;
        rectShape(selected ? [61,40,24] : [213,180,118], [poster[0]+38,y,poster[2]-76,60], 0, 8);
        rectShape(selected ? GOLD : [140,90,48], [poster[0]+38,y,poster[2]-76,60], selected ? 3 : 1, 8);
        const label = `[${index+1}]  ${diff.label}`;
        textTL(label, poster[0]+58, y+10, FONTS.small, selected ? GOLD : INK);
        textTL(diff.subtitle, poster[0]+58, y+34, FONTS.tiny, selected ? CREAM : [90,60,35]);
        if (selected) textTL("◄", poster[0]+poster[2]-70, y+17, FONTS.heading, GOLD);
      });

      const selectedDifficulty = this.difficulty;
      const detail = selectedDifficulty.id === "EASY"
        ? "+2 ammo, +1 vigor, and your first civilian mistake is forgiven."
        : selectedDifficulty.id === "HARD"
          ? "Faster spawns, harsher shots, more civilians — no healing during a ride."
          : "The intended frontier: sharp words, fair odds.";
      textTL(detail, WIDTH/2-textWidth(detail,FONTS.tiny)/2, 490, FONTS.tiny, INK);
      const controls = "↑ ↓ / 1–3 select trail   •   S opens the gunsmith";
      textTL(controls, WIDTH/2-textWidth(controls,FONTS.tiny)/2, 530, FONTS.tiny, [85,56,34]);
    }

    const pulse = 0.7 + 0.3 * Math.sin(now * 4);
    ctx.save();
    ctx.globalAlpha = pulse;
    const startText = gameOver ? "PRESS SPACE TO RIDE AGAIN" : "PRESS SPACE TO START";
    textTL(startText, WIDTH/2 - textWidth(startText, FONTS.heading)/2, 614, FONTS.heading, GOLD);
    ctx.restore();

    if (this.images.cowboy) {
      ctx.save(); ctx.globalAlpha=0.9; ctx.drawImage(this.images.cowboy, 78, 360, 178, 262); ctx.restore();
    }
    if (this.highScore > 0) {
      const hs = `HIGH SCORE  $${this.highScore}`;
      textTL(hs, WIDTH/2 - textWidth(hs, FONTS.tiny)/2, 674, FONTS.tiny, GOLD);
    }
  }

  drawBreather() {
    this.drawAmbience();
    ctx.save(); ctx.fillStyle="rgba(11,7,4,0.66)"; ctx.fillRect(0,0,WIDTH,HEIGHT); ctx.restore();
    rectShape([39,24,15],[WIDTH/2-370,190,740,300],0,16);
    rectShape([170,111,42],[WIDTH/2-370,190,740,300],4,16);
    const title = `WAVE ${this.wave} CLEARED`;
    const sub = "THE SALOON DOORS ARE OPENING...";
    textTL(title, WIDTH/2-textWidth(title,FONTS.title)/2, 254, FONTS.title, GOLD);
    textTL(sub, WIDTH/2-textWidth(sub,FONTS.heading)/2, 350, FONTS.heading, CREAM);
    textTL("Spend bounty cash, then choose when to ride on.", WIDTH/2-textWidth("Spend bounty cash, then choose when to ride on.",FONTS.small)/2, 414, FONTS.small, [210,180,132]);
  }

  drawWaveCard(now) {
    this.drawAmbience();
    ctx.save(); ctx.fillStyle="rgba(9,5,4,0.76)"; ctx.fillRect(0,0,WIDTH,HEIGHT); ctx.restore();
    const boss = this.bossVariant;
    rectShape([45,22,18],[WIDTH/2-440,142,880,370],0,18);
    rectShape(boss.badge || RED,[WIDTH/2-440,142,880,370],4,18);
    const showdown = `SHOWDOWN ${this.wave}`;
    textTL(showdown, WIDTH/2-textWidth(showdown,FONTS.heading)/2, 185, FONTS.heading, GOLD);
    textTL(boss.name, WIDTH/2-textWidth(boss.name,FONTS.title)/2, 252, FONTS.title, CREAM);
    const gimmick = boss.gimmick === "SNIPER"
      ? "A charge-up reticle means a devastating sniper round is imminent."
      : boss.gimmick === "ARMOR"
        ? "Crack every armour plate — the full phase bar must be emptied."
        : "A relentless duelist with almost no time between shots.";
    textTL(gimmick, WIDTH/2-textWidth(gimmick,FONTS.small)/2, 355, FONTS.small, [225,190,136]);
    const prompt = "DRAW!";
    ctx.save(); ctx.globalAlpha=0.65+0.35*Math.sin(now*7);
    textTL(prompt, WIDTH/2-textWidth(prompt,FONTS.heading)/2, 430, FONTS.heading, boss.badge || RED);
    ctx.restore();
  }

  draw(now) {
    if (this.state === "PLAYING") this.drawPlaying(now);
    else if (this.state === "SHOP") this.drawShop();
    else if (this.state === "BREATHER") this.drawBreather();
    else if (this.state === "WAVE_CARD") this.drawWaveCard(now);
    else this.drawTitle(now, this.state === "GAME_OVER");

    if (this.fadeAlpha > 0) {
      ctx.save(); ctx.globalAlpha = this.fadeAlpha; ctx.fillStyle="#000"; ctx.fillRect(0,0,WIDTH,HEIGHT); ctx.restore();
    }
  }

  handleKeyDown(e, now) {
    const ac = getAudioCtx(); if (ac && ac.state === "suspended") ac.resume();
    const key = e.key;
    const isSpace = key === " " || key === "Spacebar" || e.code === "Space";
    const isTab   = key === "Tab" || e.code === "Tab";

    if (key === "0") {
      this.muted = !this.muted;
      SOUND_MUTED = this.muted;
      this.addMessage(this.muted ? "SOUND OFF — PRESS 0 TO UNMUTE" : "SOUND ON", now, 0.8);
      return;
    }

    if (this.state === "SHOP") {
      if (/^[1-5]$/.test(key)) {
        this.buyUpgrade(key, now);
      } else if (isSpace || key === "Enter") {
        if (this.shopReturn === "NEXT_WAVE") this.startNextWave(now);
        else this.state = "TITLE";
      } else if (key === "Escape") {
        if (this.shopReturn === "NEXT_WAVE") this.startNextWave(now);
        else this.state = "TITLE";
      }
      return;
    }

    if (this.state === "TITLE" || this.state === "GAME_OVER") {
      if (this.state === "TITLE" && (key === "ArrowUp" || key === "ArrowDown")) {
        const current = DIFFICULTY_ORDER.indexOf(this.difficultyId);
        const direction = key === "ArrowUp" ? -1 : 1;
        this.difficultyId = DIFFICULTY_ORDER[(current + direction + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length];
        saveDifficulty(this.difficultyId);
      } else if (this.state === "TITLE" && /^[1-3]$/.test(key)) {
        this.difficultyId = DIFFICULTY_ORDER[Number(key)-1];
        saveDifficulty(this.difficultyId);
      } else if (isSpace) {
        this.fadeDir = 1;
        this.fadeAlpha = 0.01;
        this.fadeTarget = () => this.reset(performance.now()/1000);
      } else if (key === "s" || key === "S") {
        this.shopReturn = "TITLE";
        this.state = "SHOP";
      }
      return;
    }

    if (key === "Escape") { this.paused = false; this.state = "TITLE"; return; }
    if (key === "F1" || key === "Pause" || e.code === "Pause") { e.preventDefault(); this.togglePause(now); return; }
    if (this.paused) return;

    if (key === "Shift") { this.toggleDeadeye(now); return; }
    if (key === "Backspace") {
      if (this.selected) { this.selected.typed = ""; this.selected = null; this.addMessage("TARGET UNLOCKED", now, 0.5); }
      return;
    }

    if (isSpace || isTab) { e.preventDefault(); this.startReload(now); return; }
    if (key.length === 1 && /^[a-zA-Z]$/.test(key)) this.handleLetter(key.toLowerCase(), now);
  }
}

// ─────────────────────────────────────────────────────────────
// Assets & Bootstrapping
// ─────────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise(resolve => { const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>resolve(null); img.src=src; });
}

function coverCanvas(img, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const c = canvas.getContext("2d");

  if (img) {
    const scale = Math.max(width / img.width, height / img.height);
    c.drawImage(img, (width - img.width * scale) / 2, (height - img.height * scale) / 2, img.width * scale, img.height * scale);
    return canvas;
  }

  const sky = c.createLinearGradient(0, 0, 0, height * 0.55);
  sky.addColorStop(0, "#4a2c1a");
  sky.addColorStop(0.4, "#c46b2a");
  sky.addColorStop(0.7, "#e8a04a");
  sky.addColorStop(1, "#f0c878");
  c.fillStyle = sky;
  c.fillRect(0, 0, width, height);

  c.fillStyle = "#5c3a28";
  c.beginPath();
  c.moveTo(0, 340);
  c.lineTo(180, 220); c.lineTo(320, 300); c.lineTo(480, 180);
  c.lineTo(640, 260); c.lineTo(820, 160); c.lineTo(980, 240);
  c.lineTo(1120, 190); c.lineTo(1280, 280); c.lineTo(1280, 400); c.lineTo(0, 400);
  c.fill();

  c.fillStyle = "#6b452f";
  c.beginPath();
  c.moveTo(0, 380);
  for (let x = 0; x <= width; x += 40) {
    c.lineTo(x, 340 + Math.sin(x * 0.02) * 25 + Math.cos(x * 0.01) * 15);
  }
  c.lineTo(width, 420); c.lineTo(0, 420); c.fill();

  const ground = c.createLinearGradient(0, 400, 0, height);
  ground.addColorStop(0, "#a67c4a");
  ground.addColorStop(0.3, "#8b6439");
  ground.addColorStop(1, "#6b4c2e");
  c.fillStyle = ground;
  c.fillRect(0, 400, width, height - 400);

  function building(x, w, h, windows = true) {
    c.fillStyle = "#3d2a1a";
    c.fillRect(x, 420 - h, w, h);
    c.beginPath();
    c.moveTo(x - 8, 420 - h);
    c.lineTo(x + w / 2, 420 - h - 28);
    c.lineTo(x + w + 8, 420 - h);
    c.fill();
    if (windows) {
      c.fillStyle = "#e8b04a";
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          c.fillRect(x + 12 + i * 28, 420 - h + 20 + j * 30, 14, 18);
        }
      }
    }
  }
  building(40, 90, 140);
  building(160, 70, 110, false);
  building(280, 110, 160);
  building(920, 100, 130);
  building(1060, 80, 120);
  building(1170, 90, 150);

  c.fillStyle = "#4a3020";
  c.fillRect(480, 280, 200, 160);
  c.fillStyle = "#2a1c12";
  c.beginPath();
  c.moveTo(470, 280); c.lineTo(580, 240); c.lineTo(690, 280); c.fill();
  c.fillStyle = "#c9a227";
  c.font = "bold 22px Georgia";
  c.textAlign = "center";
  c.fillText("SALOON", 580, 330);

  c.fillStyle = "#5a3c24";
  for (let x = 20; x < width; x += 55) {
    c.fillRect(x, 470, 8, 40);
    c.fillRect(x - 10, 478, 28, 6);
  }

  c.fillStyle = "rgba(180,140,90,0.15)";
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * width;
    const y = 420 + Math.random() * 280;
    c.beginPath();
    c.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
    c.fill();
  }

  const sun = c.createRadialGradient(980, 120, 10, 980, 120, 140);
  sun.addColorStop(0, "rgba(255,220,120,0.9)");
  sun.addColorStop(0.4, "rgba(255,160,40,0.35)");
  sun.addColorStop(1, "rgba(255,100,20,0)");
  c.fillStyle = sun;
  c.beginPath();
  c.arc(980, 120, 140, 0, Math.PI * 2);
  c.fill();

  return canvas;
}

async function main() {
  const canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");
  canvas.focus();

  const [town, cowboy, muzzle, icon] = await Promise.all([
    loadImage("assets/town.png"), loadImage("assets/Cowboy.png"),
    loadImage("assets/MuzzleFlash.png"), loadImage("assets/TypingIcon.png"),
  ]);

  const game = new Game({town, cowboy, muzzle, icon});
  window.game = game;

  let lastTime = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t-lastTime)/1000); lastTime = t;
    game.update(t/1000, dt);
    game.draw(t/1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const handleGameKey = e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    game.handleKeyDown(e, performance.now() / 1000);
  };

  window.addEventListener("keydown", handleGameKey, { passive: false });
  canvas.addEventListener("click", () => { canvas.focus(); const ac = getAudioCtx(); if (ac && ac.state === "suspended") ac.resume(); });
  document.addEventListener("click", () => canvas.focus(), { passive: true });
}

main();
