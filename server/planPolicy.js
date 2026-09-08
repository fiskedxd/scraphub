const PLAN_POLICY = {
  free: {
    label: 'Free',
    price: 0,
    dailySearches: 20,
    maxResults: 10,
    externalSearch: false,
    logs: false,
    features: ['Recherche de base']
  },
  pro: {
    label: 'Pro',
    price: 14.90,
    dailySearches: 250,
    maxResults: 50,
    externalSearch: true,
    logs: true,
    features: ['Recherche externe', 'Logs et archives', 'Domain intelligence']
  },
  proplus: {
    label: 'Pro+',
    price: 29.90,
    dailySearches: 1000,
    maxResults: 100,
    externalSearch: true,
    logs: true,
    features: ['Recherche multi-source', 'Lookup avancé', 'Recherche YouTube', 'Exports JSON/CSV', 'Webhooks']
  },
  entreprise: {
    label: 'Entreprise',
    price: 79,
    dailySearches: 5000,
    maxResults: 200,
    externalSearch: true,
    logs: true,
    enterprise: true,
    features: ['Batch domain intelligence', 'Audit et analytics', 'Exports planifiés', 'Webhooks avancés', 'Gestion d’équipe', 'SLA et support prioritaire']
  }
};

const PLAN_ALIASES = {
  plus: 'proplus',
  premium: 'proplus',
  flexion: 'entreprise',
  kazake: 'entreprise'
};

function normalizePlan(plan = 'free') {
  const normalized = String(plan || 'free').toLowerCase().replace(/[^a-z]/g, '');
  return PLAN_ALIASES[normalized] || normalized;
}

function getPlanPolicy(plan = 'free') {
  return PLAN_POLICY[normalizePlan(plan)] || PLAN_POLICY.free;
}

function serializePlanPolicy() {
  return Object.entries(PLAN_POLICY).map(([id, policy]) => ({ id, ...policy }));
}

module.exports = { PLAN_POLICY, normalizePlan, getPlanPolicy, serializePlanPolicy };