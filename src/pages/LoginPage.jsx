import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const { theme, isDark, isLight, isWhite } = useTheme();
  const navigate = useNavigate();

  const inputClass = `mt-1 block w-full px-3 py-2 rounded-xl border transition backdrop-blur-sm focus:outline-none focus:ring-2 ${
    isWhite ? 'border-black/20 bg-white/80 text-black placeholder-black/40 focus:ring-black/30 focus:border-black/40' :
    isLight ? 'border-gray-300 bg-white/90 text-gray-900 placeholder-gray-500 focus:ring-gray-400 focus:border-gray-400' :
    'border-white/[0.08] bg-black/40 text-white placeholder-white/20 focus:ring-white/30 focus:border-white/20'
  }`;

  const THROTTLE_MS = 2000;
  const WINDOW_MS = 5 * 60 * 1000;
  const MAX_ATTEMPTS_IN_WINDOW = 10;
  const LOCKOUT_MS = 15 * 60 * 1000;

  const getNow = () => Date.now();
  const getAttempts = () => {
    try {
      const raw = localStorage.getItem('auth_attempts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const saveAttempts = (attempts) => {
    try {
      localStorage.setItem('auth_attempts', JSON.stringify(attempts));
    } catch {}
  };
  const getLockoutUntil = () => {
    const v = localStorage.getItem('auth_lockout_until');
    return v ? parseInt(v, 10) : 0;
  };
  const setLockoutUntil = (ts) => {
    try {
      localStorage.setItem('auth_lockout_until', String(ts));
    } catch {}
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const now = getNow();
      const lockoutUntil = getLockoutUntil();
      if (lockoutUntil && now < lockoutUntil) {
        const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
        setError(`Trop de tentatives. Réessayez dans ${remainingSec}s.`);
        return;
      }

      const attempts = getAttempts();
      const recentAttempts = attempts.filter((t) => now - t < WINDOW_MS);
      const lastAttempt = attempts.length ? attempts[attempts.length - 1] : 0;
      if (lastAttempt && now - lastAttempt < THROTTLE_MS) {
        setError('Veuillez patienter un instant avant de réessayer.');
        return;
      }

      recentAttempts.push(now);
      saveAttempts(recentAttempts);

      if (recentAttempts.length > MAX_ATTEMPTS_IN_WINDOW) {
        const until = now + LOCKOUT_MS;
        setLockoutUntil(until);
        const remainingSec = Math.ceil(LOCKOUT_MS / 1000);
        setError(`Trop de tentatives. Réessayez dans ${remainingSec}s.`);
        return;
      }
      
      const result = await login(formData.email, formData.password);

      if (result.banned) {
        navigate('/banned');
        return;
      }
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Email ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen w-full overflow-hidden transition-all duration-300 ${
      isWhite ? 'bg-white text-black' : isLight ? 'bg-gray-50 text-gray-900' : 'bg-black text-white'
    }`}>
      {/* GRILLE */}
      <div
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
      <div className={`absolute inset-0 bg-gradient-to-b ${
        isWhite ? 'from-white/80 via-white/60 to-white/95' :
        isLight ? 'from-gray-50/80 via-gray-50/60 to-gray-50/95' :
        'from-black/60 via-black/40 to-black/90'
      }`} />

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className={`max-w-md w-full mx-auto space-y-8 backdrop-blur-xl rounded-2xl border p-6 sm:p-8 transition-all duration-300 ${
          isWhite ? 'bg-white/80 border-black/10' :
          isLight ? 'bg-white/90 border-gray-200' :
          'bg-black/60 border-white/[0.08]'
        }`}>
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="h-12 w-12 rounded-full" />
            </div>
            <div className="mt-6 mb-2 flex justify-center">
              <h1 className="text-2xl font-semibold text-white">Connectez-vous à votre compte</h1>
            </div>
            <p className="mt-2 text-center text-sm text-white/40">
              Ou{' '}
              <Link to="/register" className="font-medium text-white/70 hover:text-white transition">
                créez un nouveau compte
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className={`px-4 py-3 rounded-xl text-sm border ${
                isWhite ? 'bg-red-50 border-red-200 text-red-700' :
                isLight ? 'bg-red-50 border-red-200 text-red-700' :
                'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-1 ${
                  isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'
                }`}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={inputClass}
                  placeholder="exemple@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className={`block text-sm font-medium mb-1 ${
                  isWhite ? 'text-black/60' : isLight ? 'text-gray-600' : 'text-white/60'
                }`}>
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={inputClass}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid gap-4">
              <label className="group relative flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
                <div>
                  <div className="text-sm font-semibold text-white">Se souvenir de moi</div>
                  <div className="text-xs text-white/50">Rester connecté sur cet appareil</div>
                </div>
                <button
                  type="button"
                  onClick={() => setRememberMe((prev) => !prev)}
                  className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition ${rememberMe ? 'border-emerald-400 bg-emerald-400/90' : 'border-white/20 bg-white/10'}`}
                >
                  <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${rememberMe ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </label>

              <div className="text-sm text-right">
                <button type="button" onClick={(e) => { e.preventDefault();  }} className="text-white/50 hover:text-white transition">Mot de passe oublié?</button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-2.5 px-4 border text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isWhite ? 'border-black/20 text-black bg-black/5 hover:bg-black/10 hover:border-black/30' :
                  isLight ? 'border-gray-300 text-gray-700 bg-gray-100/50 hover:bg-gray-200/50 hover:border-gray-400' :
                  'border-white/20 text-white bg-white/5 hover:bg-white/10 hover:border-white/30'
                }`}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;