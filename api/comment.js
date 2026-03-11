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
    if (req.method !== 'PUT' && req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!token) return res.status(401).json({ error: 'Missing GITHUB_TOKEN' });

    const id = req.query && req.query.id ? String(req.query.id) : '';
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const filePath = 'source/_data/comments.json';
    const existing = await readJsonFileWithSha(owner, repo, headers, filePath);
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
      await writeJsonFile(owner, repo, headers, filePath, comments, existing.sha, 'Moderate comment');
      return res.status(200).json({ success: true });
    }

    const next = comments.filter(c => !(c && String(c.id) === id));
    if (next.length === comments.length) return res.status(404).json({ error: 'Comment not found' });
    await writeJsonFile(owner, repo, headers, filePath, next, existing.sha, 'Delete comment');
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Comment failed' });
  }
}

async function readJsonFileWithSha(owner, repo, headers, filePath) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
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
  const text = base64 ? Buffer.from(base64, 'base64').toString('utf8') : '[]';
  let arr = [];
  try {
    const parsed = JSON.parse(text);
    arr = Array.isArray(parsed) ? parsed : [];
  } catch {
    arr = [];
  }
  return { data: arr, sha: data.sha };
}

async function writeJsonFile(owner, repo, headers, filePath, data, sha, message) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = { message, content, sha };
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
