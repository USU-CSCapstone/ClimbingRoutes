// Serves data/ on http://localhost:8765/ for the app's author tool (/author in the Expo
// app), which loads the models, OpenBeta JSON and saved route lines from it. Localhost
// only, and only pages served from localhost, like the Expo dev server on its own port,
// may read or save through it. The one thing it writes is the saved route lines:
// PUT /data/routes/<model>.json. Run from anywhere: node scripts/viewer/serve.mjs [port]
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 8765);
const HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
// Pages from any port on this machine, such as the Expo dev server on 8081.
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const ROUTES_PATH = /^\/data\/routes\/[A-Za-z0-9][A-Za-z0-9._-]*\.json$/;
const MAX_ROUTES_BYTES = 10 * 1024 * 1024;

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

const isVec3 = (a) => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);

function checkRoutes(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.routes)) return 'expected an object with a routes array';
  for (const r of body.routes) {
    if (!r || typeof r.name !== 'string') return 'every route needs a name';
    if (!Array.isArray(r.points) || !Array.isArray(r.normals) || r.points.length !== r.normals.length) {
      return `route "${r.name}" needs matching points and normals arrays`;
    }
    if (!r.points.every(isVec3) || !r.normals.every(isVec3)) return `route "${r.name}" has a point that is not [x, y, z]`;
  }
  return null;
}

async function saveRoutes(req, res, path) {
  const send = (code, text) => res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }).end(text);
  const origin = req.headers.origin;
  if (origin && !LOCAL_ORIGIN.test(origin)) return send(403, 'only pages served from localhost may save routes');
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(415, 'send the routes as application/json');

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_ROUTES_BYTES) return send(413, 'routes file is larger than 10 MB');
    chunks.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return send(400, 'not valid JSON');
  }
  const problem = checkRoutes(body);
  if (problem) return send(400, problem);

  // Pretty-printed for readable diffs, with each [x, y, z] kept on one line.
  const num = '(-?[\\d.]+(?:e[+-]?\\d+)?)';
  const vec = new RegExp(`\\[\\s+${num},\\s+${num},\\s+${num}\\s+\\]`, 'g');
  const text = JSON.stringify(body, null, 2).replace(vec, '[$1, $2, $3]') + '\n';
  const file = join(ROOT, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file + '.tmp', text);
  await rename(file + '.tmp', file);
  console.log(`saved ${body.routes.length} route(s) to ${path.slice(1)}`);
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ saved: path.slice(1), routes: body.routes.length }));
}

const server = createServer(async (req, res) => {
  if (!HOSTS.has(req.headers.host)) {
    res.writeHead(403).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  // The author tool is served by the Expo dev server, a different origin, so it needs CORS.
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origin && LOCAL_ORIGIN.test(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, HEAD, PUT',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    }).end();
    return;
  }
  if (req.method === 'PUT' && ROUTES_PATH.test(path)) {
    await saveRoutes(req, res, path).catch((err) => res.writeHead(500).end(String(err.message || err)));
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, PUT, OPTIONS' }).end();
    return;
  }
  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(
      'Serving data/ for the author tool. Start the app with npx expo start in mobile/, press w, then open /author.\n',
    );
    return;
  }
  if (!path.startsWith('/data/') || path.split('/').some((part) => part.startsWith('.'))) {
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
  console.log(`Serving ${join(ROOT, 'data')} on http://localhost:${PORT}/data/ (Ctrl+C to stop)`);
});
