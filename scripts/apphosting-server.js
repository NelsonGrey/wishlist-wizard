import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../packages/web/dist');
const host = '0.0.0.0';
const port = Number(process.env.PORT || 8080);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function resolveFilePath(urlPath) {
  const safePath = decodeURIComponent(urlPath.split('?')[0]).replace(/\0/g, '');
  const relativePath = safePath === '/' ? 'index.html' : safePath.replace(/^\/+/, '');
  const candidate = path.resolve(distDir, relativePath);
  const relativeToRoot = path.relative(distDir, candidate);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return candidate;
}

const server = http.createServer(async (req, res) => {
  const requestPath = req.url || '/';
  const directFile = resolveFilePath(requestPath);

  if (directFile) {
    try {
      const fileStat = await stat(directFile);
      if (fileStat.isFile()) {
        res.writeHead(200, { 'Content-Type': getContentType(directFile) });
        createReadStream(directFile).pipe(res);
        return;
      }
    } catch {
      // Fall through to SPA fallback.
    }
  }

  const fallback = path.join(distDir, 'index.html');
  if (!existsSync(fallback)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build output missing: packages/web/dist/index.html');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  createReadStream(fallback).pipe(res);
});

server.listen(port, host, () => {
  console.log(`App Hosting static server listening on ${host}:${port}`);
});
