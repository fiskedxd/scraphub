import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const planOptions = [
  { value: 'free', label: 'FREE (20/jour)' },
  { value: 'budget', label: 'Budget 5€ (30/jour)' },
  { value: 'moyen', label: 'Moyen (45/jour)' },
  { value: 'pro', label: 'Pro (100/jour)' },
  { value: 'plus', label: 'Plus (500/jour)' },
  { value: 'flexion', label: 'Flexion (Unlimited Search)' },
  { value: 'kazake', label: 'Kazake (Unlimited Search)' },
  { value: 'entreprise', label: 'Entreprise (2000/jour)' }
];

const AdminPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token'));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [adminInfo, setAdminInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFullIp, setShowFullIp] = useState(false);
  const [showAdminFullIp, setShowAdminFullIp] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [userSearchUsed, setUserSearchUsed] = useState(0);
  const [banReason, setBanReason] = useState('');
  const [ftsQuery, setFtsQuery] = useState('');
  const [ftsResults, setFtsResults] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordSearch, setRecordSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (adminToken) {
      fetchAdminInfo();
    }
  }, [adminToken]);

  const headers = () => {
    const h = { 'Content-Type': 'application/json' };
    if (adminToken) {
      h.Authorization = `Bearer ${adminToken}`;
    }
    return h;
  };

  const handleRequestVerification = async () => {
    setError('');
    setMessage('');

    if (!email || !password) {
      setError('Email et mot de passe admin requis');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/request-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de demander le code');
      }
      setMessage('Code de vérification envoyé. Vérifie ta boîte mail.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setMessage('');
    if (!email || !password || !code) {
      setError('Email, mot de passe et code requis');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Code invalide');
      }
      localStorage.setItem('admin_token', data.token);
      setAdminToken(data.token);
      setAdminInfo(data.requestInfo || null);
      setMessage('Accès admin validé. Bienvenue.');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminInfo = async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/info', { headers: headers() });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de charger les infos admin');
      }
      setAdminInfo(data.requestInfo || null);
      
      fetchUsers();
    } catch (err) {
      setError(err.message);
      setAdminToken(null);
      localStorage.removeItem('admin_token');
    }
  };

  const fetchUsers = async () => {
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery || '')}`, {
        headers: headers()
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de récupérer les utilisateurs');
      }
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserDetails = async (id) => {
    setError('');
    setSelectedUser(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/user/${id}`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de charger l’utilisateur');
      }
      setSelectedUser(data.user);
      setUserPlan(data.user.accountType || 'free');
      setUserSearchUsed(data.user.searchUsage?.dailyUsed ?? 0);
      setBanReason(data.user.security?.accountBan?.reason || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (updateBody) => {
    if (!selectedUser) return;
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/user/${selectedUser._id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(updateBody)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Mise à jour impossible');
      }
      setSelectedUser(data.user);
      setMessage('Utilisateur mis à jour.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (isBanned) => {
    if (!selectedUser) return;
    await handleUpdateUser({ isBanned, banReason });
  };

  const quickUpdateUser = async (id, updateBody) => {
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/user/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(updateBody)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Mise à jour impossible');
      setMessage('Action appliquée.');
      
      fetchUsers();
      if (selectedUser && selectedUser._id === id) setSelectedUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (id) => {
    
    await quickUpdateUser(id, { forcePasswordReset: true });
  };

  const handleSetPlan = async () => {
    await handleUpdateUser({ accountType: userPlan });
  };

  const handleSetSearchUsed = async () => {
    await handleUpdateUser({ searchUsed: userSearchUsed });
  };

  const handleResetSearches = async () => {
    await handleUpdateUser({ resetSearches: true });
  };

  const fetchFtsResults = async () => {
    setError('');
    setMessage('');
    setFtsResults([]);
    setSelectedRecord(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/fts-search?q=${encodeURIComponent(ftsQuery)}`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Recherche FTS impossible');
      }
      setFtsResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFtsRecord = async (id) => {
    setError('');
    setSelectedRecord(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/fts-record/${id}`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de charger le record');
      }
      setSelectedRecord(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken(null);
    setAdminInfo(null);
    setUsers([]);
    setSelectedUser(null);
    setSelectedRecord(null);
    setMessage('Déconnecté.');
  };

  const extractEmails = (text) => {
    if (!text) return [];
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    return matches || [];
  };

  const searchEmailFromRecord = (emailValue) => {
    setFtsQuery(emailValue);
    setTimeout(fetchFtsResults, 10);
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#050505] text-white px-4 py-10">
        <div className="max-w-3xl mx-auto bg-white/5 border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          <Link to="/" className="text-white/40 hover:text-white text-sm">← Retour</Link>
          <h1 className="text-4xl font-bold tracking-tight mt-6">Admin SCRAPHUB</h1>
          <p className="text-white/50 mt-2 text-sm">Accès caché. Entrez les identifiants admin puis le code de vérification envoyé.</p>

          <div className="mt-8 space-y-4">
            <label className="block text-white/60 text-xs uppercase tracking-wider">Email admin</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none" />
            <label className="block text-white/60 text-xs uppercase tracking-wider">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none" />
            <button onClick={handleRequestVerification} disabled={isLoading} className="w-full rounded-2xl bg-purple-600 py-3 text-white font-semibold hover:bg-purple-500 transition">
              {isLoading ? 'Envoi du code...' : 'Demander code de vérification'}
            </button>
            <label className="block text-white/60 text-xs uppercase tracking-wider">Code de vérification</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none" />
            <button onClick={handleVerifyCode} disabled={isLoading} className="w-full rounded-2xl bg-white/10 py-3 text-white font-semibold border border-white/[0.12] hover:bg-white/15 transition">
              {isLoading ? 'Vérification...' : 'Valider le code'}
            </button>
            {message && <div className="text-green-400 text-sm">{message}</div>}
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white px-4 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Panneau admin caché</h1>
            <p className="text-white/50 mt-2 text-sm">Route : /kazake/slyre/admin — Accès caché, non exposé publiquement.</p>
          </div>
          <button onClick={handleLogout} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-500 transition">Déconnexion</button>
        </div>

        {message && <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-4 text-green-300">{message}</div>}
        {error && <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-300">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/[0.08] rounded-3xl p-6">
              <h2 className="text-xl font-semibold">Infos de session</h2>
              <div className="mt-4 space-y-2 text-sm text-white/70">
                <div><span className="font-medium text-white">Email admin :</span> {adminInfo?.email || email || '–'}</div>
                <div><span className="font-medium text-white">IP :</span> {adminInfo?.ip || '–'}</div>
                <div><span className="font-medium text-white">User-Agent :</span> {adminInfo?.userAgent || '–'}</div>
                <div><span className="font-medium text-white">VPN / proxy :</span> {adminInfo?.vpnDetected ? 'Oui' : 'Non'}</div>
                <div><span className="font-medium text-white">Données reçues le :</span> {adminInfo?.timestamp || '–'}</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/[0.08] rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Recherche utilisateurs</h2>
                <div className="flex gap-2">
                  <button onClick={fetchUsers} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 transition">Chercher</button>
                  <button onClick={() => { setSearchQuery(''); fetchUsers(); }} className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 transition">Afficher tout</button>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Email, nom, plan..." className="w-full rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none" />
              </div>
              <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto pr-2">
                {users.length === 0 && <div className="text-white/30 text-sm">Aucun utilisateur chargé.</div>}
                {users.map((u) => (
                  <div key={u._id} className="w-full rounded-3xl border border-white/[0.08] bg-white/5 p-3 hover:border-white/20 transition">
                    <div className="flex items-center justify-between gap-2 text-sm text-white/80">
                      <div>
                        <div className="font-medium">{u.email}</div>
                        <div className="text-xs text-white/50">{u.name || 'Sans nom'} · {u.searchUsage?.dailyUsed ?? 0} recherches</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-white/5 text-xs">{u.accountType || 'free'}</span>
                        <button onClick={() => loadUserDetails(u._id)} className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15">Détails</button>
                        <button onClick={() => quickUpdateUser(u._id, { isBanned: true, banReason: 'Bannissement rapide depuis la liste' })} className="rounded-full bg-red-600 px-3 py-1 text-xs hover:bg-red-500">Bannir</button>
                        <button onClick={() => handleResetPassword(u._id)} className="rounded-full bg-yellow-600 px-3 py-1 text-xs hover:bg-yellow-500">Réinit PW</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/[0.08] rounded-3xl p-6">
              <h2 className="text-xl font-semibold">Recherche FTS</h2>
              <div className="mt-4 flex gap-3 flex-col sm:flex-row">
                <input value={ftsQuery} onChange={(e) => setFtsQuery(e.target.value)} placeholder="Recherche dans fts_index.sqlite" className="flex-1 rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none" />
                <button onClick={fetchFtsResults} className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold hover:bg-sky-500 transition">FTS Search</button>
              </div>
              <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {ftsResults.length === 0 && <div className="text-white/30 text-sm">Aucun résultat FTS.</div>}
                {ftsResults.map((row) => (
                  <div key={row.id} className="rounded-3xl border border-white/[0.08] bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-white/80">
                      <span>#{row.id}</span>
                      <button onClick={() => loadFtsRecord(row.id)} className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em] hover:bg-white/15 transition">Détails</button>
                    </div>
                    <p className="mt-3 text-xs text-white/50 line-clamp-3 break-words">{row.content}</p>
                    <div className="mt-2 text-xs text-white/30">Source: {row.source}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/[0.08] rounded-3xl p-6">
              <h2 className="text-xl font-semibold">Détail utilisateur</h2>
              {selectedUser ? (
                <div className="space-y-4">
                    <div className="rounded-3xl bg-black/40 p-4 text-sm text-white/70">
                    <div className="flex justify-between gap-3">
                      <span>Email</span>
                      <span>{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between gap-3 mt-2">
                      <span>Nom</span>
                      <span>{selectedUser.name}</span>
                    </div>
                    <div className="flex justify-between gap-3 mt-2">
                      <span>Plan</span>
                      <span>{selectedUser.accountType}</span>
                    </div>
                    <div className="flex justify-between gap-3 mt-2">
                      <span>Recherches utilisées</span>
                      <span>{selectedUser.searchUsage?.dailyUsed ?? 0}</span>
                    </div>
                    <div className="flex justify-between gap-3 mt-2">
                      <span>Ban</span>
                      <span>{selectedUser.security?.accountBan?.isBanned ? 'Oui' : 'Non'}</span>
                    </div>
                    <div className="flex justify-between gap-3 mt-2">
                      <span>Dernière IP enregistrée</span>
                      <span>
                        {selectedUser.lastLoginIp ? (
                          <>
                            {!showFullIp ? selectedUser.lastLoginIp.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.*.*') : selectedUser.lastLoginIp}
                            <button onClick={() => setShowFullIp(!showFullIp)} className="ml-2 text-xs text-white/40 hover:text-white">{showFullIp ? 'Masquer' : 'Afficher IP'}</button>
                          </>
                        ) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 mt-2">
                      <span>Mot de passe</span>
                      <span>Non affiché pour sécurité</span>
                    </div>
                    <div className="mt-2 text-xs text-white/40">Reset prévu : {selectedUser.searchUsage?.dailyResetAt ? new Date(selectedUser.searchUsage.dailyResetAt).toLocaleString('fr-FR') : 'N/A'}</div>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wider text-white/50">Modifier le plan</label>
                      <select value={userPlan} onChange={(e) => setUserPlan(e.target.value)} className="w-full rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none">
                        {planOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button onClick={handleSetPlan} className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold hover:bg-indigo-500 transition">Appliquer le plan</button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wider text-white/50">Recherches utilisées</label>
                      <input type="number" min="0" value={userSearchUsed} onChange={(e) => setUserSearchUsed(Number(e.target.value))} className="w-full rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none" />
                      <button onClick={handleSetSearchUsed} className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold hover:bg-emerald-500 transition">Mettre à jour</button>
                      <button onClick={handleResetSearches} className="w-full rounded-2xl bg-yellow-600 py-3 text-sm font-semibold hover:bg-yellow-500 transition">Réinitialiser les recherches</button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wider text-white/50">Ban / Déban</label>
                      <input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Raison du ban" className="w-full rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button onClick={() => handleBanUser(true)} className="rounded-2xl bg-red-600 py-3 text-sm font-semibold hover:bg-red-500 transition">Bannir</button>
                        <button onClick={() => handleBanUser(false)} className="rounded-2xl bg-green-600 py-3 text-sm font-semibold hover:bg-green-500 transition">Déban</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/40">Sélectionne un utilisateur dans la liste pour afficher les détails.</div>
              )}
            </div>

            <div className="bg-white/5 border border-white/[0.08] rounded-3xl p-6">
              <h2 className="text-xl font-semibold">Détail record FTS</h2>
              {selectedRecord ? (
                <div className="space-y-4">
                  <div className="rounded-3xl bg-black/40 p-4 text-sm text-white/70">
                    <div className="font-medium text-white">Record #{selectedRecord.id}</div>
                    <div className="mt-3 whitespace-pre-wrap break-words text-xs text-white/60">{selectedRecord.content}</div>
                    <div className="mt-3 text-xs text-white/40">Source : {selectedRecord.source}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-white/50">Recherche rapide sur email détecté</label>
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <input value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)} placeholder="Email ou mot-clé" className="flex-1 rounded-2xl border border-white/[0.12] bg-black/40 px-4 py-3 text-white outline-none" />
                      <button onClick={() => { setFtsQuery(recordSearch); fetchFtsResults(); }} className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold hover:bg-sky-500 transition">Rechercher</button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-white/40">
                      {extractEmails(selectedRecord.content).map((item) => (
                        <button key={item} onClick={() => searchEmailFromRecord(item)} className="rounded-full border border-white/[0.12] px-3 py-1 hover:bg-white/10 transition">{item}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/40">Sélectionne un record FTS pour afficher le contenu.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
