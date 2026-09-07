import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const FacturesPage = () => {
  const { user } = useAuth();
  const { isWhite, isLight, isDark } = useTheme();
  const gridRef = useRef(null);
  
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLot, setFilterLot] = useState('all');

  
  useEffect(() => {
    const handleMove = (e) => {
      if (!gridRef.current) return;
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      gridRef.current.style.backgroundPosition = `${x}% ${y}%`;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  
  const Icons = {
    file: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3v4a1 1 0 001 1h4" />
      </svg>
    ),
    search: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    close: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    eye: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    download: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    folder: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    spinner: (
      <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
    arrow: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    )
  };

  useEffect(() => {
    const loadFactures = async () => {
      try {
        const response = await fetch('/api/factures');
        if (!response.ok) {
          throw new Error('Erreur chargement');
        }
        const data = await response.json();
        setFactures(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erreur chargement:', error);
        setFactures([]);
      } finally {
        setLoading(false);
      }
    };
    loadFactures();
  }, []);

  const filteredFactures = Array.isArray(factures) ? factures.filter(f => {
    const matchSearch = f.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLot = filterLot === 'all' || f.lot === filterLot;
    return matchSearch && matchLot;
  }) : [];

  const groupedFactures = {
    'lot 1': filteredFactures.filter(f => f.lot === 'lot 1'),
    'lot 2': filteredFactures.filter(f => f.lot === 'lot 2'),
    'lot 3': filteredFactures.filter(f => f.lot === 'lot 3'),
  };

  const getLotAccent = (lot) => {
    switch(lot) {
      case 'lot 1': return 'from-blue-500 to-blue-600';
      case 'lot 2': return 'from-purple-500 to-purple-600';
      case 'lot 3': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getLotColor = (lot) => {
    switch(lot) {
      case 'lot 1': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'lot 2': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'lot 3': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className={`relative min-h-screen w-full overflow-hidden transition-all duration-300 ${
      isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'
    }`}>
      {/* GRILLE ANIMEE */}
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage: `
            linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* VIGNETTE */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />

      {/* CONTENU */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        
        {/* HEADER RETOUR */}
        <div className="mb-8">
          <Link to="/" className={`group inline-flex items-center gap-2 transition text-sm ${
            isWhite ? 'text-black/50 hover:text-black' : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-white/50 hover:text-white'
          }`}>
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à l'accueil
          </Link>
        </div>

        {/* CARTE PRINCIPALE */}
        <div className={`rounded-3xl border backdrop-blur-xl overflow-hidden ${
          isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'
        }`}>
          
          {/* HEADER */}
          <div className={`border-b p-6 ${
            isWhite ? 'border-black/10' : isLight ? 'border-gray-200' : 'border-white/[0.06]'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center">
                  {Icons.folder}
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Factures</h1>
                  <p className={`text-sm ${isWhite ? 'text-black/50' : isLight ? 'text-gray-500' : 'text-white/50'}`}>
                    {factures.length} documents disponibles
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-4 py-2 pl-10 rounded-xl border focus:outline-none transition text-sm ${
                      isWhite 
                        ? 'border-black/10 bg-black/5 text-black focus:border-black/30 placeholder-black/30' 
                        : isLight
                        ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400 placeholder-gray-400'
                        : 'border-white/[0.08] bg-white/5 text-white focus:border-white/20 placeholder-white/30'
                    }`}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">
                    {Icons.search}
                  </div>
                </div>
                
                <select
                  value={filterLot}
                  onChange={(e) => setFilterLot(e.target.value)}
                  className={`px-4 py-2 rounded-xl border focus:outline-none transition text-sm cursor-pointer ${
                    isWhite 
                      ? 'border-black/10 bg-black/5 text-black focus:border-black/30' 
                      : isLight
                      ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400'
                      : 'border-white/[0.08] bg-white/5 text-white focus:border-white/20'
                  }`}
                >
                  <option value="all">Tous les lots</option>
                  <option value="lot 1">Lot 1</option>
                  <option value="lot 2">Lot 2</option>
                  <option value="lot 3">Lot 3</option>
                </select>
              </div>
            </div>
          </div>

          {/* CONTENU FACTURES */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                {Icons.spinner}
              </div>
            ) : (
              <div className="space-y-10">
                {/* Lot 1 */}
                {groupedFactures['lot 1'].length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-1 h-8 bg-gradient-to-b ${getLotAccent('lot 1')} rounded-full`}></div>
                      <h2 className="text-xl font-semibold">Lot 1</h2>
                      <span className={`text-xs ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
                        {groupedFactures['lot 1'].length} facture{groupedFactures['lot 1'].length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedFactures['lot 1'].map((facture) => (
                        <div
                          key={facture.id}
                          onClick={() => setSelectedFacture(facture)}
                          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                            isWhite 
                              ? 'border-black/10 bg-black/5 hover:bg-black/10' 
                              : isLight
                              ? 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                              : 'border-white/[0.06] bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg ${getLotColor('lot 1')}`}>
                                  {Icons.file}
                                </div>
                                <h3 className="font-medium text-sm line-clamp-2">{facture.nom}</h3>
                              </div>
                              <div className={`text-xs ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
                                {(facture.taille / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="p-1.5 rounded-lg bg-white/10">
                                {Icons.eye}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {groupedFactures['lot 2'].length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-1 h-8 bg-gradient-to-b ${getLotAccent('lot 2')} rounded-full`}></div>
                      <h2 className="text-xl font-semibold">Lot 2</h2>
                      <span className={`text-xs ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
                        {groupedFactures['lot 2'].length} facture{groupedFactures['lot 2'].length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedFactures['lot 2'].map((facture) => (
                        <div
                          key={facture.id}
                          onClick={() => setSelectedFacture(facture)}
                          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                            isWhite 
                              ? 'border-black/10 bg-black/5 hover:bg-black/10' 
                              : isLight
                              ? 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                              : 'border-white/[0.06] bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg ${getLotColor('lot 2')}`}>
                                  {Icons.file}
                                </div>
                                <h3 className="font-medium text-sm line-clamp-2">{facture.nom}</h3>
                              </div>
                              <div className={`text-xs ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
                                {(facture.taille / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="p-1.5 rounded-lg bg-white/10">
                                {Icons.eye}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {groupedFactures['lot 3'].length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-1 h-8 bg-gradient-to-b ${getLotAccent('lot 3')} rounded-full`}></div>
                      <h2 className="text-xl font-semibold">Lot 3</h2>
                      <span className={`text-xs ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
                        {groupedFactures['lot 3'].length} facture{groupedFactures['lot 3'].length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedFactures['lot 3'].map((facture) => (
                        <div
                          key={facture.id}
                          onClick={() => setSelectedFacture(facture)}
                          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                            isWhite 
                              ? 'border-black/10 bg-black/5 hover:bg-black/10' 
                              : isLight
                              ? 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                              : 'border-white/[0.06] bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg ${getLotColor('lot 3')}`}>
                                  {Icons.file}
                                </div>
                                <h3 className="font-medium text-sm line-clamp-2">{facture.nom}</h3>
                              </div>
                              <div className={`text-xs ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
                                {(facture.taille / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="p-1.5 rounded-lg bg-white/10">
                                {Icons.eye}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredFactures.length === 0 && !loading && (
                  <div className={`text-center py-20 ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Aucune facture trouvée</p>
                    <p className="text-sm mt-1">Essayez de modifier votre recherche</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedFacture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div>
                <h3 className="font-semibold text-white">{selectedFacture.nom}</h3>
                <p className="text-xs text-white/50">{selectedFacture.lot}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={selectedFacture.chemin}
                  download
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white backdrop-blur-sm"
                >
                  {Icons.download}
                </a>
                <button
                  onClick={() => setSelectedFacture(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white backdrop-blur-sm"
                >
                  {Icons.close}
                </button>
              </div>
            </div>
            
            <iframe
              src={selectedFacture.chemin}
              className="w-full h-full bg-white"
              title={selectedFacture.nom}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturesPage;