const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { spawn } = require('child_process');

let handler = require('../server/api-handler');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ROOT_IMAGES_DIR = path.join(process.cwd(), 'images');
const WATCH = process.argv.includes('--watch') || process.env.WATCH === '1';

const LIVE_RELOAD_PATH = '/__dev/events';
const RELOAD_CLIENTS = new Set();
let rebuildTimer = null;
let apiDirty = false;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function safeJoin(base, p) {
  const full = path.resolve(base, '.' + p);
  if (!full.startsWith(path.resolve(base))) return null;
  return full;
}

function send(res, status, body, headers) {
  res.statusCode = status;
  if (headers) {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  }
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

function broadcastReload() {
  for (const res of Array.from(RELOAD_CLIENTS)) {
    try {
      res.write(`data: reload\n\n`);
    } catch {
      try { res.end(); } catch { }
      RELOAD_CLIENTS.delete(res);
    }
  }
}

function scheduleRebuild() {
  if (!WATCH) return;
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    runBuild()
      .then(() => broadcastReload())
      .catch(() => {});
  }, 120);
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const cmd = process.execPath;
    const args = [path.join(process.cwd(), 'scripts', 'generate-static.cjs')];
    const child = spawn(cmd, args, { stdio: 'inherit', env: process.env, cwd: process.cwd() });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build failed: ${code}`));
    });
    child.on('error', reject);
  });
}

function markApiDirty() {
  apiDirty = true;
}

function refreshApiHandlerIfNeeded() {
  if (!WATCH || !apiDirty) return;
  apiDirty = false;
  try {
    const root = process.cwd();
    for (const k of Object.keys(require.cache)) {
      if (k && k.startsWith(root)) {
        delete require.cache[k];
      }
    }
    handler = require('../server/api-handler');
  } catch {
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return null;
  return JSON.parse(text);
}

async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/api\//, '');
  const query = Object.fromEntries(url.searchParams.entries());
  query.path = route;

  let body = null;
  try {
    if (req.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
      body = await readJsonBody(req);
    }
  } catch (err) {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const reqForHandler = {
    method: req.method,
    headers: req.headers,
    url: req.url,
    query,
    body
  };

  const resForHandler = {
    setHeader: (k, v) => res.setHeader(k, v),
    status: (code) => {
      res.statusCode = code;
      return resForHandler;
    },
    json: (obj) => {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(obj));
      return resForHandler;
    },
    end: () => {
      res.end();
      return resForHandler;
    }
  };

  refreshApiHandlerIfNeeded();
  await handler(reqForHandler, resForHandler);
}

function handleDevEvents(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.write('\n');
  RELOAD_CLIENTS.add(res);
  req.on('close', () => {
    RELOAD_CLIENTS.delete(res);
  });
}

function injectLiveReload(html) {
  if (!WATCH) return html;
  const snippet = `<script>(function(){try{var es=new EventSource('${LIVE_RELOAD_PATH}');es.onmessage=function(e){if(e&&e.data==='reload'){location.reload();}};es.onerror=function(){};}catch(e){}})();</script>`;
  const idx = html.lastIndexOf('</body>');
  if (idx !== -1) return html.slice(0, idx) + snippet + html.slice(idx);
  return html + snippet;
}

function serveStatic(req, res, url) {
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const decoded = decodeURIComponent(pathname);
  let target = safeJoin(PUBLIC_DIR, decoded);
  if (!target) return send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain; charset=utf-8' });

  let filePath = target;
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
  }

  if (decoded.startsWith('/images/')) {
    const rel = decoded.slice('/images/'.length);
    const fallback = safeJoin(ROOT_IMAGES_DIR, `/${rel}`);
    if (fallback) {
      try {
        const st = fs.statSync(filePath);
        if (!st.isFile()) throw new Error('not file');
      } catch {
        filePath = fallback;
      }
    }
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat || !stat.isFile()) {
      send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    if (WATCH && ext === '.html') {
      fs.promises.readFile(filePath, 'utf8')
        .then((txt) => send(res, 200, injectLiveReload(txt), { 'Content-Type': type }))
        .catch(() => send(res, 500, 'Server Error', { 'Content-Type': 'text/plain; charset=utf-8' }));
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

function startWatchers() {
  if (!WATCH) return;
  const roots = [
    path.join(process.cwd(), 'themes'),
    path.join(process.cwd(), 'css'),
    path.join(process.cwd(), 'js'),
    path.join(process.cwd(), 'images'),
    path.join(process.cwd(), 'data'),
    path.join(process.cwd(), 'server'),
    path.join(process.cwd(), 'api'),
    path.join(process.cwd(), 'scripts')
  ];

  for (const dir of roots) {
    try {
      if (!fs.existsSync(dir)) continue;
      fs.watch(dir, { recursive: true }, (event, filename) => {
        const name = String(filename || '');
        if (!name || name.includes('public' + path.sep)) return;
        const ext = path.extname(name).toLowerCase();
        const watched = new Set(['.md', '.json', '.ejs', '.css', '.js', '.cjs', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
        if (!watched.has(ext)) return;
        if (dir.endsWith(path.sep + 'server') || dir.endsWith(path.sep + 'api')) markApiDirty();
        scheduleRebuild();
      });
    } catch {
    }
  }

  runBuild().catch(() => {});
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url || '/', `http://${host}`);
    if (WATCH && url.pathname === LIVE_RELOAD_PATH) {
      handleDevEvents(req, res);
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (err) {
    send(res, 500, 'Server Error', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});

server.listen(PORT, () => {
  process.stdout.write(`Local dev server: http://localhost:${PORT}/\n`);
  if (WATCH) process.stdout.write('Watch mode: enabled\n');
  startWatchers();
});

