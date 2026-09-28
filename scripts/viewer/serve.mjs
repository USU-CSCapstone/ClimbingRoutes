// Serves the repo on http://localhost:8765/ so viewer/index.html can load the models in
// data/models/ (browsers won't load them from file://). Localhost only; hidden paths such
// as .git are refused. Run from anywhere: node scripts/viewer/serve.mjs [port]
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 8765);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (path === '/') {
    res.writeHead(302, { Location: '/viewer/' }).end();
    return;
  }
  if (path.split('/').some((part) => part.startsWith('.'))) {
    res.writeHead(404).end();
    return;
  }
  if (path.endsWith('/')) path += 'index.html';

  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT) && file + sep !== ROOT) {
    res.writeHead(404).end();
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) {
      res.writeHead(info.isDirectory() ? 302 : 404, info.isDirectory() ? { Location: `${path}/` } : {}).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Pass another one: node scripts/viewer/serve.mjs 8766`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving ${ROOT} on http://localhost:${PORT}/viewer/ (Ctrl+C to stop)`);
});
