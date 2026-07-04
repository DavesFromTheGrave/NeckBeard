// Dev server with caching disabled so edits always land. Node, zero deps.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
               '.json': 'application/json', '.css': 'text/css' };

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(data);
  });
}).listen(4181, () => console.log('neckbeard-devvit on :4181'));
