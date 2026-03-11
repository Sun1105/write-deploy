export default async function handler(req, res) {
  const owner = process.env.GITHUB_OWNER || 'Sun1105';
  const repo = process.env.GITHUB_REPO || 'hexo-source';
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vercel-Serverless-Function'
  };
  if (token) headers.Authorization = `token ${token}`;

  try {
    if (req.method === 'GET') {
      const post = req.query && req.query.post ? String(req.query.post) : '';
      const list = await readJsonFileOrEmpty(owner, repo, headers, 'source/_data/comments.json');
      const filtered = post ? list.filter(c => c && c.post === post) : list;
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.status(200).json(filtered);
    }

    if (req.method === 'POST') {
      if (!token) return res.status(401).json({ error: 'Missing GITHUB_TOKEN' });
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
      await writeJsonFile(owner, repo, headers, filePath, comments, existing.sha, 'Update comments');
      return res.status(200).json({ success: true, comment: newComment });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Comments failed' });
  }
}

async function readJsonFileOrEmpty(owner, repo, headers, filePath) {
  try {
    const { data } = await readJsonFileWithShaOrEmpty(owner, repo, headers, filePath);
    return data;
  } catch {
    return [];
  }
}

async function readJsonFileWithShaOrEmpty(owner, repo, headers, filePath) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });

  if (response.status === 404) {
    return { data: [], sha: null };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }

  const base64 = data && data.content ? String(data.content).replace(/\n/g, '') : '';
  const text = base64 ? Buffer.from(base64, 'base64').toString('utf8') : '[]';
  let arr = [];
  try {
    const parsed = JSON.parse(text);
    arr = Array.isArray(parsed) ? parsed : [];
  } catch {
    arr = [];
  }
  return { data: arr, sha: data.sha || null };
}

async function writeJsonFile(owner, repo, headers, filePath, data, sha, message) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = { message, content };
  if (sha) body.sha = sha;

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  const resp = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = resp && resp.message ? resp.message : 'GitHub API error';
    throw new Error(msg);
  }
  return resp;
}
