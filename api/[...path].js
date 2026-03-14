const handler = require('../server/api-handler');

module.exports = async function catchAll(req, res) {
  return handler(req, res);
};

