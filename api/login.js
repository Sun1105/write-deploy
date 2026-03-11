export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const username = body.username ? String(body.username) : '';
    const password = body.password ? String(body.password) : '';

    const expectedUsername = process.env.ADMIN_USERNAME || 'sun·1105';
    const expectedPassword = process.env.ADMIN_PASSWORD || '521xiaoyue';

    if (username === expectedUsername && password === expectedPassword) {
      const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
      return res.status(200).json({
        success: true,
        token,
        user: { name: '某位作者', role: 'Administrator' }
      });
    }

    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
}
