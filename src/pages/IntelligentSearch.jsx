import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const IntelligenceSearch = () => {
  const { isWhite, isLight } = useTheme();
  const gridRef = useRef(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dataLeakResults, setDataLeakResults] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [ftsInput, setFtsInput] = useState('');
  const [ftsResults, setFtsResults] = useState([]);
  const [showRelationGraph, setShowRelationGraph] = useState(false);
  const [osintSearching, setOsintSearching] = useState(false);
  const [osintProgress, setOsintProgress] = useState({ step: '', current: 0, total: 9 });
  const [osintResults, setOsintResults] = useState({
    googleDorks: [],
    images: [],
    socialMedia: [],
    relations: [],
    neighbors: [],
    neighborDetails: [],
    verifiedLinks: [],
    deepWeb: [],
    riskScore: null,
  });
  
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

  const Icons = {
    search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    spinner: <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    mail: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    phone: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
    location: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
    globe: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9" />,
    link: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m3.172-3.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    arrowRight: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />,
    back: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    copy: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />,
    image: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    external: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />,
    neighbor: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    database: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1.79 4 4 4h8c2.21 0 4-2 4-4V7M4 7c0-2 1.79-4 4-4h8c2.21 0 4 2 4 4M4 7c0 2 1.79 3 4 3h8c2.21 0 4-1 4-3M8 3v18m4-18v18" />,
    radar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
    alert: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
    satellite: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    map: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
    flag: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />,
    crosshair: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v2m0 16v2M4 12H2m20 0h-2m-2.586-5.586L19 8m-14 0l-1.414-1.414M17.414 17.414L19 16M5 16l-1.414 1.414M12 16a4 4 0 100-8 4 4 0 000 8z" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    darkWeb: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />,
    fingerprint: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />,
  };

  
  const parseAddress = (address) => {
    if (!address) return { number: null, street: null };
    const match = address.match(/^(\d+[a-z]?)\s+(.+)$/i);
    if (match) {
      return { number: match[1], street: match[2].toLowerCase().trim() };
    }
    return { number: null, street: address.toLowerCase().trim() };
  };

  
  
  const findAdjacentAddresses = (addressNumber, street) => {
    if (!addressNumber || !street) return [];

    const num = parseInt(addressNumber);
    if (isNaN(num)) return [];

    const adjacent = [];

    
    const sideOffsets = [-3, -2, -1, 1, 2, 3];
    sideOffsets.forEach(offset => {
      const adjNum = num + offset;
      if (adjNum > 0) {
        adjacent.push({
          number: adjNum,
          street: street,
          type: Math.abs(offset) === 1 ? 'adjacent_direct' : Math.abs(offset) === 2 ? 'proche' : 'voisinage',
          distance: Math.abs(offset) * 10,
          position: offset < 0 ? 'gauche' : 'droite',
          cote: 'meme'
        });
      }
    });

    
    const baseOpposite = num % 2 === 0 ? num - 1 : num + 1;
    const oppOffsets = [-2, -1, 0, 1, 2];
    oppOffsets.forEach(offset => {
      const oppNum = baseOpposite + offset;
      if (oppNum > 0 && oppNum !== num) {
        adjacent.push({
          number: oppNum,
          street: street,
          type: offset === 0 ? 'en_face_direct' : Math.abs(offset) === 1 ? 'en_face_proche' : 'en_face_voisinage',
          distance: 15 + Math.abs(offset) * 10,
          position: 'oppose',
          cote: 'oppose'
        });
      }
    });

    return adjacent;
  };

  
  const searchAddressInDB = async (addressStr) => {
    try {
      const response = await fetch('/api/sqlite/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: addressStr, 
          exactMatch: false,
          limit: 15 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.results || [];
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  };

  
  const searchPersonInDB = async (name) => {
    if (!name || name.length < 2) return [];
    try {
      const response = await fetch('/api/sqlite/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: name, 
          exactMatch: false,
          limit: 10 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.results || [];
    } catch (error) {
      console.error('Person search error:', error);
      return [];
    }
  };

  
  const searchBreachesForEmail = async (email) => {
    if (!email) return [];
    return [{
      title: 'Have I Been Pwned',
      url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`,
      description: 'Verification de compromission',
      source: 'HIBP',
      icon: 'shield'
    }];
  };

  
  const searchGoogleDorks = async (queries, record) => {
    const results = [];
    const validQueries = queries.filter(q => q && q.length > 2);
    
    for (const query of validQueries.slice(0, 5)) {
      
      results.push({
        title: `Google - "${query}"`,
        url: `https://www.google.com/search?q=${encodeURIComponent(`"${query}"`)}`,
        snippet: `Recherche exacte Google pour ${query}`,
        source: 'google',
        verified: false,
        type: 'exact'
      });
      
      
      results.push({
        title: `Documents - ${query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}+filetype:pdf+OR+filetype:doc+OR+filetype:xls`,
        snippet: `Documents potentiellement lies`,
        source: 'google_docs',
        verified: false,
        type: 'documents'
      });
      
      
      results.push({
        title: `Sites .gouv.fr - ${query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}+site:.gouv.fr`,
        snippet: `Presence sur sites gouvernementaux`,
        source: 'gouv',
        verified: false,
        type: 'government'
      });
      
      
      results.push({
        title: `CV / Profil pro - ${query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}+CV+OR+curriculum+OR+profil`,
        snippet: `CV et profils professionnels`,
        source: 'google_pro',
        verified: false,
        type: 'professional'
      });
    }
    
    return results;
  };

  
  const searchImages = async (name, record) => {
    if (!name || name.length < 2) return [];
    
    const results = [{
      url: `https://www.google.com/search?q=${encodeURIComponent(name)}&tbm=isch`,
      title: `Google Images - ${name}`,
      source: 'google_images',
      isSearchLink: true
    }];
    
    
    const platforms = [
      { name: 'Bing Images', url: `https://www.bing.com/images/search?q=${encodeURIComponent(name)}` },
      { name: 'Yandex Images', url: `https://yandex.com/images/search?text=${encodeURIComponent(name)}` },
      { name: 'TinEye', url: `https://tineye.com/search?url=${encodeURIComponent(name)}` },
    ];
    
    platforms.forEach(p => {
      results.push({
        url: p.url,
        title: `${p.name} - ${name}`,
        source: p.name.toLowerCase().replace(' ', '_'),
        isSearchLink: true
      });
    });
    
    return results;
  };

  
  const searchSocialMedia = async (name, email, phone, record) => {
    const results = [];
    const fullName = name || '';
    const username = fullName.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '');
    
    const platforms = [
      { name: 'Facebook', url: (q) => `https://www.facebook.com/search/top?q=${encodeURIComponent(q)}`, icon: 'facebook' },
      { name: 'Instagram', url: (q) => `https://www.instagram.com/${q}/`, icon: 'instagram' },
      { name: 'Twitter/X', url: (q) => `https://twitter.com/search?q=${encodeURIComponent(q)}&f=user`, icon: 'twitter' },
      { name: 'LinkedIn', url: (q) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`, icon: 'linkedin' },
      { name: 'GitHub', url: (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=users`, icon: 'github' },
      { name: 'TikTok', url: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`, icon: 'tiktok' },
      { name: 'Snapchat', url: (q) => `https://www.snapchat.com/add/${q}`, icon: 'snapchat' },
      { name: 'Telegram', url: (q) => `https://t.me/${q}`, icon: 'telegram' },
      { name: 'Reddit', url: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`, icon: 'reddit' },
      { name: 'Pinterest', url: (q) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`, icon: 'pinterest' },
      { name: 'Medium', url: (q) => `https://medium.com/search?q=${encodeURIComponent(q)}`, icon: 'medium' },
      { name: 'StackOverflow', url: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`, icon: 'stackoverflow' },
      { name: 'YouTube', url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, icon: 'youtube' },
      { name: 'Vimeo', url: (q) => `https://vimeo.com/search?q=${encodeURIComponent(q)}`, icon: 'vimeo' },
      { name: 'SoundCloud', url: (q) => `https://soundcloud.com/search?q=${encodeURIComponent(q)}`, icon: 'soundcloud' },
      { name: 'Dribbble', url: (q) => `https://dribbble.com/search?q=${encodeURIComponent(q)}`, icon: 'dribbble' },
      { name: 'Twitch', url: (q) => `https://www.twitch.tv/search?term=${encodeURIComponent(q)}`, icon: 'twitch' },
    ];

    
    platforms.forEach(platform => {
      const q = username || fullName || '';
      results.push({
        platform: platform.name,
        username: username || fullName.substring(0, 15),
        url: platform.url(q),
        source: platform.name.toLowerCase(),
        icon: platform.icon
      });
    });

    
    if (email) {
      const emailChecks = [
        { name: 'Google (site searches)', url: `https://www.google.com/search?q=${encodeURIComponent(`"${email}" site:facebook.com OR site:instagram.com OR site:twitter.com OR site:linkedin.com OR site:reddit.com OR site:github.com OR site:medium.com OR site:pinterest.com`)}`, icon: 'globe' },
        { name: 'Pipl', url: `https://pipl.com/search/?q=${encodeURIComponent(email)}`, icon: 'search' },
        { name: 'DeHashed', url: `https://www.dehashed.com/search?query=${encodeURIComponent(email)}`, icon: 'database' },
        { name: 'HaveIBeenPwned', url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`, icon: 'shield' },
        { name: 'Social-Searcher', url: `https://www.social-searcher.com/search?q=${encodeURIComponent(email)}`, icon: 'search' },
        { name: 'Google Generic', url: `https://www.google.com/search?q=${encodeURIComponent(`"${email}"`)}`, icon: 'globe' },
      ];

      emailChecks.forEach(ec => results.push({ platform: ec.name, username: email, url: ec.url, source: 'email_check', icon: ec.icon }));
    }
    
    
    if (email) {
      results.push({
        platform: 'HaveIBeenPwned',
        username: email,
        url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`,
        source: 'hibp',
        icon: 'shield'
      });
      
      results.push({
        platform: 'DeHashed',
        username: email,
        url: `https://dehashed.com/search?query=${encodeURIComponent(email)}`,
        source: 'dehashed',
        icon: 'database'
      });
    }
    
    
    if (phone) {
      results.push({
        platform: 'PagesJaunes (inverse)',
        username: phone,
        url: `https://www.pagesjaunes.fr/annuaire-inverse/${phone.replace(/\s/g, '')}`,
        source: 'pagesjaunes',
        icon: 'phone'
      });
      
      results.push({
        platform: 'TrueCaller',
        username: phone,
        url: `https://www.truecaller.com/search/fr/${encodeURIComponent(phone)}`,
        source: 'truecaller',
        icon: 'search'
      });
    }
    
    return results;
  };

  
  const searchRelations = async (data, record) => {
    const results = [];
    
    
    if (data.allocataire) {
      const allocName = `${data.allocataire.prenom || ''} ${data.allocataire.nom || ''}`.trim();
      if (allocName) {
        
        const dbResults = await searchPersonInDB(allocName);
        
        results.push({
          name: allocName,
          relation: 'Allocataire',
          email: data.allocataire.courriel,
          phone: data.allocataire.telephone,
          searchUrl: `https://www.google.com/search?q=${encodeURIComponent(allocName)}`,
          dbResults: dbResults,
          icon: 'user'
        });
      }
    }
    
    
    if (data.nom) {
      const sameLastName = await searchPersonInDB(data.nom);
      const filtered = sameLastName.filter(r => {
        const rd = parseRecord(r);
        return rd.prenom !== data.prenom;
      });
      
      filtered.slice(0, 5).forEach(r => {
        const rd = parseRecord(r);
        const name = `${rd.prenom || ''} ${rd.nom || ''}`.trim();
        if (name) {
          results.push({
            name: name,
            relation: 'Possible lien familial',
            email: rd.email || rd.courriel,
            phone: rd.telephone,
            searchUrl: `https://www.google.com/search?q=${encodeURIComponent(name)}`,
            dbResults: [r],
            icon: 'users'
          });
        }
      });
    }
    
    return results;
  };

  
  const searchNeighborsEnhanced = async (address, city, postalCode) => {
    const links = [];
    const details = [];
    
    if (!address && !city && !postalCode) return { links, details };
    
    const fullAddress = `${address || ''} ${postalCode || ''} ${city || ''}`.trim();
    const { number, street } = parseAddress(address);
    
    
    if (fullAddress) {
      links.push({
        title: 'Vue Satellite',
        url: `https://www.google.com/maps/place/${encodeURIComponent(fullAddress)}`,
        description: `Vue aerienne de l'adresse`,
        type: 'satellite',
        icon: 'satellite'
      });
      
      links.push({
        title: 'Quartier complet',
        url: `https://www.google.com/maps/search/${encodeURIComponent(`adresses ${street || ''} ${city || ''}`)}`,
        description: `Exploration du voisinage`,
        type: 'map',
        icon: 'map'
      });
      
      links.push({
        title: 'Street View',
        url: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(fullAddress)}`,
        description: `Vue immersive de la rue`,
        type: 'streetview',
        icon: 'eye'
      });
      
      links.push({
        title: 'Cadastre',
        url: `https://www.cadastre.gouv.fr/scpc/rechercherParcelle.do`,
        description: `Informations cadastrales`,
        type: 'cadastre',
        icon: 'building'
      });
      
      links.push({
        title: 'PagesBlanches - Quartier',
        url: `https://www.pagesblanches.fr/recherche?q=${encodeURIComponent(street || '')}&where=${encodeURIComponent(city || '')}`,
        description: `Annuaire du quartier`,
        type: 'annuaire',
        icon: 'search'
      });
    }
    
    
    if (number && street) {
      const adjacentAddresses = findAdjacentAddresses(number, street);
      
      for (const adj of adjacentAddresses) {
        const adjAddressStr = `${adj.number} ${adj.street}${city ? `, ${city}` : ''}${postalCode ? ` ${postalCode}` : ''}`;
        
        
        const dbResults = await searchAddressInDB(adjAddressStr);
        
        const positionLabel = adj.position === 'gauche' ? 'Gauche' : adj.position === 'droite' ? 'Droite' : 'Face';
        const typeLabel = adj.type.includes('direct') ? 'Direct' : 'Proche';
        
        links.push({
          title: `N°${adj.number} - ${positionLabel} (${typeLabel})`,
          url: `https://www.google.com/maps/search/${encodeURIComponent(adjAddressStr)}`,
          description: `${adj.cote === 'oppose' ? 'Cote oppose' : 'Meme cote'} (~${adj.distance}m)`,
          type: 'adjacent',
          icon: adj.cote === 'oppose' ? 'flag' : 'neighbor',
          addressData: {
            number: adj.number,
            street: street,
            city: city,
            postalCode: postalCode,
            fullAddress: adjAddressStr,
            position: adj.position,
            cote: adj.cote,
            type: adj.type
          },
          dbResults: dbResults
        });
        
        
        if (dbResults.length > 0) {
          dbResults.forEach(dbRecord => {
            const dbData = parseRecord(dbRecord);
            const dbName = `${dbData.prenom || ''} ${dbData.nom || ''}`.trim();
            
            if (dbName || dbData.email || dbData.telephone) {
              details.push({
                address: adjAddressStr,
                position: positionLabel,
                cote: adj.cote,
                distance: adj.distance,
                record: dbRecord,
                name: dbName || 'Non identifie',
                email: dbData.email || dbData.courriel,
                phone: dbData.telephone,
                source: dbRecord.source,
                type: adj.type
              });
            }
          });
        }
      }
    }
    
    
    if (street && city) {
      const streetSearchResults = await searchAddressInDB(`${street} ${city}`);
      
      streetSearchResults.forEach(dbRecord => {
        const dbData = parseRecord(dbRecord);
        const dbAddress = dbData.adresse?.voie || '';
        const { number: dbNum } = parseAddress(dbAddress);
        
        
        if (dbNum && dbNum !== number) {
          const exists = details.some(d => 
            d.record.id === dbRecord.id || 
            (d.name === `${dbData.prenom || ''} ${dbData.nom || ''}`.trim() && d.name !== '')
          );
          
          if (!exists) {
            const dbName = `${dbData.prenom || ''} ${dbData.nom || ''}`.trim();
            if (dbName || dbData.email || dbData.telephone) {
              details.push({
                address: dbAddress,
                position: 'Quartier',
                cote: 'meme_rue',
                distance: Math.abs(parseInt(dbNum) - parseInt(number)) * 10 || 'Inconnue',
                record: dbRecord,
                name: dbName || 'Non identifie',
                email: dbData.email || dbData.courriel,
                phone: dbData.telephone,
                source: dbRecord.source,
                type: 'quartier'
              });
            }
          }
        }
      });
    }
    
    return { links, details };
  };

  
  const searchVerifiedSources = async (name, email, phone) => {
    const results = [];
    
    if (name) {
      results.push({
        title: `Societe.com - ${name}`,
        url: `https://www.societe.com/cgi-bin/search?champs=${encodeURIComponent(name)}`,
        source: 'societe.com',
        verified: true,
        type: 'business'
      });
      
      results.push({
        title: `Pages Blanches - ${name}`,
        url: `https://www.pagesblanches.fr/recherche?q=${encodeURIComponent(name)}`,
        source: 'pagesblanches',
        verified: true,
        type: 'annuaire'
      });
      
      results.push({
        title: `Infogreffe - ${name}`,
        url: `https://www.infogreffe.fr/recherche?q=${encodeURIComponent(name)}`,
        source: 'infogreffe',
        verified: true,
        type: 'legal'
      });
      
      results.push({
        title: `JORF - ${name}`,
        url: `https://www.legifrance.gouv.fr/search/jorf?q=${encodeURIComponent(name)}`,
        source: 'jorf',
        verified: true,
        type: 'legal'
      });
    }
    
    if (email) {
      results.push({
        title: `Have I Been Pwned - ${email}`,
        url: `https://haveibeenpwned.com/account/${encodeURIComponent(email)}`,
        source: 'hibp',
        verified: true,
        type: 'security'
      });
    }
    
    return results;
  };

  
  const searchDeepWeb = async (name, email, phone) => {
    const results = [];
    const searchTerm = name || email || phone || '';
    
    if (searchTerm) {
      results.push({
        title: `LeakCheck - ${searchTerm}`,
        url: `https://leakcheck.io/search?query=${encodeURIComponent(searchTerm)}`,
        source: 'leakcheck',
        type: 'breach',
        icon: 'darkWeb'
      });
      
      results.push({
        title: `Intelligence X - ${searchTerm}`,
        url: `https://intelx.io/?s=${encodeURIComponent(searchTerm)}`,
        source: 'intelx',
        type: 'intelligence',
        icon: 'radar'
      });
      
      results.push({
        title: `DeHashed - ${searchTerm}`,
        url: `https://dehashed.com/search?query=${encodeURIComponent(searchTerm)}`,
        source: 'dehashed',
        type: 'breach',
        icon: 'database'
      });
      
      results.push({
        title: `BreachDirectory - ${searchTerm}`,
        url: `https://breachdirectory.org/search?search=${encodeURIComponent(searchTerm)}`,
        source: 'breachdirectory',
        type: 'breach',
        icon: 'alert'
      });
    }
    
    return results;
  };

  
  const callHolehe = async (identifier) => {
    try {
      if (!identifier) return null;
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch('/api/osint/holehe', { method: 'POST', headers, body: JSON.stringify({ identifier }) });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || 'holehe request failed');
      }
      return await resp.json();
    } catch (e) {
      console.error('callHolehe error', e);
      return { error: e.message };
    }
  };

  
  const calculateRiskScore = (record, osintData) => {
    let score = 0;
    const data = parseRecord(record);
    
    
    if (data.email) score += 20;
    if (data.telephone) score += 15;
    if (data.date_naissance) score += 25;
    if (data.adresse?.voie) score += 20;
    if (data.allocataire) score += 10;
    if (osintData.socialMedia.length > 3) score += 15;
    if (osintData.googleDorks.length > 5) score += 10;
    if (osintData.neighborDetails.length > 0) score += 15;
    if (osintData.relations.length > 1) score += 10;
    if (osintData.deepWeb.length > 0) score += 5;
    
    score = Math.min(score, 100);
    
    let level, color, icon;
    if (score >= 70) {
      level = 'Critique';
      color = 'red';
      icon = 'alert';
    } else if (score >= 40) {
      level = 'Eleve';
      color = 'orange';
      icon = 'alert';
    } else if (score >= 20) {
      level = 'Modere';
      color = 'yellow';
      icon = 'shield';
    } else {
      level = 'Faible';
      color = 'green';
      icon = 'check';
    }
    
    return { score, level, color, icon };
  };

  
  const runOsintSearch = async (record) => {
    const data = parseRecord(record);
    
    const searchTerms = [];
    const fullName = `${data.prenom || ''} ${data.nom || ''}`.trim();
    if (fullName) searchTerms.push(fullName);
    if (data.prenom) searchTerms.push(data.prenom);
    if (data.nom) searchTerms.push(data.nom);
    if (data.email) searchTerms.push(data.email);
    if (data.courriel) searchTerms.push(data.courriel);
    if (data.telephone) searchTerms.push(data.telephone);
    
    const address = data.adresse?.voie || '';
    const city = data.adresse?.commune || '';
    const postalCode = data.adresse?.code_postal || '';
    const username = fullName.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '');
    
    setOsintSearching(true);
    setOsintResults({
      googleDorks: [],
      images: [],
      socialMedia: [],
      relations: [],
      neighbors: [],
      neighborDetails: [],
      verifiedLinks: [],
      deepWeb: [],
      riskScore: null,
    });
    
    const steps = [
      { key: 'googleDorks', label: 'Google Dorks avance', func: () => searchGoogleDorks(searchTerms, record) },
      { key: 'images', label: 'Recherche images', func: () => searchImages(fullName || data.prenom || data.nom, record) },
      { key: 'socialMedia', label: 'Reseaux sociaux', func: () => searchSocialMedia(fullName, data.email || data.courriel, data.telephone, record) },
      { key: 'holehe', label: 'Holehe (presence comptes)', func: () => callHolehe(data.email || username || fullName) },
      { key: 'relations', label: 'Liens familiaux & pro', func: () => searchRelations(data, record) },
      { key: 'neighbors', label: 'Voisins & Adresses', func: () => searchNeighborsEnhanced(address, city, postalCode) },
      { key: 'verifiedLinks', label: 'Sources verifiees', func: () => searchVerifiedSources(fullName, data.email || data.courriel, data.telephone) },
      { key: 'deepWeb', label: 'Deep Web / Breaches', func: () => searchDeepWeb(fullName, data.email || data.courriel, data.telephone) },
    ];
    
    let allResults = {};
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setOsintProgress({ step: step.label, current: i + 1, total: steps.length + 1 });
      
      try {
        const results = await step.func();
        
        if (step.key === 'neighbors') {
          setOsintResults(prev => ({ 
            ...prev, 
            neighbors: results.links,
            neighborDetails: results.details
          }));
          allResults.neighbors = results.links;
          allResults.neighborDetails = results.details;
        } else {
          setOsintResults(prev => ({ ...prev, [step.key]: results }));
          allResults[step.key] = results;
        }
      } catch (err) {
        console.error(`Error in ${step.key}:`, err);
        setOsintResults(prev => ({ ...prev, [step.key]: [] }));
        allResults[step.key] = [];
      }
    }
    
    
    setOsintProgress({ step: 'Analyse du risque', current: steps.length + 1, total: steps.length + 1 });
    const riskScore = calculateRiskScore(record, allResults);
    setOsintResults(prev => ({ ...prev, riskScore }));
    
    setOsintSearching(false);
  };

  const parseRecord = (record) => {
    if (record.parsedData) return record.parsedData;
    if (record.data) return record.data;
    if (record.content && typeof record.content === 'string') {
      try {
        return JSON.parse(record.content);
      } catch(e) {
        return { raw: record.content };
      }
    }
    return record;
  };

  const searchDataLeak = async (firstNameVal, lastNameVal, emailVal, phoneVal) => {
    let exactQuery = '';
    
    if (firstNameVal && lastNameVal) {
      exactQuery = `${firstNameVal} ${lastNameVal}`;
    } else if (firstNameVal) {
      exactQuery = firstNameVal;
    } else if (lastNameVal) {
      exactQuery = lastNameVal;
    } else if (emailVal) {
      exactQuery = emailVal;
    } else if (phoneVal) {
      exactQuery = phoneVal;
    }
    
    if (!exactQuery) return [];
    
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch('/api/sqlite/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          query: exactQuery, 
          exactMatch: false,
          limit: 1000 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      return data.results || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  };

  const searchFreeFts = async (queryText) => {
    if (!queryText || queryText.trim().length < 2) return [];
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch('/api/sqlite/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: queryText.trim(), exactMatch: false, limit: 200 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur FTS');
      return data.results || [];
    } catch (error) {
      console.error('FTS search error:', error);
      return [];
    }
  };

  const handleFtsSearch = async () => {
    if (!ftsInput.trim()) return;
    setIsSearching(true);
    setDataLeakResults([]);
    setSelectedRecord(null);
    setFtsResults([]);
    try {
      const results = await searchFreeFts(ftsInput);
      setFtsResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    const hasFirstName = firstName.trim();
    const hasLastName = lastName.trim();
    const hasEmail = email.trim();
    const hasPhone = phone.trim();
    
    if (!hasFirstName && !hasLastName && !hasEmail && !hasPhone) {
      return;
    }
    
    setIsSearching(true);
    setDataLeakResults([]);
    setSelectedRecord(null);
    
    try {
      const results = await searchDataLeak(
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        phone.trim()
      );
      
      setDataLeakResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRecord = async (record) => {
    setSelectedRecord(record);
    await runOsintSearch(record);
  };

  const RelationGraph = ({ mainLabel, relations }) => {
    if (!relations || relations.length === 0) {
      return <div className="text-white/40 text-sm">Aucun arbre relationnel disponible.</div>;
    }

    const centerX = 250;
    const centerY = 120;
    const radius = 120;
    const angleStep = (Math.PI * 2) / relations.length;

    return (
      <div className="relative rounded-3xl border border-white/[0.08] bg-white/5 p-4">
        <div className="text-sm text-white/70 mb-3">Arbre relationnel</div>
        <div className="relative w-full h-[280px]">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 260" preserveAspectRatio="xMidYMid meet">
            {relations.map((relation, index) => {
              const angle = index * angleStep - Math.PI / 2;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              return (
                <g key={index}>
                  <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="rgba(168,85,247,0.35)" strokeWidth="2" />
                  <circle cx={x} cy={y} r="28" fill="rgba(79,70,229,0.12)" stroke="rgba(168,85,247,0.45)" strokeWidth="1.5" />
                  <text x={x} y={y - 5} textAnchor="middle" fontSize="12" fill="#fff">{relation.name || 'Inconnu'}</text>
                  <text x={x} y={y + 12} textAnchor="middle" fontSize="10" fill="#c7d2fe">{relation.relation}</text>
                </g>
              );
            })}
            <circle cx={centerX} cy={centerY} r="36" fill="rgba(167,139,250,0.25)" stroke="rgba(167,139,250,0.8)" strokeWidth="1.5" />
            <text x={centerX} y={centerY - 5} textAnchor="middle" fontSize="14" fill="#fff">{mainLabel || 'Cible'}</text>
            <text x={centerX} y={centerY + 12} textAnchor="middle" fontSize="10" fill="#c7d2fe">Arbre familial</text>
          </svg>
        </div>
      </div>
    );
  };

  const RecordDetail = ({ record }) => {
    const data = parseRecord(record);
    
    const InfoRow = ({ label, value, icon }) => {
      if (!value) return null;
      return (
        <div className="border-b border-white/[0.06] py-2">
          <span className="text-purple-400 text-xs uppercase tracking-wider block mb-0.5">
            {icon && <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>}
            {label}
          </span>
          <span className="text-white/70 text-sm font-mono break-all">{value}</span>
        </div>
      );
    };
    
    return (
      <div className="space-y-1">
        <InfoRow label="Source" value={record.source} icon={Icons.database} />
        <InfoRow label="Prenom" value={data.prenom} icon={Icons.user} />
        <InfoRow label="Nom" value={data.nom} icon={Icons.user} />
        <InfoRow label="Nom complet" value={data.nom_complet} />
        <InfoRow label="Date naissance" value={data.date_naissance ? new Date(data.date_naissance).toLocaleDateString('fr-FR') : null} />
        <InfoRow label="Genre" value={data.genre === 'F' ? 'Feminin' : data.genre === 'M' ? 'Masculin' : null} />
        <InfoRow label="Email" value={data.email || data.courriel} icon={Icons.mail} />
        <InfoRow label="Telephone" value={data.telephone} icon={Icons.phone} />
        <InfoRow label="ID PSP" value={data.id_psp} />
        <InfoRow label="Organisme" value={data.organisme} icon={Icons.building} />
        
        {data.allocataire && (
          <div className="mt-3 pt-2 border-t border-white/[0.08]">
            <span className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.users}</svg>
              Allocataire
            </span>
            <InfoRow label="Qualite" value={data.allocataire.qualite} />
            <InfoRow label="Prenom" value={data.allocataire.prenom} />
            <InfoRow label="Nom" value={data.allocataire.nom} />
            <InfoRow label="Email" value={data.allocataire.courriel} />
            <InfoRow label="Telephone" value={data.allocataire.telephone} />
          </div>
        )}
        
        {data.adresse && (
          <div className="mt-3 pt-2 border-t border-white/[0.08]">
            <span className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.location}</svg>
              Adresse
            </span>
            <InfoRow label="Voie" value={data.adresse.voie} />
            <InfoRow label="Code postal" value={data.adresse.code_postal} />
            <InfoRow label="Commune" value={data.adresse.commune} />
          </div>
        )}
      </div>
    );
  };

  
  const RiskScoreCard = ({ riskScore }) => {
    if (!riskScore) return null;
    
    const colorMap = {
      red: 'from-red-500 to-red-600',
      orange: 'from-orange-500 to-orange-600',
      yellow: 'from-yellow-500 to-yellow-600',
      green: 'from-green-500 to-green-600'
    };
    
    const bgMap = {
      red: 'bg-red-500/10 border-red-500/30',
      orange: 'bg-orange-500/10 border-orange-500/30',
      yellow: 'bg-yellow-500/10 border-yellow-500/30',
      green: 'bg-green-500/10 border-green-500/30'
    };
    
    const textMap = {
      red: 'text-red-400',
      orange: 'text-orange-400',
      yellow: 'text-yellow-400',
      green: 'text-green-400'
    };
    
    const iconMap = {
      red: Icons.alert,
      orange: Icons.alert,
      yellow: Icons.shield,
      green: Icons.check
    };
    
    return (
      <div className={`p-4 rounded-xl border ${bgMap[riskScore.color]} mb-4`}>
        <div className="flex items-center gap-3 mb-3">
          <svg className={`w-6 h-6 ${textMap[riskScore.color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {iconMap[riskScore.color]}
          </svg>
          <div>
            <p className="text-white font-medium">Score d'exposition</p>
            <p className={`text-sm ${textMap[riskScore.color]}`}>{riskScore.level}</p>
          </div>
          <div className="ml-auto text-2xl font-bold text-white">{riskScore.score}<span className="text-sm text-white/40">/100</span></div>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className={`h-2 rounded-full bg-gradient-to-r ${colorMap[riskScore.color]}`}
            style={{ width: `${riskScore.score}%`, transition: 'width 1s ease-out' }}
          />
        </div>
      </div>
    );
  };

  const NeighborDetailCard = ({ detail }) => {
    return (
      <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition">
        <div className="flex items-start gap-2 mb-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            detail.cote === 'oppose' ? 'bg-blue-500/20' : 'bg-purple-500/20'
          }`}>
            <svg className={`w-4 h-4 ${detail.cote === 'oppose' ? 'text-blue-400' : 'text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {detail.cote === 'oppose' ? Icons.flag : Icons.neighbor}
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{detail.name}</p>
            <p className="text-xs text-white/40">
              {detail.position} {detail.cote === 'oppose' ? '(face)' : ''} · ~{detail.distance}m
            </p>
          </div>
        </div>
        
        <div className="text-xs space-y-1 mt-2 pt-2 border-t border-white/[0.06]">
          <p className="text-white/50">Adresse: <span className="text-white/70">{detail.address}</span></p>
          {detail.email && (
            <p className="text-white/50">Email: <span className="text-white/70">{detail.email}</span></p>
          )}
          {detail.phone && (
            <p className="text-white/50">Tel: <span className="text-white/70">{detail.phone}</span></p>
          )}
          <p className="text-white/30">Source: {detail.source}</p>
        </div>
        
        <div className="mt-2 flex gap-2">
          <a 
            href={`https://www.google.com/maps/search/${encodeURIComponent(detail.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.location}</svg>
            Maps
          </a>
          {detail.name !== 'Non identifie' && (
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent(detail.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.search}</svg>
              Rechercher
            </a>
          )}
        </div>
      </div>
    );
  };

  const OsintPanel = () => {
    const tabs = [
      { id: 'google', label: 'Google Dorks', count: osintResults.googleDorks.length, icon: Icons.globe },
      { id: 'images', label: 'Images', count: osintResults.images.length, icon: Icons.image },
      { id: 'social', label: 'Reseaux', count: osintResults.socialMedia.length, icon: Icons.users },
      { id: 'relations', label: 'Relations', count: osintResults.relations.length, icon: Icons.link },
      { id: 'neighbors', label: 'Voisins', count: osintResults.neighbors.length + osintResults.neighborDetails.length, icon: Icons.neighbor },
      { id: 'verified', label: 'Sources', count: osintResults.verifiedLinks.length, icon: Icons.check },
      { id: 'deepweb', label: 'Deep Web', count: osintResults.deepWeb.length, icon: Icons.darkWeb },
    ];
    
    const [activeOsintTab, setActiveOsintTab] = useState('google');
    
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
          <h3 className="text-lg font-semibold">Recherche OSINT</h3>
          {osintSearching && (
            <div className="flex items-center gap-2 ml-4">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs text-white/50">{osintProgress.step} ({osintProgress.current}/{osintProgress.total})</span>
            </div>
          )}
        </div>

        {/* Score de risque */}
        <RiskScoreCard riskScore={osintResults.riskScore} />
        
        <div className="flex flex-wrap gap-1 mb-4 border-b border-white/[0.08] pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveOsintTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                activeOsintTab === tab.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {activeOsintTab === 'google' && osintResults.googleDorks.map((result, idx) => (
            <a key={idx} href={result.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] transition group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-white">{result.title}</span>
                    {result.verified && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Verifie
                      </span>
                    )}
                    <span className="text-xs text-white/30">{result.source}</span>
                    <span className="text-xs text-white/20">{result.type}</span>
                  </div>
                  <p className="text-xs text-white/40">{result.snippet}</p>
                </div>
                <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.external}</svg>
              </div>
            </a>
          ))}
          
          {activeOsintTab === 'images' && (
            <div className="grid grid-cols-2 gap-3">
              {osintResults.images.map((img, idx) => (
                <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-white/[0.06] overflow-hidden hover:scale-105 transition">
                  <div className="bg-white/5 h-32 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-10 h-10 text-white/30 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.image}</svg>
                      <p className="text-xs text-white/40">Rechercher</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-white/60 truncate">{img.title}</p>
                    <p className="text-[10px] text-white/30">{img.source}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
          
          {activeOsintTab === 'social' && osintResults.socialMedia.map((result, idx) => (
            <a key={idx} href={result.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{result.platform}</span>
                    {result.username && <span className="text-xs text-white/40">@{result.username}</span>}
                  </div>
                  <p className="text-xs text-purple-400 mt-1">Rechercher</p>
                </div>
                <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.external}</svg>
              </div>
            </a>
          ))}
          
          {activeOsintTab === 'relations' && osintResults.relations.map((relation, idx) => (
            <div key={idx}>
              <a href={relation.searchUrl} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] transition mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.user}</svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{relation.name}</p>
                    <p className="text-xs text-white/40">{relation.relation}</p>
                  </div>
                </div>
                {(relation.email || relation.phone) && (
                  <div className="flex gap-3 text-xs text-white/50 mt-2 pt-2 border-t border-white/[0.06]">
                    {relation.email && <span>Email: {relation.email}</span>}
                    {relation.phone && <span>Tel: {relation.phone}</span>}
                  </div>
                )}
              </a>
              
              {/* Afficher les resultats DB pour cette relation */}
              {relation.dbResults && relation.dbResults.length > 0 && (
                <div className="ml-4 border-l-2 border-purple-500/30 pl-3 mb-2 space-y-1">
                  {relation.dbResults.map((dbRec, dbIdx) => {
                    const dbData = parseRecord(dbRec);
                    return (
                      <div key={dbIdx} className="text-xs text-white/50 bg-white/[0.02] p-2 rounded-lg">
                        <p className="text-white/70">Source: {dbRec.source}</p>
                        {dbData.email && <p>Email: {dbData.email}</p>}
                        {dbData.telephone && <p>Tel: {dbData.telephone}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          
          {activeOsintTab === 'neighbors' && (
            <div className="space-y-4">
              {/* Liens de cartographie */}
              {osintResults.neighbors.filter(n => n.type !== 'adjacent').map((result, idx) => (
                <a key={idx} href={result.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] transition">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {result.icon === 'satellite' ? Icons.satellite : result.icon === 'map' ? Icons.map : result.icon === 'eye' ? Icons.eye : result.icon === 'building' ? Icons.building : Icons.search}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{result.title}</p>
                      <p className="text-xs text-white/40 mt-1">{result.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.external}</svg>
                  </div>
                </a>
              ))}
              
              {/* Adresses adjacentes avec cross-reference DB */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.crosshair}</svg>
                  Adresses adjacentes detectees
                </h4>
                <div className="space-y-2">
                  {osintResults.neighbors.filter(n => n.type === 'adjacent').map((result, idx) => (
                    <div key={idx}>
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] transition">
                        <div className="flex items-start gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            result.addressData?.cote === 'oppose' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                          }`}>
                            <svg className={`w-4 h-4 ${result.addressData?.cote === 'oppose' ? 'text-blue-400' : 'text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {result.addressData?.cote === 'oppose' ? Icons.flag : Icons.neighbor}
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{result.title}</p>
                            <p className="text-xs text-white/40">{result.description}</p>
                            {result.dbResults && result.dbResults.length > 0 && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full mt-1 inline-block">
                                {result.dbResults.length} resultat(s) DB
                              </span>
                            )}
                          </div>
                          <svg className="w-5 h-5 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.external}</svg>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Details des voisins trouves dans la DB */}
              {osintResults.neighborDetails.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.database}</svg>
                    Voisins identifies dans les donnees ({osintResults.neighborDetails.length})
                  </h4>
                  <div className="space-y-2">
                    {osintResults.neighborDetails.map((detail, idx) => (
                      <NeighborDetailCard key={idx} detail={detail} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeOsintTab === 'verified' && osintResults.verifiedLinks.map((result, idx) => (
            <a key={idx} href={result.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.check}</svg>
                <span className="text-sm font-medium text-white">{result.title}</span>
              </div>
              <p className="text-xs text-white/40">Source: {result.source} · {result.type}</p>
            </a>
          ))}
          
          {activeOsintTab === 'deepweb' && osintResults.deepWeb.map((result, idx) => (
            <a key={idx} href={result.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.darkWeb}</svg>
                <span className="text-sm font-medium text-white">{result.title}</span>
              </div>
              <p className="text-xs text-white/40">Type: {result.type} · Source: {result.source}</p>
            </a>
          ))}
          
          {!osintSearching && tabs.find(t => t.id === activeOsintTab)?.count === 0 && activeOsintTab !== 'neighbors' && (
            <div className="text-center py-8 text-white/30 text-sm">
              Aucun resultat
            </div>
          )}
          
          {!osintSearching && activeOsintTab === 'neighbors' && osintResults.neighbors.length === 0 && osintResults.neighborDetails.length === 0 && (
            <div className="text-center py-8 text-white/30 text-sm">
              Aucun resultat pour le voisinage
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative min-h-screen w-full overflow-hidden ${isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'}`}>
      <div ref={gridRef} className="absolute inset-0 opacity-[0.2]" style={{
        backgroundImage: `linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px), linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link to="/" className="group inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour
          </Link>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
            Intelligence Search
          </h1>
          <p className="text-white/30 mt-2 text-sm">Recherche avancee dans les fuites + OSINT complet avec cartographie</p>
        </div>
        
        <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-white/50 text-xs mb-1">Prenom</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none text-sm" placeholder="Jean" />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">Nom</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none text-sm" placeholder="Dupont" />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none text-sm" placeholder="jean@email.com" />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">Telephone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none text-sm" placeholder="0612345678" />
            </div>
          </div>
          
          <button onClick={handleSearch} disabled={isSearching} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {isSearching ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">{Icons.spinner}</svg>
                Recherche...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.search}</svg>
                Rechercher
              </>
            )}
          </button>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-white/50 text-xs mb-1">Recherche libre FTS</label>
              <input type="text" value={ftsInput} onChange={(e) => setFtsInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleFtsSearch()} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none text-sm" placeholder="Recherche libre dans l'index..." />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <button onClick={handleFtsSearch} disabled={isSearching || !ftsInput.trim()} className="w-full py-3 rounded-xl bg-emerald-600 border border-emerald-500 text-white font-medium hover:bg-emerald-500 transition disabled:opacity-50">
                {isSearching ? 'Recherche...' : 'FTS libre'}
              </button>
            </div>
          </div>
        </div>
        
        {dataLeakResults.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
                <h2 className="text-lg font-semibold">Resultats</h2>
                <p className="text-white/40 text-xs">{dataLeakResults.length} entree(s)</p>
              </div>
              <div className="divide-y divide-white/[0.06] max-h-[600px] overflow-y-auto">
                {dataLeakResults.map((record, idx) => {
                  const data = parseRecord(record);
                  const displayName = `${data.prenom || ''} ${data.nom || ''}`.trim() || data.email || `Entree ${idx + 1}`;
                  const isSelected = selectedRecord?.id === record.id;
                  return (
                    <div key={record.id || idx} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectRecord(record); }} className={`p-4 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-purple-500/20 border-l-4 border-purple-500' : 'hover:bg-white/[0.05]'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-white">{displayName}</span>
                          <div className="flex gap-3 text-xs text-white/40 mt-1 flex-wrap">
                            {data.email && <span>Email: {data.email}</span>}
                            {data.telephone && <span>Tel: {data.telephone}</span>}
                          </div>
                          <p className="text-white/30 text-xs font-mono mt-2">Source: {record.source}</p>
                        </div>
                        <svg className="w-5 h-5 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.arrowRight}</svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
              {selectedRecord ? (
                <div className="p-5 max-h-[800px] overflow-y-auto">
                  <div className="mb-6 pb-4 border-b border-white/[0.08]">
                    <h3 className="text-lg font-semibold mb-3">Details</h3>
                    <RecordDetail record={selectedRecord} />
                  </div>
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Outils OSINT</h4>
                      <p className="text-xs text-white/40">Voir les relations, le voisinage et l'arbre genealogique.</p>
                    </div>
                    <button onClick={() => setShowRelationGraph(!showRelationGraph)} className="rounded-2xl bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10 transition">
                      {showRelationGraph ? 'Masquer arbre' : 'Afficher arbre'}
                    </button>
                  </div>
                  {showRelationGraph && <RelationGraph mainLabel={`${parseRecord(selectedRecord).prenom || ''} ${parseRecord(selectedRecord).nom || ''}`.trim()} relations={osintResults.relations} />}
                  <OsintPanel />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <svg className="w-16 h-16 text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.search}</svg>
                  <p className="text-white/40">Selectionnez un resultat</p>
                  <p className="text-white/20 text-sm mt-1">Cliquez sur une entree pour lancer la recherche OSINT</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {ftsResults.length > 0 && (
          <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Résultats FTS libres</h2>
                <p className="text-white/40 text-xs">Recherche directe dans l'index FTS</p>
              </div>
              <span className="text-xs text-white/30">{ftsResults.length} résultat(s)</span>
            </div>
            <div className="divide-y divide-white/[0.06] max-h-[420px] overflow-y-auto">
              {ftsResults.map((record, idx) => {
                const data = parseRecord(record);
                const label = `${data.prenom || ''} ${data.nom || ''}`.trim() || data.email || `Résultat ${idx + 1}`;
                return (
                  <div key={record.id || idx} className="p-4 hover:bg-white/[0.03] transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="text-xs text-white/40 mt-1">Source: {record.source} · ID: {record.id}</p>
                        {data.email && <p className="text-xs text-white/50 mt-1">Email: {data.email}</p>}
                        {data.telephone && <p className="text-xs text-white/50 mt-1">Tel: {data.telephone}</p>}
                      </div>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectRecord(record); }} className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10 transition">Voir</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {dataLeakResults.length === 0 && ftsResults.length === 0 && !isSearching && (
          <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.search}</svg>
            <p className="text-white/40">Aucun resultat trouve</p>
            <p className="text-white/20 text-sm mt-1">Essayez avec d'autres criteres</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceSearch;