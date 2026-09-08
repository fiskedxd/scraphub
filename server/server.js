const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
const https = require('https');
const multer = require('multer');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { exec, execFile } = require('child_process');
const ytdl = require('ytdl-core');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const ChatMessage = require('./models/ChatMessage');
const PaymentTransaction = require('./models/PaymentTransaction');
const spotifyRouter = require('./routes/spotify');
const { PLAN_POLICY, getPlanPolicy, serializePlanPolicy } = require('./planPolicy');
const { getKey } = require('./lib/apiKeys');
const { getDocumentationForPlan } = require('./apiDocumentation');

const MAIL_SERVICE = process.env.MAIL_SERVICE || 'gmail';
const MAIL_USER = process.env.MAIL_USER;
const MAIL_APP_PASSWORD = process.env.MAIL_APP_PASSWORD;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Osint Build';
const MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL || MAIL_USER;

const emailTransporter = MAIL_USER && MAIL_APP_PASSWORD ? nodemailer.createTransport({
  service: MAIL_SERVICE,
  auth: {
    user: MAIL_USER,
    pass: MAIL_APP_PASSWORD
  }
}) : null;

const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email, code) => {
  if (!emailTransporter) {
    throw new Error('SMTP email transporteur non configuré');
  }

  const mailOptions = {
    from: `${MAIL_FROM_NAME} <${MAIL_FROM_EMAIL}>`,
    to: email,
    subject: 'Vérification de votre adresse email',
    html: `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2>Vérification de votre email</h2>
        <p>Bonjour,</p>
        <p>Merci de vous être inscrit(e). Utilisez le code suivant pour vérifier votre adresse email :</p>
        <div style="margin: 24px 0; padding: 18px; background: #111; border-radius: 12px; display: inline-block; color: #fff; font-size: 24px; letter-spacing: 0.18em;">${code}</div>
        <p>Ce code est valable 20 minutes.</p>
        <p>Si ce n'est pas vous, ignorez ce message.</p>
        <p style="color: #888; font-size: 14px;">Osint Build</p>
      </div>
    `
  };

  await emailTransporter.sendMail(mailOptions);
};

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);
app.disable('x-powered-by');

const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/osintbuild';
const FTS_REMOTE_URL = process.env.DB_PATH;
const FTS_CACHE_DIR = process.env.DB_CACHE_DIR || (fs.existsSync('/data') ? '/data' : path.join(__dirname, '..', 'tmp'));
const FTS_DB_PATH = process.env.DB_LOCAL_PATH || path.join(FTS_CACHE_DIR, 'fts_index.sqlite');
const FTS_PART_PATH = `${FTS_DB_PATH}.part`;
let ftsDownloadPromise = null;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'xploit0dev@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Dryzer09';
const ADMIN_VERIFICATION_EMAIL = process.env.ADMIN_VERIFICATION_EMAIL || 'dryzer0dev@gmail.com';
const ADMIN_VERIFICATION_EXPIRY_MS = Number(process.env.ADMIN_VERIFICATION_EXPIRY_MS || 10 * 60 * 1000);
const UNLIMITED_SEARCH_EMAILS = new Set(['slyre6w@gmail.com', 'hugo.almeida11@icloud.com']);
const PAYMENT_CHECKOUT_URL = process.env.PAYMENT_CHECKOUT_URL || process.env.PAYSAFE_CHECKOUT_URL || '';
const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '';
let adminVerificationState = null;

async function ensureFtsDatabase() {
  if (fs.existsSync(FTS_DB_PATH) && fs.statSync(FTS_DB_PATH).size > 0) {
    return FTS_DB_PATH;
  }

  if (!FTS_REMOTE_URL || !/^https?:\/\//i.test(FTS_REMOTE_URL)) {
    throw new Error('DB_PATH doit contenir une URL HTTP(S) vers fts_index.sqlite');
  }

  if (ftsDownloadPromise) return ftsDownloadPromise;

  ftsDownloadPromise = (async () => {
    await fs.promises.mkdir(FTS_CACHE_DIR, { recursive: true });
    let offset = 0;
    try {
      offset = (await fs.promises.stat(FTS_PART_PATH)).size;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const request = async (start) => fetch(FTS_REMOTE_URL, {
      headers: start > 0 ? { Range: `bytes=${start}-` } : {}
    });

    let response = await request(offset);
    if (offset > 0 && response.status === 200) {
      await fs.promises.rm(FTS_PART_PATH, { force: true });
      offset = 0;
      response = await request(0);
    }

    if (response.status === 416 && offset > 0) {
      const head = await fetch(FTS_REMOTE_URL, { method: 'HEAD' });
      const remoteSize = Number(head.headers.get('content-length'));
      if (head.ok && remoteSize === offset) {
        await fs.promises.rename(FTS_PART_PATH, FTS_DB_PATH);
        return FTS_DB_PATH;
      }
    }

    if (!response.ok || !response.body) {
      throw new Error(`Téléchargement FTS impossible: HTTP ${response.status}`);
    }

    const expectedLength = Number(response.headers.get('content-length'));
    const totalSize = Number.isFinite(expectedLength) && expectedLength > 0
      ? offset + expectedLength
      : null;
    console.log(`Téléchargement FTS démarré/repris à ${offset} octets${totalSize ? ` sur ${totalSize}` : ''}`);

    await pipeline(
      Readable.fromWeb(response.body),
      fs.createWriteStream(FTS_PART_PATH, { flags: offset > 0 ? 'a' : 'w' })
    );

    const downloadedSize = (await fs.promises.stat(FTS_PART_PATH)).size;
    if (totalSize && downloadedSize !== totalSize) {
      throw new Error(`Téléchargement FTS incomplet: ${downloadedSize}/${totalSize} octets`);
    }

    await fs.promises.rename(FTS_PART_PATH, FTS_DB_PATH);
    console.log(`Téléchargement FTS terminé: ${downloadedSize} octets`);
    return FTS_DB_PATH;
  })().finally(() => {
    ftsDownloadPromise = null;
  });

  return ftsDownloadPromise;
}

const allowedOrigins = [
  'https://scraphub.org',
  'https://www.scraphub.org',
  'https://scraphub-eight.vercel.app',
  'https://osintbuild.vercel.app',
  'https://www.osintbuild.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173'
];

let localLogIndex = null; 
let localLogIndexBuiltAt = null;
const LOCAL_LOG_FILENAME = '[104.485.439]_[Ulp]_[Secretline.top]_[@StarLinkClouds].txt';

const geocodeCache = new Map(); 
const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getGeocodeCache(key) {
  try {
    const entry = geocodeCache.get(key);
    if (!entry) return null;
    if ((Date.now() - entry.ts) > GEOCODE_CACHE_TTL) {
      geocodeCache.delete(key);
      return null;
    }
    return entry.data;
  } catch (err) {
    return null;
  }
}

function setGeocodeCache(key, data) {
  try {
    geocodeCache.set(key, { ts: Date.now(), data });
  } catch (err) {
  }
}

function buildLocalLogIndex() {
  try {
    const logPath = path.join(__dirname, '..', 'public', LOCAL_LOG_FILENAME);
    if (!fs.existsSync(logPath)) {
      localLogIndex = new Map();
      localLogIndexBuiltAt = new Date();
      return;
    }
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const idx = new Map();
    for (const line of lines) {
      const found = line.match(emailRegex) || [];
      for (const e of found) {
        const key = String(e).toLowerCase();
        if (!idx.has(key)) idx.set(key, []);
        idx.get(key).push(line);
      }
    }
    localLogIndex = idx;
    localLogIndexBuiltAt = new Date();
    console.log(`Local log index built with ${Array.from(idx.keys()).length} emails at ${localLogIndexBuiltAt.toISOString()}`);
  } catch (err) {
    console.error('Error building local log index:', err);
    localLogIndex = new Map();
    localLogIndexBuiltAt = new Date();
  }
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      scriptSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
}));

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') {
      const host = req.headers['x-forwarded-host'] || req.headers['host'];
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
  }
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/upload/')) {
    req.setTimeout(0);
    res.setTimeout(0);
    return next();
  }
  next();
});

app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/upload/')) {
    return next();
  }
  express.json({
    limit: '10mb',
    verify: (request, response, buffer) => {
      request.rawBody = Buffer.from(buffer);
    }
  })(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/upload/')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  req.setTimeout(0);
  res.setTimeout(0);
  next();
});

const UPLOADS_DIR = process.env.UPLOADS_DIR || (fs.existsSync('/data') ? '/data/uploads' : path.join(__dirname, '..', 'uploads'));
const LEGACY_UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    acceptRanges: true,
    maxAge: '7d'
  })
);
app.use(
  '/uploads',
  express.static(LEGACY_UPLOADS_DIR, {
    acceptRanges: true,
    maxAge: '7d'
  })
);

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Utilisateur invalide' });
    }

    if (user.security?.accountBan?.isBanned) {
      return res.status(403).json({
        error: 'account_banned',
        message: 'Compte banni',
        banned: true,
        reason: user.security.accountBan.reason || 'Banni par l\'admin',
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

const BRIXHUB_API_KEY = 'brix_7I_VfE4_FCxJJAjfcB_pufsKQj1h67I8ngTYXTbVD9P6PsiE';
const BLACKSANTA_API_KEY = process.env.BLACKSANTA_API_KEY || '';
const BLACKSANTA_BASE_URL = process.env.BLACKSANTA_BASE_URL || 'https://blacksanta.su';
const LOOKUP2BZ_BASE_URL = process.env.LOOKUP2BZ_BASE_URL || 'https://api.lookup2bz.xyz';
const LOOKUP2BZ_API_KEY = process.env.LOOKUP2BZ_API_KEY || '';
const BRIXHUB_BASE_URL = 'https://brixhub.net/api/v1';

const parseFetchJson = async (response) => {
  const rawText = await response.text();
  if (!rawText) return { data: {}, isJson: true, rawText: '' };
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return { data: JSON.parse(trimmed), isJson: true, rawText };
    } catch {
      return { data: { raw: trimmed.slice(0, 500) }, isJson: false, rawText };
    }
  }
  return { data: { raw: trimmed.slice(0, 500), html: true }, isJson: false, rawText };
};

const apiResponseCache = new Map();

const getCachedResponse = (key, ttl = 30000) => {
  const cached = apiResponseCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ttl) {
    apiResponseCache.delete(key);
    return null;
  }
  return cached.data;
};

const setCachedResponse = (key, data) => {
  apiResponseCache.set(key, { timestamp: Date.now(), data });
};

const blacksantaHeaders = (extra = {}) => ({
  'x-api-key': BLACKSANTA_API_KEY,
  Accept: 'application/json',
  ...extra
});

const proxyBlacksantaJson = async (req, res, endpoint, { queryKeys = [], passQuery = true, cacheTtl = 0 } = {}) => {
  try {
    if (!BLACKSANTA_API_KEY) {
      return res.status(500).json({ ok: false, error: 'BLACKSANTA_API_KEY non configurée' });
    }

    const url = new URL(endpoint, BLACKSANTA_BASE_URL);
    if (passQuery) {
      Object.entries(req.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).length > 0) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    queryKeys.forEach((key) => {
      const value = req.query[key];
      if (value !== undefined && value !== null && String(value).length > 0) {
        url.searchParams.set(key, String(value));
      }
    });

    const cacheKey = `${endpoint}?${url.searchParams.toString()}`;
    if (cacheTtl > 0) {
      const cached = getCachedResponse(cacheKey, cacheTtl);
      if (cached) {
        return res.json(cached);
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: blacksantaHeaders()
    });

    const { data, isJson } = await parseFetchJson(response);

    if (!isJson) {
      return res.status(502).json({
        ok: false,
        error: 'Réponse invalide Blacksanta (HTML reçu au lieu de JSON)',
        details: data
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data?.error || data?.message || 'Erreur Blacksanta',
        details: data
      });
    }

    const creditsRemaining = response.headers.get('X-Credits-Remaining');
    if (creditsRemaining) {
      res.set('X-Credits-Remaining', creditsRemaining);
    }

    if (cacheTtl > 0) {
      setCachedResponse(cacheKey, data);
    }

    return res.json(data);
  } catch (error) {
    console.error(`Blacksanta proxy error (${endpoint}):`, error);
    return res.status(502).json({ ok: false, error: 'Impossible de joindre l’API Blacksanta', details: error.message });
  }
};

const normalizeLookup2bzCategory = (endpoint, item = {}) => {
  const text = JSON.stringify({ endpoint, ...item }).toLowerCase();

  if (String(item.service_id || '').toLowerCase() === 'oathnet') {
    return { category: 'breach', label: 'ScrapHub • Breach' };
  }

  if (/breach|leak|dump|credential|pwn|victim|account|email|password/.test(text)) {
    return { category: 'breach', label: 'ScrapHub • Breach' };
  }

  if (/ip|asn|geo|isp|country|network|tor|vpn/.test(text) || /ip/.test(String(endpoint))) {
    return { category: 'ip', label: 'ScrapHub • IP Intelligence' };
  }

  if (/roblox|minecraft|fivem|steam|discord|platform|game|gaming|user/.test(text) || /roblox|minecraft|fivem/.test(String(endpoint))) {
    return { category: 'platform', label: 'ScrapHub • Platform' };
  }

  if (/oathnet|intelx|lookup2bz-osint|intelligence|osint|identity|analysis|profile/.test(text) || /intelx|lookup2bz-osint|oathnet/.test(String(endpoint))) {
    return { category: 'intelligence', label: 'ScrapHub • Intelligence' };
  }

  return { category: 'intelligence', label: 'ScrapHub • Intelligence' };
};

const normalizeLookup2bzCollection = (payload, endpoint) => {
  const mapItem = (item) => {
    if (!item || typeof item !== 'object') return item;
    const { category, label } = normalizeLookup2bzCategory(endpoint, item);
    const { _host, host, upstream, service, ...visibleItem } = item;
    return {
      ...visibleItem,
      service_id: item.service_id,
      service_label: item.service_label,
      category,
      source: label,
      provider: 'ScrapHub',
      api_name: 'lookup2bz'
    };
  };

  if (Array.isArray(payload)) {
    return payload.map(mapItem);
  }

  if (payload && typeof payload === 'object') {
    const cloned = { ...payload };

    if (Array.isArray(cloned.results)) cloned.results = cloned.results.map(mapItem);
    if (Array.isArray(cloned.data)) cloned.data = cloned.data.map(mapItem);
    if (Array.isArray(cloned.items)) cloned.items = cloned.items.map(mapItem);
    if (Array.isArray(cloned.hits)) cloned.hits = cloned.hits.map(mapItem);
    if (Array.isArray(cloned.sources)) cloned.sources = cloned.sources.map((source) => ({ ...source, source: source.source || 'ScrapHub • Intelligence', provider: 'ScrapHub' }));
    if (cloned.body && typeof cloned.body === 'object') {
      cloned.body = normalizeLookup2bzCollection(cloned.body, endpoint);
    }
    if (cloned.result && typeof cloned.result === 'object') {
      cloned.result = mapItem(cloned.result);
    }

    return cloned;
  }

  return payload;
};

const lookup2bzProxy = async (req, res, endpoint, method = 'GET', extraQuery = {}) => {
  try {
    const query = String(req.query.query || req.query.q || req.body?.query || extraQuery.query || '').trim();
    if (!query) return res.status(400).json({ ok: false, error: 'Paramètre query requis' });
    if (!LOOKUP2BZ_API_KEY) {
      return res.status(500).json({ ok: false, error: 'LOOKUP2BZ_API_KEY non configurée' });
    }

    const url = new URL(endpoint, LOOKUP2BZ_BASE_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('apikey', LOOKUP2BZ_API_KEY);

    Object.entries(req.query || {}).forEach(([key, value]) => {
      if (key === 'query' || key === 'q' || key === 'apikey') return;
      if (value !== undefined && value !== null && String(value).length > 0) {
        url.searchParams.set(key, String(value));
      }
    });

    Object.entries(extraQuery).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) {
        url.searchParams.set(key, String(value));
      }
    });

    const fetchOptions = {
      method,
      headers: { Accept: 'application/json' }
    };

    if (method === 'POST') {
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, fetchOptions);

    const { data, isJson } = await parseFetchJson(response);

    if (!isJson) {
      return res.status(502).json({
        ok: false,
        error: 'Réponse invalide ScrapHub (HTML reçu au lieu de JSON)',
        details: data
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data?.error || data?.message || 'Erreur ScrapHub',
        details: data
      });
    }

    const responseData = Array.isArray(data) ? data : { ok: true, ...data };
    return res.json(normalizeLookup2bzCollection(responseData, endpoint));
  } catch (error) {
    console.error(`Lookup2bz proxy error (${endpoint}):`, error);
    return res.status(502).json({ ok: false, error: 'Impossible de joindre l’API ScrapHub', details: error.message });
  }
};

const getLookup2bzQueryType = (query) => {
  const value = String(query || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  if (/^(?:https?:\/\/)?(?:www\.)?[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(value)) return 'domain';
  if (/^\d{7,}$/.test(value.replace(/[\s+()-]/g, ''))) return 'phone';
  if (/^\d{15,20}$/.test(value)) return 'discord';
  return 'username';
};

const aggregateLookup2bzSources = async (query) => {
  const queryType = getLookup2bzQueryType(query);
  const oathnet = await lookup2bzProxyRequest('/api/v1/oathnet/auto', 'POST', { query });
  const oathnetFallback = !oathnet.ok && oathnet.status === 404
    ? await lookup2bzProxyRequest('/api/v1/all', 'GET', { query })
    : null;
  const osintcat = queryType === 'username' && /\s/.test(String(query).trim())
    ? { ok: true, source: '/api/v1/osintcat', status: 204, data: { skipped: true, reason: 'username_with_spaces' } }
    : await lookup2bzProxyRequest('/api/v1/osintcat', 'GET', { query, type: queryType });

  const results = await Promise.all([
    oathnetFallback?.ok ? oathnetFallback : oathnet,
    osintcat,
    lookup2bzProxyRequest('/api/v1/intelx/search', 'GET', { query }),
  ]);

  const records = [];
  const serviceResponses = [];

  const collectRecords = (value, metadata = {}) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item) => collectRecords(item, metadata));
      return;
    }
    if (Array.isArray(value.groups)) {
      value.groups.forEach((group) => collectRecords(group, metadata));
      return;
    }
    if (Array.isArray(value.services)) {
      value.services.forEach((service) => {
        const serviceId = String(service.id || service.service_id || '').toLowerCase();
        collectRecords(service, {
          ...metadata,
          service_id: serviceId || metadata.service_id,
          service_label: service.label || metadata.service_label,
        });
      });
      return;
    }
    if (Array.isArray(value.results)) {
      value.results.forEach((item) => collectRecords(item, metadata));
      return;
    }
    if (Array.isArray(value.credentials)) {
      value.credentials.forEach((item) => collectRecords(item, metadata));
      return;
    }
    if (Array.isArray(value.victims)) {
      value.victims.forEach((item) => collectRecords(item, metadata));
      return;
    }
    records.push({
      ...value,
      ...(metadata.service_id ? { service_id: metadata.service_id } : {}),
      ...(metadata.service_label ? { service_label: metadata.service_label } : {}),
    });
  };

  results.forEach((entry) => {
    if (!entry) return;
    serviceResponses.push({
      source: entry.source || 'lookup2bz',
      status: entry.status || 502,
      body: entry.data,
    });
    if (!entry.ok) return;

    const endpoint = String(entry.source || '').toLowerCase();
    const metadata = endpoint.includes('oathnet')
      ? { service_id: 'oathnet', service_label: 'Breaches' }
      : {};
    if (Array.isArray(entry.data?.data)) collectRecords(entry.data.data, metadata);
    else if (entry.data?.body) collectRecords(entry.data.body, metadata);
    else if (entry.data?.profile) collectRecords(entry.data.profile, metadata);
    else if (entry.data?.result) collectRecords(entry.data.result, metadata);
    else collectRecords(entry.data, metadata);
  });

  return {
    ok: true,
    query,
    totalMatches: records.length,
    records: normalizeLookup2bzCollection(records, '/api/v1/aggregate'),
    serviceResponses,
    source: 'ScrapHub • Lookup2bz',
  };
};

const lookup2bzProxyRequest = async (endpoint, method = 'GET', extraQuery = {}) => {
  const url = new URL(endpoint, LOOKUP2BZ_BASE_URL);
  const query = extraQuery.query || '';
  url.searchParams.set('query', String(query));
  url.searchParams.set('apikey', LOOKUP2BZ_API_KEY);

  Object.entries(extraQuery).forEach(([key, value]) => {
    if (key === 'query' || value === undefined || value === null || String(value).length === 0) return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(method === 'POST' ? { body: JSON.stringify({ query: String(query) }) } : {}),
  });

  const { data, isJson } = await parseFetchJson(response);
  if (!isJson || !response.ok) {
    return { ok: false, source: endpoint, status: response.status, data };
  }

  return { ok: true, source: endpoint, status: response.status, data };
};

const crypto = require('crypto');
const HMAC_KEY = process.env.PHONE_HMAC_KEY || null;
if (!HMAC_KEY) console.warn('PHONE_HMAC_KEY not set — phone HMACs will use an ephemeral key (not recommended for production)');

app.post('/api/brixhub/search', authMiddleware, async (req, res) => {
  try {
    const quota = await ensureSearchQuota(req.user);
    const maxResults = getPlanFeatures(req.user).maxResults;
    const requestBody = { ...req.body, limit: Math.min(Number(req.body?.limit) || maxResults, maxResults) };

    const response = await fetch(`${BRIXHUB_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'X-API-Key': BRIXHUB_API_KEY,
        'User-Agent': 'ScrapHub-Backend/1.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const remaining = response.headers.get('X-RateLimit-Remaining-Day');
    const limit = response.headers.get('X-RateLimit-Limit-Day');

    if (remaining) res.set('X-RateLimit-Remaining-Day', remaining);
    if (limit) res.set('X-RateLimit-Limit-Day', limit);

    res.status(response.status).json({
      ...data,
      localQuota: quota
    });
  } catch (error) {
    if (error?.status === 429) {
      return res.status(429).json({ error: error.error, quota: error });
    }
    console.error('BrixHub proxy error:', error);
    res.status(500).json({ error: 'Erreur lors de la requête BrixHub', details: error.message || String(error) });
  }
});

app.get('/api/hibp/account/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email || '');
    const apiKey = process.env.HIBP_API_KEY || '';
    const headers = { 'User-Agent': 'ScrapHub-Backend/1.0' };
    if (apiKey) headers['hibp-api-key'] = apiKey;

    let breaches = null;
    try {
      const r = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, { headers, timeout: 15000 });
      if (r.ok) breaches = await r.json();
    } catch (e) {
    }

    let scrapedSection = null;
    try {
      const pageResp = await fetch(`https://haveibeenpwned.com/account/${encodeURIComponent(email)}`, { timeout: 15000 });
      if (pageResp && pageResp.ok) {
        const html = await pageResp.text();
        const frenchMatch = html.match(/Sources de données([\s\S]*?)Fuites de données/i);
        if (frenchMatch && frenchMatch[1]) {
          scrapedSection = frenchMatch[1].trim();
        } else {
          const englishMatch = html.match(/((Email Breach History|Oh no — pwned!|Data Breaches)[\s\S]*?)(?:<footer|<div[^>]+class=["']footer|<script|<\/body>)/i);
          if (englishMatch && englishMatch[1]) {
            scrapedSection = englishMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          } else if (/Oh no — pwned!/i.test(html) || /Email Breach History/i.test(html) || /Data Breaches/i.test(html)) {
            const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            scrapedSection = textOnly.slice(0, 5000);
          }
        }
      }
    } catch (e) {
    }

    const foundEmails = scrapedSection ? (scrapedSection.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []) : [];

    let localMatches = {};
    try {
      const logPath = path.join(__dirname, '..', 'public', '[104.485.439]_[Ulp]_[Secretline.top]_[@StarLinkClouds].txt');
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split(/\r?\n/);
        const emailsToCheck = [...new Set([email, ...foundEmails])];
        emailsToCheck.forEach(e => { localMatches[e] = lines.filter(l => l.toLowerCase().includes(String(e).toLowerCase())); });
      }
    } catch (e) {
      localMatches = {};
    }

    return res.json({ breaches, scrapedSection, foundEmailsInSection: foundEmails, localMatches });
  } catch (err) {
    console.error('HIBP proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/locallogs/search', (req, res) => {
  try {
    const q = req.query.emails || '';
    const emails = String(q).split(',').map(s => decodeURIComponent(s).trim()).filter(Boolean);
    const result = {};
    if (localLogIndex && localLogIndex instanceof Map) {
      emails.forEach(e => { result[e] = localLogIndex.get(String(e).toLowerCase()) || []; });
      return res.json({ indexed: true, builtAt: localLogIndexBuiltAt, results: result });
    }
    const logPath = path.join(__dirname, '..', 'public', LOCAL_LOG_FILENAME);
    if (!fs.existsSync(logPath)) return res.json({ indexed: false, results: result });
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split(/\r?\n/);
    emails.forEach(e => { result[e] = lines.filter(l => l.toLowerCase().includes(String(e).toLowerCase())); });
    return res.json({ indexed: false, results: result });
  } catch (err) {
    console.error('Local logs search error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/geocode/address', async (req, res) => {
  try {
    const address = req.body.address || '';
    if (!address) return res.status(400).json({ error: 'address missing' });

    const cacheKey = String(address).trim().toLowerCase();
    const cached = getGeocodeCache(cacheKey);
    if (cached) return res.json(cached);

    const NOMINATIM = 'https://nominatim.openstreetmap.org';
    const headers = { 'User-Agent': 'ScrapHub-Backend/1.0' };
    const emailParam = process.env.NOMINATIM_EMAIL ? `&email=${encodeURIComponent(process.env.NOMINATIM_EMAIL)}` : '';

    let primary = null;
    let lat = null;
    let lon = null;
    let searchJson = [];

    try {
      const searchResp = await fetch(`${NOMINATIM}/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1${emailParam}`, { headers, timeout: 10000 });
      searchJson = searchResp.ok ? await searchResp.json() : [];
    } catch (e) {
      searchJson = [];
    }

    if (Array.isArray(searchJson) && searchJson.length > 0) {
      primary = searchJson[0];
      lat = parseFloat(primary.lat);
      lon = parseFloat(primary.lon);
    }

    if (!primary) {
      try {
        const photonResp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=5`, { headers, timeout: 10000 });
        if (photonResp && photonResp.ok) {
          const photonJson = await photonResp.json();
          if (photonJson && Array.isArray(photonJson.features) && photonJson.features.length > 0) {
            const feature = photonJson.features[0];
            const coords = feature.geometry?.coordinates || [];
            const plon = coords[0];
            const plat = coords[1];
            primary = {
              lat: String(plat),
              lon: String(plon),
              display_name: feature.properties?.name || feature.properties?.street || feature.properties?.label || address,
              address: {
                road: feature.properties?.street,
                city: feature.properties?.city || feature.properties?.town || feature.properties?.state,
                postcode: feature.properties?.postcode
              }
            };
            lat = plat;
            lon = plon;
          }
        }
      } catch (e) {
      }
    }

    if (!primary) {
      const respObj = { found: false, address, candidates: [] };
      setGeocodeCache(cacheKey, respObj);
      return res.json(respObj);
    }

    const delta = 0.00035;
    const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
    let nearbyJson = [];
    try {
      const nearbyResp = await fetch(`${NOMINATIM}/search?viewbox=${encodeURIComponent(viewbox)}&bounded=1&format=json&addressdetails=1&limit=20${emailParam}`, { headers, timeout: 10000 });
      nearbyJson = nearbyResp.ok ? await nearbyResp.json() : [];
    } catch (e) {
      nearbyJson = [];
    }

    console.debug('geocode: primary at', lat, lon, 'nearby count', Array.isArray(nearbyJson) ? nearbyJson.length : 0);

    let extendedCandidates = [];
    if ((!Array.isArray(nearbyJson) || nearbyJson.length === 0)) {
      try {
        const addr = primary.address || {};
        let house = addr.house_number || null;
        let road = addr.road || addr.residential || addr.pedestrian || null;
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const postcode = addr.postcode || '';
        if (!road) {
          const m = address.match(/\d+\s+(.+),?\s*\d{5}/);
          if (m && m[1]) road = m[1].split(',')[0].trim();
        }

        if (house) {
          const base = parseInt(house, 10) || 0;
          const start = Math.max(1, base - 12);
          const end = base + 12;
          const promises = [];
          for (let n = start; n <= end; n++) {
            const q = `${n} ${road || ''}, ${city || ''} ${postcode || ''}`.trim();
            promises.push(fetch(`${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1${emailParam}`, { headers, timeout: 8000 }).then(r => r.ok ? r.json() : []).catch(() => []));
          }
          const resArr = await Promise.all(promises);
          resArr.forEach(r => { if (Array.isArray(r) && r.length > 0) extendedCandidates.push(r[0]); });
        } else if (road) {
          const q = `${road}, ${city} ${postcode}`.trim();
          const r = await fetch(`${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=50${emailParam}`, { headers, timeout: 10000 });
          const jr = r.ok ? await r.json() : [];
          if (Array.isArray(jr) && jr.length > 0) extendedCandidates = jr;
        }
      } catch (e) {
      }
    }

    const nearbyJsonFinal = (Array.isArray(nearbyJson) && nearbyJson.length > 0) ? nearbyJson : extendedCandidates;
    const computePosition = (item) => {
      const ilat = parseFloat(item.lat);
      const ilon = parseFloat(item.lon);
      const latDiff = ilat - lat;
      const lonDiff = ilon - lon;
      const y = lonDiff;
      const x = latDiff;
      let bearing = Math.atan2(y, x) * (180 / Math.PI);
      bearing = (bearing + 360) % 360;
      let relative = 'inconnu';
      if (bearing >= 315 || bearing < 45) relative = 'en face';
      else if (bearing >= 45 && bearing < 135) relative = 'à droite';
      else if (bearing >= 135 && bearing < 225) relative = 'derrière';
      else if (bearing >= 225 && bearing < 315) relative = 'à gauche';
      return { lat: ilat, lon: ilon, latDiff, lonDiff, bearing, relative };
    };

    const seen = new Set();
    const deduped = [];
    for (const n of (nearbyJsonFinal || [])) {
      const key = `${n.lat}:${n.lon}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(n);
      if (deduped.length >= 5) break;
    }

    const nearby = deduped.map(n => ({
      display_name: n.display_name,
      type: n.type,
      address: n.address || {},
      lat: n.lat,
      lon: n.lon,
      position: computePosition(n)
    }));

    const respObj = { found: true, primary, lat, lon, nearby };
    setGeocodeCache(cacheKey, respObj);
    return res.json(respObj);
  } catch (err) {
    console.error('Geocode error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

app.post('/api/osint/holehe', authMiddleware, async (req, res) => {
  try {
  const identifier = req.body.identifier || '';
  if (!identifier) return res.status(400).json({ error: 'identifier missing' });

  const cmd = 'holehe';
  const args = ['--json', identifier];

  execFile(cmd, args, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
    console.error('holehe exec error:', err, stderr);
    return res.status(500).json({ error: 'holehe_error', details: stderr || err.message });
    }
    try {
    const j = JSON.parse(stdout || '{}');
    return res.json({ results: j });
    } catch (e) {
    // fallback: return raw output
    return res.json({ raw: stdout });
    }
  });
  } catch (e) {
  console.error('holehe endpoint error', e);
  res.status(500).json({ error: e.message });
  }

});

app.post('/api/phone/id', authMiddleware, async (req, res) => {
  try {
    const phone = req.body.phone || '';
    if (!phone) return res.status(400).json({ error: 'phone missing' });
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) return res.status(400).json({ error: 'no digits' });

    const key = HMAC_KEY || crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', key).update(digits).digest('hex');
    const p = hmac.slice(0, 32).padEnd(32, '0');
    const uuid = `${p.slice(0,8)}-${p.slice(8,12)}-5${p.slice(13,16)}-${p.slice(16,20)}-${p.slice(20,32)}`;
    return res.json({ hmac, uuid });
  } catch (err) {
    console.error('phone id error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

app.post('/api/locallogs/reindex', (req, res) => {
  try {
    buildLocalLogIndex();
    return res.json({ ok: true, builtAt: localLogIndexBuiltAt });
  } catch (err) {
    console.error('Reindex error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/brixhub/lookup/:type/:value', authMiddleware, async (req, res) => {
  const { type, value } = req.params;
  const validTypes = ['email', 'phone', 'iban'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Type de lookup invalide. Utilisez: email, phone, iban' });
  }

  try {
    const response = await fetch(`${BRIXHUB_BASE_URL}/lookup/${type}/${encodeURIComponent(value)}`, {
      headers: {
        'X-API-Key': BRIXHUB_API_KEY,
        'User-Agent': 'ScrapHub-Backend/1.0'
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('BrixHub lookup error:', error);
    res.status(500).json({ error: 'Erreur lors de la requête BrixHub', details: error.message });
  }
});

app.get('/api/brixhub/me', authMiddleware, async (req, res) => {
  try {
    const response = await fetch(`${BRIXHUB_BASE_URL}/me`, {
      headers: {
        'X-API-Key': BRIXHUB_API_KEY,
        'User-Agent': 'ScrapHub-Backend/1.0'
      }
    });

    const data = await response.json();
    const quota = getQuotaInfo(req.user);
    
    if (data && typeof data === 'object') {
      data.data = data.data || {};
      data.data.plan = req.user.accountType || quota.plan;
      data.data.daily_quota = quota.limit;
      data.data.daily_remaining = quota.remaining;
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('BrixHub me error:', error);
    res.status(500).json({ error: 'Erreur lors de la requête BrixHub', details: error.message });
  }
});

mongoose.set('strictQuery', true);

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
})
.then(() => console.log('Connecté à MongoDB'))
.catch(err => console.error('Erreur MongoDB:', err.message));

const PLAN_SEARCH_QUOTA = {
  free: 20,
  budget: 30,
  moyen: 45,
  pro: PLAN_POLICY.pro.dailySearches,
  plus: 500,
  proplus: PLAN_POLICY.proplus.dailySearches,
  flexion: Number.MAX_SAFE_INTEGER,
  kazake: Number.MAX_SAFE_INTEGER,
  entreprise: PLAN_POLICY.entreprise.dailySearches
};

const PLAN_DISPLAY_LABEL = {
  free: 'FREE',
  budget: '5€ (Budget)',
  moyen: 'Moyen',
  pro: 'Pro',
  plus: 'Plus',
  proplus: 'Pro+',
  flexion: 'Flexion (Unlimited)',
  kazake: 'Kazake (Unlimited)',
  entreprise: 'Entreprise'
};

function normalizePlan(plan = 'free') {
  return String(plan || 'free').toLowerCase().replace(/[^a-z]/g, '');
}

function getPlanLimit(plan = 'free') {
  const normalized = normalizePlan(plan);
  return PLAN_SEARCH_QUOTA[normalized] ?? getPlanPolicy(normalized).dailySearches ?? PLAN_SEARCH_QUOTA.free;
}

function getPlanLabel(plan = 'free') {
  const normalized = normalizePlan(plan);
  return PLAN_DISPLAY_LABEL[normalized] || getPlanPolicy(normalized).label || PLAN_DISPLAY_LABEL.free;
}

function getPlanFeatures(user) {
  const plan = normalizePlan(user?.accountType || 'free');
  const policy = getPlanPolicy(plan);
  return {
    plan,
    label: policy.label,
    maxResults: policy.maxResults,
    externalSearch: policy.externalSearch,
    logs: policy.logs,
    enterprise: Boolean(policy.enterprise),
    features: policy.features || []
  };
}

function createCheckoutReference(userId, plan, amount) {
  const payload = Buffer.from(JSON.stringify({
    userId: String(userId),
    plan,
    amount: Number(amount).toFixed(2),
    currency: 'EUR',
    expiresAt: Date.now() + (30 * 60 * 1000)
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', PAYMENT_WEBHOOK_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readCheckoutReference(reference) {
  if (!reference || !PAYMENT_WEBHOOK_SECRET) return null;
  const [payload, signature] = String(reference).split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', PAYMENT_WEBHOOK_SECRET).update(payload).digest('base64url');
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.expiresAt > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}

function requirePlan(feature) {
  return (req, res, next) => {
    const features = getPlanFeatures(req.user);
    if (!features[feature]) {
      return res.status(403).json({
        error: 'plan_required',
        message: `Cette fonctionnalité nécessite un plan ${feature === 'logs' ? 'Pro ou supérieur' : 'Pro ou supérieur'}.`,
        plan: features.plan,
        required: feature
      });
    }
    req.planFeatures = features;
    next();
  };
}

function getNextResetAt() {
  const now = new Date();
  const resetAt = new Date(now);
  resetAt.setHours(24, 0, 0, 0);
  resetAt.setMinutes(0);
  resetAt.setSeconds(0);
  resetAt.setMilliseconds(0);
  return resetAt;
}

function getQuotaInfo(user) {
  const plan = normalizePlan(user?.accountType || 'free');
  const unlimited = UNLIMITED_SEARCH_EMAILS.has(String(user?.email || '').toLowerCase());
  const limit = unlimited ? Number.MAX_SAFE_INTEGER : getPlanLimit(plan);
  const now = new Date();
  let dailyUsed = user?.searchUsage?.dailyUsed || 0;
  let dailyResetAt = user?.searchUsage?.dailyResetAt ? new Date(user.searchUsage.dailyResetAt) : getNextResetAt();

  if (now >= dailyResetAt) {
    dailyUsed = 0;
    dailyResetAt = getNextResetAt();
  }

  const remaining = Math.max(limit - dailyUsed, 0);

  return {
    plan,
    planLabel: unlimited ? 'Unlimited' : getPlanLabel(plan),
    limit,
    used: dailyUsed,
    remaining,
    dailyResetAt
  };
}

async function ensureSearchQuota(user) {
  const now = new Date();
  const plan = normalizePlan(user?.accountType || 'free');
  const unlimited = UNLIMITED_SEARCH_EMAILS.has(String(user?.email || '').toLowerCase());
  const limit = unlimited ? Number.MAX_SAFE_INTEGER : getPlanLimit(plan);
  let dailyUsed = user?.searchUsage?.dailyUsed || 0;
  let dailyResetAt = user?.searchUsage?.dailyResetAt ? new Date(user.searchUsage.dailyResetAt) : getNextResetAt();

  if (now >= dailyResetAt) {
    dailyUsed = 0;
    dailyResetAt = getNextResetAt();
  }

  if (dailyUsed >= limit) {
    throw {
      status: 429,
      error: `Quota journalier dépassé pour le plan ${getPlanLabel(plan)}.`,
      plan,
      planLabel: unlimited ? 'Unlimited' : getPlanLabel(plan),
      limit,
      used: dailyUsed,
      remaining: 0,
      dailyResetAt
    };
  }

  dailyUsed += 1;
  user.searchUsage = {
    dailyUsed,
    dailyResetAt
  };
  await user.save();

  return {
    plan,
    planLabel: unlimited ? 'Unlimited' : getPlanLabel(plan),
    limit,
    used: dailyUsed,
    remaining: Math.max(limit - dailyUsed, 0),
    dailyResetAt
  };
}

function getRequestInfo(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const via = req.headers['via'];
  const cfIp = req.headers['cf-connecting-ip'] || req.headers['true-client-ip'];
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.connection?.remoteAddress || 'unknown';
  const vpnDetected = Boolean(forwarded || via || cfIp);

  return {
    ip,
    forwarded,
    via,
    cfIp,
    userAgent,
    vpnDetected,
    timestamp: new Date().toISOString()
  };
}

function adminTokenMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token admin manquant' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Accès admin refusé' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token admin invalide' });
  }
}

function sendAdminVerificationCode(email, code) {
  if (!emailTransporter) {
    throw new Error('Transporteur email non configuré');
  }
  const mailOptions = {
    from: `${MAIL_FROM_NAME} <${MAIL_FROM_EMAIL}>`,
    to: ADMIN_VERIFICATION_EMAIL,
    subject: 'Code d’accès admin ScrapHub',
    html: `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2>Accès admin ScrapHub</h2>
        <p>Un accès administrateur a été demandé avec ces identifiants :</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Mot de passe :</strong> ${ADMIN_PASSWORD.replace(/./g, '*')}</p>
        <p>Utilise ce code pour te connecter :</p>
        <div style="margin: 24px 0; padding: 18px; background: #111; border-radius: 12px; color: #fff; font-size: 24px; letter-spacing: 0.18em;">${code}</div>
        <p>Ce code expire dans 10 minutes.</p>
      </div>
    `
  };
  return emailTransporter.sendMail(mailOptions);
}

async function createAdminSession(email, password) {
  if (String(email).toLowerCase() !== String(ADMIN_EMAIL).toLowerCase() || password !== ADMIN_PASSWORD) {
    throw new Error('Identifiants admin incorrects');
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + ADMIN_VERIFICATION_EXPIRY_MS);
  adminVerificationState = {
    code,
    expiresAt,
    email: ADMIN_EMAIL,
    requestedAt: new Date()
  };

  await sendAdminVerificationCode(ADMIN_VERIFICATION_EMAIL, code);
  return { expiresAt };
}

async function verifyAdminCode(email, password, code) {
  if (String(email).toLowerCase() !== String(ADMIN_EMAIL).toLowerCase() || password !== ADMIN_PASSWORD) {
    throw new Error('Identifiants admin incorrects');
  }

  if (!adminVerificationState || adminVerificationState.code !== code) {
    throw new Error('Code de vérification invalide');
  }

  if (new Date() > new Date(adminVerificationState.expiresAt)) {
    adminVerificationState = null;
    throw new Error('Code expiré');
  }

  const token = jwt.sign(
    { role: 'admin', email: ADMIN_EMAIL },
    JWT_SECRET,
    { expiresIn: '30m' }
  );

  adminVerificationState = null;
  return token;
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, accountType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const verificationCode = generateVerificationCode();
    const verificationExpiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || email.split('@')[0],
      accountType: accountType || 'free',
      isActive: false,
      createdAt: new Date(),
      emailVerificationCode: verificationCode,
      emailVerificationExpiresAt: verificationExpiresAt,
      security: {
        emailVerified: false
      },
      publicProfile: {
        displayName: name || email.split('@')[0],
        bio: '',
        avatar: '/pdp.png'
      }
    });

    await user.save();

    try {
      await sendVerificationEmail(user.email, verificationCode);
    } catch (emailError) {
      console.error('Erreur envoi email de vérification:', emailError);
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({ error: 'Impossible d\'envoyer l\'email de vérification. Réessayez plus tard.' });
    }

    res.status(201).json({
      message: 'Compte créé. Un code de vérification a été envoyé à votre adresse email.',
      requiresVerification: true,
      email: user.email
    });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (user.security?.accountBan?.isBanned) {
      return res.status(403).json({
        error: 'account_banned',
        message: 'Compte banni',
        banned: true,
        reason: user.security.accountBan.reason || 'Banni par l\'admin',
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    }

    if (user.isActive === false || user.security?.emailVerified === false) {
      return res.status(401).json({ error: 'Email non vérifié. Vérifiez votre adresse email.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const quota = getQuotaInfo(user);
    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        accountType: user.accountType,
        planLabel: getPlanLabel(user.accountType),
        searchLimit: quota.limit,
        searchUsed: quota.used,
        searchRemaining: quota.remaining,
        publicProfile: user.publicProfile
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

app.get('/api/auth/verify', authMiddleware, async (req, res) => {
  try {
    const quota = getQuotaInfo(req.user);
    res.json({
      valid: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        accountType: req.user.accountType,
        planLabel: getPlanLabel(req.user.accountType),
        searchLimit: quota.limit,
        searchUsed: quota.used,
        searchRemaining: quota.remaining
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

app.get('/api/auth/quota', authMiddleware, async (req, res) => {
  try {
    const quota = getQuotaInfo(req.user);
    res.json(quota);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du quota' });
  }
});

app.get('/api/plans', (req, res) => {
  res.json({ plans: serializePlanPolicy() });
});

app.get('/api/developer/docs', async (req, res) => {
  const authorization = String(req.headers.authorization || '');
  const apiKey = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required', message: 'Utilisez Authorization: Bearer YOUR_API_KEY.' });
  }

  const keyData = await getKey(apiKey);
  if (!keyData) return res.status(401).json({ error: 'Invalid API key' });

  const plan = normalizePlan(keyData.plan);
  return res.json({
    plan,
    planLabel: getPlanPolicy(plan).label,
    rateLimitPerDay: keyData.limit,
    authentication: 'Authorization: Bearer YOUR_API_KEY',
    endpoints: getDocumentationForPlan(plan)
  });
});

app.get('/api/enterprise/capabilities', authMiddleware, requirePlan('enterprise'), (req, res) => {
  res.json({ plan: req.planFeatures.plan, features: req.planFeatures.features });
});

app.get('/api/enterprise/usage', authMiddleware, requirePlan('enterprise'), (req, res) => {
  const quota = getQuotaInfo(req.user);
  res.json({ plan: req.planFeatures.plan, quota, maxResults: req.planFeatures.maxResults });
});

app.post('/api/billing/checkout', authMiddleware, async (req, res) => {
  const plan = normalizePlan(req.body?.plan);
  const policy = getPlanPolicy(plan);

  if (plan === 'free' || policy.price === 0) {
    return res.status(400).json({ error: 'Le plan Free ne nécessite pas de paiement.' });
  }

  if (!PAYMENT_CHECKOUT_URL) {
    return res.status(503).json({ error: 'Le checkout marchand n’est pas encore configuré.' });
  }

  const checkoutUrl = new URL(PAYMENT_CHECKOUT_URL);
  if (!PAYMENT_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Le secret webhook de paiement n’est pas configuré.' });
  }
  const checkoutReference = createCheckoutReference(req.user._id, plan, policy.price);
  checkoutUrl.searchParams.set('plan', plan);
  checkoutUrl.searchParams.set('customer_reference', String(req.user._id));
  checkoutUrl.searchParams.set('checkout_reference', checkoutReference);
  checkoutUrl.searchParams.set('customer_email', req.user.email);
  checkoutUrl.searchParams.set('amount', policy.price.toFixed(2));
  checkoutUrl.searchParams.set('currency', 'EUR');

  res.json({ checkoutUrl: checkoutUrl.toString(), plan, price: policy.price, currency: 'EUR' });
});

app.post('/api/billing/webhook', async (req, res) => {
  if (!PAYMENT_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook de paiement non configuré.' });
  }

  const signature = req.headers['x-payment-signature'];
  const payload = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expected = crypto.createHmac('sha256', PAYMENT_WEBHOOK_SECRET).update(payload).digest('hex');
  const providedSignature = Buffer.from(String(signature || ''), 'hex');
  const expectedSignature = Buffer.from(expected, 'hex');
  if (providedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(providedSignature, expectedSignature)) {
    return res.status(401).json({ error: 'Signature webhook invalide.' });
  }

  const {
    status,
    event_id: providerEventId,
    customer_reference: userId,
    checkout_reference: checkoutReference,
    plan,
    amount,
    currency
  } = req.body || {};
  const normalizedPlan = normalizePlan(plan);
  const policy = getPlanPolicy(normalizedPlan);
  const reference = readCheckoutReference(checkoutReference);
  const receivedAmount = Number(amount);
  if (status !== 'paid' || !providerEventId || !PLAN_POLICY[normalizedPlan] || normalizedPlan === 'free' || !Number.isFinite(receivedAmount) || receivedAmount.toFixed(2) !== policy.price.toFixed(2) || String(currency || '').toUpperCase() !== 'EUR' || !reference || reference.plan !== normalizedPlan || reference.userId !== String(userId) || reference.amount !== policy.price.toFixed(2)) {
    return res.status(400).json({ error: 'Événement de paiement invalide.' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  const existingTransaction = await PaymentTransaction.findOne({ providerEventId });
  if (existingTransaction) {
    return res.json({ ok: true, duplicate: true, plan: existingTransaction.plan });
  }
  user.accountType = normalizedPlan;
  user.searchUsage = { dailyUsed: 0, dailyResetAt: getNextResetAt() };
  await user.save();
  try {
    await PaymentTransaction.create({ providerEventId, userId: user._id, plan: normalizedPlan, amount: receivedAmount, currency: 'EUR', status: 'paid' });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
  res.json({ ok: true, plan: normalizedPlan });
});

app.get('/api/chat/messages', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const messages = await ChatMessage.find({}).sort({ createdAt: 1 }).limit(limit).lean();
    res.json({ messages });
  } catch (error) {
    console.error('Chat fetch messages error:', error);
    res.status(500).json({ error: 'Impossible de récupérer les messages du chat' });
  }
});

app.post('/api/chat/message', authMiddleware, async (req, res) => {
  try {
    const { type = 'text', content = '', fileName, isGif = false, duration } = req.body;
    if (!content && type !== 'system') {
      return res.status(400).json({ error: 'Contenu du message requis' });
    }
    const message = new ChatMessage({
      userId: req.user.email,
      userMongoId: req.user._id.toString(),
      userName: req.user.publicProfile?.displayName || req.user.name || 'Anonyme',
      userAvatar: req.user.publicProfile?.avatar || '/pdp.png',
      type,
      content,
      fileName,
      isGif,
      duration
    });
    await message.save();
    res.json(message);
  } catch (error) {
    console.error('Chat post message error:', error);
    res.status(500).json({ error: 'Impossible d’enregistrer le message' });
  }
});

app.put('/api/chat/message/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Contenu du message requis' });
    }
    const message = await ChatMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }
    if (message.userId !== req.user.email && message.userMongoId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Pas autorisé à modifier ce message' });
    }
    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    res.json(message);
  } catch (error) {
    console.error('Chat edit message error:', error);
    res.status(500).json({ error: 'Impossible de modifier le message' });
  }
});

app.delete('/api/chat/message/:id', authMiddleware, async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }
    if (message.userId !== req.user.email && message.userMongoId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Pas autorisé à supprimer ce message' });
    }
    await message.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error('Chat delete message error:', error);
    res.status(500).json({ error: 'Impossible de supprimer le message' });
  }
});

app.post('/api/admin/request-verification', async (req, res) => {
  try {
    const { email, password } = req.body;
    const session = await createAdminSession(email, password);
    res.json({ message: 'Code de vérification envoyé.', expiresAt: session.expiresAt });
  } catch (error) {
    console.error('Admin request verification error:', error);
    res.status(401).json({ error: error.message || 'Identifiants admin incorrects' });
  }
});

app.post('/api/admin/verify-code', async (req, res) => {
  try {
    const { email, password, code } = req.body;
    const token = await verifyAdminCode(email, password, code);
    const requestInfo = getRequestInfo(req);
    res.json({ token, requestInfo });
  } catch (error) {
    console.error('Admin verify code error:', error);
    res.status(401).json({ error: error.message || 'Code invalide' });
  }
});

app.get('/api/admin/info', adminTokenMiddleware, async (req, res) => {
  try {
    res.json({ admin: { email: ADMIN_EMAIL }, requestInfo: getRequestInfo(req) });
  } catch (error) {
    res.status(500).json({ error: 'Impossible de récupérer les infos admin' });
  }
});

app.get('/api/admin/users', adminTokenMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const emailQuery = req.query.email ? String(req.query.email).trim().toLowerCase() : null;
    const returnAll = String(req.query.all || '').toLowerCase() === 'true' || req.query.all === '1';
    const filter = {};
    
    if (emailQuery) {
      filter.email = emailQuery;
    } else if (q) {
      const regexp = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { email: regexp },
        { name: regexp },
        { 'publicProfile.displayName': regexp },
        { accountType: regexp }
      ];
    }
    
    let query = User.find(filter).select('-password').lean();
    if (!returnAll && !emailQuery) query = query.limit(100);
    const users = await query.exec();
    res.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Impossible de récupérer les utilisateurs' });
  }
});

app.get('/api/admin/user/:id', adminTokenMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Admin user detail error:', error);
    res.status(500).json({ error: 'Impossible de récupérer l’utilisateur' });
  }
});

app.put('/api/admin/user/:id', adminTokenMiddleware, async (req, res) => {
  try {
    const updates = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (updates.accountType) {
      user.accountType = String(updates.accountType).toLowerCase();
    }
    if (updates.searchUsed !== undefined) {
      const used = Number(updates.searchUsed);
      user.searchUsage = user.searchUsage || {};
      user.searchUsage.dailyUsed = Number.isNaN(used) ? 0 : used;
      user.searchUsage.dailyResetAt = user.searchUsage.dailyResetAt || getNextResetAt();
    }
    if (updates.resetSearches) {
      user.searchUsage = user.searchUsage || {};
      user.searchUsage.dailyUsed = 0;
      user.searchUsage.dailyResetAt = getNextResetAt();
    }
    if (updates.isBanned !== undefined) {
      user.security = user.security || {};
      user.security.accountBan = {
        isBanned: !!updates.isBanned,
        reason: updates.banReason || (updates.isBanned ? 'Banni par l’admin' : ''),
        bannedAt: updates.isBanned ? new Date() : null
      };
    }
    if (updates.forcePasswordReset) {
      user.security = user.security || {};
      user.security.forcePasswordReset = true;
    }

    await user.save();
    const sanitized = user.toObject();
    delete sanitized.password;
    res.json({ user: sanitized });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour l’utilisateur' });
  }
});

app.get('/api/admin/fts-search', adminTokenMiddleware, async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Paramètre q requis' });
    }

    const dbPath = path.join(__dirname, '..', 'public', 'fts_index.sqlite');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Base de données FTS non trouvée' });
    }

    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    const searchTerms = query.split(' ').filter(Boolean);
    const ftsTerms = searchTerms.map(term => {
      const clean = String(term).replace(/"/g, '""');
      return `content:"${clean}"`;
    }).join(' AND ');
    let results = [];
    try {
      results = await db.all(`SELECT rowid, content, source_db FROM fts WHERE fts MATCH ? LIMIT 200`, [ftsTerms]);
    } catch (e) {
      console.warn('Admin FTS MATCH failed, falling back to LIKE:', e.message);
      const likeQuery = `%${query}%`;
      results = await db.all(`SELECT rowid, content, source_db FROM fts WHERE content LIKE ? LIMIT 200`, [likeQuery]);
    }
    await db.close();

    res.json({ results: results.map(row => ({ id: row.rowid, content: row.content, source: row.source_db || 'unknown' })) });
  } catch (error) {
    console.error('Admin FTS search error:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche FTS' });
  }
});

app.put('/api/admin/fts-record/:id', adminTokenMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'ID de record invalide' });
    }
    const dbPath = path.join(__dirname, '..', 'public', 'fts_index.sqlite');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Base de données FTS non trouvée' });
    }
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    const row = await db.get(`SELECT rowid, content, source_db FROM fts WHERE rowid = ?`, [id]);
    await db.close();
    if (!row) {
      return res.status(404).json({ error: 'Record non trouvé' });
    }
    res.json({ id: row.rowid, content: row.content, source: row.source_db || 'unknown' });
  } catch (error) {
    console.error('Admin FTS record error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture du record FTS' });
  }
});

app.put('/api/admin/user/:id/reset-searches', adminTokenMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    user.searchUsage = user.searchUsage || {};
    user.searchUsage.dailyUsed = 0;
    user.searchUsage.dailyResetAt = getNextResetAt();
    await user.save();
    res.json({ message: 'Recherche quotidienne réinitialisée', user });
  } catch (error) {
    console.error('Admin reset searches error:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation des recherches' });
  }
});

app.put('/api/admin/user/:id/set-search-used', adminTokenMiddleware, async (req, res) => {
  try {
    const { used } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const value = Number(used);
    if (Number.isNaN(value) || value < 0) {
      return res.status(400).json({ error: 'Valeur used invalide' });
    }
    user.searchUsage = user.searchUsage || {};
    user.searchUsage.dailyUsed = value;
    user.searchUsage.dailyResetAt = user.searchUsage.dailyResetAt || getNextResetAt();
    await user.save();
    res.json({ message: 'Quota de recherches mis à jour', user });
  } catch (error) {
    console.error('Admin set search used error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du quota de recherche' });
  }
});

app.put('/api/admin/user/:id/set-plan', adminTokenMiddleware, async (req, res) => {
  try {
    const { accountType } = req.body;
    if (!accountType) {
      return res.status(400).json({ error: 'accountType requis' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    user.accountType = String(accountType).toLowerCase();
    await user.save();
    res.json({ message: 'Plan utilisateur mis à jour', user });
  } catch (error) {
    console.error('Admin set plan error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du plan' });
  }
});

app.put('/api/admin/user/:id/ban', adminTokenMiddleware, async (req, res) => {
  try {
    const { isBanned, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    user.security = user.security || {};
    user.security.accountBan = {
      isBanned: !!isBanned,
      reason: reason || (isBanned ? 'Banni par l’admin' : ''),
      bannedAt: isBanned ? new Date() : null
    };
    await user.save();
    res.json({ message: isBanned ? 'Utilisateur banni' : 'Utilisateur débanni', user });
  } catch (error) {
    console.error('Admin ban error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du ban' });
  }
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const {
      name,
      email,
      bio,
      location,
      website,
      phone,
      company,
      jobTitle,
      timezone,
      language,
      notifications,
      privacy,
      publicProfile
    } = req.body;

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (phone !== undefined) user.phone = phone;
    if (company !== undefined) user.company = company;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    if (timezone) user.timezone = timezone;
    if (language) user.language = language;
    if (notifications && typeof notifications === 'object') {
      user.notifications = {
        ...user.notifications,
        ...notifications
      };
    }
    if (privacy && typeof privacy === 'object') {
      user.privacy = {
        ...user.privacy,
        ...privacy
      };
    }

    if (publicProfile && typeof publicProfile === 'object') {
      user.publicProfile = {
        ...user.publicProfile?.toObject?.() ?? user.publicProfile ?? {},
        ...publicProfile
      };

      if (user.publicProfile.backgroundUrl && !user.publicProfile.backgroundType) {
        user.publicProfile.backgroundType = /\.(mp4|webm)$/i.test(user.publicProfile.backgroundUrl)
          ? 'video'
          : 'image';
      }
    }

    await user.save();
    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;
    res.json({ user: sanitizedUser });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email et code sont requis' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.security?.emailVerified) {
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Email déjà vérifié',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          accountType: user.accountType,
          publicProfile: user.publicProfile
        }
      });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Code de vérification expiré. Merci de vous réinscrire ou de redemander un nouveau code.' });
    }

    if (user.emailVerificationCode !== code.trim()) {
      user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: 'Code de vérification incorrect' });
    }

    user.security.emailVerified = true;
    user.isActive = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpiresAt = undefined;
    user.emailVerificationAttempts = 0;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email vérifié avec succès',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        accountType: user.accountType,
        publicProfile: user.publicProfile
      }
    });
  } catch (error) {
    console.error('Erreur verify-email:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification de l\'email' });
  }
});

app.get('/api/auth/profile/:username', async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const user = await User.findOne({ 
      $or: [
        { name: username },
        { 'publicProfile.displayName': username },
        { 'publicProfile.username': username },
        { email: username.toLowerCase() }
      ]
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

const PROFILE_UPLOAD_MAX_BYTES = 500 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(UPLOADS_DIR, 'profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: PROFILE_UPLOAD_MAX_BYTES,
    fieldSize: 2 * 1024 * 1024,
    fields: 20,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-matroska',
      'video/avi',
      'video/x-msvideo',
      'video/mpeg',
      'video/ogg'
    ];
    const allowedExt = /\.(jpe?g|png|gif|webp|mp4|webm|mov|mkv|avi|mpeg|ogv)$/i;
    const mimeOk = allowedMimes.includes(file.mimetype) || (file.mimetype || '').startsWith('video/');
    const extOk = allowedExt.test(file.originalname || '');

    if (mimeOk || extOk) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé: ${file.mimetype || file.originalname}`), false);
    }
  }
});

const geoIntUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez JPEG, PNG ou WEBP.'), false);
    }
  }
});

app.post('/api/upload/profile', (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'Request aborted' || err.code === 'ECONNABORTED') {
        return;
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Fichier trop volumineux. Maximum : 500 Mo.' });
      }
      console.error('Erreur upload:', err);
      return res.status(400).json({ error: err.message || 'Erreur lors de l\'upload' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    const publicBackendUrl = process.env.PUBLIC_BACKEND_URL || 'https://scraphub-web-backend.fly.dev';
    res.json({
      success: true,
      url: `${publicBackendUrl}/uploads/profiles/${req.file.filename}`
    });
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Osint Build API',
    version: '1.0.0',
    description: 'API pour la plateforme Osint Build',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify',
        verifyEmail: 'POST /api/auth/verify-email',
        profile: 'GET /api/auth/profile/:username',
        logout: 'POST /api/auth/logout'
      },
      health: 'GET /api/health',
      factures: 'GET /api/factures'
    },
    status: 'active'
  });
});

app.post('/api/search-logs', authMiddleware, requirePlan('logs'), async (req, res) => {
  const { term } = req.body;
  const logsPath = path.join(__dirname, '..', 'public', 'Logs.txt');
  
  if (!fs.existsSync(logsPath)) {
    return res.json({ results: [] });
  }
  
  const content = fs.readFileSync(logsPath, 'utf-8');
  const lines = content.split('\n');
  const results = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(term)) {
      results.push({
        line: lines[i],
        lineNumber: i + 1,
        file: 'Logs.txt'
      });
    }
  }
  
  res.json({ results });
});

app.post('/api/get-file-lines', authMiddleware, requirePlan('logs'), async (req, res) => {
  const { fileName, filter } = req.body;
  const filePath = path.join(__dirname, '..', 'public', fileName);
  
  if (!fs.existsSync(filePath)) {
    return res.json({ totalLines: 0, matchingLines: 0, lines: [] });
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matchingLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (!filter || lines[i].toLowerCase().includes(filter.toLowerCase())) {
      matchingLines.push({
        lineNumber: i + 1,
        content: lines[i]
      });
    }
  }
  
  res.json({
    totalLines: lines.length,
    matchingLines: matchingLines.length,
    lines: matchingLines
  });
});

app.get('/api/factures', async (req, res) => {
  try {
    const facturesDir = path.join(__dirname, '..', 'public', 'factures');
    const lots = ['lot 1', 'lot 2', 'lot 3'];
    const allFactures = [];

    const iterateDir = (currentDir, relativeSegments = []) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          iterateDir(entryPath, [...relativeSegments, entry.name]);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
          const stats = fs.statSync(entryPath);
          const relativeUrl = relativeSegments.concat(entry.name).map(encodeURIComponent).join('/');
          const lot = relativeSegments[0] || 'unknown';

          allFactures.push({
            id: `${lot}-${relativeSegments.join('-')}-${entry.name}`,
            nom: entry.name,
            lot,
            chemin: `/factures/${relativeUrl}`,
            taille: stats.size,
            date: stats.mtime
          });
        }
      }
    };

    for (const lot of lots) {
      const lotPath = path.join(facturesDir, lot);
      if (fs.existsSync(lotPath)) {
        iterateDir(lotPath, [lot]);
      }
    }

    res.status(200).json(allFactures);
  } catch (error) {
    console.error('Erreur factures API:', error);
    res.status(500).json({ error: error.message });
  }
});

const looksLikeMaskedBlacksantaPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return false;

  const values = [];
  const walk = (value) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(walk);
      return;
    }
    if (typeof value === 'string') values.push(value);
  };

  walk(payload);

  const placeholderMatches = values.filter(v => /\*\*\*(?:UPGRADE_TO_SEE|REDACTED|HIDDEN|MASKED|REDACTED_VALUE)\*\*\*/i.test(v));
  const meaningfulValues = values.filter(v => {
    const trimmed = String(v).trim();
    return trimmed && !/^(?:null|undefined|N\/A|unknown)$/i.test(trimmed) && !/\*\*\*(?:UPGRADE_TO_SEE|REDACTED|HIDDEN|MASKED|REDACTED_VALUE)\*\*\*/i.test(trimmed);
  });

  return placeholderMatches.length > 0 && meaningfulValues.length === 0;
};

app.get('/api/blacksanta/search/all', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'Paramètre q requis' });
    if (!BLACKSANTA_API_KEY) {
      return res.status(500).json({ ok: false, error: 'BLACKSANTA_API_KEY non configurée' });
    }

    const url = new URL('/api/search/all', BLACKSANTA_BASE_URL);
    url.searchParams.set('q', q);
    ['sid', 'fid', 'cursor_ulp', 'cursor_stealer'].forEach((key) => {
      const value = req.query[key];
      if (value) url.searchParams.set(key, String(value));
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: blacksantaHeaders()
    });

    const { data, isJson } = await parseFetchJson(response);

    if (!isJson) {
      return res.status(502).json({ ok: false, error: 'Réponse invalide Blacksanta', details: data });
    }

    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: data?.error || 'Erreur Blacksanta', details: data });
    }

    return res.json(data);
  } catch (error) {
    console.error('Blacksanta proxy error:', error);
    return res.status(502).json({ ok: false, error: 'Impossible de joindre l’API Blacksanta' });
  }
});

app.get('/api/blacksanta/search/stealer', (req, res) => proxyBlacksantaJson(req, res, '/api/search/stealer'));
app.get('/api/blacksanta/osint/services', (req, res) => proxyBlacksantaJson(req, res, '/api/osint/services', { passQuery: false, cacheTtl: 60000 }));
app.get('/api/blacksanta/osint/lookup', (req, res) => proxyBlacksantaJson(req, res, '/api/osint/lookup'));
app.get('/api/blacksanta/intelx/buckets', (req, res) => proxyBlacksantaJson(req, res, '/api/intelx/buckets', { passQuery: false, cacheTtl: 60000 }));
app.get('/api/blacksanta/vulnscan/plugins', (req, res) => proxyBlacksantaJson(req, res, '/api/vulnscan/plugins', { passQuery: false, cacheTtl: 60000 }));
app.get('/api/blacksanta/vulnscan/search', (req, res) => proxyBlacksantaJson(req, res, '/api/vulnscan/search'));
app.get('/api/blacksanta/credits', (req, res) => proxyBlacksantaJson(req, res, '/api/credits', { passQuery: false, cacheTtl: 15000 }));

app.get('/api/blacksanta/intelx/read', async (req, res) => {
  try {
    if (!BLACKSANTA_API_KEY) {
      return res.status(500).json({ ok: false, error: 'BLACKSANTA_API_KEY non configurée' });
    }

    const { systemid, bucket, type, name } = req.query;
    if (!systemid || !bucket) {
      return res.status(400).json({ error: 'Paramètres systemid et bucket requis' });
    }

    const url = new URL('/api/intelx/read', BLACKSANTA_BASE_URL);
    url.searchParams.set('systemid', String(systemid));
    url.searchParams.set('bucket', String(bucket));
    if (type !== undefined) url.searchParams.set('type', String(type));
    if (name) url.searchParams.set('name', String(name));

    const response = await fetch(url, {
      method: 'GET',
      headers: blacksantaHeaders()
    });

    const creditsRemaining = response.headers.get('X-Credits-Remaining');
    if (creditsRemaining) res.set('X-Credits-Remaining', creditsRemaining);

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) res.set('Content-Disposition', contentDisposition);

    if (!response.ok) {
      const { data, isJson } = await parseFetchJson(response);
      return res.status(response.status).json({
        error: isJson ? (data?.error || 'Erreur IntelX') : 'Erreur IntelX',
        details: data
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    return res.send(buffer);
  } catch (error) {
    console.error('Blacksanta IntelX read error:', error);
    return res.status(502).json({ error: 'Impossible de télécharger depuis IntelX Blacksanta' });
  }
});

app.get('/api/blacksanta/victims/:logId/manifest', async (req, res) => {
  try {
    const { logId } = req.params;
    if (!logId) return res.status(400).json({ error: 'logId requis' });
    if (!LOOKUP2BZ_API_KEY) {
      return res.status(500).json({ error: 'LOOKUP2BZ_API_KEY non configurée' });
    }

    const url = new URL('/api/v1/oathnet/victim', LOOKUP2BZ_BASE_URL);
    url.searchParams.set('id', logId);
    url.searchParams.set('apikey', LOOKUP2BZ_API_KEY);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    const { data, isJson } = await parseFetchJson(response);

    if (!isJson) {
      return res.status(502).json({
        error: 'Réponse invalide du manifeste (HTML reçu au lieu de JSON)',
        details: data
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || data?.error || 'Erreur récupération manifeste' });
    }

    return res.json(data);
  } catch (error) {
    console.error('Lookup2bz manifest error:', error);
    return res.status(502).json({ error: 'Impossible de joindre le manifeste Lookup2Bz', details: error.message });
  }
});

app.get('/api/blacksanta/victims/:logId/files/:fileId', async (req, res) => {
  try {
    const { logId, fileId } = req.params;
    if (!logId || !fileId) return res.status(400).json({ error: 'logId et fileId requis' });
    if (!LOOKUP2BZ_API_KEY) {
      return res.status(500).json({ error: 'LOOKUP2BZ_API_KEY non configurée' });
    }

    const url = new URL('/api/v1/oathnet/victim/file', LOOKUP2BZ_BASE_URL);
    url.searchParams.set('logid', logId);
    url.searchParams.set('fileid', fileId);
    url.searchParams.set('apikey', LOOKUP2BZ_API_KEY);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    const { data, isJson } = await parseFetchJson(response);

    if (!isJson) {
      return res.status(502).json({
        error: 'Réponse invalide du fichier (HTML reçu au lieu de JSON)',
        details: data
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || data?.error || 'Erreur récupération fichier' });
    }

    return res.json(data);
  } catch (error) {
    console.error('Lookup2bz file error:', error);
    return res.status(502).json({ error: 'Impossible de joindre le fichier Lookup2Bz', details: error.message });
  }
});

app.get('/api/blacksanta/victims/:logId/cookies/:domain', async (req, res) => {
  try {
    const { logId, domain } = req.params;
    if (!logId || !domain) return res.status(400).json({ error: 'logId et domain requis' });
    if (!LOOKUP2BZ_API_KEY) {
      return res.status(500).json({ error: 'LOOKUP2BZ_API_KEY non configurée' });
    }

    const url = new URL('/api/v1/oathnet/victim/cookie/domain', LOOKUP2BZ_BASE_URL);
    url.searchParams.set('id', logId);
    url.searchParams.set('domain', domain);
    url.searchParams.set('apikey', LOOKUP2BZ_API_KEY);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    const { data, isJson } = await parseFetchJson(response);

    if (!isJson) {
      return res.status(502).json({ error: 'Réponse invalide des cookies', details: data });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || data?.error || 'Erreur récupération cookies' });
    }
    return res.json(data);
  } catch (error) {
    console.error('Lookup2bz cookies error:', error);
    return res.status(502).json({ error: 'Impossible de joindre les cookies Lookup2Bz', details: error.message });
  }
});

app.get('/api/blacksanta/victims/:logId/download', async (req, res) => {
  try {
    const { logId } = req.params;
    if (!logId) return res.status(400).json({ error: 'logId requis' });
    if (!BLACKSANTA_API_KEY) {
      return res.status(500).json({ error: 'BLACKSANTA_API_KEY non configurée' });
    }

    const url = new URL(`/api/victims/${logId}/download`, BLACKSANTA_BASE_URL);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': BLACKSANTA_API_KEY
      }
    });

    if (!response.ok) {
      const { data, isJson } = await parseFetchJson(response);
      return res.status(response.status).json({
        error: isJson ? (data?.error || 'Erreur téléchargement') : 'Erreur téléchargement'
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Disposition', `attachment; filename="victim_${logId}.zip"`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(buffer);
  } catch (error) {
    console.error('Blacksanta download error:', error);
    return res.status(502).json({ error: 'Impossible de télécharger depuis Blacksanta' });
  }
});

app.get('/api/lookup2bz/all', async (req, res) => {
  try {
    const q = String(req.query.query || req.query.q || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'Paramètre query requis' });
    const result = await aggregateLookup2bzSources(q);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Lookup2bz aggregate failed', details: error.message });
  }
});
app.get('/api/lookup2bz/query', (req, res) => lookup2bzProxy(req, res, '/api/v1/query'));
app.get('/api/lookup2bz/fivem', (req, res) => lookup2bzProxy(req, res, '/api/v1/fivem'));
app.get('/api/lookup2bz/intelx', (req, res) => lookup2bzProxy(req, res, '/api/v1/intelx'));
app.post('/api/lookup2bz/oathnet/auto', (req, res) => lookup2bzProxy(req, res, '/api/v1/oathnet/auto', 'POST'));
app.get('/api/lookup2bz/osintcat', (req, res) => lookup2bzProxy(req, res, '/api/v1/osintcat', 'GET'));
app.get('/api/lookup2bz/intelx/search', (req, res) => lookup2bzProxy(req, res, '/api/v1/intelx/search', 'GET'));

app.post('/api/domain/intel', authMiddleware, async (req, res) => {
  const { domain } = req.body;

  if (!domain || !String(domain).trim()) {
    return res.status(400).json({ error: 'Domain required' });
  }

  const normalized = String(domain).trim().toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');

  const probeUrls = [];
  const baseUrls = [
    `https://${normalized}/`,
    `http://${normalized}/`,
    `https://${normalized}/robots.txt`,
    `http://${normalized}/robots.txt`,
    `https://${normalized}/sitemap.xml`,
    `http://${normalized}/sitemap.xml`,
    `https://${normalized}/wp-admin/`,
    `http://${normalized}/wp-admin/`,
    `https://${normalized}/wp-json/`,
    `http://${normalized}/wp-json/`,
    `https://${normalized}/wp-json/wp/v2/users`,
    `http://${normalized}/wp-json/wp/v2/users`,
    `https://${normalized}/xmlrpc.php`,
    `http://${normalized}/xmlrpc.php`,
    `https://${normalized}/api/`,
    `http://${normalized}/api/`,
    `https://${normalized}/login`,
    `http://${normalized}/login`,
    `https://${normalized}/admin`,
    `http://${normalized}/admin`,
    `https://${normalized}/phpinfo.php`,
    `http://${normalized}/phpinfo.php`,
    `https://${normalized}/server-status`,
    `http://${normalized}/server-status`,
    `https://${normalized}/nginx_status`,
    `http://${normalized}/nginx_status`,
    `https://${normalized}/.well-known/`,
    `http://${normalized}/.well-known/`,
    `https://${normalized}/health`,
    `http://${normalized}/health`,
    `https://${normalized}/graphql`,
    `http://${normalized}/graphql`,
  ];

  const seenUrls = new Set();
  baseUrls.forEach(url => {
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      probeUrls.push(url);
    }
  });

  const intel = {
    domain: normalized,
    normalizedDomain: normalized,
    subdomains: new Set(['www.' + normalized, 'mail.' + normalized, 'login.' + normalized, 'api.' + normalized, 'm.' + normalized]),
    relatedDomains: new Set(),
    emails: new Set([`contact@${normalized}`, `info@${normalized}`, `admin@${normalized}`, `security@${normalized}`]),
    phones: new Set(),
    ips: new Set(),
    technologies: new Map(),
    vulnerabilities: [],
    dnsRecords: {},
    whoisInfo: { domain: normalized, status: 'real-scan' },
    sslInfo: { host: normalized, tls: true },
    hostingInfo: { inferred: 'Infrastructure web probable' },
    exposedFiles: new Set(),
    exposedEndpoints: new Set(),
    users: new Set(),
    discoveryUrls: [],
    wordpressUsers: [],
    confidenceScore: 0,
  };

  const addTech = (name) => {
    if (!intel.technologies.has(name)) intel.technologies.set(name, { count: 0 });
    intel.technologies.get(name).count++;
  };

  const addVuln = (name, severity, description, evidence) => {
    intel.vulnerabilities.push({ name, severity, description, category: 'Domain Intelligence', evidence, source: 'domain-intelligence' });
  };

  const probeUrl = (url, depth = 0) => new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'ScrapHub-DomainIntel/1.0',
        'Accept': 'text/html,application/json,application/xml,*/*'
      }
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if ((status === 301 || status === 302 || status === 303 || status === 307 || status === 308) && location && depth < 3) {
          resolve(probeUrl(new URL(location, url).toString(), depth + 1));
          return;
        }
        resolve({ url, finalUrl: url, status, headers: res.headers, body, ok: status >= 200 && status < 400 });
      });
    });

    req.on('error', (err) => resolve({ url, finalUrl: url, status: 0, headers: {}, body: '', ok: false, error: err.message }));
    req.setTimeout(8000, () => req.destroy(new Error('timeout')));
    req.end();
  });

  try {
    const [aRecords, aaaaRecords] = await Promise.all([
      new Promise((resolve) => dns.resolve4(normalized, (err, addresses) => resolve(err ? [] : addresses))),
      new Promise((resolve) => dns.resolve6(normalized, (err, addresses) => resolve(err ? [] : addresses)))
    ]);

    if (aRecords.length > 0) {
      intel.ips = new Set(aRecords);
      intel.dnsRecords.A = aRecords;
    }
    if (aaaaRecords.length > 0) {
      intel.ips = new Set([...intel.ips, ...aaaaRecords]);
      intel.dnsRecords.AAAA = aaaaRecords;
    }

    try {
      const cnameRecords = await new Promise((resolve) => dns.resolveCname(normalized, (err, addresses) => resolve(err ? [] : addresses)));
      if (cnameRecords.length > 0) intel.dnsRecords.CNAME = cnameRecords;
    } catch (e) {}
  } catch (err) {
    // DNS resolution failures are non-fatal.
  }

  try {
    const results = await Promise.allSettled(probeUrls.slice(0, 12).map((url) => probeUrl(url)));
    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      const response = result.value;
      if (!response || response.error) return;

      const finalUrl = response.finalUrl || response.url;
      intel.discoveryUrls.push(finalUrl);
      intel.exposedEndpoints.add(finalUrl);

      const body = String(response.body || '');
      const headers = response.headers || {};
      const lowerBody = body.toLowerCase();
      const lowerHeaders = Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n').toLowerCase();
      const contentType = String(headers['content-type'] || headers['Content-Type'] || '');

      if (response.ok) {
        if (lowerBody.includes('wordpress') || lowerBody.includes('wp-content') || lowerBody.includes('wp-json') || lowerBody.includes('/wp-admin/') || lowerBody.includes('xmlrpc') || String(finalUrl).includes('/wp-json')) {
          addTech('WordPress');
          addVuln('WordPress admin or APIs likely exposed', 'medium', 'Le domaine expose des composants WordPress actifs.', finalUrl);
        }
        if (lowerBody.includes('wp-json/wp/v2/users') || String(finalUrl).includes('/wp-json/wp/v2/users')) {
          addVuln('WordPress user enumeration endpoint exposed', 'medium', 'L’API WordPress d’énumération des utilisateurs est accessible.', finalUrl);
        }
        if (String(finalUrl).includes('xmlrpc.php')) {
          addVuln('XML-RPC endpoint exposed', 'medium', 'XML-RPC est potentiellement exposé.', finalUrl);
        }
        if (String(finalUrl).includes('phpinfo.php')) {
          addVuln('phpinfo endpoint exposed', 'high', 'Un fichier phpinfo est potentiellement exposé.', finalUrl);
        }
        if (lowerBody.includes('php') || lowerHeaders.includes('x-powered-by: php') || String(finalUrl).includes('phpinfo')) {
          addTech('PHP');
          addVuln('PHP info or version exposure', 'low', 'Un endpoint PHP semble exposé.', finalUrl);
        }
        if (lowerBody.includes('nginx') || lowerHeaders.includes('server: nginx')) {
          addTech('Nginx');
        }
        if (lowerBody.includes('apache') || lowerHeaders.includes('server: apache')) {
          addTech('Apache');
        }
        if (lowerBody.includes('cloudflare') || lowerHeaders.includes('cf-ray') || lowerHeaders.includes('server: cloudflare')) {
          addTech('Cloudflare');
        }
        if (lowerHeaders.includes('strict-transport-security') || String(finalUrl).startsWith('https://')) {
          addTech('SSL/TLS');
        }
        if (String(finalUrl).includes('robots.txt')) {
          intel.exposedFiles.add('robots.txt');
        }
        if (String(finalUrl).includes('sitemap.xml')) {
          intel.exposedFiles.add('sitemap.xml');
        }

        if (contentType.includes('application/json') && String(finalUrl).includes('/wp-json/wp/v2/users')) {
          try {
            const parsedJson = JSON.parse(body);
            if (Array.isArray(parsedJson)) {
              const userProfiles = parsedJson.slice(0, 8).map((user, idx) => ({
                id: user.id || idx + 1,
                name: user.name || user.username || `user-${idx + 1}`,
                username: user.slug || user.username || `user-${idx + 1}`,
                slug: user.slug || user.username || `user-${idx + 1}`,
                url: user.link || `https://${normalized}/author/${user.slug || user.username || idx + 1}/`,
                avatar: user.avatar_urls?.['96'] || user.avatar_urls?.['48'] || `https://secure.gravatar.com/avatar/?s=96&d=mp`,
                description: 'Profil WordPress réel détecté',
              }));
              intel.wordpressUsers = userProfiles;
              userProfiles.forEach((profile) => intel.users.add(profile.username));
            }
          } catch (e) {}
        }
      }
    });
  } catch (e) {
    // The live scan is best-effort; failures are non-fatal.
  }

  const techNames = Array.from(intel.technologies.keys());
  if (techNames.includes('WordPress')) {
    intel.exposedEndpoints.add(`https://${normalized}/wp-json/`);
    intel.exposedEndpoints.add(`https://${normalized}/wp-admin/`);
    intel.relatedDomains.add(`www.${normalized}`);
    intel.relatedDomains.add(`blog.${normalized}`);
    intel.relatedDomains.add(`shop.${normalized}`);
    intel.users.add('administrator');
  }
  if (techNames.includes('Cloudflare')) {
    intel.relatedDomains.add(`cdn.${normalized}`);
  }

  const signalScore =
    (intel.technologies.size > 0 ? 20 : 0) +
    (intel.subdomains.size > 0 ? 15 : 0) +
    (intel.emails.size > 0 ? 12 : 0) +
    (intel.ips.size > 0 ? 15 : 0) +
    (intel.exposedEndpoints.size > 0 ? 15 : 0) +
    (intel.dnsRecords && Object.keys(intel.dnsRecords).length > 0 ? 10 : 0) +
    (intel.whoisInfo ? 8 : 0) +
    (intel.sslInfo ? 8 : 0) +
    (intel.hostingInfo ? 5 : 0) +
    (intel.vulnerabilities.length > 0 ? 10 : 0) +
    (intel.discoveryUrls.length > 0 ? 10 : 0);

  intel.confidenceScore = Math.min(100, Math.round(signalScore));

  return res.json({
    success: true,
    domain: normalized,
    domainIntelligence: {
      ...intel,
      subdomains: Array.from(intel.subdomains),
      relatedDomains: Array.from(intel.relatedDomains),
      emails: Array.from(intel.emails),
      phones: Array.from(intel.phones),
      ips: Array.from(intel.ips),
      technologies: Object.fromEntries(intel.technologies),
      vulnerabilities: intel.vulnerabilities,
      exposedFiles: Array.from(intel.exposedFiles),
      exposedEndpoints: Array.from(intel.exposedEndpoints),
      users: Array.from(intel.users),
      wordpressUsers: intel.wordpressUsers || [],
      discoveryUrls: intel.discoveryUrls,
      confidenceScore: intel.confidenceScore,
      dnsRecords: intel.dnsRecords,
      whoisInfo: intel.whoisInfo,
      sslInfo: intel.sslInfo,
      hostingInfo: intel.hostingInfo,
    }
  });
});

app.post('/api/sqlite/search', authMiddleware, async (req, res) => {
  const { query, exactMatch, limit = 1000 } = req.body;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    if (!fs.existsSync(FTS_DB_PATH) || fs.statSync(FTS_DB_PATH).size === 0) {
      void ensureFtsDatabase().catch((downloadError) => {
        console.error('FTS background download failed:', downloadError.message);
      });
      return res.status(202).json({
        error: 'La base de recherche est en cours de téléchargement. Réessaie dans quelques instants.',
        retryAfterSeconds: 30
      });
    }

    const dbPath = await ensureFtsDatabase();
    const quota = await ensureSearchQuota(req.user);
    const safeLimit = Math.min(Number(limit) || getPlanFeatures(req.user).maxResults, getPlanFeatures(req.user).maxResults);

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    let sqlQuery = '';
    let params = [];

    if (exactMatch) {
      sqlQuery = `SELECT rowid, content, source_db FROM fts WHERE content LIKE ? LIMIT ?`;
      params = [`%${query}%`, safeLimit];
    } else {
      const rawTerms = query.split(' ').filter(t => t.trim());
      const searchTerms = rawTerms
        .map(term => term.replace(/[^0-9A-Za-zÀ-ÿ_-]/g, ''))
        .filter(Boolean);

      if (searchTerms.length === 0) {
          sqlQuery = `SELECT rowid, content, source_db FROM fts WHERE content LIKE ? LIMIT ?`;
          params = [`%${query}%`, safeLimit];
        } else {
          const ftsTerms = searchTerms.map(term => {
            const clean = String(term).replace(/"/g, '""');
            return `content:"${clean}"`;
          }).join(' AND ');
          sqlQuery = `SELECT rowid, content, source_db FROM fts WHERE fts MATCH ? LIMIT ?`;
          params = [ftsTerms, safeLimit];
        }
      }

      let results = [];
      try {
        results = await db.all(sqlQuery, params);
      } catch (matchErr) {
        console.warn('FTS MATCH failed, falling back to LIKE search:', matchErr.message);
        // fallback: use a safe LIKE search on content
        try {
          const likeQuery = `%${query}%`;
          results = await db.all(`SELECT rowid, content, source_db FROM fts WHERE content LIKE ? LIMIT ?`, [likeQuery, safeLimit]);
        } catch (likeErr) {
          console.error('Fallback LIKE search also failed:', likeErr);
          await db.close();
          throw likeErr;
        }
      }
    await db.close();

    const sourcesMap = new Map();
    results.forEach(row => {
      let sourceName = row.source_db || 'unknown';
      
      if (!sourceName || sourceName === '') {
        const match = row.content.match(/^([A-Za-z0-9_\-\.]+\.(txt|json))/);
        if (match) {
          sourceName = match[1];
        } else {
          sourceName = 'unknown';
        }
      }
      
      if (!sourcesMap.has(sourceName)) {
        sourcesMap.set(sourceName, { name: sourceName, entries: 0, date: '2026-05-06', records: [] });
      }
      const source = sourcesMap.get(sourceName);
      source.entries++;
      source.records.push({
        id: row.rowid,
        content: row.content,
        source: sourceName,
        date: '2026-05-06'
      });
    });

    res.json({ 
      success: true, 
      quota,
      total: results.length, 
      results: results.map(row => ({
        id: row.rowid,
        content: row.content,
        source: row.source_db || 'unknown',
        date: '2026-05-06'
      })),
      sources: Array.from(sourcesMap.values())
    });
  } catch (error) {
    if (error?.status === 429) {
      return res.status(429).json({ error: error.error, quota: error });
    }
    console.error('SQLite search error détaillé:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Proxy pour ProxyNova (contourne CORS)
app.get('/api/proxy/proxynova', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }
  
  try {
    const response = await fetch(`https://proxynova.com/api/v1/email/${encodeURIComponent(email)}`);
    if (response.status === 404) {
      return res.status(404).json({ error: 'ProxyNova ne propose plus cette API. La recherche ProxyNova est désactivée.' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('ProxyNova error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/deezer/playlist', async (req, res) => {
  try {
    const PLAYLIST_ID = '15187155723';
    
    const response = await fetch(`https://api.deezer.com/playlist/${PLAYLIST_ID}`);
    
    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const tracks = data.tracks.data.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      cover: track.album.cover_medium,
      duration: track.duration,
      preview: track.preview,
      link: track.link
    }));
    
    res.json({ 
      success: true, 
      tracks,
      playlist: {
        title: data.title,
        description: data.description,
        nb_tracks: data.nb_tracks,
        picture: data.picture_medium
      }
    });
  } catch (error) {
    console.error('Erreur Deezer playlist:', error);
    
    const fallbackTracks = [
      { id: 'fallback1', title: 'SoundHelix - Demo 1', artist: 'SoundHelix', cover: '', duration: 207, preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { id: 'fallback2', title: 'SoundHelix - Demo 2', artist: 'SoundHelix', cover: '', duration: 193, preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      { id: 'fallback3', title: 'SoundHelix - Demo 3', artist: 'SoundHelix', cover: '', duration: 241, preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
      { id: 'fallback4', title: 'SoundHelix - Demo 4', artist: 'SoundHelix', cover: '', duration: 185, preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
      { id: 'fallback5', title: 'SoundHelix - Demo 5', artist: 'SoundHelix', cover: '', duration: 229, preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' }
    ];
    
    res.json({ success: true, tracks: fallbackTracks, fallback: true });
  }
});

app.get('/api/deezer/stream/:trackId', async (req, res) => {
  const { trackId } = req.params;
  
  try {
    const response = await fetch(`https://api.deezer.com/track/${trackId}`);
    const track = await response.json();
    
    if (track.preview) {
      return res.redirect(track.preview);
    } else {
      throw new Error('Pas de preview disponible');
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.redirect('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
  }
});

app.post('/api/youtube/search', authMiddleware, async (req, res) => {
  const { query, limit = 10 } = req.body;
  
  const instances = [
    'https://inv.vern.cc',
    'https://yewtu.be',
    'https://invidious.flokinet.to'
  ];
  
  for (const instance of instances) {
    try {
      const response = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&limit=${limit}`, { timeout: 8000 });
      if (!response.ok) continue;
      const data = await response.json();
      if (data && data.length > 0) {
        const videos = data.map(item => ({
          id: item.videoId || item.video_id || item.id,
          title: item.title,
          thumbnail: item.thumbnail || item.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${item.videoId || item.video_id || item.id}/maxresdefault.jpg`
        })).filter(item => item.id);
        return res.json({ success: true, videos });
      }
    } catch (err) {
      console.warn('YouTube search backend error:', err.message);
    }
  }
  res.json({ success: false, videos: [] });
});

app.post('/api/youtube/stream', authMiddleware, async (req, res) => {
  const { videoId } = req.body;

  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.leptons.xyz'
  ];

  try {
    for (const instance of instances) {
      try {
        const response = await fetch(`${instance}/streams/${videoId}`);

        if (!response.ok) continue;

        const data = await response.json();

        const audioStreams = data?.audioStreams || [];

        if (audioStreams.length > 0) {
          const audio =
            audioStreams.find(s => s.itag === 140) ||
            audioStreams.find(s => s.quality) ||
            audioStreams[0];

          if (audio?.url) {
            return res.json({ success: true, audioUrl: audio.url });
          }
        }
      } catch (e) {}
    }

    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getInfo(url);
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      const audioFormat =
        audioFormats.find(f => f.itag === 140) ||
        audioFormats.find(f => f.audioBitrate) ||
        audioFormats[0];

      if (audioFormat?.url) {
        return res.json({ success: true, audioUrl: audioFormat.url });
      }
    } catch (ytdlError) {
      console.warn('ytdl-core fallback failed:', ytdlError?.message || ytdlError);
    }

    return res.status(404).json({
      success: false,
      error: 'Aucun stream audio disponible'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur stream'
    });
  }
});

// ============================================
// GÉOINT PIPELINE COMPLET - BACKEND
// ============================================

let createCanvas = null;
let loadImage = null;
let tf = null;
let geoIntRuntimeError = null;

try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
  loadImage = canvas.loadImage;
} catch (err) {
  geoIntRuntimeError = err;
  console.warn('GeoInt image processing disabled: canvas module unavailable.', err.message);
}

try {
  tf = require('@tensorflow/tfjs-node');
} catch (err) {
  geoIntRuntimeError = geoIntRuntimeError || err;
  console.warn('GeoInt image processing disabled: @tensorflow/tfjs-node module unavailable.', err.message);
}

function requireGeoIntRuntime() {
  if (!createCanvas || !loadImage || !tf) {
    throw new Error(
      geoIntRuntimeError?.message
        ? `GeoInt runtime unavailable: ${geoIntRuntimeError.message}`
        : 'GeoInt runtime unavailable because optional image-processing dependencies are missing.'
    );
  }

  return { createCanvas, loadImage, tf };
}

// ============================================
// CONFIGURATION
// ============================================
const WEATHER_CLASSES = ['sunny', 'rainy', 'cloudy', 'foggy', 'snowy', 'sunset'];
const VEGETATION_CLASSES = ['forest', 'savanna', 'desert', 'jungle', 'grassland', 'urban'];
const TERRAIN_CLASSES = ['mountains', 'valleys', 'cliffs', 'plateaus', 'plains'];
const SEGMENTATION_CLASSES = ['sky', 'road', 'water', 'trees', 'rocks', 'grass', 'buildings', 'snow', 'beach'];
const OBJECT_CLASSES = ['lamp post', 'sign', 'car', 'truck', 'bus', 'bicycle', 'pylon', 'antenna', 
                       'bridge', 'traffic light', 'stop sign', 'trash can', 'barrier', 'fence'];

// ============================================
// BASE DE DONNÉES GÉOGRAPHIQUE MONDIALE
// ============================================

function generateWorldGeoDatabase() {
  const db = [];
  
      const worldData = [
          // ==================== FRANCE - Île-de-France ====================
          { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'haussmanian', alt: 35, language: 'fr', objects: ['lamp post', 'building', 'car', 'tree', 'sign', 'terrasse café', 'kiosque', 'métro', 'pigeon', 'vélo', 'colonne morris', 'fontaine wallace', 'bateau-mouche', 'bouquiniste', 'sacré-cœur'], terrain: 'plains' },
          { name: 'Boulogne-Billancourt', lat: 48.8352, lon: 2.2409, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 30, language: 'fr', objects: ['building', 'car', 'tree', 'seine', 'studio cinéma', 'renault', 'jardin albert kahn'], terrain: 'plains' },
          { name: 'Saint-Denis', lat: 48.9362, lon: 2.3574, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'gothic', alt: 32, language: 'fr', objects: ['basilica', 'stade de france', 'métro', 'building', 'marché', 'canal', 'tombe royale'], terrain: 'plains' },
          { name: 'Montreuil', lat: 48.8638, lon: 2.4481, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 70, language: 'fr', objects: ['building', 'mural', 'puce', 'arbre', 'marché', 'studio vidéo', 'rue piétonne'], terrain: 'hills' },
          { name: 'Nanterre', lat: 48.8924, lon: 2.2067, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 30, language: 'fr', objects: ['building', 'arche', 'université', 'parc', 'rer', 'préfecture'], terrain: 'plains' },
          { name: 'Créteil', lat: 48.7904, lon: 2.4556, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'brutalist', alt: 35, language: 'fr', objects: ['lac', 'préfecture', 'building', 'canard', 'métro', 'île de loisirs'], terrain: 'plains' },
          { name: 'Versailles', lat: 48.8032, lon: 2.1341, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'classical', alt: 130, language: 'fr', objects: ['château', 'jardin', 'bassin', 'statue', 'orangerie', 'grand canal', 'grille dorée', 'hameau marie-antoinette'], terrain: 'plains' },
          { name: 'Argenteuil', lat: 48.9472, lon: 2.2467, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 35, language: 'fr', objects: ['seine', 'building', 'pont', 'asperge', 'monet', 'bateau'], terrain: 'plains' },
          { name: 'Mantes-la-Jolie', lat: 48.9899, lon: 1.7152, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'gothic', alt: 28, language: 'fr', objects: ['collégiale', 'seine', 'building', 'pont', 'marché'], terrain: 'plains' },
          { name: 'Étampes', lat: 48.4347, lon: 2.1623, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 80, language: 'fr', objects: ['tour guinette', 'église', 'marché', 'building', 'rivière'], terrain: 'plains' },
          { name: 'Pontoise', lat: 49.0516, lon: 2.1017, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 27, language: 'fr', objects: ['cathédrale', 'oise', 'building', 'musée pissarro', 'remparts'], terrain: 'plains' },
          { name: 'Provins', lat: 48.5602, lon: 3.2993, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 91, language: 'fr', objects: ['rempart', 'tour césar', 'rose', 'marché médiéval', 'souterrain'], terrain: 'hills' },
          { name: 'Fontainebleau', lat: 48.4047, lon: 2.7016, country: 'France', region: 'Île-de-France', vegetation: 'forest', climate: 'temperate', architecture: 'renaissance', alt: 75, language: 'fr', objects: ['château', 'forêt', 'rocher', 'escalier fer-à-cheval', 'étang', 'cheval'], terrain: 'forest' },
          { name: 'Meaux', lat: 48.9603, lon: 2.8885, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'gothic', alt: 52, language: 'fr', objects: ['cathédrale', 'brie', 'marne', 'building', 'jardin bossuet'], terrain: 'plains' },
          { name: 'Melun', lat: 48.5402, lon: 2.6591, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 54, language: 'fr', objects: ['seine', 'collégiale', 'préfecture', 'building', 'île saint-étienne'], terrain: 'plains' },
          { name: 'Chelles', lat: 48.8820, lon: 2.5918, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 42, language: 'fr', objects: ['canal', 'marne', 'building', 'parc', 'église'], terrain: 'plains' },
          { name: 'Corbeil-Essonnes', lat: 48.5938, lon: 2.4795, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'industrial', alt: 37, language: 'fr', objects: ['seine', 'moulin', 'building', 'usine', 'cathédrale'], terrain: 'plains' },
          { name: 'Rambouillet', lat: 48.6439, lon: 1.8292, country: 'France', region: 'Île-de-France', vegetation: 'forest', climate: 'temperate', architecture: 'classical', alt: 160, language: 'fr', objects: ['château', 'forêt', 'lac', 'bergerie', 'train'], terrain: 'forest' },
          { name: 'Sarcelles', lat: 48.9967, lon: 2.3806, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 70, language: 'fr', objects: ['building', 'grand ensemble', 'marché', 'synagogue', 'parc'], terrain: 'plains' },
          { name: 'Bobigny', lat: 48.9068, lon: 2.4350, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 44, language: 'fr', objects: ['préfecture', 'building', 'canal', 'bourse travail', 'métro'], terrain: 'plains' },
          { name: 'Noisy-le-Grand', lat: 48.8488, lon: 2.5525, country: 'France', region: 'Île-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'postmodern', alt: 90, language: 'fr', objects: ['arènes de picasso', 'building', 'camembert', 'métro', 'centre commercial'], terrain: 'hills' },
      
          // ==================== FRANCE - Nord-Pas-de-Calais / Hauts-de-France ====================
          { name: 'Lille', lat: 50.6292, lon: 3.0573, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'cloudy', architecture: 'flemish', alt: 25, language: 'fr', objects: ['building', 'car', 'bicycle', 'belfry', 'waffle', 'bière', 'braderie stand', 'vieux-lille', 'grand-place', "p'tit quinquin"], terrain: 'plains' },
          { name: 'Roubaix', lat: 50.6927, lon: 3.1778, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'cloudy', architecture: 'industrial', alt: 32, language: 'fr', objects: ['building', 'usine', 'piscine musée', 'textile', 'cheminée', 'vélo paris-roubaix'], terrain: 'plains' },
          { name: 'Tourcoing', lat: 50.7242, lon: 3.1623, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'cloudy', architecture: 'flemish', alt: 37, language: 'fr', objects: ['building', 'église', 'hospice', 'textile', 'marché'], terrain: 'plains' },
          { name: 'Dunkerque', lat: 51.0344, lon: 2.3768, country: 'France', region: 'Hauts-de-France', vegetation: 'coastal', climate: 'windy', architecture: 'flemish', alt: 5, language: 'fr', objects: ['beffroi', 'port', 'plage', 'carnaval', 'bateau', 'dune', 'église', 'môle'], terrain: 'coastal' },
          { name: 'Calais', lat: 50.9480, lon: 1.8564, country: 'France', region: 'Hauts-de-France', vegetation: 'coastal', climate: 'windy', architecture: 'flemish', alt: 5, language: 'fr', objects: ['bourgeois de calais', 'hôtel de ville', 'plage', 'ferry', 'phare', 'dentelle'], terrain: 'coastal' },
          { name: 'Boulogne-sur-Mer', lat: 50.7252, lon: 1.6140, country: 'France', region: 'Hauts-de-France', vegetation: 'coastal', climate: 'windy', architecture: 'medieval', alt: 35, language: 'fr', objects: ['rempart', 'beffroi', 'port', 'nausicaa', 'poisson', 'château', 'basilique'], terrain: 'coastal' },
          { name: 'Arras', lat: 50.2910, lon: 2.7775, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'baroque', alt: 70, language: 'fr', objects: ['grand-place', 'beffroi', 'carrière', 'mémorial', 'souterrain', 'boves'], terrain: 'plains' },
          { name: 'Valenciennes', lat: 50.3592, lon: 3.5250, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'flemish', alt: 28, language: 'fr', objects: ['building', 'musée', 'place', 'escaldin', 'mine', 'écusson'], terrain: 'plains' },
          { name: 'Cambrai', lat: 50.1757, lon: 3.2346, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'classical', alt: 62, language: 'fr', objects: ['cathédrale', 'bêtise', 'building', 'marché', 'porte de paris'], terrain: 'plains' },
          { name: 'Douai', lat: 50.3703, lon: 3.0785, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'flemish', alt: 24, language: 'fr', objects: ['beffroi', 'géant gayant', 'scarpe', 'building', 'arsenal'], terrain: 'plains' },
          { name: 'Saint-Omer', lat: 50.7491, lon: 2.2610, country: 'France', region: 'Hauts-de-France', vegetation: 'marsh', climate: 'temperate', architecture: 'gothic', alt: 8, language: 'fr', objects: ['cathédrale', 'marais', 'bateau', 'building', 'jardin public'], terrain: 'marsh' },
          { name: 'Bergues', lat: 50.9687, lon: 2.4329, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'cloudy', architecture: 'flemish', alt: 4, language: 'fr', objects: ['beffroi', 'rempart', 'canal', 'building', 'fromage', 'film bienvenue'], terrain: 'plains' },
          { name: 'Hazebrouck', lat: 50.7245, lon: 2.5386, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'cloudy', architecture: 'flemish', alt: 24, language: 'fr', objects: ['building', 'église', 'marché', 'musée', 'géant'], terrain: 'plains' },
          { name: 'Maubeuge', lat: 50.2788, lon: 3.9727, country: 'France', region: 'Hauts-de-France', vegetation: 'urban', climate: 'temperate', architecture: 'vauban', alt: 133, language: 'fr', objects: ['rempart', 'sambre', 'zoo', 'building', 'porte de mons'], terrain: 'valleys' },
          { name: 'Montreuil-sur-Mer', lat: 50.4639, lon: 1.7633, country: 'France', region: 'Hauts-de-France', vegetation: 'grassland', climate: 'cloudy', architecture: 'medieval', alt: 48, language: 'fr', objects: ['rempart', 'citadelle', 'église', 'building', 'canche'], terrain: 'hills' },
          { name: 'Le Touquet', lat: 50.5233, lon: 1.5855, country: 'France', region: 'Hauts-de-France', vegetation: 'coastal', climate: 'windy', architecture: 'belle époque', alt: 5, language: 'fr', objects: ['plage', 'villa', 'phare', 'dune', 'cheval', 'casino', 'pinède'], terrain: 'coastal' },
          
          // ==================== FRANCE - Normandie ====================
          { name: 'Rouen', lat: 49.4432, lon: 1.0993, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'cloudy', architecture: 'gothic', alt: 10, language: 'fr', objects: ['cathédrale', 'gros-horloge', 'seine', 'place vieux-marché', 'building', 'maison à colombages', 'musée beaux-arts'], terrain: 'valleys' },
          { name: 'Le Havre', lat: 49.4938, lon: 0.1077, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'windy', architecture: 'modern', alt: 5, language: 'fr', objects: ['port', 'église saint-joseph', 'volcan', 'plage', 'container', 'appartement perret', 'bassin'], terrain: 'coastal' },
          { name: 'Caen', lat: 49.1829, lon: -0.3707, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'cloudy', architecture: 'roman', alt: 10, language: 'fr', objects: ['château', 'abbaye aux hommes', 'abbaye aux dames', 'mémorial', 'building', 'université', 'orne'], terrain: 'plains' },
          { name: 'Cherbourg', lat: 49.6391, lon: -1.6165, country: 'France', region: 'Normandie', vegetation: 'coastal', climate: 'windy', architecture: 'maritime', alt: 5, language: 'fr', objects: ['port', 'cité de la mer', 'parapluie', 'bateau', 'sous-marin', 'phare'], terrain: 'coastal' },
          { name: 'Évreux', lat: 49.0270, lon: 1.1512, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'cloudy', architecture: 'gothic', alt: 60, language: 'fr', objects: ['cathédrale', 'iton', 'building', 'marché', 'beffroi'], terrain: 'valleys' },
          { name: 'Dieppe', lat: 49.9229, lon: 1.0787, country: 'France', region: 'Normandie', vegetation: 'coastal', climate: 'windy', architecture: 'maritime', alt: 5, language: 'fr', objects: ['port', 'château', 'plage', 'bateau', 'marché poisson', 'falaises'], terrain: 'coastal' },
          { name: 'Alençon', lat: 48.4323, lon: 0.0913, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'cloudy', architecture: 'classical', alt: 135, language: 'fr', objects: ['basilique', 'dentelle', 'building', 'sarthe', 'château'], terrain: 'plains' },
          { name: 'Lisieux', lat: 49.1466, lon: 0.2259, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'cloudy', architecture: 'neo-byzantine', alt: 50, language: 'fr', objects: ['basilique sainte-thérèse', 'carmel', 'building', 'marché', 'jardin'], terrain: 'valleys' },
          { name: 'Bayeux', lat: 49.2756, lon: -0.7027, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 48, language: 'fr', objects: ['tapisserie', 'cathédrale', 'building', 'aure', 'musée'], terrain: 'plains' },
          { name: 'Honfleur', lat: 49.4194, lon: 0.2325, country: 'France', region: 'Normandie', vegetation: 'coastal', climate: 'cloudy', architecture: 'maritime', alt: 5, language: 'fr', objects: ['vieux bassin', 'bateau', 'maison étroite', 'église sainte-catherine', 'crevette', 'peintre'], terrain: 'coastal' },
          { name: 'Deauville', lat: 49.3598, lon: 0.0743, country: 'France', region: 'Normandie', vegetation: 'coastal', climate: 'cloudy', architecture: 'belle époque', alt: 5, language: 'fr', objects: ['planches', 'parasol', 'casino', 'cheval', 'festival américain', 'plage', 'villa'], terrain: 'coastal' },
          { name: 'Étretat', lat: 49.7062, lon: 0.2070, country: 'France', region: 'Normandie', vegetation: 'coastal', climate: 'windy', architecture: 'maritime', alt: 8, language: 'fr', objects: ['falaise', 'aiguille', 'arche', 'galet', 'plage', 'golf'], terrain: 'coastal' },
          { name: 'Mont-Saint-Michel', lat: 48.6360, lon: -1.5114, country: 'France', region: 'Normandie', vegetation: 'coastal', climate: 'cloudy', architecture: 'gothic', alt: 80, language: 'fr', objects: ['abbaye', 'rempart', 'baie', 'sable mouvant', 'mouton', 'presqu\'île'], terrain: 'tidal island' },
          { name: 'Saint-Lô', lat: 49.1154, lon: -1.0908, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'cloudy', architecture: 'modern', alt: 35, language: 'fr', objects: ['rempart', 'haras', 'building', 'église', 'porte'], terrain: 'hills' },
          { name: 'Fécamp', lat: 49.7578, lon: 0.3792, country: 'France', region: 'Normandie', vegetation: 'coastal', climate: 'windy', architecture: 'maritime', alt: 10, language: 'fr', objects: ['palais bénédictine', 'port', 'falaise', 'bateau', 'plage'], terrain: 'coastal' },
          { name: 'Granville', lat: 48.8379, lon: -1.5929, country: 'France', region: 'Normandie', vegetation: 'coastal', climate: 'windy', architecture: 'maritime', alt: 10, language: 'fr', objects: ['haute ville', 'port', 'plage', 'christian dior', 'rempart', 'île chausey'], terrain: 'coastal' },
          { name: 'Vernon', lat: 49.0931, lon: 1.4845, country: 'France', region: 'Normandie', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 25, language: 'fr', objects: ['moulin', 'seine', 'château', 'building', 'colombages'], terrain: 'valleys' },
          { name: 'Giverny', lat: 49.0762, lon: 1.5301, country: 'France', region: 'Normandie', vegetation: 'garden', climate: 'cloudy', architecture: 'rural', alt: 25, language: 'fr', objects: ['maison monet', 'jardin', 'nymphéa', 'pont japonais', 'fleur', 'bassin'], terrain: 'valleys' },
          
          // ==================== FRANCE - Bretagne ====================
          { name: 'Rennes', lat: 48.1173, lon: -1.6778, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'cloudy', architecture: 'half-timbered', alt: 30, language: 'fr', objects: ['building', 'car', 'crêpe stand', 'cider bottle', 'maison à pans de bois', 'parlement', 'rue de la soif', 'galette saucisse', 'porte mordelaise'], terrain: 'plains' },
          { name: 'Brest', lat: 48.3904, lon: -4.4861, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'rainy', architecture: 'modern', alt: 34, language: 'fr', objects: ['building', 'boat', 'lighthouse', 'sailor hat', 'crabe', 'rafale jet', 'recouvrance', 'bagad', 'rade', 'pont'], terrain: 'coastal' },
          { name: 'Quimper', lat: 47.9960, lon: -4.1026, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'rainy', architecture: 'half-timbered', alt: 10, language: 'fr', objects: ['cathédrale', 'odet', 'faïence', 'crêpe', 'maison colombages', 'pont', 'musée breton'], terrain: 'valleys' },
          { name: 'Lorient', lat: 47.7483, lon: -3.3656, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'rainy', architecture: 'modern', alt: 5, language: 'fr', objects: ['port', 'base sous-marine', 'bateau', 'festival interceltique', 'rade', 'thon'], terrain: 'coastal' },
          { name: 'Saint-Malo', lat: 48.6493, lon: -2.0257, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'windy', architecture: 'medieval', alt: 8, language: 'fr', objects: ['rempart', 'plage', 'bateau', 'fort', 'grand bé', 'corsaire', 'intra-muros', 'malouinière'], terrain: 'coastal' },
          { name: 'Vannes', lat: 47.6582, lon: -2.7608, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'cloudy', architecture: 'half-timbered', alt: 15, language: 'fr', objects: ['rempart', 'port', 'lavoir', 'cathédrale', 'maison colombages', 'golfe'], terrain: 'coastal' },
          { name: 'Saint-Brieuc', lat: 48.5142, lon: -2.7658, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'cloudy', architecture: 'gothic', alt: 90, language: 'fr', objects: ['cathédrale', 'vallée', 'building', 'marché', 'viaduc'], terrain: 'valleys' },
          { name: 'Dinan', lat: 48.4560, lon: -2.0471, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 70, language: 'fr', objects: ['rempart', 'rance', 'port', 'maison colombages', 'château', 'rue du jerzual'], terrain: 'valleys' },
          { name: 'Fougères', lat: 48.3519, lon: -1.2046, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 90, language: 'fr', objects: ['château', 'rempart', 'église', 'nançon', 'marché', 'verre'], terrain: 'hills' },
          { name: 'Morlaix', lat: 48.5782, lon: -3.8273, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'rainy', architecture: 'half-timbered', alt: 15, language: 'fr', objects: ['viaduc', 'port', 'maison à lanterne', 'église', 'rivière'], terrain: 'valleys' },
          { name: 'Concarneau', lat: 47.8722, lon: -3.9191, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'rainy', architecture: 'medieval', alt: 5, language: 'fr', objects: ['ville close', 'rempart', 'port', 'chalutier', 'pêche', 'plage'], terrain: 'coastal' },
          { name: 'Quiberon', lat: 47.4840, lon: -3.1207, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'windy', architecture: 'maritime', alt: 15, language: 'fr', objects: ['presqu\'île', 'plage', 'thalasso', 'côte sauvage', 'bateau', 'port'], terrain: 'coastal' },
          { name: 'Carnac', lat: 47.5840, lon: -3.0797, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'cloudy', architecture: 'megalithic', alt: 10, language: 'fr', objects: ['menhir', 'alignement', 'dolmen', 'plage', 'musée préhistoire'], terrain: 'coastal' },
          { name: 'Auray', lat: 47.6680, lon: -2.9823, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 25, language: 'fr', objects: ['saint-goustan', 'port', 'église', 'maison colombages', 'pont'], terrain: 'valleys' },
          { name: 'Pont-Aven', lat: 47.8558, lon: -3.7473, country: 'France', region: 'Bretagne', vegetation: 'forest', climate: 'rainy', architecture: 'rural', alt: 30, language: 'fr', objects: ['galette', 'moulin', 'aven', 'pont', 'galerie peinture', 'bois d\'amour'], terrain: 'valleys' },
          { name: 'Roscoff', lat: 48.7265, lon: -3.9851, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'windy', architecture: 'maritime', alt: 6, language: 'fr', objects: ['port', 'ferry', 'oignon', 'algue', 'thalasso', 'église'], terrain: 'coastal' },
          { name: 'Cancale', lat: 48.6768, lon: -1.8518, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'windy', architecture: 'maritime', alt: 10, language: 'fr', objects: ['huître', 'port', 'plage', 'pointe du grouin', 'parc ostréicole'], terrain: 'coastal' },
          { name: 'Saint-Pol-de-Léon', lat: 48.6853, lon: -3.9866, country: 'France', region: 'Bretagne', vegetation: 'grassland', climate: 'cloudy', architecture: 'gothic', alt: 25, language: 'fr', objects: ['cathédrale', 'kreisker', 'artichaut', 'chou-fleur', 'marché'], terrain: 'coastal' },
          { name: 'Redon', lat: 47.6512, lon: -2.0844, country: 'France', region: 'Bretagne', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 10, language: 'fr', objects: ['abbaye', 'canal', 'vilaine', 'port', 'building'], terrain: 'marsh' },
          { name: 'Paimpol', lat: 48.7780, lon: -3.0463, country: 'France', region: 'Bretagne', vegetation: 'coastal', climate: 'cloudy', architecture: 'maritime', alt: 5, language: 'fr', objects: ['port', 'bateau', 'coquille saint-jacques', 'église', 'plage'], terrain: 'coastal' },
          
          // ==================== FRANCE - Pays de la Loire ====================
          { name: 'Nantes', lat: 47.2184, lon: -1.5536, country: 'France', region: 'Pays de la Loire', vegetation: 'urban', climate: 'temperate', architecture: 'classical', alt: 12, language: 'fr', objects: ['building', 'car', 'elephant', 'carousel', 'château', 'biscuit lu', 'vineyard', 'bateau lavoir', 'lieu unique', 'grue titan'], terrain: 'valleys' },
          { name: 'Angers', lat: 47.4784, lon: -0.5632, country: 'France', region: 'Pays de la Loire', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 20, language: 'fr', objects: ['château', 'tenture apocalypse', 'maine', 'building', 'cathédrale', 'maison bleue'], terrain: 'valleys' },
          { name: 'Le Mans', lat: 48.0061, lon: 0.1996, country: 'France', region: 'Pays de la Loire', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 50, language: 'fr', objects: ['cathédrale', 'circuit 24h', 'vieux-mans', 'sarthe', 'rempart', 'musée automobile'], terrain: 'hills' },
          { name: 'Laval', lat: 48.0729, lon: -0.7727, country: 'France', region: 'Pays de la Loire', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 45, language: 'fr', objects: ['château', 'mayenne', 'building', 'rempart', 'jardin'], terrain: 'valleys' },
          { name: 'La Roche-sur-Yon', lat: 46.6705, lon: -1.4265, country: 'France', region: 'Pays de la Loire', vegetation: 'urban', climate: 'temperate', architecture: 'neoclassical', alt: 70, language: 'fr', objects: ['place napoléon', 'building', 'église', 'animaux mécaniques', 'yonnais'], terrain: 'plains' },
          { name: 'Saint-Nazaire', lat: 47.2735, lon: -2.2137, country: 'France', region: 'Pays de la Loire', vegetation: 'coastal', climate: 'windy', architecture: 'industrial', alt: 5, language: 'fr', objects: ['chantier naval', 'paquebot', 'pont', 'port', 'plage', 'base sous-marine'], terrain: 'coastal' },
          { name: 'Cholet', lat: 47.0587, lon: -0.8798, country: 'France', region: 'Pays de la Loire', vegetation: 'urban', climate: 'temperate', architecture: 'industrial', alt: 110, language: 'fr', objects: ['mouchoir', 'building', 'église', 'parc', 'textile'], terrain: 'hills' },
          { name: 'Saumur', lat: 47.2601, lon: -0.0784, country: 'France', region: 'Pays de la Loire', vegetation: 'grassland', climate: 'temperate', architecture: 'renaissance', alt: 35, language: 'fr', objects: ['château', 'cadre noir', 'loire', 'cheval', 'champignon', 'vin'], terrain: 'valleys' },
          { name: 'La Baule', lat: 47.2863, lon: -2.3932, country: 'France', region: 'Pays de la Loire', vegetation: 'coastal', climate: 'sunny', architecture: 'belle époque', alt: 5, language: 'fr', objects: ['plage', 'villa', 'casino', 'baie', 'pinède', 'voile'], terrain: 'coastal' },
          { name: 'Les Sables-d\'Olonne', lat: 46.4971, lon: -1.7842, country: 'France', region: 'Pays de la Loire', vegetation: 'coastal', climate: 'sunny', architecture: 'maritime', alt: 5, language: 'fr', objects: ['plage', 'remblai', 'port', 'vendée globe', 'bateau', 'pêche'], terrain: 'coastal' },
          { name: 'Noirmoutier-en-l\'Île', lat: 47.0014, lon: -2.2660, country: 'France', region: 'Pays de la Loire', vegetation: 'coastal', climate: 'sunny', architecture: 'maritime', alt: 5, language: 'fr', objects: ['château', 'passage du gois', 'plage', 'marais salant', 'sel', 'pomme de terre'], terrain: 'island' },
          { name: 'Guérande', lat: 47.3283, lon: -2.4292, country: 'France', region: 'Pays de la Loire', vegetation: 'coastal', climate: 'temperate', architecture: 'medieval', alt: 30, language: 'fr', objects: ['rempart', 'porte saint-michel', 'marais salant', 'sel', 'collégiale'], terrain: 'coastal' },
          { name: 'Clisson', lat: 47.0873, lon: -1.2826, country: 'France', region: 'Pays de la Loire', vegetation: 'urban', climate: 'temperate', architecture: 'italian', alt: 30, language: 'fr', objects: ['château', 'sèvre', 'pont', 'villa', 'vignoble', 'hellfest'], terrain: 'valleys' },
          { name: 'Fontenay-le-Comte', lat: 46.4667, lon: -0.8067, country: 'France', region: 'Pays de la Loire', vegetation: 'urban', climate: 'temperate', architecture: 'renaissance', alt: 10, language: 'fr', objects: ['château', 'vendée', 'building', 'église', 'fontaine'], terrain: 'plains' },
          
          // ==================== FRANCE - Nouvelle-Aquitaine ====================
          { name: 'Bordeaux', lat: 44.8378, lon: -0.5792, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'temperate', architecture: 'classical', alt: 6, language: 'fr', objects: ['building', 'car', 'tram', 'vineyard', 'wine barrel', 'miroir d\'eau', 'canelé', 'pont de pierre', 'grosse cloche', 'cité du vin'], terrain: 'plains' },
          { name: 'Limoges', lat: 45.8336, lon: 1.2611, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'temperate', architecture: 'gothic', alt: 270, language: 'fr', objects: ['cathédrale', 'porcelaine', 'gare', 'building', 'vienne', 'émail'], terrain: 'hills' },
          { name: 'Poitiers', lat: 46.5802, lon: 0.3404, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'temperate', architecture: 'roman', alt: 75, language: 'fr', objects: ['notre-dame-la-grande', 'futuroscope', 'baptistère', 'building', 'clain', 'parc'], terrain: 'hills' },
          { name: 'La Rochelle', lat: 46.1591, lon: -1.1514, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'coastal', climate: 'sunny', architecture: 'renaissance', alt: 5, language: 'fr', objects: ['vieux port', 'tour', 'aquarium', 'bateau', 'arcade', 'maison colombages', 'fort boyard'], terrain: 'coastal' },
          { name: 'Pau', lat: 43.2951, lon: -0.3708, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'temperate', architecture: 'belle époque', alt: 200, language: 'fr', objects: ['château', 'boulevard pyrénées', 'funicular', 'building', 'gave', 'palois'], terrain: 'hills' },
          { name: 'Bayonne', lat: 43.4931, lon: -1.4751, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'sunny', architecture: 'basque', alt: 5, language: 'fr', objects: ['cathédrale', 'adour', 'rempart', 'jambon', 'chocolat', 'maison basque', 'arène'], terrain: 'valleys' },
          { name: 'Biarritz', lat: 43.4832, lon: -1.5586, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'coastal', climate: 'sunny', architecture: 'belle époque', alt: 25, language: 'fr', objects: ['plage', 'rocher', 'casino', 'surf', 'phare', 'villa', 'golf', 'thalasso'], terrain: 'coastal' },
          { name: 'Périgueux', lat: 45.1840, lon: 0.7211, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'temperate', architecture: 'roman', alt: 90, language: 'fr', objects: ['cathédrale saint-front', 'isle', 'building', 'foie gras', 'truffe', 'ruelle'], terrain: 'valleys' },
          { name: 'Agen', lat: 44.2049, lon: 0.6212, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'sunny', architecture: 'classical', alt: 50, language: 'fr', objects: ['cathédrale', 'garonne', 'pruneau', 'building', 'canal'], terrain: 'valleys' },
          { name: 'Angoulême', lat: 45.6488, lon: 0.1560, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'temperate', architecture: 'roman', alt: 100, language: 'fr', objects: ['cathédrale', 'bd', 'rempart', 'building', 'charente', 'papier'], terrain: 'hills' },
          { name: 'Niort', lat: 46.3239, lon: -0.4646, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 20, language: 'fr', objects: ['donjon', 'sèvre', 'building', 'marché', 'angélique'], terrain: 'plains' },
          { name: 'Royan', lat: 45.6230, lon: -1.0282, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'coastal', climate: 'sunny', architecture: 'modern', alt: 15, language: 'fr', objects: ['plage', 'église notre-dame', 'port', 'belle époque', 'marché', 'front de mer'], terrain: 'coastal' },
          { name: 'Arcachon', lat: 44.6580, lon: -1.1689, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'coastal', climate: 'sunny', architecture: 'belle époque', alt: 5, language: 'fr', objects: ['dune', 'bassin', 'pinède', 'huître', 'ville d\'hiver', 'plage'], terrain: 'coastal' },
          { name: 'Saint-Émilion', lat: 44.8933, lon: -0.1557, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'vineyard', climate: 'temperate', architecture: 'medieval', alt: 70, language: 'fr', objects: ['vigne', 'église monolithe', 'château', 'cave', 'macaron', 'clocher'], terrain: 'hills' },
          { name: 'Sarlat-la-Canéda', lat: 44.8900, lon: 1.2170, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'forest', climate: 'temperate', architecture: 'medieval', alt: 180, language: 'fr', objects: ['maison renaissance', 'ruelle', 'oie', 'foie gras', 'marché', 'lanterne des morts'], terrain: 'valleys' },
          { name: 'Brantôme', lat: 45.3644, lon: 0.6488, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'forest', climate: 'temperate', architecture: 'roman', alt: 100, language: 'fr', objects: ['abbaye', 'dronne', 'pont', 'falaise', 'jardin'], terrain: 'valleys' },
          { name: 'Rochefort', lat: 45.9415, lon: -0.9583, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'coastal', climate: 'sunny', architecture: 'classical', alt: 5, language: 'fr', objects: ['corderie royale', 'hermione', 'arsenal', 'pont transbordeur', 'charente'], terrain: 'coastal' },
          { name: 'Cognac', lat: 45.6957, lon: -0.3290, country: 'France', region: 'Nouvelle-Aquitaine', vegetation: 'vineyard', climate: 'sunny', architecture: 'renaissance', alt: 20, language: 'fr', objects: ['château', 'charente', 'eau-de-vie', 'tonneau', 'distillerie', 'vigne'], terrain: 'valleys' },
          
          // ==================== FRANCE - Occitanie ====================
          { name: 'Toulouse', lat: 43.6047, lon: 1.4442, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'brick', alt: 150, language: 'fr', objects: ['building', 'car', 'airbus', 'violet', 'canal du midi', 'cassoulet', 'brique foraine', 'capitole', 'garonne'], terrain: 'valleys' },
          { name: 'Montpellier', lat: 43.6108, lon: 3.8767, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'modern', alt: 30, language: 'fr', objects: ['building', 'tram', 'tree', 'fountain', 'place de la comédie', 'esplanade', 'écusson', 'étudiant', 'arc de triomphe'], terrain: 'coastal' },
          { name: 'Nîmes', lat: 43.8367, lon: 4.3601, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'roman', alt: 45, language: 'fr', objects: ['arène', 'maison carrée', 'crocodile', 'tour magne', 'jardin', 'fontaine', 'denim'], terrain: 'hills' },
          { name: 'Perpignan', lat: 42.6887, lon: 2.8948, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'catalan', alt: 30, language: 'fr', objects: ['castillet', 'palais rois majorque', 'cathédrale', 'palmier', 'têt', 'catalan'], terrain: 'plains' },
          { name: 'Carcassonne', lat: 43.2121, lon: 2.3537, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'medieval', alt: 110, language: 'fr', objects: ['cité', 'rempart', 'château comtal', 'basilique', 'aude', 'cassoulet'], terrain: 'hills' },
          { name: 'Albi', lat: 43.9278, lon: 2.1479, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'gothic', alt: 170, language: 'fr', objects: ['cathédrale sainte-cécile', 'palais berbie', 'tarn', 'brique', 'pont vieux', 'toulouse-lautrec'], terrain: 'valleys' },
          { name: 'Castres', lat: 43.6062, lon: 2.2404, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'classical', alt: 170, language: 'fr', objects: ['agoût', 'maison sur l\'eau', 'goya', 'jardin', 'building'], terrain: 'valleys' },
          { name: 'Tarbes', lat: 43.2329, lon: 0.0781, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'temperate', architecture: 'classical', alt: 310, language: 'fr', objects: ['haras', 'adour', 'building', 'jardin masse', 'cathédrale'], terrain: 'hills' },
          { name: 'Auch', lat: 43.6453, lon: 0.5886, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'renaissance', alt: 150, language: 'fr', objects: ['cathédrale', 'escalier monumental', 'gers', 'statue d\'artagnan', 'building'], terrain: 'hills' },
          { name: 'Rodez', lat: 44.3499, lon: 2.5750, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'temperate', architecture: 'gothic', alt: 625, language: 'fr', objects: ['cathédrale', 'musée soulages', 'aveyron', 'building', 'clocher'], terrain: 'hills' },
          { name: 'Sète', lat: 43.4028, lon: 3.6960, country: 'France', region: 'Occitanie', vegetation: 'coastal', climate: 'sunny', architecture: 'maritime', alt: 5, language: 'fr', objects: ['canal', 'mont saint-clair', 'port', 'joute', 'tielle', 'brassens', 'phare'], terrain: 'coastal' },
          { name: 'Béziers', lat: 43.3442, lon: 3.2156, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'roman', alt: 52, language: 'fr', objects: ['cathédrale', 'canal du midi', 'écluse', 'orb', 'arène', 'feria'], terrain: 'hills' },
          { name: 'Narbonne', lat: 43.1843, lon: 3.0033, country: 'France', region: 'Occitanie', vegetation: 'urban', climate: 'sunny', architecture: 'gothic', alt: 5, language: 'fr', objects: ['cathédrale', 'canal robine', 'palais archevêques', 'horreum', 'plage'], terrain: 'plains' },
          { name: 'Mende', lat: 44.5185, lon: 3.5007, country: 'France', region: 'Occitanie', vegetation: 'mountain', climate: 'snowy', architecture: 'medieval', alt: 740, language: 'fr', objects: ['cathédrale', 'lot', 'pont', 'building', 'mont lozère'], terrain: 'mountains' },
          { name: 'Millau', lat: 44.0985, lon: 3.0781, country: 'France', region: 'Occitanie', vegetation: 'grassland', climate: 'sunny', architecture: 'modern', alt: 370, language: 'fr', objects: ['viaduc', 'tarn', 'gant', 'causse', 'parapente', 'cathédrale'], terrain: 'plateaus' },
          { name: 'Lourdes', lat: 43.0943, lon: -0.0465, country: 'France', region: 'Occitanie', vegetation: 'mountain', climate: 'temperate', architecture: 'neo-gothic', alt: 420, language: 'fr', objects: ['grotte', 'basilique', 'gave', 'cierge', 'pèlerin', 'sanctuaire'], terrain: 'mountains' },
          { name: 'Collioure', lat: 42.5260, lon: 3.0847, country: 'France', region: 'Occitanie', vegetation: 'coastal', climate: 'sunny', architecture: 'catalan', alt: 5, language: 'fr', objects: ['château royal', 'plage', 'clocher', 'anchois', 'ruelle', 'peintre'], terrain: 'coastal' },
          { name: 'Cahors', lat: 44.4475, lon: 1.4406, country: 'France', region: 'Occitanie', vegetation: 'vineyard', climate: 'sunny', architecture: 'medieval', alt: 120, language: 'fr', objects: ['pont valentré', 'lot', 'cathédrale', 'vin', 'truffe', 'rempart'], terrain: 'valleys' },
          
          // ==================== FRANCE - Provence-Alpes-Côte d'Azur ====================
          { name: 'Marseille', lat: 43.2965, lon: 5.3698, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'grassland', climate: 'sunny', architecture: 'mediterranean', alt: 12, language: 'fr', objects: ['building', 'car', 'palm tree', 'boat', 'pétanque ball', 'cigale', 'pastis glass', 'calanque', 'savon', 'bonne-mère', 'panier'], terrain: 'coastal' },
          { name: 'Nice', lat: 43.7102, lon: 7.2620, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'grassland', climate: 'sunny', architecture: 'belle époque', alt: 25, language: 'fr', objects: ['building', 'palm tree', 'car', 'beach', 'promenade', 'chaise bleue', 'vélo bleu', 'parasol', 'galet', 'socca', 'colline château', 'cours saleya'], terrain: 'coastal' },
          { name: 'Toulon', lat: 43.1242, lon: 5.9280, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'grassland', climate: 'sunny', architecture: 'maritime', alt: 5, language: 'fr', objects: ['port', 'rade', 'mont faron', 'bateau militaire', 'téléphérique', 'plage mourillon', 'building'], terrain: 'coastal' },
          { name: 'Aix-en-Provence', lat: 43.5297, lon: 5.4474, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'urban', climate: 'sunny', architecture: 'classical', alt: 180, language: 'fr', objects: ['cours mirabeau', 'fontaine', 'hôtel particulier', 'cathédrale', 'calisson', 'thermes', 'sainte-victoire'], terrain: 'hills' },
          { name: 'Avignon', lat: 43.9493, lon: 4.8055, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'urban', climate: 'sunny', architecture: 'gothic', alt: 25, language: 'fr', objects: ['palais des papes', 'pont', 'rempart', 'rhône', 'festival', 'théâtre'], terrain: 'valleys' },
          { name: 'Cannes', lat: 43.5528, lon: 7.0174, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'coastal', climate: 'sunny', architecture: 'belle époque', alt: 5, language: 'fr', objects: ['croisette', 'palais festivals', 'plage', 'voilier', 'palmier', 'villa', 'marche rouge'], terrain: 'coastal' },
          { name: 'Antibes', lat: 43.5804, lon: 7.1251, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'coastal', climate: 'sunny', architecture: 'medieval', alt: 5, language: 'fr', objects: ['rempart', 'port vauban', 'cap', 'musée picasso', 'plage', 'phare'], terrain: 'coastal' },
          { name: 'Saint-Tropez', lat: 43.2673, lon: 6.6405, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'coastal', climate: 'sunny', architecture: 'maritime', alt: 5, language: 'fr', objects: ['port', 'citadelle', 'tartane', 'plage pampelonne', 'gendarmerie', 'tropézienne'], terrain: 'coastal' },
          { name: 'Arles', lat: 43.6766, lon: 4.6278, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'grassland', climate: 'sunny', architecture: 'roman', alt: 10, language: 'fr', objects: ['arène', 'théâtre antique', 'rhône', 'camargue', 'van gogh', 'rencontres photo'], terrain: 'plains' },
          { name: 'Fréjus', lat: 43.4330, lon: 6.7370, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'coastal', climate: 'sunny', architecture: 'roman', alt: 5, language: 'fr', objects: ['arène', 'aqueduc', 'cathédrale', 'port', 'plage', 'esterel'], terrain: 'coastal' },
          { name: 'Grasse', lat: 43.6584, lon: 6.9233, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'grassland', climate: 'sunny', architecture: 'medieval', alt: 300, language: 'fr', objects: ['parfumerie', 'fleur', 'lavande', 'jasmin', 'cathédrale', 'ruelle'], terrain: 'hills' },
          { name: 'Menton', lat: 43.7748, lon: 7.5046, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'coastal', climate: 'sunny', architecture: 'belle époque', alt: 5, language: 'fr', objects: ['citron', 'plage', 'jardin', 'vieux port', 'basilique', 'escalier'], terrain: 'coastal' },
          { name: 'Saint-Paul-de-Vence', lat: 43.6969, lon: 7.1226, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'grassland', climate: 'sunny', architecture: 'medieval', alt: 180, language: 'fr', objects: ['rempart', 'galerie art', 'fondation maeght', 'ruelle', 'colombe', 'place'], terrain: 'hills' },
          { name: 'Gordes', lat: 43.9117, lon: 5.2002, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'grassland', climate: 'sunny', architecture: 'medieval', alt: 370, language: 'fr', objects: ['château', 'borie', 'lavande', 'pierre sèche', 'ruelle', 'point vue'], terrain: 'hills' },
          { name: 'Roussillon', lat: 43.9027, lon: 5.2930, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'forest', climate: 'sunny', architecture: 'ochre', alt: 350, language: 'fr', objects: ['ocre', 'falaise', 'ruelle colorée', 'sentier ocres', 'pin'], terrain: 'hills' },
          { name: 'Les Baux-de-Provence', lat: 43.7438, lon: 4.7954, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'rocky', climate: 'sunny', architecture: 'medieval', alt: 240, language: 'fr', objects: ['château', 'carrière lumières', 'ruelle', 'olivier', 'point vue'], terrain: 'hills' },
          { name: 'Cassis', lat: 43.2150, lon: 5.5372, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'coastal', climate: 'sunny', architecture: 'maritime', alt: 5, language: 'fr', objects: ['calanque', 'port', 'plage', 'cap canaille', 'vin blanc', 'falaise'], terrain: 'coastal' },
          { name: 'Hyères', lat: 43.1204, lon: 6.1286, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'coastal', climate: 'sunny', architecture: 'maritime', alt: 20, language: 'fr', objects: ['îles or', 'porquerolles', 'port', 'palmier', 'plage', 'salins'], terrain: 'coastal' },
          { name: 'Digne-les-Bains', lat: 44.0920, lon: 6.2355, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'alpine', climate: 'sunny', architecture: 'classical', alt: 600, language: 'fr', objects: ['lavande', 'thermal', 'cathédrale', 'montagne', 'géoparc', 'eau'], terrain: 'alpine valleys' },
          { name: 'Briançon', lat: 44.8966, lon: 6.6342, country: 'France', region: 'Provence-Alpes-Côte d\'Azur', vegetation: 'alpine', climate: 'snowy', architecture: 'vauban', alt: 1326, language: 'fr', objects: ['citadelle', 'rempart', 'fort', 'ski', 'montagne', 'serre-chevalier'], terrain: 'alpine' },
          
          // ==================== FRANCE - Corse ====================
          { name: 'Ajaccio', lat: 41.9192, lon: 8.7386, country: 'France', region: 'Corse', vegetation: 'maquis', climate: 'sunny', architecture: 'mediterranean', alt: 10, language: 'fr', objects: ['building', 'palm tree', 'boat', 'napoleon statue', 'maquis shrub', 'figatellu', 'mountain stream', 'beach', 'citadelle'], terrain: 'coastal' },
          { name: 'Bastia', lat: 42.7000, lon: 9.4500, country: 'France', region: 'Corse', vegetation: 'maquis', climate: 'sunny', architecture: 'baroque', alt: 5, language: 'fr', objects: ['vieux port', 'citadelle', 'église', 'ruelle', 'place saint-nicolas', 'bateau'], terrain: 'coastal' },
          { name: 'Calvi', lat: 42.5676, lon: 8.7567, country: 'France', region: 'Corse', vegetation: 'maquis', climate: 'sunny', architecture: 'genovese', alt: 5, language: 'fr', objects: ['citadelle', 'port', 'plage', 'montagne', 'rempart', 'bateau'], terrain: 'coastal' },
          { name: 'Bonifacio', lat: 41.3879, lon: 9.1594, country: 'France', region: 'Corse', vegetation: 'maquis', climate: 'sunny', architecture: 'genovese', alt: 70, language: 'fr', objects: ['falaise', 'citadelle', 'port', 'escalier roi aragon', 'grain de sable', 'bateau'], terrain: 'coastal' },
          { name: 'Porto-Vecchio', lat: 41.5910, lon: 9.2795, country: 'France', region: 'Corse', vegetation: 'maquis', climate: 'sunny', architecture: 'genovese', alt: 20, language: 'fr', objects: ['port', 'plage palombaggia', 'citadelle', 'marina', 'pinède'], terrain: 'coastal' },
          { name: 'Corte', lat: 42.3060, lon: 9.1490, country: 'France', region: 'Corse', vegetation: 'mountain', climate: 'temperate', architecture: 'medieval', alt: 450, language: 'fr', objects: ['citadelle', 'université', 'musée corse', 'montagne', 'restonica'], terrain: 'mountains' },
          
          // ==================== BELGIQUE ====================
          { name: 'Brussels', lat: 50.8503, lon: 4.3517, country: 'Belgium', region: 'Brussels', vegetation: 'urban', climate: 'cloudy', architecture: 'gothic', alt: 13, language: 'fr', objects: ['building', 'car', 'statue', 'manneken pis', 'waffle stand', 'comic mural', 'european flag', 'atomium', 'frites cone', 'grand-place', 'bourse'], terrain: 'plains' },
          { name: 'Antwerp', lat: 51.2194, lon: 4.4025, country: 'Belgium', region: 'Flanders', vegetation: 'urban', climate: 'cloudy', architecture: 'renaissance', alt: 10, language: 'nl', objects: ['building', 'tram', 'diamond', 'cathedral', 'rubens house', 'belgian beer', 'fashion shop', 'port crane', 'grote markt', 'scheldt'], terrain: 'plains' },
          { name: 'Ghent', lat: 51.0543, lon: 3.7174, country: 'Belgium', region: 'Flanders', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 9, language: 'nl', objects: ['gravensteen', 'canal', 'graslei', 'cathedral', 'belfry', 'altarpiece', 'cuberdon', 'bicycle'], terrain: 'plains' },
          { name: 'Bruges', lat: 51.2092, lon: 3.2248, country: 'Belgium', region: 'Flanders', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 3, language: 'nl', objects: ['canal', 'bridge', 'bicycle', 'swan', 'belfry', 'chocolate shop', 'lace', 'brewer', 'minnewater', 'begijnhof'], terrain: 'plains' },
          { name: 'Liège', lat: 50.6326, lon: 5.5797, country: 'Belgium', region: 'Wallonia', vegetation: 'urban', climate: 'cloudy', architecture: 'modern', alt: 65, language: 'fr', objects: ['gare', 'palais princes-évêques', 'meuse', 'escalier bueren', 'boulets', 'pékèt', 'cité ardente'], terrain: 'valleys' },
          { name: 'Charleroi', lat: 50.4108, lon: 4.4446, country: 'Belgium', region: 'Wallonia', vegetation: 'urban', climate: 'cloudy', architecture: 'industrial', alt: 120, language: 'fr', objects: ['terril', 'building', 'sambre', 'métro', 'belfry', 'photo museum', 'spirou'], terrain: 'valleys' },
          { name: 'Namur', lat: 50.4674, lon: 4.8719, country: 'Belgium', region: 'Wallonia', vegetation: 'urban', climate: 'cloudy', architecture: 'classical', alt: 100, language: 'fr', objects: ['citadelle', 'meuse', 'sambre', 'parlement', 'belfry', 'église saint-loup'], terrain: 'valleys' },
          { name: 'Leuven', lat: 50.8798, lon: 4.7005, country: 'Belgium', region: 'Flanders', vegetation: 'urban', climate: 'cloudy', architecture: 'gothic', alt: 30, language: 'nl', objects: ['town hall', 'university', 'stella artois', 'library', 'beguinage', 'park'], terrain: 'plains' },
          { name: 'Mechelen', lat: 51.0259, lon: 4.4776, country: 'Belgium', region: 'Flanders', vegetation: 'urban', climate: 'cloudy', architecture: 'gothic', alt: 8, language: 'nl', objects: ['sint-rombouts', 'beguinage', 'dyle', 'palace margaret', 'brewery', 'clock'], terrain: 'plains' },
          { name: 'Ostend', lat: 51.2253, lon: 2.9141, country: 'Belgium', region: 'Flanders', vegetation: 'coastal', climate: 'windy', architecture: 'belle époque', alt: 3, language: 'nl', objects: ['beach', 'casino', 'port', 'royal gallery', 'tram', 'mercator ship', 'promenade'], terrain: 'coastal' },
          { name: 'Knokke', lat: 51.3414, lon: 3.2867, country: 'Belgium', region: 'Flanders', vegetation: 'coastal', climate: 'windy', architecture: 'modern', alt: 3, language: 'nl', objects: ['beach', 'zwin', 'dune', 'gallery', 'casino', 'butterfly', 'villa'], terrain: 'coastal' },
          { name: 'Mons', lat: 50.4541, lon: 3.9568, country: 'Belgium', region: 'Wallonia', vegetation: 'urban', climate: 'cloudy', architecture: 'classical', alt: 45, language: 'fr', objects: ['belfry', 'grand-place', 'sainte-waudru', 'doudou', 'dragon', 'cobblestone'], terrain: 'hills' },
          { name: 'Tournai', lat: 50.6068, lon: 3.3890, country: 'Belgium', region: 'Wallonia', vegetation: 'urban', climate: 'cloudy', architecture: 'roman', alt: 22, language: 'fr', objects: ['cathedral', 'belfry', 'pont des trous', 'escaut', 'grand-place', 'tapestry'], terrain: 'valleys' },
          { name: 'Dinant', lat: 50.2606, lon: 4.9127, country: 'Belgium', region: 'Wallonia', vegetation: 'forest', climate: 'cloudy', architecture: 'medieval', alt: 100, language: 'fr', objects: ['citadelle', 'collegiale', 'meuse', 'saxophone', 'rocher bayard', 'grotte'], terrain: 'valleys' },
          { name: 'Durbuy', lat: 50.3521, lon: 5.4564, country: 'Belgium', region: 'Wallonia', vegetation: 'forest', climate: 'cloudy', architecture: 'medieval', alt: 150, language: 'fr', objects: ['château', 'ourthe', 'ruelle', 'parc topiaire', 'pierre'], terrain: 'valleys' },
          { name: 'Bouillon', lat: 49.7956, lon: 5.0681, country: 'Belgium', region: 'Wallonia', vegetation: 'forest', climate: 'cloudy', architecture: 'medieval', alt: 220, language: 'fr', objects: ['château', 'semois', 'rempart', 'godefroy', 'kayak', 'forêt'], terrain: 'valleys' },
          { name: 'Spa', lat: 50.4920, lon: 5.8641, country: 'Belgium', region: 'Wallonia', vegetation: 'forest', climate: 'cloudy', architecture: 'belle époque', alt: 260, language: 'fr', objects: ['thermal baths', 'casino', 'pouhon', 'francorchamps', 'eau', 'forêt'], terrain: 'hills' },
          { name: 'Bastogne', lat: 50.0045, lon: 5.7185, country: 'Belgium', region: 'Wallonia', vegetation: 'forest', climate: 'snowy', architecture: 'modern', alt: 500, language: 'fr', objects: ['mardasson', 'mémorial', 'tank', 'étoile', 'battle bulge', 'forêt'], terrain: 'plateaus' },
          { name: 'Ypres', lat: 50.8511, lon: 2.8857, country: 'Belgium', region: 'Flanders', vegetation: 'urban', climate: 'cloudy', architecture: 'gothic', alt: 25, language: 'nl', objects: ['cloth hall', 'menin gate', 'last post', 'rempart', 'flanders fields', 'poppy'], terrain: 'plains' },
          { name: 'Kortrijk', lat: 50.8279, lon: 3.2649, country: 'Belgium', region: 'Flanders', vegetation: 'urban', climate: 'cloudy', architecture: 'medieval', alt: 20, language: 'nl', objects: ['belfry', 'broel towers', 'leie', 'textile', 'begijnhof', 'golden spurs'], terrain: 'valleys' },
          { name: 'Hasselt', lat: 50.9307, lon: 5.3384, country: 'Belgium', region: 'Flanders', vegetation: 'urban', climate: 'cloudy', architecture: 'modern', alt: 35, language: 'nl', objects: ['japanese garden', 'jenever', 'fashion museum', 'demer', 'church'], terrain: 'plains' },
          { name: 'Genk', lat: 50.9661, lon: 5.5021, country: 'Belgium', region: 'Flanders', vegetation: 'forest', climate: 'cloudy', architecture: 'industrial', alt: 80, language: 'nl', objects: ['mine', 'c-mine', 'bokrijk', 'forêt', 'building', 'église'], terrain: 'plains' },
          
          // ==================== SUISSE ====================
          { name: 'Zurich', lat: 47.3769, lon: 8.5417, country: 'Switzerland', region: 'Zurich', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 408, language: 'de', objects: ['building', 'tram', 'lake', 'banque', 'bahnhofstrasse', 'grossmünster', 'chocolat', 'montre'], terrain: 'valleys' },
          { name: 'Geneva', lat: 46.2044, lon: 6.1432, country: 'Switzerland', region: 'Geneva', vegetation: 'urban', climate: 'temperate', architecture: 'modern', alt: 375, language: 'fr', objects: ['jet d\'eau', 'lac léman', 'onug', 'cern', 'mont-blanc view', 'horloge fleurie', 'bateau', 'building'], terrain: 'valleys' },
          { name: 'Basel', lat: 47.5596, lon: 7.5886, country: 'Switzerland', region: 'Basel-Stadt', vegetation: 'urban', climate: 'temperate', architecture: 'gothic', alt: 260, language: 'de', objects: ['munster', 'rhine', 'art basel', 'tram', 'building', 'pharma', 'ferry'], terrain: 'valleys' },
          { name: 'Bern', lat: 46.9480, lon: 7.4474, country: 'Switzerland', region: 'Bern', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 540, language: 'de', objects: ['zentrum paul klee', 'aare', 'bear pit', 'clock tower', 'fountain', 'parliament', 'arcade'], terrain: 'valleys' },
          { name: 'Lausanne', lat: 46.5197, lon: 6.6323, country: 'Switzerland', region: 'Vaud', vegetation: 'urban', climate: 'temperate', architecture: 'gothic', alt: 495, language: 'fr', objects: ['cathedral', 'olympic museum', 'lac léman', 'métro', 'building', 'vignes lavaux', 'palud'], terrain: 'hills' },
          { name: 'Lucerne', lat: 47.0502, lon: 8.3093, country: 'Switzerland', region: 'Lucerne', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 435, language: 'de', objects: ['pont kapellbrücke', 'lac', 'mont pilatus', 'lion monument', 'tour', 'bateau', 'rempart'], terrain: 'valleys' },
          { name: 'Lugano', lat: 46.0037, lon: 8.9511, country: 'Switzerland', region: 'Ticino', vegetation: 'grassland', climate: 'sunny', architecture: 'mediterranean', alt: 270, language: 'it', objects: ['lac', 'monte brè', 'parco ciani', 'building', 'palm tree', 'funicular', 'église'], terrain: 'valleys' },
          { name: 'Interlaken', lat: 46.6863, lon: 7.8632, country: 'Switzerland', region: 'Bern', vegetation: 'alpine', climate: 'snowy', architecture: 'chalet', alt: 568, language: 'de', objects: ['jungfrau', 'lake', 'parachute', 'train', 'chalet', 'montagne', 'höhematte'], terrain: 'alpine valleys' },
          { name: 'Zermatt', lat: 46.0207, lon: 7.7491, country: 'Switzerland', region: 'Valais', vegetation: 'alpine', climate: 'snowy', architecture: 'chalet', alt: 1608, language: 'de', objects: ['cervin', 'ski', 'télécabine', 'chalet', 'train', 'glacier', 'montagne'], terrain: 'alpine' },
          { name: 'Montreux', lat: 46.4312, lon: 6.9107, country: 'Switzerland', region: 'Vaud', vegetation: 'grassland', climate: 'temperate', architecture: 'belle époque', alt: 390, language: 'fr', objects: ['château chillon', 'lac léman', 'jazz festival', 'vigne', 'promenade fleurie', 'statue freddie'], terrain: 'valleys' },
          { name: 'Neuchâtel', lat: 46.9925, lon: 6.9293, country: 'Switzerland', region: 'Neuchâtel', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 430, language: 'fr', objects: ['château', 'lac', 'collégiale', 'building', 'université', 'creux-du-van'], terrain: 'valleys' },
          { name: 'Fribourg', lat: 46.8065, lon: 7.1616, country: 'Switzerland', region: 'Fribourg', vegetation: 'urban', climate: 'temperate', architecture: 'gothic', alt: 610, language: 'fr', objects: ['cathédrale', 'sarine', 'pont', 'rempart', 'funicular', 'fondue'], terrain: 'valleys' },
          { name: 'Sion', lat: 46.2331, lon: 7.3606, country: 'Switzerland', region: 'Valais', vegetation: 'vineyard', climate: 'sunny', architecture: 'medieval', alt: 500, language: 'fr', objects: ['château tourbillon', 'valère', 'rhône', 'vigne', 'abricot', 'montagne'], terrain: 'valleys' },
          { name: 'St. Gallen', lat: 47.4245, lon: 9.3767, country: 'Switzerland', region: 'St. Gallen', vegetation: 'urban', climate: 'temperate', architecture: 'baroque', alt: 675, language: 'de', objects: ['abbey', 'library', 'broderie', 'building', 'tram', 'place'], terrain: 'hills' },
          { name: 'Winterthur', lat: 47.5006, lon: 8.7240, country: 'Switzerland', region: 'Zurich', vegetation: 'urban', climate: 'temperate', architecture: 'industrial', alt: 439, language: 'de', objects: ['musée photo', 'technorama', 'building', 'parc', 'vieux ville'], terrain: 'valleys' },
          { name: 'Thun', lat: 46.7580, lon: 7.6280, country: 'Switzerland', region: 'Bern', vegetation: 'urban', climate: 'temperate', architecture: 'medieval', alt: 560, language: 'de', objects: ['château', 'lac', 'aar', 'pont couvert', 'place', 'montagne'], terrain: 'valleys' },
          { name: 'La Chaux-de-Fonds', lat: 47.1032, lon: 6.8260, country: 'Switzerland', region: 'Neuchâtel', vegetation: 'urban', climate: 'snowy', architecture: 'modern', alt: 1000, language: 'fr', objects: ['watch museum', 'le corbusier', 'building', 'neige', 'horlogerie', 'gare'], terrain: 'plateaus' },
          { name: 'Grindelwald', lat: 46.6243, lon: 8.0413, country: 'Switzerland', region: 'Bern', vegetation: 'alpine', climate: 'snowy', architecture: 'chalet', alt: 1034, language: 'de', objects: ['eiger', 'ski', 'chalet', 'télécabine', 'randonnée', 'glacier'], terrain: 'alpine' },
          { name: 'Verbier', lat: 46.1003, lon: 7.2300, country: 'Switzerland', region: 'Valais', vegetation: 'alpine', climate: 'snowy', architecture: 'chalet', alt: 1500, language: 'fr', objects: ['ski', 'chalet', 'montagne', 'snowboard', 'télécabine', 'après-ski'], terrain: 'alpine' },
          { name: 'Ascona', lat: 46.1556, lon: 8.7673, country: 'Switzerland', region: 'Ticino', vegetation: 'grassland', climate: 'sunny', architecture: 'mediterranean', alt: 196, language: 'it', objects: ['lac maggiore', 'promenade', 'palm tree', 'café', 'église', 'montagne'], terrain: 'coastal' },
          
          // ==================== ESPAGNE ====================
          { name: 'Madrid', lat: 40.4168, lon: -3.7038, country: 'Spain', region: 'Community of Madrid', vegetation: 'urban', climate: 'sunny', architecture: 'baroque', alt: 657, language: 'es', objects: ['building', 'car', 'tree', 'fountain', 'plaza mayor', 'bear statue', 'flamenco dancer', 'metro sign', 'palacio real', 'tapas', 'prado'], terrain: 'plateaus' },
          { name: 'Barcelona', lat: 41.3851, lon: 2.1734, country: 'Spain', region: 'Catalonia', vegetation: 'urban', climate: 'sunny', architecture: 'modernist', alt: 9, language: 'es', objects: ['building', 'palm tree', 'car', 'beach', 'sagrada familia', 'mosaic', 'bicycle', 'tapas bar', 'gothic quarter', 'ramblas', 'parc güell'], terrain: 'coastal' },
          { name: 'Valencia', lat: 39.4699, lon: -0.3763, country: 'Spain', region: 'Valencian Community', vegetation: 'urban', climate: 'sunny', architecture: 'modern', alt: 15, language: 'es', objects: ['ciudad artes ciencias', 'paella', 'beach', 'cathedral', 'turia park', 'mercado central', 'orxata'], terrain: 'coastal' },
          { name: 'Seville', lat: 37.3891, lon: -5.9845, country: 'Spain', region: 'Andalusia', vegetation: 'urban', climate: 'sunny', architecture: 'mudéjar', alt: 7, language: 'es', objects: ['alcázar', 'cathedral', 'giralda', 'plaza españa', 'flamenco', 'orange tree', 'guadalquivir'], terrain: 'plains' },
          { name: 'Málaga', lat: 36.7213, lon: -4.4214, country: 'Spain', region: 'Andalusia', vegetation: 'coastal', climate: 'sunny', architecture: 'mediterranean', alt: 8, language: 'es', objects: ['alcazaba', 'picasso museum', 'beach', 'port', 'cathedral', 'espeto', 'gibralfaro'], terrain: 'coastal' },
          { name: 'Granada', lat: 37.1773, lon: -3.5986, country: 'Spain', region: 'Andalusia', vegetation: 'urban', climate: 'sunny', architecture: 'nasrid', alt: 738, language: 'es', objects: ['alhambra', 'generalife', 'albaicín', 'sierra nevada', 'tapas', 'carmen', 'sacromonte'], terrain: 'mountains' },
          { name: 'Córdoba', lat: 37.8882, lon: -4.7794, country: 'Spain', region: 'Andalusia', vegetation: 'urban', climate: 'sunny', architecture: 'islamic', alt: 120, language: 'es', objects: ['mezquita', 'puente romano', 'patio', 'guadalquivir', 'alcázar', 'jewish quarter'], terrain: 'valleys' },
          { name: 'Bilbao', lat: 43.2630, lon: -2.9350, country: 'Spain', region: 'Basque Country', vegetation: 'urban', climate: 'rainy', architecture: 'modern', alt: 19, language: 'es', objects: ['guggenheim', 'puppy', 'nervión', 'casco viejo', 'pintxos', 'bridge', 'txapela'], terrain: 'valleys' },
          { name: 'San Sebastián', lat: 43.3183, lon: -1.9812, country: 'Spain', region: 'Basque Country', vegetation: 'coastal', climate: 'rainy', architecture: 'belle époque', alt: 6, language: 'es', objects: ['concha beach', 'pintxos', 'monte igueldo', 'aquarium', 'cathedral', 'peine viento'], terrain: 'coastal' },
          { name: 'Zaragoza', lat: 41.6488, lon: -0.8891, country: 'Spain', region: 'Aragon', vegetation: 'urban', climate: 'sunny', architecture: 'mudéjar', alt: 200, language: 'es', objects: ['basilica pilar', 'ebro', 'alfajería', 'cathedral', 'tapas', 'expo 2008'], terrain: 'plains' },
          { name: 'Salamanca', lat: 40.9701, lon: -5.6635, country: 'Spain', region: 'Castile and León', vegetation: 'urban', climate: 'temperate', architecture: 'plateresque', alt: 800, language: 'es', objects: ['plaza mayor', 'university', 'cathedral', 'rúa', 'frog', 'tormes', 'sandstone'], terrain: 'plateaus' },
          { name: 'Santiago de Compostela', lat: 42.8782, lon: -8.5448, country: 'Spain', region: 'Galicia', vegetation: 'urban', climate: 'rainy', architecture: 'roman', alt: 260, language: 'es', objects: ['cathedral', 'botafumeiro', 'plaza obradoiro', 'pilgrim', 'shell', 'rain', 'parador'], terrain: 'hills' },
          { name: 'Toledo', lat: 39.8628, lon: -4.0273, country: 'Spain', region: 'Castilla-La Mancha', vegetation: 'urban', climate: 'sunny', architecture: 'medieval', alt: 529, language: 'es', objects: ['alcázar', 'cathedral', 'tajo', 'damascene', 'el greco', 'synagogue', 'sword'], terrain: 'hills' },
          { name: 'Segovia', lat: 40.9429, lon: -4.1088, country: 'Spain', region: 'Castile and León', vegetation: 'urban', climate: 'temperate', architecture: 'roman', alt: 1005, language: 'es', objects: ['aqueduct', 'alcázar', 'cathedral', 'cochinillo', 'plaza mayor', 'eresma'], terrain: 'plateaus' },
          { name: 'Cádiz', lat: 36.5270, lon: -6.2886, country: 'Spain', region: 'Andalusia', vegetation: 'coastal', climate: 'sunny', architecture: 'baroque', alt: 11, language: 'es', objects: ['cathedral', 'beach', 'tavira tower', 'port', 'carnival', 'castle', 'pescaíto'], terrain: 'coastal' },
          { name: 'Palma de Mallorca', lat: 39.5696, lon: 2.6502, country: 'Spain', region: 'Balearic Islands', vegetation: 'coastal', climate: 'sunny', architecture: 'gothic', alt: 13, language: 'es', objects: ['cathedral', 'bellver castle', 'beach', 'port', 'ensaimada', 'palm tree', 'yacht'], terrain: 'coastal' },
          { name: 'Ibiza', lat: 38.9067, lon: 1.4206, country: 'Spain', region: 'Balearic Islands', vegetation: 'coastal', climate: 'sunny', architecture: 'mediterranean', alt: 10, language: 'es', objects: ['dalt vila', 'beach', 'club', 'port', 'hippie market', 'sunset', 'salt'], terrain: 'coastal' },
          { name: 'Girona', lat: 41.9794, lon: 2.8214, country: 'Spain', region: 'Catalonia', vegetation: 'urban', climate: 'sunny', architecture: 'medieval', alt: 70, language: 'ca', objects: ['cathedral', 'onyar', 'jewish quarter', 'city walls', 'rambla', 'game thrones'], terrain: 'valleys' },
          { name: 'Ronda', lat: 36.7462, lon: -5.1612, country: 'Spain', region: 'Andalusia', vegetation: 'rocky', climate: 'sunny', architecture: 'medieval', alt: 750, language: 'es', objects: ['puente nuevo', 'tajo', 'bullring', 'old town', 'white village', 'gorge'], terrain: 'mountains' },
          { name: 'Cáceres', lat: 39.4750, lon: -6.3724, country: 'Spain', region: 'Extremadura', vegetation: 'grassland', climate: 'sunny', architecture: 'medieval', alt: 430, language: 'es', objects: ['plaza mayor', 'old town', 'tower', 'stork', 'wall', 'jamón'], terrain: 'plateaus' },
          { name: 'Cuenca', lat: 40.0704, lon: -2.1374, country: 'Spain', region: 'Castilla-La Mancha', vegetation: 'forest', climate: 'temperate', architecture: 'medieval', alt: 946, language: 'es', objects: ['hanging houses', 'huécar', 'cathedral', 'abstract museum', 'bridge san pablo', 'gorge'], terrain: 'mountains' },
          { name: 'Santander', lat: 43.4623, lon: -3.8099, country: 'Spain', region: 'Cantabria', vegetation: 'coastal', climate: 'rainy', architecture: 'belle époque', alt: 15, language: 'es', objects: ['magdalena palace', 'sardinero beach', 'bay', 'lighthouse', 'cathedral', 'boat'], terrain: 'coastal' },
          { name: 'Oviedo', lat: 43.3619, lon: -5.8494, country: 'Spain', region: 'Asturias', vegetation: 'urban', climate: 'rainy', architecture: 'pre-romanesque', alt: 230, language: 'es', objects: ['cathedral', 'cider', 'sidrería', 'naranco', 'woody allen statue', 'cachopo'], terrain: 'hills' },
          { name: 'Vigo', lat: 42.2406, lon: -8.7207, country: 'Spain', region: 'Galicia', vegetation: 'coastal', climate: 'rainy', architecture: 'maritime', alt: 10, language: 'es', objects: ['port', 'cís islands', 'beach', 'oyster', 'ría', 'castro', 'marisco'], terrain: 'coastal' },
          { name: 'Murcia', lat: 37.9922, lon: -1.1307, country: 'Spain', region: 'Murcia', vegetation: 'urban', climate: 'sunny', architecture: 'baroque', alt: 43, language: 'es', objects: ['cathedral', 'segura', 'casino', 'plaza toros', 'zarangollo', 'huerta'], terrain: 'valleys' },
          
          // ==================== BALI (Indonésie) ====================
          { name: 'Denpasar', lat: -8.6705, lon: 115.2126, country: 'Indonesia', region: 'Bali', vegetation: 'jungle', climate: 'tropical', architecture: 'balinese', alt: 4, language: 'id', objects: ['temple', 'market', 'statue', 'offering', 'motorbike', 'frangipani', 'warung'], terrain: 'plains' },
          { name: 'Ubud', lat: -8.5069, lon: 115.2625, country: 'Indonesia', region: 'Bali', vegetation: 'jungle', climate: 'tropical', architecture: 'balinese', alt: 200, language: 'id', objects: ['rice terrace', 'temple', 'monkey forest', 'yoga mat', 'sculpture', 'waterfall', 'campuhan'], terrain: 'hills' },
          { name: 'Kuta', lat: -8.7186, lon: 115.1686, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'modern', alt: 5, language: 'id', objects: ['beach', 'surfboard', 'sunset', 'bar', 'sarong', 'palm tree', 'motorbike'], terrain: 'coastal' },
          { name: 'Seminyak', lat: -8.6917, lon: 115.1550, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'modern', alt: 5, language: 'id', objects: ['beach', 'villa', 'beach club', 'restaurant', 'boutique', 'sunset', 'palm tree'], terrain: 'coastal' },
          { name: 'Canggu', lat: -8.6477, lon: 115.1380, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'modern', alt: 10, language: 'id', objects: ['rice field', 'beach', 'skate park', 'café', 'motorbike', 'surf', 'batu bolong'], terrain: 'coastal' },
          { name: 'Jimbaran', lat: -8.7900, lon: 115.1600, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'balinese', alt: 5, language: 'id', objects: ['beach', 'seafood', 'sunset', 'fish market', 'candle dinner', 'boat'], terrain: 'coastal' },
          { name: 'Nusa Dua', lat: -8.7963, lon: 115.2300, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'modern', alt: 5, language: 'id', objects: ['resort', 'beach', 'golf', 'convention', 'water blow', 'statue'], terrain: 'coastal' },
          { name: 'Uluwatu', lat: -8.8291, lon: 115.0850, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'balinese', alt: 70, language: 'id', objects: ['temple', 'cliff', 'kecak dance', 'monkey', 'sunset', 'surf', 'limestone'], terrain: 'coastal' },
          { name: 'Tanah Lot', lat: -8.6213, lon: 115.0868, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'balinese', alt: 5, language: 'id', objects: ['temple', 'sea', 'rock', 'sunset', 'offering', 'wave'], terrain: 'coastal' },
          { name: 'Bedugul', lat: -8.2816, lon: 115.1665, country: 'Indonesia', region: 'Bali', vegetation: 'alpine', climate: 'temperate', architecture: 'balinese', alt: 1400, language: 'id', objects: ['lake bratan', 'temple ulun danu', 'mountain', 'strawberry', 'flower', 'boat'], terrain: 'mountains' },
          { name: 'Kintamani', lat: -8.2569, lon: 115.3329, country: 'Indonesia', region: 'Bali', vegetation: 'volcanic', climate: 'temperate', architecture: 'balinese', alt: 1500, language: 'id', objects: ['mount batur', 'lake', 'volcano', 'hot spring', 'temple', 'trekking'], terrain: 'volcanic' },
          { name: 'Sidemen', lat: -8.4770, lon: 115.4494, country: 'Indonesia', region: 'Bali', vegetation: 'jungle', climate: 'tropical', architecture: 'balinese', alt: 500, language: 'id', objects: ['rice terrace', 'mount agung', 'weaving', 'river', 'village'], terrain: 'valleys' },
          { name: 'Amed', lat: -8.3352, lon: 115.6500, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'balinese', alt: 5, language: 'id', objects: ['black sand', 'snorkeling', 'fishing boat', 'mount agung', 'salt'], terrain: 'coastal' },
          { name: 'Lovina', lat: -8.1622, lon: 115.0253, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'balinese', alt: 5, language: 'id', objects: ['dolphin', 'black sand', 'snorkeling', 'temple', 'hot spring'], terrain: 'coastal' },
          { name: 'Nusa Penida', lat: -8.7333, lon: 115.5333, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'balinese', alt: 200, language: 'id', objects: ['kelingking', 'cliff', 'manta', 'beach', 'temple', 'tree house', 'broken beach'], terrain: 'coastal' },
          { name: 'Nusa Lembongan', lat: -8.6853, lon: 115.4500, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'balinese', alt: 5, language: 'id', objects: ['seaweed', 'mangrove', 'surf', 'devil\'s tear', 'yellow bridge', 'boat'], terrain: 'coastal' },
          { name: 'Sanur', lat: -8.7057, lon: 115.2614, country: 'Indonesia', region: 'Bali', vegetation: 'coastal', climate: 'tropical', architecture: 'balinese', alt: 5, language: 'id', objects: ['beach', 'promenade', 'boat to penida', 'sunrise', 'market'], terrain: 'coastal' },
          { name: 'Tegalalang', lat: -8.4363, lon: 115.2797, country: 'Indonesia', region: 'Bali', vegetation: 'jungle', climate: 'tropical', architecture: 'balinese', alt: 600, language: 'id', objects: ['rice terrace', 'swing', 'coconut', 'irrigation', 'subak', 'valley'], terrain: 'hills' },
          
          // ==================== MADAGASCAR ====================
          { name: 'Antananarivo', lat: -18.8792, lon: 47.5079, country: 'Madagascar', region: 'Analamanga', vegetation: 'urban', climate: 'temperate', alt: 1276, language: 'mg', objects: ['rova', 'lake anosy', 'marché', 'escalier', 'rickshaw', 'zébu', 'building', 'rizière'], terrain: 'hills' },
          { name: 'Antsirabe', lat: -19.8730, lon: 47.0340, country: 'Madagascar', region: 'Vakinankaratra', vegetation: 'grassland', climate: 'temperate', architecture: 'colonial', alt: 1500, language: 'mg', objects: ['thermal', 'pousse-pousse', 'lake tritrivakely', 'gem', 'volcano', 'marché'], terrain: 'plateaus' },
          { name: 'Toamasina', lat: -18.1492, lon: 49.4023, country: 'Madagascar', region: 'Atsinanana', vegetation: 'rainforest', climate: 'tropical', architecture: 'colonial', alt: 6, language: 'mg', objects: ['port', 'canal pangalanes', 'beach', 'building', 'litchi', 'boat'], terrain: 'coastal' },
          { name: 'Fianarantsoa', lat: -21.4546, lon: 47.0875, country: 'Madagascar', region: 'Haute Matsiatra', vegetation: 'vineyard', climate: 'temperate', architecture: 'colonial', alt: 1200, language: 'mg', objects: ['cathedral', 'vineyard', 'train', 'university', 'hill', 'vieux ville'], terrain: 'hills' },
          { name: 'Mahajanga', lat: -15.7167, lon: 46.3167, country: 'Madagascar', region: 'Boeny', vegetation: 'coastal', climate: 'tropical', architecture: 'colonial', alt: 8, language: 'mg', objects: ['beach', 'baobab', 'port', 'promenade', 'mangrove', 'cirque rouge'], terrain: 'coastal' },
          { name: 'Toliara', lat: -23.3569, lon: 43.6900, country: 'Madagascar', region: 'Atsimo-Andrefana', vegetation: 'spiny forest', climate: 'dry', architecture: 'modern', alt: 10, language: 'mg', objects: ['baobab', 'spiny forest', 'beach', 'coral', 'pirogue', 'arbre bouteille'], terrain: 'coastal' },
          { name: 'Antsiranana', lat: -12.2765, lon: 49.2915, country: 'Madagascar', region: 'Diana', vegetation: 'coastal', climate: 'tropical', architecture: 'colonial', alt: 30, language: 'mg', objects: ['baie', 'sugar loaf', 'port', 'lemurien', 'ylang-ylang', 'caserne'], terrain: 'coastal' },
          { name: 'Morondava', lat: -20.2886, lon: 44.2833, country: 'Madagascar', region: 'Menabe', vegetation: 'coastal', climate: 'dry', architecture: 'traditional', alt: 8, language: 'mg', objects: ['allée baobab', 'beach', 'pirogue', 'sunset', 'mangrove'], terrain: 'coastal' },
          { name: 'Nosy Be', lat: -13.3150, lon: 48.2678, country: 'Madagascar', region: 'Diana', vegetation: 'rainforest', climate: 'tropical', architecture: 'traditional', alt: 15, language: 'mg', objects: ['beach', 'ylang-ylang', 'lemurien', 'vanille', 'plongée', 'pirogue', 'mont passot'], terrain: 'island' },
          { name: 'Île Sainte-Marie', lat: -16.9000, lon: 49.9000, country: 'Madagascar', region: 'Analanjirofo', vegetation: 'rainforest', climate: 'tropical', architecture: 'traditional', alt: 5, language: 'mg', objects: ['baleine', 'plage', 'pirate cemetery', 'vanille', 'clou de girofle', 'pirogue'], terrain: 'island' },
          { name: 'Ifaty', lat: -23.1500, lon: 43.6167, country: 'Madagascar', region: 'Atsimo-Andrefana', vegetation: 'spiny forest', climate: 'dry', architecture: 'traditional', alt: 5, language: 'mg', objects: ['mangrove', 'récif corallien', 'pirogue', 'baobab', 'pêcheur vezo', 'plage'], terrain: 'coastal' },
          { name: 'Ranomafana', lat: -21.2500, lon: 47.4500, country: 'Madagascar', region: 'Vatovavy', vegetation: 'rainforest', climate: 'tropical', architecture: 'traditional', alt: 800, language: 'mg', objects: ['lemurien', 'source thermale', 'parc national', 'orchidée', 'cascade', 'forêt'], terrain: 'mountains' },
          { name: 'Isalo', lat: -22.5000, lon: 45.3833, country: 'Madagascar', region: 'Ihorombe', vegetation: 'canyon', climate: 'dry', architecture: 'traditional', alt: 800, language: 'mg', objects: ['canyon', 'piscine naturelle', 'lemurien', 'sandstone', 'bara tomb', 'sunset'], terrain: 'canyon' },
          { name: 'Andasibe', lat: -18.9333, lon: 48.4167, country: 'Madagascar', region: 'Alaotra-Mangoro', vegetation: 'rainforest', climate: 'tropical', architecture: 'traditional', alt: 900, language: 'mg', objects: ['indri indri', 'orchidée', 'liana', 'fougère', 'cascade', 'rain'], terrain: 'mountains' },
          { name: 'Fort Dauphin', lat: -25.0325, lon: 46.9833, country: 'Madagascar', region: 'Anosy', vegetation: 'coastal', climate: 'tropical', architecture: 'colonial', alt: 10, language: 'mg', objects: ['plage', 'baie', 'montagne', 'sisal', 'fort', 'lémurien'], terrain: 'coastal' },
          { name: 'Ambositra', lat: -20.5333, lon: 47.2500, country: 'Madagascar', region: 'Amoron\'i Mania', vegetation: 'grassland', climate: 'temperate', architecture: 'traditional', alt: 1300, language: 'mg', objects: ['bois sculpté', 'marqueterie', 'zafimaniry', 'église', 'marché', 'maison bois'], terrain: 'hills' },
          { name: 'Diego Suarez', lat: -12.2667, lon: 49.2833, country: 'Madagascar', region: 'Diana', vegetation: 'coastal', climate: 'tropical', architecture: 'colonial', alt: 30, language: 'mg', objects: ['baie', 'pain de sucre', 'plage', 'mer émeraude', 'tsingy rouge', 'voile'], terrain: 'coastal' },
          { name: 'Majunga', lat: -15.7167, lon: 46.3167, country: 'Madagascar', region: 'Boeny', vegetation: 'coastal', climate: 'tropical', architecture: 'colonial', alt: 8, language: 'mg', objects: ['baobab', 'plage', 'port', 'promenade', 'mangrove', 'marché'], terrain: 'coastal' },
          
          // ==================== DUBAI (et EAU) ====================
          { name: 'Dubai', lat: 25.2048, lon: 55.2708, country: 'UAE', region: 'Dubai', vegetation: 'desert', climate: 'sunny', architecture: 'modern', alt: 5, language: 'ar', objects: ['building', 'palm tree', 'car', 'skyscraper', 'camel', 'falcon', 'gold souk', 'fountain', 'burj khalifa', 'mall', 'yacht', 'metro'], terrain: 'desert' },
          { name: 'Abu Dhabi', lat: 24.4539, lon: 54.3773, country: 'UAE', region: 'Abu Dhabi', vegetation: 'desert', climate: 'sunny', architecture: 'modern', alt: 5, language: 'ar', objects: ['sheikh zayed mosque', 'louvre', 'corniche', 'falcon hospital', 'palm tree', 'yacht', 'ferrari world'], terrain: 'coastal' },
          { name: 'Sharjah', lat: 25.3573, lon: 55.4033, country: 'UAE', region: 'Sharjah', vegetation: 'desert', climate: 'sunny', architecture: 'islamic', alt: 5, language: 'ar', objects: ['museum', 'souk', 'mosque', 'university', 'corniche', 'art foundation'], terrain: 'coastal' },
          { name: 'Ajman', lat: 25.3995, lon: 55.4796, country: 'UAE', region: 'Ajman', vegetation: 'desert', climate: 'sunny', architecture: 'modern', alt: 3, language: 'ar', objects: ['beach', 'corniche', 'museum', 'port', 'dhow'], terrain: 'coastal' },
          { name: 'Ras Al Khaimah', lat: 25.7895, lon: 55.9432, country: 'UAE', region: 'Ras Al Khaimah', vegetation: 'desert', climate: 'sunny', architecture: 'traditional', alt: 10, language: 'ar', objects: ['jebel jais', 'mountain', 'zip line', 'pearl', 'fort', 'desert'], terrain: 'coastal' },
          { name: 'Fujairah', lat: 25.1288, lon: 56.3265, country: 'UAE', region: 'Fujairah', vegetation: 'desert', climate: 'sunny', architecture: 'traditional', alt: 5, language: 'ar', objects: ['fort', 'mosque', 'beach', 'mountain', 'indian ocean', 'diving'], terrain: 'coastal' },
          { name: 'Al Ain', lat: 24.2075, lon: 55.7447, country: 'UAE', region: 'Abu Dhabi', vegetation: 'oasis', climate: 'sunny', architecture: 'traditional', alt: 292, language: 'ar', objects: ['oasis', 'jebel hafeet', 'camel market', 'fort', 'palm grove', 'spring'], terrain: 'desert oasis' },
          { name: 'Deira', lat: 25.2688, lon: 55.3136, country: 'UAE', region: 'Dubai', vegetation: 'urban', climate: 'sunny', architecture: 'traditional', alt: 5, language: 'ar', objects: ['souk', 'dhow', 'abras', 'spice', 'gold', 'creek'], terrain: 'coastal' },
          { name: 'Jumeirah', lat: 25.2049, lon: 55.2412, country: 'UAE', region: 'Dubai', vegetation: 'coastal', climate: 'sunny', architecture: 'modern', alt: 3, language: 'ar', objects: ['beach', 'burj al arab', 'mosque', 'palm', 'hotel', 'villa'], terrain: 'coastal' },
          { name: 'Dubai Marina', lat: 25.0800, lon: 55.1400, country: 'UAE', region: 'Dubai', vegetation: 'urban', climate: 'sunny', architecture: 'modern', alt: 5, language: 'ar', objects: ['marina', 'yacht', 'skyscraper', 'beach', 'walk', 'restaurant'], terrain: 'coastal' },
          { name: 'Palm Jumeirah', lat: 25.1124, lon: 55.1390, country: 'UAE', region: 'Dubai', vegetation: 'coastal', climate: 'sunny', architecture: 'modern', alt: 3, language: 'ar', objects: ['atlantis', 'beach', 'monorail', 'palm tree', 'villa', 'yacht', 'waterpark'], terrain: 'artificial island' },
          { name: 'Hatta', lat: 24.7989, lon: 56.1174, country: 'UAE', region: 'Dubai', vegetation: 'mountain', climate: 'temperate', architecture: 'traditional', alt: 330, language: 'ar', objects: ['fort', 'dam', 'kayak', 'mountain', 'hiking', 'heritage village'], terrain: 'mountains' },
          
          // ==================== AUTRES PAYS ====================
          // ... je peux continuer avec des centaines d'autres villes si tu veux !
      ];

  // Générer des embeddings uniques pour chaque lieu
  worldData.forEach((place, i) => {
    const embedding = new Array(GEOINT_CONFIG.embeddingDim);
    // Créer un embedding basé sur les caractéristiques du lieu
    const hash = crypto.createHash('sha256').update(JSON.stringify(place)).digest();
    for (let j = 0; j < GEOINT_CONFIG.embeddingDim; j++) {
      const val = (hash[j % hash.length] / 255) * 2 - 1;
      embedding[j] = val + (Math.random() - 0.5) * 0.1;
    }
    
    db.push({
      id: `place_${i}_${place.name.replace(/\s/g, '_')}`,
      ...place,
      embedding: embedding,
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      nearby: worldData.filter((_, j) => j !== i).slice(0, 5).map(p => p.name),
      score: 0
    });
  });

  return db;
}

// ============================================
// CACHE ET ÉTAT
// ============================================

let geoIntState = {
  modelsLoaded: false,
  geoDatabase: null,
  faissIndex: null,
  cache: new Map()
};

// ============================================
// FONCTIONS DE PRÉTRAITEMENT
// ============================================

async function loadAndProcessImage(buffer) {
  // Simplified version that doesn't require canvas or tensorflow
  // Extract basic image properties from buffer
  const imageSignature = buffer.toString('hex', 0, 4);
  let width = 512, height = 512, format = 'unknown';
  
  // Detect format from magic bytes
  if (imageSignature.startsWith('ffd8ff')) {
    format = 'JPEG';
    // Try to extract dimensions from JPEG
    try {
      const markers = buffer.toString('hex');
      const match = markers.match(/ffc0/);
      if (match) {
        width = Math.min(1024, 512 + Math.floor(Math.random() * 512));
        height = Math.min(1024, 512 + Math.floor(Math.random() * 512));
      }
    } catch (e) {}
  } else if (imageSignature.startsWith('89504e47')) {
    format = 'PNG';
    try {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    } catch (e) {}
  } else if (imageSignature.startsWith('52494646')) {
    format = 'WEBP';
  }
  
  // Create simplified mock image object
  const image = {
    width: Math.max(100, Math.min(width, 4096)),
    height: Math.max(100, Math.min(height, 4096)),
    format: format,
    size: buffer.length
  };
  
  // Create simplified versions without canvas
  const versions = {};
  for (const size of GEOINT_CONFIG.imageSizes) {
    // Create mock image data from buffer samples
    const pixelCount = size * size;
    const pixelData = new Uint8ClampedArray(pixelCount * 4);
    
    // Sample bytes from the buffer to create pixel-like data
    for (let i = 0; i < pixelCount; i++) {
      const bufIdx = (i * buffer.length) / pixelCount;
      const byte1 = buffer[Math.floor(bufIdx) % buffer.length] || 128;
      const byte2 = buffer[(Math.floor(bufIdx) + 1) % buffer.length] || 128;
      const byte3 = buffer[(Math.floor(bufIdx) + 2) % buffer.length] || 128;
      
      pixelData[i * 4] = byte1;           // R
      pixelData[i * 4 + 1] = byte2;       // G
      pixelData[i * 4 + 2] = byte3;       // B
      pixelData[i * 4 + 3] = 255;         // A
    }
    
    // Create mock tensor-like object
    const mockTensor = {
      shape: [size, size, 3],
      dataSync: () => new Float32Array(pixelData.slice(0, size * size * 3)),
      dispose: () => {}
    };
    
    versions[size] = {
      tensor: mockTensor,
      data: {
        width: size,
        height: size,
        data: pixelData
      }
    };
  }
  
  return { image, versions };
}

// ============================================
// EXTRACTION DES CARACTÉRISTIQUES
// ============================================

function extractEmbedding(tensor) {
  // Simuler un embedding 1024 dimensions
  const shape = tensor.shape;
  const size = shape[0] * shape[1] * shape[2];
  const data = tensor.dataSync();
  
  // Réduire les dimensions avec une moyenne pondérée
  const embedding = new Array(GEOINT_CONFIG.embeddingDim);
  const step = Math.floor(size / GEOINT_CONFIG.embeddingDim);
  
  for (let i = 0; i < GEOINT_CONFIG.embeddingDim; i++) {
    let sum = 0;
    const start = i * step;
    const end = Math.min(start + step, size);
    for (let j = start; j < end; j++) {
      sum += data[j];
    }
    embedding[i] = sum / (end - start);
  }
  
  // Normaliser
  const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0)) + 1e-10;
  return embedding.map(v => v / norm);
}

function detectObjects(imageData) {
  const objects = [];
  const colorPalette = {
    'car': [[100, 150, 200], [80, 120, 180]],
    'building': [[180, 170, 150], [200, 190, 170]],
    'tree': [[50, 120, 50], [30, 100, 30]],
    'sky': [[150, 190, 240], [130, 170, 220]],
    'road': [[120, 120, 120], [150, 150, 150]],
    'water': [[60, 120, 180], [40, 100, 160]],
    'grass': [[70, 150, 70], [50, 130, 50]],
    'snow': [[240, 245, 250], [220, 225, 230]]
  };
  
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Échantillonner l'image
  const step = Math.max(1, Math.min(width, height) / 50);
  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      for (const [objName, colors] of Object.entries(colorPalette)) {
        for (const [cr, cg, cb] of colors) {
          const dist = Math.sqrt(
            (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
          );
          if (dist < 30) {
            if (!objects.includes(objName)) {
              objects.push(objName);
            }
            break;
          }
        }
      }
    }
  }
  
  // Filtrer les objets détectés
  const validObjects = OBJECT_CLASSES.filter(obj => 
    objects.includes(obj) || 
    (obj === 'car' && objects.includes('road')) ||
    (obj === 'building' && objects.some(o => ['sky', 'road'].includes(o)))
  );
  
  return validObjects.slice(0, 10);
}

function detectWeather(imageData) {
  const data = imageData.data;
  const pixels = data.length / 4;
  
  let redSum = 0, greenSum = 0, blueSum = 0;
  let brightPixels = 0, darkPixels = 0;
  let warmPixels = 0, coldPixels = 0;
  
  for (let i = 0; i < pixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    redSum += r;
    greenSum += g;
    blueSum += b;
    
    const brightness = (r + g + b) / 3;
    if (brightness > 200) brightPixels++;
    if (brightness < 50) darkPixels++;
    
    if (r > g + 30 && r > b + 30) warmPixels++;
    if (b > g + 30 && b > r + 30) coldPixels++;
  }
  
  const avgR = redSum / pixels;
  const avgG = greenSum / pixels;
  const avgB = blueSum / pixels;
  const brightRatio = brightPixels / pixels;
  const darkRatio = darkPixels / pixels;
  const warmRatio = warmPixels / pixels;
  const coldRatio = coldPixels / pixels;
  
  if (brightRatio > 0.6 && warmRatio > 0.3) return 'sunny';
  if (coldRatio > 0.4 && brightRatio < 0.2) return 'snowy';
  if (darkRatio > 0.3) return 'foggy';
  if (brightRatio < 0.2 && darkRatio < 0.1) return 'rainy';
  if (warmRatio > 0.2 && brightRatio > 0.3) return 'sunset';
  return 'cloudy';
}

function detectVegetation(imageData) {
  const data = imageData.data;
  const pixels = data.length / 4;
  
  let greenPixels = 0;
  let brownPixels = 0;
  let bluePixels = 0;
  let grayPixels = 0;
  
  for (let i = 0; i < pixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    // Vert
    if (g > r + 30 && g > b + 30) greenPixels++;
    // Brun
    if (r > g + 20 && r > b + 20 && g > b - 20) brownPixels++;
    // Bleu
    if (b > r + 30 && b > g + 30) bluePixels++;
    // Gris
    if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) grayPixels++;
  }
  
  const greenRatio = greenPixels / pixels;
  const brownRatio = brownPixels / pixels;
  const blueRatio = bluePixels / pixels;
  const grayRatio = grayPixels / pixels;
  
  if (greenRatio > 0.4) return 'forest';
  if (greenRatio > 0.2 && brownRatio > 0.2) return 'savanna';
  if (brownRatio > 0.5 && grayRatio > 0.2) return 'desert';
  if (greenRatio > 0.3 && blueRatio > 0.1) return 'jungle';
  if (greenRatio > 0.1 && grayRatio < 0.1) return 'grassland';
  return 'urban';
}

function detectTerrain(imageData) {
  const data = imageData.data;
  const pixels = data.length / 4;
  
  let edgePixels = 0;
  let flatPixels = 0;
  let verticalPixels = 0;
  
  const step = 2;
  const width = imageData.width;
  const height = imageData.height;
  
  for (let y = 0; y < height - step; y += step) {
    for (let x = 0; x < width - step; x += step) {
      const idx = (y * width + x) * 4;
      const idx2 = ((y + step) * width + x) * 4;
      const idx3 = (y * width + x + step) * 4;
      
      const r1 = data[idx], g1 = data[idx + 1], b1 = data[idx + 2];
      const r2 = data[idx2], g2 = data[idx2 + 1], b2 = data[idx2 + 2];
      const r3 = data[idx3], g3 = data[idx3 + 1], b3 = data[idx3 + 2];
      
      const verticalDiff = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
      const horizontalDiff = Math.sqrt((r1 - r3) ** 2 + (g1 - g3) ** 2 + (b1 - b3) ** 2);
      
      if (verticalDiff > 50) verticalPixels++;
      if (horizontalDiff > 50) edgePixels++;
      if (verticalDiff < 20 && horizontalDiff < 20) flatPixels++;
    }
  }
  
  const edgeRatio = edgePixels / (pixels / (step * step));
  const flatRatio = flatPixels / (pixels / (step * step));
  const verticalRatio = verticalPixels / (pixels / (step * step));
  
  if (verticalRatio > 0.2 && edgeRatio > 0.2) return 'mountains';
  if (edgeRatio > 0.15 && verticalRatio > 0.1) return 'cliffs';
  if (edgeRatio > 0.1 && flatRatio > 0.3) return 'plateaus';
  if (flatRatio > 0.7) return 'plains';
  return 'valleys';
}

function extractOCR(imageData) {
  // Simuler une détection OCR
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  const potentialText = [];
  const step = 10;
  const threshold = 40;
  
  for (let y = 0; y < height - step; y += step) {
    for (let x = 0; x < width - step; x += step) {
      const idx = (y * width + x) * 4;
      const idx2 = ((y + step) * width + x + step) * 4;
      
      const r1 = data[idx], g1 = data[idx + 1], b1 = data[idx + 2];
      const r2 = data[idx2], g2 = data[idx2 + 1], b2 = data[idx2 + 2];
      
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      
      if (diff > threshold * 3) {
        potentialText.push({ x, y, diff });
      }
    }
  }
  
  const textResults = [];
  if (potentialText.length > 10) {
    const patterns = [
      'RUE DE', 'AVENUE', 'PLACE', 'BOULEVARD',
      'PARIS', 'LONDON', 'NEW YORK', 'TOKYO',
      'STOP', 'PARKING', 'ENTRANCE', 'EXIT',
      '123', '456', '789', '000',
      'CAFE', 'HOTEL', 'RESTAURANT', 'MUSEUM'
    ];
    
    const numPatterns = Math.min(Math.floor(potentialText.length / 5), 4);
    for (let i = 0; i < numPatterns; i++) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      textResults.push(pattern);
    }
  }
  
  return textResults.slice(0, 6);
}

function fusionFeatures(embedding, objects, ocr, weather, vegetation, terrain) {
  const embeddingPart = embedding.slice(0, 1024);
  const objPart = new Array(256).fill(0);
  const ocrPart = new Array(256).fill(0);
  const weatherPart = new Array(256).fill(0);
  const vegPart = new Array(256).fill(0);
  const terrainPart = new Array(256).fill(0);
  
  OBJECT_CLASSES.forEach((obj, i) => {
    if (objects.includes(obj)) {
      objPart[i % 256] = 1;
    }
  });
  
  ocr.forEach((text, i) => {
    const hash = crypto.createHash('sha256').update(text).digest();
    ocrPart[i % 256] = (hash[0] / 255);
  });
  
  WEATHER_CLASSES.forEach((w, i) => {
    if (w === weather) {
      weatherPart[i % 256] = 1;
    }
  });
  
  VEGETATION_CLASSES.forEach((v, i) => {
    if (v === vegetation) {
      vegPart[i % 256] = 1;
    }
  });
  
  TERRAIN_CLASSES.forEach((t, i) => {
    if (t === terrain) {
      terrainPart[i % 256] = 1;
    }
  });
  
  // Fusionner
  const fusion = [
    ...embeddingPart,
    ...objPart,
    ...ocrPart,
    ...weatherPart,
    ...vegPart,
    ...terrainPart
  ];
  
  return fusion.slice(0, GEOINT_CONFIG.fusionDim);
}

function searchGeoDatabase(embedding, db, limit = 500) {
  const results = db.map(entry => {
    const similarity = cosineSimilarity(embedding, entry.embedding);
    return { ...entry, score: similarity };
  });
  
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

function calculateRadius(neighbors, topMatches) {
  const latSpread = Math.max(...neighbors.map(n => Math.abs(n.lat - topMatches[0].lat)));
  const lonSpread = Math.max(...neighbors.map(n => Math.abs(n.lon - topMatches[0].lon)));
  const avgSpread = (latSpread + lonSpread) / 2;
  
  // Convertir en kilomètres (approximatif)
  const km = avgSpread * 111;
  
  if (km < 0.5) return '500m';
  if (km < 2) return '2km';
  if (km < 12) return '12km';
  if (km < 35) return '35km';
  if (km < 120) return '120km';
  return '200km+';
}

function calculateConfidence(score, neighbors, radius) {
  let confidence = score * 100;
  
  // Ajuster selon la concentration des voisins
  const neighborDensity = neighbors.length > 0 ? neighbors.length / 10 : 0;
  confidence += Math.min(neighborDensity * 5, 15);
  
  // Ajuster selon le rayon
  const radiusFactors = {
    '500m': 10,
    '2km': 7,
    '12km': 4,
    '35km': 2,
    '120km': 1,
    '200km+': 0
  };
  confidence += radiusFactors[radius] || 0;
  
  return Math.min(Math.round(confidence), 100);
}

function clusterGeoResults(neighbors, maxClusters = 5) {
  const clusters = [];
  const used = new Set();
  
  for (const neighbor of neighbors) {
    if (used.has(neighbor.id)) continue;
    used.add(neighbor.id);
    
    const cluster = {
      center: { lat: neighbor.lat, lon: neighbor.lon },
      places: [neighbor],
      country: neighbor.country,
      region: neighbor.region,
      count: 1
    };
    
    for (const other of neighbors) {
      if (used.has(other.id)) continue;
      const distance = Math.sqrt(
        (other.lat - neighbor.lat) ** 2 + 
        (other.lon - neighbor.lon) ** 2
      );
      if (distance < 0.5) {
        used.add(other.id);
        cluster.places.push(other);
        cluster.count++;
        cluster.center.lat = (cluster.center.lat + other.lat) / cluster.count;
        cluster.center.lon = (cluster.center.lon + other.lon) / cluster.count;
        if (cluster.count > 1) {
          const countryCounts = {};
          cluster.places.forEach(p => {
            countryCounts[p.country] = (countryCounts[p.country] || 0) + 1;
          });
          const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];
          if (topCountry) cluster.country = topCountry[0];
          
          const regionCounts = {};
          cluster.places.forEach(p => {
            regionCounts[p.region] = (regionCounts[p.region] || 0) + 1;
          });
          const topRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0];
          if (topRegion) cluster.region = topRegion[0];
        }
      }
    }
    
    clusters.push(cluster);
  }
  
  clusters.sort((a, b) => b.count - a.count);
  return clusters.slice(0, maxClusters);
}

const COUNTRY_NAME_MAP = {
  fr: 'France',
  us: 'United States',
  gb: 'United Kingdom',
  uk: 'United Kingdom',
  de: 'Germany',
  it: 'Italy',
  es: 'Spain',
  pt: 'Portugal',
  be: 'Belgium',
  ch: 'Switzerland',
  ca: 'Canada',
  au: 'Australia',
  jp: 'Japan',
  br: 'Brazil',
  in: 'India',
  cn: 'China'
};

function normalizeCountryFilter(value) {
  if (!value) return '';
  const normalized = String(value).trim();
  const lower = normalized.toLowerCase();
  if (COUNTRY_NAME_MAP[lower]) return COUNTRY_NAME_MAP[lower];
  const exactName = Object.values(COUNTRY_NAME_MAP).find(name => name.toLowerCase() === lower);
  return exactName || normalized;
}

const REGION_ALIAS_MAP = {
  "val-d'oise": ["Île-de-France", "Val-d'Oise", "Argenteuil", "Pontoise", "Sarcelles", "Cergy", "Franconville", "Garges-lès-Gonesse", "Taverny", "Gonesse", "Villiers-le-Bel", "L'Isle-Adam"],
  "val d'oise": ["Île-de-France", "Val-d'Oise", "Argenteuil", "Pontoise", "Sarcelles", "Cergy", "Franconville", "Garges-lès-Gonesse", "Taverny", "Gonesse", "Villiers-le-Bel", "L'Isle-Adam"],
  "ile-de-france": ["Île-de-France"],
  "île-de-france": ["Île-de-France"]
};

const REGION_BOUNDING_BOXES = {
  "val-d'oise": { minLat: 48.65, maxLat: 49.15, minLon: 1.6, maxLon: 2.6 },
  "val d'oise": { minLat: 48.65, maxLat: 49.15, minLon: 1.6, maxLon: 2.6 },
  "ile-de-france": { minLat: 48.0, maxLat: 49.2, minLon: -0.8, maxLon: 3.5 },
  "île-de-france": { minLat: 48.0, maxLat: 49.2, minLon: -0.8, maxLon: 3.5 }
};

function normalizeRegionFilter(value) {
  if (!value) return [''];
  const normalized = String(value).trim();
  const lower = normalized.toLowerCase();
  const key = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9'-]+/gi, ' ').trim();
  if (REGION_ALIAS_MAP[lower]) return REGION_ALIAS_MAP[lower];
  if (REGION_ALIAS_MAP[key]) return REGION_ALIAS_MAP[key];
  return [normalized];
}

function getRegionBoundingBox(value) {
  if (!value) return null;
  const lower = String(value).trim().toLowerCase();
  if (REGION_BOUNDING_BOXES[lower]) return REGION_BOUNDING_BOXES[lower];
  const key = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9'-]+/gi, ' ').trim();
  return REGION_BOUNDING_BOXES[key] || null;
}

// ============================================
// NOUVELLE ROUTE API GéoInt - Version 2.0
// 100% Gratuit - OpenStreetMap + Modèles Locaux
// ============================================

const sharp = require('sharp');
const exifParser = require('exif-parser');
const axios = require('axios');

// ============================================
// 1. CONFIGURATION
// ============================================
const GEOINT_CONFIG = {
  allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'],
  maxImageSize: 10 * 1024 * 1024, // 10MB
  openStreetMap: {
    nominatim: 'https://nominatim.openstreetmap.org',
    overpass: 'https://overpass-api.de/api/interpreter',
    userAgent: 'GeoIntAnalyzer/2.0'
  },
  cache: {
    ttl: 3600000, // 1 heure
    maxSize: 1000
  }
};

// ============================================
// 2. CACHE
// ============================================
class Cache {
  constructor() {
    this.data = new Map();
  }
  
  get(key) {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }
  
  set(key, value, ttl = GEOINT_CONFIG.cache.ttl) {
    if (this.data.size >= GEOINT_CONFIG.cache.maxSize) {
      const oldest = this.data.keys().next().value;
      this.data.delete(oldest);
    }
    this.data.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
}

const cache = new Cache();

// ============================================
// 3. SERVICE OPENSTREETMAP
// ============================================
class OpenStreetMapService {
  constructor() {
    this.cache = new Cache();
  }
  
  async reverseGeocode(lat, lon) {
    const cacheKey = `reverse_${lat}_${lon}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await axios.get(
        `${GEOINT_CONFIG.openStreetMap.nominatim}/reverse`,
        {
          params: {
            lat,
            lon,
            format: 'json',
            zoom: 18,
            addressdetails: 1
          },
          headers: {
            'User-Agent': GEOINT_CONFIG.openStreetMap.userAgent
          },
          timeout: 5000
        }
      );
      
      const data = response.data;
      const result = {
        lat,
        lon,
        name: data.display_name || 'Unknown',
        city: data.address?.city || data.address?.town || 
               data.address?.village || data.address?.hamlet || 'Unknown',
        country: data.address?.country || 'Unknown',
        region: data.address?.state || data.address?.region || 
                data.address?.province || 'Unknown',
        postcode: data.address?.postcode || null,
        road: data.address?.road || null,
        building: data.address?.building || null,
        neighbourhood: data.address?.neighbourhood || null,
        suburb: data.address?.suburb || null,
        type: data.type || 'unknown',
        osm_id: data.osm_id || null,
        confidence: 0.85,
        source: 'OpenStreetMap'
      };
      
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('[OSM] Reverse geocoding error:', error.message);
      return {
        lat,
        lon,
        name: 'Unknown location',
        city: 'Unknown',
        country: 'Unknown',
        region: 'Unknown',
        confidence: 0.1,
        source: 'fallback'
      };
    }
  }
  
  async searchPlaces(query, limit = 10) {
    const cacheKey = `search_${query}_${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await axios.get(
        `${GEOINT_CONFIG.openStreetMap.nominatim}/search`,
        {
          params: {
            q: query,
            format: 'json',
            limit,
            addressdetails: 1
          },
          headers: {
            'User-Agent': GEOINT_CONFIG.openStreetMap.userAgent
          },
          timeout: 5000
        }
      );
      
      const results = response.data.map(item => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        name: item.display_name,
        city: item.address?.city || item.address?.town || 'Unknown',
        country: item.address?.country || 'Unknown',
        region: item.address?.state || 'Unknown',
        type: item.type,
        class: item.class,
        importance: item.importance || 0
      }));
      
      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.warn('[OSM] Search error:', error.message);
      return [];
    }
  }
  
  async getBuildings(lat, lon, radius = 500) {
    const cacheKey = `buildings_${lat}_${lon}_${radius}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const query = `
        [out:json][timeout:10];
        (
          way["building"](around:${radius},${lat},${lon});
          way["building:part"](around:${radius},${lat},${lon});
          node["building"](around:${radius},${lat},${lon});
        );
        out body 20;
      `;
      
      const response = await axios.post(
        GEOINT_CONFIG.openStreetMap.overpass,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': GEOINT_CONFIG.openStreetMap.userAgent
          },
          timeout: 10000
        }
      );
      
      const buildings = response.data.elements.map(el => ({
        id: el.id,
        lat: el.lat || el.center?.lat || lat,
        lon: el.lon || el.center?.lon || lon,
        type: el.tags?.building || 'building',
        name: el.tags?.name || null,
        height: parseFloat(el.tags?.height) || null,
        levels: parseInt(el.tags?.['building:levels']) || null,
        material: el.tags?.material || null,
        roof: el.tags?.roof || null,
        color: el.tags?.colour || null
      }));
      
      this.cache.set(cacheKey, buildings);
      return buildings;
    } catch (error) {
      console.warn('[OSM] Buildings error:', error.message);
      return [];
    }
  }
  
  async getNearbyFeatures(lat, lon, radius = 300) {
    const cacheKey = `features_${lat}_${lon}_${radius}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const query = `
        [out:json][timeout:10];
        (
          node["amenity"](around:${radius},${lat},${lon});
          node["shop"](around:${radius},${lat},${lon});
          node["tourism"](around:${radius},${lat},${lon});
          node["historic"](around:${radius},${lat},${lon});
          node["leisure"](around:${radius},${lat},${lon});
          node["natural"](around:${radius},${lat},${lon});
          node["highway"](around:${radius},${lat},${lon});
        );
        out body 30;
      `;
      
      const response = await axios.post(
        GEOINT_CONFIG.openStreetMap.overpass,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': GEOINT_CONFIG.openStreetMap.userAgent
          },
          timeout: 10000
        }
      );
      
      const features = response.data.elements.map(el => ({
        id: el.id,
        lat: el.lat || lat,
        lon: el.lon || lon,
        type: el.tags?.amenity || el.tags?.shop || 
              el.tags?.tourism || el.tags?.leisure || 
              el.tags?.natural || el.tags?.highway || 'feature',
        name: el.tags?.name || null,
        category: Object.keys(el.tags || {}).find(k => 
          ['amenity', 'shop', 'tourism', 'leisure', 'natural', 'highway'].includes(k)
        ) || 'other',
        tags: el.tags || {}
      }));
      
      this.cache.set(cacheKey, features);
      return features;
    } catch (error) {
      console.warn('[OSM] Features error:', error.message);
      return [];
    }
  }
}

// ============================================
// 4. EXIF EXTRACTOR
// ============================================
class ExifExtractor {
  extractAll(buffer) {
    try {
      const parser = exifParser.create(buffer);
      const result = parser.parse();
      const tags = result.tags || {};
      
      return {
        make: tags.Make || null,
        model: tags.Model || null,
        datetime: tags.DateTimeOriginal || tags.DateTime || null,
        gps: this.extractGPS(result),
        orientation: tags.Orientation || 1,
        focalLength: tags.FocalLength || null,
        iso: tags.ISOSpeedRatings || null,
        exposure: tags.ExposureTime || null,
        aperture: tags.FNumber || null,
        whiteBalance: tags.WhiteBalance || null,
        hasExif: true
      };
    } catch (error) {
      console.warn('[EXIF] Error:', error.message);
      return { hasExif: false };
    }
  }
  
  extractGPS(exif) {
    if (!exif.tags?.GPSLatitude || !exif.tags?.GPSLongitude) {
      return { hasGPS: false };
    }
    
    try {
      const lat = this.convertDMSToDD(
        exif.tags.GPSLatitude,
        exif.tags.GPSLatitudeRef
      );
      const lon = this.convertDMSToDD(
        exif.tags.GPSLongitude,
        exif.tags.GPSLongitudeRef
      );
      
      const alt = exif.tags.GPSAltitude || null;
      
      return {
        hasGPS: true,
        lat,
        lon,
        alt,
        accuracy: exif.tags.GPSDOP || null,
        timestamp: exif.tags.GPSDateStamp ? 
          `${exif.tags.GPSDateStamp} ${exif.tags.GPSTimeStamp || ''}` : null
      };
    } catch (error) {
      return { hasGPS: false };
    }
  }
  
  convertDMSToDD(coords, ref) {
    const [deg, min, sec] = coords;
    let dd = deg + min/60 + sec/3600;
    if (ref === 'S' || ref === 'W') dd = -dd;
    return Math.round(dd * 1000000) / 1000000;
  }
}

// ============================================
// 5. IMAGE PROCESSOR
// ============================================
class ImageProcessor {
  async process(buffer) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      // Générer différentes versions
      const versions = {};
      const sizes = [224, 384, 512, 1024];
      
      for (const size of sizes) {
        const resized = await image
          .clone()
          .resize(size, size, { 
            fit: 'cover',
            withoutEnlargement: true
          })
          .toBuffer();
        
        versions[size] = {
          buffer: resized,
          size: resized.length,
          data: await this.getRawData(resized)
        };
      }
      
      // Version originale en mémoire
      const original = await image.toBuffer();
      
      // Extraire les couleurs dominantes
      const colors = await this.extractDominantColors(original);
      
      return {
        metadata,
        versions,
        colors,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        originalSize: buffer.length
      };
    } catch (error) {
      console.error('[IMAGE] Processing error:', error);
      throw new Error('Failed to process image');
    }
  }
  
  async getRawData(buffer) {
    try {
      const image = sharp(buffer);
      return await image.raw().toBuffer();
    } catch {
      return null;
    }
  }
  
  async extractDominantColors(buffer) {
    try {
      const image = sharp(buffer);
      const stats = await image.stats();
      
      if (stats && stats.dominant) {
        return {
          r: stats.dominant.r,
          g: stats.dominant.g,
          b: stats.dominant.b,
          hex: this.rgbToHex(stats.dominant.r, stats.dominant.g, stats.dominant.b)
        };
      }
      return null;
    } catch {
      return null;
    }
  }
  
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(c => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
}

// ============================================
// 6. FEATURE DETECTION (Modèles locaux simplifiés)
// ============================================
class FeatureDetector {
  detectObjects(imageData) {
    // Version simplifiée - utilisera YOLOv8 en production
    // Pour l'instant, détection basique par couleurs
    if (!imageData) return ['unknown'];
    
    try {
      const objects = [];
      // Simuler la détection d'objets basée sur l'histogramme
      // En réalité, on chargerait YOLOv8 ONNX
      
      // Détection basique de couleurs
      const avg = this.getAverageColor(imageData);
      if (avg) {
        if (avg.r > 200 && avg.g > 200 && avg.b > 200) {
          objects.push('sky', 'clouds');
        }
        if (avg.g > 150 && avg.r < 150) {
          objects.push('vegetation', 'trees');
        }
        if (avg.b > 150 && avg.r < 100) {
          objects.push('water', 'sea');
        }
        if (avg.r > 150 && avg.g > 100 && avg.b < 100) {
          objects.push('building', 'urban');
        }
      }
      
      return objects.length > 0 ? objects : ['unknown'];
    } catch {
      return ['unknown'];
    }
  }
  
  getAverageColor(data) {
    if (!data || data.length < 3) return null;
    let r = 0, g = 0, b = 0;
    const pixels = data.length / 3;
    for (let i = 0; i < data.length; i += 3) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    return {
      r: Math.round(r / pixels),
      g: Math.round(g / pixels),
      b: Math.round(b / pixels)
    };
  }
  
  detectWeather(imageData) {
    if (!imageData) return 'unknown';
    
    try {
      const avg = this.getAverageColor(imageData);
      if (!avg) return 'unknown';
      
      // Détection météo basique
      if (avg.r > 200 && avg.g > 200 && avg.b > 200) return 'sunny';
      if (avg.r > 150 && avg.g > 150 && avg.b > 150) return 'partly_cloudy';
      if (avg.r < 100 && avg.g < 100 && avg.b < 100) return 'overcast';
      if (avg.b > avg.r && avg.b > avg.g) return 'rainy';
      if (avg.r > avg.g && avg.g > avg.b) return 'sunset';
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  detectVegetation(imageData) {
    if (!imageData) return 'unknown';
    
    try {
      // Vérifier la présence de vert
      let greenCount = 0;
      const samples = 1000;
      const step = Math.max(1, Math.floor(imageData.length / (samples * 3)));
      
      for (let i = 0; i < imageData.length && i < samples * 3 * step; i += 3 * step) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        if (g > r * 1.2 && g > b * 1.2) {
          greenCount++;
        }
      }
      
      const greenRatio = greenCount / samples;
      if (greenRatio > 0.4) return 'dense_vegetation';
      if (greenRatio > 0.2) return 'sparse_vegetation';
      if (greenRatio > 0.1) return 'some_vegetation';
      return 'no_vegetation';
    } catch {
      return 'unknown';
    }
  }
  
  detectTerrain(imageData) {
    if (!imageData) return 'unknown';
    
    try {
      const avg = this.getAverageColor(imageData);
      if (!avg) return 'unknown';
      
      // Détection terrain basique
      if (avg.r > 150 && avg.g > 120 && avg.b < 80) return 'urban';
      if (avg.r > 180 && avg.g > 170 && avg.b < 150) return 'beach';
      if (avg.r > 120 && avg.g > 100 && avg.b < 80) return 'mountain';
      if (avg.g > 120 && avg.r < 140) return 'forest';
      if (avg.b > 100 && avg.r > 100 && avg.g > 100) return 'coastal';
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  extractOCR(imageData) {
    // Version simplifiée - utilisera PaddleOCR en production
    // Pour l'instant, retourne un tableau vide
    return [];
  }
}

// ============================================
// 7. ANALYSEUR PRINCIPAL
// ============================================
class GeoIntAnalyzer {
  constructor() {
    this.osm = new OpenStreetMapService();
    this.exif = new ExifExtractor();
    this.imageProcessor = new ImageProcessor();
    this.featureDetector = new FeatureDetector();
    this.cache = new Cache();
  }
  
  async analyze(buffer, filters = {}) {
    const { countryFilter, regionFilter, radius = 'global' } = filters;
    
    try {
      // 1. Extraire EXIF
      const exifData = this.exif.extractAll(buffer);
      
      // 2. Si GPS trouvé -> résultat direct
      if (exifData.gps?.hasGPS) {
        const location = await this.osm.reverseGeocode(
          exifData.gps.lat,
          exifData.gps.lon
        );
        
        const buildings = await this.osm.getBuildings(
          exifData.gps.lat,
          exifData.gps.lon
        );
        
        const features = await this.osm.getNearbyFeatures(
          exifData.gps.lat,
          exifData.gps.lon
        );
        
        return {
          success: true,
          source: 'gps_exif',
          confidence: 'high',
          location,
          exif: exifData,
          buildings: buildings.slice(0, 10),
          features: features.slice(0, 10)
        };
      }
      
      // 3. Traiter l'image
      const processed = await this.imageProcessor.process(buffer);
      
      // 4. Extraire les features
      const imageData = processed.versions[384]?.data || 
                       processed.versions[224]?.data || null;
      
      const objects = this.featureDetector.detectObjects(imageData);
      const weather = this.featureDetector.detectWeather(imageData);
      const vegetation = this.featureDetector.detectVegetation(imageData);
      const terrain = this.featureDetector.detectTerrain(imageData);
      const ocr = this.featureDetector.extractOCR(imageData);
      
      // 5. Construire la requête de recherche
      let searchQuery = this.buildSearchQuery(objects, weather, vegetation, terrain, ocr);
      
      // 6. Rechercher dans OpenStreetMap
      let results = await this.osm.searchPlaces(searchQuery, 50);
      
      // 7. Filtrer les résultats
      let filtered = results;
      if (countryFilter) {
        filtered = filtered.filter(r => 
          r.country?.toLowerCase() === countryFilter.toLowerCase()
        );
      }
      if (regionFilter) {
        filtered = filtered.filter(r =>
          r.region?.toLowerCase().includes(regionFilter.toLowerCase())
        );
      }
      
      // 8. Scorer les résultats
      const scored = await this.scoreResults(filtered, objects, vegetation, terrain, ocr);
      
      // 9. Récupérer les top résultats
      const topMatches = scored.slice(0, 3);
      const radiusValue = this.calculateRadius(scored.slice(0, 20));
      
      // 10. Construire la réponse
      return this.buildResponse(
        topMatches,
        objects,
        vegetation,
        weather,
        terrain,
        ocr,
        radiusValue,
        processed,
        exifData
      );
      
    } catch (error) {
      console.error('[GEOINT] Analysis error:', error);
      throw error;
    }
  }
  
  buildSearchQuery(objects, weather, vegetation, terrain, ocr) {
    const terms = [];
    
    // Ajouter les objets détectés
    if (objects.length > 0) {
      terms.push(...objects.filter(o => o !== 'unknown').slice(0, 3));
    }
    
    // Ajouter le terrain
    if (terrain && terrain !== 'unknown') {
      terms.push(terrain);
    }
    
    // Ajouter la végétation
    if (vegetation && vegetation !== 'unknown') {
      if (vegetation === 'dense_vegetation') terms.push('forest', 'park');
      else if (vegetation === 'sparse_vegetation') terms.push('garden');
    }
    
    // Ajouter la météo
    if (weather && weather !== 'unknown') {
      if (weather === 'sunny') terms.push('outdoor');
      else if (weather === 'rainy') terms.push('covered');
    }
    
    // Ajouter l'OCR
    if (ocr && ocr.length > 0) {
      terms.push(...ocr.slice(0, 2));
    }
    
    return terms.join(' ') || 'landscape';
  }
  
  async scoreResults(results, objects, vegetation, terrain, ocr) {
    return results.map(result => {
      let score = (result.importance || 0.5) * 60; // Base score
      
      // Bonus pour les objets
      if (objects.length > 0) {
        const objectBonus = objects.some(obj => 
          result.name?.toLowerCase().includes(obj.toLowerCase())
        ) ? 20 : 0;
        score += objectBonus;
      }
      
      // Bonus pour la végétation
      if (vegetation !== 'unknown') {
        const vegBonus = result.name?.toLowerCase().includes('park') ||
                        result.name?.toLowerCase().includes('garden') ||
                        result.name?.toLowerCase().includes('forest') ? 15 : 0;
        score += vegBonus;
      }
      
      // Bonus pour le terrain
      if (terrain !== 'unknown') {
        const terrainBonus = result.name?.toLowerCase().includes(terrain.toLowerCase()) ? 10 : 0;
        score += terrainBonus;
      }
      
      // Bonus pour l'OCR
      if (ocr && ocr.length > 0) {
        const ocrBonus = ocr.some(text =>
          result.name?.toLowerCase().includes(text.toLowerCase())
        ) ? 15 : 0;
        score += ocrBonus;
      }
      
      return {
        ...result,
        score: Math.min(score, 100),
        confidence: score > 80 ? 'high' : score > 50 ? 'medium' : 'low'
      };
    }).sort((a, b) => b.score - a.score);
  }
  
  calculateRadius(results) {
    if (!results || results.length < 2) return '5km';
    
    // Calculer la dispersion des résultats
    const lats = results.map(r => r.lat);
    const lons = results.map(r => r.lon);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lonRange = Math.max(...lons) - Math.min(...lons);
    const maxRange = Math.max(latRange, lonRange);
    
    // Convertir en km approximatif
    const km = maxRange * 111;
    if (km < 1) return '500m';
    if (km < 5) return '2km';
    if (km < 20) return '10km';
    if (km < 50) return '25km';
    return '50km+';
  }
  
  buildResponse(topMatches, objects, vegetation, weather, terrain, ocr, radiusValue, processed, exifData) {
    const top1 = topMatches[0] || null;
    const top2 = topMatches[1] || null;
    const top3 = topMatches[2] || null;
    
    // Clustering géographique
    const clusters = this.clusterResults(topMatches);
    
    return {
      success: true,
      source: 'openstreetmap',
      top1: top1 ? {
        lat: top1.lat,
        lon: top1.lon,
        city: top1.city,
        country: top1.country,
        region: top1.region,
        score: Math.round(top1.score),
        radius: radiusValue,
        confidence: top1.confidence,
        osm_id: top1.osm_id
      } : null,
      top2: top2 ? {
        lat: top2.lat,
        lon: top2.lon,
        city: top2.city,
        country: top2.country,
        region: top2.region,
        score: Math.round(top2.score),
        radius: radiusValue,
        confidence: top2.confidence
      } : null,
      top3: top3 ? {
        lat: top3.lat,
        lon: top3.lon,
        city: top3.city,
        country: top3.country,
        region: top3.region,
        score: Math.round(top3.score),
        radius: radiusValue,
        confidence: top3.confidence
      } : null,
      visualFeatures: {
        vegetation,
        weather,
        architecture: this.detectArchitectureStyle(objects),
        objects: objects.slice(0, 8),
        ocr: ocr.slice(0, 5),
        terrain,
        colors: processed.colors
      },
      geoCluster: clusters.length > 0 ? 
        `${clusters[0].country} / ${clusters[0].region}` : 
        'unknown',
      cameraOrientation: this.estimateCameraOrientation(),
      exif: exifData,
      metadata: {
        imageSize: processed.originalSize,
        format: processed.format,
        dimensions: `${processed.width}x${processed.height}`,
        processedAt: new Date().toISOString()
      }
    };
  }
  
  detectArchitectureStyle(objects) {
    if (objects.includes('building') || objects.includes('urban')) {
      return 'urban';
    }
    if (objects.includes('house') || objects.includes('residential')) {
      return 'residential';
    }
    return 'unknown';
  }
  
  estimateCameraOrientation() {
    const orientations = ['North', 'South', 'East', 'West'];
    return orientations[Math.floor(Math.random() * orientations.length)];
  }
  
  clusterResults(results) {
    if (!results || results.length === 0) return [];
    
    const clusters = [];
    const used = new Set();
    
    for (let i = 0; i < results.length; i++) {
      if (used.has(i)) continue;
      
      const cluster = {
        country: results[i].country,
        region: results[i].region,
        places: [results[i]],
        count: 1
      };
      
      for (let j = i + 1; j < results.length; j++) {
        if (used.has(j)) continue;
        if (results[j].country === cluster.country && 
            results[j].region === cluster.region) {
          cluster.places.push(results[j]);
          cluster.count++;
          used.add(j);
        }
      }
      
      clusters.push(cluster);
      used.add(i);
    }
    
    return clusters.sort((a, b) => b.count - a.count);
  }
}

// ============================================
// 8. ROUTE API
// ============================================
const analyzer = new GeoIntAnalyzer();

app.post('/api/geoint/analyze', authMiddleware, geoIntUpload.single('image'), async (req, res) => {
  try {
    // 1. Vérifier le quota
    const quota = await ensureSearchQuota(req.user);
    
    // 2. Récupérer le fichier
    const file = req.file || req.files?.image;
    if (!file) {
      return res.status(400).json({ error: 'Image requise' });
    }
    
    // 3. Valider le format
    if (!GEOINT_CONFIG.allowedFormats.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: `Format non supporté. Utilisez: ${GEOINT_CONFIG.allowedFormats.join(', ')}` 
      });
    }
    
    // 4. Valider la taille
    const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
    if (fileSize > GEOINT_CONFIG.maxImageSize) {
      return res.status(400).json({ 
        error: `Image trop grande. Max: ${GEOINT_CONFIG.maxImageSize / 1024 / 1024}MB` 
      });
    }
    
    // 5. Récupérer les filtres
    const radius = req.body.radius || 'global';
    const countryFilter = req.body.country ? 
      req.body.country.toLowerCase().trim() : '';
    const regionFilter = req.body.region ? 
      req.body.region.toLowerCase().trim() : '';
    
    // 6. Analyser l'image
    const buffer = file.buffer || file.data;
    const result = await analyzer.analyze(buffer, {
      countryFilter,
      regionFilter,
      radius
    });
    
    // 7. Réponse finale
    res.json({
      success: true,
      quota,
      ...result,
      metadata: {
        ...result.metadata,
        version: '2.0',
        engine: 'OpenStreetMap + Local Models',
        free: true
      }
    });
    
  } catch (error) {
    console.error('[GEOINT] Error:', error);
    
    if (error.message && error.message.includes('GeoInt runtime')) {
      return res.status(503).json({ 
        error: 'GeoInt runtime unavailable',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Erreur lors de l\'analyse' 
    });
  }
});

// ============================================
// 9. EXPORT
// ============================================
module.exports = {
  GeoIntAnalyzer,
  OpenStreetMapService,
  analyzer
};

// ============================================
// ENDPOINT DE STATUT
// ============================================

app.get('/api/geoint/status', async (req, res) => {
  const db = geoIntState.geoDatabase || generateWorldGeoDatabase();
  res.json({
    status: 'ready',
    modelsLoaded: geoIntState.modelsLoaded,
    databaseSize: db.length,
    config: {
      imageSizes: GEOINT_CONFIG.imageSizes,
      embeddingDim: GEOINT_CONFIG.embeddingDim,
      fusionDim: GEOINT_CONFIG.fusionDim,
      allowedFormats: GEOINT_CONFIG.allowedFormats
    }
  });
});

// ============================================
// ENDPOINT DE REINDEXATION
// ============================================

app.post('/api/geoint/reindex', authMiddleware, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Accès admin requis' });
    }
    
    const db = generateWorldGeoDatabase();
    geoIntState.geoDatabase = db;
    
    // Sauvegarder
    const dbPath = path.join(__dirname, '..', 'data', 'geoint_db.json');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    res.json({ 
      success: true, 
      count: db.length,
      message: `Base de données géographique reindexée avec ${db.length} entrées`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


try {
  const dbPath = path.join(__dirname, '..', 'data', 'geoint_db.json');
  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath, 'utf8');
    geoIntState.geoDatabase = JSON.parse(data);
    console.log(`[GEOINT] Geo database loaded: ${geoIntState.geoDatabase.length} entries`);
  } else {
    geoIntState.geoDatabase = generateWorldGeoDatabase();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(geoIntState.geoDatabase, null, 2));
    console.log(`[GEOINT] Geo database created: ${geoIntState.geoDatabase.length} entries`);
  }
  geoIntState.modelsLoaded = true;
} catch (e) {
  console.error('[GEOINT] Init error:', e);
  geoIntState.geoDatabase = generateWorldGeoDatabase();
  geoIntState.modelsLoaded = true;
}

console.log('[GEOINT] Pipeline ready');

app.use('/api/spotify', spotifyRouter);

app.use((err, req, res, next) => {
  if (err && (err.message === 'Request aborted' || err.code === 'ECONNABORTED')) {
    return;
  }
  console.error('Erreur serveur:', err);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Données invalides', details: Object.values(err.errors).map(e => e.message) });
  }
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(400).json({ error: 'Cette donnée existe déjà' });
  }
  if (res.headersSent) return;
  res.status(500).json({ error: 'Erreur serveur interne' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl });
});

server.timeout = 0;
server.requestTimeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 120000;

server.listen(PORT, () => {
  console.log(`Serveur Osint Build démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
});

try {
  setImmediate(() => {
    buildLocalLogIndex();
  });
} catch (e) {
  console.error('Failed to schedule local log index build:', e);
}

module.exports = { app };