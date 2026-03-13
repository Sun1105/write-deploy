const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  try {
    setCommonHeaders(res);
    if (req.method === 'OPTIONS') return res.status(204).end();

    const segments = normalizeCatchAll(req.query && req.query.path);
    const route = segments[0] ? String(segments[0]) : '';

    if (route === 'login') return handleLogin(req, res);
    if (route === 'register') return handleRegister(req, res);
    if (route === 'me') return handleMe(req, res);

    if (route === 'stats') return handleStats(req, res);

    if (route === 'posts') return handlePosts(req, res);
    if (route === 'post') return handlePost(req, res, segments);
    if (route === 'featured') return handleFeatured(req, res);
    if (route === 'reactions') return handleReactions(req, res);

    if (route === 'settings') return handleSettings(req, res);

    if (route === 'comments') return handleComments(req, res);
    if (route === 'comment') return handleComment(req, res);

    if (route === 'view') return handleView(req, res);

    if (route === 'upload') return handleUpload(req, res);

    if (route === 'novels') return handleNovels(req, res);
    if (route === 'novel') return handleNovel(req, res);
    if (route === 'novel-chapter') return handleNovelChapter(req, res);

    if (route === 'users') return handleUsers(req, res);
    if (route === 'user') return handleUser(req, res);

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: err && err.message ? err.message : 'Server error' });
  }
};

function setCommonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function normalizeCatchAll(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function getGithubConfig() {
  return {
    owner: process.env.GITHUB_OWNER || 'Sun1105',
    repo: process.env.GITHUB_REPO || 'write-deploy',
    token: process.env.GITHUB_TOKEN || '',
    branch: process.env.GITHUB_BRANCH || 'main'
  };
}

function getLocalPostsDir() {
  return path.join(process.cwd(), 'data', 'posts');
}

function getLocalNovelsDir() {
  return path.join(process.cwd(), 'data', 'novels');
}

async function listLocalPostFiles() {
  try {
    const dir = getLocalPostsDir();
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e && e.isFile && e.isFile() && /\.md$/i.test(e.name || ''))
      .map(e => e.name);
  } catch {
    return [];
  }
}

async function readLocalPost(filename) {
  const full = path.join(getLocalPostsDir(), filename);
  const content = await fs.promises.readFile(full, 'utf8');
  return { content, sha: null };
}

async function writeLocalPost(filename, content) {
  const dir = getLocalPostsDir();
  await fs.promises.mkdir(dir, { recursive: true });
  const full = path.join(dir, filename);
  await fs.promises.writeFile(full, String(content || ''), 'utf8');
  return { sha: null };
}

async function deleteLocalPost(filename) {
  const full = path.join(getLocalPostsDir(), filename);
  await fs.promises.unlink(full);
}

async function listLocalNovelIds() {
  try {
    const dir = getLocalNovelsDir();
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries.filter(e => e && e.isDirectory && e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

async function readLocalNovelMeta(novelId) {
  const metaPath = path.join(getLocalNovelsDir(), novelId, 'meta.json');
  const raw = await fs.promises.readFile(metaPath, 'utf8');
  return JSON.parse(raw || '{}');
}

async function writeLocalNovelMeta(novelId, meta) {
  const dir = path.join(getLocalNovelsDir(), novelId);
  await fs.promises.mkdir(dir, { recursive: true });
  const metaPath = path.join(dir, 'meta.json');
  await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
}

async function listLocalNovelChapterFiles(novelId) {
  try {
    const dir = path.join(getLocalNovelsDir(), novelId);
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e && e.isFile && e.isFile() && /\.md$/i.test(e.name || ''))
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function readLocalNovelChapter(novelId, chapterFile) {
  const full = path.join(getLocalNovelsDir(), novelId, chapterFile);
  const content = await fs.promises.readFile(full, 'utf8');
  return { content, sha: null };
}

async function writeLocalNovelChapter(novelId, chapterFile, content) {
  const dir = path.join(getLocalNovelsDir(), novelId);
  await fs.promises.mkdir(dir, { recursive: true });
  const full = path.join(dir, chapterFile);
  await fs.promises.writeFile(full, String(content || ''), 'utf8');
  return { sha: null };
}

async function deleteLocalNovelChapter(novelId, chapterFile) {
  const full = path.join(getLocalNovelsDir(), novelId, chapterFile);
  await fs.promises.unlink(full);
}

async function deleteLocalNovel(novelId) {
  const dir = path.join(getLocalNovelsDir(), novelId);
  await fs.promises.rm(dir, { recursive: true, force: true });
}

function shouldUseLocalPosts() {
  const forced = process.env.CONTENT_SOURCE ? String(process.env.CONTENT_SOURCE).toLowerCase() : '';
  if (forced === 'local') return true;
  if (forced === 'github') return false;
  const token = process.env.GITHUB_TOKEN ? String(process.env.GITHUB_TOKEN) : '';
  if (token) return false;
  return true;
}

function getLocalDataDir() {
  return path.join(process.cwd(), 'data');
}

async function readLocalJsonOr(fileName, fallback) {
  try {
    const full = path.join(getLocalDataDir(), fileName);
    const text = await fs.promises.readFile(full, 'utf8');
    const parsed = JSON.parse(text || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeLocalJson(fileName, data) {
  const dir = getLocalDataDir();
  await fs.promises.mkdir(dir, { recursive: true });
  const full = path.join(dir, fileName);
  await fs.promises.writeFile(full, JSON.stringify(data, null, 2), 'utf8');
}

function getLocalImagesDir() {
  return path.join(process.cwd(), 'images');
}

async function writeLocalBinary(relPath, buffer) {
  const full = path.join(process.cwd(), relPath);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, buffer);
}

function githubHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vercel-Serverless-Function'
  };
  if (token) headers.Authorization = `token ${token}`;
  return headers;
}

function encodePath(p) {
  return String(p)
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

async function githubJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error((data && data.message) || 'GitHub API error');
    err.status = response.status;
    throw err;
  }
  return data;
}

async function getContent(owner, repo, headers, filePath) {
  const ep = encodePath(filePath);
  return githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${ep}`, {
    method: 'GET',
    headers
  });
}

async function listDir(owner, repo, headers, dirPath) {
  try {
    const data = await getContent(owner, repo, headers, dirPath);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err && err.status === 404) return [];
    throw err;
  }
}

async function readText(owner, repo, headers, filePath) {
  const data = await getContent(owner, repo, headers, filePath);
  const base64 = data && data.content ? String(data.content).replace(/\n/g, '') : '';
  const content = base64 ? Buffer.from(base64, 'base64').toString('utf8') : '';
  return { content, sha: data && data.sha ? data.sha : null };
}

async function writeText(owner, repo, token, filePath, content, message, sha) {
  if (!token) {
    const err = new Error('Missing GITHUB_TOKEN');
    err.status = 401;
    throw err;
  }
  const ep = encodePath(filePath);
  const body = {
    message: message || `Update ${filePath}`,
    content: Buffer.from(String(content || '')).toString('base64')
  };
  if (sha) body.sha = sha;
  const data = await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${ep}`, {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify(body)
  });
  return data;
}

async function deleteFile(owner, repo, token, filePath, message, sha) {
  if (!token) {
    const err = new Error('Missing GITHUB_TOKEN');
    err.status = 401;
    throw err;
  }
  const ep = encodePath(filePath);
  const body = {
    message: message || `Delete ${filePath}`,
    sha
  };
  const data = await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${ep}`, {
    method: 'DELETE',
    headers: githubHeaders(token),
    body: JSON.stringify(body)
  });
  return data;
}

function parseInlineArray(value) {
  const v = stripQuotes(value || '');
  const m = v.match(/^\[(.*)\]$/);
  if (!m) return [];
  const inner = m[1].trim();
  if (!inner) return [];
  return inner.split(',').map(s => stripQuotes(s.trim())).filter(Boolean);
}

function stripQuotes(s) {
  const str = String(s || '');
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

function extractFrontMatter(markdown) {
  if (typeof markdown !== 'string') return { frontMatter: {}, body: '' };
  if (!markdown.startsWith('---')) return { frontMatter: {}, body: markdown };
  const end = markdown.indexOf('\n---\n', 3);
  if (end === -1) return { frontMatter: {}, body: markdown };
  const fmText = markdown.slice(3, end).trim();
  const body = markdown.slice(end + 5).replace(/^\n+/, '');
  const lines = fmText.split('\n');
  const out = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key === 'title') out.title = stripQuotes(value);
    else if (key === 'date') out.date = stripQuotes(value);
    else if (key === 'description') out.description = stripQuotes(value);
    else if (key === 'cover') out.cover = stripQuotes(value);
    else if (key === 'published') out.published = value === 'true';
    else if (key === 'archived') out.archived = value === 'true';
    else if (key === 'tags') out.tags = parseInlineArray(value);
    else if (key === 'categories') out.categories = parseInlineArray(value);
  }
  return { frontMatter: out, body };
}

function extractFirstImageUrl(markdownBody) {
  const s = String(markdownBody || '');
  const md = s.match(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/);
  if (md && md[1]) return String(md[1]);
  const html = s.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (html && html[1]) return String(html[1]);
  return '';
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.GITHUB_TOKEN || '';
  return secret ? String(secret) : 'dev-secret';
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlJson(obj) {
  return base64url(JSON.stringify(obj));
}

function sign(payloadB64, secret) {
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64');
  return sig.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + 60 * 60 * 24 * 7
  };
  const payloadB64 = base64urlJson(payload);
  const sig = sign(payloadB64, getAuthSecret());
  return `${payloadB64}.${sig}`;
}

function parseToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64, getAuthSecret());
  if (!timingSafeEqual(sig, expected)) return null;
  const payloadJson = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const payload = JSON.parse(payloadJson);
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return null;
  return payload;
}

function timingSafeEqual(a, b) {
  try {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function getBearerToken(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!header) return '';
  const str = String(header);
  if (!str.toLowerCase().startsWith('bearer ')) return '';
  return str.slice(7).trim();
}

async function requireUser(req) {
  const token = getBearerToken(req);
  const payload = parseToken(token);
  if (!payload) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return payload;
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role !== 'admin') {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return user;
}

function hashPassword(password, salt) {
  const derived = crypto.scryptSync(String(password), salt, 64);
  return derived.toString('hex');
}

function randomId() {
  return crypto.randomBytes(16).toString('hex');
}

function safeUsername(username) {
  const u = String(username || '').trim();
  if (!u) return '';
  if (u.length > 40) return '';
  if (!/^[a-zA-Z0-9._@\\-]+$/.test(u)) return '';
  return u;
}

async function readJsonFileOr(owner, repo, headers, filePath, fallback) {
  try {
    const { content, sha } = await readText(owner, repo, headers, filePath);
    const parsed = JSON.parse(content || 'null');
    return { data: parsed ?? fallback, sha };
  } catch (err) {
    if (err && err.status === 404) return { data: fallback, sha: null };
    return { data: fallback, sha: null };
  }
}

async function writeJsonFile(owner, repo, token, filePath, data, sha, message) {
  const text = JSON.stringify(data, null, 2);
  const result = await writeText(owner, repo, token, filePath, text, message, sha || undefined);
  return result;
}

async function getSettings(owner, repo, headers) {
  const filePath = 'data/settings.json';
  const fallback = { title: '拾墨', description: '', author: '', allowRegister: true };
  const { data } = await readJsonFileOr(owner, repo, headers, filePath, fallback);
  if (!data || typeof data !== 'object') return fallback;
  return { ...fallback, ...data };
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const username = safeUsername(body.username);
  const password = String(body.password || '');
  if (!username || !password) return res.status(400).json({ success: false, message: '用户名或密码不能为空' });

  const expectedUsername = safeUsername(process.env.ADMIN_USERNAME);
  const expectedPassword = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD) : '';
  if (expectedUsername && expectedPassword && username === expectedUsername && password === expectedPassword) {
    const user = { id: 'admin', username, name: username, role: 'admin' };
    return res.status(200).json({ success: true, token: issueToken(user), user: { name: user.name, role: user.role, username: user.username } });
  }

  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const usersFile = 'data/users.json';
  const { data: users } = await readJsonFileOr(owner, repo, headers, usersFile, []);
  const list = Array.isArray(users) ? users : [];
  const found = list.find(u => u && u.username === username);
  if (!found) return res.status(401).json({ success: false, message: '用户名或密码错误' });
  if (found.status === 'banned') return res.status(403).json({ success: false, message: '账号已被封禁' });
  const salt = found.salt || '';
  const hash = found.hash || '';
  const computed = hashPassword(password, salt);
  if (computed !== hash) return res.status(401).json({ success: false, message: '用户名或密码错误' });

  const user = { id: found.id, username: found.username, name: found.name || found.username, role: found.role || 'user' };
  return res.status(200).json({ success: true, token: issueToken(user), user: { name: user.name, role: user.role, username: user.username } });
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const username = safeUsername(body.username);
  const password = String(body.password || '');
  const name = body.name ? String(body.name).trim() : username;
  if (!username || password.length < 6) return res.status(400).json({ success: false, message: '用户名不合法或密码太短' });

  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const settings = await getSettings(owner, repo, headers);
  if (!settings.allowRegister) return res.status(403).json({ success: false, message: '当前已关闭注册' });

  const usersFile = 'data/users.json';
  const existing = await readJsonFileOr(owner, repo, headers, usersFile, []);
  const users = Array.isArray(existing.data) ? existing.data : [];
  if (users.some(u => u && u.username === username)) return res.status(409).json({ success: false, message: '用户名已存在' });

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const role = users.length === 0 ? 'admin' : 'user';
  const user = { id: randomId(), username, name: name || username, role, status: 'active', salt, hash, createdAt: new Date().toISOString() };
  users.push(user);
  await writeJsonFile(owner, repo, token, usersFile, users, existing.sha, 'Register user');

  return res.status(200).json({ success: true, user: { name: user.name, role: user.role, username: user.username } });
}

async function handleMe(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await requireUser(req);
    return res.status(200).json({ authenticated: true, user });
  } catch {
    return res.status(200).json({ authenticated: false });
  }
}

async function handleUsers(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  await requireAdmin(req);
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const usersFile = 'data/users.json';
  const { data: users } = await readJsonFileOr(owner, repo, headers, usersFile, []);
  const list = Array.isArray(users) ? users : [];
  const safe = list.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, status: u.status || 'active', createdAt: u.createdAt }));
  return res.status(200).json(safe);
}

async function handleUser(req, res) {
  await requireAdmin(req);
  const id = req.query && req.query.id ? String(req.query.id) : '';
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const usersFile = 'data/users.json';
  const existing = await readJsonFileOr(owner, repo, headers, usersFile, []);
  const users = Array.isArray(existing.data) ? existing.data : [];

  const idx = users.findIndex(u => u && (String(u.id) === id || String(u.username) === id));
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'PUT') {
    const role = req.body && req.body.role !== undefined ? String(req.body.role) : '';
    const status = req.body && req.body.status !== undefined ? String(req.body.status) : '';
    if (role && role !== 'admin' && role !== 'user') return res.status(400).json({ error: 'Invalid role' });
    if (status && status !== 'active' && status !== 'banned') return res.status(400).json({ error: 'Invalid status' });
    const nextUsers = users.slice();
    nextUsers[idx] = {
      ...nextUsers[idx],
      ...(role ? { role } : {}),
      ...(status ? { status } : {})
    };
    await writeJsonFile(owner, repo, token, usersFile, nextUsers, existing.sha, 'Update user role');
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const target = users[idx];
    const remaining = users.filter((_, i) => i !== idx);
    const remainingAdmins = remaining.filter(u => u && u.role === 'admin').length;
    if (target && target.role === 'admin' && remainingAdmins === 0) return res.status(400).json({ error: 'Cannot delete last admin' });
    await writeJsonFile(owner, repo, token, usersFile, remaining, existing.sha, 'Delete user');
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleStats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  await requireAdmin(req);
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);

  const postsDir = 'data/posts';
  const commentsFile = 'data/comments.json';
  const usersFile = 'data/users.json';
  const viewsFile = 'data/views.json';

  const comments = await readJsonFileOr(owner, repo, headers, commentsFile, []);
  const commentList = Array.isArray(comments.data) ? comments.data : [];

  const users = await readJsonFileOr(owner, repo, headers, usersFile, []);
  const userList = Array.isArray(users.data) ? users.data : [];

  const views = shouldUseLocalPosts()
    ? { data: await readLocalJsonOr('views.json', { total: 0, pages: {}, posts: {}, chapters: {}, daily: {} }), sha: null }
    : await readJsonFileOr(owner, repo, headers, viewsFile, { total: 0, pages: {}, posts: {}, chapters: {}, daily: {} });
  const viewData = views && views.data && typeof views.data === 'object' ? views.data : { total: 0, daily: {} };
  const viewCount = Number(viewData.total || 0);
  const daily = viewData.daily && typeof viewData.daily === 'object' ? viewData.daily : {};
  const todayKey = new Date().toISOString().slice(0, 10);
  const y = new Date();
  y.setUTCDate(y.getUTCDate() - 1);
  const yesterdayKey = y.toISOString().slice(0, 10);
  const viewToday = Number(daily[todayKey] || 0);
  const viewYesterday = Number(daily[yesterdayKey] || 0);
  const statsUpdatedAt = viewData && viewData.updatedAt ? String(viewData.updatedAt) : null;

  const userToday = userList.filter(u => u && u.createdAt && String(u.createdAt).slice(0, 10) === todayKey).length;
  const userYesterday = userList.filter(u => u && u.createdAt && String(u.createdAt).slice(0, 10) === yesterdayKey).length;

  const commentToday = commentList.filter(c => c && c.date && String(c.date).slice(0, 10) === todayKey).length;
  const commentYesterday = commentList.filter(c => c && c.date && String(c.date).slice(0, 10) === yesterdayKey).length;

  const views30Days = (() => {
    const days = [];
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - 29);
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({ label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, value: Number(daily[key] || 0) });
    }
    return days;
  })();

  const pageViews = viewData.pages && typeof viewData.pages === 'object' ? viewData.pages : {};
  const postViews = viewData.posts && typeof viewData.posts === 'object' ? viewData.posts : {};
  const knownPages = new Set(['home', 'articles', 'novels', 'about']);
  const topViewedPages = Object.entries(pageViews)
    .map(([id, count]) => ({ id: String(id), count: Number(count || 0) }))
    .filter(x => knownPages.has(x.id))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const posts = await (async () => {
    if (shouldUseLocalPosts()) {
      const files = await listLocalPostFiles();
      return await Promise.all(
        files.map(async (name) => {
          try {
            const { content } = await readLocalPost(name);
            const parsed = extractFrontMatter(String(content || ''));
            const fm = parsed.frontMatter || {};
            return {
              filename: name,
              title: fm.title || String(name || '').replace(/\.md$/i, ''),
              date: fm.date || new Date().toISOString(),
              published: typeof fm.published === 'boolean' ? fm.published : true,
              archived: typeof fm.archived === 'boolean' ? fm.archived : false
            };
          } catch {
            return {
              filename: name,
              title: String(name || '').replace(/\.md$/i, ''),
              date: new Date().toISOString(),
              published: true,
              archived: false
            };
          }
        })
      );
    }

    const entries = await listDir(owner, repo, headers, postsDir);
    const postFiles = entries.filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || ''));
    return await Promise.all(
      postFiles.map(async (f) => {
        try {
          const { content } = await readText(owner, repo, headers, `${postsDir}/${f.name}`);
          const parsed = extractFrontMatter(String(content || ''));
          const fm = parsed.frontMatter || {};
          return {
            filename: f.name,
            title: fm.title || String(f.name || '').replace(/\.md$/i, ''),
            date: fm.date || new Date().toISOString(),
            published: typeof fm.published === 'boolean' ? fm.published : true,
            archived: typeof fm.archived === 'boolean' ? fm.archived : false
          };
        } catch {
          return {
            filename: f.name,
            title: String(f.name || '').replace(/\.md$/i, ''),
            date: new Date().toISOString(),
            published: true,
            archived: false
          };
        }
      })
    );
  })();

  const archivedPostCount = posts.filter(p => p && p.archived === true).length;
  const draftPostCount = posts.filter(p => p && p.archived !== true && p.published === false).length;
  const publishedPostCount = posts.filter(p => p && p.archived !== true && p.published !== false).length;
  const publishedPostToday = posts.filter(p => {
    if (!p || p.archived === true || p.published === false || !p.date) return false;
    const d = new Date(p.date);
    if (Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) === todayKey;
  }).length;
  const publishedPostYesterday = posts.filter(p => {
    if (!p || p.archived === true || p.published === false || !p.date) return false;
    const d = new Date(p.date);
    if (Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) === yesterdayKey;
  }).length;

  const pendingCommentCount = commentList.filter(c => c && c.status === 'pending').length;

  const commentsByPost = new Map();
  for (const c of commentList) {
    if (!c || !c.post) continue;
    const key = String(c.post);
    commentsByPost.set(key, (commentsByPost.get(key) || 0) + 1);
  }
  const commentCountsByPost = Object.fromEntries(commentsByPost.entries());
  const topPosts = posts
    .filter(p => p && p.archived !== true && p.published !== false)
    .map(p => ({ title: p.title, filename: p.filename, count: commentsByPost.get(p.filename) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activity14Days = buildActivity14Days(posts, commentList);
  const recentPosts = posts
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const recentComments = commentList
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
    .map(c => ({
      id: c.id,
      post: c.post,
      user: c.user,
      date: c.date,
      status: c.status,
      content: c.content
    }));

  const postTitleByFilename = new Map(posts.map(p => [p.filename, p.title]));
  const topViewedPosts = Object.entries(postViews)
    .map(([filename, count]) => ({
      filename: String(filename),
      title: String(postTitleByFilename.get(String(filename)) || String(filename).replace(/\.md$/i, '')),
      count: Number(count || 0)
    }))
    .filter(p => postTitleByFilename.has(p.filename))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return res.status(200).json({
    postCount: posts.length,
    publishedPostCount,
    draftPostCount,
    archivedPostCount,
    commentCount: commentList.length,
    pendingCommentCount,
    userCount: userList.length,
    viewCount,
    viewToday,
    viewYesterday,
    userToday,
    userYesterday,
    commentToday,
    commentYesterday,
    publishedPostToday,
    publishedPostYesterday,
    statsUpdatedAt,
    activity14Days,
    views30Days,
    topViewedPages,
    topViewedPosts,
    commentCountsByPost,
    topPosts,
    recentPosts,
    recentComments
  });
}

function buildActivity14Days(posts, commentList) {
  const days = [];
  const index = new Map();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - 13);

  for (let i = 0; i < 14; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, value: 0 });
    index.set(key, i);
  }

  for (const p of posts || []) {
    const date = p && p.date ? new Date(p.date) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    const idx = index.get(key);
    if (idx !== undefined) days[idx].value += 2;
  }

  for (const c of commentList || []) {
    const date = c && c.date ? new Date(c.date) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    const idx = index.get(key);
    if (idx !== undefined) days[idx].value += 1;
  }

  return days.map(d => ({ label: d.label, value: d.value }));
}

async function handlePosts(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const payload = parseToken(getBearerToken(req));
  const isAdmin = payload && payload.role === 'admin';
  if (shouldUseLocalPosts()) {
    try {
      const viewsLocal = await readLocalJsonOr('views.json', { posts: {} });
      const viewPosts = viewsLocal && typeof viewsLocal === 'object' && viewsLocal.posts && typeof viewsLocal.posts === 'object' ? viewsLocal.posts : {};
      const files = await listLocalPostFiles();
      const results = await Promise.all(
        files.map(async (name) => {
          const meta = {
            filename: name,
            path: `data/posts/${name}`,
            sha: null,
            title: (name || '').replace(/\.md$/i, ''),
            date: null,
            tags: [],
            categories: [],
            description: '',
            cover: '',
            views: Number(Object.prototype.hasOwnProperty.call(viewPosts, name) ? viewPosts[name] : 0),
            published: true,
            archived: false
          };
          try {
            const { content } = await readLocalPost(name);
            const parsed = extractFrontMatter(String(content || ''));
            const fm = parsed.frontMatter || {};
            if (fm.title) meta.title = fm.title;
            if (fm.date) meta.date = fm.date;
            if (Array.isArray(fm.tags)) meta.tags = fm.tags;
            if (Array.isArray(fm.categories)) meta.categories = fm.categories;
            if (typeof fm.description === 'string') meta.description = fm.description;
            if (typeof fm.cover === 'string') meta.cover = fm.cover;
            if (!meta.cover) meta.cover = extractFirstImageUrl(parsed.body);
            if (typeof fm.published === 'boolean') meta.published = fm.published;
            if (typeof fm.archived === 'boolean') meta.archived = fm.archived;
            if (!meta.date) meta.date = new Date().toISOString();
            return meta;
          } catch {
            meta.date = new Date().toISOString();
            return meta;
          }
        })
      );
      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const visible = isAdmin ? results : results.filter(p => p && p.published !== false && p.archived !== true);
      return res.status(200).json(visible);
    } catch {
      return res.status(200).json([]);
    }
  }

  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const dirPath = 'data/posts';
  try {
    const views = await readJsonFileOr(owner, repo, headers, 'data/views.json', { posts: {} });
    const viewData = views && views.data && typeof views.data === 'object' ? views.data : { posts: {} };
    const viewPosts = viewData.posts && typeof viewData.posts === 'object' ? viewData.posts : {};
    const entries = await listDir(owner, repo, headers, dirPath);
    const files = entries.filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || ''));
    const results = await Promise.all(
      files.map(async (file) => {
        const meta = {
          filename: file.name,
          path: file.path,
          sha: file.sha,
          title: (file.name || '').replace(/\.md$/i, ''),
          date: null,
          tags: [],
          categories: [],
          description: '',
          cover: '',
          views: Number(Object.prototype.hasOwnProperty.call(viewPosts, file.name) ? viewPosts[file.name] : 0),
          published: true,
          archived: false
        };
        try {
          const { content } = await readText(owner, repo, headers, `${dirPath}/${file.name}`);
          const parsed = extractFrontMatter(content);
          const fm = parsed.frontMatter || {};
          if (fm.title) meta.title = fm.title;
          if (fm.date) meta.date = fm.date;
          if (Array.isArray(fm.tags)) meta.tags = fm.tags;
          if (Array.isArray(fm.categories)) meta.categories = fm.categories;
          if (typeof fm.description === 'string') meta.description = fm.description;
          if (typeof fm.cover === 'string') meta.cover = fm.cover;
          if (!meta.cover) meta.cover = extractFirstImageUrl(parsed.body);
          if (typeof fm.published === 'boolean') meta.published = fm.published;
          if (typeof fm.archived === 'boolean') meta.archived = fm.archived;
          if (!meta.date) meta.date = new Date().toISOString();
          return meta;
        } catch {
          meta.date = new Date().toISOString();
          return meta;
        }
      })
    );
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const visible = isAdmin ? results : results.filter(p => p && p.published !== false && p.archived !== true);
    return res.status(200).json(visible);
  } catch {
    return res.status(200).json([]);
  }
}

async function handlePost(req, res, segments) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const postsDir = 'data/posts';

  const filename = (req.query && req.query.filename ? String(req.query.filename) : '') || (segments[1] ? String(segments[1]) : '');
  if (req.method === 'GET') {
    if (!filename) return res.status(400).json({ error: 'Missing filename' });
    const payload = parseToken(getBearerToken(req));
    const isAdmin = payload && payload.role === 'admin';
    let source = null;
    if (shouldUseLocalPosts()) {
      try {
        source = await readLocalPost(filename);
      } catch {
        return res.status(404).json({ error: 'Not found' });
      }
    } else {
      source = await readText(owner, repo, headers, `${postsDir}/${filename}`);
    }
    const { content, sha } = source;
    const parsed = extractFrontMatter(String(content || ''));
    const published = parsed.frontMatter && typeof parsed.frontMatter.published === 'boolean' ? parsed.frontMatter.published : true;
    const archived = parsed.frontMatter && typeof parsed.frontMatter.archived === 'boolean' ? parsed.frontMatter.archived : false;
    if (!isAdmin && (published === false || archived === true)) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ filename, sha, content });
  }

  await requireAdmin(req);
  const body = req.body || {};
  const content = typeof body.content === 'string' ? body.content : '';
  const message = body.message ? String(body.message) : undefined;

  if (req.method === 'POST') {
    const fname = body.filename ? String(body.filename) : '';
    if (!fname || !content) return res.status(400).json({ error: 'Missing filename or content' });
    if (shouldUseLocalPosts()) {
      const result = await writeLocalPost(fname, content);
      return res.status(200).json({ success: true, filename: fname, sha: result.sha || undefined });
    }
    const result = await writeText(owner, repo, token, `${postsDir}/${fname}`, content, message || `Create ${fname}`);
    return res.status(200).json({ success: true, filename: fname, sha: result && result.content ? result.content.sha : undefined });
  }

  if (req.method === 'PUT') {
    if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });
    if (shouldUseLocalPosts()) {
      const result = await writeLocalPost(filename, content);
      return res.status(200).json({ success: true, filename, sha: result.sha || undefined });
    }
    const sha = body.sha ? String(body.sha) : (await readText(owner, repo, headers, `${postsDir}/${filename}`)).sha;
    const result = await writeText(owner, repo, token, `${postsDir}/${filename}`, content, message || `Update ${filename}`, sha);
    return res.status(200).json({ success: true, filename, sha: result && result.content ? result.content.sha : undefined });
  }

  if (req.method === 'DELETE') {
    if (!filename) return res.status(400).json({ error: 'Missing filename' });
    if (shouldUseLocalPosts()) {
      try {
        await deleteLocalPost(filename);
        return res.status(200).json({ success: true, filename });
      } catch {
        return res.status(404).json({ error: 'Not found' });
      }
    }
    const sha = body.sha ? String(body.sha) : (await readText(owner, repo, headers, `${postsDir}/${filename}`)).sha;
    await deleteFile(owner, repo, token, `${postsDir}/${filename}`, message || `Delete ${filename}`, sha);
    return res.status(200).json({ success: true, filename });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSettings(req, res) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const filePath = 'data/settings.json';
  const fallback = { title: '拾墨', description: '', author: '', allowRegister: true };

  if (req.method === 'GET') {
    const settings = await getSettings(owner, repo, headers);
    return res.status(200).json(settings);
  }

  await requireAdmin(req);
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const existing = await readJsonFileOr(owner, repo, headers, filePath, fallback);
  const next = { ...(existing.data || fallback) };
  if (body.title !== undefined) next.title = String(body.title);
  if (body.description !== undefined) next.description = String(body.description);
  if (body.allowRegister !== undefined) next.allowRegister = Boolean(body.allowRegister);
  await writeJsonFile(owner, repo, token, filePath, next, existing.sha, 'Update settings');
  return res.status(200).json({ success: true });
}

async function handleComments(req, res) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const filePath = 'data/comments.json';

  if (req.method === 'GET') {
    const post = req.query && req.query.post ? String(req.query.post) : '';
    const payload = parseToken(getBearerToken(req));
    const isAdmin = payload && payload.role === 'admin';
    const { data } = await readJsonFileOr(owner, repo, headers, filePath, []);
    const list = Array.isArray(data) ? data : [];
    let filtered = post ? list.filter(c => c && c.post === post) : list;
    if (!isAdmin) filtered = filtered.filter(c => c && c.status === 'approved');
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.status(200).json(filtered);
  }

  if (req.method === 'POST') {
    const user = await requireUser(req);
    const body = req.body || {};
    const post = body.post ? String(body.post) : '';
    const content = body.content ? String(body.content) : '';
    if (!post || !content) return res.status(400).json({ error: 'Missing post or content' });

    const existing = await readJsonFileOr(owner, repo, headers, filePath, []);
    const list = Array.isArray(existing.data) ? existing.data : [];
    const comment = {
      id: randomId(),
      post,
      content,
      user: user.username || 'user',
      date: new Date().toISOString(),
      status: 'pending'
    };
    list.push(comment);
    await writeJsonFile(owner, repo, token, filePath, list, existing.sha, 'Add comment');
    return res.status(200).json({ success: true, comment });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleComment(req, res) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const filePath = 'data/comments.json';
  const id = req.query && req.query.id ? String(req.query.id) : '';
  if (!id) return res.status(400).json({ error: 'Missing id' });

  await requireAdmin(req);
  const existing = await readJsonFileOr(owner, repo, headers, filePath, []);
  const list = Array.isArray(existing.data) ? existing.data : [];

  if (req.method === 'PUT') {
    const status = req.body && req.body.status ? String(req.body.status) : '';
    if (!status) return res.status(400).json({ error: 'Missing status' });
    let changed = false;
    const next = list.map(c => {
      if (c && c.id === id) {
        changed = true;
        return { ...c, status };
      }
      return c;
    });
    if (!changed) return res.status(404).json({ error: 'Comment not found' });
    await writeJsonFile(owner, repo, token, filePath, next, existing.sha, 'Moderate comment');
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const next = list.filter(c => !(c && c.id === id));
    if (next.length === list.length) return res.status(404).json({ error: 'Comment not found' });
    await writeJsonFile(owner, repo, token, filePath, next, existing.sha, 'Delete comment');
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleView(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const filePath = 'data/views.json';
  const fallback = { total: 0, pages: {}, posts: {}, chapters: {}, daily: {}, updatedAt: null };

  const body = req.body || {};
  const kind = body.kind ? String(body.kind) : '';
  const id = body.id ? String(body.id) : '';
  if (!kind || !id) return res.status(400).json({ error: 'Missing kind or id' });
  if (!['page', 'post', 'chapter'].includes(kind)) return res.status(400).json({ error: 'Invalid kind' });
  if (id.length > 400) return res.status(400).json({ error: 'Invalid id' });

  const existing = shouldUseLocalPosts()
    ? { data: await readLocalJsonOr('views.json', fallback), sha: null }
    : await readJsonFileOr(owner, repo, headers, filePath, fallback);
  const data = existing && existing.data && typeof existing.data === 'object' ? existing.data : fallback;
  const next = {
    total: Number(data.total || 0),
    pages: data.pages && typeof data.pages === 'object' ? { ...data.pages } : {},
    posts: data.posts && typeof data.posts === 'object' ? { ...data.posts } : {},
    chapters: data.chapters && typeof data.chapters === 'object' ? { ...data.chapters } : {},
    daily: data.daily && typeof data.daily === 'object' ? { ...data.daily } : {},
    updatedAt: new Date().toISOString()
  };

  next.total += 1;
  if (kind === 'page') next.pages[id] = Number(next.pages[id] || 0) + 1;
  if (kind === 'post') next.posts[id] = Number(next.posts[id] || 0) + 1;
  if (kind === 'chapter') next.chapters[id] = Number(next.chapters[id] || 0) + 1;
  const dayKey = new Date().toISOString().slice(0, 10);
  next.daily[dayKey] = Number(next.daily[dayKey] || 0) + 1;

  if (shouldUseLocalPosts()) {
    await writeLocalJson('views.json', next);
  } else {
    await writeJsonFile(owner, repo, token, filePath, next, existing.sha, `Track view ${kind}:${id}`);
  }
  return res.status(200).json({ success: true, total: next.total });
}

async function handleFeatured(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);

  const postsDir = 'data/posts';
  const viewsFile = 'data/views.json';
  const views = shouldUseLocalPosts()
    ? { data: await readLocalJsonOr('views.json', { total: 0, posts: {} }), sha: null }
    : await readJsonFileOr(owner, repo, headers, viewsFile, { total: 0, posts: {} });
  const viewData = views && views.data && typeof views.data === 'object' ? views.data : { posts: {} };
  const postViews = viewData.posts && typeof viewData.posts === 'object' ? viewData.posts : {};
  const totalViews = Number(viewData.total || 0);

  const files = shouldUseLocalPosts()
    ? (await listLocalPostFiles()).map(name => ({ name }))
    : (await listDir(owner, repo, headers, postsDir)).filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || ''));

  const posts = await Promise.all(
    files.map(async (f) => {
      const filename = String(f && (f.name || f.filename) ? (f.name || f.filename) : '');
      if (!filename) return null;
      try {
        const { content } = shouldUseLocalPosts()
          ? await readLocalPost(filename)
          : await readText(owner, repo, headers, `${postsDir}/${filename}`);
        const parsed = extractFrontMatter(String(content || ''));
        const fm = parsed.frontMatter || {};
        const published = typeof fm.published === 'boolean' ? fm.published : true;
        const archived = typeof fm.archived === 'boolean' ? fm.archived : false;
        if (published === false || archived === true) return null;
        const title = fm.title || filename.replace(/\.md$/i, '');
        const date = fm.date || new Date().toISOString();
        const description = typeof fm.description === 'string' ? fm.description : '';
        const cover = typeof fm.cover === 'string' ? fm.cover : '';
        const category = Array.isArray(fm.categories) && fm.categories.length ? String(fm.categories[0]) : '';
        const viewsCount = Number(Object.prototype.hasOwnProperty.call(postViews, filename) ? postViews[filename] : 0);
        const wordCount = parsed.body ? String(parsed.body).replace(/\s+/g, '').length : 0;
        const minutes = Math.max(1, Math.round(wordCount / 600));
        return { filename, title, date, description, cover, category, views: viewsCount, minutes };
      } catch {
        return null;
      }
    })
  );

  const publishedPosts = posts.filter(Boolean);
  const top = publishedPosts
    .slice()
    .sort((a, b) => (b.views - a.views) || (new Date(b.date).getTime() - new Date(a.date).getTime()))[0] || null;

  return res.status(200).json({ featured: top, totalViews });
}

async function handleReactions(req, res) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const filePath = 'data/reactions.json';
  const fallback = { counts: {}, users: {}, updatedAt: null };

  const kind = (req.query && req.query.kind ? String(req.query.kind) : '') || (req.body && req.body.kind ? String(req.body.kind) : 'post');
  const id = (req.query && req.query.id ? String(req.query.id) : '') || (req.body && req.body.id ? String(req.body.id) : '');
  if (!kind || !id) return res.status(400).json({ error: 'Missing kind or id' });
  if (!['post'].includes(kind)) return res.status(400).json({ error: 'Invalid kind' });
  if (id.length > 400) return res.status(400).json({ error: 'Invalid id' });

  const key = `${kind}:${id}`;
  const existing = shouldUseLocalPosts()
    ? { data: await readLocalJsonOr('reactions.json', fallback), sha: null }
    : await readJsonFileOr(owner, repo, headers, filePath, fallback);
  const data = existing && existing.data && typeof existing.data === 'object' ? existing.data : fallback;
  const counts = data.counts && typeof data.counts === 'object' ? { ...data.counts } : {};
  const users = data.users && typeof data.users === 'object' ? { ...data.users } : {};

  const item = counts[key] && typeof counts[key] === 'object' ? { ...counts[key] } : { likes: 0, favorites: 0 };
  item.likes = Number(item.likes || 0);
  item.favorites = Number(item.favorites || 0);

  const payload = parseToken(getBearerToken(req));
  const uid = payload && payload.sub ? String(payload.sub) : '';
  const userRecRaw = uid && users[uid] && typeof users[uid] === 'object' ? users[uid] : { likes: {}, favorites: {} };
  const userRec = {
    likes: userRecRaw.likes && typeof userRecRaw.likes === 'object' ? { ...userRecRaw.likes } : {},
    favorites: userRecRaw.favorites && typeof userRecRaw.favorites === 'object' ? { ...userRecRaw.favorites } : {}
  };

  if (req.method === 'GET') {
    return res.status(200).json({
      kind,
      id,
      likes: item.likes,
      favorites: item.favorites,
      liked: uid ? Boolean(userRec.likes[key]) : false,
      favorited: uid ? Boolean(userRec.favorites[key]) : false
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireUser(req);
  const userId = user && user.id ? String(user.id) : '';
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const body = req.body || {};
  const action = body.action ? String(body.action) : '';
  if (!['like', 'favorite'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  const current = users[userId] && typeof users[userId] === 'object' ? users[userId] : { likes: {}, favorites: {} };
  const nextUser = {
    likes: current.likes && typeof current.likes === 'object' ? { ...current.likes } : {},
    favorites: current.favorites && typeof current.favorites === 'object' ? { ...current.favorites } : {}
  };
  const nextItem = { likes: item.likes, favorites: item.favorites };

  if (action === 'like') {
    const liked = Boolean(nextUser.likes[key]);
    if (liked) {
      delete nextUser.likes[key];
      nextItem.likes = Math.max(0, nextItem.likes - 1);
    } else {
      nextUser.likes[key] = true;
      nextItem.likes += 1;
    }
  } else {
    const favorited = Boolean(nextUser.favorites[key]);
    if (favorited) {
      delete nextUser.favorites[key];
      nextItem.favorites = Math.max(0, nextItem.favorites - 1);
    } else {
      nextUser.favorites[key] = true;
      nextItem.favorites += 1;
    }
  }

  counts[key] = nextItem;
  users[userId] = nextUser;
  const next = { counts, users, updatedAt: new Date().toISOString() };

  if (shouldUseLocalPosts()) {
    await writeLocalJson('reactions.json', next);
  } else {
    await writeJsonFile(owner, repo, token, filePath, next, existing.sha, `Update reactions ${action} ${key}`);
  }

  return res.status(200).json({
    kind,
    id,
    likes: nextItem.likes,
    favorites: nextItem.favorites,
    liked: Boolean(nextUser.likes[key]),
    favorited: Boolean(nextUser.favorites[key])
  });
}

function extractBase64(data) {
  if (typeof data !== 'string') return null;
  const m = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (m && m[2]) return m[2];
  if (/^[A-Za-z0-9+/=]+$/.test(data)) return data;
  return null;
}

async function handleUpload(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await requireAdmin(req);
  const { owner, repo, token, branch } = getGithubConfig();
  const headers = githubHeaders(token);
  const body = req.body || {};
  const image = body.image;
  const filename = body.filename ? String(body.filename) : '';
  const base64 = extractBase64(image);
  if (!base64 || !filename) return res.status(400).json({ error: 'Missing image or filename' });

  const safeName = filename.replace(/[^a-z0-9.\u4e00-\u9fa5_-]/gi, '_');
  const filePath = `images/${safeName}`;
  if (shouldUseLocalPosts() || !token) {
    const buf = Buffer.from(String(base64), 'base64');
    await writeLocalBinary(filePath, buf);
    return res.status(200).json({ success: true, url: `/${filePath}` });
  }
  let sha = null;
  try {
    const existing = await getContent(owner, repo, headers, filePath);
    sha = existing && existing.sha ? existing.sha : null;
  } catch {
    sha = null;
  }

  const ep = encodePath(filePath);
  const putBody = { message: `Upload ${safeName}`, content: base64 };
  if (sha) putBody.sha = sha;
  await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${ep}`, {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify(putBody)
  });
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}?v=${Date.now()}`;
  return res.status(200).json({ success: true, url: rawUrl });
}

async function handleNovels(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const baseDir = 'data/novels';
  if (shouldUseLocalPosts()) {
    try {
      const ids = await listLocalNovelIds();
      const novels = await Promise.all(
        ids.map(async (id) => {
          let meta = { id, title: id, genre: '未分类', status: 'ongoing' };
          try {
            const m = await readLocalNovelMeta(id);
            meta = { ...meta, ...(m && typeof m === 'object' ? m : {}) };
          } catch {
          }
          const chapters = await listLocalNovelChapterFiles(id);
          return { ...meta, id, chapters: chapters.length, firstChapter: chapters[0] || null };
        })
      );
      return res.status(200).json(novels);
    } catch {
      return res.status(200).json([]);
    }
  }

  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  try {
    const list = await listDir(owner, repo, headers, baseDir);
    const dirs = list.filter(e => e && e.type === 'dir');
    const novels = await Promise.all(
      dirs.map(async (dir) => {
        const id = dir.name;
        const meta = await readJsonFileOr(owner, repo, headers, `${baseDir}/${id}/meta.json`, { title: id });
        const chapterList = await listDir(owner, repo, headers, `${baseDir}/${id}`);
        const chapters = chapterList.filter(e => e && e.type === 'file' && /\\.md$/i.test(e.name || '')).map(e => e.name).sort();
        return { ...(meta.data || { title: id }), id, chapters: chapters.length, firstChapter: chapters[0] || null };
      })
    );
    return res.status(200).json(novels);
  } catch {
    return res.status(200).json([]);
  }
}

async function handleNovel(req, res) {
  const baseDir = 'data/novels';
  if (shouldUseLocalPosts()) {
    if (req.method === 'GET') {
      const id = req.query && req.query.id ? String(req.query.id) : '';
      if (!id) return res.status(400).json({ error: 'Missing id' });
      let meta = { id, title: id, genre: '未分类', status: 'ongoing' };
      try {
        meta = { ...meta, ...(await readLocalNovelMeta(id)) };
      } catch {
      }
      const chapters = await listLocalNovelChapterFiles(id);
      return res.status(200).json({ meta, chapters });
    }

    await requireAdmin(req);

    if (req.method === 'POST') {
      const body = req.body || {};
      const title = body.title ? String(body.title).trim() : '';
      const genre = body.genre ? String(body.genre).trim() : '未分类';
      if (!title) return res.status(400).json({ success: false, error: 'Missing title' });
      const id = `${Date.now()}-${slugify(title)}`;
      const cover = body.cover ? String(body.cover).trim() : '';
      const meta = { id, title, genre, status: 'ongoing', cover, created: new Date().toISOString(), updated: new Date().toISOString() };
      await writeLocalNovelMeta(id, meta);
      return res.status(200).json({ success: true, novel: meta });
    }

    if (req.method === 'PUT') {
      const id = req.query && req.query.id ? String(req.query.id) : '';
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const body = req.body || {};
      let existing = { id, title: id, genre: '未分类', status: 'ongoing' };
      try {
        existing = { ...existing, ...(await readLocalNovelMeta(id)) };
      } catch {
      }
      const next = { ...(existing || {}) };
      if (body.title !== undefined) next.title = String(body.title).trim();
      if (body.genre !== undefined) next.genre = String(body.genre).trim();
      if (body.status !== undefined) next.status = String(body.status).trim();
      if (body.cover !== undefined) next.cover = String(body.cover).trim();
      next.id = id;
      if (!next.created) next.created = new Date().toISOString();
      next.updated = new Date().toISOString();
      await writeLocalNovelMeta(id, next);
      return res.status(200).json({ success: true, novel: next });
    }

    if (req.method === 'DELETE') {
      const id = req.query && req.query.id ? String(req.query.id) : '';
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await deleteLocalNovel(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);

  if (req.method === 'GET') {
    const id = req.query && req.query.id ? String(req.query.id) : '';
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const meta = await readJsonFileOr(owner, repo, headers, `${baseDir}/${id}/meta.json`, { id, title: id, genre: '未分类', status: 'ongoing' });
    const chapterList = await listDir(owner, repo, headers, `${baseDir}/${id}`);
    const chapters = chapterList.filter(e => e && e.type === 'file' && /\\.md$/i.test(e.name || '')).map(e => e.name).sort();
    return res.status(200).json({ meta: meta.data || {}, chapters });
  }

  await requireAdmin(req);

  if (req.method === 'POST') {
    const body = req.body || {};
    const title = body.title ? String(body.title).trim() : '';
    const genre = body.genre ? String(body.genre).trim() : '未分类';
    if (!title) return res.status(400).json({ success: false, error: 'Missing title' });
    const id = `${Date.now()}-${slugify(title)}`;
    const metaPath = `${baseDir}/${id}/meta.json`;
    const cover = body.cover ? String(body.cover).trim() : '';
    const meta = { id, title, genre, status: 'ongoing', cover, created: new Date().toISOString(), updated: new Date().toISOString() };
    await writeText(owner, repo, token, metaPath, JSON.stringify(meta, null, 2), `Create novel ${id}`);
    return res.status(200).json({ success: true, novel: meta });
  }

  if (req.method === 'PUT') {
    const id = req.query && req.query.id ? String(req.query.id) : '';
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const body = req.body || {};
    const existing = await readJsonFileOr(owner, repo, headers, `${baseDir}/${id}/meta.json`, { id, title: id, genre: '未分类', status: 'ongoing' });
    const next = { ...(existing.data || {}) };
    if (body.title !== undefined) next.title = String(body.title).trim();
    if (body.genre !== undefined) next.genre = String(body.genre).trim();
    if (body.status !== undefined) next.status = String(body.status).trim();
    if (body.cover !== undefined) next.cover = String(body.cover).trim();
    next.id = id;
    if (!next.created) next.created = new Date().toISOString();
    next.updated = new Date().toISOString();
    await writeJsonFile(owner, repo, token, `${baseDir}/${id}/meta.json`, next, existing.sha, `Update novel ${id}`);
    return res.status(200).json({ success: true, novel: next });
  }

  if (req.method === 'DELETE') {
    const id = req.query && req.query.id ? String(req.query.id) : '';
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const dir = `${baseDir}/${id}`;
    const entries = await listDir(owner, repo, headers, dir);
    const files = entries.filter(e => e && e.type === 'file');
    for (const f of files) {
      try {
        await deleteFile(owner, repo, token, f.path, `Delete ${f.path}`, f.sha);
      } catch {
      }
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function slugify(input) {
  const raw = String(input || '').trim();
  const normalized = raw.replace(/\\s+/g, '-');
  const cleaned = normalized.replace(/[^\\w\\u4e00-\\u9fa5-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'novel';
}

async function handleNovelChapter(req, res) {
  const body = req.body || {};
  const novelId = (req.query && req.query.novelId ? String(req.query.novelId) : '') || (body.novelId ? String(body.novelId) : '');
  const chapterFile = (req.query && req.query.chapterFile ? String(req.query.chapterFile) : '') || (body.filename ? String(body.filename) : '');
  if (!novelId) return res.status(400).json({ error: 'Missing novelId' });

  const baseDir = `data/novels/${novelId}`;
  if (shouldUseLocalPosts()) {
    let meta = { id: novelId, title: novelId, genre: '未分类', status: 'ongoing' };
    try {
      meta = { ...meta, ...(await readLocalNovelMeta(novelId)) };
    } catch {
    }
    const files = await listLocalNovelChapterFiles(novelId);
    const chapters = files.map(name => ({ filename: name, title: String(name || '').replace(/\.md$/i, '') }));

    if (req.method === 'GET') {
      if (!chapterFile) {
        return res.status(200).json({
          novelTitle: meta && meta.title ? meta.title : novelId,
          chapters
        });
      }
      const normalized = normalizeChapterFilename(chapterFile);
      try {
        const chapter = await readLocalNovelChapter(novelId, normalized);
        return res.status(200).json({
          novelTitle: meta && meta.title ? meta.title : novelId,
          title: normalized.replace(/\.md$/i, ''),
          filename: normalized,
          sha: null,
          content: chapter.content,
          chapters
        });
      } catch {
        return res.status(404).json({ error: 'Chapter not found' });
      }
    }

    await requireAdmin(req);
    const filename = normalizeChapterFilename(chapterFile);

    if (req.method === 'POST') {
      const content = typeof body.content === 'string' ? body.content : '';
      await writeLocalNovelChapter(novelId, filename, content);
      return res.status(200).json({ success: true, filename, sha: null });
    }

    if (req.method === 'PUT') {
      const content = typeof body.content === 'string' ? body.content : '';
      await writeLocalNovelChapter(novelId, filename, content);
      return res.status(200).json({ success: true, filename, sha: null });
    }

    if (req.method === 'DELETE') {
      try {
        await deleteLocalNovelChapter(novelId, filename);
      } catch {
        return res.status(404).json({ error: 'Chapter not found' });
      }
      return res.status(200).json({ success: true, filename });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const meta = await readJsonFileOr(owner, repo, headers, `${baseDir}/meta.json`, { title: novelId });
  const list = await listDir(owner, repo, headers, baseDir);
  const chapters = list
    .filter(e => e && e.type === 'file' && /\\.md$/i.test(e.name || ''))
    .map(e => ({ filename: e.name, title: String(e.name || '').replace(/\\.md$/i, '') }))
    .sort((a, b) => a.filename.localeCompare(b.filename));

  if (req.method === 'GET') {
    if (!chapterFile) {
      return res.status(200).json({
        novelTitle: meta.data && meta.data.title ? meta.data.title : novelId,
        chapters
      });
    }
    const normalized = normalizeChapterFilename(chapterFile);
    const chapter = await readText(owner, repo, headers, `${baseDir}/${normalized}`).catch(() => ({ content: null, sha: null }));
    if (chapter.content == null) return res.status(404).json({ error: 'Chapter not found' });
    return res.status(200).json({
      novelTitle: meta.data && meta.data.title ? meta.data.title : novelId,
      title: normalized.replace(/\\.md$/i, ''),
      filename: normalized,
      sha: chapter.sha,
      content: chapter.content,
      chapters
    });
  }

  await requireAdmin(req);
  const filename = normalizeChapterFilename(chapterFile);
  const filePath = `${baseDir}/${filename}`;

  if (req.method === 'POST') {
    const content = typeof body.content === 'string' ? body.content : '';
    const result = await writeText(owner, repo, token, filePath, content, `Create chapter ${filename}`);
    return res.status(200).json({ success: true, filename, sha: result && result.content ? result.content.sha : undefined });
  }

  if (req.method === 'PUT') {
    const content = typeof body.content === 'string' ? body.content : '';
    const sha = body.sha ? String(body.sha) : (await readText(owner, repo, headers, filePath)).sha;
    const result = await writeText(owner, repo, token, filePath, content, `Update chapter ${filename}`, sha);
    return res.status(200).json({ success: true, filename, sha: result && result.content ? result.content.sha : undefined });
  }

  if (req.method === 'DELETE') {
    const sha = body.sha ? String(body.sha) : (await readText(owner, repo, headers, filePath)).sha;
    await deleteFile(owner, repo, token, filePath, `Delete chapter ${filename}`, sha);
    return res.status(200).json({ success: true, filename });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function normalizeChapterFilename(input) {
  const raw = String(input || '').trim();
  const cleaned = raw.replace(/[^a-z0-9.\\u4e00-\\u9fa5_-]/gi, '_');
  return cleaned.toLowerCase().endsWith('.md') ? cleaned : `${cleaned}.md`;
}
