const handler = require('../server/api-handler');

module.exports = async function auth(req, res) {
  const route = getRouteParam(req);
  req.query = { ...(req.query || {}), path: route || 'login' };
  return handler(req, res);
};

function getRouteParam(req) {
  try {
    const host = (req.headers && (req.headers.host || req.headers.Host)) || 'localhost';
    const url = new URL(req.url || '', `http://${host}`);
    return url.searchParams.get('route') || '';
  } catch {
    return (req.query && req.query.route) ? String(req.query.route) : '';
  }
}
