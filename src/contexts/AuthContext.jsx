import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_BASE_URL = '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  const activateBannedMode = (nextUser = null) => {
    if (nextUser) setUser(nextUser);
    setIsBanned(true);
  };

  const clearBannedMode = () => {
    setIsBanned(false);
  };

  const handleBannedAccountResponse = (data) => {
    if (!data || (!data.banned && data.error !== 'account_banned' && data.error !== 'account_banned_malicious_input')) {
      return false;
    }

    activateBannedMode(data?.user || null);

    return true;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        window.localStorage.clear();
        const response = await fetch(`${API_BASE_URL}/auth/verify`, { credentials: 'include' });

        if (response.ok) {
          const data = await response.json();
          clearBannedMode();
          setUser(data.user);
          return;
        }

        const data = await response.json().catch(() => ({}));
        if (handleBannedAccountResponse(data)) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setUser(null);
          return;
        }
        setUser(null);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (handleBannedAccountResponse(data)) {
        return { success: true, banned: true };
      }

      if (response.ok) {
        clearBannedMode();
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Erreur de connexion' };
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, confirmPassword })
      });

      const data = await response.json();

      if (handleBannedAccountResponse(data)) {
        return { success: false, error: data.message || 'Compte banni' };
      }

      if (response.ok) {
        if (data.requiresVerification) {
          return {
            success: true,
            requiresVerification: true,
            email: data.email,
            message: data.message
          };
        }

        if (data.user) {
          setUser(data.user);
        }

        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Erreur d\'inscription' };
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (handleBannedAccountResponse(data)) {
        return { success: false, error: data.message || 'Compte banni' };
      }

      if (!response.ok) {
        return { success: false, error: data.error || 'Erreur de vérification' };
      }

      if (data.user) {
        setUser(data.user);
      }

      return { success: true, message: data.message || 'Email vérifié' };
    } catch (error) {
      console.error('Erreur lors de la vérification email:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
    clearBannedMode();
    if ('indexedDB' in window) {
      console.log('User logged out, IndexedDB data will be cleaned up by ProfilePage component');
    }
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const incomingPublicProfile = profileData.publicProfile || {};
      const incomingMusic = incomingPublicProfile.music || profileData.music || {};
      const backgroundImage = incomingPublicProfile.backgroundImage || profileData.backgroundImage || '';
      const mergedPublicProfile = {
        ...incomingPublicProfile,
        displayName: incomingPublicProfile.displayName || profileData.displayName || user?.name,
        username: incomingPublicProfile.username || incomingPublicProfile.displayName || profileData.displayName || user?.name,
        bio: incomingPublicProfile.bio ?? profileData.bio ?? '',
        location: incomingPublicProfile.location ?? profileData.location ?? '',
        website: incomingPublicProfile.website ?? profileData.website ?? '',
        backgroundImage,
        backgroundUrl: incomingPublicProfile.backgroundUrl || backgroundImage || '',
        backgroundType:
          incomingPublicProfile.backgroundType ||
          (typeof backgroundImage === 'string' && (backgroundImage.endsWith('.mp4') || backgroundImage.endsWith('.webm'))
            ? 'video'
            : 'image'),
        cardStyle: incomingPublicProfile.cardStyle || user?.publicProfile?.cardStyle || undefined,
        profileTheme: incomingPublicProfile.profileTheme || user?.publicProfile?.profileTheme || 'dark',
        profileAnimation: incomingPublicProfile.profileAnimation || user?.publicProfile?.profileAnimation || 'none',
        musicUrl: incomingPublicProfile.musicUrl || null,
        musicTitle: incomingPublicProfile.musicTitle || incomingMusic.title || '',
        musicArtist: incomingPublicProfile.musicArtist || incomingMusic.artist || '',
        socialLinks: Array.isArray(incomingPublicProfile.socialLinks) ? incomingPublicProfile.socialLinks : [],
        music: {
          title: incomingMusic.title || '',
          artist: incomingMusic.artist || '',
          file: incomingMusic.file || null,
          fileName: incomingMusic.fileName || null
        },
        links: Array.isArray(incomingPublicProfile.links) ? incomingPublicProfile.links : [],
        videos: Array.isArray(incomingPublicProfile.videos) ? incomingPublicProfile.videos : [],
        images: Array.isArray(incomingPublicProfile.images) ? incomingPublicProfile.images : []
      };

      const serverProfileData = {
        name: profileData.name,
        email: profileData.email,
        avatar: profileData.avatar,
        bio: profileData.bio ?? '',
        location: profileData.location ?? '',
        website: profileData.website ?? '',
        phone: profileData.phone ?? '',
        company: profileData.company ?? '',
        jobTitle: profileData.jobTitle ?? '',
        timezone: profileData.timezone || 'Europe/Paris',
        language: profileData.language || 'fr',
        notifications: {
          email: profileData.notifications?.email ?? true,
          push: profileData.notifications?.push ?? true,
          marketing: profileData.notifications?.marketing ?? false
        },
        privacy: {
          profileVisibility: profileData.privacy?.profileVisibility || 'public',
          showEmail: profileData.privacy?.showEmail ?? false,
          showLocation: profileData.privacy?.showLocation ?? true
        },
        publicProfile: mergedPublicProfile
      };

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(serverProfileData)
      });

      const data = await response.json();

      if (handleBannedAccountResponse(data)) {
        return { success: false, error: data.message || 'Compte banni' };
      }

      if (response.ok) {
        const updatedUser = {
          ...user,
          ...data.user,
          publicProfile: {
            ...(user?.publicProfile || {}),
            ...(data.user?.publicProfile || {})
          }
        };

        setUser(updatedUser);
        return { success: true, message: 'Profil mis à jour avec succès', user: updatedUser };
      } else {
        return { success: false, error: data.error || 'Erreur de mise à jour' };
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  };

  const getPublicProfile = async (username) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/${encodeURIComponent(username)}`);
      const data = await response.json();

      if (handleBannedAccountResponse(data)) {
        return { success: false, error: data.message || 'Compte banni' };
      }

      if (response.ok) {
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Profil non trouvé' };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  };

  const value = {
    user,
    isBanned,
    login,
    register,
    verifyEmail,
    logout,
    updateProfile,
    getPublicProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};