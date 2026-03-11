const crypto = require('crypto');

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

    if (route === 'settings') return handleSettings(req, res);

    if (route === 'comments') return handleComments(req, res);
    if (route === 'comment') return handleComment(req, res);

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
    token: process.env.GITHUB_TOKEN || ''
  };
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
    else if (key === 'published') out.published = value === 'true';
    else if (key === 'tags') out.tags = parseInlineArray(value);
    else if (key === 'categories') out.categories = parseInlineArray(value);
  }
  return { frontMatter: out, body };
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
  if (!/^[a-zA-Z0-9._@\-]+$/.test(u)) return '';
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
  const user = { id: randomId(), username, name: name || username, role, salt, hash, createdAt: new Date().toISOString() };
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
  const safe = list.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, createdAt: u.createdAt }));
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
    const role = req.body && req.body.role ? String(req.body.role) : '';
    if (role !== 'admin' && role !== 'user') return res.status(400).json({ error: 'Invalid role' });
    const nextUsers = users.slice();
    nextUsers[idx] = { ...nextUsers[idx], role };
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
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);

  const postsDir = 'data/posts';
  const commentsFile = 'data/comments.json';
  const usersFile = 'data/users.json';

  const entries = await listDir(owner, repo, headers, postsDir);
  const postCount = entries.filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || '')).length;

  const comments = await readJsonFileOr(owner, repo, headers, commentsFile, []);
  const commentList = Array.isArray(comments.data) ? comments.data : [];

  const users = await readJsonFileOr(owner, repo, headers, usersFile, []);
  const userList = Array.isArray(users.data) ? users.data : [];

  return res.status(200).json({
    postCount,
    commentCount: commentList.length,
    userCount: userList.length,
    viewCount: 28451
  });
}

async function handlePosts(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const dirPath = 'data/posts';
  try {
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
          published: true
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
          if (typeof fm.published === 'boolean') meta.published = fm.published;
          if (!meta.date) meta.date = new Date().toISOString();
          return meta;
        } catch {
          meta.date = new Date().toISOString();
          return meta;
        }
      })
    );
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.status(200).json(results);
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
    const { content, sha } = await readText(owner, repo, headers, `${postsDir}/${filename}`);
    return res.status(200).json({ filename, sha, content });
  }

  await requireAdmin(req);
  const body = req.body || {};
  const content = typeof body.content === 'string' ? body.content : '';
  const message = body.message ? String(body.message) : undefined;

  if (req.method === 'POST') {
    const fname = body.filename ? String(body.filename) : '';
    if (!fname || !content) return res.status(400).json({ error: 'Missing filename or content' });
    const result = await writeText(owner, repo, token, `${postsDir}/${fname}`, content, message || `Create ${fname}`);
    return res.status(200).json({ success: true, filename: fname, sha: result && result.content ? result.content.sha : undefined });
  }

  if (req.method === 'PUT') {
    if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });
    const sha = body.sha ? String(body.sha) : (await readText(owner, repo, headers, `${postsDir}/${filename}`)).sha;
    const result = await writeText(owner, repo, token, `${postsDir}/${filename}`, content, message || `Update ${filename}`, sha);
    return res.status(200).json({ success: true, filename, sha: result && result.content ? result.content.sha : undefined });
  }

  if (req.method === 'DELETE') {
    if (!filename) return res.status(400).json({ error: 'Missing filename' });
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
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const body = req.body || {};
  const image = body.image;
  const filename = body.filename ? String(body.filename) : '';
  const base64 = extractBase64(image);
  if (!base64 || !filename) return res.status(400).json({ error: 'Missing image or filename' });

  const safeName = filename.replace(/[^a-z0-9.\u4e00-\u9fa5_-]/gi, '_');
  const filePath = `images/${safeName}`;
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
  return res.status(200).json({ success: true, url: `/${filePath}` });
}

async function handleNovels(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const baseDir = 'data/novels';
  try {
    const list = await listDir(owner, repo, headers, baseDir);
    const dirs = list.filter(e => e && e.type === 'dir');
    const novels = await Promise.all(
      dirs.map(async (dir) => {
        const id = dir.name;
        const meta = await readJsonFileOr(owner, repo, headers, `${baseDir}/${id}/meta.json`, { title: id });
        const chapterList = await listDir(owner, repo, headers, `${baseDir}/${id}`);
        const chapters = chapterList.filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || '')).map(e => e.name).sort();
        return { ...(meta.data || { title: id }), id, chapters: chapters.length, firstChapter: chapters[0] || null };
      })
    );
    return res.status(200).json(novels);
  } catch {
    return res.status(200).json([]);
  }
}

async function handleNovel(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await requireAdmin(req);
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const body = req.body || {};
  const title = body.title ? String(body.title).trim() : '';
  const genre = body.genre ? String(body.genre).trim() : '未分类';
  if (!title) return res.status(400).json({ success: false, error: 'Missing title' });
  const id = `${Date.now()}-${slugify(title)}`;
  const metaPath = `data/novels/${id}/meta.json`;
  const meta = { id, title, genre, status: 'ongoing', created: new Date().toISOString() };
  await writeText(owner, repo, token, metaPath, JSON.stringify(meta, null, 2), `Create novel ${id}`);
  return res.status(200).json({ success: true, novel: meta });
}

function slugify(input) {
  const raw = String(input || '').trim();
  const normalized = raw.replace(/\s+/g, '-');
  const cleaned = normalized.replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'novel';
}

async function handleNovelChapter(req, res) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const body = req.body || {};
  const novelId = (req.query && req.query.novelId ? String(req.query.novelId) : '') || (body.novelId ? String(body.novelId) : '');
  const chapterFile = (req.query && req.query.chapterFile ? String(req.query.chapterFile) : '') || (body.filename ? String(body.filename) : '');
  if (!novelId) return res.status(400).json({ error: 'Missing novelId' });

  const baseDir = `data/novels/${novelId}`;
  const meta = await readJsonFileOr(owner, repo, headers, `${baseDir}/meta.json`, { title: novelId });
  const list = await listDir(owner, repo, headers, baseDir);
  const chapters = list
    .filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || ''))
    .map(e => ({ filename: e.name, title: String(e.name || '').replace(/\.md$/i, '') }))
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
      title: normalized.replace(/\.md$/i, ''),
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
  const cleaned = raw.replace(/[^a-z0-9.\u4e00-\u9fa5_-]/gi, '_');
  return cleaned.toLowerCase().endsWith('.md') ? cleaned : `${cleaned}.md`;
}
