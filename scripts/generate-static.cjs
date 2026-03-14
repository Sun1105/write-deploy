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

  await copyFileIfExists(path.join(rootDir, '.nojekyll'), path.join(outDir, '.nojekyll'));
  await copyFileIfExists(path.join(rootDir, 'search.xml'), path.join(outDir, 'search.xml'));

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
