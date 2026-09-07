import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const OnlineEnrichmentService = {
  request: async (platform, value, token) => {
    if (!platform || !value) {
      return { platform, value, error: true, message: 'platform et value sont requis' };
    }
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers,
        body: JSON.stringify({ platform, value })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        return { platform, value, error: true, message: data.error || data.message || 'Erreur de scraping' };
      }
      return { ...(data.result || {}), originalInput: value, originalType: platform };
    } catch (error) {
      return { platform, value, error: true, message: error.message };
    }
  },

  batch: async (items, token) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/scrape/batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        return items.map(item => ({ platform: item.platform, originalInput: item.value, error: true, message: data.error || 'Batch scrape failed' }));
      }
      return Array.isArray(data.results) ? data.results : [];
    } catch (error) {
      return items.map(item => ({ platform: item.platform, originalInput: item.value, error: true, message: error.message }));
    }
  }
};

// Composant de nœud de requête amélioré
const QueryNodeComponent = ({ data }) => (
  <div className="group relative min-w-[220px] rounded-xl border border-white/15 bg-black shadow-[0_0_30px_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,255,255,0.14)] hover:border-white/30">
    <div className="absolute inset-0 rounded-xl bg-white/[0.02]" />
    <div className="relative p-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-white/10 blur-lg rounded-full" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-1">Recherche</div>
          <div className="text-sm font-semibold text-white break-words">{data.label || data.query || "Query"}</div>
        </div>
      </div>
    </div>
  </div>
);

// Composant de nœud de résultat amélioré
const ResultNodeComponent = ({ data }) => {
  const getSocialIcon = (type) => {
    const icons = {
      instagram: () => (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
        </svg>
      ),
      tiktok: () => (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      ),
      snapchat: () => (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
      ),
      discord: () => (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
        </svg>
      ),
      whatsapp: () => (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.45-4.45-9.9-9.91-9.9zm0 18.2c-1.5 0-2.96-.4-4.24-1.16l-.3-.18-3.12.82.83-3.04-.2-.31c-.83-1.33-1.27-2.87-1.27-4.44 0-4.58 3.72-8.3 8.3-8.3 4.58 0 8.3 3.72 8.3 8.3 0 4.57-3.72 8.3-8.3 8.3z"/>
        </svg>
      ),
      default: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    };
    return (icons[type] || icons.default)();
  };

  const getSocialColor = (type) => {
    const colors = {
      profile: 'from-gray-800/40 to-gray-900/60 border-gray-600/30',
      instagram: 'from-gray-800/50 to-gray-900/70 border-white/20',
      tiktok: 'from-black/60 to-gray-800/60 border-white/30',
      snapchat: 'from-gray-800/50 to-gray-900/70 border-white/20',
      discord: 'from-gray-800/50 to-gray-900/70 border-white/20',
      whatsapp: 'from-gray-800/50 to-gray-900/70 border-white/20',
    };
    return colors[type] || 'from-gray-700/30 to-gray-800/30 border-gray-500/30';
  };

  const bannerStyle = data.banner ? { backgroundImage: `url(${data.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : null;
  const avatarUrl = data.profilePicture || data.avatar;

  return (
    <div className={`group relative min-w-[300px] max-w-[350px] rounded-xl border bg-gradient-to-br ${getSocialColor(data.type)} backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.7)] cursor-pointer`}>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      {bannerStyle && (
        <div className="relative h-32 rounded-t-xl overflow-hidden" style={bannerStyle}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />
          {data.verified && (
            <div className="absolute top-3 right-3 rounded-full bg-blue-500/20 backdrop-blur-xl px-3 py-1 text-[10px] font-semibold text-blue-300 border border-blue-400/30">
              ✓ Vérifié
            </div>
          )}
          {avatarUrl && (
            <div className="absolute bottom-[-24px] left-4 h-20 w-20 rounded-full overflow-hidden border-4 border-gray-900 shadow-2xl bg-gray-800">
              <img src={avatarUrl} alt="avatar" className="object-cover w-full h-full" />
            </div>
          )}
        </div>
      )}
      <div className={`relative p-4 ${bannerStyle ? 'pt-14' : ''}`}>
        <div className="flex items-start gap-4 mb-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-md" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/80 border-2 border-white/20 overflow-hidden shadow-xl">
              {avatarUrl && !bannerStyle ? (
                <img src={avatarUrl} alt="avatar" className="object-cover w-full h-full" />
              ) : (
                <div className="text-white/80">
                  {getSocialIcon(data.type)}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-1">{data.platform || data.type}</div>
            <div className="text-lg font-bold text-white truncate">{data.displayName || data.username || data.handle || data.email || data.phone || data.userId || "Profile"}</div>
            {data.handle && <div className="text-sm text-white/50 truncate">@{data.handle}</div>}
            {data.discriminator && <div className="text-xs text-white/40">#{data.discriminator}</div>}
            {data.operator && <div className="text-xs text-white/40">Opérateur: {data.operator}</div>}
          </div>
        </div>

        {data.bio && <p className="text-sm text-white/70 mt-3 leading-relaxed line-clamp-2">{data.bio}</p>}

        {data.platform === 'profile' && (
          <div className="mt-4 space-y-2 text-xs text-white/60">
            {data.prenom && data.nom && (
              <div className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2">
                <span className="text-white/50">Nom complet</span>
                <span className="text-white/90 font-medium">{data.prenom} {data.nom}</span>
              </div>
            )}
            {data.date_naissance && (
              <div className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2">
                <span className="text-white/50">Naissance</span>
                <span className="text-white/90">{data.date_naissance}</span>
              </div>
            )}
            {data.adresse && (
              <div className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2">
                <span className="text-white/50">Adresse</span>
                <span className="text-white/90 truncate max-w-[180px]">{data.adresse}</span>
              </div>
            )}
            {data.emails?.length > 0 && (
              <div className="pt-3 border-t border-white/10">
                <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2 font-semibold">Emails</div>
                {data.emails.slice(0, 3).map((email, index) => (
                  <div key={index} className="text-white/80 bg-black/20 rounded-lg px-3 py-1.5 mb-1 font-mono text-xs">{email}</div>
                ))}
              </div>
            )}
            {data.phones?.length > 0 && (
              <div className="pt-3 border-t border-white/10">
                <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2 font-semibold">Téléphones</div>
                {data.phones.slice(0, 3).map((phone, index) => (
                  <div key={index} className="text-white/80 bg-black/20 rounded-lg px-3 py-1.5 mb-1">{phone}</div>
                ))}
              </div>
            )}
            {(data.instagram?.length > 0 || data.tiktok?.length > 0 || data.discordIds?.length > 0 || data.discordTags?.length > 0) && (
              <div className="pt-3 border-t border-white/10">
                <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2 font-semibold">Réseaux sociaux</div>
                {data.instagram?.slice(0, 2).map((username, index) => (
                  <div key={`insta-${index}`} className="text-white/80 bg-black/20 rounded-lg px-3 py-1.5 mb-1">Instagram: {username}</div>
                ))}
                {data.tiktok?.slice(0, 2).map((username, index) => (
                  <div key={`tiktok-${index}`} className="text-white/80 bg-black/20 rounded-lg px-3 py-1.5 mb-1">TikTok: {username}</div>
                ))}
                {data.discordIds?.slice(0, 2).map((id, index) => (
                  <div key={`discord-id-${index}`} className="text-white/80 bg-black/20 rounded-lg px-3 py-1.5 mb-1">Discord: {id}</div>
                ))}
                {data.discordTags?.slice(0, 2).map((tag, index) => (
                  <div key={`discord-tag-${index}`} className="text-white/80 bg-black/20 rounded-lg px-3 py-1.5 mb-1">Discord: {tag}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {(data.followers || data.following || data.posts) && (
          <div className="flex gap-4 mt-4 pt-3 border-t border-white/10">
            {data.posts && (
              <div className="text-center flex-1">
                <div className="text-base font-bold text-white">{data.posts.toLocaleString()}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Posts</div>
              </div>
            )}
            {data.followers && (
              <div className="text-center flex-1">
                <div className="text-base font-bold text-white">{data.followers.toLocaleString()}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Followers</div>
              </div>
            )}
            {data.following && (
              <div className="text-center flex-1">
                <div className="text-base font-bold text-white">{data.following.toLocaleString()}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Following</div>
              </div>
            )}
          </div>
        )}

        {(data.userId || data.email || data.phone || data.domain) && data.platform !== 'profile' && (
          <div className="mt-4 space-y-2 text-xs">
            {data.userId && (
              <div className="flex justify-between bg-black/20 rounded-lg px-3 py-2">
                <span className="text-white/40">ID</span>
                <span className="font-mono text-white/70 truncate max-w-[180px]">{data.userId}</span>
              </div>
            )}
            {data.email && (
              <div className="flex justify-between bg-black/20 rounded-lg px-3 py-2">
                <span className="text-white/40">Email</span>
                <span className="text-white/70 truncate max-w-[180px]">{data.email}</span>
              </div>
            )}
            {data.phone && (
              <div className="flex justify-between bg-black/20 rounded-lg px-3 py-2">
                <span className="text-white/40">Téléphone</span>
                <span className="text-white/70">{data.phone}</span>
              </div>
            )}
            {data.domain && (
              <div className="flex justify-between bg-black/20 rounded-lg px-3 py-2">
                <span className="text-white/40">Domaine</span>
                <span className="text-white/70">{data.domain}</span>
              </div>
            )}
          </div>
        )}

        {data.base64Id && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-[8px] text-white/30 font-mono break-all">{data.base64Id}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Composant SearchGraph amélioré
const SearchGraph = ({ graphData, onNodeClick }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (graphData && graphData.nodes && graphData.edges) {
      setNodes(graphData.nodes);
      setEdges(graphData.edges);
      setIsInitialized(true);
    }
  }, [graphData, setNodes, setEdges]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  if (!isInitialized || !graphData) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-950/50 rounded-2xl border border-gray-800">
        <div className="text-gray-600 text-sm animate-pulse">Chargement du graphe...</div>
      </div>
    );
  }

  const nodeTypes = {
    queryNode: QueryNodeComponent,
    resultNode: ResultNodeComponent,
  };

  return (
    <div className="h-[600px] w-full rounded-2xl border border-gray-800 bg-gray-950 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(event, node) => onNodeClick && onNodeClick(node)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        attributionPosition="bottom-right"
        className="bg-gray-950"
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 2 },
        }}
      >
        <Background 
          color="rgba(255,255,255,0.05)" 
          gap={30} 
          size={1}
        />
        <Controls 
          className="!bg-gray-900/80 !border-gray-700 !rounded-lg !overflow-hidden !shadow-xl"
          style={{ 
            '--controls-button-bg': '#1a1a1a',
            '--controls-button-hover-bg': '#2a2a2a',
            '--controls-button-color': '#888',
          }}
        />
        <MiniMap
          className="!bg-gray-900/80 !border-gray-700 !rounded-lg"
          nodeColor={(node) => {
            if (node.type === 'queryNode') return '#8B5CF6';
            return '#6366F1';
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};

// Composant principal Searcher
const Searcher = () => {
  const { user } = useAuth();
  
  const [openMenus, setOpenMenus] = useState({ social: true, contact: true });
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 });
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchStats, setSearchStats] = useState(null);
  const [lastSearchTerms, setLastSearchTerms] = useState(null);
  
  const [socialFields, setSocialFields] = useState([
    { id: 1, platform: 'instagram', value: '', type: 'username' },
    { id: 2, platform: 'tiktok', value: '', type: 'username' },
    { id: 3, platform: 'discord', value: '', type: 'userId' },
    { id: 4, platform: 'whatsapp', value: '', type: 'phone' },
  ]);
  const [contactFields, setContactFields] = useState([
    { id: 1, field: 'email', value: '', label: 'Email' },
    { id: 2, field: 'telephone', value: '', label: 'Téléphone' },
  ]);

  useEffect(() => {
    let animationFrame;
    let time = 0;
    const animateGrid = () => {
      time += 0.001;
      setGridOffset({ x: Math.sin(time) * 20, y: Math.cos(time * 0.7) * 20 });
      animationFrame = requestAnimationFrame(animateGrid);
    };
    animationFrame = requestAnimationFrame(animateGrid);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const toggleMenu = (menu) => setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

  const addSocialField = () => {
    const platforms = ['instagram', 'tiktok', 'snapchat', 'discord', 'twitter', 'whatsapp'];
    const newPlatform = platforms[Math.floor(Math.random() * platforms.length)];
    const types = { instagram: 'username', tiktok: 'username', snapchat: 'username', discord: 'userId', twitter: 'username', whatsapp: 'phone' };
    setSocialFields([...socialFields, { id: Date.now(), platform: newPlatform, value: '', type: types[newPlatform] }]);
  };

  const removeSocialField = (id) => {
    if (socialFields.length > 1) setSocialFields(socialFields.filter(f => f.id !== id));
  };

  const updateSocialField = (id, value) => {
    setSocialFields(socialFields.map(f => f.id === id ? { ...f, value } : f));
  };

  const addContactField = () => {
    const fields = ['email', 'telephone', 'mobile'];
    const newField = fields[Math.floor(Math.random() * fields.length)];
    setContactFields([...contactFields, { id: Date.now(), field: newField, value: '', label: newField.charAt(0).toUpperCase() + newField.slice(1) }]);
  };

  const removeContactField = (id) => {
    if (contactFields.length > 1) setContactFields(contactFields.filter(f => f.id !== id));
  };

  const buildPayload = () => {
    const payload = {};
    contactFields.forEach(f => { if (f.value?.trim()) payload[f.field] = f.value.trim(); });
    socialFields.forEach(f => { if (f.value?.trim()) payload[`${f.platform}_${f.type}`] = f.value.trim(); });
    return payload;
  };

  const buildDbQuery = () => {
    const terms = [];
    socialFields.forEach(f => {
      if (f.value?.trim()) terms.push(f.value.trim());
    });
    contactFields.forEach(f => {
      if (f.value?.trim()) terms.push(f.value.trim());
    });
    return terms.filter(Boolean).join(' ');
  };

  const buildSocialInputs = () => {
    const inputs = [];
    socialFields.forEach(field => {
      if (!field.value?.trim()) return;
      const value = field.value.trim();
      const base = {
        platform: field.platform,
        type: field.platform,
        source: 'input',
        originalInput: value,
        displayName: value,
      };
      if (field.platform === 'whatsapp') {
        inputs.push({ ...base, platform: 'whatsapp', type: 'whatsapp', phone: normalizePhone(value) });
      } else if (field.platform === 'discord') {
        inputs.push({ ...base, platform: 'discord', type: 'discord', userId: value });
      } else if (field.platform === 'tiktok') {
        inputs.push({ ...base, platform: 'tiktok', type: 'tiktok', username: value });
      } else if (field.platform === 'instagram') {
        inputs.push({ ...base, platform: 'instagram', type: 'instagram', username: value });
      } else if (field.platform === 'snapchat') {
        inputs.push({ ...base, platform: 'snapchat', type: 'snapchat', username: value });
      } else {
        inputs.push(base);
      }
    });
    contactFields.forEach(field => {
      if (!field.value?.trim()) return;
      const value = field.value.trim();
      if (field.field === 'email') {
        inputs.push({ platform: 'email', type: 'email', source: 'input', originalInput: value, email: value, displayName: value });
      }
      if (field.field === 'telephone') {
        inputs.push({ platform: 'whatsapp', type: 'whatsapp', source: 'input', originalInput: value, phone: normalizePhone(value), displayName: normalizePhone(value) });
      }
    });
    return inputs;
  };

  const normalizePhone = (value) => {
    if (!value) return '';
    return value.replace(/[^0-9+]/g, '').replace(/^\+33/, '0');
  };

  const normalizeValue = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
  };

  const getIdentityKeys = (item) => {
    const keys = [];
    const emailInput = normalizeValue(item.email || item.originalInput || item.value);
    if (emailInput && emailInput.includes('@')) keys.push(`email:${emailInput}`);
    if (Array.isArray(item.emails)) {
      item.emails.forEach((email) => {
        const normalized = normalizeValue(email);
        if (normalized && normalized.includes('@')) keys.push(`email:${normalized}`);
      });
    }

    const phoneInput = normalizePhone(item.phone || item.whatsapp_phone || item.originalInput || item.value);
    if (phoneInput) keys.push(`phone:${phoneInput}`);
    if (Array.isArray(item.phones)) {
      item.phones.forEach((phone) => {
        const normalized = normalizePhone(phone);
        if (normalized) keys.push(`phone:${normalized}`);
      });
    }

    const discordId = normalizeValue(item.userId || item.discord_user_id || (item.platform === 'discord' ? item.originalInput : ''));
    if (discordId) keys.push(`discord:${discordId}`);
    if (Array.isArray(item.discordIds)) {
      item.discordIds.forEach((id) => {
        const normalized = normalizeValue(id);
        if (normalized) keys.push(`discord:${normalized}`);
      });
    }

    const discordTagArray = item.discordTags || (item.discordTag ? [item.discordTag] : []);
    discordTagArray.forEach((tag) => {
      const normalized = normalizeValue(tag);
      if (normalized) keys.push(`discordTag:${normalized}`);
    });

    const instagramArray = item.instagram || ((item.platform === 'instagram' || item.originalType === 'instagram') ? [item.username || item.originalInput || item.value] : []);
    instagramArray.forEach((handle) => {
      const normalized = normalizeValue(String(handle || '').replace(/^@/, ''));
      if (normalized) keys.push(`instagram:${normalized}`);
    });

    if (Array.isArray(item.instagram)) {
      item.instagram.forEach((handle) => {
        const normalized = normalizeValue(String(handle || '').replace(/^@/, ''));
        if (normalized) keys.push(`instagram:${normalized}`);
      });
    }

    const tiktokArray = item.tiktok || ((item.platform === 'tiktok' || item.originalType === 'tiktok') ? [item.username || item.originalInput || item.value] : []);
    tiktokArray.forEach((handle) => {
      const normalized = normalizeValue(String(handle || '').replace(/^@/, ''));
      if (normalized) keys.push(`tiktok:${normalized}`);
    });

    if (Array.isArray(item.tiktok)) {
      item.tiktok.forEach((handle) => {
        const normalized = normalizeValue(String(handle || '').replace(/^@/, ''));
        if (normalized) keys.push(`tiktok:${normalized}`);
      });
    }

    if (item.platform === 'email' && normalizeValue(item.originalInput || item.value)) {
      keys.push(`email:${normalizeValue(item.originalInput || item.value)}`);
    }

    return [...new Set(keys)];
  };

  const mergeProfileData = (profile, item) => {
    profile.source = profile.source || item.source || item.originalType || item.platform || 'input';
    profile.rowContent = `${profile.rowContent || ''}\n${item.rowContent || ''}`.trim();
    profile.prenom = profile.prenom || item.prenom;
    profile.nom = profile.nom || item.nom;
    profile.date_naissance = profile.date_naissance || item.date_naissance;
    profile.adresse = profile.adresse || item.adresse;
    profile.bio = profile.bio || item.bio;
    profile.profilePicture = profile.profilePicture || item.profilePicture || item.avatar;
    profile.url = profile.url || item.url;
    profile.followers = profile.followers || item.followers || item.followerCount || item.followersCount;
    profile.following = profile.following || item.following || item.followingCount;
    profile.posts = profile.posts || item.posts || item.postCount;

    const push = (list, value) => {
      if (!value) return;
      const normalized = typeof value === 'string' ? value.trim() : value;
      if (!list.includes(normalized)) list.push(normalized);
    };

    if (item.email) push(profile.emails, normalizeValue(item.email));
    if (item.phone) push(profile.phones, normalizePhone(item.phone));
    if (item.whatsapp_phone) push(profile.phones, normalizePhone(item.whatsapp_phone));
    if (item.userId) push(profile.discordIds, normalizeValue(item.userId));
    if (item.discord_user_id) push(profile.discordIds, normalizeValue(item.discord_user_id));
    if (item.discordTags) item.discordTags.forEach((tag) => push(profile.discordTags, normalizeValue(tag)));
    if (item.discordTag) push(profile.discordTags, normalizeValue(item.discordTag));
    if (Array.isArray(item.emails)) item.emails.forEach((email) => push(profile.emails, normalizeValue(email)));
    if (Array.isArray(item.phones)) item.phones.forEach((phone) => push(profile.phones, normalizePhone(phone)));
    if (Array.isArray(item.discordIds)) item.discordIds.forEach((id) => push(profile.discordIds, normalizeValue(id)));
    if (Array.isArray(item.instagram)) item.instagram.forEach((handle) => push(profile.instagram, normalizeValue(String(handle).replace(/^@/, ''))));
    if (Array.isArray(item.tiktok)) item.tiktok.forEach((handle) => push(profile.tiktok, normalizeValue(String(handle).replace(/^@/, ''))));
    if (item.username && (item.platform === 'instagram' || item.originalType === 'instagram')) push(profile.instagram, normalizeValue(item.username));
    if (item.username && (item.platform === 'tiktok' || item.originalType === 'tiktok')) push(profile.tiktok, normalizeValue(item.username));
    if (item.originalInput && item.platform === 'instagram') push(profile.instagram, normalizeValue(item.originalInput.replace(/^@/, '')));
    if (item.originalInput && item.platform === 'tiktok') push(profile.tiktok, normalizeValue(item.originalInput.replace(/^@/, '')));
    if (item.originalInput && item.platform === 'discord') push(profile.discordIds, normalizeValue(item.originalInput));
    if (item.originalInput && item.platform === 'whatsapp') push(profile.phones, normalizePhone(item.originalInput));
    if (item.originalInput && item.platform === 'email') push(profile.emails, normalizeValue(item.originalInput));

    if (!profile.displayName) {
      profile.displayName = item.displayName || item.username || item.email || item.phone || item.userId || item.originalInput || item.originalType || `Profil ${profile.id}`;
    }
    if (!profile.displayName && profile.prenom && profile.nom) {
      profile.displayName = `${profile.prenom} ${profile.nom}`;
    }
    if (!profile.displayName && profile.emails.length > 0) {
      profile.displayName = profile.emails[0];
    }
  };

  const parseDbProfiles = (rows) => {
    const profiles = [];

    const mergeIntoProfile = (profile, attrs) => {
      profile.rowContent = `${profile.rowContent || ''}\n${attrs.rowContent || ''}`.trim();
      profile.source = profile.source || attrs.source;
      profile.prenom = profile.prenom || attrs.prenom;
      profile.nom = profile.nom || attrs.nom;
      profile.date_naissance = profile.date_naissance || attrs.date_naissance;
      profile.adresse = profile.adresse || attrs.adresse;
      const push = (list, value) => {
        if (!value) return;
        const normalized = typeof value === 'string' ? value.trim() : value;
        if (!list.includes(normalized)) list.push(normalized);
      };
      attrs.emails?.forEach((email) => push(profile.emails, normalizeValue(email)));
      attrs.phones?.forEach((phone) => push(profile.phones, normalizePhone(phone)));
      attrs.instagram?.forEach((handle) => push(profile.instagram, normalizeValue(String(handle).replace(/^@/, ''))));
      attrs.tiktok?.forEach((handle) => push(profile.tiktok, normalizeValue(String(handle).replace(/^@/, ''))));
      attrs.discordIds?.forEach((id) => push(profile.discordIds, normalizeValue(id)));
      attrs.discordTags?.forEach((tag) => push(profile.discordTags, normalizeValue(tag)));
      profile.displayName = profile.displayName || `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.emails[0] || profile.phones[0] || profile.instagram[0] || profile.tiktok[0] || profile.discordIds[0] || profile.discordTags[0] || attrs.displayName || `Profil ${profile.rowId}`;
    };

    const makeRowProfile = (row) => {
      const content = String(row.content || '');
      const rowId = row.id ?? `${row.source || row.source_db}-${Math.random().toString(36).slice(2, 8)}`;
      const emails = [...new Set((content.match(/[\w.+-]+@[\w-]+\.[\w.-]+/gi) || []))].map((e) => normalizeValue(e));
      const phones = [...new Set((content.match(/(?:\+33|0)[1-9](?:[\s.-]*\d){8,}/g) || []))].map((raw) => normalizePhone(raw)).filter(Boolean);
      const instagram = [...new Set((content.match(/(?:instagram\.com\/(?:@)?|@)([A-Za-z0-9._]{3,})/gi) || []))].map((match) => normalizeValue(match.replace(/^(?:instagram\.com\/(?:@)?|@)/i, '').split(/[/?#]/)[0]));
      const tiktok = [...new Set((content.match(/(?:tiktok\.com\/(?:@)?|@)([A-Za-z0-9._]{3,})/gi) || []))].map((match) => normalizeValue(match.replace(/^(?:tiktok\.com\/(?:@)?|@)/i, '').split(/[/?#]/)[0]));
      const discordIds = [...new Set((content.match(/\b\d{17,19}\b/g) || []))];
      const discordTags = [...new Set((content.match(/[A-Za-z0-9_]{2,32}#\d{4}/g) || []))];
      return {
        platform: 'profile',
        type: 'profile',
        rowId,
        source: row.source || row.source_db,
        rowContent: content,
        emails,
        phones,
        instagram,
        tiktok,
        discordIds,
        discordTags,
        displayName: emails[0] || phones[0] || instagram[0] || tiktok[0] || discordIds[0] || discordTags[0] || `Profil ${rowId}`,
      };
    };

    const findMatch = (attrs) => {
      return profiles.find((profile) => {
        if (attrs.emails.some(email => profile.emails.includes(email))) return true;
        if (attrs.phones.some(phone => profile.phones.includes(phone))) return true;
        if (attrs.instagram.some(handle => profile.instagram.includes(handle))) return true;
        if (attrs.tiktok.some(handle => profile.tiktok.includes(handle))) return true;
        if (attrs.discordIds.some(id => profile.discordIds.includes(id))) return true;
        if (attrs.discordTags.some(tag => profile.discordTags.includes(tag))) return true;
        return false;
      });
    };

    rows.forEach((row) => {
      const attrs = makeRowProfile(row);
      const matched = findMatch(attrs);
      if (matched) {
        mergeIntoProfile(matched, attrs);
      } else {
        profiles.push(attrs);
      }
    });

    return profiles;
  };

  const buildGraph = (dbProfiles, socialInputs, enrichedProfiles, searchTerms) => {
    const nodes = [];
    const edges = [];

    const queryLabel = Object.entries(searchTerms || {}).map(([k, v]) => `${k}:${v}`).join(', ');
    nodes.push({
      id: 'query',
      type: 'queryNode',
      position: { x: 400, y: 50 },
      data: { label: queryLabel.substring(0, 50) + (queryLabel.length > 50 ? '...' : ''), query: queryLabel }
    });

    const identityMap = new Map();
    const profiles = [];

    const registerProfile = (item, sourceType) => {
      const keys = getIdentityKeys(item);
      let profile = keys.map((key) => identityMap.get(key)).find(Boolean);
      if (!profile) {
        const id = `profile_${profiles.length + 1}`;
        profile = {
          id,
          platform: 'profile',
          type: 'profile',
          emails: [],
          phones: [],
          instagram: [],
          tiktok: [],
          discordIds: [],
          discordTags: [],
          sources: [],
          platforms: [],
          rowContent: '',
          displayName: '',
        };
        profiles.push(profile);
      }
      mergeProfileData(profile, item);
      profile.sources.push(sourceType);
      if (item.platform && !profile.platforms.includes(item.platform)) profile.platforms.push(item.platform);
      keys.forEach((key) => identityMap.set(key, profile));
      return profile;
    };

    dbProfiles.forEach((profile) => registerProfile(profile, 'db'));
    socialInputs.forEach((input) => registerProfile(input, 'input'));
    enrichedProfiles.forEach((item) => registerProfile(item, 'enriched'));

    profiles.forEach((profile, index) => {
      const profileId = profile.id;
      profile.displayName = profile.displayName || profile.emails[0] || profile.phones[0] || profile.instagram[0] || profile.tiktok[0] || profile.discordIds[0] || profile.discordTags[0] || `Profil ${index + 1}`;
      profile.base64Id = btoa(profileId);

      nodes.push({
        id: profileId,
        type: 'resultNode',
        position: { x: 200 + (index % 3) * 400, y: 250 + Math.floor(index / 3) * 350 },
        data: profile,
      });

      edges.push({
        id: `edge_query_profile_${index}`,
        source: 'query',
        target: profileId,
        animated: true,
        type: 'smoothstep',
        style: { stroke: '#8B5CF6', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' },
      });
    });

    const addDetailNode = (item, kind, sourceIndex) => {
      const type = item.platform || item.type || kind;
      const nodeId = `${kind}_${type}_${sourceIndex}`;
      const nodeData = { ...item };
      nodeData.platform = type;
      nodeData.type = type;
      if (type === 'whatsapp') {
        nodeData.phone = nodeData.originalInput || nodeData.phone || nodeData.whatsapp_phone;
      }
      if (type === 'discord') {
        nodeData.userId = nodeData.originalInput || nodeData.userId || nodeData.discord_user_id;
      }
      nodeData.displayName = nodeData.displayName || nodeData.username || nodeData.handle || nodeData.email || nodeData.phone || nodeData.userId || nodeData.originalInput || `${type} ${sourceIndex + 1}`;
      nodeData.base64Id = btoa(nodeId);
      nodes.push({ 
        id: nodeId, 
        type: 'resultNode', 
        position: { x: 200 + (sourceIndex % 3) * 400, y: 250 + Math.floor(sourceIndex / 3) * 350 + 180 }, 
        data: nodeData 
      });

      const profile = registerProfile(item, kind);
      if (profile) {
        edges.push({
          id: `edge_${profile.id}_${nodeId}`,
          source: profile.id,
          target: nodeId,
          animated: false,
          type: 'smoothstep',
          style: { stroke: '#22c55e', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
        });
      }
    };

    socialInputs.forEach((input, idx) => addDetailNode(input, 'input', idx));
    enrichedProfiles.forEach((item, idx) => addDetailNode(item, 'enriched', idx));

    setGraphData({ nodes, edges });
    setSearchStats({ total: dbProfiles.length + socialInputs.length + enrichedProfiles.length, fromDb: dbProfiles.length, enriched: enrichedProfiles.length });
    setLastSearchTerms(searchTerms);
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    setGraphData(null);
    setSelectedProfile(null);
    
    const payload = buildPayload();
    const dbQuery = buildDbQuery();
    const searchTerms = { ...payload };
    
    if (Object.keys(payload).length === 0) {
      setError('Remplis au moins un champ de recherche');
      setIsSearching(false);
      return;
    }

    try {
      if (!user) throw new Error('Connecte-toi pour utiliser les recherches.');
      
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      
      let dbResults = [];
      if (dbQuery) {
        try {
          const response = await fetch('/api/sqlite/search', {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: dbQuery })
          });
          if (response.ok) {
            const data = await response.json();
            dbResults = data.results || [];
          } else {
            const errorBody = await response.text();
            console.warn('SQLite search failed:', response.status, errorBody);
          }
        } catch (dbErr) {
          console.warn('Erreur DB:', dbErr);
        }
      }
      
      const scrapeItems = [];

      socialFields.forEach(field => {
        if (!field.value?.trim()) return;
        const value = field.value.trim();
        scrapeItems.push({ platform: field.platform, value });
      });

      contactFields.forEach(field => {
        if (!field.value?.trim()) return;
        const value = field.value.trim();
        if (field.field === 'email') {
          scrapeItems.push({ platform: 'email', value });
        } else if (field.field === 'telephone') {
          scrapeItems.push({ platform: 'whatsapp', value });
        }
      });

      const enrichedResults = scrapeItems.length > 0
        ? await OnlineEnrichmentService.batch(scrapeItems, token)
        : [];

      const validEnriched = enrichedResults.filter(r => r && !r.error);
      const dbProfiles = parseDbProfiles(dbResults);
      const socialInputs = buildSocialInputs();

      buildGraph(dbProfiles, socialInputs, validEnriched, searchTerms);
      
    } catch (err) {
      setError(err.message);
      
      const searchTerms = buildPayload();
      buildGraph([], [], [], searchTerms);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="searcher-page min-h-screen bg-black text-white overflow-hidden">
      <style>{`
        .searcher-page { filter: grayscale(1); color-scheme: dark; }
        .searcher-page input,
        .searcher-page button,
        .searcher-page select { color-scheme: dark; }
      `}</style>
      {/* Fond animé amélioré */}
      <div 
        className="fixed inset-0 pointer-events-none transition-transform duration-100 ease-out"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.025) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.015) 0%, transparent 50%),
            linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 60px 60px, 60px 60px',
          transform: `translate(${gridOffset.x}px, ${gridOffset.y}px)`,
        }}
      />
      
      {/* Effet de lueur en arrière-plan */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-white/[0.015] rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-8 z-10">
        {/* Header amélioré */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link to="/" className="text-gray-600 hover:text-gray-400 text-sm inline-block mb-3 transition-colors">
              ← Retour
            </Link>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Recherche Avancée
            </h1>
            <p className="text-gray-500 mt-2 text-sm">Explorez et visualisez les connexions entre les profils</p>
          </div>
          {user && (
            <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-400">{user.email || user.username}</span>
            </div>
          )}
        </div>

        {/* Zone de recherche redessinée */}
        <div className="space-y-4 mb-8">
          {/* Catégorie SOCIAL */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <button onClick={() => toggleMenu('social')} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-white">Réseaux Sociaux</span>
                  <span className="ml-2 text-xs text-gray-500">{socialFields.length} plateforme(s)</span>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${openMenus.social ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`transition-all duration-300 overflow-hidden ${openMenus.social ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-5 pt-0 border-t border-gray-800">
                <div className="space-y-3">
                  {socialFields.map((field) => (
                    <div key={field.id} className="flex gap-3">
                      <div className="w-32 px-4 py-3 text-sm text-gray-400 bg-gray-800/50 rounded-xl border border-gray-700 font-medium">
                        {field.platform}
                      </div>
                      <input
                        type="text"
                        placeholder={field.type === 'userId' ? "ID Discord" : field.type === 'phone' ? "Numéro WhatsApp" : `@${field.platform}`}
                        value={field.value}
                        onChange={(e) => updateSocialField(field.id, e.target.value)}
                        className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      />
                      {socialFields.length > 1 && (
                        <button onClick={() => removeSocialField(field.id)} className="px-3 text-gray-600 hover:text-red-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addSocialField} className="mt-4 text-sm text-gray-500 hover:text-purple-400 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter un réseau social
                </button>
              </div>
            </div>
          </div>

          {/* Catégorie CONTACT */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <button onClick={() => toggleMenu('contact')} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-white">Contact</span>
                  <span className="ml-2 text-xs text-gray-500">{contactFields.length} moyen(s)</span>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${openMenus.contact ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`transition-all duration-300 overflow-hidden ${openMenus.contact ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-5 pt-0 border-t border-gray-800">
                <div className="space-y-3">
                  {contactFields.map((field) => (
                    <div key={field.id} className="flex gap-3">
                      <input
                        type={field.field === 'email' ? 'email' : 'tel'}
                        placeholder={field.label}
                        value={field.value}
                        onChange={(e) => setContactFields(contactFields.map(f => f.id === field.id ? { ...f, value: e.target.value } : f))}
                        className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                      />
                      {contactFields.length > 1 && (
                        <button onClick={() => removeContactField(field.id)} className="px-3 text-gray-600 hover:text-red-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addContactField} className="mt-4 text-sm text-gray-500 hover:text-green-400 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter un moyen de contact
                </button>
              </div>
            </div>
          </div>

          {/* Bouton de recherche amélioré */}
          <button 
            onClick={handleSearch} 
            disabled={!user || isSearching} 
            className="w-full py-4 bg-white/10 border border-white/20 rounded-2xl text-sm font-semibold text-white hover:bg-white/15 hover:shadow-[0_0_30px_rgba(255,255,255,0.12)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-2xl"
          >
            {isSearching ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recherche en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Lancer la recherche
              </>
            )}
          </button>
          
          {!user && (
            <div className="text-sm text-white/60 text-center bg-white/[0.04] border border-white/10 rounded-xl py-3">
              Connecte-toi pour utiliser la recherche
            </div>
          )}
        </div>

        {/* Message d'erreur amélioré */}
        {error && (
          <div className="bg-white/[0.04] border border-white/15 rounded-xl p-4 mb-6 text-white/70 text-sm text-center backdrop-blur-xl">
            {error}
          </div>
        )}

        {/* Statistiques améliorées */}
        {searchStats && (
          <div className="mb-6 flex gap-4 text-sm justify-center">
            <span className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2">
              <span className="text-white font-semibold">{searchStats.total}</span> <span className="text-gray-500">résultat(s)</span>
            </span>
            <span className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2">
              <span className="text-white font-semibold">{searchStats.fromDb}</span> <span className="text-gray-500">depuis la DB</span>
            </span>
            <span className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2">
              <span className="text-white font-semibold">{searchStats.enriched}</span> <span className="text-gray-500">enrichis en ligne</span>
            </span>
          </div>
        )}

        {/* Requête affichée */}
        {lastSearchTerms && (
          <div className="mb-6">
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-4 backdrop-blur-xl">
              <div className="font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Requête
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(lastSearchTerms).length === 0 && (
                  <div className="text-gray-600">Aucun champ renseigné</div>
                )}
                {Object.entries(lastSearchTerms).map(([k, v]) => (
                  <div key={k} className="bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-1.5 text-sm">
                    <span className="text-gray-500 mr-2">{k}:</span>
                    <span className="text-white font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Visualisation du graphe améliorée */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-purple-400 blur-md animate-pulse" />
              </div>
              <span className="text-base font-semibold text-purple-300">Visualisation du graphe</span>
              {searchStats && <span className="text-sm text-gray-500">{searchStats.total} résultat(s)</span>}
            </div>
            <div className="text-xs text-gray-600 hidden md:block">
              Cliquez sur un nœud pour voir les détails • Déplacez les nœuds pour explorer
            </div>
          </div>
          <ReactFlowProvider>
            <SearchGraph graphData={graphData || { nodes: [], edges: [] }} onNodeClick={(node) => setSelectedProfile(node.data)} />
          </ReactFlowProvider>
        </div>

        {/* Détails du profil sélectionné amélioré */}
        {selectedProfile && (
          <div className="mt-6 p-6 bg-gray-900/30 border border-gray-800 rounded-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Détails du profil</h3>
              <button onClick={() => setSelectedProfile(null)} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre className="text-xs text-gray-400 overflow-auto max-h-96 p-4 bg-black/50 rounded-xl border border-gray-800">
              {JSON.stringify(selectedProfile, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Searcher;