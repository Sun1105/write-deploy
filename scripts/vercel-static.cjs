const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('after_generate', function () {
  try {
    const publicDir = hexo.public_dir;
    if (!publicDir) return;

    const pkgPath = path.join(publicDir, 'package.json');
    const vercelPath = path.join(publicDir, 'vercel.json');

    const pkg = {
      name: 'hexo-static-export',
      private: true,
      version: '0.0.0'
    };

    const vercel = {
      version: 2,
      installCommand: 'echo "skip install"',
      buildCommand: 'echo "skip build"',
      outputDirectory: '.'
    };

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2), 'utf8');
  } catch {
  }
});
