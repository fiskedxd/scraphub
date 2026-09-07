import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const Logs = () => {
  const { isWhite, isLight } = useTheme();
  const gridRef = useRef(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [fileDetails, setFileDetails] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [stats, setStats] = useState(null);
  
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
    search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    spinner: <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />,
    file: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    folder: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    mail: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    phone: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
    back: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    external: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />,
    arrowRight: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />,
    database: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1.79 4 4 4h8c2.21 0 4-2 4-4V7M4 7c0-2 1.79-4 4-4h8c2.21 0 4 2 4 4M4 7c0 2 1.79 3 4 3h8c2.21 0 4-1 4-3M8 3v18m4-18v18" />,
    logs: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />,
    copy: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />,
    eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    alert: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
  };

  const searchInLogsTxt = async (term) => {
    try {
      const response = await fetch('/api/search-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: term.toLowerCase() })
      });
      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.error('Search logs error:', err);
      return [];
    }
  };

  const searchInDB = async (term) => {
    try {
      const response = await fetch('/api/sqlite/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: term, 
          exactMatch: false,
          limit: 500 
        })
      });
      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.error('DB search error:', err);
      return [];
    }
  };

  const getFileLines = async (fileName) => {
    setLoadingFile(true);
    try {
      const response = await fetch('/api/get-file-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: fileName,
          filter: searchTerm.toLowerCase()
        })
      });
      const data = await response.json();
      setFileDetails(data);
      setSelectedFile(fileName);
    } catch (err) {
      console.error('Get file lines error:', err);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) return;
    
    setIsSearching(true);
    setResults([]);
    setStats(null);
    setFileDetails(null);
    setSelectedFile(null);
    
    try {
      
      const [logsResults, dbResults] = await Promise.all([
        searchInLogsTxt(term),
        searchInDB(term)
      ]);
      
      
      const fileMap = {};
      
      
      logsResults.forEach(log => {
        const fileName = log.file || 'Logs.txt';
        if (!fileMap[fileName]) {
          fileMap[fileName] = {
            fileName: fileName,
            source: 'logstxt',
            lines: [],
            count: 0
          };
        }
        fileMap[fileName].lines.push(log);
        fileMap[fileName].count++;
      });
      
      
      dbResults.forEach(record => {
        const source = record.source_db || record.source || 'database';
        if (!fileMap[source]) {
          fileMap[source] = {
            fileName: source,
            source: 'database',
            lines: [],
            count: 0
          };
        }
        fileMap[source].lines.push({
          line: record.content || JSON.stringify(record),
          row: record.row,
          file: source
        });
        fileMap[source].count++;
      });
      
      const groupedResults = Object.values(fileMap).sort((a, b) => b.count - a.count);
      setResults(groupedResults);
      
      const totalHits = groupedResults.reduce((sum, f) => sum + f.count, 0);
      setStats({
        totalHits,
        totalFiles: groupedResults.length,
        logstxtHits: logsResults.length,
        dbHits: dbResults.length
      });
      
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const highlightTerm = (text, term) => {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) 
        ? <mark key={i} className="bg-purple-500/30 text-purple-300 px-0.5 rounded">{part}</mark>
        : part
    );
  };

  return (
    <div className={`relative min-h-screen w-full overflow-hidden ${isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'}`}>
      <div ref={gridRef} className="absolute inset-0 opacity-[0.2]" style={{
        backgroundImage: `linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px), linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="group inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {Icons.back}
            </svg>
            Retour
          </Link>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
            Logs Search
          </h1>
          <p className="text-white/30 mt-2 text-sm">Recherche dans Logs.txt + Base de donnees</p>
        </div>
        
        {/* Barre de recherche */}
        <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 mb-8">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/5 text-white placeholder-white/20 focus:border-white/20 focus:outline-none text-lg"
                placeholder="Email ou numero de telephone..."
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="px-8 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-medium hover:bg-purple-500/30 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">{Icons.spinner}</svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.search}</svg>
              )}
              {isSearching ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-black/50 backdrop-blur-xl rounded-xl border border-white/[0.08] p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.totalHits}</p>
              <p className="text-white/40 text-sm">Occurrences</p>
            </div>
            <div className="bg-black/50 backdrop-blur-xl rounded-xl border border-white/[0.08] p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.totalFiles}</p>
              <p className="text-white/40 text-sm">Fichiers</p>
            </div>
            <div className="bg-black/50 backdrop-blur-xl rounded-xl border border-white/[0.08] p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{stats.logstxtHits}</p>
              <p className="text-white/40 text-sm">Dans Logs.txt</p>
            </div>
            <div className="bg-black/50 backdrop-blur-xl rounded-xl border border-white/[0.08] p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{stats.dbHits}</p>
              <p className="text-white/40 text-sm">Dans la DB</p>
            </div>
          </div>
        )}
        
        {/* Résultats */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Liste des fichiers */}
            <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.folder}</svg>
                  Fichiers ({results.length})
                </h2>
              </div>
              <div className="divide-y divide-white/[0.06] max-h-[600px] overflow-y-auto">
                {results.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => getFileLines(file.fileName)}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      selectedFile === file.fileName
                        ? 'bg-purple-500/20 border-l-4 border-purple-500'
                        : 'hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          file.source === 'logstxt' ? 'bg-green-500/20' : 'bg-blue-500/20'
                        }`}>
                          <svg className={`w-5 h-5 ${file.source === 'logstxt' ? 'text-green-400' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {file.source === 'logstxt' ? Icons.logs : Icons.database}
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white truncate max-w-[200px]">{file.fileName}</p>
                          <p className="text-xs text-white/30">
                            {file.source === 'logstxt' ? 'Logs.txt' : 'Base de donnees'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-purple-400">{file.count}</span>
                        <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.arrowRight}</svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Détails du fichier sélectionné */}
            <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden">
              {loadingFile ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <svg className="w-10 h-10 animate-spin text-purple-400 mb-4" fill="none" viewBox="0 0 24 24">{Icons.spinner}</svg>
                  <p className="text-white/40">Chargement...</p>
                </div>
              ) : fileDetails ? (
                <div>
                  <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.file}</svg>
                        {selectedFile}
                      </h3>
                      <p className="text-white/40 text-xs mt-1">
                        {fileDetails.totalLines} lignes · {fileDetails.matchingLines} avec "{searchTerm}"
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(fileDetails.lines.map(l => l.content).join('\n'))}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-xs flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.copy}</svg>
                      Copier
                    </button>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    {fileDetails.lines.map((line, idx) => (
                      <div key={idx} className="px-4 py-2 border-b border-white/[0.04] hover:bg-white/[0.02] font-mono text-sm">
                        <span className="text-white/20 mr-3 text-xs">{line.lineNumber}</span>
                        <span className="text-white/70">{highlightTerm(line.content, searchTerm)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <svg className="w-16 h-16 text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.eye}</svg>
                  <p className="text-white/40">Selectionnez un fichier</p>
                  <p className="text-white/20 text-sm mt-1">Cliquez sur un fichier pour voir son contenu</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Pas de résultats */}
        {!isSearching && results.length === 0 && stats === null && (
          <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.search}</svg>
            <p className="text-white/40">Recherchez un email ou un numero</p>
            <p className="text-white/20 text-sm mt-1">Les resultats apparaîtront ici</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;