/* 三幕叙事编排：Hero（输入）→ 类比幻灯片 → 结算（垃圾箱火灾）
   2D 与 3D 两页共用，渲染器由 ui.js 注入。 */
window.BTSTORY = (function(){
  'use strict';
  var BT = window.BT, R = window.BT_RESEARCH;
  var $ = function(id){ return document.getElementById(id); };
  var E = {}, renderer = null, phase = 'input';
  var slides = [], at = 0, timer = 0, playing = false;
  var HOLD_MS = 2100, HOLD_LAST_MS = 2700;

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* 幻灯片数值表述统一走 BT.fmtAnalog，保证与结算清单口径一致 */
  function fmtSlide(a){ return BT.fmtAnalog(a).html; }

  function show(name){
    phase = name;
    document.body.setAttribute('data-phase', name);
    E.actInput.hidden = name !== 'input';
    E.actSlides.hidden = name !== 'slides';
    E.actSettle.hidden = name !== 'settle';
    window.scrollTo(0, 0);
  }

  function heroSync(){
    E.heroTokens.textContent = BT.fmt(BT.state.tokens);
    E.heroEnergy.textContent = BT.fmtEnergy(BT.energy(BT.state.tokens).wh);
  }

  function buildSlides(){
    slides = BT.analogies(BT.state.tokens);
    E.slideTotal.textContent = String(slides.length).padStart(2, '0');
    E.dots.innerHTML = slides.map(function(a, i){
      return '<i data-i="' + i + '" class="' + (a.act === 'joke' ? 'joke' : 'real') + '"></i>';
    }).join('');
    /* 重新裁定「正常 / 开始玩梗」的分界，让界面上有明确的一道线 */
    var firstJoke = slides.findIndex(function(a){ return a.act === 'joke'; });
    E.actBreak.textContent = firstJoke > 0 ? 'WARNING：从第 ' + (firstJoke+1) + ' 张开始，数据开始胡说' : '';
    E.actBreak.hidden = firstJoke <= 0;
  }

  function renderSlide(i){
    var a = slides[i];
    if(!a) return;
    var joke = a.act === 'joke';
    E.slideCard.className = 'slide-card ' + (joke ? 'joke' : 'real') + (a.fiction ? ' fiction' : '');
    E.slideCard.innerHTML =
      '<div class="s-tag">' + (joke ? (a.fiction ? 'PURE JOKE · 无物理依据' : 'JOKE · 有基准但很荒唐') : 'PHYSICS · 有真实基准') + '</div>' +
      '<div class="s-val">' + fmtSlide(a) + '<em>' + esc(a.unit) + '</em></div>' +
      '<div class="s-label">' + esc(a.label) + '</div>' +
      '<div class="s-src">' + esc(a.src) + (a.url ? ' · <a href="' + esc(a.url) + '" target="_blank" rel="noopener">来源</a>' : '') + '</div>';
    /* 重新触发入场动画 */
    E.slideCard.classList.remove('in');
    void E.slideCard.offsetWidth;
    E.slideCard.classList.add('in');

    E.slideIdx.textContent = String(i+1).padStart(2, '0');
    Array.prototype.forEach.call(E.dots.children, function(d, k){
      d.className = (slides[k].act === 'joke' ? 'joke' : 'real') + (k < i ? ' done' : '') + (k === i ? ' on' : '');
    });
  }

  function tick(){
    renderSlide(at);
    var hold = (at === slides.length - 1) ? HOLD_LAST_MS : HOLD_MS;
    timer = setTimeout(function(){
      at++;
      if(at >= slides.length){ toSettle(); }
      else tick();
    }, hold);
  }

  function play(){
    if(playing) return;
    playing = true;
    at = 0;
    buildSlides();
    if(!slides.length){ toSettle(); return; }
    show('slides');
    tick();
  }
  function next(){
    clearTimeout(timer);
    if(at >= slides.length - 1){ toSettle(); return; }
    at++; tick();
  }

  function toSettle(){
    clearTimeout(timer);
    playing = false;
    show('settle');
    /* 结算页点燃：渲染器直接置到目标强度，视觉上的「点燃」交给 CSS 过渡，
       这样截图与录屏不会截到一团还没长起来的火。 */
    if(renderer && renderer.resetFire) renderer.resetFire();
    var stage = $('stage');
    if(stage){
      stage.classList.remove('igniting');
      void stage.offsetWidth;
      stage.classList.add('igniting');
    }
    if(renderer && renderer.start) renderer.start();
    if(window.BTUI && window.BTUI.renderAll) window.BTUI.renderAll();
  }

  function backToInput(){
    clearTimeout(timer);
    playing = false;
    if(renderer && renderer.stop) renderer.stop();
    show('input');
    heroSync();
  }

  function bind(){
    E.start.addEventListener('click', function(){
      BT.pickQuip();
      if(window.BTUI && window.BTUI.renderAll) window.BTUI.renderAll();
      play();
    });
    E.skip.addEventListener('click', toSettle);
    E.slideCard.addEventListener('click', next);
    E.dots.addEventListener('click', function(ev){
      var t = ev.target;
      if(!t || t.tagName !== 'I') return;
      var i = parseInt(t.dataset.i, 10);
      if(!isFinite(i)) return;
      clearTimeout(timer);
      at = i;
      tick();
    });
    E.recalc.addEventListener('click', backToInput);
    BT.on(function(){
      if(phase === 'input') heroSync();
    });
  }

  function init(opts){
    renderer = opts && opts.renderer;
    ['actInput','actSlides','actSettle','start','skip','slideCard','slideIdx','slideTotal',
     'dots','actBreak','heroTokens','heroEnergy','recalc'
    ].forEach(function(id){
      var el = $(id);
      if(!el) console.warn('[btstory] 缺少节点 #' + id);
      E[id] = el;
    });
    bind();
    heroSync();
    show('input');
    /* 支持 ?t=...&settle=1 直接进入结算页，方便分享与截图 */
    var q = new URLSearchParams(location.search);
    if(q.get('settle') === '1' || q.get('phase') === 'settle') toSettle();
    else if(q.get('auto') === '1') play();
  }

  return {
    init: init,
    play: play,
    toSettle: toSettle,
    backToInput: backToInput,
    get phase(){ return phase; },
    get slides(){ return slides; }
  };
})();
