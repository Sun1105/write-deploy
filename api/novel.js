export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const owner = process.env.GITHUB_OWNER || 'Sun1105';
  const repo = process.env.GITHUB_REPO || 'hexo-source';
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(401).json({ error: 'Missing GITHUB_TOKEN' });

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
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vercel-Serverless-Function',
      Authorization: `token ${token}`
    };

    const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
    const content = Buffer.from(JSON.stringify(meta, null, 2)).toString('base64');
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ message: `Create novel ${id}`, content })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data.message || 'GitHub API error' });
    }

    return res.status(200).json({ success: true, novel: meta });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Create novel failed' });
  }
}

function slugify(input) {
  const raw = String(input || '').trim();
  const normalized = raw.replace(/\s+/g, '-');
  const cleaned = normalized.replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'novel';
}
