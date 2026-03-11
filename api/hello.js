// 一个极简的测试函数，用来确认 Vercel 是否正确暴露 /api 路由
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ ok: true, message: 'hello from api/hello', method: req.method });
}