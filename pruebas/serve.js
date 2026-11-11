// Servidor estático mínimo para probar la web en local (sin dependencias). Uso: node serve.js CARPETA PUERTO
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || '.'), port = +(process.argv[3] || 8765);
const T = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.enc': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain'};
function handler(req, res){
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e){ res.writeHead(404); return res.end('404'); }
    res.writeHead(200, {'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store'}); res.end(b); });
}
if (require.main === module) http.createServer(handler).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port + '/'));
module.exports = (root2, port2) => new Promise(r => { const s = http.createServer((q, a) => { req0(q, a, root2); }); s.listen(port2, '127.0.0.1', () => r(s)); });
function req0(req, res, r){ const R = path.resolve(r); let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(R, p); if (!f.startsWith(R)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e){ res.writeHead(404); return res.end('404'); } res.writeHead(200, {'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store'}); res.end(b); }); }
