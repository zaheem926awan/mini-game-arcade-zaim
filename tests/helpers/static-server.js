// Minimal static server for tests. Mimics vercel.json: cleanUrls + trailingSlash:false.
// (Test helper only - it is not part of the deployed site.)
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.xml':'application/xml', '.txt':'text/plain', '.json':'application/json' };
function start(root, port = 0) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.length > 1 && p.endsWith('/')) { res.writeHead(308, { Location: p.slice(0, -1) }); return res.end(); }
      if (p.endsWith('.html')) { res.writeHead(308, { Location: p.slice(0, -5) || '/' }); return res.end(); }   // cleanUrls redirect
      const cands = [p === '/' ? '/index.html' : p, p + '.html'];
      for (const c of cands) {
        const f = path.join(root, c);
        if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) {
          res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
          return fs.createReadStream(f).pipe(res);
        }
      }
      const nf = path.join(root, '404.html');
      res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'Not found');
    });
    srv.listen(port, '127.0.0.1', () => resolve({ srv, url: 'http://127.0.0.1:' + srv.address().port }));
  });
}
module.exports = { start };
