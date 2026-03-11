/**
 * 编辑文章 API
 * 前端传入：
 * {
 *   path: 文件路径，例如 _posts/1699170000000-标题.md
 *   sha: 当前文件 SHA（GitHub API 必须）
 *   content: 修改后的 Markdown 内容
 *   message: Git 提交信息
 * }
 */
export default async function handler(req, res){
  if(req.method !== 'POST'){
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  try {
    const { path, sha, content, message } = req.body;

    if(!sha){
      return res.status(400).json({ error: '缺少文件 SHA，无法编辑' });
    }

    const owner = "Sun1105";   // 替换成你的 GitHub 用户名
    const repo = "hexo-source";          // 替换成你的仓库名
    const token = process.env.GITHUB_TOKEN; // 在 Vercel 环境变量中设置

    const base64Content = Buffer.from(content).toString('base64');

    // 调用 GitHub API 更新文件
    const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Serverless-Function'
      },
      body: JSON.stringify({
        message: message || `编辑文章`,
        content: base64Content,
        sha: sha, // GitHub API 必须传当前 SHA 才能覆盖
      }),
    });

    const data = await response.json();

    if(response.ok){
      res.status(200).json({ success: true, url: data.content.html_url });
    } else {
      const errorDetail = data.message || JSON.stringify(data);
      res.status(response.status).json({ error: `GitHub API 错误: ${errorDetail}` });
    }

  } catch(err){
    res.status(500).json({ error: err.message });
  }
}
