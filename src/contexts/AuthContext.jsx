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

const clearLocalStorageIfNeeded = () => {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return false;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old data...');
      const token = localStorage.getItem('token');
      localStorage.clear();
      if (token) {
        localStorage.setItem('token', token);
      }
      return true;
    }
    return false;
  }
};

const forceClearLocalStorage = () => {
  try {
    const token = localStorage.getItem('token');
    localStorage.clear();
    if (token) {
      localStorage.setItem('token', token);
    }
    console.log('localStorage cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const getStoredUserSafe = () => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  };

  const [user, setUser] = useState(() => getStoredUserSafe());
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(localStorage.getItem('is_banned') === '1');

  const activateBannedMode = (nextUser = null) => {
    try {
      localStorage.setItem('is_banned', '1');
    } catch (error) {}
    if (nextUser) {
      try {
        localStorage.setItem('user', JSON.stringify(nextUser));
      } catch (error) {}
      setUser(nextUser);
    }
    setIsBanned(true);
  };

  const clearBannedMode = () => {
    try {
      localStorage.removeItem('is_banned');
    } catch (error) {}
    setIsBanned(false);
  };

  const handleBannedAccountResponse = (data) => {
    if (!data || (!data.banned && data.error !== 'account_banned' && data.error !== 'account_banned_malicious_input')) {
      return false;
    }

    const storedUser = localStorage.getItem('user');
    let parsedUser = null;
    try {
      parsedUser = storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      parsedUser = null;
    }

    const fallbackUser = data?.user || parsedUser;
    activateBannedMode(fallbackUser);

    return true;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = getStoredUserSafe();

        if (!token) {
          setUser(storedUser);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          clearBannedMode();
          setUser(data.user);
          try {
            localStorage.setItem('user', JSON.stringify(data.user));
          } catch (error) {}
          return;
        }

        const data = await response.json().catch(() => ({}));
        if (handleBannedAccountResponse(data)) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          return;
        }

        setUser(storedUser);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        setUser(getStoredUserSafe());
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
        localStorage.setItem('token', data.token);
        
        try {
          localStorage.setItem('user', JSON.stringify(data.user));
        } catch (storageError) {
          console.warn('localStorage quota exceeded during login, storing minimal user data:', storageError);
          const minimalUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.avatar
          };
          localStorage.setItem('user', JSON.stringify(minimalUser));
        }
        
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

        if (data.token && data.user) {
          localStorage.setItem('token', data.token);

          try {
            localStorage.setItem('user', JSON.stringify(data.user));
          } catch (storageError) {
            console.warn('localStorage quota exceeded during registration, storing minimal user data:', storageError);
            const minimalUser = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              avatar: data.user.avatar
            };
            localStorage.setItem('user', JSON.stringify(minimalUser));
          }

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

      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      }

      return { success: true, message: data.message || 'Email vérifié' };
    } catch (error) {
      console.error('Erreur lors de la vérification email:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearBannedMode();
    if ('indexedDB' in window) {
      console.log('User logged out, IndexedDB data will be cleaned up by ProfilePage component');
    }
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { success: false, error: 'Non authentifié' };

      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
      } catch (quotaError) {
        if (quotaError.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, clearing old data...');
          const token = localStorage.getItem('token');
          localStorage.clear();
          if (token) {
            localStorage.setItem('token', token);
          }
        }
      }

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
          'Authorization': `Bearer ${token}`
        },
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

        try {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (storageError) {
          console.warn('localStorage still full after clearing, storing only essential data:', storageError);
          const essentialUser = {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email
          };
          localStorage.setItem('user', JSON.stringify(essentialUser));
        }
        
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