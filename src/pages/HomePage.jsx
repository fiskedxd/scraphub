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
            <div className="p-2">
              {currentNotification.invite && (
                <div className="overflow-hidden rounded-[18px] border border-white/15 bg-black shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                  <div className="relative h-24 overflow-hidden bg-black">
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1),transparent_42%,rgba(255,255,255,0.035))]" />
                    <div className="absolute -right-12 -top-20 h-48 w-48 rounded-full border border-white/[0.08]" />
                    <div className="absolute -right-3 -top-11 h-32 w-32 rounded-full border border-white/[0.06]" />
                    <div className="absolute bottom-3 left-4 text-[10px] font-medium uppercase tracking-[0.24em] text-white/40">Discord community</div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="-mt-9 flex items-end justify-between gap-3">
                      <img src="https://cdn.discordapp.com/icons/1523797318376231022/f62ebb8a79a3832c01bb859fdcc33237.webp?size=128" alt="Scraphub" className="h-[72px] w-[72px] rounded-[20px] border-[5px] border-black bg-black object-cover shadow-xl" />
                      <span className="mb-2 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/55">Invitation</span>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-lg font-semibold tracking-tight text-white">Scraphub</h3>
                      <p className="mt-1 text-xs leading-relaxed text-white/45">Rejoins la communauté, les annonces et les événements privés.</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
                        <div className="text-sm font-semibold text-white">11</div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/35">En ligne</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
                        <div className="text-sm font-semibold text-white">201</div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/35">Membres</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <a href="https://discord.gg/Eq6vbubsMA" target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-xl bg-white px-3 py-3 text-xs font-semibold text-black transition hover:bg-white/80">Rejoindre le serveur</a>
                      <button type="button" aria-label="Informations sur le serveur" onClick={(event) => { event.stopPropagation(); setShowInviteInfo((value) => !value); }} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-xs font-semibold text-white/70 transition hover:bg-white/10">i</button>
                    </div>
                  </div>
                  {showInviteInfo && (
                    <div className="border-t border-white/10 bg-white/[0.025] px-4 py-3 text-[11px] leading-relaxed text-white/55">Des plans Pro peuvent être gagnés gratuitement pendant les événements et annonces de la communauté.</div>
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