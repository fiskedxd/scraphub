import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const gradientPresets = {
  'cool-blue': 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  sunset: 'linear-gradient(135deg, #fb7183, #f97316)',
  emerald: 'linear-gradient(135deg, #10b981, #065f46)',
  midnight: 'linear-gradient(135deg, #0f172a, #334155)',
  purple: 'linear-gradient(135deg, #a855f7, #7c3aed)',
  pink: 'linear-gradient(135deg, #ec4899, #be185d)'
};

const badgeOptions = [
  { id: 'bugHunter', label: 'BUG Hunter', image: 'https://scraphub-web-backend.fly.dev/uploads/badges/bughunter.png', requirement: 'Disponible pour tous' },
  { id: 'qlf', label: 'QLF', image: 'https://scraphub-web-backend.fly.dev/uploads/badges/qlf.png', requirement: 'Badge communautaire' },
  { id: 'eternal', label: 'Eternel', image: 'https://scraphub-web-backend.fly.dev/uploads/badges/eternal.png', requirement: 'Badge communautaire' },
  { id: 'premium', label: 'Premium', image: 'https://scraphub-web-backend.fly.dev/uploads/badges/prenium.png', requirement: 'Plan payant' },
  { id: 'verified', label: 'Verified', image: 'https://scraphub-web-backend.fly.dev/uploads/badges/verified.png', requirement: 'Email verifie' },
  { id: 'leet', label: '1337', image: 'https://scraphub-web-backend.fly.dev/uploads/badges/1337.png', requirement: 'Disponible pour tous' }
];

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const { isWhite, isLight, isDark } = useTheme();
  const gridRef = useRef(null);
  
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    website: '',
    location: '',
    avatar: '/pdp.png',
    backgroundUrl: '',
    backgroundType: 'image',
    backgroundPreset: 'cool-blue',
    profileAnimation: 'none',
    profileTheme: 'dark',
    profileVisibility: 'public',
    showEmail: false,
    showLocation: true,
    badges: []
  });
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [status, setStatus] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [showSpotify, setShowSpotify] = useState(true);
  const [badgeCode, setBadgeCode] = useState('');
  const [badgeActionStatus, setBadgeActionStatus] = useState('');
  const [openSections, setOpenSections] = useState({
    info: true,
    customization: true,
    badges: false,
    visibility: false,
    spotify: false
  });

  const toggleSection = (section) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  
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

  useEffect(() => {
    if (typeof console !== 'undefined') {
      console.log('%cWARNING: DO NOT PASTE ANY CODE HERE', 'font-size: 32px; font-weight: bold; color: black; background: yellow; padding: 12px;');
      console.log('%cThis console is for developers only. Do not paste code you do not understand.', 'font-size: 16px; font-weight: bold; color: white; background: red; padding: 8px;');
      const warning = 'WARNING DONT PASTE ANYTHING HERE - DO NOT COPY/PASTE CODE FROM UNKNOWN SOURCES';
      for (let i = 0; i < 500; i += 1) {
        console.warn(`${i + 1}. ${warning}`);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      displayName: user.publicProfile?.displayName || user.name || '',
      username: user.publicProfile?.username || (user.name || '').replace(/\s+/g, '-').toLowerCase(),
      bio: user.publicProfile?.bio || user.bio || '',
      website: user.publicProfile?.website || user.website || '',
      location: user.publicProfile?.location || user.location || '',
      avatar: user.publicProfile?.avatar || '/pdp.png',
      backgroundUrl: user.publicProfile?.backgroundUrl || '',
      backgroundType: user.publicProfile?.backgroundType || 'image',
      backgroundPreset: user.publicProfile?.backgroundPreset || 'cool-blue',
      profileAnimation: user.publicProfile?.profileAnimation || 'none',
      profileTheme: user.publicProfile?.profileTheme || 'dark',
      profileVisibility: user.privacy?.profileVisibility || 'public',
      showEmail: user.publicProfile?.showEmail ?? user.privacy?.showEmail ?? false,
      showLocation: user.publicProfile?.showLocation ?? user.privacy?.showLocation ?? true,
      badges: Array.isArray(user.publicProfile?.badges) ? user.publicProfile.badges.map((badge) => badge.id) : []
    }));

    
    if (user.integrations?.spotify?.isConnected) {
      setSpotifyConnected(true);
      setSpotifyUser({
        displayName: user.integrations.spotify.displayName,
        profileUrl: user.integrations.spotify.profileUrl,
        avatar: user.integrations.spotify.avatar
      });
      setShowSpotify(user.integrations.spotify.showCurrentTrack ?? true);
    }
  }, [user]);

  
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const backgroundStyle = useMemo(() => {
    if (form.backgroundType === 'gradient') {
      return { backgroundImage: gradientPresets[form.backgroundPreset] || gradientPresets['cool-blue'] };
    }
    if (form.backgroundType === 'image' && form.backgroundUrl) {
      return { backgroundImage: `url('${form.backgroundUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundImage: gradientPresets.midnight };
  }, [form.backgroundType, form.backgroundPreset, form.backgroundUrl]);

  const previewUsername = useMemo(() => {
    return (form.username || form.displayName || user?.name || 'profil').replace(/\s+/g, '-').toLowerCase();
  }, [form.username, form.displayName, user]);

  const isBadgeAvailable = (badgeId) => {
    if (badgeId === 'premium') return user?.accountType && user.accountType !== 'free';
    if (badgeId === 'verified') return user?.publicProfile?.verifiedBadge;
    if (badgeId === 'leet' || badgeId === 'bugHunter') return true;
    return true;
  };

  const Icons = {
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    globe: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9" />,
    location: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
    mail: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    save: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />,
    lock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
    brush: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
    arrow: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />,
    music: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />,
    video: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  };

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const badgeRequest = async (path, body) => {
    setBadgeActionStatus('');
    const response = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Action impossible.');
    setBadgeActionStatus(data.message || 'Badge mis à jour.');
    return data;
  };

  const requestVerifiedBadge = async () => {
    try {
      await badgeRequest('verified-badge/request', {});
    } catch (error) {
      setBadgeActionStatus(error.message);
    }
  };

  const confirmVerifiedBadge = async () => {
    try {
      await badgeRequest('verified-badge/confirm', { code: badgeCode });
      setBadgeActionStatus('Email vérifié. Le badge est disponible.');
      handleChange('badges', [...new Set([...form.badges, 'verified'])]);
    } catch (error) {
      setBadgeActionStatus(error.message);
    }
  };
  
  const handleFileUpload = async (e, fieldType) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setStatus({
        type: 'error',
        message: 'La vidéo est trop volumineuse. Maximum : 500 Mo.'
      });
      e.target.value = '';
      return;
    }

    const isVideo = (file.type || '').startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(file.name);
    if (fieldType === 'backgroundUrl') {
      handleChange('backgroundType', isVideo ? 'video' : 'image');
    }

    setSaving(true);
    setUploadProgress(0);
    setStatus({
      type: 'warning',
      message: isVideo
        ? `Envoi de la vidéo (${(file.size / (1024 * 1024)).toFixed(1)} Mo)… ne fermez pas la page.`
        : 'Téléversement en cours…'
    });

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Session expirée.');

      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const apiOrigin =
          process.env.REACT_APP_API_URL ||
          (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://scraphub-web-backend.fly.dev');
        xhr.open('POST', `${apiOrigin}/api/upload/profile`);
        xhr.timeout = 0;
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const pct = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(pct);
          setStatus({
            type: 'warning',
            message: `Upload ${pct}% — ${(event.loaded / (1024 * 1024)).toFixed(1)} / ${(event.total / (1024 * 1024)).toFixed(1)} Mo`
          });
        };

        xhr.onload = () => {
          let parsed = {};
          try {
            parsed = JSON.parse(xhr.responseText || '{}');
          } catch {
            parsed = {};
          }
          if (xhr.status >= 200 && xhr.status < 300 && parsed.success && parsed.url) {
            resolve(parsed);
            return;
          }
          reject(new Error(parsed.error || `Erreur HTTP ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error('Connexion interrompue pendant l\'upload.'));
        xhr.ontimeout = () => reject(new Error('L\'upload a pris trop de temps.'));
        xhr.onabort = () => reject(new Error('Upload annulé.'));

        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      });

      handleChange(fieldType, data.url);
      setUploadProgress(100);
      setStatus({
        type: 'success',
        message: 'Téléversement réussi. Pensez à enregistrer le profil.'
      });
    } catch (error) {
      console.error('Erreur upload:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Échec du téléversement.'
      });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };
  const handleSubmit = async () => {
    setSaving(true);
    setStatus(null);
    const payload = {
      name: user?.name || '',
      email: user?.email || '',
      bio: form.bio,
      website: form.website,
      location: form.location,
      publicProfile: {
        displayName: form.displayName,
        username: form.username,
        bio: form.bio,
        website: form.website,
        location: form.location,
        avatar: form.avatar,
        backgroundUrl: form.backgroundUrl,
        backgroundType: form.backgroundType,
        backgroundPreset: form.backgroundPreset,
        profileAnimation: form.profileAnimation,
        profileTheme: form.profileTheme,
        showEmail: form.showEmail,
        showLocation: form.showLocation,
        badges: form.badges
      },
      privacy: {
        profileVisibility: form.profileVisibility,
        showEmail: form.showEmail,
        showLocation: form.showLocation
      }
    };

    const result = await updateProfile(payload);
    if (result.success) {
      setStatus({ type: 'success', message: 'Profile saved successfully.' });
    } else {
      setStatus({ type: 'error', message: result.error || 'Unable to save profile.' });
    }
    setSaving(false);
  };

  const handleConnectSpotify = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/spotify/login', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Erreur de connexion Spotify' });
    }
  };

  const handleDisconnectSpotify = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/spotify/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSpotifyConnected(false);
        setSpotifyUser(null);
        setStatus({ type: 'success', message: 'Spotify déconnecté' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Erreur de déconnexion' });
    }
  };

  const handleToggleSpotifyVisibility = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/spotify/toggle-visibility', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ show: !showSpotify })
      });
      if (response.ok) {
        setShowSpotify(!showSpotify);
        setStatus({ type: 'success', message: `Spotify ${!showSpotify ? 'affiché' : 'caché'} sur votre profil` });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Erreur de mise à jour' });
    }
  };

  if (!user) {
    return (
      <div className={`relative min-h-screen w-full overflow-hidden transition-all duration-300 ${
        isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'
      }`}>
        <div ref={gridRef} className="absolute inset-0 opacity-[0.2]" style={{
          backgroundImage: `linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px), linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-24">
          <div className={`rounded-3xl border p-10 text-center backdrop-blur-xl ${
            isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
          }`}>
            <div className="inline-flex px-4 py-1.5 rounded-full border text-xs backdrop-blur-md mx-auto mb-6">
              ScrapHub OSINT
            </div>
            <h1 className={`text-3xl font-semibold mb-4 ${
              isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'
            }`}>Login Required</h1>
            <p className={isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}>
              Please login to create and customize your public profile.
            </p>
            <Link to="/login" className={`mt-8 inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm transition hover:scale-105 ${
              isWhite ? 'border-black/20 bg-black/5 text-black hover:bg-black/10' :
              isLight ? 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200' :
              'border-white/20 bg-white/5 text-white hover:bg-white/10'
            }`}>
              Go to Login <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.arrow}</svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full overflow-hidden transition-all duration-300 ${
      isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'
    }`}>
      {/* GRILLE ANIMEE comme SettingsPage */}
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage: `
            linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* VIGNETTE */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />

      {/* CONTENT */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* HEADER avec retour */}
        <div className="mb-10">
          <Link to="/" className={`group inline-flex items-center gap-2 transition text-sm mb-6 ${
            isWhite ? 'text-black/50 hover:text-black' : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-white/50 hover:text-white'
          }`}>
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à l'accueil
          </Link>
          <h1 className={`text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent ${
            isWhite ? 'from-black to-black/70' : isLight ? 'from-gray-900 to-gray-600' : 'from-white to-white/50'
          }`}>
            Profil Public
          </h1>
          <p className={`mt-2 text-sm ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
            Personnalisez votre profil avec avatar, fond animé et prévisualisation en direct
          </p>
        </div>

        {/* MESSAGES */}
        {status && (
          <div className={`mb-6 p-4 border rounded-xl text-sm ${
            status.type === 'success'
              ? isWhite ? 'bg-green-50 border-green-200 text-green-700' : isLight ? 'bg-green-50 border-green-200 text-green-700' : 'bg-green-500/10 border-green-500/20 text-green-400'
              : status.type === 'warning'
              ? isWhite ? 'bg-amber-50 border-amber-200 text-amber-800' : isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : isWhite ? 'bg-red-50 border-red-200 text-red-700' : isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {status.message}
            {uploadProgress != null && (
              <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${isWhite || isLight ? 'bg-black/10' : 'bg-white/10'}`}>
                <div
                  className="h-full rounded-full bg-current transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* PARTIE GAUCHE - FORMULAIRES */}
          <div className="lg:w-96 shrink-0 space-y-6">
            {/* Basic Info */}
            <details open={openSections.info} onToggle={(event) => { const isOpen = event.currentTarget.open; setOpenSections((current) => ({ ...current, info: isOpen })); }} className={`group backdrop-blur-xl rounded-2xl border transition-all duration-300 ${
              isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
            }`}>
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.user}</svg>
                Informations
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-white/40 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-4 border-t border-white/10 px-6 pb-6 pt-5">
                <div>
                  <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Nom d'affichage</label>
                  <input
                    value={form.displayName}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none transition ${
                      isWhite ? 'border-black/10 bg-black/5 text-black focus:border-black/30' :
                      isLight ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400' :
                      'border-white/[0.08] bg-white/5 text-white focus:border-white/20'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Username</label>
                  <input
                    value={form.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none transition ${
                      isWhite ? 'border-black/10 bg-black/5 text-black focus:border-black/30' :
                      isLight ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400' :
                      'border-white/[0.08] bg-white/5 text-white focus:border-white/20'
                    }`}
                  />
                  <p className={`text-[10px] mt-1 ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>/u/{previewUsername}</p>
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none transition resize-none ${
                      isWhite ? 'border-black/10 bg-black/5 text-black focus:border-black/30' :
                      isLight ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400' :
                      'border-white/[0.08] bg-white/5 text-white focus:border-white/20'
                    }`}
                    placeholder="Parlez de vous..."
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Site web</label>
                  <input
                    value={form.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none transition ${
                      isWhite ? 'border-black/10 bg-black/5 text-black focus:border-black/30' :
                      isLight ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400' :
                      'border-white/[0.08] bg-white/5 text-white focus:border-white/20'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Localisation</label>
                  <input
                    value={form.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none transition ${
                      isWhite ? 'border-black/10 bg-black/5 text-black focus:border-black/30' :
                      isLight ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400' :
                      'border-white/[0.08] bg-white/5 text-white focus:border-white/20'
                    }`}
                  />
                </div>
              </div>
            </details>

            {/* Customization */}
            <details open={openSections.customization} onToggle={(event) => { const isOpen = event.currentTarget.open; setOpenSections((current) => ({ ...current, customization: isOpen })); }} className={`group backdrop-blur-xl rounded-2xl border transition-all duration-300 ${
              isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
            }`}>
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.brush}</svg>
                Personnalisation
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-white/40 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-4 border-t border-white/10 px-6 pb-6 pt-5">
                <div>
                  <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Avatar</label>
                  <div className="flex gap-3 items-start">
                    <img src={form.avatar || '/pdp.png'} alt="Avatar" className="h-16 w-16 rounded-full border border-white/20 object-cover" />
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'avatar')}
                        disabled={saving}
                        className="w-full text-sm disabled:opacity-50"
                      />
                      <input
                        value={form.avatar}
                        onChange={(e) => handleChange('avatar', e.target.value)}
                        placeholder="Ou URL"
                        className={`w-full mt-2 px-4 py-2 rounded-xl border focus:outline-none transition text-sm ${
                          isWhite ? 'border-black/10 bg-black/5 text-black focus:border-black/30' :
                          isLight ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400' :
                          'border-white/[0.08] bg-white/5 text-white focus:border-white/20'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Type de fond</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange('backgroundType', 'image')}
                      className={`flex-1 py-2 rounded-xl border text-sm transition flex items-center justify-center gap-2 ${
                        form.backgroundType === 'image'
                          ? 'bg-white/20 border-white/40 text-white'
                          : isWhite ? 'border-black/10 hover:bg-black/5 text-black/60' : isLight ? 'border-gray-200 hover:bg-gray-100 text-gray-600' : 'border-white/[0.08] hover:bg-white/5 text-white/60'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.video}</svg>
                        Image
                      </button>
                    <button
                      type="button"
                      onClick={() => handleChange('backgroundType', 'video')}
                      className={`flex-1 py-2 rounded-xl border text-sm transition flex items-center justify-center gap-2 ${
                        form.backgroundType === 'video'
                          ? 'bg-white/20 border-white/40 text-white'
                          : isWhite ? 'border-black/10 hover:bg-black/5 text-black/60' : isLight ? 'border-gray-200 hover:bg-gray-100 text-gray-600' : 'border-white/[0.08] hover:bg-white/5 text-white/60'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.music}</svg>
                        Vidéo
                      </button>
                    <button
                      type="button"
                      onClick={() => handleChange('backgroundType', 'gradient')}
                      className={`flex-1 py-2 rounded-xl border text-sm transition flex items-center justify-center gap-2 ${
                        form.backgroundType === 'gradient'
                          ? 'bg-white/20 border-white/40 text-white'
                          : isWhite ? 'border-black/10 hover:bg-black/5 text-black/60' : isLight ? 'border-gray-200 hover:bg-gray-100 text-gray-600' : 'border-white/[0.08] hover:bg-white/5 text-white/60'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.brush}</svg>
                        Dégradé
                      </button>
                  </div>
                </div>

                {form.backgroundType === 'gradient' && (
                  <div>
                    <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Dégradé</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.keys(gradientPresets).map((preset) => (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => handleChange('backgroundPreset', preset)}
                          className={`h-12 rounded-xl border-2 transition ${
                            form.backgroundPreset === preset ? 'border-white scale-105' : 'border-transparent'
                          }`}
                          style={{ background: gradientPresets[preset] }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(form.backgroundType === 'image' || form.backgroundType === 'video') && (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Téléverser depuis PC</label>
                      <input
                        type="file"
                        accept={form.backgroundType === 'video' ? 'video/*' : 'image/*'}
                        onChange={(e) => handleFileUpload(e, 'backgroundUrl')}
                        disabled={saving}
                        className="w-full text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Ou URL média</label>
                      <input
                        value={form.backgroundUrl}
                        onChange={(e) => handleChange('backgroundUrl', e.target.value)}
                        placeholder={form.backgroundType === 'video' ? 'URL vidéo YouTube/Vimeo' : 'URL image'}
                        className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none transition ${
                          isWhite ? 'border-black/10 bg-black/5 text-black focus:border-black/30' :
                          isLight ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400' :
                          'border-white/[0.08] bg-white/5 text-white focus:border-white/20'
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Animation</label>
                    <select
                      value={form.profileAnimation}
                      onChange={(e) => handleChange('profileAnimation', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border focus:outline-none text-sm ${
                        isWhite ? 'border-black/10 bg-black/5 text-black' :
                        isLight ? 'border-gray-200 bg-gray-100 text-gray-900' :
                        'border-white/[0.08] bg-white/5 text-white'
                      }`}>
                      <option value="none">Aucune</option>
                      <option value="glow">Lueur</option>
                      <option value="pulse">Pulsation</option>
                      <option value="float">Flottant</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Thème carte</label>
                    <select
                      value={form.profileTheme}
                      onChange={(e) => handleChange('profileTheme', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border focus:outline-none text-sm ${
                        isWhite ? 'border-black/10 bg-black/5 text-black' :
                        isLight ? 'border-gray-200 bg-gray-100 text-gray-900' :
                        'border-white/[0.08] bg-white/5 text-white'
                      }`}>
                      <option value="dark">Sombre</option>
                      <option value="light">Clair</option>
                      <option value="glass">Glassmorphism</option>
                    </select>
                  </div>
                </div>
              </div>
            </details>

            {/* Badges */}
            <div className={`backdrop-blur-xl rounded-2xl border p-6 transition-all duration-300 ${
              isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
            }`}>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">Badges du profil</h2>
              <p className={`mb-5 text-sm ${isWhite ? 'text-black/50' : isLight ? 'text-gray-500' : 'text-white/50'}`}>
                Selectionne les badges que tu veux afficher sur ta page publique.
              </p>
              <div className="mb-5 grid gap-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/5 p-3">
                  <p className="mb-2 text-xs text-white/60">Badge Verified : confirme ton email</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={requestVerifiedBadge} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20">Envoyer le code</button>
                    <input value={badgeCode} onChange={(e) => setBadgeCode(e.target.value)} placeholder="Code" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
                    <button type="button" onClick={confirmVerifiedBadge} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20">Valider</button>
                  </div>
                </div>
              </div>
              {badgeActionStatus && <p className="mb-4 text-sm text-red-300">{badgeActionStatus}</p>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {badgeOptions.map((badge) => {
                  const selected = form.badges.includes(badge.id);
                  const available = isBadgeAvailable(badge.id);
                  return (
                    <button
                      type="button"
                      key={badge.id}
                      disabled={!available}
                      onClick={() => handleChange('badges', selected ? form.badges.filter((id) => id !== badge.id) : [...form.badges, badge.id])}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-red-400/70 bg-red-500/10' : isWhite ? 'border-black/10 bg-black/5 hover:bg-black/10' : 'border-white/[0.08] bg-white/5 hover:bg-white/10'} ${!available ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      <img src={badge.image} alt="" className="h-10 w-10 object-contain" />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-medium ${isWhite || isLight ? 'text-gray-900' : 'text-white'}`}>{badge.label}</span>
                        <span className={`block text-xs ${isWhite || isLight ? 'text-gray-500' : 'text-white/45'}`}>{badge.requirement}</span>
                      </span>
                      <input type="checkbox" checked={selected} onChange={() => {}} aria-label={`Afficher ${badge.label}`} className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Public Options */}
            <div className={`backdrop-blur-xl rounded-2xl border p-6 transition-all duration-300 ${
              isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
            }`}>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.globe}</svg>
                Visibilité
              </h2>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer ${
                  isWhite ? 'border-black/10 bg-black/5' : isLight ? 'border-gray-200 bg-gray-100' : 'border-white/[0.08] bg-white/5'
                }`}>
                  <input
                    type="checkbox"
                    checked={form.showEmail}
                    onChange={(e) => handleChange('showEmail', e.target.checked)}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  <span className={`text-sm ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'}`}>Afficher mon email publiquement</span>
                </label>
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer ${
                  isWhite ? 'border-black/10 bg-black/5' : isLight ? 'border-gray-200 bg-gray-100' : 'border-white/[0.08] bg-white/5'
                }`}>
                  <input
                    type="checkbox"
                    checked={form.showLocation}
                    onChange={(e) => handleChange('showLocation', e.target.checked)}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  <span className={`text-sm ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'}`}>Afficher ma localisation</span>
                </label>
                <div>
                  <label className={`block text-sm mb-1 ${isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'}`}>Visibilité du profil</label>
                  <select
                    value={form.profileVisibility}
                    onChange={(e) => handleChange('profileVisibility', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none transition ${
                      isWhite ? 'border-black/10 bg-black/5 text-black' :
                      isLight ? 'border-gray-200 bg-gray-100 text-gray-900' :
                      'border-white/[0.08] bg-white/5 text-white'
                    }`}>
                    <option value="public">Public</option>
                    <option value="private">Privé (seulement vous)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Spotify Integration */}
            <div className={`backdrop-blur-xl rounded-2xl border p-6 transition-all duration-300 ${
              isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
            }`}>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.music}</svg>
                Spotify
              </h2>
              {!spotifyConnected ? (
                <button
                  onClick={handleConnectSpotify}
                  className={`w-full py-3 px-4 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                    isWhite ? 'bg-green-500/20 hover:bg-green-500/30 text-green-700 border border-green-300/50' :
                    isLight ? 'bg-green-500/20 hover:bg-green-500/30 text-green-700 border border-green-300/50' :
                    'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.986-8.159-2.566-12.102-1.402-.479.106-1.019-.209-1.125-.686-.289-.479.21-1.019.686-1.125 4.562-1.314 9.901-.686 13.56 1.639.42.239.479.841.301 1.259zm.12-3.36C15.24 9.3 8.849 8.951 5.051 10.234c-.525.161-1.125-.276-1.266-.847-.12-.556.276-1.126.847-1.266 4.686-1.466 11.54-1.087 15.902 1.804.525.315.684 1.165.315 1.688-.364.524-1.166.684-1.688.315z"/>
                  </svg>
                  Connecter Spotify
                </button>
              ) : (
                <div className="space-y-3">
                  <div className={`rounded-xl border p-4 flex items-center gap-3 ${
                    isWhite ? 'border-green-300/50 bg-green-50/50' :
                    isLight ? 'border-green-300/50 bg-green-50/50' :
                    'border-green-500/30 bg-green-500/10'
                  }`}>
                    {spotifyUser?.avatar && (
                      <img src={spotifyUser.avatar} alt="Spotify" className="w-12 h-12 rounded-full" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'}`}>
                        Connecté à Spotify
                      </p>
                      <p className={`text-xs ${isWhite ? 'text-black/50' : isLight ? 'text-gray-500' : 'text-white/50'}`}>
                        {spotifyUser?.displayName}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <label className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer ${
                    isWhite ? 'border-black/10 bg-black/5' : isLight ? 'border-gray-200 bg-gray-100' : 'border-white/[0.08] bg-white/5'
                  }`}>
                    <input
                      type="checkbox"
                      checked={showSpotify}
                      onChange={handleToggleSpotifyVisibility}
                      className="h-4 w-4 rounded border-white/20"
                    />
                    <span className={`text-sm ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'}`}>
                      Afficher la musique en écoute sur mon profil
                    </span>
                  </label>
                  <button
                    onClick={handleDisconnectSpotify}
                    className={`w-full py-2 px-4 rounded-xl transition-all duration-200 text-sm font-medium ${
                      isWhite ? 'bg-red-500/20 hover:bg-red-500/30 text-red-700 border border-red-300/50' :
                      isLight ? 'bg-red-500/20 hover:bg-red-500/30 text-red-700 border border-red-300/50' :
                      'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                    }`}
                  >
                    Déconnecter Spotify
                  </button>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={`w-full py-3 px-4 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                isWhite ? 'bg-black/10 hover:bg-black/20 text-black border border-black/20' :
                isLight ? 'bg-gray-200/50 hover:bg-gray-300/50 text-gray-700 border border-gray-300' :
                'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.save}</svg>
              {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
            </button>
          </div>

          {/* PARTIE DROITE - PREVIEW */}
          <div className="flex-1 space-y-6">
            <div className={`sticky top-24 backdrop-blur-xl rounded-2xl border overflow-hidden transition-all duration-300 ${
              isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
            }`}>
              {/* BANDEAU PREVIEW */}
              <div className="relative h-64 overflow-hidden" style={backgroundStyle}>
                {form.backgroundType === 'video' && form.backgroundUrl && (
                  <video className="absolute inset-0 h-full w-full object-cover" src={form.backgroundUrl} autoPlay muted loop playsInline />
                )}
                <div className="absolute inset-0 bg-black/40" />
                
                {/* CARTE DE PROFIL */}
                <div className="relative z-10 flex h-full items-center justify-center p-6">
                  <div className={`w-full max-w-sm rounded-2xl border p-6 text-center transition-all duration-300
                    ${form.profileTheme === 'light' ? 'bg-white/95 border-gray-200 text-black' : 
                      form.profileTheme === 'glass' ? 'bg-white/10 border-white/20 text-white backdrop-blur-xl' : 
                      'bg-black/95 border-white/10 text-white'}
                    ${form.profileAnimation === 'glow' ? 'shadow-[0_0_45px_rgba(255,255,255,0.1)]' : 
                      form.profileAnimation === 'pulse' ? 'animate-pulse' : 
                      form.profileAnimation === 'float' ? 'transition-all duration-500 hover:-translate-y-2' : ''}`}>
                    <img src={form.avatar || '/pdp.png'} alt="Avatar" className="h-20 w-20 rounded-full border-2 border-white/20 object-cover mx-auto mb-3" />
                    <h3 className="text-xl font-semibold">{form.displayName || 'Nom d\'affichage'}</h3>
                    <p className="text-sm text-gray-400 mb-3">@{previewUsername}</p>
                    <p className="text-sm text-gray-300">{form.bio || 'Ajoutez une bio pour vous présenter.'}</p>
                  </div>
                </div>
              </div>

              {/* INFOS SUPPLEMENTAIRES */}
              <div className="p-5 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-xl border p-3 ${
                    isWhite ? 'border-black/10 bg-black/5' : isLight ? 'border-gray-200 bg-gray-100' : 'border-white/[0.06] bg-white/5'
                  }`}>
                    <p className={`text-xs flex items-center gap-1 ${isWhite ? 'text-black/50' : isLight ? 'text-gray-500' : 'text-white/50'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.globe}</svg>
                      Site web
                    </p>
                    <p className={`mt-1 text-sm truncate ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-gray-300'}`}>
                      {form.website || 'Non renseigné'}
                    </p>
                  </div>
                  <div className={`rounded-xl border p-3 ${
                    isWhite ? 'border-black/10 bg-black/5' : isLight ? 'border-gray-200 bg-gray-100' : 'border-white/[0.06] bg-white/5'
                  }`}>
                    <p className={`text-xs flex items-center gap-1 ${isWhite ? 'text-black/50' : isLight ? 'text-gray-500' : 'text-white/50'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.location}</svg>
                      Localisation
                    </p>
                    <p className={`mt-1 text-sm ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-gray-300'}`}>
                      {form.showLocation && form.location ? form.location : form.showLocation ? 'Non renseignée' : 'Masquée'}
                    </p>
                  </div>
                </div>
                <div className={`rounded-xl border p-3 ${
                  isWhite ? 'border-black/10 bg-black/5' : isLight ? 'border-gray-200 bg-gray-100' : 'border-white/[0.06] bg-white/5'
                }`}>
                  <p className={`flex items-center gap-2 ${isWhite ? 'text-black/50' : isLight ? 'text-gray-500' : 'text-white/50'}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.mail}</svg>
                    Email visible: <span className={`${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'}`}>{form.showEmail ? 'Oui' : 'Non'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* TIPS / INFO */}
            <div className={`backdrop-blur-xl rounded-2xl border p-5 transition-all duration-300 ${
              isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
            }`}>
              <p className={`text-sm font-medium ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-gray-300'}`}>💡 Astuce</p>
              <p className={`mt-1 text-sm ${isWhite ? 'text-black/50' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
                Votre profil public sera disponible à l'adresse <span className={isWhite ? 'text-black font-mono' : isLight ? 'text-gray-900 font-mono' : 'text-white font-mono'}>/u/{previewUsername}</span> 
                lorsque vous le passerez en public.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;