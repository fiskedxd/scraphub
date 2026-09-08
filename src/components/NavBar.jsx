import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const NavBar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkPlatform = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsDesktop(!isMobileDevice);
    };
    checkPlatform();
  }, []);

  const normalizePlanName = (plan) => {
    if (!plan) return '';
    return plan.toString().toLowerCase();
  };

  const isPremiumPlan = () => {
    const plan = normalizePlanName(user?.accountType || user?.publicProfile?.plan || '');
    return plan.includes('kazake') || plan.includes('flexion');
  };

  const getPlanTitle = () => {
    const plan = normalizePlanName(user?.accountType || user?.publicProfile?.plan || '');
    if (plan.includes('kazake')) return 'Plan Kazake';
    if (plan.includes('flexion')) return 'Plan Flexion';
    return 'Plan Free';
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = () => {
    return currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
  };

  const navLinks = [
    { to: "/", label: "Accueil" },
    { to: "/GeoPage", label: "Geoint Page" },
    { to: "/searcher", label: "Multi Search" },
    { to: "/search", label: "Search" },
    { to: "/chat", label: "Chat" },
    { to: "/profile", label: "Profil" },
    { to: "/settings", label: "Paramètres" },
    { to: "/plans", label: "Plans & tarifs" },
    { to: "/docs", label: "API Docs" }
  ];

  if (!user) {
    return (
      <nav className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-md">
        <Link to="/plans" className="rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
          Plans & tarifs
        </Link>
        <Link to="/docs" className="rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
          API Docs
        </Link>
      </nav>
    );
  }

  return (
    <>
      {/* BOUTON MENU */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:bg-black/60"
      >
        <svg 
          className={`w-4 h-4 text-white transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* MENU PRINCIPAL */}
      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed top-14 right-4 z-50 w-80 max-h-[85vh] overflow-y-auto animate-slide-down"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* CATÉGORIE 1: HEURE ET DATE */}
          <div className="backdrop-blur-xl bg-black/40 rounded-2xl p-4 mb-2 border border-white/5 hover:border-white/10 transition-all duration-300">
            <div className="text-3xl font-light text-white tracking-tighter">
              {formatTime()}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatDate()}
            </div>
          </div>

          {/* CATÉGORIE 2: PROFIL UTILISATEUR */}
          <div className="backdrop-blur-xl bg-black/40 rounded-2xl p-4 mb-2 border border-white/5 hover:border-white/10 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">
                  {user.name || user.email?.split('@')[0]}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {user.email}
                </p>
              </div>
              <div className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-gray-400">
                {isDesktop ? "PC" : "Mobile"}
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-black/40 rounded-2xl overflow-hidden mb-2 border border-white/5">
            <div className="px-4 py-2 border-b border-white/5">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Navigation</p>
            </div>
            {navLinks.map((link, index) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-all duration-200"
                style={{
                  animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CATÉGORIE 4: ACTIONS */}
          <div className="backdrop-blur-xl bg-black/40 rounded-2xl overflow-hidden border border-white/5">
            <div className="px-4 py-2 border-b border-white/5">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Actions</p>
            </div>
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              Déconnexion
            </button>
          </div>

          {/* INDICATEUR */}
          <div className="py-4 flex justify-center">
            <div className="w-8 h-1 rounded-full bg-white/20"></div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
};

export default NavBar;