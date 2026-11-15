/* GIF 录制导出 — 纯本地逐帧捕获，预设来自 research.js 的微信 / QQ 规格
   覆盖层内容 = 当前场景（画布本体）+ token 数（受 showNumber 控制）+ 毒舌吐槽 */
window.BTGIF = (function(){
  'use strict';
  var BT = window.BT, R = window.BT_RESEARCH;

  function nextTick(){ return new Promise(function(r){ setTimeout(r, 0); }); }

  /* 小尺寸下中文按字换行 */
  function wrap(ctx, text, cx, y, maxW, lh){
    var chars = String(text).split(''), line = '', lines = [];
    for(var i=0;i<chars.length;i++){
      var t = line + chars[i];
      if(ctx.measureText(t).width > maxW && line){ lines.push(line); line = chars[i]; }
      else line = t;
    }
    if(line) lines.push(line);
    lines.forEach(function(l, i){ ctx.fillText(l, cx, y + i*lh); });
    return y + lines.length*lh;
  }

  function overlay(ctx, w, h){
    var topH = Math.round(h*0.10);
    var botH = Math.round(h*0.30);
    /* 渐变遮罩，避免硬边把箱体切成两截 */
    var gt = ctx.createLinearGradient(0, 0, 0, topH * 1.6);
    gt.addColorStop(0, 'rgba(8,8,10,.92)');
    gt.addColorStop(1, 'rgba(8,8,10,0)');
    ctx.fillStyle = gt; ctx.fillRect(0, 0, w, topH * 1.6);

    var gy = h - botH;
    var gb = ctx.createLinearGradient(0, gy - Math.round(botH*0.22), 0, gy + Math.round(botH*0.34));
    gb.addColorStop(0, 'rgba(8,8,10,0)');
    gb.addColorStop(1, 'rgba(8,8,10,.94)');
    ctx.fillStyle = gb;
    ctx.fillRect(0, gy - Math.round(botH*0.22), w, Math.round(botH*0.56));
    ctx.fillStyle = 'rgba(8,8,10,.94)';
    ctx.fillRect(0, gy + Math.round(botH*0.34), w, h - (gy + Math.round(botH*0.34)));

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8b8a86';
    ctx.font = '600 ' + Math.round(w*0.036) + 'px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText('BURNING TOKENS', w/2, Math.round(topH*0.70));

    var y = h - botH + Math.round(botH * (BT.state.showNumber ? 0.46 : 0.58));
    if(BT.state.showNumber){
      ctx.fillStyle = '#ffc861';
      ctx.font = '700 ' + Math.round(w*0.085) + 'px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText(BT.fmtShort(BT.state.tokens), w/2, y);
      y += Math.round(h*0.070);
    }
    ctx.fillStyle = '#d6d1c7';
    var fs = Math.max(7, Math.round(w*0.037));
    ctx.font = fs + 'px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    wrap(ctx, '「' + BT.state.quip + '」', w/2, y, w*0.90, Math.round(fs*1.5));
  }

  function preset(id){ return R.gifPresets.filter(function(p){return p.id===id;})[0]; }

  async function record(renderer, presetId, onProgress){
    if(!window.GIFENC) throw new Error('GIF 编码器未加载');
    var p = preset(presetId) || R.gifPresets[0];
    var G = window.GIFENC;
    var total = Math.round(p.fps * p.seconds);
    var buf = document.createElement('canvas');
    buf.width = p.w; buf.height = p.h;
    var bctx = buf.getContext('2d', {willReadFrequently:true});
    var gif = G.GIFEncoder();
    var palette = null;
    var running = renderer ? true : false;
    if(running) renderer.stop();

    try{
      for(var i=0;i<total;i++){
        if(renderer){ renderer.step(); renderer.step(); }
        bctx.drawImage(renderer.canvas, 0, 0, p.w, p.h);
        overlay(bctx, p.w, p.h);
        var rgba = bctx.getImageData(0, 0, p.w, p.h).data;
        if(!palette) palette = G.quantize(rgba, p.colors, {format:'rgb565'});
        var index = G.applyPalette(rgba, palette, 'rgb565');
        var opts = {palette:palette, delay:Math.round(1000/p.fps), repeat:0, dispose:2};
        gif.writeFrame(index, p.w, p.h, opts);
        if(onProgress) onProgress(i+1, total);
        await nextTick();
      }
      gif.finish();
      var bytes = gif.bytes();
      var blob = new Blob([bytes], {type:'image/gif'});
      return {blob:blob, sizeKB:blob.size/1024, frames:total, preset:p,
        withinLimit: blob.size/1024 <= p.limitKB};
    } finally {
      if(running) renderer.start();
    }
  }

  function download(result){
    var a = document.createElement('a');
    a.download = 'burning-tokens-' + BT.state.scene + '-' + result.preset.id + '-' +
      Math.round(BT.state.tokens) + '.gif';
    a.href = URL.createObjectURL(result.blob);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 30000);
  }

  return {record:record, download:download, preset:preset};
})();
