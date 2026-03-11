export default async function handler(req, res) {
  const owner = process.env.GITHUB_OWNER || 'Sun1105';
  const repo = process.env.GITHUB_REPO || 'hexo-source';
  const token = process.env.GITHUB_TOKEN;
  const postsDir = 'source/_posts';

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vercel-Serverless-Function'
  };
  if (token) headers.Authorization = `token ${token}`;

  try {
    if (req.method === 'GET') {
      const filename = req.query && req.query.filename ? String(req.query.filename) : '';
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      const path = `${postsDir}/${filename}`;
      const { content, sha } = await getContent({ owner, repo, headers, path });
      return res.status(200).json({ content, sha, filename });
    }

    if (req.method === 'POST') {
      if (!token) return res.status(401).json({ error: 'Missing GITHUB_TOKEN' });
      const body = req.body || {};
      const filename = body.filename ? String(body.filename) : '';
      const content = body.content;
      const message = body.message ? String(body.message) : 'Create post';
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      if (typeof content !== 'string') return res.status(400).json({ error: 'Missing content' });

      const path = `${postsDir}/${filename}`;
      await putContent({ owner, repo, headers, path, content, message });
      return res.status(200).json({ success: true, filename });
    }

    if (req.method === 'PUT') {
      if (!token) return res.status(401).json({ error: 'Missing GITHUB_TOKEN' });
      const filename = req.query && req.query.filename ? String(req.query.filename) : '';
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      const body = req.body || {};
      const content = body.content;
      const message = body.message ? String(body.message) : 'Update post';
      if (typeof content !== 'string') return res.status(400).json({ error: 'Missing content' });

      const path = `${postsDir}/${filename}`;
      const sha = body.sha ? String(body.sha) : (await getContentMeta({ owner, repo, headers, path })).sha;
      await putContent({ owner, repo, headers, path, content, message, sha });
      return res.status(200).json({ success: true, filename });
    }

    if (req.method === 'DELETE') {
      if (!token) return res.status(401).json({ error: 'Missing GITHUB_TOKEN' });
      const filename = req.query && req.query.filename ? String(req.query.filename) : '';
      if (!filename) return res.status(400).json({ error: 'Missing filename' });
      const body = req.body || {};
      const message = body.message ? String(body.message) : 'Delete post';
      const path = `${postsDir}/${filename}`;
      const sha = body.sha ? String(body.sha) : (await getContentMeta({ owner, repo, headers, path })).sha;
      await deleteContent({ owner, repo, headers, path, message, sha });
      return res.status(200).json({ success: true, filename });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Request failed' });
  }
}

async function getContent({ owner, repo, headers, path }) {
  const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  const base64 = data && data.content ? String(data.content).replace(/\n/g, '') : '';
  const content = Buffer.from(base64, 'base64').toString('utf8');
  return { content, sha: data.sha };
}

async function getContentMeta({ owner, repo, headers, path }) {
  const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  if (!data.sha) throw new Error('Missing sha');
  return { sha: data.sha };
}

async function putContent({ owner, repo, headers, path, content, message, sha }) {
  const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
  const base64Content = Buffer.from(content).toString('base64');
  const body = { message, content: base64Content };
  if (sha) body.sha = sha;

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  return data;
}

async function deleteContent({ owner, repo, headers, path, message, sha }) {
  const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ message, sha })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  return data;
}
