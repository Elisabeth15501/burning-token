/* 核心工作流：输入 agent 使用数据 → 解析数值指标 → 映射火焰尺寸 → 能量/类比/吐槽
   2D 与 3D 两个页面共用本模块，渲染器只消费 mapping() 的结果。 */
window.BT = (function(){
  'use strict';
  var R = window.BT_RESEARCH;
  var listeners = [];

  /* 输入上限与对数刻度宽度：2026-11-21 由 1e12 / 9 提升到 1e15 / 15，
     使 extreme 用户（周 2.1e11）与大型 agentic 项目（数万亿）可见且可区分。
     所有入口统一走这两处常量，避免文本框/滑块/URL/data.json 各设各的。 */
  var MAX_TOKENS = 1e15;
  var LOG_SPAN = 15;

  var QUIPS = [
    {max:1e3, list:[
      '这点火，还不够暖一次 prompt。','你省下的钱，还不够买根火柴。','模型：收到。火：没感觉到。',
      '第一次让 AI 干活，它先帮你点了根蜡。','这个用量，连烟都没有。','恭喜，你的碳足迹约为一只萤火虫。']},
    {max:1e5, list:[
      'prompt 写了三千字，产出是这团火。','这个数，够让模型夸你 47 次「Absolutely right!」。',
      '烧掉的不是钱，是本来能上线的那个按钮。','一杯美式，换一小时「马上就好」。',
      '需求 100%，代码 0%，火 100%。','你让它重构了三次，它重构了火焰高度。']},
    {max:1e6, list:[
      '一顿外卖钱，换来一堆 TODO 和一场大火。','这堆 AI 废料，市值一顿火锅。',
      '够让 agent 自信地改坏 6 个文件。','「这个简单，我直接帮你写完」——火就是从这儿开始烧的。',
      '你的 vibes 很足，你的 git log 很空。','每一个 token，都曾经是一句「应该没问题」。']},
    {max:1e7, list:[
      '这个数够请朋友吃顿饭，你请了 GPU。','AI 说「我来搞定」，于是搞定了这场火。',
      '一个周末、八个 agent、零个 commit。','你的项目有 12 个 md 文档和 0 个用户。',
      '这把火，是三百次「再试一次」堆出来的。','模型没有幻觉，是你对进度有幻觉。']},
    {max:1e8, list:[
      '这个数字，已经不适合叫「试一下」了。','你不是在训练模型，你是在训练火。',
      '火这么大，一定有个功能快上线了吧？……没有。','财务问这笔是什么，你说：氛围。',
      '恭喜，你已成为算力供暖行业的散户。','别关页面，这是你今天最有产出的东西。']},
    {max:1e11, list:[
      '这个量级，电费单看了都要沉默。','你不是在烧 token，你是在给电网做压力测试。',
      '火已经烧出视口了，进度条还在 0%。','这不是一次创作，这是一次小型供暖工程。',
      '如果 token 能种树，这里早就是森林了。','恭喜解锁：Vibecoder 终身成就奖（自封）。']},
    {max:Infinity, list:[
      '数万亿 token 烧出来的火，和一句「差不多好了」。','这个数字已经不适合用「次」计量了。',
      '你的 agent 舰队把电变成了热和一个 LICENSE。','财务看到这个数，决定把 AI 预算改成供暖预算。',
      '如果 token 能种树，这片林子能承包一个省。','恭喜：你已把「一次性实验」跑成了国家级工程。']}
  ];

  var state = {
    tokens: 3330000,
    shown: 3330000,
    target: 0,
    current: 0,
    scene: 'dumpster',
    energyPreset: 'paper',
    pue: 1.41,
    unitCost: 1 / 1e6,
    exactCost: false,
    metrics: null,
    sound: false,
    bgm: false,
    showNumber: true,
    quip: '',
    lastQuip: -1
  };

  function emit(why){ listeners.forEach(function(fn){ try{ fn(why); }catch(e){} }); }
  function on(fn){ listeners.push(fn); return function(){ listeners = listeners.filter(function(x){return x!==fn;}); }; }

  /* ===== 全站数字口径（2026-11-23）=====
     1. 中文语境统一用中文计数单位（万/亿/万亿），不用 K/M（要心算 ×1000）。
     2. 最多 3 位有效数字，避免 391.27 这类长尾。
     3. 类比数值只走 fmtAnalog()：卡片 / 幻灯片 / 结算 / bench 逐字一致。
     4. token 总量用千分位；极小概率用 1/N；超小值用 ×10ⁿ（不用 e 记法）。
     5. 能量用 fmtEnergy() 自动选 kWh/Wh，避免「2.35 K Wh」中英混排。 */
  function fmt(n){
    if(!isFinite(n)) return '—';
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  /* 最多 3 位有效数字，去掉无意义的尾零 */
  function sig(v){
    if(!isFinite(v)) return '—';
    if(v === 0) return '0';
    var a = Math.abs(v), s;
    if(a >= 100)     s = String(Math.round(v));
    else if(a >= 10) s = v.toFixed(1);
    else             s = v.toFixed(2);
    return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
  function fmtNum(v){
    if(!isFinite(v)) return '—';
    var neg = v < 0, a = Math.abs(v), s;
    if(a >= 1e12)      s = sig(a/1e12) + ' 万亿';
    else if(a >= 1e8)  s = sig(a/1e8) + ' 亿';
    else if(a >= 1e4)  s = sig(a/1e4) + ' 万';
    else if(a >= 1e3)  s = fmt(Math.round(a));
    else s = sig(a);
    return (neg ? '-' : '') + s;
  }
  function fmtShort(n){ return fmtNum(n); } /* 兼容旧调用，口径已统一 */
  function fmtEnergy(wh){
    if(!isFinite(wh)) return '—';
    return wh >= 1000 ? fmtNum(wh/1000) + ' kWh' : sig(wh) + ' Wh';
  }
  /* 费用：小额保留到分（¥0.10 比 ¥0.1 规范），大额改中文计数避免 ¥1000000000.00 */
  function fmtMoney(v){
    if(!isFinite(v)) return '—';
    if(v > 0 && v < 0.01) return '<0.01';
    if(v < 1000) return v.toFixed(2);
    return fmtNum(v);
  }
  function parseTokens(s){
    var v = parseFloat(String(s).replace(/[^\d.]/g, ''));
    if(!isFinite(v) || v < 0) return 0;
    return Math.min(v, MAX_TOKENS);
  }

  /* ---- 数值 → 火焰尺寸：唯一映射，两个渲染器共用 ---- */
  function intensity(t){
    if(!(t > 0)) return 0;
    return Math.min(1, Math.log10(t + 1) / LOG_SPAN);
  }
  function heightRatio(t){ return 0.18 + 0.82 * intensity(t); }
  function mapping(t){
    var i = intensity(t), h = heightRatio(t);
    return {
      tokens: t,
      log10: t > 0 ? Math.log10(t + 1) : 0,
      intensity: i,
      heightRatio: h,
      /* 渲染器用它反解初速，使火焰实测高度贴合 heightRatio */
      formula: 'h = 0.18 + 0.82 × log₁₀(T + 1) / ' + LOG_SPAN,
      ticks: [0,3,6,9,12,15].map(function(e){
        var v = Math.pow(10, e);
        return {exp:e, tokens:v, ratio:0.18 + 0.82 * Math.log10(v + 1) / LOG_SPAN};
      })
    };
  }

  function preset(){ return R.energyPresets.filter(function(p){return p.id===state.energyPreset;})[0] || R.energyPresets[2]; }
  function energy(t){
    var p = preset();
    var j = t * p.j * state.pue;
    return {j:j, wh:j/3600, kwh:j/3600000, preset:p, pue:state.pue};
  }
  function cost(t){ return t * state.unitCost; }

  /* 第一幕：正常能量类比（有真实基准） */
  function energyAnalogies(t){
    var wh = energy(t).wh;
    return R.analogies.map(function(a){
      /* tokens 项按 token 基准换算：J/token 与 PUE 在分子分母约掉，不随预设漂移 */
      return {id:a.id, act:'real', label:a.label,
        value: (a.tokens > 0) ? (t/a.tokens) : (wh/a.wh), unit:a.unit,
        src:a.src, url:a.url, caveat:!!a.caveat, fiction:false};
    });
  }
  /* 第二幕：玩梗类比。physics 项有基准，fiction 项是纯文学，必须能被一眼区分 */
  function jokeAnalogies(t){
    var wh = energy(t).wh;
    return R.jokeAnalogies.map(function(a){
      var v = wh / a.wh;
      return {id:a.id, act:'joke', label:a.label, value:v, unit:a.unit,
        /* 极小值时给倒数，避免屏幕上只剩一串 1e-7 */
        inv: (v > 0 && v < 0.01) ? 1/v : null,
        src:a.src, url:a.url, caveat:false, fiction:a.kind !== 'physics'};
    });
  }
  /* 叙事顺序：先一本正经，再开始抽象 */
  function analogies(t){ return energyAnalogies(t).concat(jokeAnalogies(t)); }
  /* 与「一个项目 / 一个任务」的换算，独立标尺，不参与叙事 */
  function benchAnalogies(t){
    return R.projectBenchmarks.filter(function(b){ return b.tokens > 0; }).map(function(b){
      return {label:b.label, value:t/b.tokens, unit:'个', src:b.kind + ' · ' + b.src, url:b.url};
    });
  }

  function pickQuip(){
    var t = state.tokens;
    var b = QUIPS.filter(function(q){ return t < q.max; })[0] || QUIPS[QUIPS.length-1];
    var i = Math.floor(Math.random()*b.list.length);
    if(b.list.length > 1 && i === state.lastQuip) i = (i+1) % b.list.length;
    state.lastQuip = i;
    state.quip = b.list[i];
    return state.quip;
  }

  /* ---- 输入：agent-analytics-report 的 data.json ---- */
  function parseData(json){
    var traces = Array.isArray(json) ? json
      : (json && (json.traces || (json.data && json.data.traces))) || null;
    if(!Array.isArray(traces) || !traces.length) throw new Error('未找到 traces[]');
    var num = function(v){ var n = Number(v); return isFinite(n) ? n : 0; };
    var sum = {total:0, input:0, output:0, cached:0, effective:0, cost:0};
    traces.forEach(function(tr){
      var total = num(tr.total_tokens != null ? tr.total_tokens : tr.effective_tokens);
      sum.total += total;
      sum.input += num(tr.input_tokens);
      sum.output += num(tr.output_tokens);
      sum.cached += num(tr.cached_tokens);
      sum.effective += num(tr.effective_tokens);
      sum.cost += num(tr.effective_cost != null ? tr.effective_cost : tr.total_cost);
    });
    if(sum.total <= 0) throw new Error('traces[] 内没有可用的 token 数值');
    return {
      traces: traces.length,
      total_tokens: sum.total, input_tokens: sum.input, output_tokens: sum.output,
      cached_tokens: sum.cached, effective_tokens: sum.effective,
      effective_cost: sum.cost,
      period: (json && json.meta && json.meta.period) || null,
      models: (function(){
        var s = {};
        traces.forEach(function(tr){ if(tr.model_name) s[tr.model_name] = 1; });
        return Object.keys(s).slice(0, 6);
      })()
    };
  }
  function applyData(json){
    var m = parseData(json);
    state.metrics = m;
    state.unitCost = m.effective_cost > 0 ? m.effective_cost / m.total_tokens : 1/1e6;
    state.exactCost = m.effective_cost > 0;
    setTokens(m.total_tokens, 'data');
    return m;
  }

  function setTokens(t, why){
    state.tokens = Math.min(Math.max(0, Number(t) || 0), MAX_TOKENS);
    state.target = intensity(state.tokens);
    if(why !== 'silent') pickQuip();
    emit(why || 'tokens');
  }
  function set(key, value){
    state[key] = value;
    emit(key);
  }

  function shareURL(){
    var base = location.href.split('?')[0].split('#')[0];
    return base + '?t=' + Math.round(state.tokens) + '&s=' + state.scene + '&e=' + state.energyPreset;
  }
  function readURL(){
    var q = new URLSearchParams(location.search);
    var t = q.get('t');
    if(t !== null && isFinite(Number(t))) state.tokens = Math.min(Math.max(0, Number(t)), MAX_TOKENS);
    if(q.get('s')) state.scene = q.get('s');
    if(q.get('e')) state.energyPreset = q.get('e');
    state.shown = state.tokens;
    state.target = intensity(state.tokens);
    state.current = state.target;
    pickQuip();
  }

  /* 类比数值的唯一出口：幻灯片 / 类比卡片 / 结算清单 / bench 必须共用，
     避免同一条数据在不同位置出现 1.7e-6 与 1/591,608 两种写法。 */
  function fmtAnalog(a){
    if(a.inv && a.inv <= 1e7){ return {text:'1/' + fmt(a.inv), html:'1/' + fmt(a.inv)}; }
    if(a.value > 0 && a.value < 0.01){
      var e = Math.floor(Math.log10(a.value));
      var m = (a.value / Math.pow(10, e)).toFixed(1);
      var sup = String(e).replace(/-/g, '⁻').replace(/\d/g, function(d){
        return '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)];
      });
      return {text: m + ' × 10' + sup, html: m + ' × 10<sup>' + e + '</sup>'};
    }
    var s = fmtNum(a.value);
    return {text: s, html: s};
  }

  var SCENE_LABELS = {dumpster:'垃圾箱火灾', campfire:'营火', barbecue:'烧烤'};
  function sceneLabel(s){ return SCENE_LABELS[s] || s; }

  return {
    state:state, R:R, on:on, emit:emit,
    fmt:fmt, fmtShort:fmtShort, fmtNum:fmtNum, fmtEnergy:fmtEnergy, fmtMoney:fmtMoney, parseTokens:parseTokens,
    intensity:intensity, heightRatio:heightRatio, mapping:mapping,
    preset:preset, energy:energy, cost:cost,
    analogies:analogies, energyAnalogies:energyAnalogies, jokeAnalogies:jokeAnalogies,
    benchAnalogies:benchAnalogies, sceneLabel:sceneLabel, SCENE_LABELS:SCENE_LABELS,
    fmtAnalog:fmtAnalog,
    pickQuip:pickQuip, parseData:parseData, applyData:applyData,
    setTokens:setTokens, set:set, shareURL:shareURL, readURL:readURL
  };
})();
