const crypto = require('crypto');

const counters = new Map();

function loadConfiguredKeys() {
  try {
    const parsed = JSON.parse(process.env.API_KEYS || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('API_KEYS doit être un tableau JSON valide');
    return [];
  }
}

function hashKey(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getKey(rawKey) {
  const keyHash = hashKey(String(rawKey || ''));
  const configured = loadConfiguredKeys().find((entry) => entry && (entry.hash === keyHash || entry.key === rawKey));
  if (!configured) return null;

  const plan = String(configured.plan || 'free').toLowerCase();
  const limit = Number(configured.requestsPerDay) > 0 ? Number(configured.requestsPerDay) : 100;
  const counterKey = `${keyHash}:${new Date().toISOString().slice(0, 10)}`;

  return {
    plan,
    limit,
    name: configured.name || null,
    canMakeRequest() {
      const used = counters.get(counterKey) || 0;
      return used < limit
        ? { allowed: true, limit, used }
        : { allowed: false, limit, used, reason: 'Daily API key limit exceeded' };
    },
    async incrementRequest() {
      counters.set(counterKey, (counters.get(counterKey) || 0) + 1);
    }
  };
}

module.exports = { getKey, hashKey };
