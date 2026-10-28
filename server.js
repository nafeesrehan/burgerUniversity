import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  let cleanUrl = req.url.split('?')[0];
  if (req.method === 'GET' && cleanUrl === '/api/turnstile-config') {
    const siteKey = process.env.TURNSTILE_SITE_KEY || "0x4AAAAAAFmVNwzvuJRACzu8";
    res.writeHead(siteKey ? 200 : 503, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(siteKey
      ? { siteKey }
      : { error: 'TURNSTILE_SITE_KEY is not configured' }));
    return;
  }


  if (cleanUrl === '/' || cleanUrl === '') {
    cleanUrl = '/index.html';
  } else if (cleanUrl === '/app.js') {
    cleanUrl = '/scrollytelling.js';
  }

  // Safe file path resolution
  let safePath = path.normalize(path.join(__dirname, cleanUrl));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // If path doesn't exist and has no extension, check if appending .html works
  if (!fs.existsSync(safePath) && !path.extname(safePath)) {
    const htmlCandidate = safePath + '.html';
    if (fs.existsSync(htmlCandidate)) {
      safePath = htmlCandidate;
    }
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found: ' + cleanUrl);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Aggressive caching for image frames to ensure zero-stutter scrubbing
    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
    };

    if (ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.png') {
      headers['Cache-Control'] = 'public, max-age=86400, immutable';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
