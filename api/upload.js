export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const owner = process.env.GITHUB_OWNER || 'Sun1105';
  const repo = process.env.GITHUB_REPO || 'hexo-source';
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(401).json({ error: 'Missing GITHUB_TOKEN' });

  try {
    const { image, filename } = req.body || {};
    if (!image || !filename) return res.status(400).json({ error: 'Missing image or filename' });
    const safeName = String(filename).replace(/[^a-z0-9.\u4e00-\u9fa5_-]/gi, '_');

    const base64 = extractBase64(image);
    if (!base64) return res.status(400).json({ error: 'Invalid image data' });

    const path = `source/images/${safeName}`;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vercel-Serverless-Function',
      Authorization: `token ${token}`
    };

    const sha = await getShaIfExists(owner, repo, headers, path);
    const response = await putBinary(owner, repo, headers, path, base64, sha, `Upload media ${safeName}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: data.message || 'GitHub API error' });
    }

    return res.status(200).json({ success: true, url: `/images/${safeName}` });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Upload failed' });
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
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return data && data.sha ? data.sha : null;
}

async function putBinary(owner, repo, headers, filePath, base64, sha, message) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const body = { message, content: base64 };
  if (sha) body.sha = sha;
  return fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
}
