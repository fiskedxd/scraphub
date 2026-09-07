const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
      logLevel: 'warn',
      // Ne pas bufferiser le body (sinon un MP4 de 500 Mo abort la requête)
      parseReqBody: false,
      timeout: 0,
      proxyTimeout: 0
    })
  );
};
