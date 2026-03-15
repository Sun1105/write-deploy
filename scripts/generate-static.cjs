const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

async function main() {
  const rootDir = process.cwd();
  const outDir = path.join(rootDir, 'public');

  const startAt = Date.now();
  await rmIfExists(outDir);
  await fs.promises.mkdir(outDir, { recursive: true });

  await copyIfExists(path.join(rootDir, 'css'), path.join(outDir, 'css'));
  await copyIfExists(path.join(rootDir, 'js'), path.join(outDir, 'js'));
  await copyIfExists(path.join(rootDir, 'images'), path.join(outDir, 'images'));

  await writeNoJekyll(outDir);
  await writeSearchXml(rootDir, outDir);

  const pages = [
    { out: 'index.html', initialPage: 'home', title: '' },
    { out: 'about/index.html', initialPage: 'about', title: '关于' },
    { out: 'blog/index.html', initialPage: 'articles', title: '文章' },
    { out: 'archives/index.html', initialPage: 'articles', title: '归档' },
    { out: 'projects/index.html', initialPage: 'about', title: '项目' },
    { out: 'notes/index.html', initialPage: 'articles', title: '笔记' },
    { out: 'skills/index.html', initialPage: 'about', title: '技能' },
    { out: 'login/index.html', initialPage: 'login', title: '登录' },
    { out: 'new-note/index.html', initialPage: 'login', title: '新建' }
  ];

  for (const p of pages) {
    const html = renderLayout(rootDir, {
      initialPage: p.initialPage,
      page: { title: p.title },
      config: { title: '拾墨' }
    });
    const outPath = path.join(outDir, p.out);
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, html, 'utf8');
  }

  const ms = Date.now() - startAt;
  process.stdout.write(`Generated ${pages.length} pages into ${outDir} (${ms}ms)\n`);
}

async function writeNoJekyll(outDir) {
  const outPath = path.join(outDir, '.nojekyll');
  await fs.promises.writeFile(outPath, '', 'utf8');
}

async function writeSearchXml(rootDir, outDir) {
  const postsDir = path.join(rootDir, 'data', 'posts');
  const outPath = path.join(outDir, 'search.xml');

  let entries = [];
  try {
    const files = await fs.promises.readdir(postsDir);
    const mdFiles = files.filter((f) => /\.md$/i.test(f || ''));
    const list = await Promise.all(
      mdFiles.map(async (filename) => {
        try {
          const fullPath = path.join(postsDir, filename);
          const md = await fs.promises.readFile(fullPath, 'utf8');
          const { title, content } = extractSimplePostInfo(md);
          return { filename, title, content };
        } catch {
          return null;
        }
      })
    );
    entries = list.filter(Boolean);
  } catch {
  }

  const xml = buildSearchXml(entries);
  await fs.promises.writeFile(outPath, xml, 'utf8');
}

function extractSimplePostInfo(markdown) {
  const raw = String(markdown || '').replace(/^\uFEFF/, '');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;
  const fmText = fmMatch ? fmMatch[1] : '';

  let title = '';
  if (fmText) {
    const m = fmText.match(/^\s*title\s*:\s*(.+)\s*$/m);
    if (m && m[1]) title = String(m[1]).trim().replace(/^["']|["']$/g, '');
  }
  if (!title) {
    const h = body.match(/^\s*#\s+(.+)\s*$/m);
    if (h && h[1]) title = String(h[1]).trim();
  }
  if (!title) title = '';

  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, content: text.slice(0, 600) };
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSearchXml(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const items = list.map((e) => {
    const title = escapeXml(e.title || '');
    const url = '/blog/';
    const content = e.content ? `<![CDATA[${String(e.content)}]]>` : '<![CDATA[]]>';
    return [
      '  <entry>',
      `    <title>${title}</title>`,
      `    <link href="${url}"/>`,
      `    <url>${url}</url>`,
      `    <content type="text">${content}</content>`,
      '  </entry>'
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<search>',
    items.join('\n'),
    '</search>',
    ''
  ].join('\n');
}

function renderLayout(rootDir, locals) {
  const layoutPath = path.join(rootDir, 'themes', 'mytheme', 'layout', 'layout.ejs');
  const layoutText = fs.readFileSync(layoutPath, 'utf8');

  function partial(name, partialLocals) {
    const normalized = name.endsWith('.ejs') ? name : `${name}.ejs`;
    const partialPath = path.join(rootDir, 'themes', 'mytheme', 'layout', normalized);
    const txt = fs.readFileSync(partialPath, 'utf8');
    return ejs.render(txt, { ...(locals || {}), ...(partialLocals || {}), partial }, { filename: partialPath });
  }

  return ejs.render(layoutText, { ...(locals || {}), partial }, { filename: layoutPath });
}

async function rmIfExists(targetPath) {
  try {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
  } catch {
  }
}

async function copyIfExists(src, dest) {
  try {
    const stat = await fs.promises.stat(src);
    if (!stat.isDirectory()) return;
    await fs.promises.cp(src, dest, { recursive: true });
  } catch {
  }
}

async function copyFileIfExists(src, dest) {
  try {
    const stat = await fs.promises.stat(src);
    if (!stat.isFile()) return;
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.copyFile(src, dest);
  } catch {
  }
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err));
  process.exit(1);
});
