import yaml from 'js-yaml';

export default async function handler(req, res) {
  const segments = normalizeCatchAll(req.query && req.query.path);
  const route = segments[0] ? String(segments[0]) : '';

  try {
    if (route === 'login') return handleLogin(req, res);

    if (route === 'posts') return handlePosts(req, res);
    if (route === 'post') return handlePost(req, res, segments);

    if (route === 'stats') return handleStats(req, res);
    if (route === 'settings') return handleSettings(req, res);

    if (route === 'comments') return handleComments(req, res);
    if (route === 'comment') return handleComment(req, res);

    if (route === 'upload') return handleUpload(req, res);

    if (route === 'novels') return handleNovels(req, res);
    if (route === 'novel') return handleNovel(req, res);
    if (route === 'novel-chapter') return handleNovelChapter(req, res);

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    return res.status(500).json({ error: err && err.message ? err.message : 'Server error' });
  }
}

function normalizeCatchAll(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function getGithubConfig() {
  return {
    owner: process.env.GITHUB_OWNER || 'Sun1105',
    repo: process.env.GITHUB_REPO || 'hexo-source',
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

async function githubJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function encodePath(p) {
  return String(p)
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

async function getRepoContent(owner, repo, headers, filePath) {
  const ep = encodePath(filePath);
  const { res, data } = await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${ep}`, {
    method: 'GET',
    headers
  });
  if (!res.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  return data;
}

async function getTextFile(owner, repo, headers, filePath) {
  const data = await getRepoContent(owner, repo, headers, filePath);
  const base64 = data && data.content ? String(data.content).replace(/\n/g, '') : '';
  const content = base64 ? Buffer.from(base64, 'base64').toString('utf8') : '';
  return { content, sha: data.sha || null };
}

async function putFile(owner, repo, headers, filePath, content, message, sha) {
  const ep = encodePath(filePath);
  const body = {
    message,
    content: Buffer.from(String(content)).toString('base64')
  };
  if (sha) body.sha = sha;
  const { res, data } = await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${ep}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  return data;
}

async function deleteFile(owner, repo, headers, filePath, message, sha) {
  const ep = encodePath(filePath);
  const { res, data } = await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${ep}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ message, sha })
  });
  if (!res.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  return data;
}

function requireToken(token) {
  if (!token) {
    const err = new Error('Missing GITHUB_TOKEN');
    err.status = 401;
    throw err;
  }
}

function sendError(res, err) {
  const status = err && err.status ? err.status : 500;
  return res.status(status).json({ error: err && err.message ? err.message : 'Request failed' });
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
  if (typeof markdown !== 'string') return null;
  if (!markdown.startsWith('---')) return null;
  const end = markdown.indexOf('\n---\n', 3);
  if (end === -1) return null;
  const fmText = markdown.slice(3, end).trim();
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
  return out;
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const username = body.username ? String(body.username) : '';
  const password = body.password ? String(body.password) : '';
  const expectedUsername = process.env.ADMIN_USERNAME || 'sun·1105';
  const expectedPassword = process.env.ADMIN_PASSWORD || '521xiaoyue';

  if (username === expectedUsername && password === expectedPassword) {
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
    return res.status(200).json({
      success: true,
      token,
      user: { name: '某位作者', role: 'Administrator' }
    });
  }

  return res.status(401).json({ success: false, message: '用户名或密码错误' });
}

async function handlePosts(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const dirPath = 'source/_posts';

  try {
    const entries = await getRepoContent(owner, repo, headers, dirPath);
    const files = Array.isArray(entries) ? entries.filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || '')) : [];

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
          published: true
        };
        if (!file.download_url) return meta;
        try {
          const rawRes = await fetch(file.download_url, { method: 'GET' });
          if (!rawRes.ok) return meta;
          const text = await rawRes.text();
          const fm = extractFrontMatter(text);
          if (fm && fm.title) meta.title = fm.title;
          if (fm && fm.date) meta.date = fm.date;
          if (fm && Array.isArray(fm.tags)) meta.tags = fm.tags;
          if (fm && Array.isArray(fm.categories)) meta.categories = fm.categories;
          if (fm && typeof fm.published === 'boolean') meta.published = fm.published;
          return meta;
        } catch {
          return meta;
        }
      })
    );

    results.sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });

    return res.status(200).json(results);
  } catch (err) {
    return sendError(res, err);
  }
}

async function handlePost(req, res, segments) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  const postsDir = 'source/_posts';

  try {
    if (req.method === 'GET') {
      const filename = pickFilename(req, segments);
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      const path = `${postsDir}/${filename}`;
      const { content, sha } = await getTextFile(owner, repo, headers, path);
      return res.status(200).json({ content, sha, filename });
    }

    if (req.method === 'POST') {
      requireToken(token);
      const body = req.body || {};
      const filename = body.filename ? String(body.filename) : '';
      const content = body.content;
      const message = body.message ? String(body.message) : 'Create post';
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      if (typeof content !== 'string') return res.status(400).json({ error: 'Missing content' });
      const path = `${postsDir}/${filename}`;
      const data = await putFile(owner, repo, githubHeaders(token), path, content, message);
      return res.status(200).json({ success: true, filename, sha: data && data.content ? data.content.sha : undefined });
    }

    if (req.method === 'PUT') {
      requireToken(token);
      const filename = pickFilename(req, segments);
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      const body = req.body || {};
      const content = body.content;
      const message = body.message ? String(body.message) : 'Update post';
      if (typeof content !== 'string') return res.status(400).json({ error: 'Missing content' });

      const path = `${postsDir}/${filename}`;
      const sha = body.sha ? String(body.sha) : (await getTextFile(owner, repo, headers, path)).sha;
      const data = await putFile(owner, repo, githubHeaders(token), path, content, message, sha);
      return res.status(200).json({ success: true, filename, sha: data && data.content ? data.content.sha : undefined });
    }

    if (req.method === 'DELETE') {
      requireToken(token);
      const filename = pickFilename(req, segments);
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      const body = req.body || {};
      const message = body.message ? String(body.message) : 'Delete post';
      const path = `${postsDir}/${filename}`;
      const sha = body.sha ? String(body.sha) : (await getTextFile(owner, repo, headers, path)).sha;
      await deleteFile(owner, repo, githubHeaders(token), path, message, sha);
      return res.status(200).json({ success: true, filename });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return sendError(res, err);
  }
}

function pickFilename(req, segments) {
  const q = req.query && req.query.filename ? String(req.query.filename) : '';
  if (q) return q;
  if (segments && segments.length >= 2 && segments[1]) return String(segments[1]);
  return '';
}

async function handleStats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  try {
    const entries = await getRepoContent(owner, repo, headers, 'source/_posts');
    const postCount = Array.isArray(entries) ? entries.filter(e => e && e.type === 'file').length : 0;
    const comments = await readJsonFileOrEmpty(owner, repo, headers, 'source/_data/comments.json');
    return res.status(200).json({
      postCount,
      viewCount: 28451,
      commentCount: comments.length,
      userCount: 1284
    });
  } catch (err) {
    return res.status(200).json({
      postCount: 0,
      viewCount: 28451,
      commentCount: 0,
      userCount: 1284
    });
  }
}

async function handleSettings(req, res) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);

  try {
    if (req.method === 'GET') {
      const { content } = await getTextFile(owner, repo, headers, '_config.yml');
      const config = yaml.load(content) || {};
      return res.status(200).json({
        title: config.title,
        subtitle: config.subtitle,
        description: config.description,
        author: config.author,
        url: config.url
      });
    }

    if (req.method === 'PUT') {
      requireToken(token);
      const body = req.body || {};
      const next = {};
      if (body.title !== undefined) next.title = String(body.title);
      if (body.subtitle !== undefined) next.subtitle = String(body.subtitle);
      if (body.description !== undefined) next.description = String(body.description);
      if (body.author !== undefined) next.author = String(body.author);

      const existing = await getTextFile(owner, repo, headers, '_config.yml');
      const config = yaml.load(existing.content) || {};
      Object.assign(config, next);
      const newText = yaml.dump(config, { lineWidth: -1 });
      await putFile(owner, repo, githubHeaders(token), '_config.yml', newText, 'Update site settings', existing.sha);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return sendError(res, err);
  }
}

async function handleComments(req, res) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);

  try {
    if (req.method === 'GET') {
      const post = req.query && req.query.post ? String(req.query.post) : '';
      const list = await readJsonFileOrEmpty(owner, repo, headers, 'source/_data/comments.json');
      const filtered = post ? list.filter(c => c && c.post === post) : list;
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.status(200).json(filtered);
    }

    if (req.method === 'POST') {
      requireToken(token);
      const body = req.body || {};
      const post = body.post ? String(body.post) : '';
      const content = body.content ? String(body.content) : '';
      const user = body.user ? String(body.user) : 'Anonymous';
      if (!post || !content) return res.status(400).json({ error: 'Missing post or content' });

      const filePath = 'source/_data/comments.json';
      const existing = await readJsonFileWithShaOrEmpty(owner, repo, headers, filePath);
      const comments = existing.data;
      const newComment = {
        id: Date.now().toString(),
        post,
        content,
        user,
        date: new Date().toISOString(),
        status: 'pending'
      };
      comments.push(newComment);
      await writeJsonFile(owner, repo, githubHeaders(token), filePath, comments, existing.sha, 'Update comments');
      return res.status(200).json({ success: true, comment: newComment });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return sendError(res, err);
  }
}

async function handleComment(req, res) {
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  requireToken(token);

  try {
    if (req.method !== 'PUT' && req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const id = req.query && req.query.id ? String(req.query.id) : '';
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const filePath = 'source/_data/comments.json';
    const existing = await readJsonFileWithShaOrEmpty(owner, repo, headers, filePath);
    let comments = existing.data;

    if (req.method === 'PUT') {
      const status = req.body && req.body.status ? String(req.body.status) : '';
      if (!status) return res.status(400).json({ error: 'Missing status' });
      let changed = false;
      comments = comments.map(c => {
        if (c && String(c.id) === id) {
          changed = true;
          return { ...c, status };
        }
        return c;
      });
      if (!changed) return res.status(404).json({ error: 'Comment not found' });
      await writeJsonFile(owner, repo, githubHeaders(token), filePath, comments, existing.sha, 'Moderate comment');
      return res.status(200).json({ success: true });
    }

    const next = comments.filter(c => !(c && String(c.id) === id));
    if (next.length === comments.length) return res.status(404).json({ error: 'Comment not found' });
    await writeJsonFile(owner, repo, githubHeaders(token), filePath, next, existing.sha, 'Delete comment');
    return res.status(200).json({ success: true });
  } catch (err) {
    return sendError(res, err);
  }
}

async function handleUpload(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  requireToken(token);

  try {
    const { image, filename } = req.body || {};
    if (!image || !filename) return res.status(400).json({ error: 'Missing image or filename' });
    const safeName = String(filename).replace(/[^a-z0-9.\u4e00-\u9fa5_-]/gi, '_');
    const base64 = extractBase64(image);
    if (!base64) return res.status(400).json({ error: 'Invalid image data' });

    const filePath = `source/images/${safeName}`;
    const headers = githubHeaders(token);
    const sha = await getShaIfExists(owner, repo, headers, filePath);
    await putBinary(owner, repo, headers, filePath, base64, sha, `Upload media ${safeName}`);
    return res.status(200).json({ success: true, url: `/images/${safeName}` });
  } catch (err) {
    return sendError(res, err);
  }
}

function extractBase64(data) {
  if (typeof data !== 'string') return null;
  const m = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (m && m[2]) return m[2];
  if (/^[A-Za-z0-9+/=]+$/.test(data)) return data;
  return null;
}

async function getShaIfExists(owner, repo, headers, filePath) {
  try {
    const data = await getRepoContent(owner, repo, headers, filePath);
    return data && data.sha ? data.sha : null;
  } catch {
    return null;
  }
}

async function putBinary(owner, repo, headers, filePath, base64, sha, message) {
  const ep = encodePath(filePath);
  const body = { message, content: base64 };
  if (sha) body.sha = sha;
  const { res, data } = await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${ep}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  return data;
}

async function handleNovels(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);
  try {
    const baseDir = 'source/_novels';
    const list = await safeListDir(owner, repo, headers, baseDir);
    const dirs = list.filter(e => e && e.type === 'dir');
    const novels = await Promise.all(
      dirs.map(async (dir) => {
        const id = dir.name;
        const meta = await readJsonOrNull(owner, repo, headers, `${baseDir}/${id}/meta.json`);
        const chapterList = await safeListDir(owner, repo, headers, `${baseDir}/${id}`);
        const chapterFiles = chapterList.filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || '')).map(e => e.name);
        chapterFiles.sort();
        return {
          ...(meta || { title: id }),
          id,
          chapters: chapterFiles.length,
          firstChapter: chapterFiles[0] || null
        };
      })
    );
    return res.status(200).json(novels);
  } catch {
    return res.status(200).json([]);
  }
}

async function handleNovel(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { owner, repo, token } = getGithubConfig();
  requireToken(token);

  try {
    const body = req.body || {};
    const title = body.title ? String(body.title).trim() : '';
    const genre = body.genre ? String(body.genre).trim() : '未分类';
    if (!title) return res.status(400).json({ success: false, error: 'Missing title' });

    const id = `${Date.now()}-${slugify(title)}`;
    const meta = {
      id,
      title,
      genre,
      status: 'ongoing',
      created: new Date().toISOString()
    };

    const filePath = `source/_novels/${id}/meta.json`;
    await putFile(owner, repo, githubHeaders(token), filePath, JSON.stringify(meta, null, 2), `Create novel ${id}`);
    return res.status(200).json({ success: true, novel: meta });
  } catch (err) {
    return sendError(res, err);
  }
}

function slugify(input) {
  const raw = String(input || '').trim();
  const normalized = raw.replace(/\s+/g, '-');
  const cleaned = normalized.replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'novel';
}

async function handleNovelChapter(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const novelId = req.query && req.query.novelId ? String(req.query.novelId) : '';
  const chapterFile = req.query && req.query.chapterFile ? String(req.query.chapterFile) : '';
  if (!novelId || !chapterFile) return res.status(400).json({ error: 'Missing novelId or chapterFile' });

  const { owner, repo, token } = getGithubConfig();
  const headers = githubHeaders(token);

  try {
    const baseDir = `source/_novels/${novelId}`;
    const meta = await readJsonOrNull(owner, repo, headers, `${baseDir}/meta.json`);
    const chapter = await readTextOrNull(owner, repo, headers, `${baseDir}/${chapterFile}`);
    if (chapter == null) return res.status(404).json({ error: 'Chapter not found' });

    const list = await safeListDir(owner, repo, headers, baseDir);
    const chapters = list
      .filter(e => e && e.type === 'file' && /\.md$/i.test(e.name || ''))
      .map(e => ({ filename: e.name, title: (e.name || '').replace(/\.md$/i, '') }))
      .sort((a, b) => a.filename.localeCompare(b.filename));

    return res.status(200).json({
      novelTitle: meta && meta.title ? meta.title : novelId,
      title: chapterFile.replace(/\.md$/i, ''),
      content: chapter,
      chapters
    });
  } catch (err) {
    return sendError(res, err);
  }
}

async function safeListDir(owner, repo, headers, dirPath) {
  try {
    const data = await getRepoContent(owner, repo, headers, dirPath);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function readTextOrNull(owner, repo, headers, filePath) {
  try {
    const { content } = await getTextFile(owner, repo, headers, filePath);
    return content;
  } catch {
    return null;
  }
}

async function readJsonOrNull(owner, repo, headers, filePath) {
  const txt = await readTextOrNull(owner, repo, headers, filePath);
  if (txt == null) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function readJsonFileOrEmpty(owner, repo, headers, filePath) {
  const existing = await readJsonFileWithShaOrEmpty(owner, repo, headers, filePath);
  return existing.data;
}

async function readJsonFileWithShaOrEmpty(owner, repo, headers, filePath) {
  try {
    const { content, sha } = await getTextFile(owner, repo, headers, filePath);
    const parsed = JSON.parse(content || '[]');
    return { data: Array.isArray(parsed) ? parsed : [], sha };
  } catch (err) {
    if (err && err.message && /Not Found/i.test(err.message)) {
      return { data: [], sha: null };
    }
    return { data: [], sha: null };
  }
}

async function writeJsonFile(owner, repo, headers, filePath, data, sha, message) {
  const content = JSON.stringify(Array.isArray(data) ? data : [], null, 2);
  await putFile(owner, repo, headers, filePath, content, message, sha || undefined);
}
