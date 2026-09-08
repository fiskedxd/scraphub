const { getKey } = require('../lib/apiKeys');

function normalizePlan(plan = '') {
  return String(plan || '').toLowerCase().replace(/[^a-z]/g, '');
}

function canAccessFeature(plan = 'free', feature = 'tools') {
  const normalized = normalizePlan(plan);

  if (normalized === 'kryn') return true;
  if (normalized === 'oblivion') return true;
  if (normalized === 'slyre') return true;

  if (normalized === 'proplus' || normalized === 'plus' || normalized === 'premium') {
    return feature === 'search' || feature === 'externalSearch' || feature === 'logs';
  }

  if (
    normalized === 'entreprise' ||
    normalized === 'entreprisewithoutcopyright' ||
    normalized === 'enterprise' ||
    normalized === 'enterprisewithoutcopyright'
  ) {
    return true;
  }

  if (normalized === 'pro' || normalized === 'prowithoutcopyright') {
    return feature === 'search' || feature === 'externalSearch' || feature === 'logs';
  }

  return feature === 'tools';
}


async function verifyApiKey(req, res, next) {
  try {
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'API key required. Use: Authorization: Bearer YOUR_API_KEY'
      });
    }

    const apiKey = authHeader.substring(7); 
    const keyData = await getKey(apiKey);

    if (!keyData) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    
    const canRequest = keyData.canMakeRequest();
    if (!canRequest.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: canRequest.reason
      });
    }

    
    await keyData.incrementRequest();

    
    req.apiKey = keyData;
    req.apiKeyPlan = keyData.plan;
    req.apiKeyLimit = canRequest.limit;

    
    req.addCopyright = !keyData.plan.includes('WithoutCopyright');

    next();
  } catch (err) {
    console.error('Error verifying API key:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

function verifyApiKeyWithFeature(requiredFeature = 'tools') {
  return async function apiKeyFeatureMiddleware(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'API key required. Use: Authorization: Bearer YOUR_API_KEY'
        });
      }

      const apiKey = authHeader.substring(7);
      const keyData = await getKey(apiKey);

      if (!keyData) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }

      if (!canAccessFeature(keyData.plan, requiredFeature)) {
        return res.status(403).json({
          error: 'feature_not_allowed',
          message: `Le plan ${keyData.plan} n'autorise pas la fonctionnalité ${requiredFeature}`
        });
      }

      const canRequest = keyData.canMakeRequest();
      if (!canRequest.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: canRequest.reason
        });
      }

      await keyData.incrementRequest();
      req.apiKey = keyData;
      req.apiKeyPlan = keyData.plan;
      req.apiKeyLimit = canRequest.limit;
      req.addCopyright = !keyData.plan.includes('WithoutCopyright');

      return next();
    } catch (err) {
      console.error('Error verifying API key feature:', err);
      return res.status(500).json({ error: 'server_error' });
    }
  };
}

module.exports = { verifyApiKey, verifyApiKeyWithFeature, canAccessFeature };
