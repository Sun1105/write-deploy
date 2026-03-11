export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const owner = process.env.GITHUB_OWNER || 'Sun1105';
    const repo = process.env.GITHUB_REPO || 'hexo-source';
    const token = process.env.GITHUB_TOKEN;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vercel-Serverless-Function'
    };
    if (token) headers.Authorization = `token ${token}`;

    const postsCount = await countDir(owner, repo, headers, 'source/_posts');
    const commentCount = await countComments(owner, repo, headers, 'source/_data/comments.json');

    res.status(200).json({
      postCount: postsCount,
      viewCount: 28451,
      commentCount,
      userCount: 1284
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch stats' });
  }
}

async function countDir(owner, repo, headers, dirPath) {
  const encodedPath = dirPath.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });
  if (!response.ok) return 0;
  const data = await response.json().catch(() => []);
  if (!Array.isArray(data)) return 0;
  return data.filter(e => e && e.type === 'file').length;
}

async function countComments(owner, repo, headers, filePath) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });
  if (!response.ok) return 0;
  const data = await response.json().catch(() => ({}));
  const base64 = data && data.content ? String(data.content).replace(/\n/g, '') : '';
  if (!base64) return 0;
  try {
    const jsonText = Buffer.from(base64, 'base64').toString('utf8');
    const arr = JSON.parse(jsonText);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}
