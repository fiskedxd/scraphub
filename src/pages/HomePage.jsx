import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const HomePage = () => {
  const { user, logout } = useAuth();
  const { theme, isDark, isLight, isWhite } = useTheme();
  const isLoggedIn = Boolean(user?.email || user?.id);
  const gridRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startX, setStartX] = useState(0);
  const notificationStackRef = useRef(null);
  const contextMenuRef = useRef(null);
  const homeRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInviteInfo, setShowInviteInfo] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const navigate = useNavigate();

  
  const notifications = [
    {
      id: 1,
      title: "Rejoins le serveur Scraphub",
      description: "Retrouve la communauté, les annonces et les événements Scraphub.",
      invite: true,
      icon: (
        <img src="https://cdn.discordapp.com/icons/1523797318376231022/f62ebb8a79a3832c01bb859fdcc33237.webp?size=80" alt="Scraphub" className="h-10 w-10 rounded-full object-cover" />
      )
    }
  ];

  
  useEffect(() => {
    const handleMove = (e) => {
      if (!gridRef.current) return;
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      gridRef.current.style.backgroundPosition = `${x}% ${y}%`;
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationStackRef.current && !notificationStackRef.current.contains(event.target)) {
        setIsExpanded(false);
        setDragOffset(0);
        setCurrentIndex(0);
      }
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ visible: false, x: 0, y: 0 });
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setContextMenu({ visible: false, x: 0, y: 0 });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu.visible]);

  
  const handleDragStart = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartX(e.clientX);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const deltaX = Math.abs(e.clientX - startX);
    
    
    if (deltaX > 10) return;
    
    
    if (deltaY < -40 && currentIndex < notifications.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsDragging(false);
      setDragOffset(0);
      setIsExpanded(true);
    }
    
    else if (deltaY > 40 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsDragging(false);
      setDragOffset(0);
      setIsExpanded(true);
    }
    else if (deltaY < 0) {
      setDragOffset(deltaY / 2);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOffset(0);
  };

  
  const handleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleChillSearchSelect = () => {
    closeContextMenu();
    navigate('/chill');
  };

  
  if (!isLoggedIn) {
    return (
      <div ref={homeRef} onContextMenu={handleContextMenu} className={`relative min-h-screen w-full overflow-hidden transition-all duration-300 ${
        isWhite ? 'bg-white text-black' : isLight ? 'bg-gray-50 text-gray-900' : 'bg-black text-white'
      }`}>
        {contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 min-w-[180px] overflow-hidden rounded-xl border border-white/20 bg-slate-950/95 shadow-2xl backdrop-blur-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleChillSearchSelect}
              className="w-full px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
            >
              Chill Search
            </button>
          </div>
        )}
        <div ref={gridRef} className="absolute inset-0 opacity-[0.25]" style={{
          backgroundImage: `
            linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'} 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />
        <div className={`absolute inset-0 bg-gradient-to-b ${
          isWhite ? 'from-white/80 via-white/60 to-white/95' :
          isLight ? 'from-gray-50/80 via-gray-50/60 to-gray-50/95' :
          'from-black/60 via-black/40 to-black/90'
        }`} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 min-h-screen flex flex-col justify-center">
          <div className="mx-auto flex flex-col gap-10 lg:gap-16">
            <div className="inline-flex px-4 py-1.5 rounded-full border border-white/10 text-xs text-white/50 backdrop-blur-md mx-auto">
              Official ScrapHub Osint Platform
            </div>
            <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
              <div className="lg:w-1/2 max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
                <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight">ScrapHub</h1>
                <p className="text-white/30 mt-6 text-sm sm:text-base max-w-xl mx-auto lg:mx-0">
                  Détection de violations de données, fuites et menaces en temps réel.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center lg:justify-start">
                  <Link to="/login" className={`px-8 py-3 rounded-full border transition-all duration-200 text-center ${
                    isWhite ? 'border-black/20 bg-black/5 text-black hover:bg-black/10' :
                    isLight ? 'border-gray-300/30 bg-gray-200/20 text-gray-700 hover:bg-gray-300/30' :
                    'border-white/20 bg-white/5 text-white hover:bg-white/10'
                  }`}>Connexion</Link>
                  <Link to="/register" className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 text-center ${
                    isWhite ? 'bg-black text-white hover:bg-gray-900' :
                    isLight ? 'bg-gray-800 text-white hover:bg-gray-900' :
                    'bg-white text-black hover:bg-white/90'
                  }`}>Inscription</Link>
                </div>
              </div>
              <div className="lg:w-[420px] w-full mx-auto space-y-6">
                <div className="w-full rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-xl p-6">
                  <div className="flex gap-2 mb-4 justify-center">
                    <div className="w-2 h-2 bg-white/40 rounded-full" />
                    <div className="w-2 h-2 bg-white/40 rounded-full" />
                    <div className="w-2 h-2 bg-white/40 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="text-white text-sm font-semibold">discord</div>
                      <div className="text-white/40 text-xs uppercase tracking-wide">dm</div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">300k mp</div>
                    </div>
                    <div className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="text-white text-sm font-semibold">discord</div>
                      <div className="text-white/40 text-xs uppercase tracking-wide">server</div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">800k server</div>
                    </div>
                    <div className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="text-white text-sm font-semibold">data</div>
                      <div className="text-white/40 text-xs uppercase tracking-wide">leak</div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">50To data leak</div>
                    </div>
                    <div className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="text-white text-sm font-semibold">public</div>
                      <div className="text-white/40 text-xs uppercase tracking-wide">data</div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">1To public data</div>
                    </div>
                  </div>
                </div>
                <div className="flex rounded-full overflow-hidden border border-white/[0.08] bg-black/40 backdrop-blur-xl">
                  <input className="flex-1 px-5 py-3 bg-transparent outline-none text-white placeholder-white/20 text-sm cursor-not-allowed opacity-70" placeholder="Login / Register" disabled />
                  <button className="px-5 bg-white/5 text-white/30 font-semibold text-sm cursor-not-allowed" disabled>Rechercher</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentNotification = notifications[currentIndex];
  const remainingNotifications = notifications.slice(currentIndex + 1);

  return (
    <div ref={homeRef} onContextMenu={handleContextMenu} className={`relative min-h-screen w-full overflow-hidden transition-all duration-300 ${
      isWhite ? 'bg-white text-black' : isLight ? 'bg-gray-50 text-gray-900' : 'bg-black text-white'
    }`}>
      {/* GRILLE */}
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: `
            linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'} 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* VIGNETTE */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[180px] overflow-hidden rounded-xl border border-white/20 bg-slate-950/95 shadow-2xl backdrop-blur-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleChillSearchSelect}
            className="w-full px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
          >
            Chill Search
          </button>
        </div>
      )}
      <div className={`absolute inset-0 bg-gradient-to-b ${
        isWhite ? 'from-white/80 via-white/60 to-white/95' :
        isLight ? 'from-gray-50/80 via-gray-50/60 to-gray-50/95' :
        'from-black/60 via-black/40 to-black/90'
      }`} />

      {/* NOTIFICATION STACK - STYLE APPLE (UNIQUEMENT SI CONNECTÉ) */}
      <div 
        ref={notificationStackRef}
        className="fixed top-12 left-6 z-50"
        style={{ width: "360px" }}
      >
        <div 
          className="relative cursor-pointer select-none"
          onClick={handleClick}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          
          {/* Notifications empilées derrière (style Apple) */}
          {remainingNotifications.map((notif, idx) => {
            const scale = 1 - (idx + 1) * 0.05;
            const translateY = (idx + 1) * 12;
            return (
              <div
                key={notif.id}
                className="absolute left-0 right-0 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl overflow-hidden transition-all duration-200"
                style={{
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  zIndex: -idx,
                  opacity: 0.7 - idx * 0.15,
                }}
              >
                <div className="h-20" />
              </div>
            );
          })}

          {/* Notification principale */}
          <div 
            className={`relative rounded-2xl border border-white/15 bg-black/90 backdrop-blur-xl overflow-hidden transition-all duration-200 ${
              isDragging ? 'cursor-grabbing' : 'cursor-pointer'
            }`}
            style={{
              transform: isDragging ? `translateY(${dragOffset}px)` : 'translateY(0)'
            }}
          >
            {/* Indicateur de pile (les petits points Apple) */}
            {notifications.length > 1 && !isExpanded && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {notifications.map((_, i) => (
                  <div 
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentIndex 
                        ? 'bg-white w-4 h-1.5' 
                        : 'bg-white/30 w-1.5 h-1.5'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Contenu - invitation Discord */}
            <div className="">
              {currentNotification.invite && (
                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black shadow-[0_8px_32px_rgba(0,0,0,0.8)] transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_8px_40px_rgba(0,0,0,0.9)]">
                  {/* Bannière subtile */}
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.04] to-transparent" />
                  
                  {/* Contenu principal */}
                  <div className="relative flex items-center gap-3 px-4 pt-4 pb-2">
                    <div className="relative">
                      <img 
                        src="https://cdn.discordapp.com/icons/1523797318376231022/f62ebb8a79a3832c01bb859fdcc33237.webp?size=80" 
                        alt="Scraphub" 
                        className="h-12 w-12 rounded-xl border border-white/10 object-cover shadow-lg"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black bg-emerald-400/90" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-white">Scraphub</span>
                        <svg className="h-3.5 w-3.5 shrink-0 text-indigo-400/80" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/40">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
                          11 en ligne
                        </span>
                        <span>•</span>
                        <span>201 membres</span>
                      </div>
                    </div>
                  </div>
              
                  {/* Actions */}
                  <div className="relative flex gap-2 px-4 pb-4">
                    <a 
                      href="https://discord.gg/Eq6vbubsMA" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex-1 rounded-xl bg-white px-3 py-2 text-center text-xs font-medium text-black transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
                    >
                      Rejoindre
                    </a>
                    <button 
                      type="button" 
                      aria-label="Informations sur le serveur" 
                      onClick={(event) => { event.stopPropagation(); setShowInviteInfo((value) => !value); }} 
                      className={`rounded-xl border px-3 py-2 text-xs transition-all duration-200 active:scale-[0.98] ${
                        showInviteInfo 
                          ? 'border-white/25 bg-white/10 text-white' 
                          : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white/90'
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                    
                  {/* Info dépliante */}
                  {showInviteInfo && (
                    <div className="relative border-t border-white/[0.06] px-4 py-3 text-[11px] leading-relaxed text-white/50 bg-white/[0.02]">
                      <div className="flex items-start gap-2">
                        <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Des plans Pro peuvent être gagnés gratuitement lors des événements et annonces de la communauté.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Effet de brillance au survol */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.03] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Ombre portée pour effet de profondeur */}
          <div className="absolute -bottom-2 left-2 right-2 h-3 bg-black/50 rounded-b-2xl blur-md -z-10" />
        </div>
      </div>

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 min-h-screen flex flex-col justify-center">
        <div className="mx-auto flex flex-col gap-10 lg:gap-16">

          <div className="inline-flex px-4 py-1.5 rounded-full border border-white/10 text-xs text-white/50 backdrop-blur-md mx-auto">
            Official ScrapHub Osint Platform
          </div>

          <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
            {/* SECTION GAUCHE */}
            <div className="lg:w-1/2 max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
              <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight">
                ScrapHub
              </h1>
              <p className="text-white/30 mt-6 text-sm sm:text-base max-w-xl mx-auto lg:mx-0">
                Détection de violations de données, fuites et menaces en temps réel.
              </p>

              <div className="mt-10 space-y-4 text-center lg:text-left">
                <div className={`inline-flex items-center gap-3 rounded-full border ${
                  isWhite ? 'border-black/10 bg-black/5 text-black/80' :
                  isLight ? 'border-gray-300/20 bg-gray-200/10 text-gray-700' :
                  'border-white/10 bg-white/5 text-white/80'
                } px-5 py-3 text-sm backdrop-blur-md`}>
                  <span>Bienvenue, {user.name || user.email}</span>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                  <Link to="/profile" className={`px-6 py-3 rounded-full border transition-all duration-200 ${
                    isWhite ? 'border-black/20 bg-black/5 text-black hover:bg-black/10' :
                    isLight ? 'border-gray-300/30 bg-gray-200/20 text-gray-700 hover:bg-gray-300/30' :
                    'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  }`}>Profil</Link>
                  <Link to="/search" className={`px-6 py-3 rounded-full border transition-all duration-200 ${
                    isWhite ? 'border-black/20 bg-black/5 text-black hover:bg-black/10' :
                    isLight ? 'border-gray-300/30 bg-gray-200/20 text-gray-700 hover:bg-gray-300/30' :
                    'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  }`}>Recherche</Link>
                  <Link to="/settings" className={`px-6 py-3 rounded-full border transition-all duration-200 ${
                    isWhite ? 'border-black/20 bg-black/5 text-black hover:bg-black/10' :
                    isLight ? 'border-gray-300/30 bg-gray-200/20 text-gray-700 hover:bg-gray-300/30' :
                    'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  }`}>Paramètres</Link>
                  <button onClick={logout} className={`px-6 py-3 rounded-full border transition-all duration-200 ${
                    isWhite ? 'border-red-500/30 bg-red-50/20 text-red-600 hover:bg-red-100/30' :
                    isLight ? 'border-red-400/30 bg-red-50/30 text-red-600 hover:bg-red-100/40' :
                    'border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                  }`}>Déconnexion</button>
                </div>
              </div>
            </div>

            {/* SECTION DROITE */}
            <div className="lg:w-[420px] w-full mx-auto space-y-6">
              <div className="w-full rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-xl p-6">
                <div className="flex gap-2 mb-4 justify-center">
                  <div className="w-2 h-2 bg-white/40 rounded-full" />
                  <div className="w-2 h-2 bg-white/40 rounded-full" />
                  <div className="w-2 h-2 bg-white/40 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="text-white text-sm font-semibold">discord</div>
                    <div className="text-white/40 text-xs uppercase tracking-wide">dm</div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">300k mp</div>
                  </div>
                  <div className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="text-white text-sm font-semibold">discord</div>
                    <div className="text-white/40 text-xs uppercase tracking-wide">server</div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">800k server</div>
                  </div>
                  <div className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="text-white text-sm font-semibold">data</div>
                    <div className="text-white/40 text-xs uppercase tracking-wide">leak</div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">50To data leak</div>
                  </div>
                  <div className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="text-white text-sm font-semibold">public</div>
                    <div className="text-white/40 text-xs uppercase tracking-wide">data</div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">1To public data</div>
                  </div>
                </div>
              </div>

              <div className="w-full">
                <div className="grid gap-3">
                  <Link to="/search" className="block rounded-2xl border border-white/[0.08] bg-white/5 px-4 py-3 text-center text-white hover:border-white/20 hover:bg-white/10 transition">Aller à la recherche</Link>
                  <Link to="/profile" className="block rounded-2xl border border-white/[0.08] bg-white/5 px-4 py-3 text-center text-white hover:border-white/20 hover:bg-white/10 transition">Voir mon profil</Link>
                  <Link to="/settings" className="block rounded-2xl border border-white/[0.08] bg-white/5 px-4 py-3 text-center text-white hover:border-white/20 hover:bg-white/10 transition">Paramètres</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;