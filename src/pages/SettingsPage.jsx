import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme, isDark, isLight, isWhite } = useTheme();
  const gridRef = useRef(null);
  
  
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  
  const [personalInfo, setPersonalInfo] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
  
  
  const [leakCheckEmail, setLeakCheckEmail] = useState('');
  const [leakCheckUsername, setLeakCheckUsername] = useState('');
  const [leakResults, setLeakResults] = useState(null);
  const [leakLoading, setLeakLoading] = useState(false);
  
  
  const [profile, setProfile] = useState({
    displayName: user?.displayName || user?.name || '',
    bio: user?.bio || '',
    avatarUrl: user?.avatarUrl || '/pdp.png'
  });

  
  const [preferences, setPreferences] = useState({
    theme: theme,
    notifications: {
      email: true,
      push: false,
      marketing: false
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false
    }
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

  
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  
  const handleConnectSpotify = () => {
    
    window.open('https://accounts.spotify.com/authorize?client_id=simulated&response_type=code&redirect_uri=http://localhost:3000/settings', '_blank');
    
    setTimeout(() => {
      setSpotifyConnected(true);
      setSpotifyUser({ display_name: 'Utilisateur Spotify', email: 'user@spotify.com' });
      setSuccessMessage('Compte Spotify connecté avec succès');
    }, 1500);
  };

  const handleDisconnectSpotify = () => {
    setSpotifyConnected(false);
    setSpotifyUser(null);
    setSuccessMessage('Compte Spotify déconnecté');
  };

  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUser(profile);
      setSuccessMessage('Profil mis à jour avec succès');
    } catch (err) {
      setErrorMessage('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  
  const handleUpdatePersonalInfo = async (e) => {
    e.preventDefault();
    if (personalInfo.newPassword && personalInfo.newPassword !== personalInfo.confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      
      setSuccessMessage('Informations mises à jour');
      setPersonalInfo({ ...personalInfo, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setErrorMessage('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  
  const handleLeakCheck = async () => {
    if (!leakCheckEmail && !leakCheckUsername) {
      setErrorMessage('Entrez un email ou un pseudo à vérifier');
      return;
    }
    setLeakLoading(true);
    setLeakResults(null);
    
    try {
      const response = await fetch('/a.txt');
      if (!response.ok) throw new Error('Fichier non trouvé');
      const text = await response.text();
      
      const searchTerm = (leakCheckEmail || leakCheckUsername).toLowerCase();
      const found = text.toLowerCase().includes(searchTerm);
      
      
      const occurrences = text.toLowerCase().split(searchTerm).length - 1;
      
      if (found) {
        setLeakResults({
          found: true,
          term: searchTerm,
          occurrences: occurrences,
          message: `⚠️ Attention : "${searchTerm}" a été trouvé ${occurrences} fois dans les données analysées.`,
          severity: occurrences > 10 ? 'high' : occurrences > 3 ? 'medium' : 'low'
        });
      } else {
        setLeakResults({
          found: false,
          term: searchTerm,
          message: '✅ Aucune fuite détectée. Vous êtes en sécurité.',
          severity: 'safe'
        });
      }
    } catch (error) {
      setLeakResults({
        found: false,
        message: '❌ Impossible de vérifier les fuites pour le moment. Réessayez plus tard.',
        severity: 'error'
      });
    } finally {
      setLeakLoading(false);
    }
  };

  
  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      
      toggleTheme(preferences.theme);
      setSuccessMessage('Préférences mises à jour avec succès');
    } catch (err) {
      setErrorMessage('Erreur lors de la mise à jour des préférences');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'personal', label: 'Infos personnelles', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'connections', label: 'Connexions', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9' },
    { id: 'leak', label: 'Vérification de fuite', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: 'preferences', label: 'Préférences', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div className={`relative min-h-screen w-full overflow-hidden transition-all duration-300 ${
      isWhite ? 'bg-white text-black' : isLight ? 'bg-gray-50 text-gray-900' : 'bg-black text-white'
    }`}>
      {/* GRILLE ANIMEE */}
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />

      {/* CONTENT */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* HEADER */}
        <div className="mb-10">
          <Link to="/" className={`group inline-flex items-center gap-2 transition text-sm mb-6 ${
            isWhite ? 'text-black/50 hover:text-black' :
            isLight ? 'text-gray-600 hover:text-gray-900' :
            'text-white/50 hover:text-white'
          }`}>
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à l'accueil
          </Link>
          <h1 className={`text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent ${
            isWhite ? 'from-black to-black/70' :
            isLight ? 'from-gray-900 to-gray-600' :
            'from-white to-white/50'
          }`}>
            Paramètres
          </h1>
          <p className={`mt-2 text-sm ${
            isWhite ? 'text-black/40' :
            isLight ? 'text-gray-500' :
            'text-white/40'
          }`}>Gérez votre compte et vos préférences</p>
        </div>

        {/* MESSAGES */}
        {successMessage && (
          <div className={`mb-6 p-4 border rounded-xl text-sm ${
            isWhite ? 'bg-green-50 border-green-200 text-green-700' :
            isLight ? 'bg-green-50 border-green-200 text-green-700' :
            'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className={`mb-6 p-4 border rounded-xl text-sm ${
            isWhite ? 'bg-red-50 border-red-200 text-red-700' :
            isLight ? 'bg-red-50 border-red-200 text-red-700' :
            'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* SIDEBAR - NAVIGATION */}
          <div className="lg:w-64 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                    activeSection === section.id
                      ? isWhite ? 'bg-black/10 border border-black/20 text-black' :
                        isLight ? 'bg-gray-200/50 border border-gray-300 text-gray-900' :
                        'bg-white/10 border border-white/15 text-white'
                      : isWhite ? 'text-black/40 hover:text-black hover:bg-black/5' :
                        isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50' :
                        'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={section.icon} />
                  </svg>
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1">
            {/* SECTION PROFIL */}
            {activeSection === 'profile' && (
              <div className={`backdrop-blur-xl rounded-2xl border p-6 md:p-8 transition-all duration-300 ${
                isWhite ? 'bg-white/80 border-black/10' :
                isLight ? 'bg-white/90 border-gray-200' :
                'bg-black/40 border-white/[0.08]'
              }`}>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profil
                </h2>
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className={`flex items-center gap-6 pb-4 border-b ${
                    isWhite ? 'border-black/10' :
                    isLight ? 'border-gray-200' :
                    'border-white/[0.06]'
                  }`}>
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <button
                        type="button"
                        className="px-4 py-2 text-xs rounded-lg border border-white/10 hover:bg-white/5 transition"
                      >
                        Changer l'avatar
                      </button>
                      <p className="text-white/30 text-[10px] mt-2">Format recommandé : carré, min 256x256</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-1">Nom d'affichage</label>
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-1">Bio</label>
                    <textarea
                      rows={3}
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none resize-none"
                      placeholder="Parlez de vous..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition disabled:opacity-50"
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </form>
              </div>
            )}

            {/* SECTION INFOS PERSOS */}
            {activeSection === 'personal' && (
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Informations personnelles
                </h2>
                <form onSubmit={handleUpdatePersonalInfo} className="space-y-5">
                  <div>
                    <label className="block text-white/60 text-sm mb-1">Adresse email</label>
                    <input
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-1">Numéro de téléphone</label>
                    <input
                      type="tel"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                  <div className={`pt-4 border-t ${
                    isWhite ? 'border-black/10' :
                    isLight ? 'border-gray-200' :
                    'border-white/[0.06]'
                  }`}>
                    <h3 className="text-white/80 text-sm font-medium mb-4">Changer de mot de passe</h3>
                    <div className="space-y-4">
                      <input
                        type="password"
                        placeholder="Mot de passe actuel"
                        value={personalInfo.currentPassword}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, currentPassword: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
                      />
                      <input
                        type="password"
                        placeholder="Nouveau mot de passe"
                        value={personalInfo.newPassword}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, newPassword: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
                      />
                      <input
                        type="password"
                        placeholder="Confirmer le nouveau mot de passe"
                        value={personalInfo.confirmPassword}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition disabled:opacity-50"
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </form>
              </div>
            )}

            {/* SECTION CONNEXIONS EXTERNES */}
            {activeSection === 'connections' && (
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9" />
                  </svg>
                  Connexions externes
                </h2>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-xl border bg-white/[0.02] ${
                    isWhite ? 'border-black/10 bg-black/5' :
                    isLight ? 'border-gray-200 bg-gray-50' :
                    'border-white/[0.06] bg-white/[0.02]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#1DB954">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.336-.78.48-1.14.24-3.12-1.92-7.08-2.4-10.5-1.32-.36.12-.78-.12-.9-.48-.12-.36.12-.78.48-.9 3.78-1.2 8.04-.6 11.46 1.38.36.24.48.72.24 1.08zm1.38-3.18c-.3.36-.96.54-1.32.24-3.54-2.16-8.88-2.76-12.96-1.5-.42.12-.9-.12-1.02-.54-.12-.42.12-.9.54-1.02 4.5-1.38 10.2-.78 14.16 1.5.36.24.48.78.24 1.14zm.12-3.3c-4.02-2.4-10.62-2.64-14.4-1.44-.48.18-1.02-.06-1.2-.54-.18-.48.06-1.02.54-1.2 4.2-1.5 11.34-1.2 15.78 1.44.42.24.6.78.36 1.2-.18.42-.66.6-1.08.36z"/>
                      </svg>
                      <div>
                        <p className="font-medium">Spotify</p>
                        <p className="text-white/40 text-xs">
                          {spotifyConnected ? `Connecté en tant que ${spotifyUser?.display_name}` : 'Non connecté'}
                        </p>
                      </div>
                    </div>
                    {spotifyConnected ? (
                      <button
                        onClick={handleDisconnectSpotify}
                        className="px-4 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                      >
                        Déconnecter
                      </button>
                    ) : (
                      <button
                        onClick={handleConnectSpotify}
                        className="px-4 py-1.5 text-xs rounded-lg border border-white/10 hover:bg-white/10 transition"
                      >
                        Connecter
                      </button>
                    )}
                  </div>
                  <p className="text-white/30 text-xs mt-4 text-center">
                    Les connexions externes permettent d'enrichir votre profil et d'activer certaines fonctionnalités.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION VERIFICATION DE FUITE */}
            {activeSection === 'leak' && (
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Vérification de fuite de données
                </h2>
                <p className="text-white/50 text-sm mb-6">
                  ScrapHub analyse sa base de données publique (fuites Discord, breaches) pour vérifier si vos informations ont été compromises.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-1">Email à vérifier</label>
                    <input
                      type="email"
                      value={leakCheckEmail}
                      onChange={(e) => setLeakCheckEmail(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
                      placeholder="exemple@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-1">Pseudo à vérifier</label>
                    <input
                      type="text"
                      value={leakCheckUsername}
                      onChange={(e) => setLeakCheckUsername(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none"
                      placeholder="Votre pseudo Discord"
                    />
                  </div>
                  <button
                    onClick={handleLeakCheck}
                    disabled={leakLoading}
                    className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {leakLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyse en cours...
                      </>
                    ) : (
                      'Vérifier les fuites'
                    )}
                  </button>
                </div>

                {/* RÉSULTATS DE LA RECHERCHE */}
                {leakResults && (
                  <div className={`mt-6 p-4 rounded-xl border ${
                    leakResults.severity === 'safe' ? 'bg-green-500/5 border-green-500/20' :
                    leakResults.severity === 'low' ? 'bg-yellow-500/5 border-yellow-500/20' :
                    leakResults.severity === 'medium' ? 'bg-orange-500/5 border-orange-500/20' :
                    leakResults.severity === 'high' ? 'bg-red-500/5 border-red-500/20' :
                    'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-start gap-3">
                      <svg className={`w-5 h-5 mt-0.5 ${
                        leakResults.severity === 'safe' ? 'text-green-400' :
                        leakResults.found ? 'text-red-400' : 'text-white/40'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {leakResults.severity === 'safe' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        )}
                      </svg>
                      <div>
                        <p className={`text-sm ${
                          leakResults.severity === 'safe' ? 'text-green-400' :
                          leakResults.found ? 'text-red-400' : 'text-white/60'
                        }`}>
                          {leakResults.message}
                        </p>
                        {leakResults.found && leakResults.occurrences && (
                          <p className="text-white/40 text-xs mt-2">
                            Nombre d'occurrences trouvées : {leakResults.occurrences}
                            <br />
                            {leakResults.severity === 'high' && '⚠️ Nous vous recommandons de changer immédiatement vos mots de passe.'}
                            {leakResults.severity === 'medium' && '🔸 Surveillez vos comptes et activez la double authentification.'}
                            {leakResults.severity === 'low' && '🔹 Restez vigilant, mais aucun danger immédiat.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <p className="text-white/30 text-[10px] font-mono text-center">
                    ScrapHub analyse un corpus de données publiques (fuites, breaches, forums). Aucune donnée personnelle n'est stockée.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION PREFERENCES */}
            {activeSection === 'preferences' && (
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z" />
                  </svg>
                  Préférences
                </h2>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06]">
                    <div>
                      <p className="text-sm">Notifications par email</p>
                      <p className="text-white/40 text-xs">Recevoir des alertes en cas de fuite détectée</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/30"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06]">
                    <div>
                      <p className="text-sm">Mode sombre forcé</p>
                      <p className="text-white/40 text-xs">Désactiver le thème clair (toujours sombre)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked disabled />
                      <div className="w-11 h-6 bg-white/30 rounded-full opacity-50"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06]">
                    <div>
                      <p className="text-sm">Langue</p>
                      <p className="text-white/40 text-xs">Français (par défaut)</p>
                    </div>
                    <select className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs">
                      <option>Français</option>
                      <option>English</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* PREFERENCES */}
            {activeSection === 'preferences' && (
              <div className={`backdrop-blur-xl rounded-2xl border p-6 md:p-8 transition-all duration-300 ${
                isWhite ? 'bg-white/80 border-black/10' :
                isLight ? 'bg-white/90 border-gray-200' :
                'bg-black/40 border-white/[0.08]'
              }`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Préférences</h3>
                    <p className="text-white/60 text-sm">Personnalisez votre expérience</p>
                  </div>
                </div>

                <form onSubmit={handleUpdatePreferences} className="space-y-6">
                  {/* THÈME */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white/80">Thème</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, theme: 'dark' }))}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                          preferences.theme === 'dark'
                            ? isWhite ? 'border-black bg-black/10' :
                              isLight ? 'border-gray-800 bg-gray-800/10' :
                              'border-white bg-white/10'
                            : isWhite ? 'border-black/10 bg-black/5 hover:bg-black/10' :
                              isLight ? 'border-gray-300 bg-gray-100/50 hover:bg-gray-200/50' :
                              'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-700"></div>
                          <span className="text-xs font-medium">Sombre</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, theme: 'light' }))}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                          preferences.theme === 'light'
                            ? isWhite ? 'border-black bg-black/10' :
                              isLight ? 'border-gray-800 bg-gray-800/10' :
                              'border-white bg-white/10'
                            : isWhite ? 'border-black/10 bg-black/5 hover:bg-black/10' :
                              isLight ? 'border-gray-300 bg-gray-100/50 hover:bg-gray-200/50' :
                              'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300"></div>
                          <span className="text-xs font-medium">Clair</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, theme: 'white' }))}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                          preferences.theme === 'white'
                            ? isWhite ? 'border-black bg-black/10' :
                              isLight ? 'border-gray-800 bg-gray-800/10' :
                              'border-white bg-white/10'
                            : isWhite ? 'border-black/10 bg-black/5 hover:bg-black/10' :
                              isLight ? 'border-gray-300 bg-gray-100/50 hover:bg-gray-200/50' :
                              'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white via-white to-gray-50 border-2 border-white shadow-lg"></div>
                          <span className="text-xs font-medium">Blanc Brillant</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* NOTIFICATIONS */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white/80">Notifications</h4>
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${
                        isWhite ? 'border-black/10' :
                        isLight ? 'border-gray-200' :
                        'border-white/[0.06]'
                      }`}>
                        <div>
                          <p className="text-sm">Notifications par email</p>
                          <p className={`text-xs ${
                            isWhite ? 'text-black/40' :
                            isLight ? 'text-gray-500' :
                            'text-white/40'
                          }`}>Recevoir des alertes en cas de fuite détectée</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences.notifications.email}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, email: e.target.checked }
                            }))}
                          />
                          <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                            isWhite ? 'bg-black/20 peer-checked:bg-black/40' :
                            isLight ? 'bg-gray-300 peer-checked:bg-gray-600' :
                            'bg-white/10 peer-checked:bg-white/30'
                          }`}></div>
                        </label>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${
                        isWhite ? 'border-black/10' :
                        isLight ? 'border-gray-200' :
                        'border-white/[0.06]'
                      }`}>
                        <div>
                          <p className="text-sm">Notifications push</p>
                          <p className={`text-xs ${
                            isWhite ? 'text-black/40' :
                            isLight ? 'text-gray-500' :
                            'text-white/40'
                          }`}>Notifications dans le navigateur</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences.notifications.push}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, push: e.target.checked }
                            }))}
                          />
                          <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/30"></div>
                        </label>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${
                        isWhite ? 'border-black/10' :
                        isLight ? 'border-gray-200' :
                        'border-white/[0.06]'
                      }`}>
                        <div>
                          <p className="text-sm">Emails marketing</p>
                          <p className={`text-xs ${
                            isWhite ? 'text-black/40' :
                            isLight ? 'text-gray-500' :
                            'text-white/40'
                          }`}>Nouvelles fonctionnalités et offres</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences.notifications.marketing}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, marketing: e.target.checked }
                            }))}
                          />
                          <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/30"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* PRIVACY */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white/80">Confidentialité</h4>
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${
                        isWhite ? 'border-black/10' :
                        isLight ? 'border-gray-200' :
                        'border-white/[0.06]'
                      }`}>
                        <div>
                          <p className="text-sm">Visibilité du profil</p>
                          <p className={`text-xs ${
                            isWhite ? 'text-black/40' :
                            isLight ? 'text-gray-500' :
                            'text-white/40'
                          }`}>Qui peut voir votre profil</p>
                        </div>
                        <select
                          value={preferences.privacy.profileVisibility}
                          onChange={(e) => setPreferences(prev => ({
                            ...prev,
                            privacy: { ...prev.privacy, profileVisibility: e.target.value }
                          }))}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                        >
                          <option value="public">Public</option>
                          <option value="friends">Amis seulement</option>
                          <option value="private">Privé</option>
                        </select>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${
                        isWhite ? 'border-black/10' :
                        isLight ? 'border-gray-200' :
                        'border-white/[0.06]'
                      }`}>
                        <div>
                          <p className="text-sm">Afficher l'email</p>
                          <p className={`text-xs ${
                            isWhite ? 'text-black/40' :
                            isLight ? 'text-gray-500' :
                            'text-white/40'
                          }`}>Montrer votre email sur le profil</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences.privacy.showEmail}
                            onChange={(e) => setPreferences(prev => ({
                              ...prev,
                              privacy: { ...prev.privacy, showEmail: e.target.checked }
                            }))}
                          />
                          <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/30"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl transition-all duration-200 font-medium ${
                      isWhite ? 'bg-black/10 hover:bg-black/20 text-black border border-black/20 disabled:opacity-50' :
                      isLight ? 'bg-gray-200/50 hover:bg-gray-300/50 text-gray-700 border border-gray-300 disabled:opacity-50' :
                      'bg-white/10 hover:bg-white/20 text-white border border-white/20 disabled:opacity-50'
                    }`}
                  >
                    {loading ? 'Sauvegarde...' : 'Sauvegarder les préférences'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;