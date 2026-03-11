export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const owner = process.env.GITHUB_OWNER || 'Sun1105';
  const repo = process.env.GITHUB_REPO || 'hexo-source';
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vercel-Serverless-Function'
  };
  if (token) headers.Authorization = `token ${token}`;

  try {
    const baseDir = 'source/_novels';
    const list = await listDir(owner, repo, headers, baseDir);
    const dirs = list.filter(e => e && e.type === 'dir');

    const novels = await Promise.all(
      dirs.map(async (dir) => {
        const id = dir.name;
        const metaPath = `${baseDir}/${id}/meta.json`;
        const meta = await readJsonOrNull(owner, repo, headers, metaPath);
        const chapterList = await listDir(owner, repo, headers, `${baseDir}/${id}`);
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

    res.status(200).json(novels);
  } catch (err) {
    res.status(200).json([]);
  }
}

async function listDir(owner, repo, headers, dirPath) {
  const encodedPath = dirPath.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('GitHub API error');
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function readJsonOrNull(owner, repo, headers, filePath) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  const base64 = data && data.content ? String(data.content).replace(/\n/g, '') : '';
  if (!base64) return null;
  try {
    const text = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}
