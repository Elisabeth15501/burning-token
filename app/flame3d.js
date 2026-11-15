/* 3D 火焰渲染器（Three.js，本地 vendor 版）— 与 2D 共用 BT.mapping 的同一套尺寸映射 */
window.BT3D = (function(){
  'use strict';
  var BT = window.BT, T = window.THREE;
  var N = 2400, DECAY = 0.995, LIFE = 58, MAX_H = 6.0;
  var renderer, scene, camera, points, geo, pos, col, mat, light;
  var smokeGeo, smokePos, smokePts, smokeMat, pmask;
  var parts = [], puffs = [], cur = 0, raf = 0, stageEl, holder;
  var azimuth = 0.35, dragging = false, lastX = 0;
  var COLORS = ['#fff6d8','#ffe9a3','#ffd066','#ffb43e','#ff9024','#f26a1b','#d64815','#a52d10','#6d1c0b'].map(function(c){ return new T.Color(c); });

  /* 喷发基准高度：营火在地面，垃圾箱在箱口 —— 箱子不能被火焰穿过去 */
  function baseY(){ return BT.state.scene === 'dumpster' ? 1.86 : 0.52; }

  function sprite(){
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,1)');
    gr.addColorStop(0.35,'rgba(255,255,255,.75)');
    gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0,0,64,64);
    var t = new T.CanvasTexture(c); t.needsUpdate = true; return t;
  }
  function puffSprite(){
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,.85)');
    gr.addColorStop(0.5,'rgba(255,255,255,.32)');
    gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0,0,64,64);
    var t = new T.CanvasTexture(c); t.needsUpdate = true; return t;
  }
  /* 箱体正面的喷涂编号：透明底 + 自发光，暗光下也能看见 */
  function paintTexture(){
    var c = document.createElement('canvas'); c.width = 512; c.height = 128;
    var g = c.getContext('2d');
    g.clearRect(0,0,512,128);
    g.strokeStyle = 'rgba(205,240,228,.75)'; g.lineWidth = 4;
    g.strokeRect(20,20,472,88);
    g.fillStyle = 'rgba(232,252,244,.98)';
    g.font = 'bold 52px ui-monospace, Consolas, monospace';
    g.fillText('AI SLOP', 42, 88);
    g.font = '20px ui-monospace, Consolas, monospace';
    g.fillStyle = 'rgba(218,248,238,.8)';
    g.fillText('NO. 001 / 2026', 300, 88);
    var t = new T.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  function buildScene(){
    if(holder){ scene.remove(holder); holder.traverse(function(o){
      if(o.geometry) o.geometry.dispose();
      /* BoxGeometry 的正面用了材质数组，不能直接当单个 material 处理 */
      if(Array.isArray(o.material)){
        o.material.forEach(function(mm){
          if(mm.map) mm.map.dispose();
          mm.dispose();
        });
      } else if(o.material){
        if(o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    }); }
    holder = new T.Group();
    var s = BT.state.scene;
    var dark = new T.MeshStandardMaterial({color:0x24262c, roughness:0.95, metalness:0.05});
    var mid = new T.MeshStandardMaterial({color:0x3a3f47, roughness:0.9});
    var wood = new T.MeshStandardMaterial({color:0x6b4a2c, roughness:1});
    var stone = new T.MeshStandardMaterial({color:0x4b4a4c, roughness:1});

    var floor = new T.Mesh(new T.CircleGeometry(7, 48), new T.MeshBasicMaterial({color:0x0d0d11}));
    floor.rotation.x = -Math.PI/2; floor.position.y = -0.02; holder.add(floor);

    if(s === 'dumpster'){
      /* 墨绿钢箱 3.6 × 1.7 × 2.2，正面带喷涂 */
      var bodyMat = [
        new T.MeshStandardMaterial({color:0x235045, roughness:0.82, metalness:0.18, emissive:0x0a1a16, emissiveIntensity:0.7}),
        new T.MeshStandardMaterial({color:0x235045, roughness:0.82, metalness:0.18, emissive:0x0a1a16, emissiveIntensity:0.7}),
        new T.MeshStandardMaterial({color:0x2a5548, roughness:0.8, metalness:0.18, emissive:0x0c1f1a, emissiveIntensity:0.7}),
        new T.MeshStandardMaterial({color:0x14281f, roughness:0.9, metalness:0.1, emissive:0x08130f, emissiveIntensity:0.7}),
        new T.MeshStandardMaterial({color:0x235045, roughness:0.8, metalness:0.2, emissive:0x0c1f1a, emissiveIntensity:0.7}),
        new T.MeshStandardMaterial({color:0x235045, roughness:0.82, metalness:0.18, emissive:0x0a1a16, emissiveIntensity:0.7})
      ];
      var body = new T.Mesh(new T.BoxGeometry(3.6, 1.7, 2.2), bodyMat);
      body.position.y = 0.85; holder.add(body);

      /* 6 条竖向瓦楞：前后两面 */
      var ribMat = new T.MeshStandardMaterial({color:0x2a5247, roughness:0.7, metalness:0.25, emissive:0x0c211b, emissiveIntensity:0.6});
      for(var i=0;i<6;i++){
        var rx = -1.35 + i*0.54;
        var rib = new T.Mesh(new T.BoxGeometry(0.1, 1.56, 0.06), ribMat);
        rib.position.set(rx, 0.86, 1.13); holder.add(rib);
        var ribB = new T.Mesh(new T.BoxGeometry(0.1, 1.56, 0.06), ribMat);
        ribB.position.set(rx, 0.86, -1.13); holder.add(ribB);
      }
      /* 喷涂编号：独立的贴片浮在加强筋之前，避免被竖筋切断 */
      var paintPlane = new T.Mesh(
        new T.PlaneGeometry(2.3, 0.58),
        new T.MeshBasicMaterial({map:paintTexture(), transparent:true, opacity:0.94, depthWrite:false})
      );
      paintPlane.position.set(0, 1.06, 1.17);
      holder.add(paintPlane);

      /* 左右侧面也带瓦楞，否则箱子像个方盒 */
      for(var i2=0;i2<4;i2++){
        var rz = -0.78 + i2*0.52;
        var ribL = new T.Mesh(new T.BoxGeometry(0.06, 1.56, 0.1), ribMat);
        ribL.position.set(-1.83, 0.86, rz); holder.add(ribL);
        var ribR = new T.Mesh(new T.BoxGeometry(0.06, 1.56, 0.1), ribMat);
        ribR.position.set(1.83, 0.86, rz); holder.add(ribR);
      }
      /* 顶沿：四条边框围出箱口，中间留出开口（不能用实心板，否则箱顶变成一张桌子） */
      var rimMat = new T.MeshStandardMaterial({color:0x24473d, roughness:0.8, metalness:0.2, emissive:0x0a1c17, emissiveIntensity:0.6});
      [[0, 1.14, 3.68, 0.1], [0, -1.14, 3.68, 0.1]].forEach(function(f){
        var m = new T.Mesh(new T.BoxGeometry(f[2], 0.1, f[3]), rimMat);
        m.position.set(f[0], 1.73, f[1]); holder.add(m);
      });
      [[-1.79, 0], [1.79, 0]].forEach(function(f){
        var m = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 2.28), rimMat);
        m.position.set(f[0], 1.73, f[1]); holder.add(m);
      });
      /* 箱口下沉的深色底：必须高于箱体顶面(1.70)，否则会被实心 Box 完全挡住 */
      var pit = new T.Mesh(new T.BoxGeometry(3.45, 0.05, 2.05),
        new T.MeshBasicMaterial({color:0x05090a}));
      pit.position.y = 1.745; holder.add(pit);

      /* 掀盖：绕后铰链后仰 15°。rotation.x 取负，使 +z（前端）抬起而不是下沉 */
      var lidPivot = new T.Group();
      lidPivot.position.set(0, 1.74, -1.06);
      var lid = new T.Mesh(new T.BoxGeometry(3.7, 0.12, 2.24),
        new T.MeshStandardMaterial({color:0x2f5c4f, roughness:0.7, metalness:0.24, emissive:0x102a22, emissiveIntensity:0.9}));
      lid.position.set(0, 0, 1.1);
      lidPivot.add(lid);
      lidPivot.rotation.x = -0.26;
      holder.add(lidPivot);

      /* 4 个脚轮 */
      var wheelMat = new T.MeshStandardMaterial({color:0x0e0e12, roughness:0.95});
      [[-1.35,-0.85],[1.35,-0.85],[-1.35,0.85],[1.35,0.85]].forEach(function(p){
        var w = new T.Mesh(new T.CylinderGeometry(0.19,0.19,0.16,14), wheelMat);
        w.rotation.z = Math.PI/2;
        w.position.set(p[0], 0.19, p[1]); holder.add(w);
      });

      /* 左右侧吊耳 */
      [[-1.86,0],[1.86,0]].forEach(function(p){
        var ear = new T.Mesh(new T.BoxGeometry(0.12, 0.4, 0.5), ribMat);
        ear.position.set(p[0], 1.0, p[1]); holder.add(ear);
      });
    } else if(s === 'barbecue'){
      for(var k=0;k<7;k++){
        var bar = new T.Mesh(new T.BoxGeometry(3.4,0.07,0.09), mid);
        bar.position.set(0, 1.15, -0.9+k*0.3); holder.add(bar);
      }
      [[-1.6,-0.9],[1.6,-0.9],[-1.6,0.9],[1.6,0.9]].forEach(function(p){
        var leg = new T.Mesh(new T.BoxGeometry(0.1,1.15,0.1), mid);
        leg.position.set(p[0], 0.57, p[1]); holder.add(leg);
      });
      for(var j=0;j<3;j++){
        var skewer = new T.Mesh(new T.BoxGeometry(3.0,0.06,0.06), wood);
        skewer.position.set(0, 1.25+j*0.1, -0.6+j*0.6); holder.add(skewer);
        for(var m=0;m<4;m++){
          var meat = new T.Mesh(new T.BoxGeometry(0.34,0.26,0.26), new T.MeshStandardMaterial({color:0xa9703c, roughness:1}));
          meat.position.set(-1.1+m*0.75, 1.25+j*0.1, -0.6+j*0.6); holder.add(meat);
        }
      }
    } else {
      for(var a=0;a<9;a++){
        var ang = a/9*Math.PI*2;
        var r = new T.Mesh(new T.DodecahedronGeometry(0.33,0), stone);
        r.position.set(Math.cos(ang)*1.55, 0.2, Math.sin(ang)*1.55);
        r.rotation.set(a*0.7,a*0.4,0); holder.add(r);
      }
      [0.7,-0.7].forEach(function(rot,i){
        var log = new T.Mesh(new T.CylinderGeometry(0.16,0.16,2.6,8), wood);
        log.rotation.z = Math.PI/2; log.rotation.y = rot; log.position.y = 0.22; holder.add(log);
      });
    }
    /* 高度参照线：对应 h = 0.18 / 0.45 / 0.73 / 1.00 */
    [0.18,0.45,0.73,1.0].forEach(function(hr,idx){
      var y = hr*MAX_H;
      var line = new T.Mesh(new T.BoxGeometry(5.2,0.012,0.012),
        new T.MeshBasicMaterial({color:0x33343a, transparent:true, opacity:idx===3?0.55:0.3}));
      line.position.set(0,y,-2.6); holder.add(line);
    });
    scene.add(holder);
    /* 只有垃圾箱冒浓烟 */
    if(smokePts) smokePts.visible = (s === 'dumpster');
  }

  function speedForHeight(targetH){ return targetH * (1-DECAY) / (1-Math.pow(DECAY,LIFE)); }

  function spawn(){
    if(cur <= 0.002) return;
    var h = 0.18 + 0.82*cur;
    var b = baseY();
    /* 目标绝对高度；但不得低于箱口，否则火焰被箱子吞掉 */
    var targetH = Math.max(b + 0.18, h*MAX_H);
    var n = Math.round(3 + h*30);
    var radius = 0.18 + h*0.6;
    for(var i=0;i<n;i++){
      if(parts.length >= N) break;
      var ang = Math.random()*Math.PI*2, rr = Math.sqrt(Math.random())*radius;
      /* 每个粒子按自身寿命反解初速，位移恒等于 (targetH - b) */
      var life = Math.round(LIFE*(0.88+Math.random()*0.24));
      var v0 = (targetH - b) * (1-DECAY) / (1-Math.pow(DECAY,life));
      parts.push({
        x:Math.cos(ang)*rr, z:Math.sin(ang)*rr, y:b + 0.05 + Math.random()*0.1,
        vx:(Math.random()-0.5)*0.008, vz:(Math.random()-0.5)*0.008,
        vy:v0*(0.97+Math.random()*0.06),
        life:life, max:life, seed:Math.random()*100
      });
    }
  }

  function spawnSmoke(){
    if(BT.state.scene !== 'dumpster' || cur <= 0.01) return;
    if(puffs.length > 260) return;
    var b = baseY();
    for(var i=0;i<2;i++){
      puffs.push({
        x:(Math.random()-0.5)*0.7, z:(Math.random()-0.5)*0.7, y:b+0.1,
        vx:(Math.random()-0.5)*0.006, vz:(Math.random()-0.5)*0.006,
        vy:0.022 + Math.random()*0.028,
        life:150+Math.random()*90, max:250,
        s:0.5 + Math.random()*0.4
      });
    }
  }

  function step(){
    cur += (BT.state.target - cur)*0.09;
    var h = 0.18 + 0.82*cur;
    spawn();
    spawnSmoke();
    var alive = 0;
    for(var i=parts.length-1;i>=0;i--){
      var p = parts[i];
      p.life -= 1;
      if(p.life <= 0 || p.y > MAX_H*1.12){ parts.splice(i,1); continue; }
      p.vx += -p.x*0.0009; p.vz += -p.z*0.0009;
      p.x += p.vx + Math.sin((p.y+p.seed)*0.6)*0.004;
      p.z += p.vz + Math.cos((p.y+p.seed)*0.5)*0.004;
      p.y += p.vy; p.vy *= DECAY;
      var age = 1 - p.life/p.max;
      var c = COLORS[Math.min(COLORS.length-1, Math.floor(age*COLORS.length))];
      var k = alive*3;
      pos[k]=p.x; pos[k+1]=p.y; pos[k+2]=p.z;
      col[k]=c.r; col[k+1]=c.g; col[k+2]=c.b;
      alive++;
    }
    for(var j=alive;j<N;j++){
      var q = j*3; pos[q]=0; pos[q+1]=-1000; pos[q+2]=0;
      col[q]=0; col[q+1]=0; col[q+2]=0;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.setDrawRange(0, N);

    /* 烟柱 */
    if(smokePts && smokePts.visible){
      var sa = 0;
      for(var m=puffs.length-1;m>=0;m--){
        var f = puffs[m];
        f.life -= 1;
        if(f.life <= 0 || f.y > MAX_H*1.3){ puffs.splice(m,1); continue; }
        f.x += f.vx; f.z += f.vz; f.y += f.vy;
        f.vx += (Math.random()-0.5)*0.0009; f.vz += (Math.random()-0.5)*0.0009;
        var sk = sa*3;
        smokePos[sk]=f.x; smokePos[sk+1]=f.y; smokePos[sk+2]=f.z;
        sa++;
      }
      for(var n2=sa;n2<300;n2++){
        var sq = n2*3; smokePos[sq]=0; smokePos[sq+1]=-1000; smokePos[sq+2]=0;
      }
      smokeGeo.attributes.position.needsUpdate = true;
      smokeGeo.setDrawRange(0, 300);
    }

    light.intensity = 1 + cur*9;
    light.position.set(0.7, baseY() + 0.3 + h*1.1, 0.9);
    /* 不做自动旋转：构图稳定，截图与 GIF 每一帧都可预测；视角只由拖拽改变 */
    var camY = BT.state.scene === 'dumpster' ? 2.8 : 3.6;
    var look = BT.state.scene === 'dumpster' ? 1.9 : 2.4;
    camera.position.set(Math.sin(azimuth)*10.5, camY + h*0.9, Math.cos(azimuth)*10.5);
    camera.lookAt(0, look, 0);
    renderer.render(scene, camera);
  }

  function loop(){ step(); raf = requestAnimationFrame(loop); }

  function resize(){
    if(!renderer || !stageEl) return;
    var w = stageEl.clientWidth || 480, h = stageEl.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }

  function init(canvas, stage){
    if(!T) throw new Error('Three.js 未加载');
    stageEl = stage;
    renderer = new T.WebGLRenderer({canvas:canvas, antialias:true, alpha:false, preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    renderer.setClearColor(0x08080a, 1);
    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x08080a, 0.028);
    camera = new T.PerspectiveCamera(45, 0.8, 0.1, 100);
    scene.add(new T.AmbientLight(0x4a5468, 1.9));
    light = new T.PointLight(0xff8a2b, 4, 22); light.position.set(0,1.5,0); scene.add(light);

    geo = new T.BufferGeometry();
    pos = new Float32Array(N*3); col = new Float32Array(N*3);
    for(var i=0;i<N;i++){ pos[i*3+1] = -1000; }
    geo.setAttribute('position', new T.BufferAttribute(pos,3));
    geo.setAttribute('color', new T.BufferAttribute(col,3));
    mat = new T.PointsMaterial({size:0.26, map:sprite(), vertexColors:true,
      transparent:true, opacity:0.82, depthWrite:false, blending:T.AdditiveBlending, sizeAttenuation:true});
    points = new T.Points(geo, mat); points.frustumCulled = false; scene.add(points);

    /* 烟柱：独立 Points，普通混合，灰蓝色，低透明度 */
    smokeGeo = new T.BufferGeometry();
    smokePos = new Float32Array(300*3);
    for(var q=0;q<300;q++){ smokePos[q*3+1] = -1000; }
    smokeGeo.setAttribute('position', new T.BufferAttribute(smokePos,3));
    smokeMat = new T.PointsMaterial({size:0.95, map:puffSprite(), color:0x4a4a52,
      transparent:true, opacity:0.30, depthWrite:false, sizeAttenuation:true});
    smokePts = new T.Points(smokeGeo, smokeMat);
    smokePts.frustumCulled = false; smokePts.visible = false; scene.add(smokePts);

    buildScene();

    stage.addEventListener('pointerdown', function(e){ dragging = true; lastX = e.clientX; });
    window.addEventListener('pointerup', function(){ dragging = false; });
    window.addEventListener('pointermove', function(e){
      if(!dragging) return;
      azimuth += (e.clientX - lastX)*0.006; lastX = e.clientX;
    });
    window.addEventListener('resize', resize);
    resize();
    cur = BT.state.current;
    for(var k=0;k<90;k++) step();
    return api;
  }

  var api = {
    init:init, step:step, start:function(){ if(!raf) loop(); }, stop:function(){ cancelAnimationFrame(raf); raf = 0; },
    setScene:buildScene, resize:resize,
    resetFire:function(){ parts = []; puffs = []; cur = BT.state.target; buildScene(); for(var k=0;k<90;k++) step(); },
    get canvas(){ return renderer ? renderer.domElement : null; },
    get intensity(){ return cur; }
  };
  return api;
})();
