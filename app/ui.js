/* 共享 UI：数值展示 / 尺寸对应尺 / 能量 / 类比 / 吐槽 / 声音与 BGM / 分享出口 */
window.BTUI = (function(){
  'use strict';
  var BT = window.BT, R = window.BT_RESEARCH;
  var $ = function(id){ return document.getElementById(id); };
  var renderer, E = {}, audioCtx = null, noiseGain = null, bgmTimer = 0, bgmStep = 0;

  function hint(msg, cls){
    E.hint.textContent = msg;
    E.hint.className = 'hint' + (cls ? ' ' + cls : '');
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function renderReadout(){
    var s = BT.state, c = BT.cost(s.tokens);
    E.cost.innerHTML = '≈ ¥ ' + c.toFixed(2) +
      '<em>' + (s.exactCost ? '来自 data.json 实价' : '估算 @ ¥1 / 百万 token') + '</em>';
    E.quip.textContent = '「' + s.quip + '」';
    E.readout.classList.toggle('hidden', !s.showNumber);
  }

  function renderScale(){
    var m = BT.mapping(BT.state.tokens);
    E.scaleTicks.innerHTML = m.ticks.map(function(t){
      return '<div class="tick" style="left:' + (t.ratio*100).toFixed(2) + '%">' +
        '10<sup>' + t.exp + '</sup><i></i><b>' + Math.round(t.ratio*100) + '%</b></div>';
    }).join('');
    E.scalePin.style.left = (m.heightRatio*100).toFixed(2) + '%';
    E.heightNow.textContent = '当前 T = ' + BT.fmt(m.tokens) +
      ' → log₁₀(T+1) = ' + m.log10.toFixed(3) + ' → 火焰高度 ' + (m.heightRatio*100).toFixed(1) + '%';
  }

  function renderEnergy(){
    var e = BT.energy(BT.state.tokens), p = e.preset;
    E.energyJ.textContent = BT.fmtNum(e.j);
    E.energyWh.textContent = BT.fmtNum(e.wh);
    E.energyKwh.textContent = BT.fmtNum(e.kwh);
    E.energyFormula.innerHTML = 'E = ' + BT.fmt(BT.state.tokens) + ' tokens × <b>' + p.j +
      ' J/token</b> × PUE <b>' + e.pue + '</b> = ' + BT.fmtNum(e.j) + ' J<br>' +
      '口径：' + esc(p.label) + '（' + p.kind + '）· ' + esc(p.note);
    E.energySource.innerHTML = '来源：<a href="' + p.url + '" target="_blank" rel="noopener">' +
      esc(p.src) + ' (' + p.year + ')</a> · PUE 见 <a href="research.md">research.md</a> · ' +
      esc(R.disclaimer);
    E.energyPresetSel.value = BT.state.energyPreset;
    E.pueSel.value = String(BT.state.pue);
  }

  function renderAnalogies(){
    var list = BT.analogies(BT.state.tokens);
    E.analogies.innerHTML = list.map(function(a){
      return '<div class="card' + (a.caveat ? ' warn' : '') + '">' +
        '<div class="v">' + BT.fmtNum(a.value) + '<em>' + esc(a.unit) + '</em></div>' +
        '<div class="l">' + esc(a.label) + (a.caveat ? '（食物化学能，非电力）' : '') + '</div>' +
        '<div class="s">' + esc(a.src) + ' · <a href="' + a.url + '" target="_blank" rel="noopener">来源</a></div>' +
        '</div>';
    }).join('');
  }

  function renderMetrics(){
    var m = BT.state.metrics;
    if(!m){
      E.metrics.innerHTML = '<span class="none">手动输入模式 · 尚未载入 agent 使用数据。可点「载入 data.json」解析本机文件（不联网、不上传）。</span>';
      return;
    }
    E.metrics.innerHTML =
      '数据源记录 <b>' + m.traces + '</b> 条' + (m.period ? ' · 周期 <b>' + esc(m.period) + '</b>' : '') +
      ' · 模型 <b>' + (m.models.length ? esc(m.models.join(' / ')) : '未标注') + '</b><br>' +
      'total_tokens <b>' + BT.fmt(m.total_tokens) + '</b> · input <b>' + BT.fmt(m.input_tokens) +
      '</b> · output <b>' + BT.fmt(m.output_tokens) + '</b><br>' +
      'cached <b>' + BT.fmt(m.cached_tokens) + '</b> · effective <b>' + BT.fmt(m.effective_tokens) +
      '</b> · effective_cost <b>¥' + m.effective_cost.toFixed(2) + '</b><br>' +
      '<span class="none">火焰尺寸取自 total_tokens（缺失时回退 effective_tokens）。</span>';
  }

  function renderBench(){
    var el = $('bench');
    if(!el) return;
    el.innerHTML = '<table class="bench-table"><thead><tr><th>统计对象</th><th>平均 token</th><th>性质</th><th>来源与口径</th></tr></thead><tbody>' +
      R.projectBenchmarks.map(function(b){
        var t = b.range ? b.range : (b.tokens == null ? '—' : BT.fmt(b.tokens));
        return '<tr' + (b.tokens == null ? ' class="na"' : '') + '><td>' + esc(b.label) + '</td>' +
          '<td><b>' + t + '</b></td><td>' + esc(b.kind) +
          '</td><td><a href="' + esc(b.url) + '" target="_blank" rel="noopener">' + esc(b.src) + '</a></td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="src"><b>口径提示：</b>一次调用 / 一个轮次 / 一个会话 / 一道基准小题 / 一个 agentic 任务 / 一个完整项目 / 每人每月是<b>七种不同统计对象</b>，只作独立标尺，不相加、不互推。可用于「一个完整项目」的保守表述是 <b>50 万–150 万 tokens</b>（第三方实测，单一样本）；换成 SWE-bench Verified 任务口径则为 <b>417 万 tokens/任务</b>。' +
      'OpenAI 每任务 token、Anthropic 每人每月 token、GitHub 每请求聚合数值、METR 每任务 token 均<b>未找到权威公开统计</b>，网上流传的「完整项目 5M–50M」无一手来源，网页不采用。完整论证见 <a href="research.md">research.md 第三节</a>。</div>';
  }

  /* 结算页旁边/下方复述「刚才逐条出现过的那组数」 */
  function renderRecap(){
    var el = $('recap');
    if(!el) return;
    var list = BT.analogies(BT.state.tokens);
    el.innerHTML = list.map(function(a){
      var v = BT.fmtAnalog(a).html;
      return '<div class="recap-row' + (a.act === 'joke' ? ' joke' : '') + (a.fiction ? ' fiction' : '') + '">' +
        '<span class="r-v">' + v + '<em>' + esc(a.unit) + '</em></span>' +
        '<span class="r-l">' + esc(a.label) + (a.fiction ? ' <b>纯梗</b>' : '') + '</span></div>';
    }).join('');
    var bEl = $('recapBench');
    if(bEl){
      bEl.innerHTML = BT.benchAnalogies(BT.state.tokens).map(function(a){
        return '<div class="recap-row"><span class="r-v">' + BT.fmtNum(a.value) + '<em>' + esc(a.unit) + '</em></span>' +
          '<span class="r-l">' + esc(a.label) + '</span></div>';
      }).join('');
    }
  }

  function renderAll(){
    renderReadout(); renderScale(); renderEnergy(); renderAnalogies(); renderMetrics(); renderBench(); renderRecap();
    E.tokenInput.value = BT.fmt(BT.state.tokens);
    E.slider.value = Math.round(Math.log10(BT.state.tokens + 1)*100);
    E.sceneName.textContent = BT.state.scene.toUpperCase();
    document.querySelectorAll('[data-scene]').forEach(function(b){
      b.classList.toggle('on', b.dataset.scene === BT.state.scene);
    });
  }

  function numberTick(){
    var s = BT.state;
    s.shown += (s.tokens - s.shown)*0.14;
    if(Math.abs(s.tokens - s.shown) < 0.6) s.shown = s.tokens;
    E.number.textContent = BT.fmt(s.shown);
    requestAnimationFrame(numberTick);
  }

  var SLOP = ['TODO','LGTM','{ }','[ ]','as an AI','vibes','// fix later','ship it','any',
    'pls fix','one more prompt','AGENTS.md','npm i','works on my machine','hallucination','rewrite again'];
  function startSlops(){
    setInterval(function(){
      var cur = renderer && renderer.intensity ? renderer.intensity : 0;
      if(cur < 0.05 || Math.random() > cur + 0.15) return;
      var e = document.createElement('span');
      e.className = 'slop';
      e.textContent = SLOP[Math.floor(Math.random()*SLOP.length)];
      e.style.left = (38 + Math.random()*24) + '%';
      e.style.top = (58 + Math.random()*14) + '%';
      e.style.setProperty('--drift', ((Math.random()-0.5)*70).toFixed(0) + 'px');
      e.style.animationDuration = (2.2 + Math.random()*1.4).toFixed(2) + 's';
      e.addEventListener('animationend', function(){ e.remove(); });
      E.slops.appendChild(e);
    }, 620);
  }

  function ensureAudio(){
    if(audioCtx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC){ hint('当前浏览器不支持 Web Audio，声音保持关闭。', 'bad'); return false; }
    audioCtx = new AC();
    var len = audioCtx.sampleRate*2, buf = audioCtx.createBuffer(1,len,audioCtx.sampleRate);
    var d = buf.getChannelData(0), last = 0;
    for(var i=0;i<len;i++){ var w = Math.random()*2-1; last = (last+0.02*w)/1.02; d[i] = last*3.2; }
    var src = audioCtx.createBufferSource(); src.buffer = buf; src.loop = true;
    var lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 460;
    noiseGain = audioCtx.createGain(); noiseGain.gain.value = 0;
    src.connect(lp); lp.connect(noiseGain); noiseGain.connect(audioCtx.destination); src.start();
    return true;
  }
  function toggleSound(){
    if(!ensureAudio()) return;
    BT.state.sound = !BT.state.sound;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    noiseGain.gain.setTargetAtTime(BT.state.sound ? 0.10 : 0, audioCtx.currentTime, 0.15);
    E.sound.textContent = '火焰声：' + (BT.state.sound ? '开' : '关');
    E.sound.classList.toggle('on', BT.state.sound);
  }
  function beep(freq){
    if(!audioCtx) return;
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.025, audioCtx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.32);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime+0.34);
  }
  function toggleBgm(){
    if(!ensureAudio()) return;
    BT.state.bgm = !BT.state.bgm;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    E.bgm.textContent = 'BGM：' + (BT.state.bgm ? '开（占位）' : '关');
    E.bgm.classList.toggle('on', BT.state.bgm);
    E.bgmPlan.classList.toggle('show', BT.state.bgm);
    clearInterval(bgmTimer); bgmTimer = 0;
    if(BT.state.bgm){
      var notes = [110, 130.81, 98, 146.83];
      beep(notes[0]);
      bgmTimer = setInterval(function(){ bgmStep = (bgmStep+1)%notes.length; beep(notes[bgmStep]); }, 420);
      hint('BGM 当前为本地合成的占位 8-bit loop；正式音轨按下方 AI 生成方案制作后替换。', 'ok');
    }
  }

  /* 中文按字换行，避免长吐槽溢出画布 */
  function wrapText(ctx, text, cx, y, maxW, lh){
    var chars = String(text).split(''), line = '', lines = [];
    for(var i=0;i<chars.length;i++){
      var t = line + chars[i];
      if(ctx.measureText(t).width > maxW && line){ lines.push(line); line = chars[i]; }
      else line = t;
    }
    if(line) lines.push(line);
    lines.forEach(function(l, i){ ctx.fillText(l, cx, y + i*lh); });
    return {y: y + lines.length*lh, n: lines.length};
  }

  function saveCard(){
    var card = document.createElement('canvas');
    card.width = 1080; card.height = 1350;
    var g = card.getContext('2d');
    g.fillStyle = '#08080a'; g.fillRect(0,0,1080,1350);
    g.imageSmoothingEnabled = false;
    g.strokeStyle = '#24242b'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(70,116); g.lineTo(1010,116); g.stroke();
    g.textAlign = 'left'; g.fillStyle = '#ece9e2';
    g.font = '700 30px ui-monospace, Menlo, Consolas, monospace';
    g.fillText('BURNING TOKENS', 70, 74);
    g.fillStyle = '#8b8a86'; g.font = '20px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    g.fillText('燃烧的 Token · 把消耗量烧成一团火', 70, 158);
    g.textAlign = 'right'; g.fillStyle = '#55545a';
    g.font = '18px ui-monospace, Menlo, Consolas, monospace';
    g.fillText(BT.sceneLabel(BT.state.scene) + ' · NO. 001 / 2026', 1010, 74);

    g.drawImage(renderer.canvas, 240, 195, 600, 750);

    var y = 1030;
    g.textAlign = 'center';
    if(BT.state.showNumber){
      g.fillStyle = '#f7f2e8';
      g.font = '700 100px ui-monospace, Menlo, Consolas, monospace';
      g.fillText(BT.fmt(BT.state.tokens), 540, 1030);
      g.fillStyle = '#8b8a86'; g.font = '20px ui-monospace, Menlo, Consolas, monospace';
      g.fillText('T O K E N S   B U R N E D', 540, 1074);
      y = 1130;
    } else {
      y = 1010;
    }
    g.fillStyle = '#ffc861'; g.font = '26px ui-monospace, Menlo, Consolas, monospace';
    g.fillText('≈ ' + BT.fmtNum(BT.energy(BT.state.tokens).wh) + ' Wh  ·  ≈ ¥' + BT.cost(BT.state.tokens).toFixed(2), 540, y);
    y += 62;
    g.fillStyle = '#c9c5bd'; g.font = '28px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    wrapText(g, '「' + BT.state.quip + '」', 540, y, 800, 42);

    g.textAlign = 'left';
    g.strokeStyle = '#24242b'; g.beginPath(); g.moveTo(70,1258); g.lineTo(1010,1258); g.stroke();
    g.fillStyle = '#a38a6d';
    g.font = '20px ui-monospace, Menlo, Consolas, monospace'; g.fillText('FUEL: AI SLOP', 70, 1302);
    g.textAlign = 'right'; g.fillStyle = '#55545a'; g.fillText('NOTHING WAS SHIPPED.', 1010, 1302);
    var a = document.createElement('a');
    a.download = 'burning-tokens-' + BT.state.scene + '-' + Math.round(BT.state.tokens) + '.png';
    a.href = card.toDataURL('image/png'); a.click();
    hint('已生成 1080×1350 作品卡片（含当前场景、' +
      (BT.state.showNumber ? 'token 数、' : '已隐去 token 数、') + '吐槽）。', 'ok');
  }

  async function doGif(presetId){
    var btns = [E.gifWechat, E.gifQq];
    btns.forEach(function(b){ b.disabled = true; });
    try{
      var r = await window.BTGIF.record(renderer, presetId, function(i, total){
        E.progress.textContent = '录制中 ' + i + ' / ' + total + ' 帧…';
      });
      window.BTGIF.download(r);
      E.progress.textContent = '';
      var p = r.preset;
      hint('已导出 ' + p.label + ' GIF：' + p.w + '×' + p.h + ' / ' + r.frames + ' 帧 / ' +
        Math.round(r.sizeKB) + ' KB（上限 ' + p.limitKB + ' KB，' + (r.withinLimit ? '达标' : '超限，建议换小预设或降低 token 值') +
        '）。' + p.note, r.withinLimit ? 'ok' : 'bad');
    }catch(err){
      E.progress.textContent = '';
      hint('GIF 导出失败：' + err.message, 'bad');
    }finally{
      btns.forEach(function(b){ b.disabled = false; });
    }
  }

  function share(){
    var url = BT.shareURL();
    var done = function(){ hint('已复制分享链接（含 token / 场景 / 能耗口径参数）：' + url, 'ok'); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(done, function(){ window.prompt('复制此链接：', url); });
    } else window.prompt('复制此链接：', url);
  }

  function bind(){
    E.tokenInput.addEventListener('input', function(){
      BT.setTokens(BT.parseTokens(E.tokenInput.value), 'silent');
      BT.pickQuip(); renderAll();
    });
    E.tokenInput.addEventListener('blur', function(){ E.tokenInput.value = BT.fmt(BT.state.tokens); });
    E.slider.addEventListener('input', function(){
      var v = parseFloat(E.slider.value);
      BT.setTokens(v === 0 ? 0 : Math.round(Math.pow(10, v/100)-1), 'slider');
    });

    document.querySelectorAll('[data-scene]').forEach(function(b){
      b.addEventListener('click', function(){
        BT.state.scene = b.dataset.scene;
        if(renderer.setScene) renderer.setScene();
        BT.emit('scene');
      });
    });
    E.reload.addEventListener('click', function(){ BT.pickQuip(); renderReadout(); });
    E.toggleNum.addEventListener('click', function(){
      BT.state.showNumber = !BT.state.showNumber;
      E.toggleNum.textContent = BT.state.showNumber ? '隐藏数字' : '显示数字';
      E.readout.classList.toggle('hidden', !BT.state.showNumber);
    });
    E.energyPresetSel.addEventListener('change', function(){
      BT.state.energyPreset = E.energyPresetSel.value; BT.emit('energy');
    });
    E.pueSel.addEventListener('change', function(){
      BT.state.pue = parseFloat(E.pueSel.value); BT.emit('energy');
    });
    E.sound.addEventListener('click', toggleSound);
    E.bgm.addEventListener('click', toggleBgm);

    E.load.addEventListener('click', function(){ E.file.click(); });
    E.file.addEventListener('change', function(){
      var f = E.file.files && E.file.files[0];
      if(!f) return;
      var reader = new FileReader();
      reader.onload = function(){
        try{
          var m = BT.applyData(JSON.parse(reader.result));
          renderAll();
          hint('已解析 ' + m.traces + ' 条记录，合计 ' + BT.fmt(m.total_tokens) +
            ' tokens；实价 ¥' + m.effective_cost.toFixed(2) + '。仅本机解析，未上传。', 'ok');
        }catch(err){ hint('解析失败：' + err.message + '。需要含 traces[] 的 data.json。', 'bad'); }
        E.file.value = '';
      };
      reader.readAsText(f);
    });

    E.savePng.addEventListener('click', saveCard);
    E.gifWechat.addEventListener('click', function(){ doGif('wechat'); });
    E.gifQq.addEventListener('click', function(){ doGif('qq'); });
    E.share.addEventListener('click', share);
    BT.on(renderAll);
  }

  function init(opts){
    renderer = opts.renderer;
    ['hint','progress','number','cost','quip','readout','scaleTicks','scalePin','heightNow',
     'energyJ','energyWh','energyKwh','energyPresetSel','pueSel','energyFormula','energySource',
     'analogies','metrics','tokenInput','slider','sceneName','slops','reload','toggleNum',
     'energyPreset','sound','bgm','bgmPlan','load','file','savePng','gifWechat','gifQq','share'
    ].forEach(function(id){ E[id] = $(id); });

    E.energyPresetSel.innerHTML = R.energyPresets.map(function(p){
      return '<option value="' + p.id + '">' + esc(p.label) + ' · ' + p.j + ' J/token（' + p.kind + '）</option>';
    }).join('');
    E.pueSel.innerHTML = R.pueOptions.map(function(o){
      return '<option value="' + o.v + '">' + esc(o.label) + '</option>';
    }).join('');
    E.bgmPlan.innerHTML = '<table><thead><tr><th>方案</th><th>商用</th><th>时长</th></tr></thead><tbody>' +
      R.bgmPlan.map(function(b){
        return '<tr><td><a href="' + b.url + '" target="_blank" rel="noopener">' + esc(b.name) +
          '</a></td><td>' + esc(b.commercial) + '</td><td>' + esc(b.length) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p>规划：3 条 30–60 s 无缝 loop（dark ambient / 8-bit / 篝火环境音），48 kHz WAV 转 OGG/AAC，按场景切换、懒加载、默认静音。当前开关播放的是本地合成占位音，不是 AI 生成音轨。避坑：免费档素材普遍无商用权；MusicGen 权重为 CC-BY-NC 4.0，不可商用。使用前复核当日条款。</p>';

    BT.readURL();
    /* 关键：readURL 之后才能预热。否则预热跑在 scene / 目标强度生效之前，
       首屏会是一团没长起来的火；3D 也会按默认场景建模，切场景不生效。 */
    if(renderer.resetFire) renderer.resetFire();
    bind();
    renderAll();
    startSlops();
    numberTick();
    /* 渲染循环由 BTSTORY 在三幕进入结算页时启动，Hero / 幻灯片阶段不空转 */
    window.BT_APP = {renderer:renderer, ui:E, doGif:doGif, saveCard:saveCard, share:share};
  }

  return {init:init, renderAll:renderAll};
})();
