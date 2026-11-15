/* 2D 像素火焰渲染器 — 火焰实测高度严格贴合 BT.mapping().heightRatio */
window.BT2D = (function(){
  'use strict';
  var BT = window.BT;
  var W = 120, H = 150, DECAY = 0.995, LIFE = 58, TOP = 6;
  var PALETTE = ['#fff6d8','#ffe9a3','#ffd066','#ffb43e','#ff9024','#f26a1b','#d64815','#a52d10','#6d1c0b','#3a1007'];
  var SMOKE = ['#2f2f37','#26262d','#1e1e24','#17171b','#111115'];
  var cv, ctx, glow, particles = [], puffs = [], cur = 0, wind = 0, raf = 0, puffAcc = 0;

  /* 每种场景的「喷发基准点」：篝火/烧烤从地面起，垃圾箱从箱口起 */
  var MOUTH = {dumpster: 84, campfire: H-26, barbecue: H-30};

  function ground(){
    var y = H - 24;
    ctx.fillStyle = '#0d0d11'; ctx.fillRect(0, y, W, 24);
    ctx.fillStyle = '#1b1b21'; ctx.fillRect(0, y, W, 1);
    var s = BT.state.scene;

    if(s === 'dumpster'){ drawDumpster(); }
    else if(s === 'barbecue'){
      ctx.fillStyle = '#3a3d42'; ctx.fillRect(W/2-38, H-40, 76, 3);
      for(var k=0;k<7;k++) ctx.fillRect(W/2-34+k*11, H-44, 2, 8);
      ctx.fillRect(W/2-36, H-40, 3, 20); ctx.fillRect(W/2+33, H-40, 3, 20);
      for(var j=0;j<3;j++){
        var yy = H-49-j*7;
        ctx.fillStyle = '#6b4a2c'; ctx.fillRect(W/2-28, yy, 56, 2);
        ctx.fillStyle = '#a9703c';
        for(var m=0;m<4;m++) ctx.fillRect(W/2-22+m*13, yy-2, 6, 5);
      }
    } else {
      ctx.fillStyle = '#4a3324';
      for(var i=0;i<13;i++){
        ctx.fillRect(W/2-22+i*3.6, H-26-Math.round(i*0.55), 4, 3);
        ctx.fillRect(W/2-22+i*3.6, H-24+Math.round(i*0.35), 4, 3);
      }
      [[-36,-2],[-25,2],[-13,-3],[13,-3],[25,2],[36,-2]].forEach(function(s2){
        ctx.fillStyle = '#4b4a4c'; ctx.fillRect(W/2+s2[0], H-25+s2[1], 11, 6);
        ctx.fillStyle = '#616065'; ctx.fillRect(W/2+s2[0]+1, H-25+s2[1], 8, 1);
      });
    }
  }

  /* 垃圾箱几何常量：箱体 80 × 38，箱口线 y=88 即火焰喷发基准 */
  var DB = {x0:20, x1:100, y0:88, y1:126};
  DB.w = DB.x1 - DB.x0; DB.h = DB.y1 - DB.y0;

  /* 垃圾箱：墨绿钢箱 + 6 条加强筋 + 脚轮 + 侧吊耳 + 喷涂编号 */
  function drawDumpster(){
    var bx0 = DB.x0, bx1 = DB.x1, bw = DB.w;
    var by0 = DB.y0, by1 = DB.y1, bh = DB.h;

    /* 1. 盖子先画（在火焰之后一层）：火焰会盖住盖板中心，只露出两端 */
    drawLid();

    /* 2. 箱体主体 */
    ctx.fillStyle = '#1f4038'; ctx.fillRect(bx0, by0, bw, bh);
    /* 左暗 / 右亮，做出圆柱感 */
    ctx.fillStyle = '#16302b'; ctx.fillRect(bx0, by0, 5, bh);
    ctx.fillStyle = '#2a5247'; ctx.fillRect(bx1-6, by0, 6, bh);
    /* 顶沿亮边、底沿暗边 */
    ctx.fillStyle = '#356657'; ctx.fillRect(bx0, by0, bw, 2);
    ctx.fillStyle = '#12241f'; ctx.fillRect(bx0, by1-3, bw, 3);

    /* 3. 六条竖向加强筋 */
    for(var r=0;r<6;r++){
      var rx = bx0 + 10 + r*12;
      ctx.fillStyle = '#16302b'; ctx.fillRect(rx, by0+3, 3, bh-7);
      ctx.fillStyle = '#2a5247'; ctx.fillRect(rx+3, by0+3, 1, bh-7);
    }

    /* 4. 箱口内腔：一团黑，火焰从这里喷出 */
    ctx.fillStyle = '#080d0c'; ctx.fillRect(bx0+2, by0-2, bw-4, 5);
    ctx.fillStyle = '#050908'; ctx.fillRect(bx0+6, by0-1, bw-12, 2);

    /* 5. 侧吊耳 */
    ctx.fillStyle = '#16302b'; ctx.fillRect(bx0-5, by0+9, 5, 9);
    ctx.fillStyle = '#2a5247'; ctx.fillRect(bx0-5, by0+9, 5, 1);
    ctx.fillRect(bx1, by0+9, 5, 9);
    ctx.fillStyle = '#16302b'; ctx.fillRect(bx1, by0+9, 5, 1);

    /* 6. 脚轮 */
    [[bx0+9, 0], [bx1-19, 0]].forEach(function(w2){
      ctx.fillStyle = '#0b0b0e'; ctx.fillRect(w2[0], by1, 10, 6);
      ctx.fillStyle = '#1a1a20'; ctx.fillRect(w2[0]+2, by1+1, 6, 3);
      ctx.fillStyle = '#08080a'; ctx.fillRect(w2[0], by1+5, 10, 1);
    });

    /* 7. 喷涂编号：一块浅色贴纸 + 几个暗像素，抽象成「AI SLOP」 */
    ctx.fillStyle = '#4e7d6c'; ctx.fillRect(bx0+8, by0+16, 26, 9);
    ctx.fillStyle = '#16302b';
    [0,1,3,4,6,8,9,11,13,14,16,17,19,21,22].forEach(function(d){ ctx.fillRect(bx0+10+d, by0+19, 1, 4); });
    ctx.fillStyle = '#3d6656'; ctx.fillRect(bx0+8, by0+16, 26, 1);
  }

  /* 掀盖：绕后铰链后仰约 14°。正面视图下这块板被透视压扁，
     所以画成贴着箱口的水平窄板，只在右端微微翘起 —— 不要画成斜插的棍子。 */
  function drawLid(){
    var bx0 = DB.x0, by0 = DB.y0;
    ctx.globalAlpha = 0.92;
    for(var i=0;i<36;i++){
      var lx = Math.round(bx0 + 1 + i*2.1);
      var ly = Math.round(by0 - 3 - i*0.17);
      ctx.fillStyle = '#1b3a32'; ctx.fillRect(lx, ly, 3, 4);
      if(i % 2 === 0){ ctx.fillStyle = '#4a8a73'; ctx.fillRect(lx, ly, 3, 1); }
    }
    /* 铰链侧的加厚边，暗示这是一块掀起来的板 */
    ctx.fillStyle = '#0f2a24'; ctx.fillRect(bx0 + 1, by0 - 3, 2, 4);
    ctx.globalAlpha = 1;
  }

  /* 反解初速：位移 ≈ v0 × (1 - DECAY^LIFE) / (1 - DECAY) */
  function speedForHeight(targetPx){
    return targetPx * (1 - DECAY) / (1 - Math.pow(DECAY, LIFE));
  }
  function mouth(){ return MOUTH[BT.state.scene] != null ? MOUTH[BT.state.scene] : H-26; }

  function spawn(){
    var h = 0.18 + 0.82 * cur;
    if(cur <= 0.002 && BT.state.tokens <= 0) return;
    if(cur <= 0.002) return;
    var base = mouth();
    var targetPx = h * (base - TOP);
    var n = Math.round(4 + h * 34);
    var spread = 10 + h * 34;
    for(var i=0;i<n;i++){
      /* 每个粒子按自己的寿命反解初速，使位移恒等于 targetPx ——
         避免长尾粒子冲出画布、主体反而稀薄 */
      var life = Math.round(LIFE * (0.88 + Math.random()*0.24));
      var v0 = targetPx * (1 - DECAY) / (1 - Math.pow(DECAY, life));
      particles.push({
        x: W/2 + (Math.random()-0.5)*spread,
        y: base - Math.random()*3,
        vx: (Math.random()-0.5)*(0.15 + h*0.25),
        vy: -v0 * (0.97 + Math.random()*0.06),
        life: life, max: life,
        s: Math.random() < 0.3 ? 2 : 1,
        seed: Math.random()*100
      });
    }
    if(particles.length > 2400) particles.splice(0, particles.length - 2400);
  }

  /* 烟：只有垃圾箱场景有浓烟，压在火焰上层缓慢上升 */
  function spawnSmoke(){
    if(BT.state.scene !== 'dumpster') return;
    if(cur <= 0.01) return;
    puffAcc += 1;
    if(puffAcc % 2) return;
    var base = mouth();
    var life = 90 + Math.random()*70;
    puffs.push({
      x: W/2 + (Math.random()-0.5)*(10 + cur*26),
      y: base - 6 - Math.random()*(base - TOP)*0.5,
      vx: (Math.random()-0.5)*0.06 + 0.05,
      vy: -(0.12 + Math.random()*0.2) * (0.5 + cur),
      life: life, max: life,
      s: Math.random() < 0.35 ? 3 : 2,
      seed: Math.random()*100
    });
    if(puffs.length > 420) puffs.splice(0, puffs.length - 420);
  }

  function step(){
    var target = BT.state.target;
    cur += (target - cur) * 0.09;
    var h = 0.18 + 0.82 * cur;
    ctx.fillStyle = '#08080a'; ctx.fillRect(0, 0, W, H);
    ground();
    spawn();
    spawnSmoke();

    /* 箱口余烬辉光 */
    if(cur > 0.002){
      var base = mouth();
      var coreW = 4 + h * 22;
      ctx.fillStyle = 'rgba(255,214,120,.55)'; ctx.fillRect(W/2-coreW/2, base-3, coreW, 5);
      ctx.fillStyle = 'rgba(255,150,50,.30)'; ctx.fillRect(W/2-coreW/1.4, base-5, coreW*1.4, 8);
    }

    /* 烟先画（底层），火焰后画（上层），保证火苗最亮 */
    for(var q=puffs.length-1;q>=0;q--){
      var f = puffs[q];
      f.life -= 1;
      if(f.life <= 0 || f.y < -6){ puffs.splice(q,1); continue; }
      f.x += f.vx + Math.sin((f.y + f.seed)*0.12)*0.06;
      f.y += f.vy;
      var fage = 1 - f.life/f.max;
      ctx.globalAlpha = (1 - fage) * 0.55;
      ctx.fillStyle = SMOKE[Math.min(SMOKE.length-1, Math.floor(fage*SMOKE.length))];
      ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s);
      ctx.globalAlpha = 1;
    }

    for(var i=particles.length-1;i>=0;i--){
      var p = particles[i];
      p.life -= 1;
      if(p.life <= 0 || p.y < -4){ particles.splice(i,1); continue; }
      p.vx += (W/2 - p.x)*0.0009 + wind*0.008;
      p.x += p.vx + Math.sin((p.y + p.seed)*0.18)*0.16;
      p.y += p.vy;
      p.vy *= DECAY;
      var age = 1 - p.life/p.max;
      ctx.fillStyle = PALETTE[Math.min(PALETTE.length-1, Math.floor(age*PALETTE.length))];
      /* 火苗尖端渐隐，避免顶部出现方块感 */
      var lp = p.life / p.max;
      if(lp < 0.22) ctx.globalAlpha = lp / 0.22;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s + (p.s > 1 ? 1 : 0));
      if(lp < 0.22) ctx.globalAlpha = 1;
    }
    if(glow) glow.style.opacity = (0.12 + cur*0.78).toFixed(3);
  }

  function loop(){ step(); raf = requestAnimationFrame(loop); }

  function init(canvas, glowEl, stageEl){
    cv = canvas; ctx = cv.getContext('2d', {alpha:false});
    ctx.imageSmoothingEnabled = false;
    glow = glowEl;
    cur = BT.state.current;
    stageEl.addEventListener('pointermove', function(ev){
      var r = stageEl.getBoundingClientRect();
      wind = ((ev.clientX - r.left)/r.width - 0.5) * 1.4;
    });
    stageEl.addEventListener('pointerleave', function(){ wind = 0; });
    for(var k=0;k<90;k++) step();
    return api;
  }
  function setScene(){ /* 几何每帧按 state.scene 重画；切场景后清掉旧粒子避免残影 */
    particles = []; puffs = [];
    for(var k=0;k<90;k++) step();
  }
  function resetFire(){
    particles = []; puffs = [];
    cur = BT.state.target;
    for(var k=0;k<90;k++) step();
  }
  var api = {
    init:init, step:step, start:function(){ if(!raf) loop(); }, stop:function(){ cancelAnimationFrame(raf); raf = 0; },
    setScene:setScene, resetFire:resetFire,
    get canvas(){ return cv; },
    get intensity(){ return cur; }
  };
  return api;
})();
