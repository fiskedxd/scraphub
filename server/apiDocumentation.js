const API_DOCUMENTATION = [
  {
    id: 'enterprise-capabilities',
    method: 'GET',
    path: '/api/enterprise/capabilities',
    title: 'Capacités Enterprise',
    feature: 'enterprise',
    minimumPlan: 'entreprise',
    description: 'Retourne les modules, exports, webhooks et fonctions équipe activés.',
    example: null
  },
  {
    id: 'enterprise-usage',
    method: 'GET',
    path: '/api/enterprise/usage',
    title: 'Usage Enterprise',
    feature: 'enterprise',
    minimumPlan: 'entreprise',
    description: 'Consulte le quota, les résultats maximum et la consommation du compte.',
    example: null
  },
  {
    id: 'search',
    method: 'POST',
    path: '/api/brixhub/search',
    title: 'Recherche principale',
    feature: 'search',
    minimumPlan: 'free',
    description: 'Recherche dans les sources indexées. Le nombre de résultats dépend du plan.',
    example: { query: 'email@example.com', limit: 10 }
  },
  {
    id: 'sqlite-search',
    method: 'POST',
    path: '/api/sqlite/search',
    title: 'Recherche FTS',
    feature: 'search',
    minimumPlan: 'free',
    description: 'Recherche plein texte dans l’index local.',
    example: { query: 'example', exactMatch: false, limit: 10 }
  },
  {
    id: 'external-search',
    method: 'POST',
    path: '/api/blacksanta/search/all',
    title: 'Recherche externe Blacksanta',
    feature: 'externalSearch',
    minimumPlan: 'pro',
    description: 'Accès aux sources externes autorisées par votre abonnement.',
    example: { query: 'example.com' }
  },
  {
    id: 'lookup2bz',
    method: 'GET',
    path: '/api/lookup2bz/all',
    title: 'Lookup externe',
    feature: 'externalSearch',
    minimumPlan: 'proplus',
    description: 'Accès aux sources Lookup2Bz selon les droits de votre plan.',
    example: { q: 'example' }
  },
  {
    id: 'domain-intel',
    method: 'POST',
    path: '/api/domain/intel',
    title: 'Domain intelligence',
    feature: 'externalSearch',
    minimumPlan: 'pro',
    description: 'Analyse DNS, SSL, technologies et exposition d’un domaine.',
    example: { domain: 'example.com' }
  },
  {
    id: 'youtube-search',
    method: 'POST',
    path: '/api/youtube/search',
    title: 'Recherche YouTube',
    feature: 'externalSearch',
    minimumPlan: 'proplus',
    description: 'Recherche de vidéos via le proxy YouTube.',
    example: { query: 'osint' }
  },
  {
    id: 'geoint',
    method: 'POST',
    path: '/api/geoint/analyze',
    title: 'Analyse GeoINT',
    feature: 'externalSearch',
    minimumPlan: 'entreprise',
    description: 'Analyse géographique d’une image téléversée.',
    example: null
  },
  {
    id: 'search-logs',
    method: 'POST',
    path: '/api/search-logs',
    title: 'Recherche dans les logs',
    feature: 'logs',
    minimumPlan: 'pro',
    description: 'Recherche filtrée dans les fichiers de logs autorisés.',
    example: { term: 'login' }
  },
  {
    id: 'file-lines',
    method: 'POST',
    path: '/api/get-file-lines',
    title: 'Lignes de fichier',
    feature: 'logs',
    minimumPlan: 'pro',
    description: 'Retourne les lignes correspondant à un filtre dans un fichier autorisé.',
    example: { fileName: 'Logs.txt', filter: 'error' }
  },
  {
    id: 'health',
    method: 'GET',
    path: '/api/health',
    title: 'État du service',
    feature: 'health',
    minimumPlan: 'free',
    description: 'Vérifie la disponibilité de l’API.',
    example: null
  }
];

const PLAN_RANK = { free: 0, pro: 1, proplus: 2, entreprise: 3 };
const PLAN_ALIASES = {
  plus: 'proplus',
  premium: 'proplus',
  enterprise: 'entreprise',
  entreprisewithoutcopyright: 'entreprise',
  prowithoutcopyright: 'pro',
  flexion: 'entreprise',
  kazake: 'entreprise'
};

function normalizeApiPlan(plan = 'free') {
  const value = String(plan || 'free').toLowerCase().replace(/[^a-z]/g, '');
  return PLAN_ALIASES[value] || value;
}

function planCanAccess(plan, minimumPlan) {
  return (PLAN_RANK[normalizeApiPlan(plan)] ?? 0) >= (PLAN_RANK[normalizeApiPlan(minimumPlan)] ?? 0);
}

function getDocumentationForPlan(plan = 'free') {
  return API_DOCUMENTATION.map((endpoint) => ({
    ...endpoint,
    allowed: planCanAccess(plan, endpoint.minimumPlan)
  }));
}

module.exports = { API_DOCUMENTATION, getDocumentationForPlan, normalizeApiPlan, planCanAccess };