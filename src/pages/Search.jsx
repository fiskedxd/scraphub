import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '@synergycodes/overflow-ui/tokens.css';
import { Input } from '@synergycodes/overflow-ui/input';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import Mita3D from '../components/Mita3D';
import { useAuth } from '../contexts/AuthContext';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+33|0)[1-9](?:\d{8}|\d{2}\s\d{2}\s\d{2}\s\d{2}|\d{2}.\d{2}.\d{2}.\d{2})/g;
const URL_REGEX = /https?:\/\/[^\s'"]+/g;
const DOMAIN_REGEX = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.)+[a-z]{2,}/gi;
const HASH_REGEX = /\b([a-f0-9]{32,128})\b/i;
const BITCOIN_ADDR_REGEX = /[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59}/g;
const ETHEREUM_ADDR_REGEX = /0x[a-fA-F0-9]{40}/g;
const USERNAME_KEYS = [/username/i, /pseudo/i, /login/i, /user/i, /screen_name/i, /nickname/i, /name/i];
const PASSWORD_KEYS = [/password/i, /pwd/i, /passphrase/i, /motdepasse/i, /mdp/i, /hashed_password/i, /secret/i];
const FAMILY_KEYS = [/pere/i, /mere/i, /frere/i, /soeur/i, /parent/i, /famille/i, /conjoint/i, /epoux/i, /epouse/i, /enfant/i, /fils/i, /fille/i, /tuteur/i, /tutrice/i];

const getGlobalBlackSantaState = () => {
  if (typeof window === 'undefined') return null;
  window.__scraphubBlacksantaState = window.__scraphubBlacksantaState || {
    cache: {},
    promises: {},
  };
  return window.__scraphubBlacksantaState;
};

const fetchBlackSantaCached = async (key, fetcher, ttl = 15000) => {
  const state = getGlobalBlackSantaState();
  if (!state) return fetcher();

  const cached = state.cache[key];
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  if (state.promises[key]) {
    return state.promises[key];
  }

  const promise = fetcher()
    .then((data) => {
      state.cache[key] = { data, timestamp: Date.now() };
      state.promises[key] = null;
      return data;
    })
    .catch((err) => {
      state.promises[key] = null;
      throw err;
    });

  state.promises[key] = promise;
  return promise;
};

const normalizeEmail = (str) => String(str).trim().toLowerCase();
const normalizePhone = (str) => {
  const cleaned = String(str).replace(/[\s.()\-\+]/g, '');
  if (cleaned.startsWith('33') && cleaned.length > 10) return `0${cleaned.substring(2)}`;
  if (cleaned.startsWith('+33')) return `0${cleaned.substring(3)}`;
  return cleaned;
};
const normalizeName = (str) => String(str).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalizeUrl = (str) => {
  try {
    const url = new URL(str);
    return url.hostname.toLowerCase().replace(/^www\./, '') + url.pathname.toLowerCase().replace(/\/$/, '');
  } catch {
    return String(str).toLowerCase().replace(/^www\./, '').replace(/\/$/, '');
  }
};
const normalizeHash = (str) => String(str).trim().toLowerCase();
const normalizeDate = (str) => {
  if (!str) return '';
  const cleaned = String(str).replace(/[^\d\-\/\.]/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split('.');
    return `${y}-${m}-${d}`;
  }
  return cleaned;
};

const cleanDateDisplay = (str) => {
  if (!str) return '';
  const cleaned = str.replace(/0+\.0+$/g, '').replace(/\.\d{4}$/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [y, m, d] = cleaned.split('-');
    return `${d}/${m}/${y}`;
  }
  return cleaned;
};

const cleanPhoneDisplay = (str) => {
  if (!str) return '';
  if (/^\d{10}$/.test(str)) {
    return str.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  if (/^\d{9}$/.test(str)) {
    return str.replace(/(\d{2})(\d{2})(\d{2})(\d{3})/, '$1 $2 $3 $4');
  }
  return str;
};

const extractEmailsFromText = (text) => {
  if (!text) return [];
  const matches = String(text).match(EMAIL_REGEX) || [];
  return [...new Set(matches.map(normalizeEmail))];
};

const extractPhonesFromText = (text) => {
  if (!text) return [];
  const matches = String(text).match(PHONE_REGEX) || [];
  return [...new Set(matches.map(normalizePhone))];
};

const extractUrlsFromText = (text) => {
  if (!text) return [];
  const matches = String(text).match(URL_REGEX) || [];
  return [...new Set(matches.map(normalizeUrl))];
};

const extractDomainsFromText = (text) => {
  if (!text) return [];
  const matches = String(text).match(DOMAIN_REGEX) || [];
  return [...new Set(matches.map(domain => domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase()))];
};

const sanitizeDisplayText = (text) => {
  if (text === null || text === undefined) return '';
  let cleaned = String(text);
  // Remove all masked values
  cleaned = cleaned.replace(/\*\*\*(?:UPGRADE_TO_SEE|REDACTED|HIDDEN|MASKED|REDACTED_VALUE)\*\*\*/gi, '');
  return cleaned.trim();
};

const sanitizeSensitiveValue = (value) => {
  if (value === null || value === undefined) return '';
  let sanitized = String(value).trim();
  // Remove masked values first
  sanitized = sanitized.replace(/\*\*\*(?:UPGRADE_TO_SEE|REDACTED|HIDDEN|MASKED|REDACTED_VALUE)\*\*\*/gi, '');
  sanitized = sanitized.trim();
  if (!sanitized || sanitized === 'null' || sanitized === 'undefined' || sanitized === 'N/A' || sanitized === 'unknown') {
    return '';
  }
  return sanitized;
};

const renderTextWithLinks = (text, className = '') => {
  if (!text) return null;
  const rawText = sanitizeDisplayText(text);
  const segments = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      segments.push(<span key={`text-${lastIndex}`} className={className}>{rawText.slice(lastIndex, match.index)}</span>);
    }

    const url = match[1];
    const displayUrl = url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    segments.push(
      <a key={`link-${match.index}`} href={url} target="_blank" rel="noopener noreferrer" className="text-white/70 underline decoration-white/20 underline-offset-2 break-all">
        {displayUrl}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < rawText.length) {
    segments.push(<span key={`text-${lastIndex}`} className={className}>{rawText.slice(lastIndex)}</span>);
  }

  if (segments.length === 0) {
    return <span className={className}>{rawText}</span>;
  }

  return <span className={className}>{segments}</span>;
};

const formatApiValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || '';
  }
  if (Array.isArray(value)) {
    const filtered = value.filter((item) => item !== null && item !== undefined && item !== '');
    if (filtered.every((item) => typeof item !== 'object')) {
      return filtered.join(', ');
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const getApiEntrySummary = (item) => {
  if (!item || typeof item !== 'object') return { title: String(item || ''), subtitle: '' };
  const title = item.full_name || item.name || item.username || item.login || item.url || item.email || item.id || item.source || item.body?.source || 'Entrée API';
  const subtitle = [
    item.email,
    item.phone_number || item.phone_national,
    item.address_street ? `${item.address_street}, ${item.postal_code || ''} ${item.city || ''}`.trim() : '',
    item.dbname,
    item.url,
  ].filter(Boolean).join(' • ');
  return { title, subtitle };
};

const formatStealerDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(value);
  }
};

const getStealerEntrySummary = (item) => {
  if (!item || typeof item !== 'object') {
    return { title: String(item || ''), subtitle: '', logId: null, fields: [] };
  }

  const domains = [
    ...(Array.isArray(item.domain) ? item.domain : []),
    ...(Array.isArray(item.subdomain) ? item.subdomain : []),
  ].filter(Boolean);
  const paths = Array.isArray(item.path) ? item.path.filter(Boolean) : [];
  const logId = item.log_id || item.id || null;

  const title = item.url || item.login || domains[0] || paths[0] || (logId ? `Log ${String(logId).slice(0, 16)}` : 'Entrée stealer');
  const subtitle = [
    item.login && `Login: ${item.login}`,
    item.password && `Mot de passe: ${item.password}`,
    domains.length ? `Domaines: ${domains.slice(0, 3).join(', ')}` : null,
    paths.length ? `Chemins: ${paths.slice(0, 2).join(', ')}` : null,
    item.pwned_at && `Compromis: ${formatStealerDate(item.pwned_at)}`,
    item.indexed_at && `Indexé: ${formatStealerDate(item.indexed_at)}`,
  ].filter(Boolean).join(' · ');

  const fields = [
    { key: 'log_id', label: 'Log ID', value: item.log_id },
    { key: 'id', label: 'ID', value: item.id },
    { key: 'domain', label: 'Domaines', value: domains.join(', ') },
    { key: 'subdomain', label: 'Sous-domaines', value: Array.isArray(item.subdomain) ? item.subdomain.join(', ') : '' },
    { key: 'path', label: 'Chemins', value: paths.join(', ') },
    { key: 'url', label: 'URL', value: item.url },
    { key: 'login', label: 'Login', value: item.login },
    { key: 'password', label: 'Mot de passe', value: item.password },
    { key: 'archive_hash', label: 'Archive hash', value: item.archive_hash },
    { key: 'pwned_at', label: 'Compromis le', value: formatStealerDate(item.pwned_at) },
    { key: 'indexed_at', label: 'Indexé le', value: formatStealerDate(item.indexed_at) },
  ].filter((field) => field.value);

  return { title, subtitle, logId, fields };
};

const isLookup2bzWrapperSummary = (entry) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  if (!entry.body || typeof entry.body !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(entry.body, 'results')) return false;
  if (Array.isArray(entry.body.results) && entry.body.results.length === 0) {
    const metaKeys = ['elapsed_ms', 'success', 'source', 'error', 'status'];
    return Object.keys(entry.body).every((key) => metaKeys.includes(key));
  }
  return false;
};

const normalizeLookup2bzItems = (data) => {
  if (!data) return [];

  const normalizeItemSource = (item, wrapper) => {
    if (!item || typeof item !== 'object') return item;
    return {
      ...item,
      source: item.source || wrapper?.source || wrapper?.body?.source || item.source,
    };
  };

  if (Array.isArray(data)) {
    return data.flatMap((entry) => {
      if (isLookup2bzWrapperSummary(entry)) return [];
      return normalizeLookup2bzItems(entry);
    });
  }

  if (typeof data === 'object') {
    if (Array.isArray(data.body)) {
      return normalizeLookup2bzItems(data.body);
    }

    if (data.body && typeof data.body === 'object') {
      if (isLookup2bzWrapperSummary(data)) return [];
      if (Array.isArray(data.body.results)) {
        return data.body.results.map((item) => normalizeItemSource(item, data));
      }
      if (!Array.isArray(data.body.results) && Object.keys(data.body).length > 0 && !data.body.error) {
        return [normalizeItemSource(data.body, data)];
      }
    }

    if (Array.isArray(data.results)) return data.results.map((item) => normalizeItemSource(item, data));
    if (Array.isArray(data.data)) return data.data.map((item) => normalizeItemSource(item, data));
    if (Array.isArray(data.items)) return data.items.map((item) => normalizeItemSource(item, data));
    if (Array.isArray(data.hits)) return data.hits.map((item) => normalizeItemSource(item, data));
    if (data.result) return Array.isArray(data.result) ? data.result.map((item) => normalizeItemSource(item, data)) : [normalizeItemSource(data.result, data)];

    const nested = Object.values(data).find((value) => Array.isArray(value) && value.length > 0);
    if (nested) return nested.map((item) => normalizeItemSource(item, data));
  }

  return [];
};

const getScraphubResultCategory = (item = {}) => {
  const haystack = JSON.stringify(item).toLowerCase();

  if (/breach|leak|dump|credential|pwn|victim|password|security/i.test(haystack)) {
    return { category: 'breach', label: 'ScrapHub • Breach' };
  }

  if (/ip|asn|geo|isp|vpn|tor|network|country/i.test(haystack)) {
    return { category: 'ip', label: 'ScrapHub • IP Intelligence' };
  }

  if (/roblox|minecraft|fivem|steam|discord|platform|game|gaming/i.test(haystack)) {
    return { category: 'platform', label: 'ScrapHub • Platform' };
  }

  if (/intelx|oathnet|identity|profile|osint|intelligence|analysis/i.test(haystack)) {
    return { category: 'intelligence', label: 'ScrapHub • Intelligence' };
  }

  return { category: 'intelligence', label: 'ScrapHub • Intelligence' };
};

const normalizeScraphubRecords = (records = []) =>
  records.map((item) => {
    const cleaned = cleanMaskedValues(item);
    const { category, label } = getScraphubResultCategory(cleaned);
    return {
      ...cleaned,
      category,
      source: label,
      provider: 'ScrapHub'
    };
  });

const buildLookup2bzResult = (query, data) => {
  const records = normalizeScraphubRecords(normalizeLookup2bzItems(data));
  const stealerLike = records.filter((item) => item?.log_id || item?.archive_hash || item?.pwned_at);
  const ulpLike = records.filter((item) => !stealerLike.includes(item));

  const serviceResponses = Array.isArray(data)
    ? data
    : (Array.isArray(data?.body) ? data.body : []);

  return {
    success: true,
    type: 'lookup2bz_api',
    searchTerm: query,
    totalMatches: records.length,
    records,
    stealerRecords: stealerLike,
    ulpRecords: ulpLike,
    raw: data,
    serviceResponses,
  };
};

const searchLookup2bzAll = async (query) => {
  const trimmed = String(query || '').trim();
  if (!trimmed) return null;

  const response = await fetch(`/api/lookup2bz/all?query=${encodeURIComponent(trimmed)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de recherche ScrapHub');
  }

  if (data && Array.isArray(data.records)) {
    return buildLookup2bzResult(trimmed, data);
  }

  const normalized = data && Array.isArray(data.results) ? data : { results: [data] };
  return buildLookup2bzResult(trimmed, normalized);
};

const getApiFieldValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getApiFichaFields = (item) => {
  if (!item || typeof item !== 'object') return { nom: '', prenom: '', nee: '', age: '', sexe: '', email: '', tel: '', adresse: '', cp: '', ville: '', child_firstname: '', child_lastname: '', full_name: '', created_at: '', date_birth: '', country: '', dbname: '', title: '', email_domain: '', phone_national: '', phone_number: '', postal_code: '', first_name: '', last_name: '', gender: '', id: '' };

  const normalized = {
    nom: getApiFieldValue(item.nom || item.last_name || item.lastName || item.family_name || item.surname || item.name?.last || ''),
    prenom: getApiFieldValue(item.prenom || item.first_name || item.firstName || item.given_name || item.givenName || item.name?.first || ''),
    nee: getApiFieldValue(item.date_naissance || item.birth_date || item.birthDate || item.dob || item.birthday || item.date_birth || ''),
    age: getApiFieldValue(item.age || item.years_old || item.age_years || ''),
    sexe: getApiFieldValue(item.sexe || item.gender || item.sex || ''),
    email: getApiFieldValue(item.email || item.courriel || item.mail || item.email_address || ''),
    tel: getApiFieldValue(item.telephone || item.phone || item.phone_number || item.phone_national || item.tel || item.mobile || ''),
    adresse: getApiFieldValue(item.adresse || item.address || item.address_street || item.street || item.address_line || item.address_line1 || ''),
    cp: getApiFieldValue(item.code_postal || item.postal_code || item.zip_code || item.postcode || ''),
    ville: getApiFieldValue(item.ville || item.city || item.town || item.commune || ''),
    child_firstname: getApiFieldValue(item.child_firstname || item.childFirstName || item.child_firstname_1 || ''),
    child_lastname: getApiFieldValue(item.child_lastname || item.childLastName || item.child_lastname_1 || ''),
    full_name: getApiFieldValue(item.full_name || item.name || item.fullName || ''),
    created_at: getApiFieldValue(item.created_at || item.createdAt || ''),
    date_birth: getApiFieldValue(item.date_birth || item.birth_date || item.birthDate || item.dob || item.birthday || ''),
    country: getApiFieldValue(item.country || item.country_code || item.countryCode || ''),
    dbname: getApiFieldValue(item.dbname || item.database_name || item.source_db || ''),
    title: getApiFieldValue(item.title || item.legal_title || ''),
    email_domain: getApiFieldValue(item.email_domain || item.domain || ''),
    phone_national: getApiFieldValue(item.phone_national || item.phoneNational || ''),
    phone_number: getApiFieldValue(item.phone_number || item.phone || item.phone_national || ''),
    postal_code: getApiFieldValue(item.postal_code || item.postcode || item.zip_code || ''),
    first_name: getApiFieldValue(item.first_name || item.firstName || item.prenom || ''),
    last_name: getApiFieldValue(item.last_name || item.lastName || item.nom || ''),
    gender: getApiFieldValue(item.gender || item.sexe || item.sex || ''),
    id: getApiFieldValue(item.id || item.uuid || ''),
  };

  const maybeParentAge = getApiFieldValue(item.age || item.years_old || item.age_years || '');
  const maybeChildAge = getApiFieldValue(item.child_age || item.child_age_years || '');
  if (!normalized.age && maybeParentAge && !maybeChildAge) normalized.age = maybeParentAge;
  if (normalized.age && maybeChildAge && normalized.age === maybeChildAge) normalized.age = maybeParentAge || normalized.age;

  if (!normalized.nom && normalized.full_name) {
    const parts = String(normalized.full_name).split(/\s+/).filter(Boolean);
    normalized.nom = getApiFieldValue(parts.slice(1).join(' '));
    normalized.prenom = getApiFieldValue(parts[0] || '');
  }
  if (!normalized.prenom && normalized.first_name) normalized.prenom = getApiFieldValue(normalized.first_name);
  if (!normalized.nom && normalized.last_name) normalized.nom = getApiFieldValue(normalized.last_name);
  if (!normalized.nee && normalized.date_birth) normalized.nee = getApiFieldValue(normalized.date_birth);
  if (!normalized.nee && normalized.created_at) normalized.nee = getApiFieldValue(normalized.created_at);
  if (!normalized.email && normalized.email_domain) normalized.email = getApiFieldValue(normalized.email_domain);

  return normalized;
};

const extractHashesFromText = (text) => {
  if (!text) return [];
  const matches = String(text).match(HASH_REGEX) || [];
  return [...new Set(matches.map(normalizeHash))];
};

const extractCryptoFromText = (text) => {
  if (!text) return { btc: [], eth: [] };
  const btcMatches = String(text).match(BITCOIN_ADDR_REGEX) || [];
  const ethMatches = String(text).match(ETHEREUM_ADDR_REGEX) || [];
  return { btc: [...new Set(btcMatches)], eth: [...new Set(ethMatches)] };
};

const cleanAvatarUrl = (url) => {
    if (!url) return 'https://cdn.discordapp.com/embed/avatars/0.png';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/avatars/')) return `https://cdn.discordapp.com${url}`;
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
};

const parseRecordContent = (record) => {
  if (!record) return record;
  if (record.content && typeof record.content === 'string') {
    try {
      const parsed = JSON.parse(record.content);
      return { ...record, parsedData: parsed };
    } catch(e) {
      return record;
    }
  }
  if (record.parsedData) return record;
  return record;
};

const flattenRecordToText = (record) => {
  const data = record.parsedData || record;
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch (e) {
    return '';
  }
};

const cleanMaskedValues = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return obj.replace(/\*\*\*(?:UPGRADE_TO_SEE|REDACTED|HIDDEN|MASKED|REDACTED_VALUE)\*\*\*/gi, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanMaskedValues(item)).filter(item => item !== '' && item !== null);
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanMaskedValues(value);
      if (cleanedValue !== '' && cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }
  return obj;
};

const buildBlacksantaResult = (query, data) => {
  const stealerItems = Array.isArray(data?.sources?.stealer?.items) ? data.sources.stealer.items : [];
  const ulpItems = Array.isArray(data?.sources?.ulp?.items) ? data.sources.ulp.items : [];
  
  // Clean masked values from all items
  const cleanedStealerItems = stealerItems.map(item => cleanMaskedValues(item));
  const cleanedUlpItems = ulpItems.map(item => cleanMaskedValues(item));
  
  const allItems = [
    ...cleanedStealerItems.map((item) => ({
      __source: 'stealer',
      payload: typeof item === 'object' && item !== null ? item : { value: item }
    })),
    ...cleanedUlpItems.map((item) => ({
      __source: 'ulp',
      payload: typeof item === 'object' && item !== null ? item : { value: item }
    }))
  ];

  const pseudoRecords = allItems.map((entry) => ({
    content: JSON.stringify(entry.payload),
    source: entry.__source,
    parsedData: entry.payload
  }));

  const familyGroups = pseudoRecords.length > 0 ? findFamilyConnections(pseudoRecords) : null;

  return {
    success: true,
    type: 'blacksanta_api',
    searchTerm: query,
    totalMatches: cleanedStealerItems.length + cleanedUlpItems.length,
    sources: [
      { name: 'ULP', entries: data?.sources?.ulp?.total || cleanedUlpItems.length, records: cleanedUlpItems },
      { name: 'Stealer logs', entries: data?.sources?.stealer?.total || cleanedStealerItems.length, records: cleanedStealerItems }
    ],
    allRecords: pseudoRecords,
    stealerRecords: cleanedStealerItems,
    ulpRecords: cleanedUlpItems,
    credits: data?.credits,
    ctx: data?.ctx,
    familyGroups,
    foundEmails: extractEmailsFromText(JSON.stringify(allItems))
  };
};

const searchBlacksantaUnified = async (query, sid = null, fid = null, cursorUlp = null, cursorStealer = null) => {
  const trimmed = String(query || '').trim();
  if (!trimmed) return null;

  let url = `/api/blacksanta/search/all?q=${encodeURIComponent(trimmed)}`;
  if (sid) url += `&sid=${encodeURIComponent(sid)}`;
  if (fid) url += `&fid=${encodeURIComponent(fid)}`;
  if (cursorUlp) url += `&cursor_ulp=${encodeURIComponent(cursorUlp)}`;
  if (cursorStealer) url += `&cursor_stealer=${encodeURIComponent(cursorStealer)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de recherche Blacksanta');
  }

  return buildBlacksantaResult(trimmed, data);
};

const searchBlacksantaStealer = async (query, sid = null, fid = null, cursor = null) => {
  const trimmed = String(query || '').trim();
  if (!trimmed) return null;

  let url = `/api/blacksanta/search/stealer?q=${encodeURIComponent(trimmed)}`;
  if (sid) url += `&sid=${encodeURIComponent(sid)}`;
  if (fid) url += `&fid=${encodeURIComponent(fid)}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de recherche Stealer');
  }

  return data;
};

const getVictimManifest = async (logId) => {
  const response = await fetch(`/api/blacksanta/victims/${logId}/manifest`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de récupération du manifeste');
  }
  return data;
};

const getVictimFile = async (logId, fileId) => {
  const response = await fetch(`/api/blacksanta/victims/${logId}/files/${fileId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de récupération du fichier');
  }
  return data;
};

const downloadVictimLog = async (logId) => {
  const response = await fetch(`/api/blacksanta/victims/${logId}/download`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'Erreur de téléchargement du log');
  }
  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] || `log_${logId}.zip`;
  return { blob, filename };
};

const getOsintServices = async () => fetchBlackSantaCached('blacksanta_osint_services', async () => {
  const response = await fetch('/api/blacksanta/osint/services');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de récupération des services OSINT');
  }
  return data;
}, 60000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const searchOsintLookup = async (service, value) => {
  const response = await fetch(`/api/blacksanta/osint/lookup?service=${encodeURIComponent(service)}&value=${encodeURIComponent(value)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de recherche OSINT');
  }
  return data;
};

const getIntelxBuckets = async () => fetchBlackSantaCached('blacksanta_intelx_buckets', async () => {
  const response = await fetch('/api/blacksanta/intelx/buckets');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de récupération des buckets IntelX');
  }
  return data;
}, 60000);

const downloadIntelxItem = async (systemid, bucket, type = 1, name = null) => {
  let url = `/api/blacksanta/intelx/read?systemid=${encodeURIComponent(systemid)}&bucket=${encodeURIComponent(bucket)}&type=${type}`;
  if (name) url += `&name=${encodeURIComponent(name)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'Erreur de téléchargement IntelX');
  }
  
  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] || `intelx_${systemid}.bin`;
  const creditsRemaining = response.headers.get('X-Credits-Remaining');
  
  return { blob, filename, creditsRemaining };
};

const getVulnPlugins = async () => fetchBlackSantaCached('blacksanta_vulnscan_plugins', async () => {
  const response = await fetch('/api/blacksanta/vulnscan/plugins');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de récupération des plugins VulnScan');
  }
  return data;
}, 60000);

const searchVulnScan = async (q = null, plugin = null, page = 0) => {
  let url = `/api/blacksanta/vulnscan/search?page=${page}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  if (plugin) url += `&plugin=${encodeURIComponent(plugin)}`;
  
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de recherche VulnScan');
  }
  return data;
};

const getCredits = async () => fetchBlackSantaCached('blacksanta_credits', async () => {
  const response = await fetch('/api/blacksanta/credits');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur de récupération des crédits');
  }
  return data;
}, 15000);

const extractFamilyMembers = (data, source) => {
  const members = [];
  
  const checkAndAdd = (prefix, relationType) => {
    const keys = Object.keys(data || {});
    const matchingKeys = keys.filter(k => k.toLowerCase().startsWith(prefix.toLowerCase()));
    
    matchingKeys.forEach(key => {
      const memberData = data[key];
      if (memberData && typeof memberData === 'object') {
        const member = {
          relation: relationType,
          prenom: sanitizeSensitiveValue(memberData.prenom || memberData.firstName || memberData.first_name || ''),
          nom: sanitizeSensitiveValue(memberData.nom || memberData.lastName || memberData.last_name || ''),
          dateNaissance: sanitizeSensitiveValue(memberData.date_naissance || memberData.birthDate || memberData.date || ''),
          email: sanitizeSensitiveValue(memberData.email || memberData.courriel || memberData.mail || ''),
          telephone: sanitizeSensitiveValue(memberData.telephone || memberData.phone || memberData.tel || ''),
          source: source
        };
        if (member.prenom || member.nom) members.push(member);
      }
    });
  };

  checkAndAdd('pere', 'père');
  checkAndAdd('mere', 'mère');
  checkAndAdd('frere', 'frère');
  checkAndAdd('soeur', 'sœur');
  checkAndAdd('conjoint', 'conjoint');
  checkAndAdd('epoux', 'époux');
  checkAndAdd('epouse', 'épouse');
  checkAndAdd('enfant', 'enfant');
  checkAndAdd('fils', 'fils');
  checkAndAdd('fille', 'fille');
  checkAndAdd('parent', 'parent');
  checkAndAdd('tuteur', 'tuteur');
  checkAndAdd('tutrice', 'tutrice');
  checkAndAdd('famille', 'famille');

  if (data.allocataire) {
    const alloc = data.allocataire;
    if (alloc.qualite && (alloc.qualite.toLowerCase().includes('père') || alloc.qualite.toLowerCase().includes('pere'))) {
      members.push({
        relation: 'père',
        prenom: sanitizeSensitiveValue(alloc.prenom || ''),
        nom: sanitizeSensitiveValue(alloc.nom || ''),
        dateNaissance: sanitizeSensitiveValue(alloc.date_naissance || ''),
        email: sanitizeSensitiveValue(alloc.courriel || alloc.email || ''),
        telephone: sanitizeSensitiveValue(alloc.telephone || ''),
        source: source
      });
    } else if (alloc.qualite && (alloc.qualite.toLowerCase().includes('mère') || alloc.qualite.toLowerCase().includes('mere'))) {
      members.push({
        relation: 'mère',
        prenom: sanitizeSensitiveValue(alloc.prenom || ''),
        nom: sanitizeSensitiveValue(alloc.nom || ''),
        dateNaissance: sanitizeSensitiveValue(alloc.date_naissance || ''),
        email: sanitizeSensitiveValue(alloc.courriel || alloc.email || ''),
        telephone: sanitizeSensitiveValue(alloc.telephone || ''),
        source: source
      });
    }
  }

  if (data.enfants && Array.isArray(data.enfants)) {
    data.enfants.forEach((enfant, idx) => {
      members.push({
        relation: 'enfant',
        prenom: sanitizeSensitiveValue(enfant.prenom || enfant.firstName || ''),
        nom: sanitizeSensitiveValue(enfant.nom || enfant.lastName || data.nom || ''),
        dateNaissance: sanitizeSensitiveValue(enfant.date_naissance || enfant.birthDate || ''),
        source: source
      });
    });
  }

  if (data.parents && Array.isArray(data.parents)) {
    data.parents.forEach((parent, idx) => {
      members.push({
        relation: 'parent',
        prenom: sanitizeSensitiveValue(parent.prenom || parent.firstName || ''),
        nom: sanitizeSensitiveValue(parent.nom || parent.lastName || ''),
        dateNaissance: sanitizeSensitiveValue(parent.date_naissance || parent.birthDate || ''),
        source: source
      });
    });
  }

  const text = flattenRecordToText({ parsedData: data });
  FAMILY_KEYS.forEach(keyRegex => {
    const match = text.match(new RegExp(`${keyRegex.source}[\\s:]+([^\\n,]+)`, 'i'));
    if (match && match[1] && match[1].trim().length > 1) {
      const cleanedValue = sanitizeSensitiveValue(match[1].trim());
      if (!cleanedValue) return;
      const alreadyExists = members.some(m => 
        normalizeName(m.prenom + ' ' + m.nom) === normalizeName(cleanedValue)
      );
      if (!alreadyExists) {
        members.push({
          relation: keyRegex.source.replace(/[\/\\^$*+?.()|[\]{}]/g, ''),
          prenom: cleanedValue,
          nom: '',
          source: source
        });
      }
    }
  });

  return members;
};

const findFamilyConnections = (records) => {
  const familyGroups = new Map();
  const addressGroups = new Map();
  
  records.forEach(record => {
    const parsed = parseRecordContent(record);
    const data = parsed.parsedData || parsed;
    const source = record.source || 'unknown';
    
    const address = data.adresse ? 
      `${data.adresse.voie || ''} ${data.adresse.code_postal || ''} ${data.adresse.commune || ''}`.trim().toLowerCase() : 
      (data.adresse_complete || data.address || '').toLowerCase();
    
    if (address && address.length > 5) {
      if (!addressGroups.has(address)) {
        addressGroups.set(address, []);
      }
      addressGroups.get(address).push({
        prenom: data.prenom || '',
        nom: data.nom || '',
        nom_complet: data.nom_complet || '',
        date_naissance: data.date_naissance || '',
        email: data.email || data.courriel || '',
        telephone: data.telephone || '',
        source: source,
        recordId: record.id || Math.random().toString(36)
      });
    }

    const familyMembers = extractFamilyMembers(data, source);
    familyMembers.forEach(member => {
      const key = normalizeName(`${member.prenom} ${member.nom}`);
      if (!key || key.trim().length < 3) return;
      
      if (!familyGroups.has(key)) {
        familyGroups.set(key, {
          member: member,
          relatedTo: [],
          sharedAddress: false,
          sources: new Set()
        });
      }
      familyGroups.get(key).relatedTo.push({
        prenom: data.prenom || '',
        nom: data.nom || '',
        nom_complet: data.nom_complet || '',
        relation: member.relation,
        source: source
      });
      familyGroups.get(key).sources.add(source);
    });
  });

  addressGroups.forEach((residents, address) => {
    if (residents.length >= 2) {
      for (let i = 0; i < residents.length; i++) {
        for (let j = i + 1; j < residents.length; j++) {
          const keyA = normalizeName(`${residents[i].prenom} ${residents[i].nom}`);
          const keyB = normalizeName(`${residents[j].prenom} ${residents[j].nom}`);
          
          if (keyA && keyA.length > 2 && keyB && keyB.length > 2 && keyA !== keyB) {
            if (!familyGroups.has(keyA)) {
              familyGroups.set(keyA, { member: residents[i], relatedTo: [], sharedAddress: true, sources: new Set() });
            }
            familyGroups.get(keyA).sharedAddress = true;
            familyGroups.get(keyA).relatedTo.push({
              ...residents[j],
              relation: 'même adresse'
            });
          }
        }
      }
    }
  });

  return familyGroups;
};

const buildIdentityProfile = (records) => {
  const profile = {
    emails: new Map(),
    phones: new Map(),
    usernames: new Map(),
    domains: new Map(),
    urls: new Map(),
    passwords: new Map(),
    hashes: new Map(),
    cryptoBtc: new Map(),
    cryptoEth: new Map(),
    names: new Map(),
    locations: new Map(),
    birthDates: new Map(),
    sources: new Map(),
    familyMembers: [],
    addressGroups: [],
    associations: [],
    confidenceScore: 0,
  };

  const addToMap = (map, key, source, context = '') => {
    if (!key) return;
    const normalized = typeof key === 'string' ? key.toLowerCase().trim() : key;
    if (!normalized || normalized.length < 2) return;
    if (!map.has(normalized)) {
      map.set(normalized, { count: 0, sources: new Set(), contexts: [] });
    }
    const entry = map.get(normalized);
    entry.count++;
    entry.sources.add(source);
    if (context && entry.contexts.length < 5) entry.contexts.push(context.slice(0, 200));
  };

  records.forEach(record => {
    const parsed = parseRecordContent(record);
    const data = parsed.parsedData || parsed;
    const text = flattenRecordToText(parsed);
    const source = record.source || 'unknown';

    profile.sources.set(source, (profile.sources.get(source) || 0) + 1);

    if (data.email || data.courriel || data.mail || data.email_address) {
      const emailValue = sanitizeSensitiveValue(data.email || data.courriel || data.mail || data.email_address);
      if (emailValue) addToMap(profile.emails, emailValue, source, text);
    }
    if (data.telephone || data.phone || data.tel || data.phone_number) {
      const phoneValue = sanitizeSensitiveValue(data.telephone || data.phone || data.tel || data.phone_number);
      if (phoneValue) addToMap(profile.phones, normalizePhone(phoneValue), source, text);
    }
    if (data.allocataire) {
      const allocEmail = sanitizeSensitiveValue(data.allocataire.courriel);
      if (allocEmail) addToMap(profile.emails, allocEmail, source, text);
      const allocPhone = sanitizeSensitiveValue(data.allocataire.telephone);
      if (allocPhone) addToMap(profile.phones, normalizePhone(allocPhone), source, text);
      const allocNom = sanitizeSensitiveValue(data.allocataire.nom);
      if (allocNom) addToMap(profile.names, normalizeName(allocNom), source, text);
      const allocPrenom = sanitizeSensitiveValue(data.allocataire.prenom);
      if (allocPrenom) addToMap(profile.names, normalizeName(allocPrenom), source, text);
    }

    const prenomValue = sanitizeSensitiveValue(data.prenom);
    if (prenomValue) addToMap(profile.names, normalizeName(prenomValue), source, text);
    const nomValue = sanitizeSensitiveValue(data.nom);
    if (nomValue) addToMap(profile.names, normalizeName(nomValue), source, text);
    const nomCompletValue = sanitizeSensitiveValue(data.nom_complet);
    if (nomCompletValue) addToMap(profile.names, normalizeName(nomCompletValue), source, text);
    if (data.username || data.pseudo || data.login) {
      const usernameValue = sanitizeSensitiveValue(data.username || data.pseudo || data.login);
      if (usernameValue) addToMap(profile.usernames, usernameValue, source, text);
    }

    if (data.date_naissance) addToMap(profile.birthDates, normalizeDate(data.date_naissance), source, text);

    if (data.adresse) {
      const fullAddress = `${data.adresse.voie || ''} ${data.adresse.code_postal || ''} ${data.adresse.commune || ''}`.trim();
      if (fullAddress.length > 5) addToMap(profile.locations, normalizeName(fullAddress), source, text);
      if (data.adresse.voie) addToMap(profile.locations, normalizeName(data.adresse.voie), source, text);
      if (data.adresse.commune) addToMap(profile.locations, normalizeName(data.adresse.commune), source, text);
      if (data.adresse.code_postal) addToMap(profile.locations, data.adresse.code_postal, source, text);
    }
    if (data.ville || data.city || data.town) {
      addToMap(profile.locations, normalizeName(data.ville || data.city || data.town), source, text);
    }

    const emails = extractEmailsFromText(text);
    emails.forEach(email => addToMap(profile.emails, email, source, text));

    const phones = extractPhonesFromText(text);
    phones.forEach(phone => addToMap(profile.phones, phone, source, text));

    const urls = extractUrlsFromText(text);
    urls.forEach(url => {
      addToMap(profile.urls, url, source, text);
      try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
        addToMap(profile.domains, domain, source, text);
      } catch (e) {}
    });

    const hashes = extractHashesFromText(text);
    hashes.forEach(hash => addToMap(profile.hashes, hash, source, text));

    const crypto = extractCryptoFromText(text);
    crypto.btc.forEach(addr => addToMap(profile.cryptoBtc, addr, source, text));
    crypto.eth.forEach(addr => addToMap(profile.cryptoEth, addr, source, text));

    for (const key of Object.keys(data || {})) {
      const ks = String(key);
      if (USERNAME_KEYS.some(rx => rx.test(ks)) && data[key]) {
        const usernameValue = sanitizeSensitiveValue(data[key]);
        if (usernameValue) addToMap(profile.usernames, usernameValue, source, text);
      }
      if (PASSWORD_KEYS.some(rx => rx.test(ks)) && data[key]) {
        const val = sanitizeSensitiveValue(data[key]);
        if (!val) {
          continue;
        }
        if (HASH_REGEX.test(val)) {
          addToMap(profile.hashes, val, source, text);
        } else {
          addToMap(profile.passwords, val, source, text);
        }
      }
    }
  });

  const familyConnections = findFamilyConnections(records);
  profile.familyMembers = Array.from(familyConnections.entries()).map(([key, group]) => ({
    key: key,
    member: group.member,
    relatedTo: group.relatedTo,
    sharedAddress: group.sharedAddress,
    sourceCount: group.sources.size
  }));

  const addressMap = new Map();
  records.forEach(record => {
    const parsed = parseRecordContent(record);
    const data = parsed.parsedData || parsed;
    const source = record.source || 'unknown';
    const address = data.adresse ? 
      `${data.adresse.voie || ''} ${data.adresse.code_postal || ''} ${data.adresse.commune || ''}`.trim().toLowerCase() : 
      (data.adresse_complete || data.address || '').toLowerCase();
    
    if (address && address.length > 5) {
      if (!addressMap.has(address)) {
        addressMap.set(address, []);
      }
      addressMap.get(address).push({
        prenom: data.prenom || '',
        nom: data.nom || '',
        nom_complet: data.nom_complet || '',
        date_naissance: data.date_naissance || '',
        source: source
      });
    }
  });
  
  profile.addressGroups = Array.from(addressMap.entries())
    .filter(([addr, residents]) => residents.length >= 2)
    .map(([addr, residents]) => ({
      address: addr,
      residents: residents,
      count: residents.length
    }));

  const sourceCount = profile.sources.size;
  const dataPoints = profile.emails.size + profile.phones.size + profile.usernames.size + 
                     profile.domains.size + profile.urls.size + profile.passwords.size + 
                     profile.hashes.size + profile.cryptoBtc.size + profile.cryptoEth.size + 
                     profile.names.size + profile.locations.size + profile.birthDates.size;
  
  profile.confidenceScore = Math.min(100, Math.round((sourceCount * 15) + (dataPoints * 2) + (profile.familyMembers.length * 5) + (profile.addressGroups.length * 10)));

  const mapToArray = (map) => {
    return Array.from(map.entries()).map(([key, val]) => ({
      value: key,
      count: val.count,
      sources: Array.from(val.sources),
      contexts: val.contexts || []
    }));
  };

  profile.emailsList = mapToArray(profile.emails);
  profile.phonesList = mapToArray(profile.phones);
  profile.usernamesList = mapToArray(profile.usernames);
  profile.domainsList = mapToArray(profile.domains);
  profile.urlsList = mapToArray(profile.urls);
  profile.passwordsList = mapToArray(profile.passwords);
  profile.hashesList = mapToArray(profile.hashes);
  profile.cryptoBtcList = mapToArray(profile.cryptoBtc);
  profile.cryptoEthList = mapToArray(profile.cryptoEth);
  profile.namesList = mapToArray(profile.names);
  profile.locationsList = mapToArray(profile.locations);
  profile.birthDatesList = mapToArray(profile.birthDates);

  return profile;
};

const detectTechnologies = (records) => {
  const technologies = new Map();
  const techPatterns = {
    'WordPress': [/wp-content/i, /wp-includes/i, /wordpress/i, /wp-json/i, /wp-admin/i],
    'Joomla': [/joomla/i, /com_content/i],
    'Drupal': [/drupal/i, /sites\/all/i, /sites\/default/i],
    'Magento': [/magento/i, /mage_/i],
    'Shopify': [/shopify/i, /myshopify/i],
    'WooCommerce': [/woocommerce/i, /wc-api/i],
    'PHP': [/\.php/i, /PHPSESSID/i, /X-Powered-By: PHP/i],
    'Laravel': [/laravel/i, /x-powered-by: laravel/i, /_token/i],
    'Symfony': [/symfony/i, /_fragment/i],
    'Django': [/django/i, /csrftoken/i, /__debug__/i],
    'Ruby on Rails': [/rails/i, /_method=put/i, /_method=delete/i],
    'Node.js': [/node\.js/i, /express/i, /__next/i, /next\.js/i],
    'React': [/react/i, /__NEXT_DATA__/i, /_next\/static/i],
    'Vue.js': [/vue\.js/i, /v-bind/i, /v-model/i, /data-v-/i],
    'Angular': [/angular/i, /ng-app/i, /ng-controller/i],
    'jQuery': [/jquery/i, /jquery\.min\.js/i],
    'Bootstrap': [/bootstrap/i, /bootstrap\.min\.css/i],
    'Tailwind CSS': [/tailwindcss/i, /tailwind\.css/i],
    'Apache': [/apache/i, /server: apache/i],
    'Nginx': [/nginx/i, /server: nginx/i],
    'Cloudflare': [/cloudflare/i, /__cfduid/i, /cf-ray/i],
    'AWS': [/aws\.amazonaws/i, /s3\.amazonaws/i, /cloudfront/i],
    'Google Cloud': [/gcloud/i, /googleapis/i, /appspot/i],
    'Docker': [/docker/i, /container/i],
    'Kubernetes': [/kubernetes/i, /k8s/i],
    'MySQL': [/mysql/i, /mysqli/i, /sql syntax/i],
    'PostgreSQL': [/postgresql/i, /pg_/i],
    'MongoDB': [/mongodb/i, /bson/i],
    'Redis': [/redis/i],
    'Memcached': [/memcached/i, /memcache/i],
    'Varnish': [/varnish/i, /x-varnish/i],
    'HAProxy': [/haproxy/i],
    'WAF': [/mod_security/i, /waf/i, /firewall/i, /cloudflare/i],
    'CDN': [/cdn\./i, /cdn-cgi/i, /fastly/i, /akamai/i, /cloudfront/i],
    'SSL/TLS': [/letsencrypt/i, /ssl/i, /tls/i, /certbot/i],
    'OpenSSH': [/openssh/i, /ssh-/i],
    'FTP': [/ftp/i, /ftps/i, /proftpd/i, /vsftpd/i],
    'SMTP': [/smtp/i, /sendmail/i, /postfix/i, /exim/i],
    'DNS': [/bind/i, /named/i, /dnsmasq/i, /powerdns/i],
  };

  records.forEach(record => {
    const text = flattenRecordToText(record);
    Object.entries(techPatterns).forEach(([tech, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(text)) {
          if (!technologies.has(tech)) {
            technologies.set(tech, { count: 0, sources: new Set(), evidences: [] });
          }
          const entry = technologies.get(tech);
          entry.count++;
          entry.sources.add(record.source || 'unknown');
          const match = text.match(pattern);
          if (match && entry.evidences.length < 3) {
            entry.evidences.push(match[0].slice(0, 100));
          }
        }
      });
    });
  });

  return technologies;
};

const detectVulnerabilities = (records, technologies) => {
  const vulnerabilities = [];
  const vulnChecks = {
    'WordPress': [
      { name: 'WordPress version leak', severity: 'low', check: /wp-json\/wp\/v2\/users/i, description: 'API utilisateur WordPress exposée' },
      { name: 'XML-RPC enabled', severity: 'medium', check: /xmlrpc\.php/i, description: 'XML-RPC activé, risque de brute force' },
      { name: 'wp-config backup', severity: 'high', check: /wp-config\.php~/i, description: 'Fichier de configuration WordPress backup trouvé' },
      { name: 'Debug mode enabled', severity: 'medium', check: /wp_debug/i, description: 'Mode debug WordPress activé' },
      { name: 'Directory listing', severity: 'low', check: /Index of \/wp-content/i, description: 'Listing de répertoire WordPress exposé' },
      { name: 'User enumeration', severity: 'medium', check: /\/author\//i, description: 'Énumération d\'utilisateurs WordPress possible' },
    ],
    'PHP': [
      { name: 'PHP version exposed', severity: 'low', check: /X-Powered-By: PHP\/[0-9.]+/i, description: 'Version PHP exposée dans les headers' },
      { name: 'PHP info exposed', severity: 'high', check: /phpinfo\.php/i, description: 'Fichier phpinfo.php accessible' },
      { name: 'Error reporting', severity: 'medium', check: /PHP Fatal error/i, description: 'Erreurs PHP affichées publiquement' },
    ],
    'Laravel': [
      { name: 'Debug mode', severity: 'high', check: /Whoops! There was an error/i, description: 'Mode debug Laravel activé en production' },
      { name: '.env exposed', severity: 'critical', check: /\.env/i, description: 'Fichier .env potentiellement accessible' },
      { name: 'APP_KEY in source', severity: 'critical', check: /APP_KEY=[a-zA-Z0-9:]+/i, description: 'Clé d\'application Laravel exposée' },
    ],
    'Symfony': [
      { name: 'Debug toolbar', severity: 'high', check: /sfDebugToolbar/i, description: 'Barre de debug Symfony activée' },
      { name: 'Profiler exposed', severity: 'high', check: /_profiler/i, description: 'Profiler Symfony exposé' },
    ],
    'Django': [
      { name: 'Debug mode', severity: 'high', check: /DisallowedHost at/i, description: 'Mode debug Django activé' },
      { name: 'SECRET_KEY exposed', severity: 'critical', check: /SECRET_KEY\s*=\s*['"][^'"]+['"]/i, description: 'Clé secrète Django exposée' },
    ],
    'MySQL': [
      { name: 'SQL error exposed', severity: 'medium', check: /SQL syntax.*MySQL/i, description: 'Erreur SQL MySQL exposée' },
      { name: 'MySQL dump found', severity: 'high', check: /-- MySQL dump/i, description: 'Dump MySQL trouvé' },
    ],
    'PostgreSQL': [
      { name: 'pg_dump found', severity: 'high', check: /-- PostgreSQL database dump/i, description: 'Dump PostgreSQL trouvé' },
    ],
    'Apache': [
      { name: 'Server status exposed', severity: 'low', check: /server-status/i, description: 'Page server-status exposée' },
      { name: 'Directory listing', severity: 'low', check: /Index of \//i, description: 'Listing de répertoire activé' },
    ],
    'Nginx': [
      { name: 'Nginx status', severity: 'low', check: /nginx_status/i, description: 'Page de statut Nginx exposée' },
    ],
    'SSH': [
      { name: 'Private key found', severity: 'critical', check: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/i, description: 'Clé privée SSH trouvée' },
    ],
    'AWS': [
      { name: 'AWS keys exposed', severity: 'critical', check: /AKIA[0-9A-Z]{16}/i, description: 'Clé d\'accès AWS exposée' },
    ],
    'Google Cloud': [
      { name: 'GCP keys exposed', severity: 'critical', check: /"private_key_id":/i, description: 'Clé de service GCP exposée' },
    ],
    'General': [
      { name: 'Email found in source', severity: 'low', check: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i, description: 'Adresse email trouvée dans le contenu' },
      { name: 'Password in plain text', severity: 'high', check: /(?:password|passwd|pwd|secret)\s*[:=]\s*['"]?([^'"]+)/i, description: 'Mot de passe en clair détecté' },
      { name: 'API key exposed', severity: 'high', check: /(?:api_key|apikey|api-key|token)\s*[:=]\s*['"]?([^'"]+)/i, description: 'Clé API potentiellement exposée' },
      { name: 'JWT token found', severity: 'medium', check: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i, description: 'Token JWT trouvé' },
      { name: 'Internal IP exposed', severity: 'low', check: /(?:192\.168\.|10\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.)\d{1,3}\.\d{1,3}/i, description: 'Adresse IP interne exposée' },
    ],
  };

  const techNames = technologies ? Array.from(technologies.keys()) : [];

  if (techNames.length === 0) {
    Object.keys(vulnChecks.General).forEach(key => {});
  }

  Object.entries(vulnChecks).forEach(([category, checks]) => {
    const shouldCheck = category === 'General' || techNames.some(tech => 
      tech.toLowerCase().includes(category.toLowerCase()) || 
      category.toLowerCase().includes(tech.toLowerCase())
    );

    if (shouldCheck) {
      records.forEach(record => {
        const text = flattenRecordToText(record);
        checks.forEach(check => {
          if (check.check.test(text)) {
            const match = text.match(check.check);
            const evidence = match ? match[0].slice(0, 200) : '';
            const alreadyFound = vulnerabilities.some(v => 
              v.name === check.name && v.evidence === evidence
            );
            if (!alreadyFound) {
              vulnerabilities.push({
                name: check.name,
                severity: check.severity,
                description: check.description,
                category: category,
                evidence: evidence,
                source: record.source || 'unknown',
              });
            }
          }
        });
      });
    }
  });

  vulnerabilities.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
  });

  return vulnerabilities;
};

const runDomainIntelligence = async (domain) => {
  return {
    domain,
    normalizedDomain: domain.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, ''),
    subdomains: [],
    relatedDomains: [],
    emails: [],
    phones: [],
    ips: [],
    technologies: {},
    vulnerabilities: [],
    dnsRecords: {},
    whoisInfo: null,
    sslInfo: null,
    hostingInfo: null,
    exposedFiles: [],
    exposedEndpoints: [],
    users: [],
    discoveryUrls: [],
    confidenceScore: 0,
  };
};

const safeSlice = (str, maxLength) => {
  if (!str) return 'N/A';
  if (typeof str !== 'string') return String(str);
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
};

const generateUniqueId = (prefix, value) => {
  const clean = String(value || '').replace(/[^a-zA-Z0-9]/g, '_');
  return `${prefix}:${clean}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
};

const buildRelationshipGraph = (profile, familyGroups) => {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();
  let nodeIdCounter = 0;

  const generateId = (prefix) => `${prefix}_${nodeIdCounter++}_${Math.random().toString(36).slice(2, 8)}`;

  const addNode = (id, label, type, group, extra = {}) => {
    const existingId = nodeMap.get(id);
    if (existingId) return existingId;
    const nodeId = generateId(type);
    const node = { id: nodeId, label, type, group, ...extra, position: { x: 0, y: 0 } };
    nodes.push(node);
    nodeMap.set(id, nodeId);
    return nodeId;
  };

  const addEdge = (from, to, label = '', strength = 1, type = 'solid') => {
    const edgeId = generateId('edge');
    edges.push({ 
      id: edgeId, 
      source: from, 
      target: to, 
      label, 
      strength,
      type: type,
      animated: type === 'family' || type === 'address',
      style: { 
        stroke: type === 'family' ? '#f59e0b' : 
                type === 'address' ? '#8b5cf6' : 
                type === 'email' ? '#3b82f6' : 
                type === 'username' ? '#a78bfa' : 
                type === 'domain' ? '#10b981' : 
                type === 'crypto' ? '#ef4444' : 
                type === 'phone' ? '#06b6d4' : 
                'rgba(255,255,255,0.3)'
      }
    });
  };

  const mainLabel = profile.namesList[0]?.value || profile.emailsList[0]?.value || profile.usernamesList[0]?.value || 'Sujet';
  const mainNode = addNode('subject', mainLabel, 'subject', 'core', {
    confidence: profile.confidenceScore,
    sourceCount: profile.sources.size,
    size: 40
  });
  nodeMap.set('subject_main', mainNode);

  profile.namesList.slice(0, 5).forEach(name => {
    if (!name?.value) return;
    const nodeId = addNode(generateUniqueId('name', name.value), name.value, 'name', 'identity', { count: name.count || 1, size: 18 });
    addEdge(mainNode, nodeId, 'nom', name.count || 1, 'solid');
  });

  profile.emailsList.slice(0, 8).forEach(email => {
    if (!email?.value) return;
    const nodeId = addNode(generateUniqueId('email', email.value), email.value, 'email', 'contact', { count: email.count || 1, size: 20 });
    addEdge(mainNode, nodeId, 'email', email.count || 1, 'email');
    const domain = email.value.split('@')[1];
    if (domain) {
      const domainNodeId = addNode(generateUniqueId('domain', domain), domain, 'domain', 'infrastructure', { count: 1, size: 16 });
      addEdge(nodeId, domainNodeId, 'domaine', 1, 'domain');
    }
  });

  profile.phonesList.slice(0, 5).forEach(phone => {
    if (!phone?.value) return;
    const nodeId = addNode(generateUniqueId('phone', phone.value), cleanPhoneDisplay(phone.value), 'phone', 'contact', { count: phone.count || 1, size: 18 });
    addEdge(mainNode, nodeId, 'téléphone', phone.count || 1, 'phone');
  });

  profile.usernamesList.slice(0, 8).forEach(username => {
    if (!username?.value) return;
    const nodeId = addNode(generateUniqueId('username', username.value), username.value, 'username', 'identity', { count: username.count || 1, size: 18 });
    addEdge(mainNode, nodeId, 'pseudo', username.count || 1, 'username');
  });

  profile.urlsList.slice(0, 6).forEach(url => {
    if (!url?.value) return;
    const displayValue = safeSlice(url.value, 50);
    const nodeId = addNode(generateUniqueId('url', url.value), displayValue, 'url', 'web', { count: url.count || 1, size: 16 });
    addEdge(mainNode, nodeId, 'profil web', url.count || 1, 'solid');
  });

  profile.cryptoBtcList.slice(0, 3).forEach(btc => {
    if (!btc?.value) return;
    const displayValue = safeSlice(btc.value, 12);
    const nodeId = addNode(generateUniqueId('btc', btc.value), displayValue, 'crypto', 'finance', { count: btc.count || 1, size: 16 });
    addEdge(mainNode, nodeId, 'BTC', btc.count || 1, 'crypto');
  });

  profile.cryptoEthList.slice(0, 3).forEach(eth => {
    if (!eth?.value) return;
    const displayValue = safeSlice(eth.value, 12);
    const nodeId = addNode(generateUniqueId('eth', eth.value), displayValue, 'crypto', 'finance', { count: eth.count || 1, size: 16 });
    addEdge(mainNode, nodeId, 'ETH', eth.count || 1, 'crypto');
  });

  profile.domainsList.slice(0, 5).forEach(domain => {
    if (!domain?.value) return;
    const nodeId = addNode(generateUniqueId('domain', domain.value), domain.value, 'domain', 'infrastructure', { count: domain.count || 1, size: 16 });
    addEdge(mainNode, nodeId, 'domaine', domain.count || 1, 'domain');
  });

  profile.locationsList.slice(0, 4).forEach(loc => {
    if (!loc?.value) return;
    const displayValue = safeSlice(loc.value, 40);
    const nodeId = addNode(generateUniqueId('loc', loc.value), displayValue, 'location', 'geography', { count: loc.count || 1, size: 16 });
    addEdge(mainNode, nodeId, 'localisation', loc.count || 1, 'solid');
  });

  profile.birthDatesList.slice(0, 3).forEach(date => {
    if (!date?.value) return;
    const displayDate = cleanDateDisplay(date.value);
    const nodeId = addNode(generateUniqueId('date', date.value), displayDate, 'birthDate', 'identity', { count: date.count || 1, size: 14 });
    addEdge(mainNode, nodeId, 'date naissance', date.count || 1, 'solid');
  });

  profile.passwordsList.slice(0, 3).forEach(pwd => {
    if (!pwd?.value) return;
    const masked = safeSlice(pwd.value, 3) + '***';
    const nodeId = addNode(generateUniqueId('pwd', pwd.value), masked, 'password', 'sensitive', { count: pwd.count || 1, size: 14 });
    addEdge(mainNode, nodeId, 'mot de passe', pwd.count || 1, 'solid');
  });

  profile.hashesList.slice(0, 3).forEach(hash => {
    if (!hash?.value) return;
    const short = safeSlice(hash.value, 12);
    const nodeId = addNode(generateUniqueId('hash', hash.value), short, 'hash', 'sensitive', { count: hash.count || 1, size: 14 });
    addEdge(mainNode, nodeId, 'hash', hash.count || 1, 'solid');
  });

  if (profile.familyMembers && profile.familyMembers.length > 0) {
    const familyGroupNode = addNode('family_group', 'Famille', 'familyGroup', 'family', { size: 24 });
    addEdge(mainNode, familyGroupNode, 'liens familiaux', profile.familyMembers.length, 'family');

    profile.familyMembers.forEach((fm, idx) => {
      const memberLabel = fm.member.prenom && fm.member.nom ? 
        `${sanitizeDisplayText(fm.member.prenom)} ${sanitizeDisplayText(fm.member.nom)}` : 
        (sanitizeDisplayText(fm.member.prenom || fm.member.nom) || `Membre ${idx + 1}`);
      const memberNodeId = addNode(generateUniqueId('family', fm.key), memberLabel, 'family', 'family', { 
        relation: fm.member.relation,
        count: fm.sourceCount,
        size: 18 
      });
      addEdge(familyGroupNode, memberNodeId, fm.member.relation || 'lien familial', 1, 'family');
      
      fm.relatedTo.forEach((relative, ridx) => {
        const relLabel = relative.prenom && relative.nom ? 
          `${relative.prenom} ${relative.nom}` : 
          (relative.prenom || relative.nom || relative.nom_complet || `Proche ${ridx + 1}`);
        const relNodeId = addNode(generateUniqueId('relative', normalizeName(relLabel)), relLabel, 'relative', 'family', { 
          relation: relative.relation,
          size: 16 
        });
        addEdge(memberNodeId, relNodeId, relative.relation || 'proche', 1, 'family');
      });
    });
  }

  if (profile.addressGroups && profile.addressGroups.length > 0) {
    profile.addressGroups.forEach((addrGroup, gidx) => {
      const addrNodeId = addNode(generateUniqueId('address_group', gidx), addrGroup.address.slice(0, 50), 'addressGroup', 'geography', { 
        residentCount: addrGroup.count,
        size: 22 
      });
      
      addrGroup.residents.forEach((resident, ridx) => {
        const residentLabel = resident.prenom && resident.nom ? 
          `${resident.prenom} ${resident.nom}` : 
          (resident.prenom || resident.nom || resident.nom_complet || `Résident ${ridx + 1}`);
        const residentNodeId = addNode(generateUniqueId('resident', normalizeName(residentLabel)), residentLabel, 'resident', 'geography', { 
          source: resident.source,
          size: 16 
        });
        addEdge(addrNodeId, residentNodeId, 'habite', 1, 'address');
      });
      
      addEdge(mainNode, addrNodeId, 'adresse partagée', addrGroup.count, 'address');
    });
  }

  const calculateLayout = () => {
    const centerX = 600;
    const centerY = 300;
    
    const mainNodeObj = nodes.find(n => n.id === mainNode);
    if (mainNodeObj) {
      mainNodeObj.position = { x: centerX, y: centerY };
    }

    const groupedNodes = new Map();
    nodes.forEach(node => {
      if (node.id === mainNode) return;
      if (!groupedNodes.has(node.group)) {
        groupedNodes.set(node.group, []);
      }
      groupedNodes.get(node.group).push(node);
    });

    let groupAngle = 0;
    const groupAngleIncrement = (2 * Math.PI) / Math.max(groupedNodes.size, 1);

    groupedNodes.forEach((groupNodes, group) => {
      const groupRadius = 200 + (Array.from(groupedNodes.keys()).indexOf(group) * 80);
      const nodeAngleIncrement = (Math.PI / 2) / Math.max(groupNodes.length, 1);
      
      groupNodes.forEach((node, idx) => {
        const nodeAngle = groupAngle + (idx * nodeAngleIncrement) - (Math.PI / 4);
        node.position = {
          x: centerX + Math.cos(nodeAngle) * groupRadius,
          y: centerY + Math.sin(nodeAngle) * groupRadius
        };
      });
      
      groupAngle += groupAngleIncrement;
    });
  };

  calculateLayout();
  
  return { nodes, edges };
};

const SearchPage = () => {
  const gridRef = useRef(null);
  const { user } = useAuth();
  
  const [searchType, setSearchType] = useState('discord');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedConversationData, setSelectedConversationData] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [breachProgress, setBreachProgress] = useState(null);
  const [hibpResults, setHibpResults] = useState({});
  const [identityProfile, setIdentityProfile] = useState(null);
  const [relationshipGraph, setRelationshipGraph] = useState(null);
  const [searchCache, setSearchCache] = useState(new Map());
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedResults, setEnrichedResults] = useState(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);
  const [familyGroups, setFamilyGroups] = useState(null);
  const [domainIntelligence, setDomainIntelligence] = useState(null);
  const [technologies, setTechnologies] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState(null);
  const [showSources, setShowSources] = useState(false);
  const [apiDetailItem, setApiDetailItem] = useState(null);
  const [showApiFiches, setShowApiFiches] = useState(true);
  const [apiCredits, setApiCredits] = useState(null);
  const [osintServices, setOsintServices] = useState([]);
  const [vulnPlugins, setVulnPlugins] = useState([]);
  const [intelxBuckets, setIntelxBuckets] = useState([]);
  const [victimManifest, setVictimManifest] = useState(null);
  const [victimLogId, setVictimLogId] = useState(null);
  const [selectedVictimFile, setSelectedVictimFile] = useState(null);
  const [victimFileSearch, setVictimFileSearch] = useState('');
  
  const [settings, setSettings] = useState({
    maxLines: 10000,
    targetId: '',
    advancedMode: false,
    firstName: '',
    birthDate: '',
    city: '',
    birthYear: '',
    exactMatch: false,
    checkHIBP: true,
    autoEnrich: true,
    enableGraph: true,
    detectFamily: false,
    domainIntel: true,
    vulnScan: true,
  });

  const [quota, setQuota] = useState(null);
  const [quotaError, setQuotaError] = useState(null);

  const normalizePlanName = (plan) => {
    if (!plan) return '';
    return plan.toString().toLowerCase();
  };

  const isPremiumSearchPlan = () => {
    const plan = normalizePlanName(quota?.planLabel || user?.accountType || '');
    return plan.includes('kazake') || plan.includes('flexion');
  };

  const getPremiumSearchWelcome = () => {
    const plan = normalizePlanName(quota?.planLabel || user?.accountType || '');
    if (plan.includes('kazake')) return 'Bienvenue Kazake';
    if (plan.includes('flexion')) return 'Bienvenue Flexion';
    return null;
  };

  const fetchQuota = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setQuota(null);
      return;
    }
    try {
      const response = await fetch('/api/auth/quota', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setQuota(data);
        setQuotaError(null);
      } else {
        setQuota(null);
        setQuotaError(data.error || 'Impossible de récupérer le quota');
      }
    } catch (err) {
      setQuota(null);
      setQuotaError(err.message || 'Impossible de récupérer le quota');
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [user]);

  useEffect(() => {
    const handleMove = (e) => {
      if (!gridRef.current) return;
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      gridRef.current.style.backgroundPosition = `${x}% ${y}%`;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const checkHIBP = async (email) => {
    if (!email) return null;
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`/api/hibp/account/${encodeURIComponent(email)}`, { headers });
      const json = await resp.json().catch(() => ({}));
      const breaches = Array.isArray(json.breaches) ? json.breaches : (json.breaches === null ? [] : json.breaches || []);
      return {
        found: Array.isArray(breaches) && breaches.length > 0,
        email,
        breaches: (breaches || []).map(b => ({
          name: b.Name || b.name || b.Title || 'Unknown',
          domain: b.Domain || b.domain || '',
          date: b.BreachDate || b.AddedDate || b.date || 'Unknown',
          dataClasses: b.DataClasses || b.dataClasses || [],
          description: b.Description || b.description || ''
        })),
        scrapedSection: json.scrapedSection || null,
        foundEmailsInSection: json.foundEmailsInSection || json.foundEmails || [],
        localMatches: json.localMatches || {},
        source: 'server-proxy'
      };
    } catch (e) {
      return null;
    }
  };

  const shouldKeepHibpResult = (result) => {
    // No filters - keep all API results
    return result !== null && result !== undefined;
  };
  
  const handleCopy = async (data, event) => {
    if (event) event.preventDefault();
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const finalContent = `${content}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nGENERATED BY SCRAPHUB\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    await navigator.clipboard.writeText(finalContent);
  };
  
  const downloadPDF = async (data, filename) => {
    const printWindow = window.open('', '_blank');
    const contentStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>SCRAPHUB - ${filename}</title>
      <style>
        body { background: #0a0a0f; color: #e8e8ee; font-family: 'Courier New', monospace; padding: 50px; }
        h1 { color: #fff; font-size: 32px; letter-spacing: 4px; }
        .content { background: #0f0f14; border: 1px solid #1f1f2f; border-radius: 12px; padding: 30px; white-space: pre-wrap; }
        .footer { border-top: 1px solid #1f1f2f; padding-top: 20px; text-align: center; color: #555; margin-top: 30px; }
      </style>
      </head>
      <body>
        <h1>SCRAPHUB</h1>
        <p>${new Date().toLocaleString()}</p>
        <div class="content">${contentStr}</div>
        <div class="footer">GENERATED BY SCRAPHUB</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };
  
  const downloadTXT = (data, filename) => {
    const contentStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const finalContent = `${contentStr}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nGENERATED BY SCRAPHUB\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    const blob = new Blob([finalContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

// ============================================================
// DISCORD MP EXTRACTOR V3 - ZERO EMOJIS - ULTRA RAPIDE
// ============================================================

const loadAllDiscordConversations = async () => {
    try {
        const response = await fetch('/mpreal.txt');
        if (!response.ok) throw new Error('Fichier mpreal.txt non trouve');
        const text = await response.text();
        const lines = text.split('\n');
        
        const conversations = [];
        let currentConv = null;
        let currentConvName = null;
        let currentMessages = [];
        let lineCount = 0;
        const maxLines = 500000;
        
        const msgCache = new Set();
        let convCounter = 0;
        
        for (const line of lines) {
            if (lineCount >= maxLines) break;
            lineCount++;
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            if (trimmed.startsWith('MP ENTRE') || trimmed.startsWith('≻ DM AVEC:') || trimmed.startsWith('MP ID:')) {
                if (currentConv && currentMessages.length > 0) {
                    // Extraire les participants du nom de la conversation
                    let participants = [];
                    if (currentConvName) {
                        // Format MP ENTRE
                        const mpMatch = currentConvName.match(/MP ENTRE\s*([^:]+):[^:]+:\s*(\d+)\s*ET\s*([^:]+):[^:]+:\s*(\d+)/);
                        if (mpMatch) {
                            participants = [mpMatch[1].trim(), mpMatch[3].trim()];
                        }
                        // Format DM AVEC
                        const dmMatch = currentConvName.match(/≻ DM AVEC:\s*([^(]+)\((\d+)\)/);
                        if (dmMatch) {
                            participants = [dmMatch[1].trim()];
                        }
                    }
                    
                    conversations.push({
                        id: currentConv,
                        name: currentConvName || 'Conversation ' + currentConv.slice(0, 8),
                        messages: [...currentMessages],
                        participants: participants
                    });
                }
                
                if (trimmed.startsWith('MP ID:')) {
                    currentConv = trimmed.replace('MP ID:', '').trim();
                } else if (trimmed.startsWith('MP ENTRE')) {
                    const idMatch = trimmed.match(/\((\d+)\)/);
                    currentConv = idMatch ? idMatch[1] : trimmed.replace('MP ENTRE', '').trim();
                } else {
                    const idMatch = trimmed.match(/\((\d+)\)/);
                    currentConv = idMatch ? idMatch[1] : trimmed.replace('≻ DM AVEC:', '').trim();
                }
                
                currentConvName = trimmed;
                currentMessages = [];
                continue;
            }
            
            if (trimmed.startsWith('AVEC:') && currentConv) {
                currentConvName = trimmed.replace('AVEC:', '').trim();
                continue;
            }
            
            if (trimmed === '--- FIN MP ---' || trimmed.startsWith('--- FIN MP')) {
                if (currentConv && currentMessages.length > 0) {
                    let participants = [];
                    if (currentConvName) {
                        const mpMatch = currentConvName.match(/MP ENTRE\s*([^:]+):[^:]+:\s*(\d+)\s*ET\s*([^:]+):[^:]+:\s*(\d+)/);
                        if (mpMatch) {
                            participants = [mpMatch[1].trim(), mpMatch[3].trim()];
                        }
                        const dmMatch = currentConvName.match(/≻ DM AVEC:\s*([^(]+)\((\d+)\)/);
                        if (dmMatch) {
                            participants = [dmMatch[1].trim()];
                        }
                    }
                    
                    conversations.push({
                        id: currentConv,
                        name: currentConvName || 'Conversation ' + currentConv.slice(0, 8),
                        messages: [...currentMessages],
                        participants: participants
                    });
                }
                currentConv = null;
                currentConvName = null;
                currentMessages = [];
                continue;
            }
            
            if (trimmed.startsWith('CONVERSATION')) {
                if (currentConv && currentMessages.length > 0) {
                    conversations.push({
                        id: currentConv,
                        name: currentConvName || 'Conversation ' + currentConv.slice(0, 8),
                        messages: [...currentMessages],
                        participants: []
                    });
                }
                convCounter++;
                currentConv = 'conv_' + convCounter;
                currentConvName = trimmed;
                currentMessages = [];
                continue;
            }
            
            if (currentConv) {
                const msg = parseMessageLineFast(trimmed);
                if (msg) {
                    const key = msg.timestamp + '|' + msg.author_id + '|' + msg.content.substring(0, 50);
                    if (!msgCache.has(key)) {
                        msgCache.add(key);
                        currentMessages.push(msg);
                    }
                }
            }
        }
        
        if (currentConv && currentMessages.length > 0) {
            let participants = [];
            if (currentConvName) {
                const mpMatch = currentConvName.match(/MP ENTRE\s*([^:]+):[^:]+:\s*(\d+)\s*ET\s*([^:]+):[^:]+:\s*(\d+)/);
                if (mpMatch) {
                    participants = [mpMatch[1].trim(), mpMatch[3].trim()];
                }
                const dmMatch = currentConvName.match(/≻ DM AVEC:\s*([^(]+)\((\d+)\)/);
                if (dmMatch) {
                    participants = [dmMatch[1].trim()];
                }
            }
            
            conversations.push({
                id: currentConv,
                name: currentConvName || 'Conversation ' + currentConv.slice(0, 8),
                messages: [...currentMessages],
                participants: participants
            });
        }
        
        return conversations;
        
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
};

const filterDiscordConversations = (conversations, targetId, searchTerm) => {
    const searchLower = searchTerm ? searchTerm.toLowerCase() : '';
    
    const filtered = conversations.filter(conv => {
        const hasTargetUser = targetId ? conv.messages.some(m => m.author_id === targetId) : true;
        const hasSearchTerm = searchLower ? conv.messages.some(m => m.content.toLowerCase().includes(searchLower)) : true;
        return hasTargetUser && hasSearchTerm;
    });
    
    const allFilteredMessages = [];
    filtered.forEach(conv => allFilteredMessages.push(...conv.messages));
    
    const uniqueAuthorsMap = new Map();
    allFilteredMessages.forEach(m => {
        const key = m.author_id || m.author_username || 'unknown';
        if (!uniqueAuthorsMap.has(key)) {
            uniqueAuthorsMap.set(key, {
                id: m.author_id || key,
                name: m.author_display || m.author_username || key,
                avatar: m.avatar_url || null,
                messageCount: 0
            });
        }
        const author = uniqueAuthorsMap.get(key);
        if (author) author.messageCount++;
    });
    
    // Fonction pour extraire le nom propre et l'avatar d'un nom de conversation
    const cleanConversationName = (name) => {
        if (!name) return { displayName: 'Conversation', avatar: null };
        
        // Si c'est un MP ENTRE avec avatar
        const mpMatch = name.match(/MP ENTRE\s*([^:]+)\s*:\s*([^:]+)\s*:\s*(\d+)/);
        if (mpMatch) {
            return {
                displayName: `MP ENTRE ${mpMatch[1]}`,
                avatar: mpMatch[2].trim(),
                participants: [mpMatch[1].trim()]
            };
        }
        
        // Si c'est un DM AVEC avec avatar
        const dmMatch = name.match(/≻ DM AVEC:\s*([^(]+)\((\d+)\)/);
        if (dmMatch) {
            return {
                displayName: `DM AVEC: ${dmMatch[1].trim()}`,
                avatar: null, // Pas d'avatar dans ce format
                participants: [dmMatch[1].trim()]
            };
        }
        
        // Si c'est un GROUPE
        const groupMatch = name.match(/GROUPE:\s*([^:]+)/);
        if (groupMatch) {
            return {
                displayName: `GROUPE: ${groupMatch[1]}`,
                avatar: null,
                participants: groupMatch[1].split(',').map(p => p.trim())
            };
        }
        
        // Format simple (nom#0)
        const simpleMatch = name.match(/^([^#]+)#0/);
        if (simpleMatch) {
            return {
                displayName: simpleMatch[1],
                avatar: null,
                participants: [simpleMatch[1]]
            };
        }
        
        return {
            displayName: name.slice(0, 50),
            avatar: null,
            participants: []
        };
    };
    
    return {
        conversations: filtered.map(conv => {
            const cleaned = cleanConversationName(conv.name || 'Conversation');
            
            // Compter les participants
            const participants = new Set();
            conv.messages.forEach(m => {
                const key = m.author_id || m.author_username || 'unknown';
                participants.add(key);
            });
            
            // Si aucun participant dans les messages, utiliser ceux du nom
            if (participants.size === 0 && cleaned.participants.length > 0) {
                cleaned.participants.forEach(p => participants.add(p));
            }
            
            return {
                id: conv.id,
                name: cleaned.displayName,
                avatar: cleaned.avatar,
                totalMessages: conv.messages.length,
                participants: participants.size || 1,
                targetMessagesCount: targetId ? conv.messages.filter(m => m.author_id === targetId).length : 0
            };
        }),
        totalConversations: filtered.length,
        totalMessages: allFilteredMessages.length,
        uniqueAuthors: Array.from(uniqueAuthorsMap.values()),
        allMessages: allFilteredMessages
    };
};
const parseMessageLineFast = (line) => {
    const match1 = line.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.*)$/);
    if (match1) {
        const author = match1[2].trim();
        const idMatch = author.match(/\((\d+)\)$/);
        return {
            author_id: idMatch ? idMatch[1] : null,
            author_username: author,
            author_display: author,
            avatar_url: null,
            content: match1[3].trim(),
            timestamp: match1[1].trim(),
            media_urls: []
        };
    }
    
    if (line.startsWith('{')) {
        try {
            const data = JSON.parse(line);
            if (data.author_id) {
                return {
                    author_id: String(data.author_id),
                    author_username: data.author_username || '',
                    author_display: data.author_display || data.author_username || '',
                    avatar_url: data.avatar_url || null,
                    content: data.content || '',
                    timestamp: data.timestamp || '',
                    media_urls: []
                };
            }
        } catch(e) {}
    }
    
    return null;
};

const loadFullDiscordConversation = async (convId) => {
    try {
        const response = await fetch('/mpreal.txt');
        const text = await response.text();
        const lines = text.split('\n');
        let targetMessages = [];
        let inTarget = false;
        let found = false;
        
        // Nettoyer l'ID reçu
        const cleanId = convId.replace(/^≻\s*DM\s*AVEC:\s*/, '').replace(/\(.*\)$/, '').trim();
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // Détection du début de la conversation
            if (trimmed.startsWith('MP ID:') && trimmed.includes(cleanId)) {
                inTarget = true;
                found = true;
                continue;
            }
            
            if (trimmed.startsWith('MP ENTRE') && trimmed.includes(cleanId)) {
                inTarget = true;
                found = true;
                continue;
            }
            
            if (trimmed.startsWith('≻ DM AVEC:') && trimmed.includes(cleanId)) {
                inTarget = true;
                found = true;
                continue;
            }
            
            // Si on est dans la bonne conversation, parser les messages
            if (inTarget) {
                if (trimmed === '--- FIN MP ---' || trimmed.startsWith('--- FIN MP')) {
                    break;
                }
                const msg = parseMessageLineFast(trimmed);
                if (msg) {
                    targetMessages.push(msg);
                }
            }
        }
        
        // Si pas trouvé, chercher par ID partiel
        if (!found && cleanId.length > 8) {
            const partialId = cleanId.slice(0, 8);
            inTarget = false;
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                if (trimmed.includes(partialId) && 
                    (trimmed.startsWith('MP ID:') || trimmed.startsWith('MP ENTRE') || trimmed.startsWith('≻ DM AVEC:'))) {
                    inTarget = true;
                    found = true;
                    continue;
                }
                
                if (inTarget) {
                    if (trimmed === '--- FIN MP ---' || trimmed.startsWith('--- FIN MP')) {
                        break;
                    }
                    const msg = parseMessageLineFast(trimmed);
                    if (msg) {
                        targetMessages.push(msg);
                    }
                }
            }
        }
        
        // Si toujours pas trouvé, chercher dans les noms de conversation
        if (!found) {
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                if ((trimmed.startsWith('MP ENTRE') || trimmed.startsWith('≻ DM AVEC:')) && 
                    trimmed.toLowerCase().includes(cleanId.toLowerCase())) {
                    inTarget = true;
                    found = true;
                    continue;
                }
                
                if (inTarget) {
                    if (trimmed === '--- FIN MP ---' || trimmed.startsWith('--- FIN MP')) {
                        break;
                    }
                    const msg = parseMessageLineFast(trimmed);
                    if (msg) {
                        targetMessages.push(msg);
                    }
                }
            }
        }
        
        return targetMessages;
        
    } catch (err) {
        console.error('Erreur:', err);
        return [];
    }
};

const getConversationStats = (conversations) => {
    const stats = {
        totalConversations: conversations.length,
        totalMessages: 0,
        uniqueAuthors: new Set(),
        authorsCount: {},
        oldestMessage: null,
        newestMessage: null
    };
    
    conversations.forEach(conv => {
        stats.totalMessages += conv.messages.length;
        conv.messages.forEach(msg => {
            if (msg.author_id) {
                stats.uniqueAuthors.add(msg.author_id);
                stats.authorsCount[msg.author_id] = (stats.authorsCount[msg.author_id] || 0) + 1;
            }
            if (msg.timestamp && msg.timestamp !== 'Date inconnue') {
                if (!stats.oldestMessage || msg.timestamp < stats.oldestMessage) {
                    stats.oldestMessage = msg.timestamp;
                }
                if (!stats.newestMessage || msg.timestamp > stats.newestMessage) {
                    stats.newestMessage = msg.timestamp;
                }
            }
        });
    });
    
    return stats;
};

const findMessagesWithContext = async (searchTerm, contextSize = 10) => {
    try {
        const response = await fetch('/mpreal.txt');
        const text = await response.text();
        const lines = text.split('\n');
        
        const results = [];
        let currentConv = null;
        let currentMessages = [];
        let convStart = 0;
        let lineIndex = 0;
        const searchLower = searchTerm.toLowerCase();
        
        for (const line of lines) {
            const trimmed = line.trim();
            lineIndex++;
            
            if (trimmed.startsWith('MP ENTRE') || trimmed.startsWith('≻ DM AVEC:') || trimmed.startsWith('MP ID:')) {
                if (currentConv && currentMessages.length > 0) {
                    const hasMatch = currentMessages.some(msg => 
                        msg.content.toLowerCase().includes(searchLower)
                    );
                    if (hasMatch) {
                        results.push({
                            conversation: currentConv,
                            messages: currentMessages,
                            startLine: convStart,
                            matchCount: currentMessages.filter(msg => 
                                msg.content.toLowerCase().includes(searchLower)
                            ).length
                        });
                    }
                }
                currentConv = trimmed;
                currentMessages = [];
                convStart = lineIndex;
                continue;
            }
            
            if (trimmed === '--- FIN MP ---' || trimmed.startsWith('--- FIN MP')) {
                if (currentConv && currentMessages.length > 0) {
                    const hasMatch = currentMessages.some(msg => 
                        msg.content.toLowerCase().includes(searchLower)
                    );
                    if (hasMatch) {
                        results.push({
                            conversation: currentConv,
                            messages: currentMessages,
                            startLine: convStart,
                            matchCount: currentMessages.filter(msg => 
                                msg.content.toLowerCase().includes(searchLower)
                            ).length
                        });
                    }
                }
                currentConv = null;
                currentMessages = [];
                continue;
            }
            
            if (currentConv) {
                const msg = parseMessageLineFast(trimmed);
                if (msg) {
                    currentMessages.push({
                        ...msg,
                        lineIndex: lineIndex
                    });
                }
            }
        }
        
        if (currentConv && currentMessages.length > 0) {
            const hasMatch = currentMessages.some(msg => 
                msg.content.toLowerCase().includes(searchLower)
            );
            if (hasMatch) {
                results.push({
                    conversation: currentConv,
                    messages: currentMessages,
                    startLine: convStart,
                    matchCount: currentMessages.filter(msg => 
                        msg.content.toLowerCase().includes(searchLower)
                    ).length
                });
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
};
  const enrichWithReverseSearch = async (entity, type, sourceRecords = []) => {
    const results = { entity, type, found: [], associations: {} };
    const target = String(entity || '').trim().toLowerCase();
    if (!target || sourceRecords.length === 0) return results;

    try {
      const parsedRecords = sourceRecords.map(r => parseRecordContent(r));
      const matchingRecords = parsedRecords.filter(record => {
        const text = flattenRecordToText(record).toLowerCase();
        return text.includes(target);
      });

      results.found = matchingRecords;
      const emails = new Set();
      const phones = new Set();
      const names = new Set();
      const domains = new Set();

      matchingRecords.forEach(record => {
        const text = flattenRecordToText(record);
        extractEmailsFromText(text).forEach(e => emails.add(e));
        extractPhonesFromText(text).forEach(p => phones.add(p));
        extractUrlsFromText(text).forEach(u => {
          try {
            domains.add(new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, ''));
          } catch(e) {}
        });
        const d = record.parsedData || record;
        if (d.prenom) names.add(normalizeName(d.prenom));
        if (d.nom) names.add(normalizeName(d.nom));
        if (d.nom_complet) names.add(normalizeName(d.nom_complet));
      });

      results.associations = {
        emails: [...emails].slice(0, 20),
        phones: [...phones].slice(0, 20),
        names: [...names].slice(0, 20),
        domains: [...domains].slice(0, 20)
      };
    } catch (e) {}
    return results;
  };

  const runEnrichmentPipeline = async (profile, records) => {
    setIsEnriching(true);
    const enrichmentResults = {
      byEmail: {},
      byPhone: {},
      byUsername: {},
      byDomain: {},
      byCrypto: {},
    };
    const topEmails = profile.emailsList.slice(0, 3);
    for (const email of topEmails) {
      enrichmentResults.byEmail[email.value] = await enrichWithReverseSearch(email.value, 'email', records);
    }
    const topPhones = profile.phonesList.slice(0, 3);
    for (const phone of topPhones) {
      enrichmentResults.byPhone[phone.value] = await enrichWithReverseSearch(phone.value, 'phone', records);
    }
    const topUsernames = profile.usernamesList.slice(0, 3);
    for (const username of topUsernames) {
      enrichmentResults.byUsername[username.value] = await enrichWithReverseSearch(username.value, 'username', records);
    }
    const topDomains = profile.domainsList.slice(0, 3);
    for (const domain of topDomains) {
      enrichmentResults.byDomain[domain.value] = await enrichWithReverseSearch(domain.value, 'domain', records);
    }
    setEnrichedResults(enrichmentResults);
    setIsEnriching(false);
  };

  const handleVictimManifest = async (logId) => {
    try {
      setVictimLogId(logId);
      const manifest = await getVictimManifest(logId);
      setVictimManifest(manifest);
    } catch (e) {
      console.error('Erreur récupération manifeste:', e);
    }
  };

  const handleVictimFileDownload = async (logId, fileId) => {
    try {
      const file = await getVictimFile(logId, fileId);
      setSelectedVictimFile({
        content: file.content || file.data || file,
        path: file.path || file.filename || fileId
      });
    } catch (e) {
      console.error('Erreur récupération fichier:', e);
    }
  };

  const handleVictimLogDownload = async (logId) => {
    try {
      const { blob, filename } = await downloadVictimLog(logId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erreur téléchargement log:', e);
    }
  };

  const handleOsintLookup = async (service, value) => {
    try {
      const result = await searchOsintLookup(service, value);
      return result;
    } catch (e) {
      console.error('Erreur OSINT lookup:', e);
      return null;
    }
  };

  const handleIntelxDownload = async (systemid, bucket, type = 1, name = null) => {
    try {
      const { blob, filename, creditsRemaining } = await downloadIntelxItem(systemid, bucket, type, name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      if (creditsRemaining) {
        setApiCredits(prev => prev ? { ...prev, remaining: parseInt(creditsRemaining) } : prev);
      }
    } catch (e) {
      console.error('Erreur téléchargement IntelX:', e);
    }
  };

  const handleVulnScan = async (q = null, plugin = null, page = 0) => {
    try {
      const result = await searchVulnScan(q, plugin, page);
      return result;
    } catch (e) {
      console.error('Erreur VulnScan:', e);
      return null;
    }
  };

  const handleBlacksantaUnifiedSearch = async (query) => {
    try {
      const result = await searchBlacksantaUnified(query);
      return result;
    } catch (e) {
      console.error('Erreur recherche unifiée:', e);
      return null;
    }
  };

  const handleBlacksantaStealerSearch = async (query, sid = null, fid = null, cursor = null) => {
    try {
      const result = await searchBlacksantaStealer(query, sid, fid, cursor);
      return result;
    } catch (e) {
      console.error('Erreur recherche stealer:', e);
      return null;
    }
  };
  
  const searchDataLeak = async (searchTerm, advancedFilters) => {
    let queryParts = [];
    if (searchTerm && searchTerm.trim()) queryParts.push(searchTerm.trim());
    if (advancedFilters.advancedMode) {
      if (advancedFilters.firstName) queryParts.push(advancedFilters.firstName);
      if (advancedFilters.birthDate) queryParts.push(normalizeDate(advancedFilters.birthDate));
      if (advancedFilters.city) queryParts.push(advancedFilters.city);
      if (advancedFilters.birthYear) queryParts.push(advancedFilters.birthYear);
    }
    const combinedQuery = queryParts.join(' ');
    if (!combinedQuery) return { success: false, error: 'Veuillez entrer des critères de recherche' };

    const cacheKey = `data_${combinedQuery}_${advancedFilters.exactMatch}_${settings.maxLines}`;
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        return cached.result;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/sqlite/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: combinedQuery, exactMatch: advancedFilters.exactMatch || false, limit: settings.maxLines })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur de recherche');
      
      const matchedRecords = data.results || [];
      const sourcesMap = new Map();
      matchedRecords.forEach(record => {
        const sourceName = record.source || 'unknown';
        if (!sourcesMap.has(sourceName)) {
          sourcesMap.set(sourceName, { name: sourceName, entries: 0, date: '2026-05-06', records: [] });
        }
        sourcesMap.get(sourceName).entries++;
        sourcesMap.get(sourceName).records.push(parseRecordContent(record));
      });
      
      const parsedRecords = matchedRecords.map(r => parseRecordContent(r));
      const allEmails = new Set();
      parsedRecords.forEach(record => {
        const data = record.parsedData || record;
        if (data.email) allEmails.add(normalizeEmail(data.email));
        if (data.courriel) allEmails.add(normalizeEmail(data.courriel));
        if (data.content) extractEmailsFromText(data.content).forEach(email => allEmails.add(email));
        if (data.allocataire?.courriel) allEmails.add(normalizeEmail(data.allocataire.courriel));
      });
      extractEmailsFromText(combinedQuery).forEach(email => allEmails.add(email));
      
      let hibpData = {};
      if (settings.checkHIBP && allEmails.size > 0) {
        const emailsList = Array.from(allEmails);
        for (let i = 0; i < Math.min(emailsList.length, 10); i++) {
          const email = emailsList[i];
          setBreachProgress({
            current: i + 1,
            total: Math.min(emailsList.length, 10),
            email: email,
            percent: ((i + 1) / Math.min(emailsList.length, 10)) * 100
          });
          const hibpResult = await checkHIBP(email);
          if (shouldKeepHibpResult(hibpResult)) {
            hibpData[email] = hibpResult;
            setHibpResults(prev => ({...prev, [email]: hibpResult}));
          }
        }
        setBreachProgress(null);
      }

      const profile = buildIdentityProfile(parsedRecords);
      const familyConns = settings.detectFamily ? findFamilyConnections(parsedRecords) : null;
      const graph = settings.enableGraph ? buildRelationshipGraph(profile, familyConns) : null;
      const detectedTechs = detectTechnologies(parsedRecords);
      const detectedVulns = settings.vulnScan ? detectVulnerabilities(parsedRecords, detectedTechs) : [];
      
      setIdentityProfile(profile);
      setRelationshipGraph(graph);
      setFamilyGroups(familyConns);
      setTechnologies(detectedTechs);
      setVulnerabilities(detectedVulns);
      
      let lookup2bzResult = null;
      try {
        lookup2bzResult = await searchLookup2bzAll(combinedQuery);
      } catch (lookupError) {
        console.warn('Lookup2bz merge failed:', lookupError?.message || lookupError);
      }

      const apiRecords = Array.isArray(lookup2bzResult?.records) ? lookup2bzResult.records : [];
      const apiMergedRecords = apiRecords.map((entry) => ({
        content: JSON.stringify(entry),
        source: entry.source || 'lookup2bz',
        parsedData: entry,
      }));

      const mergedAllRecords = [...parsedRecords, ...apiMergedRecords];
      const mergedSources = [...Array.from(sourcesMap.values())];
      if (lookup2bzResult && Array.isArray(lookup2bzResult.serviceResponses)) {
        mergedSources.push({
          name: 'Lookup2bz',
          entries: lookup2bzResult.totalMatches || apiRecords.length,
          date: '2026-06-01',
          records: apiRecords,
        });
      }

      const mergedEmails = new Set(Array.from(allEmails));
      apiRecords.forEach((entry) => {
        const extracted = [
          entry.email,
          entry.courriel,
          entry.mail,
          entry.username,
          entry.login,
          entry.phone,
          entry.telephone,
          entry.phone_number,
          entry.phone_national,
        ].filter(Boolean);
        extracted.forEach((value) => mergedEmails.add(normalizeEmail(String(value))));
        extractEmailsFromText(JSON.stringify(entry)).forEach((email) => mergedEmails.add(email));
      });

      const result = {
        success: true,
        type: 'data_leak',
        searchTerm: combinedQuery,
        totalMatches: mergedAllRecords.length,
        sources: mergedSources,
        allRecords: mergedAllRecords,
        foundEmails: Array.from(mergedEmails),
        hibpResults: Object.keys(hibpData).length > 0 ? hibpData : null,
        identityProfile: profile,
        relationshipGraph: graph,
        familyGroups: familyConns,
        technologies: detectedTechs,
        vulnerabilities: detectedVulns,
        lookup2bzResults: lookup2bzResult,
      };

      const newCache = new Map(searchCache);
      newCache.set(cacheKey, { result, timestamp: Date.now() });
      setSearchCache(newCache);
      
      if (settings.autoEnrich && parsedRecords.length > 0) {
        setTimeout(() => runEnrichmentPipeline(profile, parsedRecords), 500);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  const searchDomainIntelligence = async (domain) => {
    if (!domain || !domain.trim()) return { success: false, error: 'Veuillez entrer un nom de domaine' };
    const cleanedDomain = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
    
    const cacheKey = `domain_${cleanedDomain}`;
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) return cached.result;
    }
    
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/domain/intel', {
        method: 'POST',
        headers,
        body: JSON.stringify({ domain: cleanedDomain })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur de recherche domaine');

      const intel = data.domainIntelligence || data;
      const allEmails = new Set(intel.emails || []);

      let hibpData = {};
      if (settings.checkHIBP && allEmails.size > 0) {
        const emailsList = Array.from(allEmails).slice(0, 10);
        for (let i = 0; i < emailsList.length; i++) {
          const email = emailsList[i];
          setBreachProgress({
            current: i + 1,
            total: emailsList.length,
            email: email,
            percent: ((i + 1) / emailsList.length) * 100
          });
          const hibpResult = await checkHIBP(email);
          if (shouldKeepHibpResult(hibpResult)) {
            hibpData[email] = hibpResult;
            setHibpResults(prev => ({...prev, [email]: hibpResult}));
          }
        }
        setBreachProgress(null);
      }

      setDomainIntelligence(intel);
      setIdentityProfile(null);
      setRelationshipGraph(null);
      setTechnologies(new Map(Object.entries(intel.technologies || {})));
      setVulnerabilities(intel.vulnerabilities || []);

      const result = {
        success: true,
        type: 'domain_intel',
        searchTerm: cleanedDomain,
        domainIntelligence: intel,
        identityProfile: null,
        relationshipGraph: null,
        totalMatches: 0,
        sources: [],
        allRecords: [],
        foundEmails: Array.from(allEmails),
        hibpResults: Object.keys(hibpData).length > 0 ? hibpData : null,
        technologies: new Map(Object.entries(intel.technologies || {})),
        vulnerabilities: intel.vulnerabilities || [],
      };

      const newCache = new Map(searchCache);
      newCache.set(cacheKey, { result, timestamp: Date.now() });
      setSearchCache(newCache);

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  const isVillettiQuery = () => {
    const normalizedQuery = searchQuery.toLowerCase();
    if (normalizedQuery.includes('villetti')) return true;
    if (settings.advancedMode) {
      const advancedText = [settings.firstName, settings.birthDate, settings.city, settings.birthYear].join(' ').toLowerCase();
      return advancedText.includes('villetti');
    }
    return false;
  };

  const applySearchResultState = (result) => {
    if (!result) return;

    if (result.identityProfile) {
      setIdentityProfile(result.identityProfile);
    } else {
      setIdentityProfile(null);
    }

    if (result.relationshipGraph) {
      setRelationshipGraph(result.relationshipGraph);
    } else {
      setRelationshipGraph(null);
    }

    if (result.familyGroups) {
      setFamilyGroups(result.familyGroups);
    } else {
      setFamilyGroups(null);
    }

    if (result.domainIntelligence) {
      setDomainIntelligence(result.domainIntelligence);
    } else if (searchType === 'domain') {
      setDomainIntelligence(null);
    }

    if (result.technologies) {
      setTechnologies(result.technologies);
    } else {
      setTechnologies(null);
    }

    if (result.vulnerabilities) {
      setVulnerabilities(result.vulnerabilities);
    } else {
      setVulnerabilities([]);
    }

    if (result.hibpResults) {
      setHibpResults(result.hibpResults);
    } else {
      setHibpResults({});
    }

    if (result.enrichedResults) {
      setEnrichedResults(result.enrichedResults);
    } else {
      setEnrichedResults(null);
    }
  };

  const villettiBanArt = `⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠄⠂⠀⠁⠀⠀⠀⠀⠀⠀⠈⠈⠉⠁⠀⠒⠢⢄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`;

  const handleSearch = async () => {
    if (!user) {
      setResults({ error: 'Connecte-toi pour utiliser ton quota de recherche.' });
      return;
    }

    const hasQuery = searchQuery.trim();
    const hasTargetId = settings.targetId.trim();
    const hasAdvanced = settings.advancedMode && (settings.firstName || settings.birthDate || settings.city || settings.birthYear);
    
    if (searchType === 'discord' && !hasQuery && !hasTargetId) {
      setResults({ error: 'Veuillez entrer un terme de recherche ou un ID cible' });
      return;
    }
    if ((searchType === 'data' || searchType === 'domain') && !hasQuery && !hasAdvanced) {
      setResults({ error: 'Veuillez entrer un terme de recherche ou activer les filtres avancés' });
      return;
    }

    if (isVillettiQuery()) {
      setResults({ blocked: true, blockedArt: villettiBanArt, blockedMessage: 'ACCÈS REFUSÉ', searchTerm: searchQuery || settings.targetId });
      return;
    }
    
    setIsSearching(true);
    setResults(null);
    setSelectedConversation(null);
    setSelectedConversationData(null);
    setShowGraph(false);
    setSelectedRecord(null);
    setHibpResults({});
    setBreachProgress(null);
    setIdentityProfile(null);
    setRelationshipGraph(null);
    setEnrichedResults(null);
    setFamilyGroups(null);
    setSelectedGraphNode(null);
    setDomainIntelligence(null);
    setTechnologies(null);
    setVulnerabilities(null);
    setVictimManifest(null);
    setVictimLogId(null);
    setSelectedVictimFile(null);
    
    try {
      let result;
if (searchType === 'discord') {
    const allConvs = await loadAllDiscordConversations();
    const filtered = filterDiscordConversations(allConvs, settings.targetId, searchQuery);
    const pseudoRecords = filtered.allMessages.map(msg => ({
        content: JSON.stringify({
            author_username: msg.author_username,
            author_display: msg.author_display,
            author_id: msg.author_id,
            avatar_url: msg.avatar_url, // AJOUTE ICI
            message: msg.content,
            timestamp: msg.timestamp
        }),
        source: 'discord_mp',
        parsedData: {
            username: msg.author_username || msg.author_display,
            author_id: msg.author_id,
            avatar_url: msg.avatar_url, // AJOUTE ICI
            content: msg.content,
            timestamp: msg.timestamp
        }
    }));
        
        const profile = buildIdentityProfile(pseudoRecords);
        const familyConns = settings.detectFamily ? findFamilyConnections(pseudoRecords) : null;
        const graph = settings.enableGraph ? buildRelationshipGraph(profile, familyConns) : null;
        const detectedTechs = detectTechnologies(pseudoRecords);
        const detectedVulns = settings.vulnScan ? detectVulnerabilities(pseudoRecords, detectedTechs) : [];
        
        setIdentityProfile(profile);
        setRelationshipGraph(graph);
        setFamilyGroups(familyConns);
        setTechnologies(detectedTechs);
        setVulnerabilities(detectedVulns);
        
        result = filtered;
        result.success = true;
        result.type = 'discord_mp';
        result.searchTerm = searchQuery || (settings.targetId ? `ID: ${settings.targetId}` : 'tous');
        result.stats = { totalConversations: filtered.totalConversations, totalMessages: filtered.totalMessages, uniqueAuthors: filtered.uniqueAuthors.length };
        result.identityProfile = profile;
        result.relationshipGraph = graph;
        result.familyGroups = familyConns;
        result.technologies = detectedTechs;
        result.vulnerabilities = detectedVulns;
        
        const allText = filtered.allMessages.map(m => m.content).join(' ');
        const emailsFromDiscord = extractEmailsFromText(allText);
        result.foundEmails = emailsFromDiscord;
        
        if (emailsFromDiscord.length > 0 && settings.checkHIBP) {
          const hibpData = {};
          for (let i = 0; i < Math.min(emailsFromDiscord.length, 5); i++) {
            const email = emailsFromDiscord[i];
            setBreachProgress({
              current: i + 1,
              total: Math.min(emailsFromDiscord.length, 5),
              email: email,
              percent: ((i + 1) / Math.min(emailsFromDiscord.length, 5)) * 100
            });
            const hibpResult = await checkHIBP(email);
            if (shouldKeepHibpResult(hibpResult)) {
              hibpData[email] = hibpResult;
              setHibpResults(prev => ({...prev, [email]: hibpResult}));
            }
          }
          if (Object.keys(hibpData).length > 0) result.hibpResults = hibpData;
          setBreachProgress(null);
        }

        if (settings.autoEnrich && pseudoRecords.length > 0) {
          setTimeout(() => runEnrichmentPipeline(profile, pseudoRecords), 500);
        }
      } else if (searchType === 'domain') {
        result = await searchDomainIntelligence(searchQuery);
      } else {
        result = await searchDataLeak(searchQuery, settings);
      }
      if (result?.success) {
        applySearchResultState(result);
      }
      setResults(result);
      await fetchQuota();
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setIsSearching(false);
      setBreachProgress(null);
    }
  };
  
  const formatTimestamp = (ts) => {
    if (!ts) return 'Date inconnue';
    return ts.replace('T', ' ').substring(0, 19);
  };

  const TechnologiesPanel = ({ technologies }) => {
    if (!technologies || technologies.size === 0 || searchType === 'domain') return null;

    const categories = {
      'CMS': ['WordPress', 'Joomla', 'Drupal', 'Magento', 'Shopify', 'WooCommerce'],
      'Framework': ['PHP', 'Laravel', 'Symfony', 'Django', 'Ruby on Rails', 'Node.js', 'React', 'Vue.js', 'Angular'],
      'Bibliothèque': ['jQuery', 'Bootstrap', 'Tailwind CSS'],
      'Serveur': ['Apache', 'Nginx'],
      'CDN/WAF': ['Cloudflare', 'AWS', 'Google Cloud', 'CDN', 'WAF', 'Fastly', 'Akamai'],
      'Base de données': ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Memcached'],
      'Infrastructure': ['Docker', 'Kubernetes', 'Varnish', 'HAProxy'],
      'Sécurité': ['SSL/TLS', 'OpenSSH'],
      'Protocoles': ['FTP', 'SMTP', 'DNS'],
    };

    const categorized = {};
    Object.entries(categories).forEach(([cat, techs]) => {
      categorized[cat] = [];
      techs.forEach(tech => {
        if (technologies.has(tech)) {
          categorized[cat].push({ name: tech, info: technologies.get(tech) });
        }
      });
    });

    return (
      <div className="mb-6 bg-black rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            Technologies détectées ({technologies.size})
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categorized).map(([category, techs]) => {
              if (techs.length === 0) return null;
              return (
                <div key={category} className="bg-black rounded-xl border border-white/[0.06] p-3">
                  <h4 className="text-[10px] uppercase text-white/40 mb-2">{category}</h4>
                  <div className="space-y-1">
                    {techs.map((tech, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-xs text-white/70">{tech.name}</span>
                        {tech.info && tech.info.count > 0 && (
                          <span className="text-[10px] text-white/30">{tech.info.count} références</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const VulnerabilitiesPanel = ({ vulnerabilities }) => {
    if (!vulnerabilities || vulnerabilities.length === 0 || searchType === 'domain') return null;

    const severityColors = {
      critical: 'border-white/10 bg-white/5 text-white/70',
      high: 'border-white/10 bg-white/5 text-white/70',
      medium: 'border-white/10 bg-white/5 text-white/70',
      low: 'border-white/10 bg-white/5 text-white/70',
    };

    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    vulnerabilities.forEach(v => counts[v.severity]++);

    return (
      <div className="mb-6 bg-black rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            Vulnérabilités détectées ({vulnerabilities.length})
          </h3>
          <div className="flex gap-4 mt-2">
            {counts.critical > 0 && <span className="text-xs text-white/70">Critiques: {counts.critical}</span>}
            {counts.high > 0 && <span className="text-xs text-white/70">Hautes: {counts.high}</span>}
            {counts.medium > 0 && <span className="text-xs text-white/70">Moyennes: {counts.medium}</span>}
            {counts.low > 0 && <span className="text-xs text-white/70">Basses: {counts.low}</span>}
          </div>
        </div>
        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
          {vulnerabilities.map((vuln, idx) => (
            <div key={idx} className={`rounded-xl border p-4 ${severityColors[vuln.severity] || severityColors.low}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase">
                    {vuln.severity === 'critical' ? 'CRITIQUE' : 
                     vuln.severity === 'high' ? 'HAUTE' : 
                     vuln.severity === 'medium' ? 'MOYENNE' : 'BASSE'}
                  </span>
                  <span className="text-white/80 font-medium text-sm">{vuln.name}</span>
                </div>
                <span className="text-[10px] text-white/30">{vuln.category}</span>
              </div>
              <p className="text-xs text-white/50 mb-2">{vuln.description}</p>
              {vuln.evidence && (
                <div className="bg-black/40 rounded-lg p-2 text-[11px] font-mono text-white/40 break-all max-h-20 overflow-y-auto">
                  {vuln.evidence.slice(0, 200)}
                </div>
              )}
              {vuln.source && (
                <div className="text-[10px] text-white/20 mt-2">Source: {vuln.source}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DomainIntelligencePanel = ({ intel }) => {
    if (!intel) return null;

    const subdomains = Array.isArray(intel.subdomains) ? intel.subdomains : Array.from(intel.subdomains || []);
    const emails = Array.isArray(intel.emails) ? intel.emails : Array.from(intel.emails || []);
    const phones = Array.isArray(intel.phones) ? intel.phones : Array.from(intel.phones || []);
    const ips = Array.isArray(intel.ips) ? intel.ips : Array.from(intel.ips || []);
    const relatedDomains = Array.isArray(intel.relatedDomains) ? intel.relatedDomains : Array.from(intel.relatedDomains || []);
    const users = Array.isArray(intel.users) ? intel.users : Array.from(intel.users || []);
    const exposedFiles = Array.isArray(intel.exposedFiles) ? intel.exposedFiles : Array.from(intel.exposedFiles || []);
    const exposedEndpoints = Array.isArray(intel.exposedEndpoints) ? intel.exposedEndpoints : Array.from(intel.exposedEndpoints || []);
    const dnsRecords = intel.dnsRecords && typeof intel.dnsRecords === 'object' ? intel.dnsRecords : {};
    const whoisInfo = intel.whoisInfo && typeof intel.whoisInfo === 'object' ? intel.whoisInfo : {};
    const sslInfo = intel.sslInfo && typeof intel.sslInfo === 'object' ? intel.sslInfo : {};
    const hostingInfo = intel.hostingInfo && typeof intel.hostingInfo === 'object' ? intel.hostingInfo : {};
    const wordpressUsers = Array.isArray(intel.wordpressUsers) ? intel.wordpressUsers : [];

    return (
      <div className="mb-6 bg-black rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
              Intelligence domaine: {intel.normalizedDomain}
            </h3>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subdomains.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Sous-domaines ({subdomains.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {subdomains.slice(0, 10).map((sub, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70">{sub}</span>
                  ))}
                </div>
              </div>
            )}
            {emails.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Emails ({emails.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {emails.slice(0, 8).map((email, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70">{email}</span>
                  ))}
                </div>
              </div>
            )}
            {phones.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Téléphones ({phones.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {phones.slice(0, 5).map((phone, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70">{cleanPhoneDisplay(phone)}</span>
                  ))}
                </div>
              </div>
            )}
            {ips.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">IPs ({ips.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {ips.slice(0, 8).map((ip, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70 font-mono">{ip}</span>
                  ))}
                </div>
              </div>
            )}
            {relatedDomains.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Domaines liés ({relatedDomains.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {relatedDomains.slice(0, 10).map((domain, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70">{domain}</span>
                  ))}
                </div>
              </div>
            )}
            {users.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Utilisateurs ({users.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {users.slice(0, 10).map((user, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70">{user}</span>
                  ))}
                </div>
              </div>
            )}
            {exposedFiles.length > 0 && (
              <div className="bg-black rounded-xl border border-white/10 p-3">
                <h4 className="text-[10px] uppercase text-orange-400 mb-2">Fichiers exposés ({exposedFiles.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {exposedFiles.slice(0, 8).map((file, i) => (
                    <span key={i} className="text-xs bg-orange-500/10 px-2 py-0.5 rounded text-orange-300">{String(file).slice(0, 50)}</span>
                  ))}
                </div>
              </div>
            )}
            {exposedEndpoints.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Endpoints ({exposedEndpoints.length})</h4>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {exposedEndpoints.slice(0, 15).map((ep, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70 font-mono break-all">{ep.slice(0, 80)}</span>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(dnsRecords).length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">DNS</h4>
                <div className="space-y-1">
                  {Object.entries(dnsRecords).slice(0, 6).map(([type, values]) => (
                    <div key={type} className="text-xs">
                      <span className="text-white/60">{type}: </span>
                      <span className="text-white/40 font-mono">
                        {Array.from(values).slice(0, 3).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(whoisInfo).length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">WHOIS</h4>
                <div className="space-y-1">
                  {Object.entries(whoisInfo).slice(0, 5).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-white/60">{k}: </span>
                      <span className="text-white/40">{String(v).slice(0, 60)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(sslInfo).length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">SSL/TLS</h4>
                <div className="space-y-1">
                  {Object.entries(sslInfo).slice(0, 5).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-white/60">{k}: </span>
                      <span className="text-white/40">{String(v).slice(0, 60)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(hostingInfo).length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Hébergement</h4>
                <div className="space-y-1">
                  {Object.entries(hostingInfo).slice(0, 5).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-white/60">{k}: </span>
                      <span className="text-white/40">{String(v).slice(0, 60)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {wordpressUsers.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3 md:col-span-2 lg:col-span-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-3">Profils WordPress détectés ({wordpressUsers.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {wordpressUsers.map((user, idx) => (
                    <a key={idx} href={user.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 hover:border-white/[0.16] transition-all">
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                      <div className="min-w-0">
                        <div className="text-sm text-white/85 font-medium">{user.name}</div>
                        <div className="text-[11px] text-white/70">@{user.username}</div>
                        <div className="text-[10px] text-white/40 truncate">{user.description}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const EnrichmentPanel = () => {
    if (!enrichedResults || isEnriching) {
      if (isEnriching) {
        return (
          <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-white/60" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="text-white/60 text-sm">Enrichissement des données en cours...</span>
            </div>
          </div>
        );
      }
      return null;
    }

    const allEnrichments = [
      ...Object.entries(enrichedResults.byEmail || {}).map(([k, v]) => ({ type: 'email', key: k, ...v })),
      ...Object.entries(enrichedResults.byPhone || {}).map(([k, v]) => ({ type: 'téléphone', key: k, ...v })),
      ...Object.entries(enrichedResults.byUsername || {}).map(([k, v]) => ({ type: 'pseudo', key: k, ...v })),
      ...Object.entries(enrichedResults.byDomain || {}).map(([k, v]) => ({ type: 'domaine', key: k, ...v })),
    ].filter(e => e.found && e.found.length > 0);

    if (allEnrichments.length === 0) return null;

    return (
      <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            Enrichissement & Recherche inversée ({allEnrichments.length} sources)
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {allEnrichments.map((enrichment, idx) => (
            <div key={idx} className="bg-black rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs uppercase text-white/40 bg-white/5 px-2 py-0.5 rounded">{enrichment.type}</span>
                <span className="text-white/80 font-mono text-sm">{enrichment.key}</span>
                <span className="text-white/30 text-xs">{enrichment.found.length} résultats</span>
              </div>
              {enrichment.associations && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {enrichment.associations.emails?.slice(0, 5).map((e, i) => (
                    <span key={i} className="text-[10px] bg-white/5 text-white/70 px-2 py-0.5 rounded">{e}</span>
                  ))}
                  {enrichment.associations.phones?.slice(0, 5).map((p, i) => (
                    <span key={i} className="text-[10px] bg-white/5 text-white/70 px-2 py-0.5 rounded">{p}</span>
                  ))}
                  {enrichment.associations.domains?.slice(0, 5).map((d, i) => (
                    <span key={i} className="text-[10px] bg-white/5 text-white/70 px-2 py-0.5 rounded">{d}</span>
                  ))}
                  {enrichment.associations.names?.slice(0, 5).map((n, i) => (
                    <span key={i} className="text-[10px] bg-white/5 text-white/70 px-2 py-0.5 rounded">{n}</span>
                  ))}
                </div>
              )}
              <div className="max-h-32 overflow-y-auto space-y-1">
                {enrichment.found.slice(0, 10).map((record, ri) => (
                  <div key={ri} className="text-[11px] text-white/40 font-mono truncate">
                    {record.source || 'unknown'}: {flattenRecordToText(record).slice(0, 100)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const FamilyPanel = () => null;

  const AddressGroupPanel = ({ addressGroups }) => {
    if (!addressGroups || addressGroups.length === 0) return null;
    return (
      <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
        <div className="p-4 border-b border-purple-500/20 bg-purple-500/10">
          <h3 className="text-sm font-medium text-purple-300 flex items-center gap-2">
            Regroupements par adresse ({addressGroups.length} adresses partagées)
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {addressGroups.slice(0, 8).map((group, idx) => (
            <div key={idx} className="bg-black rounded-xl border border-purple-500/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-400 text-xs font-mono">{group.address.slice(0, 60)}</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                  {group.count} résidents
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.residents.slice(0, 6).map((resident, ridx) => (
                  <span key={ridx} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/60">
                    {resident.prenom} {resident.nom}
                    {resident.date_naissance && ` (${resident.date_naissance})`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const IdentityProfileCard = ({ profile, graph, familyGroups }) => {
    if (!profile || searchType === 'domain') return null;
    return (
      <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] bg-black">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
              Profil d'identité corrélé
            </h3>
            <span className="text-white/30 text-xs">{profile.sources.size} sources</span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.namesList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Noms ({profile.namesList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.namesList.slice(0, 8).map((n, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70">{n.value} <span className="text-white/30">({n.count})</span></span>
                  ))}
                </div>
              </div>
            )}
            {profile.emailsList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Emails ({profile.emailsList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.emailsList.slice(0, 8).map((e, i) => (
                    <span key={i} className="text-xs bg-blue-500/10 px-2 py-0.5 rounded text-blue-300">{e.value} <span className="text-blue-400/50">({e.count})</span></span>
                  ))}
                </div>
              </div>
            )}
            {profile.phonesList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Téléphones ({profile.phonesList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.phonesList.slice(0, 5).map((p, i) => (
                    <span key={i} className="text-xs bg-green-500/10 px-2 py-0.5 rounded text-green-300">{cleanPhoneDisplay(p.value)} <span className="text-green-400/50">({p.count})</span></span>
                  ))}
                </div>
              </div>
            )}
            {profile.usernamesList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Pseudos ({profile.usernamesList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.usernamesList.slice(0, 8).map((u, i) => (
                    <span key={i} className="text-xs bg-purple-500/10 px-2 py-0.5 rounded text-purple-300">{u.value} <span className="text-purple-400/50">({u.count})</span></span>
                  ))}
                </div>
              </div>
            )}
            {profile.domainsList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Domaines ({profile.domainsList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.domainsList.slice(0, 8).map((d, i) => (
                    <span key={i} className="text-xs bg-yellow-500/10 px-2 py-0.5 rounded text-yellow-300">{d.value} <span className="text-yellow-400/50">({d.count})</span></span>
                  ))}
                </div>
              </div>
            )}
            {profile.urlsList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Profils web ({profile.urlsList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.urlsList.slice(0, 5).map((u, i) => (
                    <span key={i} className="text-xs bg-cyan-500/10 px-2 py-0.5 rounded text-cyan-300 truncate max-w-[200px]" title={u.value}>{u.value.slice(0, 40)}</span>
                  ))}
                </div>
              </div>
            )}
            {(profile.cryptoBtcList.length > 0 || profile.cryptoEthList.length > 0) && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Crypto ({profile.cryptoBtcList.length + profile.cryptoEthList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.cryptoBtcList.slice(0, 3).map((c, i) => (
                    <span key={i} className="text-xs bg-orange-500/10 px-2 py-0.5 rounded text-orange-300 font-mono">{c.value.slice(0, 12)}...</span>
                  ))}
                  {profile.cryptoEthList.slice(0, 3).map((c, i) => (
                    <span key={i} className="text-xs bg-indigo-500/10 px-2 py-0.5 rounded text-indigo-300 font-mono">{c.value.slice(0, 12)}...</span>
                  ))}
                </div>
              </div>
            )}
            {profile.locationsList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Localisations ({profile.locationsList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.locationsList.slice(0, 8).map((l, i) => (
                    <span key={i} className="text-xs bg-pink-500/10 px-2 py-0.5 rounded text-pink-300">{l.value}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.passwordsList.length > 0 && (
              <div className="bg-black rounded-xl border border-red-500/20 p-3">
                <h4 className="text-[10px] uppercase text-red-400 mb-2">Mots de passe exposés ({profile.passwordsList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.passwordsList.slice(0, 5).map((p, i) => (
                    <span key={i} className="text-xs bg-red-500/10 px-2 py-0.5 rounded text-red-300">{sanitizeDisplayText(p.value)} <span className="text-red-400/50">({p.count})</span></span>
                  ))}
                </div>
              </div>
            )}
            {profile.hashesList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Hashes ({profile.hashesList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.hashesList.slice(0, 4).map((h, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/50 font-mono">{h.value.slice(0, 12)}...</span>
                  ))}
                </div>
              </div>
            )}
            {profile.birthDatesList.length > 0 && (
              <div className="bg-black rounded-xl border border-white/[0.06] p-3">
                <h4 className="text-[10px] uppercase text-white/40 mb-2">Dates de naissance ({profile.birthDatesList.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.birthDatesList.slice(0, 4).map((d, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70">{cleanDateDisplay(d.value)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {graph && (
            <div className="mt-4">
              <button 
                onClick={() => setShowGraph(true)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition flex items-center gap-2"
              >
                Visualiser le graphe de relations ({graph.nodes.length} nœuds, {graph.edges.length} liens)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const GraphNodeCard = ({ data, selected }) => {
    const colors = {
      core: { fill: '#ffffff', stroke: '#ffffff' },
      identity: { fill: '#a78bfa', stroke: '#8b5cf6' },
      contact: { fill: '#60a5fa', stroke: '#3b82f6' },
      infrastructure: { fill: '#fbbf24', stroke: '#f59e0b' },
      web: { fill: '#34d399', stroke: '#10b981' },
      finance: { fill: '#f97316', stroke: '#ea580c' },
      sensitive: { fill: '#ef4444', stroke: '#dc2626' },
      geography: { fill: '#ec4899', stroke: '#db2777' },
      family: { fill: '#f59e0b', stroke: '#d97706' },
      relative: { fill: '#fbbf24', stroke: '#f59e0b' },
      familyGroup: { fill: '#f59e0b', stroke: '#d97706' },
      addressGroup: { fill: '#8b5cf6', stroke: '#7c3aed' },
      resident: { fill: '#a78bfa', stroke: '#8b5cf6' },
    }[data.group] || { fill: '#ffffff', stroke: '#ffffff' };

    return (
      <div
        className={`min-w-[170px] max-w-[220px] rounded-2xl border px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur ${selected ? 'border-white/30 bg-slate-900/95' : 'border-white/10 bg-slate-950/85'}`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.fill, boxShadow: `0 0 16px ${colors.stroke}` }} />
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">{data.group}</span>
        </div>
        <div className="text-sm font-semibold text-white">{data.label}</div>
        {data.meta && <div className="mt-1 text-[11px] text-white/55">{data.meta}</div>}
      </div>
    );
  };

  const RelationshipGraphVisualization = ({ graph, familyGroups, onClose }) => {
    const [selectedNode, setSelectedNodeLocal] = useState(null);

    if (!graph) return null;

    const groupColors = {
      core: { fill: '#ffffff', stroke: '#ffffff' },
      identity: { fill: '#a78bfa', stroke: '#8b5cf6' },
      contact: { fill: '#60a5fa', stroke: '#3b82f6' },
      infrastructure: { fill: '#fbbf24', stroke: '#f59e0b' },
      web: { fill: '#34d399', stroke: '#10b981' },
      finance: { fill: '#f97316', stroke: '#ea580c' },
      sensitive: { fill: '#ef4444', stroke: '#dc2626' },
      geography: { fill: '#ec4899', stroke: '#db2777' },
      family: { fill: '#f59e0b', stroke: '#d97706' },
      relative: { fill: '#fbbf24', stroke: '#f59e0b' },
      familyGroup: { fill: '#f59e0b', stroke: '#d97706' },
      addressGroup: { fill: '#8b5cf6', stroke: '#7c3aed' },
      resident: { fill: '#a78bfa', stroke: '#8b5cf6' },
    };

    const flowNodes = useMemo(() => {
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80, edgesep: 20 });
      dagreGraph.setDefaultEdgeLabel(() => ({}));

      (graph.nodes || []).forEach((node) => {
        dagreGraph.setNode(node.id, { width: 180, height: 60 });
      });

      (graph.edges || []).forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      return (graph.nodes || []).map((node) => ({
        id: node.id,
        type: 'custom',
        position: {
          x: dagreGraph.node(node.id).x - 90,
          y: dagreGraph.node(node.id).y - 30,
        },
        data: {
          label: node.label,
          group: node.group || 'core',
          meta: node.relation || (node.confidence ? `Confiance ${node.confidence}%` : ''),
          count: node.count,
          confidence: node.confidence,
          sourceCount: node.sourceCount,
          type: node.type,
        },
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
          width: 'auto',
          height: 'auto',
        },
      }));
    }, [graph]);

    const flowEdges = useMemo(() => {
      return (graph.edges || []).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label || '',
        animated: edge.type === 'family' || edge.type === 'address',
        type: 'smoothstep',
        labelStyle: { fill: '#f8fafc', fontSize: 11, fontWeight: 600 },
        style: {
          stroke: edge.type === 'family' ? '#f59e0b' : edge.type === 'address' ? '#8b5cf6' : edge.style?.stroke || '#60a5fa',
          strokeWidth: Math.max(1.8, (edge.strength || 1) * 1.6),
          opacity: 0.85,
        },
      }));
    }, [graph]);

    const selectedNodeData = (graph.nodes || []).find((node) => node.id === selectedNode?.id) || null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(109,40,217,0.25),transparent_35%),rgba(2,6,23,0.95)] p-4 backdrop-blur-xl">
        <div className="relative flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/85 shadow-[0_25px_120px_rgba(0,0,0,0.75)]">
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Graphe de relations interactif</h3>
              <p className="text-sm text-white/45">{graph.nodes.length} nœuds • {graph.edges.length} connexions • rendu propre et stable</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={(e) => { e.stopPropagation(); downloadTXT(graph, 'relationship_graph'); }} className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white">Télécharger</button>
              <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white">Fermer</button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="relative flex-1 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.16),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,1))]">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                proOptions={{ hideAttribution: true }}
                nodesDraggable
                zoomOnScroll
                panOnDrag
                nodesConnectable={false}
                elementsSelectable
                defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
                className="bg-transparent"
                onNodeClick={(_, node) => setSelectedNodeLocal(node)}
                onPaneClick={() => setSelectedNodeLocal(null)}
                nodeTypes={{ custom: (props) => <GraphNodeCard data={props.data} selected={props.selected} /> }}
              >
                <Background gap={18} size={1} color="rgba(255,255,255,0.06)" />
                <Controls className="!bottom-4 !left-4 !rounded-xl !border-white/10 !bg-slate-950/80" />
                <MiniMap
                  nodeColor={(node) => groupColors[node.data.group]?.fill || '#ffffff'}
                  maskColor="rgba(2,6,23,0.8)"
                  pannable
                  zoomable
                />
              </ReactFlow>
            </div>

            <aside className="w-[330px] border-l border-white/10 bg-slate-950/80 p-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/35">Focus</div>
                {selectedNodeData ? (
                  <>
                    <div className="mt-2 text-sm font-semibold text-white">{selectedNodeData.label}</div>
                    <div className="mt-1 text-xs text-white/60">Type: {selectedNodeData.type}</div>
                    <div className="mt-1 text-xs text-white/60">Groupe: {selectedNodeData.group}</div>
                    {selectedNodeData.count && <div className="mt-1 text-xs text-white/60">Occurrences: {selectedNodeData.count}</div>}
                    {selectedNodeData.relation && <div className="mt-1 text-xs text-amber-400">Relation: {selectedNodeData.relation}</div>}
                    {selectedNodeData.confidence && <div className="mt-1 text-xs text-emerald-400">Confiance: {selectedNodeData.confidence}%</div>}
                  </>
                ) : (
                  <div className="mt-2 text-sm text-white/60">Clique sur un nœud pour voir ses détails ici.</div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/35">Résumé</div>
                <div className="mt-3 space-y-2 text-sm text-white/70">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                    <span>Nœuds</span>
                    <span className="font-semibold text-white">{graph.nodes.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                    <span>Connexions</span>
                    <span className="font-semibold text-white">{graph.edges.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                    <span>Légende</span>
                    <span className="font-semibold text-white">Clair</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  };

  const RecordDetailModal = ({ record, onClose }) => {
    const data = record.parsedData || record;
    const [phoneId, setPhoneId] = useState(null);
    const [phoneUUID, setPhoneUUID] = useState(null);
    const [geocodeData, setGeocodeData] = useState(null);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState(null);
    const [addressSearchResults, setAddressSearchResults] = useState([]);
    const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [hasRequestedGeocode, setHasRequestedGeocode] = useState(false);
    const addressSearchAbortRef = useRef(null);
    const addressSearchRequestIdRef = useRef(0);
    
    const InfoRow = ({ label, value }) => {
      if (!value) return null;
      return (
        <div className="border-b border-white/[0.08] py-3">
          <span className="text-purple-400 text-xs uppercase tracking-wider block mb-1">{label}</span>
          <span className="text-white/80 text-sm font-mono break-all">{value}</span>
        </div>
      );
    };
    
    const Section = ({ title, children }) => (
      <div className="mt-4">
        <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2 border-l-2 border-purple-500 pl-2">{title}</h4>
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">{children}</div>
      </div>
    );

    const parseLocalSearchResult = (result) => {
      let data = result;
      if (result?.content && typeof result.content === 'string') {
        try {
          data = JSON.parse(result.content);
        } catch (e) {
          data = result;
        }
      }

      const nom = data.nom || data.lastName || data.last_name || data.surname || '';
      const prenom = data.prenom || data.firstName || data.first_name || data.givenName || '';
      const adresse = data.adresse
        ? [data.adresse.voie, data.adresse.code_postal, data.adresse.commune].filter(Boolean).join(', ')
        : data.adresse_complete || data.address || data.location || data.adresse1 || data.adresse_1 || '';

      const enfantNames = [];
      if (Array.isArray(data.enfants)) {
        data.enfants.forEach((enfant) => {
          const childName = [enfant.prenom || enfant.firstName || '', enfant.nom || enfant.lastName || '']
            .filter(Boolean)
            .join(' ')
            .trim();
          if (childName) enfantNames.push(childName);
        });
      }
      if (Array.isArray(data.children)) {
        data.children.forEach((child) => {
          const childName = [child.prenom || child.firstName || '', child.nom || child.lastName || '']
            .filter(Boolean)
            .join(' ')
            .trim();
          if (childName) enfantNames.push(childName);
        });
      }
      if (data.enfant && typeof data.enfant === 'object') {
        const childName = [data.enfant.prenom || data.enfant.firstName || '', data.enfant.nom || data.enfant.lastName || '']
          .filter(Boolean)
          .join(' ')
          .trim();
        if (childName) enfantNames.push(childName);
      }

      const alloc = data.allocataire || data.allocation || data.tenant || null;
      const allocLabel = alloc
        ? [alloc.qualite, alloc.prenom, alloc.nom].filter(Boolean).join(' ')
        : '';
      const allocContact = alloc
        ? [alloc.telephone, alloc.courriel || alloc.email].filter(Boolean).join(' • ')
        : '';

      return {
        ...result,
        parsed: data,
        nom,
        prenom,
        adresse,
        enfantNames,
        allocLabel,
        allocContact,
      };
    };

    const renderLocalSearchCard = (result, idx) => {
      const item = parseLocalSearchResult(result);
      const fullName = [item.prenom, item.nom].filter(Boolean).join(' ').trim() || item.nom || item.prenom || 'Entrée locale';
      const sourceLabel = item.source_db || item.source || item.id || item.title || 'local';

      return (
        <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white truncate">{fullName}</div>
                <div className="text-[11px] text-white/40 truncate max-w-[240px]">{sourceLabel}</div>
              </div>
              {item.adresse ? (
                <div className="text-[11px] text-white/50 text-right">{item.adresse}</div>
              ) : null}
            </div>
            {item.adresse ? (
              <div className="text-[12px] text-white/60">{item.adresse}</div>
            ) : null}
            {item.allocLabel ? (
              <div className="text-[11px] text-white/50">Allocataire: <span className="text-white/70">{item.allocLabel}</span></div>
            ) : null}
            {item.allocContact ? (
              <div className="text-[11px] text-white/40">{item.allocContact}</div>
            ) : null}
            {item.enfantNames?.length ? (
              <div className="text-[11px] text-white/50">Enfant{item.enfantNames.length > 1 ? 's' : ''}: <span className="text-white/70">{item.enfantNames.slice(0, 3).join(', ')}</span></div>
            ) : null}
          </div>
        </div>
      );
    };

    const extractEmails = (text) => text?.match(EMAIL_REGEX) || [];
    const extractPhones = (text) => text?.match(PHONE_REGEX) || [];
    const extractPostalCodes = (text) => text?.match(/\b\d{5}\b/g) || [];

    const computePhoneIds = async (phone) => {
      try {
        if (!phone) return null;
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const resp = await fetch('/api/phone/id', { method: 'POST', headers, body: JSON.stringify({ phone }) });
        const j = await resp.json();
        if (!resp.ok) throw new Error(j.error || 'phone id error');
        setPhoneId(j.hmac);
        setPhoneUUID(j.uuid);
      } catch (e) {}
    };

    const geocodeAddress = async (addressStr) => {
      try {
        if (!addressStr) return;
        setIsGeocoding(true);
        setGeocodeError(null);
        setHasRequestedGeocode(true);
        setGeocodeData(null);
        setAddressSearchResults([]);
        const resp = await fetch('/api/geocode/address', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addressStr }) });
        const j = await resp.json();
        if (!resp.ok) throw new Error(j.error || 'Erreur geocode');
        setGeocodeData(j);
        try {
          if (j && j.found) runAddressLocalSearch(j, data.prenom, data.nom);
        } catch (e) {}
      } catch (e) {
        if (e.name !== 'AbortError') setGeocodeError(e.message || String(e));
      } finally {
        setIsGeocoding(false);
      }
    };

    const runAddressLocalSearch = async (geo, firstName, lastName) => {
      if (!geo?.nearby?.length) {
        setAddressSearchResults([]);
        setIsSearchingAddresses(false);
        return;
      }

      const requestId = ++addressSearchRequestIdRef.current;
      addressSearchAbortRef.current?.abort();
      const controller = new AbortController();
      addressSearchAbortRef.current = controller;

      try {
        setIsSearchingAddresses(true);
        setAddressSearchResults([]);
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const candidates = (geo.nearby || []).slice(0, 4);
        const aggregated = new Map();
        const queryPool = [];

        for (let i = 0; i < candidates.length; i++) {
          const cand = candidates[i];
          const addrObj = cand.address || {};
          const house = String(addrObj.house_number || '').trim();
          const road = String(addrObj.road || addrObj.residential || addrObj.pedestrian || '').trim();
          const postcode = String(addrObj.postcode || '').trim();
          const queriesSet = new Set();

          const exactAddress = [house, road, postcode].filter(Boolean).join(' ').trim();
          if (exactAddress) queriesSet.add(exactAddress);
          if (house && road) queriesSet.add(`${house} ${road}`);
          if (road && postcode) queriesSet.add(`${road} ${postcode}`);
          if (road) queriesSet.add(road);
          if (postcode) queriesSet.add(postcode);
          if (house && road && postcode) queriesSet.add(`${house} ${road} ${postcode}`);

          const name = `${firstName || ''} ${lastName || ''}`.trim();
          if (name) {
            queriesSet.add(name);
            if (road) queriesSet.add(`${name} ${road}`);
            if (house && road) queriesSet.add(`${name} ${house} ${road}`);
          } else if (lastName) queriesSet.add(lastName);

          Array.from(queriesSet).slice(0, 6).forEach(q => queryPool.push(q));
        }

        const queries = Array.from(new Set(queryPool)).slice(0, 8);
        for (const q of queries) {
          if (controller.signal.aborted || requestId !== addressSearchRequestIdRef.current) return;
          try {
            const resp = await fetch('/api/sqlite/search', { method: 'POST', headers, body: JSON.stringify({ query: q, exactMatch: false, limit: 20 }), signal: controller.signal });
            const jr = await resp.json().catch(() => ({}));
            if (resp.ok && Array.isArray(jr.results)) {
              jr.results.forEach(r => {
                try {
                  const key = r.id || (r.content ? r.content.slice(0, 200) : JSON.stringify(r));
                  if (!aggregated.has(key)) aggregated.set(key, r);
                } catch (ee) {}
              });
            }
          } catch (e) {
            if (e.name === 'AbortError') throw e;
          }
        }

        if (controller.signal.aborted || requestId !== addressSearchRequestIdRef.current) return;
        const resultsArr = Array.from(aggregated.values()).slice(0, 80);
        setAddressSearchResults(resultsArr);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setAddressSearchResults([]);
        }
      } finally {
        if (requestId === addressSearchRequestIdRef.current) {
          setIsSearchingAddresses(false);
        }
      }
    };

    useEffect(() => {
      const phone = data.telephone || data.allocataire?.telephone;
      if (phone) computePhoneIds(phone);
      const members = extractFamilyMembers(data, record.source || 'unknown');
      setFamilyMembers(members);

      return () => {
        addressSearchAbortRef.current?.abort();
      };
    }, [record.source, data.prenom, data.nom, data.telephone, data.allocataire?.telephone, data.adresse?.voie, data.adresse?.code_postal, data.adresse?.commune]);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div className="relative">
          <div className="bg-black/95 border border-white/[0.15] rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/95 pb-3">
            <div>
              <h3 className="text-xl font-semibold text-white">Détail de l'enregistrement</h3>
              <p className="text-white/40 text-xs font-mono">{record.source}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadPDF(record, 'record_detail'); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">PDF</button>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadTXT(record, 'record_detail'); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">TXT</button>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(JSON.stringify(data, null, 2), e); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">Copier</button>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="p-2 text-white/50 hover:text-white transition">Fermer</button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-2">
                <InfoRow label="Prénom" value={data.prenom} />
                <InfoRow label="Nom" value={data.nom} />
                <InfoRow label="Nom complet" value={data.nom_complet} />
                <InfoRow label="Date de naissance" value={data.date_naissance ? new Date(data.date_naissance).toLocaleDateString('fr-FR') : null} />
                <InfoRow label="Genre" value={data.genre === 'F' ? 'Féminin' : data.genre === 'M' ? 'Masculin' : null} />
                <InfoRow label="Email" value={data.email || data.courriel} />
                <InfoRow label="Téléphone" value={data.telephone} />
                <InfoRow label="ID PSP" value={data.id_psp} />
                <InfoRow label="Organisme" value={data.organisme} />
                <InfoRow label="Situation" value={data.situation} />
                {data.allocataire && (
                  <Section title="Informations allocataire">
                    <InfoRow label="Qualité" value={data.allocataire.qualite} />
                    <InfoRow label="Prénom" value={data.allocataire.prenom} />
                    <InfoRow label="Nom" value={data.allocataire.nom} />
                    <div className="border-b border-white/[0.08] py-3">
                      <span className="text-purple-400 text-xs uppercase tracking-wider block mb-1">Email</span>
                      <span className="text-white/80 text-sm font-mono break-all">{data.allocataire.courriel}</span>
                    </div>
                    <div className="border-b border-white/[0.08] py-3">
                      <span className="text-purple-400 text-xs uppercase tracking-wider block mb-1">Téléphone</span>
                      <span className="text-white/80 text-sm font-mono break-all">{data.allocataire.telephone}</span>
                      <div className="text-right text-xs text-white/60 font-mono break-all mt-1">
                        {phoneId && (<div>ID RIVE: {phoneId}</div>)}
                        {phoneUUID && (<div>UUID publique: {phoneUUID}</div>)}
                      </div>
                    </div>
                    <InfoRow label="Matricule" value={data.allocataire.matricule} />
                  </Section>
                )}
                {data.adresse && (
                  <Section title="Adresse">
                    <InfoRow label="Voie" value={data.adresse.voie} />
                    <InfoRow label="Code postal" value={data.adresse.code_postal} />
                    <InfoRow label="Commune" value={data.adresse.commune} />
                    <InfoRow label="Code INSEE" value={data.adresse.code_insee} />
                  </Section>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {isGeocoding ? (
                    <div className="text-sm text-white/60">Géocodage en cours...</div>
                  ) : (
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const addr = data.adresse ? `${data.adresse.voie || ''}, ${data.adresse.code_postal || ''} ${data.adresse.commune || ''}`.trim() : ''; if (addr) geocodeAddress(addr); }} className="px-3 py-1 text-xs rounded bg-white/5 hover:bg-white/10">Vérifier adresse / voisins</button>
                  )}
                </div>
                {hasRequestedGeocode && geocodeError && <div className="mt-3 text-sm text-red-400">Erreur géocodage: {geocodeError}</div>}
                {hasRequestedGeocode && geocodeData && geocodeData.found && (
                  <Section title="Voisins & position">
                    <div className="text-[12px] text-white/60 mb-2">Position exacte: {geocodeData.lat}, {geocodeData.lon}</div>
                    <div className="space-y-2">
                      {geocodeData.nearby && geocodeData.nearby.length > 0 ? (
                        geocodeData.nearby.map((n, i) => (
                          <div key={i} className="text-[11px] bg-black rounded p-2 border border-white/[0.04]">
                            <div className="text-white/70 text-xs">{n.display_name}</div>
                            <div className="text-white/40 text-[11px]">Type: {n.type}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-white/40">Aucun voisin détecté proche.</div>
                      )}
                    </div>
                  </Section>
                )}
                <Section title="Recherche locale par adresse & nom">
                  {isSearchingAddresses ? (
                    <div className="text-sm text-white/60">Recherche locale en cours...</div>
                  ) : (
                    <div className="text-[12px] text-white/50">Résultats trouvés: {addressSearchResults.length}</div>
                  )}
                  <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                    {addressSearchResults.slice(0, 20).map(renderLocalSearchCard)}
                    {addressSearchResults.length === 0 && !isSearchingAddresses && (<div className="text-[11px] text-white/40">Aucun résultat local trouvé pour ces adresses.</div>)}
                  </div>
                </Section>
              </div>
            </div>
            {(extractEmails(data.content).length > 0 || extractPhones(data.content).length > 0 || extractPostalCodes(data.content).length > 0) && (
              <Section title="Éléments détectés">
                {extractEmails(data.content).length > 0 && (
                  <div className="mb-3">
                    <span className="text-blue-400 text-xs">Emails trouvés</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {extractEmails(data.content).map((email, i) => <span key={i} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">{email}</span>)}
                    </div>
                  </div>
                )}
                {extractPhones(data.content).length > 0 && (
                  <div className="mb-3">
                    <span className="text-green-400 text-xs">Téléphones trouvés</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {extractPhones(data.content).map((phone, i) => <span key={i} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">{phone}</span>)}
                    </div>
                  </div>
                )}
                {extractPostalCodes(data.content).length > 0 && (
                  <div>
                    <span className="text-yellow-400 text-xs">Codes postaux trouvés</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {[...new Set(extractPostalCodes(data.content))].map((cp, i) => <span key={i} className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">{cp}</span>)}
                    </div>
                  </div>
                )}
              </Section>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  };
  
  const Icons = {
    back: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>),
    settings: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z" /></svg>),
    search: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>),
    email: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8.25V15c0 1.24.997 2.25 2.25 2.25h13.5A2.25 2.25 0 0021 15V8.25m-18 0L12 13.5 21 8.25M3 8.25l8.25 5.25m0 0L21 8.25" /></svg>),
    spinner: (<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>),
    copy: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>),
    download: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>),
    graph: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>),
    arrowRight: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>),
    close: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>),
    info: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    user: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19a6 6 0 00-6 0m3-8a4 4 0 100-8 4 4 0 000 8zm8 8a5 5 0 00-3-4.58M18 3.42a4 4 0 010 7.16" /></svg>),
    phone: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 4h3l2 5-2 1.5a14 14 0 005.5 5.5L15 14l5 2v3a2 2 0 01-2 2C10.82 21 3 13.18 3 6a2 2 0 012-2z" /></svg>),
    location: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s7-6.1 7-12a7 7 0 10-14 0c0 5.9 7 12 7 12z" /><circle cx="12" cy="9" r="2.2" strokeWidth={1.8} /></svg>),
    calendar: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16" rx="2" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M7 3v3M17 3v3M3 9h18" /></svg>),
    idCard: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={1.8} /><circle cx="8" cy="11" r="2" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M13 10h5M13 14h5M6 16h4" /></svg>),
    users: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 20a4 4 0 00-8 0m4-5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm5-6a3 3 0 010 5m2 6a3.5 3.5 0 00-2.2-3.25" /></svg>),
    breach: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>),
    database: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>),
    shield: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>),
    alert: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>),
    folder: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>),
    file: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
    lock: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>),
    unlock: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    expand: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>),
    chevronRight: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>),
  };

  const apiFichaRecords = useMemo(() => {
    const rawItems = Array.isArray(results?.ulpRecords) ? results.ulpRecords : [];
    return rawItems.slice(0, 6).map((item, index) => ({
      id: item?.id || item?.email || item?.username || item?.url || `${index}`,
      index: index + 1,
      fields: getApiFichaFields(item),
    }));
  }, [results?.ulpRecords]);

  const ApiFichePanel = () => {
    if (!apiFichaRecords.length) return null;

    return (
      <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] bg-black">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">{Icons.shield} Fiches ULP / Blacksanta</h3>
              <p className="text-[11px] text-white/40 mt-1">Vue ouverte avec catégories, flèches et fiches détaillées.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowApiFiches((value) => !value)}
              className="px-3 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-sm text-white/70 hover:bg-white/10 transition"
            >
              {showApiFiches ? '▾ Réduire' : '▸ Développer'} ({apiFichaRecords.length})
            </button>
          </div>
        </div>
        {showApiFiches && (
          <div className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {apiFichaRecords.map((fiche) => {
              const sections = [
                {
                  key: 'identity',
                  title: 'Identité',
                  fields: [
                    { key: 'nom', label: 'Nom', value: fiche.fields.nom || fiche.fields.last_name || fiche.fields.full_name || '—' },
                    { key: 'prenom', label: 'Prénom', value: fiche.fields.prenom || fiche.fields.first_name || '—' },
                    { key: 'nee', label: 'Née', value: fiche.fields.nee || fiche.fields.date_birth || '—' },
                    { key: 'age', label: 'Âge', value: fiche.fields.age || '—' },
                    { key: 'sexe', label: 'Sexe', value: fiche.fields.sexe || fiche.fields.gender || '—' },
                    { key: 'title', label: 'Titre', value: fiche.fields.title || '—' },
                  ],
                },
                {
                  key: 'contact',
                  title: 'Contact',
                  fields: [
                    { key: 'email', label: 'Email', value: fiche.fields.email || '—' },
                    { key: 'email_domain', label: 'Domaine', value: fiche.fields.email_domain || '—' },
                    { key: 'tel', label: 'Téléphone', value: fiche.fields.tel || fiche.fields.phone_number || fiche.fields.phone_national || '—' },
                  ],
                },
                {
                  key: 'location',
                  title: 'Localisation',
                  fields: [
                    { key: 'adresse', label: 'Adresse', value: fiche.fields.adresse || '—' },
                    { key: 'cp', label: 'CP', value: fiche.fields.cp || fiche.fields.postal_code || '—' },
                    { key: 'ville', label: 'Ville', value: fiche.fields.ville || '—' },
                    { key: 'country', label: 'Pays', value: fiche.fields.country || '—' },
                  ],
                },
                {
                  key: 'family',
                  title: 'Famille',
                  fields: [
                    { key: 'child_firstname', label: 'Enfant prénom', value: fiche.fields.child_firstname || '—' },
                    { key: 'child_lastname', label: 'Enfant nom', value: fiche.fields.child_lastname || '—' },
                  ],
                },
                {
                  key: 'meta',
                  title: 'Métadonnées',
                  fields: [
                    { key: 'created_at', label: 'Créé le', value: fiche.fields.created_at || '—' },
                    { key: 'date_birth', label: 'Date naissance', value: fiche.fields.date_birth || '—' },
                    { key: 'dbname', label: 'Base', value: fiche.fields.dbname || '—' },
                    { key: 'id', label: 'ID', value: fiche.fields.id || '—' },
                  ],
                },
              ];

              return (
                <div key={fiche.id} className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">[0x{String(fiche.index).padStart(2, '0')}]</div>
                    <div className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300">ULP</div>
                  </div>
                  <div className="space-y-3">
                    {sections.map((section) => (
                      <div key={section.key} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 mb-2">{section.title}</div>
                        <div className="space-y-1 text-[12px] leading-6">
                          {section.fields.map((field) => {
                            const value = field.value || '—';
                            return (
                              <div key={field.key} className="flex flex-wrap items-start gap-2">
                                <span className="text-white/40 uppercase tracking-wide">{field.label} :</span>
                                <span className="text-white/80 break-all">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const VictimManifestPanel = () => {
    if (!victimManifest || !victimLogId) return null;

    const filterFiles = (tree, searchTerm, pathPrefix = '') => {
      if (!searchTerm) return tree;
      
      const filtered = {};
      const search = searchTerm.toLowerCase();
      
      const traverse = (obj, prefix) => {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = prefix ? `${prefix}/${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const subFiltered = {};
            traverse(value, currentPath);
            Object.entries(value).forEach(([subKey, subVal]) => {
              const subPath = `${currentPath}/${subKey}`;
              if (subKey.toLowerCase().includes(search) || subPath.toLowerCase().includes(search)) {
                if (!filtered[key]) filtered[key] = {};
                if (!filtered[key][subKey]) filtered[key][subKey] = subVal;
              }
            });
          } else if (key.toLowerCase().includes(search)) {
            if (!filtered[key]) filtered[key] = value;
          }
        });
      };
      
      traverse(tree, '');
      return Object.keys(filtered).length > 0 ? filtered : tree;
    };

    const renderFileTree = (tree, path = '', depth = 0) => {
      if (!tree) return null;
      if (depth > 10) return null;
      
      if (typeof tree === 'string') {
        const fileId = tree;
        return (
          <div key={fileId} className="group flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 transition">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {Icons.file}
              <span className="text-xs text-white/70 truncate font-mono">{path || fileId}</span>
            </div>
            <button 
              onClick={() => handleVictimFileDownload(victimLogId, fileId)}
              className="opacity-0 group-hover:opacity-100 transition px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/50 text-[10px]"
            >
              Voir
            </button>
          </div>
        );
      }
      
      if (Array.isArray(tree)) {
        return tree.map((item, idx) => renderFileTree(item, `${path}/${idx}`, depth + 1));
      }
      
      if (typeof tree === 'object') {
        return Object.entries(tree).map(([key, value]) => (
          <details key={key} className="group file-tree-item">
            <summary className="flex items-center gap-2 py-1 px-2 cursor-pointer rounded hover:bg-white/5 transition select-none">
              <span className="transform group-open:rotate-90 transition text-white/40">{Icons.chevronRight}</span>
              {Icons.folder}
              <span className="text-xs text-white/70 font-mono">{key}</span>
            </summary>
            <div className="ml-4 border-l border-white/5 pl-2">
              {renderFileTree(value, `${path}/${key}`, depth + 1)}
            </div>
          </details>
        ));
      }
      
      return null;
    };

    const filteredTree = filterFiles(victimManifest.victim_tree, victimFileSearch);

    return (
      <div className="mb-6 bg-black rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-2">
              {Icons.folder}
              <h3 className="text-sm font-medium text-white/70">{victimManifest.log_name || `Log ${safeSlice(victimLogId, 8)}`}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/50">
                {victimManifest.unlocked ? Icons.unlock : Icons.lock}
                {victimManifest.unlocked ? ' Déverrouillé' : ' 1 crédit'}
              </span>
            </div>
            <button 
              onClick={() => handleVictimLogDownload(victimLogId)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1.5 transition"
            >
              {Icons.download}
              Télécharger tout
            </button>
          </div>
          
          <div>
            <input
              type="text"
              value={victimFileSearch}
              onChange={(e) => setVictimFileSearch(e.target.value)}
              placeholder="Rechercher un fichier..."
              className="w-full px-3 py-1.5 rounded-lg bg-black border border-white/10 text-white/80 text-sm placeholder-white/30 focus:border-white/30 focus:outline-none"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 max-h-[600px]">
          <div className="lg:col-span-1 border-r border-white/10 p-4 overflow-y-auto">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Arborescence</div>
            {filteredTree && Object.keys(filteredTree).length > 0 ? (
              <div className="space-y-0.5 text-sm">
                {renderFileTree(filteredTree)}
              </div>
            ) : (
              <div className="text-white/40 text-xs text-center py-8">Aucun fichier trouvé</div>
            )}
          </div>
          
          <div className="lg:col-span-2 p-4 bg-black/30">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Contenu du fichier</div>
            {selectedVictimFile ? (
              <div className="space-y-2">
                <div className="text-[10px] text-white/30 font-mono truncate mb-2">{selectedVictimFile.path || 'Fichier'}</div>
                <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto bg-black/50 p-3 rounded-lg border border-white/5">
                  {selectedVictimFile.content ? (typeof selectedVictimFile.content === 'string' ? selectedVictimFile.content : JSON.stringify(selectedVictimFile.content, null, 2)) : 'Chargement du contenu...'}
                </pre>
                <button 
                  onClick={() => setSelectedVictimFile(null)}
                  className="text-[10px] text-white/40 hover:text-white/70 transition"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-white/30 text-sm">Sélectionnez un fichier dans l'arborescence</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const OsintPanel = () => {
    const [selectedService, setSelectedService] = useState('');
    const [osintValue, setOsintValue] = useState('');
    const [osintResult, setOsintResult] = useState(null);
    const [isOsintSearching, setIsOsintSearching] = useState(false);

    const handleOsintSearch = async () => {
      if (!selectedService || !osintValue) return;
      setIsOsintSearching(true);
      try {
        const result = await handleOsintLookup(selectedService, osintValue);
        setOsintResult(result);
      } catch (e) {
        console.error('Erreur OSINT:', e);
      } finally {
        setIsOsintSearching(false);
      }
    };

    if (!osintServices.length) return null;

    return (
      <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] bg-black">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            OSINT Lookup
          </h3>
        </div>
        <div className="p-4">
          <div className="flex gap-3 flex-wrap">
            <select 
              value={selectedService} 
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm min-w-[150px]"
            >
              <option value="">Sélectionner un service</option>
              {osintServices.map(service => (
                <option key={service.id} value={service.id}>{service.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={osintValue}
              onChange={(e) => setOsintValue(e.target.value)}
              placeholder="Valeur à rechercher"
              className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm placeholder-white/20 min-w-[200px]"
              onKeyPress={(e) => e.key === 'Enter' && handleOsintSearch()}
            />
            <button 
              onClick={handleOsintSearch}
              disabled={!selectedService || !osintValue || isOsintSearching}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm disabled:opacity-50"
            >
              {isOsintSearching ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>
          {osintResult && (
            <div className="mt-4 p-3 rounded-xl bg-black border border-white/[0.06] max-h-60 overflow-y-auto">
              <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap">
                {JSON.stringify(osintResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  const IntelxPanel = () => {
    const [selectedBucket, setSelectedBucket] = useState('');
    const [systemId, setSystemId] = useState('');
    const [fileName, setFileName] = useState('');
    const [fileType, setFileType] = useState(1);
    const [isIntelxDownloading, setIsIntelxDownloading] = useState(false);

    const handleIntelxDownload = async () => {
      if (!systemId || !selectedBucket) return;
      setIsIntelxDownloading(true);
      try {
        await handleIntelxDownload(systemId, selectedBucket, fileType, fileName || null);
      } catch (e) {
        console.error('Erreur IntelX:', e);
      } finally {
        setIsIntelxDownloading(false);
      }
    };

    if (!intelxBuckets.length) return null;

    return (
      <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] bg-black">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            IntelX Download
          </h3>
        </div>
        <div className="p-4">
          <div className="flex gap-3 flex-wrap">
            <select 
              value={selectedBucket} 
              onChange={(e) => setSelectedBucket(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm min-w-[150px]"
            >
              <option value="">Sélectionner un bucket</option>
              {intelxBuckets.map(bucket => (
                <option key={bucket} value={bucket}>{bucket}</option>
              ))}
            </select>
            <input
              type="text"
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
              placeholder="System ID"
              className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm placeholder-white/20 min-w-[200px]"
            />
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Nom du fichier (optionnel)"
              className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm placeholder-white/20 min-w-[150px]"
            />
            <select 
              value={fileType} 
              onChange={(e) => setFileType(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm"
            >
              <option value={1}>Téléchargement</option>
              <option value={0}>Binaire brut</option>
            </select>
            <button 
              onClick={handleIntelxDownload}
              disabled={!systemId || !selectedBucket || isIntelxDownloading}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm disabled:opacity-50"
            >
              {isIntelxDownloading ? 'Téléchargement...' : 'Télécharger'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const VulnScanPanel = () => {
    const [vulnQuery, setVulnQuery] = useState('');
    const [selectedPlugin, setSelectedPlugin] = useState('');
    const [vulnPage, setVulnPage] = useState(0);
    const [vulnResults, setVulnResults] = useState(null);
    const [isVulnSearching, setIsVulnSearching] = useState(false);

    const handleVulnSearch = async () => {
      if (!vulnQuery && !selectedPlugin) return;
      setIsVulnSearching(true);
      try {
        const result = await handleVulnScan(vulnQuery || null, selectedPlugin || null, vulnPage);
        setVulnResults(result);
      } catch (e) {
        console.error('Erreur VulnScan:', e);
      } finally {
        setIsVulnSearching(false);
      }
    };

    if (!vulnPlugins.length) return null;

    return (
      <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] bg-black">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            Vuln Scanner
          </h3>
        </div>
        <div className="p-4">
          <div className="flex gap-3 flex-wrap">
            <select 
              value={selectedPlugin} 
              onChange={(e) => setSelectedPlugin(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm min-w-[150px]"
            >
              <option value="">Plugin (optionnel)</option>
              {vulnPlugins.map(plugin => (
                <option key={plugin.id} value={plugin.id}>{plugin.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={vulnQuery}
              onChange={(e) => setVulnQuery(e.target.value)}
              placeholder="Terme libre (IP, domaine, variable d'env...)"
              className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm placeholder-white/20 min-w-[200px]"
              onKeyPress={(e) => e.key === 'Enter' && handleVulnSearch()}
            />
            <button 
              onClick={handleVulnSearch}
              disabled={(!vulnQuery && !selectedPlugin) || isVulnSearching}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm disabled:opacity-50"
            >
              {isVulnSearching ? 'Recherche...' : 'Scanner'}
            </button>
          </div>
          {vulnResults && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                <span>Page {vulnResults.page} • {vulnResults.items?.length || 0} résultats</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setVulnPage(Math.max(0, vulnPage - 1))}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                    disabled={vulnPage === 0}
                  >
                    Précédent
                  </button>
                  <button 
                    onClick={() => setVulnPage(vulnPage + 1)}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                    disabled={!vulnResults.next_page}
                  >
                    Suivant
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {vulnResults.items?.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-black border border-white/[0.06]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-sm text-white/80 font-mono">{item.ip}:{item.port}</span>
                        <span className="text-xs text-white/40 ml-2">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40">{item.country}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40">{item.org}</span>
                      </div>
                    </div>
                    <div className="text-xs text-white/40 mt-1">{item.host}</div>
                    {item.dataset && (
                      <div className="text-[10px] text-white/30 mt-1">
                        Rows: {item.dataset.rows} • Size: {item.dataset.size}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      <div ref={gridRef} className="absolute inset-0 z-5" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      <div className="absolute inset-0 bg-black z-5" />
      
      <div className="relative z-20 max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link to="/" className="group inline-flex items-center gap-2 text-white/40 hover:text-white transition text-sm mb-6">{Icons.back} Retour</Link>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Recherche</h1>
          <p className="text-white/30 mt-2 text-sm">Analyse OSINT • Discord • Data Leak • Domain Intelligence</p>
          <div className="mt-4 inline-flex flex-col gap-2 text-xs text-white/50">
            {user ? (
              <>
                <div className="inline-flex flex-wrap items-center gap-3 text-white/60">
                  <span>Plan : <span className="text-white">{quota?.planLabel || user.accountType || 'FREE'}</span></span>
                  <span>Recherches restantes : <span className="text-white">{quota ? (quota.limit === Number.MAX_SAFE_INTEGER ? '∞/∞' : `${quota.remaining}/${quota.limit}`) : 'chargement...'}</span></span>
                </div>
                {isPremiumSearchPlan() && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-emerald-200 text-sm">
                    {getPremiumSearchWelcome()} — profite bien de tes recherches unlimited.
                  </div>
                )}
              </>
            ) : (
              <span className="text-yellow-300">Connecte-toi pour utiliser ton plan et lancer des recherches.</span>
            )}
            {quotaError && <span className="text-red-400">{quotaError}</span>}
          </div>
        </div>
        
        <div className="flex gap-2 p-1 bg-black rounded-2xl border border-white/[0.08] w-fit mb-8 flex-wrap">
          <button onClick={() => { setSearchType('discord'); setResults(null); setSelectedConversation(null); setShowSettings(false); setShowGraph(false); setSelectedRecord(null); setIdentityProfile(null); setRelationshipGraph(null); setEnrichedResults(null); setFamilyGroups(null); setDomainIntelligence(null); setTechnologies(null); setVulnerabilities(null); setVictimManifest(null); setVictimLogId(null); setSelectedVictimFile(null); }} className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${searchType === 'discord' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>Discord</button>
          <button onClick={() => { setSearchType('data'); setResults(null); setSelectedConversation(null); setShowSettings(false); setShowGraph(false); setSelectedRecord(null); setIdentityProfile(null); setRelationshipGraph(null); setEnrichedResults(null); setFamilyGroups(null); setDomainIntelligence(null); setTechnologies(null); setVulnerabilities(null); setVictimManifest(null); setVictimLogId(null); setSelectedVictimFile(null); }} className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${searchType === 'data' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>Data Leak</button>
          <button onClick={() => { setSearchType('domain'); setResults(null); setSelectedConversation(null); setShowSettings(false); setShowGraph(false); setSelectedRecord(null); setIdentityProfile(null); setRelationshipGraph(null); setEnrichedResults(null); setFamilyGroups(null); setDomainIntelligence(null); setTechnologies(null); setVulnerabilities(null); setVictimManifest(null); setVictimLogId(null); setSelectedVictimFile(null); }} className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${searchType === 'domain' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>Domaine</button>
        </div>
        
        <div className="bg-black rounded-2xl border border-white/[0.08] p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
              data-theme="dark"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchType === 'discord' ? 'Email, pseudo, ID Discord, mot-clé...' : searchType === 'domain' ? 'ex: google.com, github.com, netflix.com' : searchType === 'blacksanta' ? 'Recherche unifiée Blacksanta...' : 'Nom, prénom, email, téléphone, ville...'}
              className="w-full rounded-xl border border-white/[0.08] bg-black px-5 py-3 font-mono text-sm text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
            />
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${showSettings ? 'bg-white/10 border-white/20 text-white' : 'bg-black border-white/[0.08] text-white/60 hover:text-white/80'}`}>{Icons.settings}</button>
          </div>
          
          {showSettings && (
            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <h3 className="text-white/80 text-sm font-medium mb-4 flex items-center gap-2">{Icons.settings} Configuration</h3>
              {searchType === 'discord' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-white/50 text-xs mb-1">Max lignes</label><input type="number" value={settings.maxLines} onChange={(e) => setSettings({ ...settings, maxLines: parseInt(e.target.value) || 2000 })} className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm" /></div>
                  <div><label className="block text-white/50 text-xs mb-1">ID cible</label><input type="text" value={settings.targetId} onChange={(e) => setSettings({ ...settings, targetId: e.target.value })} placeholder="Discord ID" className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm placeholder-white/20 font-mono" /></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-black">
                    <div><p className="text-sm">Mode avancé</p><p className="text-white/40 text-xs">Recherche combinée : prénom + nom + date + ville</p></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.advancedMode} onChange={(e) => setSettings({ ...settings, advancedMode: e.target.checked, searchQuery: '' })} />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/30"></div>
                    </label>
                  </div>
                  {settings.advancedMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-white/50 text-xs mb-1">Prénom / Nom</label><input type="text" value={settings.firstName} onChange={(e) => setSettings({ ...settings, firstName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm" placeholder="Jean, Dupont..." /></div>
                      <div><label className="block text-white/50 text-xs mb-1">Date de naissance</label><input type="date" value={settings.birthDate} onChange={(e) => setSettings({ ...settings, birthDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm" /></div>
                      <div><label className="block text-white/50 text-xs mb-1">Ville</label><input type="text" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm" placeholder="Paris, Lyon..." /></div>
                      <div><label className="block text-white/50 text-xs mb-1">Année de naissance</label><input type="text" value={settings.birthYear} onChange={(e) => setSettings({ ...settings, birthYear: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-black/40 text-white text-sm" placeholder="1990" /></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-black">
                    <div><p className="text-sm">HaveIBeenPwned</p><p className="text-white/40 text-xs">Vérification des emails sur HIBP</p></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.checkHIBP} onChange={(e) => setSettings({ ...settings, checkHIBP: e.target.checked })} />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500/50"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-black">
                    <div><p className="text-sm">Enrichissement automatique</p><p className="text-white/40 text-xs">Recherche inversée et corrélation</p></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.autoEnrich} onChange={(e) => setSettings({ ...settings, autoEnrich: e.target.checked })} />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500/50"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-black">
                    <div><p className="text-sm">Graphe de relations</p><p className="text-white/40 text-xs">Visualisation des connexions</p></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.enableGraph} onChange={(e) => setSettings({ ...settings, enableGraph: e.target.checked })} />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500/50"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-black">
                    <div><p className="text-sm">Détection familiale</p><p className="text-white/40 text-xs">Détecter frères, sœurs, parents</p></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.detectFamily} onChange={(e) => setSettings({ ...settings, detectFamily: e.target.checked })} />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500/50"></div>
                    </label>
                  </div>
                  {searchType === 'domain' && (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-black">
                        <div><p className="text-sm">Intelligence domaine</p><p className="text-white/40 text-xs">DNS, WHOIS, SSL, sous-domaines</p></div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={settings.domainIntel} onChange={(e) => setSettings({ ...settings, domainIntel: e.target.checked })} />
                          <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500/50"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-black">
                        <div><p className="text-sm">Scan vulnérabilités</p><p className="text-white/40 text-xs">Détection de failles et expositions</p></div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={settings.vulnScan} onChange={(e) => setSettings({ ...settings, vulnScan: e.target.checked })} />
                          <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500/50"></div>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-6">
            <button onClick={handleSearch} disabled={!user || isSearching} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isSearching ? (<>{Icons.spinner} Analyse...</>) : (<>{Icons.search} Lancer la recherche</>)}
            </button>
            {!user && (
              <div className="mt-2 text-xs text-yellow-300">Connecte-toi pour utiliser les recherches, ton plan FREE commence à 20 recherches par jour.</div>
            )}
          </div>
        </div>

        <VictimManifestPanel />
        <OsintPanel />
        <IntelxPanel />
        <VulnScanPanel />

        {breachProgress && breachProgress.percent !== undefined && (
          <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {Icons.spinner}
                <span className="text-white/80 text-sm">
                  {breachProgress.email ? `Analyse: ${breachProgress.email}` : 'Recherche en cours...'}
                </span>
              </div>
              <span className="text-white/40 text-xs">{Math.round(breachProgress.percent)}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${breachProgress.percent}%` }} />
            </div>
            <div className="mt-2 text-right text-white/30 text-[10px]">
              {breachProgress.current || 0}/{breachProgress.total || 0}
            </div>
          </div>
        )}

        <DomainIntelligencePanel intel={domainIntelligence} />
        <ApiFichePanel />
        <IdentityProfileCard profile={identityProfile} graph={relationshipGraph} familyGroups={familyGroups} />
        <FamilyPanel familyGroups={familyGroups} profile={identityProfile} />
        <AddressGroupPanel addressGroups={identityProfile?.addressGroups} />
        <EnrichmentPanel />

        {results?.foundEmails && results.foundEmails.length > 0 && (
          <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] bg-black">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                    {Icons.email}
                    Emails trouvés dans les résultats
                  </h3>
                  <p className="text-white/40 text-xs">Ces adresses email sont extraites des données trouvées.</p>
                </div>
              </div>
            </div>
            <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.foundEmails.map((email, idx) => (
                <div key={idx} className="text-left p-3 rounded-xl border border-white/[0.06] bg-black hover:bg-white/[0.08] transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white truncate">{email}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={(e) => { e.preventDefault(); handleCopy(email, e); }} className="text-[10px] text-white/40">Copier</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {false && (
          <div className="mb-6 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent backdrop-blur-xl rounded-2xl border border-amber-400/30 overflow-hidden shadow-[0_0_0_1px_rgba(251,191,36,0.08)]">
            <div className="p-4 border-b border-amber-400/20 bg-amber-500/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-amber-200 flex items-center gap-2">{Icons.database} {results?.lookup2bzResults ? 'Résultats API externes' : 'Résultats API Blacksanta'}</h3>
                  <p className="text-[11px] text-amber-200/70 mt-1">{results?.lookup2bzResults ? 'Sources externes — Blacksanta et Lookup2bz affichés séparément des résultats DB locale.' : 'Source externe — ULP et stealer affichés séparément des résultats DB locale.'}</p>
                </div>
                {results?.credits && (
                  <div className="text-xs text-amber-100/80 bg-black/20 px-3 py-1 rounded-full">
                    Crédits restants: {results.credits.remaining}/{results.credits.limit}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 space-y-3">
              {results?.stealerRecords?.length > 0 && (
                <div className="rounded-xl border border-amber-400/20 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-300/80 mb-3">Stealer / Logs victimes</div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {results.stealerRecords.map((item, idx) => {
                      const logId = item.log_id || item.id;
                      return (
                        <div key={idx} className="rounded-lg border border-amber-400/10 bg-white/[0.03] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm text-white/80 break-all">{item.url || item.login || item.password || JSON.stringify(item)}</div>
                              {item.login && <div className="text-[11px] text-white/40 mt-1">Login: {item.login}</div>}
                              {item.password && <div className="text-[11px] text-white/40 mt-1">Mot de passe: {item.password}</div>}
                              {logId && <div className="text-[10px] text-amber-300/60 font-mono mt-1">{safeSlice(logId, 16)}...</div>}
                            </div>
                            <div className="flex gap-1">
                              {logId && (
                                <button 
                                  onClick={() => handleVictimManifest(logId)}
                                  className="text-[10px] px-2 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 transition flex items-center gap-1"
                                >
                                  {Icons.folder}
                                  Explorer
                                </button>
                              )}
                              <button onClick={() => setApiDetailItem(item)} className="text-[10px] text-amber-300/80 hover:text-amber-200">Détail</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {results?.ulpRecords?.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-black p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">ULP</div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {results.ulpRecords.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm text-white/80 font-medium">{getApiEntrySummary(item).title}</div>
                            {getApiEntrySummary(item).subtitle && <div className="text-[11px] text-white/45 mt-1">{getApiEntrySummary(item).subtitle}</div>}
                            {item.dbname && <div className="text-[11px] text-white/35 mt-1">Base: {item.dbname}</div>}
                          </div>
                          <button onClick={() => setApiDetailItem(item)} className="text-[10px] text-white/50 hover:text-white/80">Voir en détail</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results?.lookup2bzResults && (
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-sky-200/80 mb-3">Lookup2bz</div>
                  {Array.isArray(results.lookup2bzResults.serviceResponses) && results.lookup2bzResults.serviceResponses.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {results.lookup2bzResults.serviceResponses.map((entry, idx) => {
                        const source = entry.source || entry.body?.source || `service ${idx + 1}`;
                        const status = entry.status ?? (entry.body?.success === false ? 200 : 'OK');
                        const error = entry.error || entry.body?.error || entry.body?.message;
                        const resultCount = Array.isArray(entry.body?.results) ? entry.body.results.length : (Array.isArray(entry.results) ? entry.results.length : null);
                        return (
                          <div key={idx} className="rounded-lg border border-sky-400/20 bg-black/10 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-sm text-white/80">{source}</div>
                                <div className="text-[11px] text-white/40">Statut: {status}{resultCount !== null ? ` • ${resultCount} résultats` : ''}</div>
                              </div>
                              {error && <div className="text-[10px] text-rose-300 bg-rose-500/10 px-2 py-1 rounded">{error}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {results.lookup2bzResults.records?.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {results.lookup2bzResults.records.map((item, idx) => (
                        <div key={idx} className="rounded-lg border border-sky-400/10 bg-black/20 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm text-white/80 font-medium">{getApiEntrySummary(item).title}</div>
                              {getApiEntrySummary(item).subtitle && <div className="text-[11px] text-white/45 mt-1">{getApiEntrySummary(item).subtitle}</div>}
                            </div>
                            <button onClick={() => setApiDetailItem(item)} className="text-[10px] text-sky-200/80 hover:text-white/80">Voir en détail</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-white/50">Aucun résultat Lookup2bz structuré à afficher.</div>
                  )}
                </div>
              )}
              {!results?.stealerRecords?.length && !results?.ulpRecords?.length && (
                <div className="text-sm text-white/50">Aucun résultat API n'a été retourné pour cette requête.</div>
              )}
            </div>
          </div>
        )}

        {apiDetailItem && (
          <div className="mb-6 rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-medium text-white/80">Détail de l'entrée API</h3>
                <p className="text-[11px] text-white/40">Vue détaillée de la donnée ULP / stealer</p>
              </div>
              <button onClick={() => setApiDetailItem(null)} className="text-[11px] text-white/40 hover:text-white/70">Fermer</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(apiDetailItem).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-white/[0.06] bg-black p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1">{key}</div>
                  {typeof value === 'object' && value !== null ? (
                    <pre className="text-sm text-white/80 whitespace-pre-wrap break-words">{formatApiValue(value)}</pre>
                  ) : (
                    <div className="text-sm text-white/80 break-all">{formatApiValue(value)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(searchType === 'data' || searchType === 'domain') && results && results.success && results.sources && results.sources.length > 0 && !showGraph && !selectedRecord && (
          <div className="mb-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] bg-black">
              <button onClick={() => setShowSources(!showSources)} className="w-full text-left text-sm font-medium text-white/70 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {Icons.database}
                  Sources ({results.sources.length})
                </span>
                {showSources ? '▾' : '▸'}
              </button>
            </div>
            {showSources && (
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.sources.map((source, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-white/[0.06] bg-black hover:bg-white/[0.08] transition group">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white/80 truncate" title={source.name}>{source.name.length > 20 ? source.name.slice(0, 20) + '...' : source.name}</span>
                      <span className="text-xs text-white/40">{source.entries} entrées</span>
                    </div>
                    <p className="text-white/30 text-[10px] mt-1">{source.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {(searchType === 'data' || searchType === 'domain') && results && results.success && !showGraph && !selectedRecord && results.allRecords && results.allRecords.length > 0 && (
          <div className="mt-6 space-y-6">
            {/* En-tête */}
            <div className="bg-black rounded-2xl border border-white/[0.08] p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white/90">Résultats</h2>
                <p className="text-white/30 text-xs">Recherche: "{results.searchTerm}"</p>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-white/50">Total: <span className="text-white font-bold">{results.totalMatches || results.allRecords?.length || 0}</span></span>
                <span className="text-white/50">Sources: <span className="text-white font-bold">
                  {new Set(results.allRecords?.map(r => r.source || 'unknown') || []).size}
                </span></span>
              </div>
            </div>
        
            {(() => {
              // Fonction pour catégoriser - TOUT EST SCRAPHUB MAINTENANT
              const getCategory = (record) => {
                const source = String(record.source || '').toLowerCase();
                const data = record.parsedData || record;
                const text = JSON.stringify(data).toLowerCase();
              
                // Détection des types de données
                if (data.log_id || data.archive_hash || data.pwned_at) {
                  return { type: 'stealer', label: 'ScrapHub • Logs', icon: Icons.file, color: 'border-white/[0.12] bg-black', iconColor: 'text-white/60' };
                }

                if (source.includes('breach') || source.includes('oath') || source.includes('leak') || 
                    text.includes('breach') || text.includes('oathnet') || text.includes('credential') || 
                  text.includes('pwn') || text.includes('dump') || text.includes('pass.sports')) {
                    return { type: 'breach', label: 'ScrapHub • Breach', icon: Icons.breach, color: 'border-white/[0.12] bg-black', iconColor: 'text-white/70' };
                }
              
                if (source.includes('intelx') || text.includes('intelx') || 
                    text.includes('systemid') || text.includes('bucket')) {
                  return { type: 'intelx', label: 'ScrapHub • IntelX', icon: Icons.info, color: 'border-white/[0.12] bg-black', iconColor: 'text-white/60' };
                }
              
                if (source.includes('lookup2bz') || source.includes('blacksanta') || source.includes('api') ||
                    text.includes('lookup2bz') || text.includes('blacksanta') ||
                    data.log_id || data.archive_hash || data.pwned_at) {
                  return { type: 'api', label: 'ScrapHub • API', icon: Icons.search, color: 'border-white/[0.12] bg-black', iconColor: 'text-white/60' };
                }
              
                if (source.includes('stealer')) {
                  return { type: 'stealer', label: 'ScrapHub • Logs', icon: Icons.file, color: 'border-white/[0.12] bg-black', iconColor: 'text-white/60' };
                }
              
                if (source.includes('ulp') || source.includes('local') || source.includes('sqlite') ||
                    data.nom || data.prenom || data.adresse || data.allocataire || data.ville ||
                    data.adresse_voie || data.allocataire_prenom) {
                  return { type: 'local', label: 'ScrapHub • Local', icon: Icons.database, color: 'border-white/[0.12] bg-black', iconColor: 'text-white/60' };
                }
              
                return { type: 'other', label: 'ScrapHub • Autre', icon: Icons.info, color: 'border-white/10 bg-black', iconColor: 'text-white/40' };
              };
            
              // Grouper les résultats
              const grouped = {};
              const allRecords = results.allRecords || [];
              
              allRecords.forEach(record => {
                const cat = getCategory(record);
                if (!grouped[cat.type]) {
                  grouped[cat.type] = { ...cat, records: [] };
                }
                grouped[cat.type].records.push(record);
              });
            
              // Ordre d'affichage
              const order = ['breach', 'intelx', 'api', 'stealer', 'local', 'other'];
            
              // Rendu d'une carte individuelle - STYLE PROPRE COMME DANS L'EXEMPLE
              const renderCard = (record, idx) => {
                const data = record.parsedData || record;
                const cat = getCategory(record);
              
                // Extraction intelligente des champs
                const fields = {
                  // Identité
                  nom: data.nom || data.last_name || data.lastName || data.surname || data.family_name || data['last name'] || '',
                  prenom: data.prenom || data.first_name || data.firstName || data.given_name || data['first name'] || '',
                  nom_complet: data.nom_complet || data.full_name || data.name || data.fullName || data['full name'] || '',
                  
                  // Contact
                  email: data.email || data.courriel || data.mail || data.email_address || data['e-mail'] || '',
                  telephone: data.telephone || data.phone || data.phone_number || data.phone_national || data.tel || data.mobile || data['phone number'] || '',
                  
                  // Date
                  date_naissance: data.date_naissance || data.birth_date || data.birthDate || data.dob || data.date_birth || data.birthday || data['date of birth'] || data['date_naissance'] || '',
                  
                  // Adresse
                  adresse: data.adresse ? 
                    `${data.adresse.voie || data.adresse.Voie || ''} ${data.adresse.code_postal || data.adresse['Code Postal'] || ''} ${data.adresse.commune || data.adresse.Commune || ''}`.trim() :
                    data.adresse_complete || data.address || data.address_street || data.street || data.address_line || data['address'] || data['adresse_complete'] || '',
                  ville: data.ville || data.city || data.town || data.commune || data['city'] || '',
                  code_postal: data.code_postal || data.postal_code || data.zip_code || data.postcode || data['postal code'] || data['zip code'] || '',
                  pays: data.country || data.pays || data['country'] || '',
                  
                  // Divers
                  age: data.age || data.years_old || data.age_years || data['age'] || '',
                  sexe: data.sexe || data.gender || data.sex || data.genre || data['gender'] || '',
                  
                  // Stealer / Breach
                  log_id: data.log_id || data.id || data['log id'] || '',
                  pwned_at: data.pwned_at || data['pwned at'] || data['breach date'] || '',
                  indexed_at: data.indexed_at || data['indexed at'] || '',
                  archive_hash: data.archive_hash || data.hash || data['hash'] || '',
                  
                  // Credentials
                  username: data.username || data.pseudo || data.login || data.user || data.screen_name || data['login'] || '',
                  password: data.password || data.pwd || data.pass || data.passphrase || data.secret || data['password'] || '',
                  url: data.url || data.website || data.domain || data.source_url || data['url'] || '',
                  
                  // Source
                  source: record.source || 'unknown',
                  source_label: data.source || data.provider || record.source || '',
                  
                  // Allocataire (CAF)
                  allocataire: data.allocataire || data['allocataire'] || null,
                  
                  // Enfants
                  enfants: Array.isArray(data.enfants) ? data.enfants : 
                           Array.isArray(data.children) ? data.children : 
                           Array.isArray(data['enfants']) ? data['enfants'] : [],
                  
                  // Base
                  dbname: data.dbname || data.database_name || data.source_db || data['dbname'] || '',
                  
                  // Champs CAF spécifiques
                  id_psp: data.id_psp || data['id psp'] || data['Id Psp'] || '',
                  organisme: data.organisme || data['organisme'] || '',
                  situation: data.situation || data['situation'] || '',
                  allocataire_qualite: data.allocataire_qualite || data['allocataire qualite'] || data.allocataire?.qualite || '',
                  allocataire_prenom: data.allocataire_prenom || data['allocataire prenom'] || data.allocataire?.prenom || '',
                  allocataire_nom: data.allocataire_nom || data['allocataire nom'] || data.allocataire?.nom || '',
                  allocataire_email: data.allocataire_email || data['allocataire email'] || data.allocataire?.courriel || data.allocataire?.email || '',
                  allocataire_telephone: data.allocataire_telephone || data['allocataire telephone'] || data.allocataire?.telephone || '',
                  allocataire_matricule: data.allocataire_matricule || data['allocataire matricule'] || data.allocataire?.matricule || '',
                  allocataire_code_org: data.allocataire_code_organisme || data['allocataire code organisme'] || data.allocataire?.code_organisme || '',
                  adresse_nom: data.adresse_nom_adresse_postale || data['adresse nom adresse postale'] || data.adresse?.nom_adresse_postale || '',
                  adresse_voie: data.adresse_voie || data['adresse voie'] || data.adresse?.voie || '',
                  adresse_cp: data.adresse_code_postal || data['adresse code postal'] || data.adresse?.code_postal || '',
                  adresse_code_insee: data.adresse_code_insee || data['adresse code insee'] || data.adresse?.code_insee || '',
                  adresse_commune: data.adresse_commune || data['adresse commune'] || data.adresse?.commune || '',
                  created: data.created || data.created_at || data['created'] || '',
                  updated: data.updated || data.updated_at || data['updated'] || '',
                  exercice_id: data.exercice_id || data['exercice id'] || '',
                  child_firstname: data.child_firstname || data['child firstname'] || data['child_firstname'] || '',
                  child_lastname: data.child_lastname || data['child lastname'] || data['child_lastname'] || '',
                };
              
                // Construction du titre
                let title = String(fields.nom_complet || `${fields.prenom} ${fields.nom}`.trim() || 
                            fields.email || fields.username || fields.url || fields.log_id || 
                            fields.id_psp || `Entrée ${idx + 1}`);
              
                // Construction du sous-titre - comme dans l'exemple
                const parts = [];
                
                // Identité
                if (fields.prenom && fields.nom) {
                  parts.push({ icon: Icons.user, text: `${fields.prenom} ${fields.nom}` });
                } else if (fields.nom) {
                  parts.push({ icon: Icons.user, text: fields.nom });
                } else if (fields.prenom) {
                  parts.push({ icon: Icons.user, text: fields.prenom });
                }
                
                // Email
                if (fields.email) parts.push({ icon: Icons.email, text: fields.email });
                
                // Téléphone
                if (fields.telephone) parts.push({ icon: Icons.phone, text: fields.telephone });
                
                // Ville
                if (fields.ville) parts.push({ icon: Icons.location, text: fields.ville });
                
                // Âge ou Date
                if (fields.age) parts.push({ icon: Icons.info, text: `${fields.age} ans` });
                if (fields.date_naissance) {
                  try {
                    const d = new Date(fields.date_naissance);
                    if (!isNaN(d)) parts.push({ icon: Icons.calendar, text: d.toLocaleDateString('fr-FR') });
                  } catch(e) {}
                }
                
                // Username
                if (fields.username && !fields.email) parts.push({ icon: Icons.user, text: fields.username });
                
                // Log ID
                if (fields.log_id) {
                  parts.push({ icon: Icons.idCard, text: String(fields.log_id) });
                }
                
                // ID PSP
                if (fields.id_psp) parts.push({ icon: Icons.idCard, text: fields.id_psp });
                
                // Date compromise
                if (fields.pwned_at) {
                  try {
                    const d = new Date(fields.pwned_at);
                    if (!isNaN(d)) parts.push({ icon: Icons.alert, text: d.toLocaleDateString('fr-FR') });
                  } catch(e) {}
                }
                
                // Allocataire (parent)
                if (fields.allocataire_prenom && fields.allocataire_nom) {
                  parts.push({ icon: Icons.users, text: `${fields.allocataire_prenom} ${fields.allocataire_nom}` });
                } else if (fields.allocataire) {
                  const alloc = fields.allocataire;
                  const allocName = `${alloc.prenom || alloc.Prenom || ''} ${alloc.nom || alloc.Nom || ''}`.trim();
                  if (allocName) parts.push({ icon: Icons.users, text: allocName });
                }
              
                // Enfants
                if (fields.enfants.length > 0) {
                  const enfantsNames = fields.enfants.map(e => `${e.prenom || e.Prenom || ''} ${e.nom || e.Nom || ''}`.trim()).filter(Boolean);
                  if (enfantsNames.length > 0) {
                    parts.push({ icon: Icons.user, text: `${enfantsNames.slice(0, 3).join(', ')}${enfantsNames.length > 3 ? ` +${enfantsNames.length - 3}` : ''}` });
                  }
                }
                
                if (fields.child_firstname) {
                  parts.push({ icon: Icons.user, text: `${fields.child_firstname} ${fields.child_lastname || ''}`.trim() });
                }
              
                // Base
                if (fields.dbname) parts.push({ icon: Icons.folder, text: fields.dbname });
                if (fields.organisme) parts.push({ icon: Icons.database, text: fields.organisme });
                if (fields.situation) parts.push({ icon: Icons.file, text: fields.situation });
              
                const subtitle = parts.map((part, partIndex) => (
                  <React.Fragment key={`${part.text}-${partIndex}`}>
                    <span className="inline-flex items-center gap-1 align-middle">{part.icon}{part.text}</span>
                    {partIndex < parts.length - 1 ? ' • ' : null}
                  </React.Fragment>
                ));
              
                // Tags d'informations supplémentaires
                const extra = [];
                
                // Pour Local / CAF / ULP
                if (cat.type === 'local') {
                  if (fields.nom) extra.push({ label: 'Nom', value: fields.nom });
                  if (fields.prenom) extra.push({ label: 'Prénom', value: fields.prenom });
                  if (fields.date_naissance) {
                    try {
                      const d = new Date(fields.date_naissance);
                      if (!isNaN(d)) extra.push({ label: 'Né(e)', value: d.toLocaleDateString('fr-FR') });
                    } catch(e) {}
                  }
                  if (fields.adresse) extra.push({ label: 'Adresse', value: fields.adresse.slice(0, 40) + (fields.adresse.length > 40 ? '...' : '') });
                  if (fields.ville) extra.push({ label: 'Ville', value: fields.ville });
                  if (fields.code_postal) extra.push({ label: 'CP', value: fields.code_postal });
                  if (fields.pays) extra.push({ label: 'Pays', value: fields.pays });
                  if (fields.sexe) extra.push({ label: 'Sexe', value: fields.sexe === 'F' ? 'F' : fields.sexe === 'M' ? 'M' : fields.sexe });
                  if (fields.age) extra.push({ label: 'Âge', value: fields.age });
                  if (fields.id_psp) extra.push({ label: 'ID PSP', value: fields.id_psp });
                  if (fields.organisme) extra.push({ label: 'Organisme', value: fields.organisme });
                  if (fields.situation) extra.push({ label: 'Situation', value: fields.situation });
                  if (fields.allocataire_prenom && fields.allocataire_nom) {
                    extra.push({ label: 'Parent', value: `${fields.allocataire_prenom} ${fields.allocataire_nom}` });
                  }
                  if (fields.allocataire_qualite) extra.push({ label: 'Qualité', value: fields.allocataire_qualite });
                  if (fields.allocataire_matricule) extra.push({ label: 'Matricule', value: fields.allocataire_matricule });
                }
                
                // Pour Breach / Stealer / API
                if (['breach', 'intelx', 'api', 'stealer'].includes(cat.type)) {
                  if (fields.log_id) extra.push({ label: 'Log ID', value: String(fields.log_id) });
                  if (fields.archive_hash) extra.push({ label: 'Hash', value: String(fields.archive_hash) });
                  if (fields.username) extra.push({ label: 'Login', value: fields.username });
                  if (fields.password) extra.push({ label: 'MDP', value: String(fields.password) });
                  if (fields.email && !extra.some(e => e.label === 'Email')) extra.push({ label: 'Email', value: fields.email });
                  if (fields.telephone && !extra.some(e => e.label === 'Téléphone')) extra.push({ label: 'Téléphone', value: fields.telephone });
                  if (fields.pwned_at) {
                    try {
                      const d = new Date(fields.pwned_at);
                      if (!isNaN(d)) extra.push({ label: 'Compromis', value: d.toLocaleDateString('fr-FR') });
                    } catch(e) {}
                  }
                  if (fields.url) extra.push({ label: 'URL', value: String(fields.url) });
                }

                const displayedKeys = new Set([
                  'nom', 'last_name', 'lastName', 'surname', 'family_name', 'prenom', 'first_name', 'firstName',
                  'given_name', 'givenName', 'nom_complet', 'full_name', 'name', 'fullName', 'email', 'courriel',
                  'mail', 'email_address', 'telephone', 'phone', 'phone_number', 'phone_national', 'tel', 'mobile',
                  'date_naissance', 'birth_date', 'birthDate', 'dob', 'date_birth', 'birthday', 'adresse', 'address',
                  'ville', 'city', 'town', 'commune', 'code_postal', 'postal_code', 'zip_code', 'postcode', 'country',
                  'pays', 'age', 'years_old', 'age_years', 'sexe', 'gender', 'sex', 'genre', 'log_id', 'id', 'archive_hash',
                  'hash', 'pwned_at', 'indexed_at', 'username', 'pseudo', 'login', 'user', 'screen_name', 'password',
                  'pwd', 'pass', 'passphrase', 'secret', 'url', 'website', 'domain', 'source_url', 'source', 'provider',
                  'category', 'api_name'
                ]);
                Object.entries(data).forEach(([key, value]) => {
                  if (displayedKeys.has(key) || value === null || value === undefined || value === '') return;
                  const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                  if (formattedValue) extra.push({ label: key, value: formattedValue });
                });
              
                // Limiter à 6 tags max
                const displayExtra = extra;
              
                return (
                  <div 
                    key={idx}
                    onContextMenu={(e) => { e.preventDefault(); handleCopy(JSON.stringify(record, null, 2), e); }}
                    className={`rounded-xl border ${cat.color} cursor-pointer transition-colors duration-200 hover:border-white/[0.16] hover:bg-white/[0.018] group relative overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.18)]`}
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] ${cat.iconColor} ring-1 ring-white/[0.08]`}>{cat.icon}</div>
                        <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="font-medium text-white/90 text-base truncate">{title}</div>
                          <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50 shrink-0 ml-2">{cat.label}</span>
                        </div>
                        {subtitle && (
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45">{subtitle}</div>
                        )}
                        {displayExtra.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {displayExtra.map((field, fi) => (
                              <span key={fi} className="rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[10px] text-white/55">
                                {field.label}: <span className="text-white/80">{field.value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              };
            
              const renderGroups = (sectionTitle, sectionTypes, sectionIcon) => {
                const sectionGroups = sectionTypes
                  .map((catType) => grouped[catType])
                  .filter((group) => group && group.records.length > 0);
                if (sectionGroups.length === 0) return null;

                return (
                  <section className="mb-8 rounded-2xl border border-white/[0.08] bg-black p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-3 border-b border-white/[0.08] pb-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-white/70 ring-1 ring-white/[0.08]">{sectionIcon}</span>
                      <h2 className="text-base font-semibold text-white">{sectionTitle}</h2>
                      <span className="text-xs text-white/35">
                        {sectionGroups.reduce((total, group) => total + group.records.length, 0)} entrées
                      </span>
                    </div>
                    <div className="space-y-6">
                      {sectionGroups.map((group) => {
                        const groupHeader = (
                          <div className="mb-3 flex items-center gap-2">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04] ${group.iconColor}`}>{group.icon}</span>
                            <h3 className="text-sm font-semibold text-white/75">{group.label}</h3>
                            <span className="text-xs text-white/30">{group.records.length} entrées</span>
                          </div>
                        );
                        const groupCards = (
                          <div className="grid grid-cols-1 gap-3">
                            {group.records.map((record, idx) => renderCard(record, idx))}
                          </div>
                        );

                        if (group.type === 'stealer') {
                          return (
                            <details key={group.type} className="rounded-xl border border-white/[0.08] bg-black" open={false}>
                              <summary className="cursor-pointer list-none p-3 [&::-webkit-details-marker]:hidden">{groupHeader}</summary>
                              <div className="border-t border-white/[0.08] p-3">{groupCards}</div>
                            </details>
                          );
                        }

                        return <div key={group.type}>{groupHeader}{groupCards}</div>;
                      })}
                    </div>
                  </section>
                );
              };

              return (
                <>
                  {renderGroups('Résultats API', ['breach', 'intelx', 'api', 'stealer'], Icons.shield)}
                  {renderGroups('Résultats locaux', ['local', 'other'], Icons.database)}
                </>
              );
            })()}
          </div>
        )}
        
        {showGraph && relationshipGraph && (
          <RelationshipGraphVisualization 
            graph={relationshipGraph} 
            familyGroups={familyGroups}
            onClose={() => setShowGraph(false)} 
          />
        )}
        
        {searchType === 'discord' && selectedConversation && selectedConversationData !== null && (
          <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] bg-black"><button onClick={() => setSelectedConversation(null)} className="p-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-white/60 hover:text-white text-sm">{Icons.back} Retour</button></div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedConversationData.map((msg, idx) => {
                const messageDomains = extractDomainsFromText(msg.content || '');
                return (
                  <div key={idx} className="p-3 rounded-xl border border-white/[0.06] bg-black">
                    <div className="flex gap-3">
                      <img src={cleanAvatarUrl(msg.avatar_url)} className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{msg.author_display || msg.author_username || msg.author_id.slice(0, 8)}</span>
                          <span className="text-white/30 text-[10px]">{formatTimestamp(msg.timestamp)}</span>
                        </div>
                        <div className="text-white/60 text-sm mt-1 break-all">{renderTextWithLinks(msg.content || '(aucun texte)', 'text-white/60 text-sm mt-1')}</div>
                        {messageDomains.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {messageDomains.slice(0, 4).map((domain, di) => (
                              <a key={`${domain}-${di}`} href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded">
                                {domain}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {selectedRecord && <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
        
        {results?.error && (<div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-red-500/20 p-8 text-center"><svg className="w-10 h-10 mx-auto mb-2 text-red-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg><p className="text-red-400 text-sm">{results.error}</p></div>)}
      </div>
    </div>
  );
};

export default SearchPage;
