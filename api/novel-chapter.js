export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const novelId = req.query && req.query.novelId ? String(req.query.novelId) : '';
  const chapterFile = req.query && req.query.chapterFile ? String(req.query.chapterFile) : '';
  if (!novelId || !chapterFile) return res.status(400).json({ error: 'Missing novelId or chapterFile' });

  const owner = process.env.GITHUB_OWNER || 'Sun1105';
  const repo = process.env.GITHUB_REPO || 'hexo-source';
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vercel-Serverless-Function'
  };
  if (token) headers.Authorization = `token ${token}`;

  try {
    const baseDir = `source/_novels/${novelId}`;
    const meta = await readJsonOrNull(owner, repo, headers, `${baseDir}/meta.json`);
    const chapter = await readTextOrNull(owner, repo, headers, `${baseDir}/${chapterFile}`);
    if (chapter == null) return res.status(404).json({ error: 'Chapter not found' });

    const list = await listDir(owner, repo, headers, baseDir);
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
    return res.status(500).json({ error: err.message || 'Failed to load chapter' });
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

async function readTextOrNull(owner, repo, headers, filePath) {
  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: 'GET',
    headers
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  const base64 = data && data.content ? String(data.content).replace(/\n/g, '') : '';
  if (!base64) return '';
  return Buffer.from(base64, 'base64').toString('utf8');
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
