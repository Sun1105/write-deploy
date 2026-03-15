/*
  generate-static.cjs（静态站点构建脚本）

  作用：
  - 将源码目录（css/js/images/themes）打包输出到 public/
  - 生成若干“入口页面”HTML（不同 URL 指向同一套 layout，只是 initialPage 不同）
  - 构建 search.xml（简易搜索索引），供前端搜索或第三方工具使用

  重要约定：
  - public/ 是唯一构建产物目录（vercel.json 的 outputDirectory 也是它）
  - themes/mytheme/layout/layout.ejs 是页面骨架，内部 include 了 _partial/*
*/

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

async function main() {
  const rootDir = process.cwd();
  const outDir = path.join(rootDir, 'public');

  // 每次构建都清空 public/，确保不会残留旧文件导致“页面看起来没更新”
  const startAt = Date.now();
  await rmIfExists(outDir);
  await fs.promises.mkdir(outDir, { recursive: true });

  // 复制静态资源（供 HTML 引用）
  await copyIfExists(path.join(rootDir, 'css'), path.join(outDir, 'css'));
  await copyIfExists(path.join(rootDir, 'js'), path.join(outDir, 'js'));
  await copyIfExists(path.join(rootDir, 'images'), path.join(outDir, 'images'));

  // GitHub Pages / 一些静态托管会用 Jekyll 处理目录；.nojekyll 可关闭该行为
  await writeNoJekyll(outDir);

  // 生成站内搜索索引
  await writeSearchXml(rootDir, outDir);

  // 入口页列表：
  // - out：输出到 public/ 的路径
  // - initialPage：前端 SPA 首次展示的 page（对应 #page-xxx）
  // - title：用于页面 <title>（部分页面会被 settings 覆盖）
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

  // 逐个读取 Markdown，提取标题与纯文本摘要（避免把 Markdown 符号塞进索引）
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
