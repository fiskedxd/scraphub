const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const BannedIP = require('../models/BannedIP');

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE = 'scraphub_session';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
}

const normalizeIp = (rawIp) => {
  if (!rawIp) return '';
  let ip = String(rawIp).trim();

  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  return ip;
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const candidate = forwarded || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  return normalizeIp(candidate);
};

const getAuthCookie = (req) => {
  const header = req.headers.cookie || '';
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(AUTH_COOKIE.length + 1)) : null;
};

let lastMongoUnavailableLogAt = 0;
function isMongoConnected() {
  return mongoose.connection?.readyState === 1;
}

function logMongoUnavailableOncePerMinute() {
  const now = Date.now();
  if (now - lastMongoUnavailableLogAt >= 60000) {
    console.warn('⚠️ MongoDB indisponible: vérification de ban IP ignorée temporairement.');
    lastMongoUnavailableLogAt = now;
  }
}


const authenticateToken = async (req, res, next) => {
  const token = getAuthCookie(req);

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur invalide' });
    }

    if (user.isActive === false || user.security?.accountBan?.isBanned) {
      return res.status(403).json({
        error: 'account_banned',
        message: 'Ce compte est banni.',
        action: 'reload',
        banned: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};


const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    next();
  };
};


const checkIP = async (req, res, next) => {
  const clientIP = getClientIp(req);
  
  if (req.user) {
    try {
      await req.user.addIP(clientIP);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'IP:', error);
    }
  }
  
  next();
};

const enforceIpBan = async (req, res, next) => {
  if (!isMongoConnected()) {
    logMongoUnavailableOncePerMinute();
    return next();
  }

  try {
    const clientIP = getClientIp(req);
    if (!clientIP) return next();

    const banned = await BannedIP.findOne({ ip: clientIP }).lean();
    if (banned) {
      return res.status(403).json({ error: 'Votre IP est bannie.' });
    }
  } catch (error) {
    console.error('Erreur vérification ban IP:', error.message);
  }

  next();
};


const securityHeaders = (req, res, next) => {
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  checkIP,
  getClientIp,
  normalizeIp,
  enforceIpBan,
  securityHeaders
};
