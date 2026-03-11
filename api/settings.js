import yaml from 'js-yaml';

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
      if (!token) return res.status(401).json({ error: 'Missing GITHUB_TOKEN' });
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
      await putTextFile(owner, repo, headers, '_config.yml', newText, existing.sha, 'Update site settings');
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Settings failed' });
  }
}

async function getTextFile(owner, repo, headers, filePath) {
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
  const content = Buffer.from(base64, 'base64').toString('utf8');
  return { content, sha: data.sha };
}

async function putTextFile(owner, repo, headers, filePath, content, sha, message) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const base64Content = Buffer.from(content).toString('base64');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: base64Content, sha })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data && data.message ? data.message : 'GitHub API error';
    throw new Error(msg);
  }
  return data;
}
