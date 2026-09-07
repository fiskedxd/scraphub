import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const { register, verifyEmail } = useAuth();
  const { theme, isDark, isLight, isWhite } = useTheme();
  const navigate = useNavigate();

  const inputClass = `mt-1 block w-full px-3 py-2 rounded-xl border transition backdrop-blur-sm focus:outline-none focus:ring-2 ${
    isWhite ? 'border-black/20 bg-white/80 text-black placeholder-black/40 focus:ring-black/30 focus:border-black/40' :
    isLight ? 'border-gray-300 bg-white/90 text-gray-900 placeholder-gray-500 focus:ring-gray-400 focus:border-gray-400' :
    'border-white/[0.08] bg-black/40 text-white placeholder-white/20 focus:ring-white/30 focus:border-white/20'
  }`;

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
    setSuccessMessage('');

    try {
      if (!acceptedTerms) {
        setError('Vous devez accepter les conditions et la politique de confidentialité.');
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
      }
      
      const result = await register(formData.name, formData.email, formData.password, formData.confirmPassword);
      
      if (result.success) {
        if (result.requiresVerification) {
          setPendingEmail(result.email || formData.email);
          setIsVerificationStep(true);
          setSuccessMessage(result.message || 'Compte créé. Entrez le code reçu par email.');
        } else {
          navigate('/');
        }
      } else {
        setError(result.error || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      setError('Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await verifyEmail(pendingEmail, verificationCode.trim());
      if (result.success) {
        setSuccessMessage('Email vérifié, connexion réussie.');
        navigate('/');
      } else {
        setError(result.error || 'Code invalide ou expiré');
      }
    } catch (err) {
      setError('Erreur lors de la vérification du code');
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
              <h1 className={`text-2xl font-semibold ${
                isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'
              }`}>
                {isVerificationStep ? 'Vérifiez votre email' : 'Inscrivez-vous'}
              </h1>
            </div>
            <p className="mt-2 text-center text-sm text-white/40">
              Ou{' '}
              <Link to="/login" className="font-medium text-white/70 hover:text-white transition">
                connectez-vous à votre compte existant
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={isVerificationStep ? handleVerifyCode : handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm">
                {successMessage}
              </div>
            )}

            {!isVerificationStep ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-white/60 mb-1">
                      Nom complet
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className={inputClass}
                      placeholder="Votre nom complet"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white/60 mb-1">
                      Adresse email
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
                    <label htmlFor="password" className="block text-sm font-medium text-white/60 mb-1">
                      Mot de passe
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className={inputClass}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/60 mb-1">
                      Confirmer le mot de passe
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className={inputClass}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className="group relative flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="sr-only"
                    />
                    <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border border-white/20 transition ${acceptedTerms ? 'bg-emerald-400/90 border-emerald-300' : 'bg-black/60'}`}>
                      {acceptedTerms ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-black">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : null}
                    </span>
                    <div className="text-sm leading-6 text-white/80">
                      <span className="block font-semibold text-white">J'accepte les conditions</span>
                      <span className="block text-white/60">
                        <Link to="/terms" target="_blank" className="text-white/70 hover:text-white underline">conditions d'utilisation</Link> et{' '}
                        <Link to="/privacy" target="_blank" className="text-white/70 hover:text-white underline">politique de confidentialité</Link>
                      </span>
                    </div>
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || !acceptedTerms}
                    className="group relative w-full flex justify-center py-2.5 px-4 border border-white/20 text-sm font-medium rounded-xl text-white bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Création du compte...' : 'Créer le compte'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="text-sm text-white/60">
                    Entrez le code de vérification envoyé à <span className="font-semibold text-white">{pendingEmail}</span>.
                  </div>
                  <div>
                    <label htmlFor="verificationCode" className="block text-sm font-medium text-white/60 mb-1">
                      Code de vérification
                    </label>
                    <input
                      id="verificationCode"
                      name="verificationCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      className={inputClass}
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="group relative w-full flex justify-center py-2.5 px-4 border border-white/20 text-sm font-medium rounded-xl text-white bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Vérification...' : 'Valider le code'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;