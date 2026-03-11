export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const owner = process.env.GITHUB_OWNER || 'Sun1105';
  const repo = process.env.GITHUB_REPO || 'hexo-source';
  const token = process.env.GITHUB_TOKEN;
  const dirPath = 'source/_posts';

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vercel-Serverless-Function'
  };
  if (token) headers.Authorization = `token ${token}`;

  try {
    const encodedPath = dirPath.split('/').map(part => encodeURIComponent(part)).join('/');
    const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
      method: 'GET',
      headers
    });

    if (!listRes.ok) {
      const data = await listRes.json().catch(() => ({}));
      return res.status(listRes.status).json({ error: data.message || 'Failed to list posts' });
    }

    const entries = await listRes.json();
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

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list posts' });
  }
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
    else if (key === 'published') out.published = value === 'true';
    else if (key === 'tags') out.tags = parseInlineArray(value);
    else if (key === 'categories') out.categories = parseInlineArray(value);
  }

  return out;
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
