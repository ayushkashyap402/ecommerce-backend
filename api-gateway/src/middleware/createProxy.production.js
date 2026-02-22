const { createProxyMiddleware } = require('http-proxy-middleware');

const createProxy = (target, options = {}) => {
  const sanitizedTarget = target.trim();

  return createProxyMiddleware({
    target: sanitizedTarget,
    changeOrigin: true,
    xfwd: true,
    timeout: 20000,
    proxyTimeout: 20000,

    onProxyRes: (proxyRes) => {
      if (proxyRes.headers) {
        delete proxyRes.headers['access-control-allow-origin'];
        delete proxyRes.headers['access-control-allow-credentials'];
        delete proxyRes.headers['access-control-allow-headers'];
        delete proxyRes.headers['access-control-allow-methods'];
      }
    },

    pathRewrite: (path) => {
      const cleanPath = path.replace(/%0A/g, '').trim();
      let rewrittenPath;
      if (cleanPath.startsWith('/api')) {
        rewrittenPath = cleanPath.replace('/api', '');
      } else {
        rewrittenPath = cleanPath;
      }
      console.log('[api-gateway] pathRewrite:', cleanPath, '->', rewrittenPath);
      return rewrittenPath;
    },

    on: {
      // Forward raw body captured during parsing
      proxyReq: (proxyReq, req, res) => {
        if (req.rawBody && req.rawBody.length > 0) {
          if (!proxyReq.getHeader('content-type') && req.get('content-type')) {
            proxyReq.setHeader('content-type', req.get('content-type'));
          }
          proxyReq.setHeader('content-length', req.rawBody.length);
          proxyReq.write(req.rawBody);
          console.log('[api-gateway] proxy proxyReq', {
            url: req.originalUrl,
            contentLength: proxyReq.getHeader('content-length'),
          });
        }
      },
    },

    onError: (err, req, res) => {
      console.error(`Proxy error [${req.method} ${req.path}]:`, err.code || err.name, err.message);

      if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: 'Service Unavailable',
          message: 'Target service is not running'
        });
      }

      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
        return res.status(504).json({ 
          error: 'Gateway Timeout',
          message: 'Request to service timed out'
        });
      }

      res.status(502).json({ 
        error: 'Bad Gateway',
        message: err.message 
      });
    },

    ...options
  });
};

module.exports = { createProxy };
