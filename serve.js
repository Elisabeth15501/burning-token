/* 本地静态服务（Node 标准库，无额外依赖）— 只监听 127.0.0.1 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const cfg = require('./run.config.json');

const ROOT = __dirname;
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.md':'text/markdown; charset=utf-8','.png':'image/png','.gif':'image/gif',
  '.svg':'image/svg+xml','.ico':'image/x-icon'};

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (e) { res.writeHead(400); res.end('bad request'); return; }
  if (pathname === '/') pathname = '/' + cfg.server.entry2d;
  const full = path.resolve(ROOT, '.' + pathname);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
    fs.createReadStream(full).pipe(res);
  });
});

server.listen(cfg.server.port, cfg.server.host, () => {
  console.log('BURNING TOKENS (local only)');
  console.log('  2D : http://' + cfg.server.host + ':' + cfg.server.port + '/' + cfg.server.entry2d);
  console.log('  3D : http://' + cfg.server.host + ':' + cfg.server.port + '/' + cfg.server.entry3d);
  console.log('  调研: http://' + cfg.server.host + ':' + cfg.server.port + '/research.md');
  console.log('  不上传 GitHub；按 Ctrl+C 停止。');
});
