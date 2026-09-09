import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

const PublicProfilePage = () => {
  const { username } = useParams();
  const { isWhite, isLight } = useTheme();
  const { getPublicProfile, user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [spotifyData, setSpotifyData] = useState(null);
  const [hasEnteredProfile, setHasEnteredProfile] = useState(false);
  const videoRef = useRef(null);
  const cardRef = useRef(null);

  const publicProfile = profile?.publicProfile || {};
  const previewName = publicProfile.displayName || profile?.name || profile?.email;
  const previewHandle =
    publicProfile.username ||
    publicProfile.displayName ||
    profile?.name ||
    profile?.email;

  const showEmail = publicProfile.showEmail || profile?.privacy?.showEmail;
  const showLocation = publicProfile.showLocation ?? profile?.privacy?.showLocation;

  const backgroundType =
    publicProfile.backgroundType ||
    (publicProfile.backgroundUrl?.match(/\.(mp4|webm|mov|mkv|avi)$/i) ? 'video' : 'image');

  const hasBackground =
    backgroundType === 'gradient' ||
    (backgroundType === 'image' && publicProfile.backgroundUrl) ||
    (backgroundType === 'video' && publicProfile.backgroundUrl);

  const hasBio = publicProfile.bio && publicProfile.bio.trim() !== '';
  const hasWebsite = publicProfile.website && publicProfile.website.trim() !== '';
  const hasLocationFlag =
    showLocation && publicProfile.location && publicProfile.location.trim() !== '';
  const hasEmailFlag = showEmail && profile?.email;
  const isPaidPlan = profile?.accountType && profile.accountType !== 'free';
  const badgeCatalog = {
    bugHunter: { label: 'BUG Hunter', image: '/uploads/badges/bughunter.png', glow: '#e63946' },
    qlf: { label: 'QLF', image: '/uploads/badges/qlf.png', glow: '#e63946' },
    eternal: { label: 'Éternel', image: '/uploads/badges/eternal.png', glow: '#ffffff' },
    premium: { label: 'Premium', image: '/uploads/badges/prenium.png', glow: '#f50aed' },
    verified: { label: 'Verified', image: '/uploads/badges/verified.png', glow: '#10b981' },
    leet: { label: '1337', image: '/uploads/badges/1337.png', glow: '#e63946' }
  };
  const storedBadges = Array.isArray(publicProfile.badges) ? publicProfile.badges : [];
  const publicBadges = storedBadges.length
    ? storedBadges.map((badge) => ({ ...badge, ...badgeCatalog[badge.id] }))
    : [
        ...(publicProfile.verifiedBadge || profile?.emailVerified ? [{ ...badgeCatalog.verified, id: 'verified' }] : []),
        ...(isPaidPlan ? [{ ...badgeCatalog.premium, id: 'premium' }] : []),
        ...(publicProfile.bugHunter ? [{ ...badgeCatalog.bugHunter, id: 'bugHunter' }] : [])
      ];

  const handleCardMove = (event) => {
    if (!cardRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
    const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -8;
    cardRef.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
    cardRef.current.style.setProperty('--shine-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    cardRef.current.style.setProperty('--shine-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  const resetCardTilt = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
  };

  useEffect(() => {
    const load = async () => {
      const result = await getPublicProfile(username);

      if (result.success && result.user) {
        setProfile(result.user);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Profil introuvable.'
        });
      }
    };

    load();
  }, [username, getPublicProfile]);

  useEffect(() => {
    if (!profile) return;

    const fetchSpotifyData = async () => {
      try {
        const response = await fetch(`/api/spotify/profile/${username}`);

        if (response.ok) {
          const data = await response.json();
          setSpotifyData(data);
        }
      } catch (error) {
        console.error('Erreur chargement Spotify:', error);
      }
    };

    fetchSpotifyData();
  }, [profile, username]);

  // Fonction pour entrer dans le profil
  const handleEnterProfile = () => {
    if (!hasEnteredProfile) {
      setHasEnteredProfile(true);
      // Petit délai pour que le state se mette à jour
      setTimeout(() => {
        const video = videoRef.current;
        if (video) {
          video.muted = false;
          video.play()
            .then(() => {
              console.log('Vidéo lancée avec succès');
            })
            .catch((error) => {
              console.error('Erreur lecture vidéo:', error);
            });
        }
      }, 100);
    }
  };

  const Icons = {
    globe: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9"
      />
    ),
    location: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
    mail: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
    user: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
    lock: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    ),
    brush: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
      />
    )
  };

  if (message.type === 'error') {
    return (
      <div
        className={`relative min-h-screen w-full overflow-hidden ${
          isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'
        }`}
      >
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
          <div
            className={`w-full max-w-2xl rounded-3xl border p-10 text-center backdrop-blur-xl ${
              isWhite
                ? 'bg-white/80 border-black/10'
                : isLight
                  ? 'bg-white/90 border-gray-200'
                  : 'bg-black/40 border-white/[0.08]'
            }`}
          >
            <h1
              className={`mb-4 text-3xl font-semibold ${
                isWhite
                  ? 'text-black'
                  : isLight
                    ? 'text-gray-900'
                    : 'text-white'
              }`}
            >
              Profil introuvable
            </h1>

            <p
              className={
                isWhite
                  ? 'text-black/40'
                  : isLight
                    ? 'text-gray-500'
                    : 'text-white/40'
              }
            >
              {message.text}
            </p>

            <Link
              to="/"
              className={`mt-8 inline-flex rounded-full border px-6 py-3 text-sm transition ${
                isWhite
                  ? 'border-black/20 bg-black/5 text-black hover:bg-black/10'
                  : isLight
                    ? 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className={`relative min-h-screen w-full overflow-hidden ${
          isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'
        }`}
      >
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
          <div
            className={`w-full max-w-2xl rounded-3xl border p-10 text-center backdrop-blur-xl ${
              isWhite
                ? 'bg-white/80 border-black/10'
                : isLight
                  ? 'bg-white/90 border-gray-200'
                  : 'bg-black/40 border-white/[0.08]'
            }`}
          >
            <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  const isOwner = authUser?.email === profile.email;
  const isPrivate = profile.privacy?.profileVisibility === 'private';

  const hasLocation = hasLocationFlag;
  const hasEmail = hasEmailFlag;

  if (isPrivate && !isOwner) {
    return (
      <div
        className={`relative min-h-screen w-full overflow-hidden ${
          isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'
        }`}
      >
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
          <div
            className={`w-full max-w-2xl rounded-3xl border p-10 text-center backdrop-blur-xl ${
              isWhite
                ? 'bg-white/80 border-black/10'
                : isLight
                  ? 'bg-white/90 border-gray-200'
                  : 'bg-black/40 border-white/[0.08]'
            }`}
          >
            <h1
              className={`mb-4 text-3xl font-semibold ${
                isWhite
                  ? 'text-black'
                  : isLight
                    ? 'text-gray-900'
                    : 'text-white'
              }`}
            >
              Profil privé
            </h1>

            <p
              className={
                isWhite
                  ? 'text-black/40'
                  : isLight
                    ? 'text-gray-500'
                    : 'text-white/40'
              }
            >
              Ce profil n'est pas accessible publiquement.
            </p>

            <Link
              to="/"
              className={`mt-8 inline-flex rounded-full border px-6 py-3 text-sm transition ${
                isWhite
                  ? 'border-black/20 bg-black/5 text-black hover:bg-black/10'
                  : isLight
                    ? 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const backgroundStyle = {};
  const isVideoBackground = backgroundType === 'video' && publicProfile?.backgroundUrl;

  if (backgroundType === 'gradient') {
    backgroundStyle.backgroundImage =
      gradientPresets[publicProfile.backgroundPreset] ||
      gradientPresets['cool-blue'];
  }

  if (backgroundType === 'image' && publicProfile.backgroundUrl) {
    backgroundStyle.backgroundImage = `url('${publicProfile.backgroundUrl}')`;
  }

  return (
    <div
      className="profile-page relative min-h-screen w-full overflow-x-hidden bg-transparent"
      onClick={handleEnterProfile} // ← CLIC N'IMPORTE OÙ SUR LA PAGE
    >
      {/* Écran "Appuyez pour entrer" avec fond noir */}
      {isVideoBackground && !hasEnteredProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // Empêche la propagation
              handleEnterProfile();
            }}
            className=""
          >
            <span className="relative z-10 flex items-center gap-3">
              <svg className="h-6 w-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Appuyez pour entrer
            </span>
            <span className="absolute inset-0 " />
          </button>
        </div>
      )}

      {/* Background avec vidéo */}
      {hasBackground && (
        <div className="fixed inset-0 z-0 overflow-hidden">
          {isVideoBackground ? (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted={!hasEnteredProfile}
              loop
              playsInline
              preload="auto"
              src={publicProfile.backgroundUrl}
              poster={publicProfile.posterUrl || ''}
            />
          ) : (
            <div
              className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat"
              style={backgroundStyle}
            />
          )}

          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {!hasBackground && (
        <div
          className={`fixed inset-0 z-0 ${
            isWhite
              ? 'bg-white'
              : isLight
                ? 'bg-gray-50'
                : 'bg-black'
          }`}
        />
      )}

      <div className="relative z-10 min-h-screen w-full">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
          <div className="mb-8">
            <Link
              to="/"
              className={`group inline-flex items-center gap-2 text-sm transition ${
                isWhite
                  ? 'text-black/50 hover:text-black'
                  : isLight
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-white/60 hover:text-white'
              }`}
            >
              <svg
                className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Retour
            </Link>
          </div>

          <div
            ref={cardRef}
            onMouseMove={handleCardMove}
            onMouseLeave={resetCardTilt}
            className="profile-card-transparent relative overflow-visible"
          >
            <div className="profile-card-shine" />
            {publicProfile.bannerUrl && (
              <div className="h-32 w-full overflow-hidden sm:h-44">
                <img src={publicProfile.bannerUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="relative p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <img
                  src={publicProfile.avatar || '/pdp.png'}
                  alt={previewName}
                  className="profile-avatar h-24 w-24 shrink-0 rounded-full object-cover shadow-xl"
                />

                <div className="min-w-0 flex-1">
                  {profile.accountType && (
                    <div className="mb-2 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-xs backdrop-blur">
                      {profile.accountType}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <h1
                    className={`text-3xl font-bold tracking-tight ${
                      'text-white'
                    }`}
                    >{previewName}</h1>
                    {publicBadges.length > 0 && (
                      <div className="profile-badges" aria-label="Badges">
                        {publicBadges.map((badge) => badge.image && (
                          <span key={badge.id} className="profile-badge" style={{ '--badge-glow': badge.glow || '#fff' }}>
                            <img src={badge.image} alt={badge.label} />
                            <span>{badge.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <p
                    className={`text-sm ${
                      'text-white/55'
                    }`}
                  >
                    @{previewHandle}
                  </p>
                </div>
              </div>

              {hasBio && (
                <div className="mt-6">
                  <p
                    className={`leading-relaxed ${
                      isWhite
                        ? 'text-black/70'
                        : isLight
                          ? 'text-gray-700'
                          : 'text-gray-300'
                    }`}
                  >
                    {publicProfile.bio}
                  </p>
                </div>
              )}

              {(hasWebsite || hasLocation || hasEmail) && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {hasWebsite && (
                    <a
                      href={publicProfile.website}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-3 rounded-xl border p-3 transition hover:scale-[1.02] ${
                        isWhite
                          ? 'border-black/10 bg-black/5 hover:bg-black/10'
                          : isLight
                            ? 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                            : 'border-white/[0.06] bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <svg
                        className="h-5 w-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {Icons.globe}
                      </svg>

                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-xs text-slate-400">
                          Site web
                        </p>

                        <p
                          className={`truncate text-sm ${
                            isWhite
                              ? 'text-black'
                              : isLight
                                ? 'text-gray-900'
                                : 'text-white'
                          }`}
                        >
                          {publicProfile.website}
                        </p>
                      </div>
                    </a>
                  )}

                  {hasLocation && (
                    <div
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        isWhite
                          ? 'border-black/10 bg-black/5'
                          : isLight
                            ? 'border-gray-200 bg-gray-100'
                            : 'border-white/[0.06] bg-white/5'
                      }`}
                    >
                      <svg
                        className="h-5 w-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {Icons.location}
                      </svg>

                      <div>
                        <p className="text-xs text-slate-400">
                          Localisation
                        </p>

                        <p
                          className={`text-sm ${
                            isWhite
                              ? 'text-black'
                              : isLight
                                ? 'text-gray-900'
                                : 'text-white'
                          }`}
                        >
                          {publicProfile.location}
                        </p>
                      </div>
                    </div>
                  )}

                  {hasEmail && (
                    <div
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        isWhite
                          ? 'border-black/10 bg-black/5'
                          : isLight
                            ? 'border-gray-200 bg-gray-100'
                            : 'border-white/[0.06] bg-white/5'
                      }`}
                    >
                      <svg
                        className="h-5 w-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {Icons.mail}
                      </svg>

                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-xs text-slate-400">
                          Email
                        </p>

                        <p
                          className={`truncate text-sm ${
                            isWhite
                              ? 'text-black'
                              : isLight
                                ? 'text-gray-900'
                                : 'text-white'
                          }`}
                        >
                          {profile.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {spotifyData?.isConnected &&
                spotifyData?.currentTrack && (
                  <div className="mt-6">
                    <div
                      className={`flex items-center gap-3 rounded-xl border p-4 ${
                        isWhite || isLight
                          ? 'border-green-300/50 bg-green-50/50'
                          : 'border-green-500/30 bg-green-500/10'
                      }`}
                    >
                      {spotifyData.currentTrack.image && (
                        <img
                          src={spotifyData.currentTrack.image}
                          alt="Album"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs uppercase tracking-wide ${
                            isWhite || isLight
                              ? 'text-green-700/60'
                              : 'text-green-400/60'
                          }`}
                        >
                          {spotifyData.currentTrack.isPlaying
                            ? '🎵 En écoute sur Spotify'
                            : 'Dernier écoute'}
                        </p>

                        <p
                          className={`truncate text-sm font-semibold ${
                            isWhite
                              ? 'text-black'
                              : isLight
                                ? 'text-gray-900'
                                : 'text-white'
                          }`}
                        >
                          {spotifyData.currentTrack.name}
                        </p>

                        <p
                          className={`truncate text-xs ${
                            isWhite
                              ? 'text-black/60'
                              : isLight
                                ? 'text-gray-600'
                                : 'text-white/60'
                          }`}
                        >
                          {spotifyData.currentTrack.artists?.join(', ')}
                        </p>
                      </div>

                      {spotifyData.currentTrack.url && (
                        <a
                          href={spotifyData.currentTrack.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex-shrink-0 rounded-lg p-2 transition ${
                            isWhite || isLight
                              ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30'
                              : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          }`}
                        >
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.986-8.159-2.566-12.102-1.402-.479.106-1.019-.209-1.125-.686-.289-.479.21-1.019.686-1.125 4.562-1.314 9.901-.686 13.56 1.639.42.239.479.841.301 1.259zm.12-3.36C15.24 9.3 8.849 8.951 5.051 10.234c-.525.161-1.125-.276-1.266-.847-.12-.556.276-1.126.847-1.266 4.686-1.466 11.54-1.087 15.902 1.804.525.315.684 1.165.315 1.688-.364.524-1.166.684-1.688.315z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )}

              {spotifyData?.isConnected &&
                !spotifyData?.currentTrack && (
                  <div className="mt-6">
                    <div
                      className={`rounded-xl border py-4 text-center ${
                        isWhite || isLight
                          ? 'border-green-300/50 bg-green-50/50'
                          : 'border-green-500/30 bg-green-500/10'
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          isWhite || isLight
                            ? 'text-green-700/60'
                            : 'text-green-400/60'
                        }`}
                      >
                        Pas actuellement en écoute
                      </p>
                    </div>
                  </div>
                )}

              {isOwner && (
                <div className="mt-6 border-t border-white/10 pt-4">
                  <Link
                    to="/profile"
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm transition hover:scale-105 ${
                      isWhite
                        ? 'border-black/20 bg-black/5 text-black hover:bg-black/10'
                        : isLight
                          ? 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {Icons.brush}
                    </svg>
                    Modifier mon profil
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;