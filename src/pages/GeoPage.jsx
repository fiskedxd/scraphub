import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Icons = {
  back: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  upload: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  copy: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  map: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  layers: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  spinner: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};

const GeoIntPage = () => {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#080808] text-white flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_48%)]" />
      <section className="relative z-10 max-w-lg text-center">
        <div className="mx-auto mb-8 h-32 w-32 flex items-center justify-center">
          <svg className="hammer-animation h-28 w-28" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path d="M35 76L69 42" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            <path d="M62 32L77 17L103 43L88 58L62 32Z" fill="currentColor" />
            <path d="M28 84L36 92" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            <path d="M22 101L31 92" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M13 101H47" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Page en cours de développement</h1>
        <p className="mt-3 text-sm text-white/50">L'analyse GeoIntelligence sera bientôt disponible.</p>
      </section>
      <style>{`
        .hammer-animation {
          transform-origin: 62% 42%;
          animation: hammer-strike 1.15s ease-in-out infinite;
          color: rgb(103 232 249);
        }
        @keyframes hammer-strike {
          0%, 100% { transform: rotate(18deg); }
          42% { transform: rotate(-28deg); }
          58% { transform: rotate(18deg); }
        }
      `}</style>
    </main>
  );

  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [searchRadius, setSearchRadius] = useState('global');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasRights, setHasRights] = useState(false);
  const [keepHistory, setKeepHistory] = useState(false);
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  
  const [quota, setQuota] = useState(null);
  const [quotaError, setQuotaError] = useState(null);

  const countries = [
    { code: 'FR', name: 'France' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'PT', name: 'Portugal' },
    { code: 'BE', name: 'Belgium' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'BR', name: 'Brazil' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
  ];

  const regions = {
    FR: ['Île-de-France', 'Val-d\'Oise', 'Seine-et-Marne', 'Yvelines', 'Essonne', 'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne', 'Paris'],
    US: ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington'],
    GB: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow'],
    DE: ['Berlin', 'Bavaria', 'Hesse', 'North Rhine-Westphalia', 'Baden-Württemberg'],
    IT: ['Lombardy', 'Lazio', 'Campania', 'Veneto', 'Tuscany'],
    ES: ['Madrid', 'Catalonia', 'Andalusia', 'Valencia', 'Basque Country']
  };

  const fetchQuota = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setQuota(null);
      return;
    }
    try {
      const response = await fetch('/api/auth/quota', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setQuota(data);
        setQuotaError(null);
      } else {
        setQuota(null);
        setQuotaError(data.error || 'Unable to fetch quota');
      }
    } catch (err) {
      setQuota(null);
      setQuotaError(err.message || 'Unable to fetch quota');
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [user]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('Image size must be less than 20MB');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
    setResults(null);
    setShowResults(false);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResults(null);
    setShowResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (validTypes.includes(file.type)) {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target.result);
        };
        reader.readAsDataURL(file);
        setResults(null);
        setShowResults(false);
      }
    }
  };

  const runAnalysis = async () => {
    if (!selectedImage) {
      alert('Please select an image to analyze');
      return;
    }

    if (!acceptedTerms) {
      alert('Please accept the terms and conditions');
      return;
    }

    if (!hasRights) {
      alert('Please confirm you have the rights to upload this image');
      return;
    }

    if (!user) {
      alert('Please log in to use GeoInt analysis');
      return;
    }

    setIsAnalyzing(true);
    setResults(null);
    setShowResults(false);
    setAnalysisProgress({ step: 'upload', progress: 10 });

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('radius', searchRadius);
      if (selectedCountry) formData.append('country', selectedCountry);
      if (selectedRegion) formData.append('region', selectedRegion);
      formData.append('keepHistory', keepHistory);

      setAnalysisProgress({ step: 'preprocessing', progress: 25 });

      const token = localStorage.getItem('token');
      const response = await fetch('/api/geoint/analyze', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      setAnalysisProgress({ step: 'feature_extraction', progress: 50 });

      const data = await response.json();

      setAnalysisProgress({ step: 'matching', progress: 75 });

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysisProgress({ step: 'results', progress: 100 });
      setResults(data);
      setShowResults(true);
      await fetchQuota();

    } catch (error) {
      alert('Analysis error: ' + error.message);
      setResults({ error: error.message });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const mockResults = {
    top1: {
      lat: 48.8566,
      lon: 2.3522,
      city: 'Paris',
      country: 'France',
      region: 'Île-de-France',
      score: 94.7,
      radius: '500m',
      confidence: 'high'
    },
    top2: {
      lat: 48.8738,
      lon: 2.2950,
      city: 'Paris 8e',
      country: 'France',
      region: 'Île-de-France',
      score: 82.3,
      radius: '1.2km',
      confidence: 'medium'
    },
    top3: {
      lat: 48.8566,
      lon: 2.3522,
      city: 'Paris 1er',
      country: 'France',
      region: 'Île-de-France',
      score: 71.8,
      radius: '2.5km',
      confidence: 'medium'
    },
    visualFeatures: {
      vegetation: 'urban',
      weather: 'sunny',
      architecture: 'haussmanian',
      objects: ['lamp post', 'building', 'car'],
      ocr: ['RUE DE RIVOLI', 'PARIS']
    },
    neighbors: 238,
    geoCluster: 'France / Île-de-France / Paris'
  };

  const ConfidenceBadge = ({ confidence }) => {
    const colors = {
      high: 'border-green-500 bg-green-500/10 text-green-300',
      medium: 'border-yellow-500 bg-yellow-500/10 text-yellow-300',
      low: 'border-orange-500 bg-orange-500/10 text-orange-300'
    };
    return (
      <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${colors[confidence] || colors.low}`}>
        {confidence}
      </span>
    );
  };

  const ResultCard = ({ result, rank }) => {
    if (!result || typeof result !== 'object') return null;
    
    const city = String(result.city || 'Unknown');
    const country = String(result.country || 'Unknown');
    const region = String(result.region || 'Unknown');
    const score = typeof result.score === 'number' ? result.score : 0;
    const radius = String(result.radius || 'unknown');
    const lat = typeof result.lat === 'number' ? result.lat : 0;
    const lon = typeof result.lon === 'number' ? result.lon : 0;
    const confidence = String(result.confidence || 'low');

    return (
      <div 
        onClick={() => { setSelectedResult(result); setShowResultModal(true); }}
        className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] cursor-pointer transition group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white/30">#{rank}</span>
            <span className="text-white font-semibold">{city}</span>
            <span className="text-white/40 text-sm">{country}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-300">{score}%</span>
            <ConfidenceBadge confidence={confidence} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-white/50">
          <span>Region: {region}</span>
          <span>Radius: {radius}</span>
          <span className="font-mono text-white/30">{lat}, {lon}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-white/30 group-hover:text-white/60 transition">
          {Icons.target}
          <span>Click for details</span>
        </div>
      </div>
    );
  };

  const ResultModal = ({ result, onClose }) => {
    if (!result) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div className="bg-black/95 border border-white/[0.15] rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">Location Details</h3>
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition">
              {Icons.close}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">City</div>
                <div className="text-white text-lg font-semibold">{result.city}</div>
                <div className="text-white/50 text-sm">{result.country}</div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Coordinates</div>
                <div className="text-white font-mono text-sm">{result.lat}</div>
                <div className="text-white font-mono text-sm">{result.lon}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Score</div>
                <div className="text-2xl font-bold text-cyan-300">{result.score}%</div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Radius</div>
                <div className="text-white text-lg">{result.radius}</div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Confidence</div>
                <ConfidenceBadge confidence={result.confidence} />
              </div>
            </div>
            
            {results?.visualFeatures && (
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Visual Features</div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-white/60">
                    Vegetation: {results.visualFeatures.vegetation}
                  </span>
                  <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-white/60">
                    Weather: {results.visualFeatures.weather}
                  </span>
                  <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-white/60">
                    Architecture: {results.visualFeatures.architecture}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {results.visualFeatures.objects?.map((obj, i) => (
                    <span key={i} className="text-xs bg-cyan-500/10 px-2 py-0.5 rounded text-cyan-300">
                      {obj}
                    </span>
                  ))}
                </div>
                {results.visualFeatures.ocr?.length > 0 && (
                  <div className="mt-2">
                    <div className="text-white/30 text-xs">OCR detected:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {results.visualFeatures.ocr.map((text, i) => (
                        <span key={i} className="text-xs bg-yellow-500/10 px-2 py-0.5 rounded text-yellow-300 font-mono">
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06] text-sm text-white/40">
              <div className="grid grid-cols-2 gap-2">
                <span>Neighbors: {results?.neighbors || 'N/A'}</span>
                <span>Cluster: {results?.geoCluster || 'N/A'}</span>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); }} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition flex items-center justify-center gap-2 text-sm">
                {Icons.copy} Copy Data
              </button>
              <button className="flex-1 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition flex items-center justify-center gap-2 text-sm">
                {Icons.map} View on Map
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] z-0" style={{ 
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(0, 150, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(100, 0, 255, 0.3) 0%, transparent 50%)` 
      }} />
      
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ 
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "80px 80px" 
      }} />
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/80 to-black/95 z-5" />

      <div className="relative z-20 max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to="/" className="group inline-flex items-center gap-2 text-white/40 hover:text-white transition text-sm">
            {Icons.back} Back
          </Link>
          <div className="flex items-center justify-between mt-3">
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
                GeoIntelligence
              </h1>
              <p className="text-white/30 mt-1 text-sm">Global geo-estimation · Visual location intelligence</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span>Credits: <span className="text-white">{quota?.remaining || 0}</span></span>
              {user && <span className="text-white/30">|</span>}
              {user && <span className="text-white/50">{quota?.planLabel || user.accountType || 'FREE'}</span>}
            </div>
          </div>
        </div>

        <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-white/50 text-xs uppercase tracking-wider">Image Upload</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div 
            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all ${
              imagePreview ? 'border-cyan-500/30 bg-white/[0.02]' : 'border-white/[0.08] hover:border-white/20 bg-white/[0.02]'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-[300px] mx-auto rounded-lg object-contain"
                />
                <button 
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 text-white/60 hover:text-white transition"
                >
                  {Icons.close}
                </button>
                <div className="mt-3 text-center text-white/40 text-xs">
                  {selectedImage?.name} · {(selectedImage?.size / 1024).toFixed(0)} KB
                </div>
                <div className="mt-2 text-center">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-white/30 hover:text-white/60 transition underline-offset-2 underline"
                  >
                    Replace image
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  {Icons.upload}
                </div>
                <p className="text-white/60 text-sm">Drop your image here or click to browse</p>
                <p className="text-white/30 text-xs mt-1">JPG · PNG · WEBP · Max 20MB</p>
              </div>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/jpeg,image/png,image/webp,image/jpg" 
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-white/50 text-xs uppercase tracking-wider">Search Parameters</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/40 text-xs mb-1.5">Search Radius</label>
              <select 
                value={searchRadius}
                onChange={(e) => setSearchRadius(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-black/40 text-white text-sm focus:border-white/20 focus:outline-none appearance-none"
              >
                <option value="global">Global</option>
                <option value="continent">Continent</option>
                <option value="country">Country</option>
                <option value="region">Region</option>
                <option value="city">City</option>
              </select>
            </div>
            <div>
              <label className="block text-white/40 text-xs mb-1.5">Country Filter</label>
              <select 
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedRegion('');
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-black/40 text-white text-sm focus:border-white/20 focus:outline-none appearance-none"
              >
                <option value="">All Countries</option>
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/40 text-xs mb-1.5">Region / State</label>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                disabled={!selectedCountry || !regions[selectedCountry]}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-black/40 text-white text-sm focus:border-white/20 focus:outline-none appearance-none disabled:opacity-40"
              >
                <option value="">All Regions</option>
                {selectedCountry && regions[selectedCountry]?.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
            className="mt-3 text-xs text-white/30 hover:text-white/60 transition flex items-center gap-1"
          >
            {showAdditionalFilters ? 'Hide' : 'Show'} additional filters
          </button>

          {showAdditionalFilters && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/40 text-xs mb-1.5">Min Confidence</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-black/40 text-white text-sm focus:border-white/20 focus:outline-none appearance-none">
                  <option value="0">Any</option>
                  <option value="70">High (&gt;70%)</option>
                  <option value="50">Medium (&gt;50%)</option>
                  <option value="30">Low (&gt;30%)</option>
                </select>
              </div>
              <div>
                <label className="block text-white/40 text-xs mb-1.5">Max Results</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-black/40 text-white text-sm focus:border-white/20 focus:outline-none appearance-none">
                  <option value="3">Top 3</option>
                  <option value="5">Top 5</option>
                  <option value="10">Top 10</option>
                  <option value="25">Top 25</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-white/50 text-xs uppercase tracking-wider">Terms & Options</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 w-5 h-5 rounded border border-white/20 bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:border-white/40 transition">
                {acceptedTerms && <span className="text-cyan-400">{Icons.check}</span>}
              </div>
              <input 
                type="checkbox" 
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="hidden"
              />
              <span className="text-white/60 text-sm group-hover:text-white/80 transition">
                I accept the terms and conditions and acceptable use policy
                <span className="text-red-400 ml-1">REQUIRED</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 w-5 h-5 rounded border border-white/20 bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:border-white/40 transition">
                {hasRights && <span className="text-cyan-400">{Icons.check}</span>}
              </div>
              <input 
                type="checkbox" 
                checked={hasRights}
                onChange={(e) => setHasRights(e.target.checked)}
                className="hidden"
              />
              <span className="text-white/60 text-sm group-hover:text-white/80 transition">
                I hold the rights or authorization for all images I upload
                <span className="text-red-400 ml-1">REQUIRED</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 w-5 h-5 rounded border border-white/20 bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:border-white/40 transition">
                {keepHistory && <span className="text-cyan-400">{Icons.check}</span>}
              </div>
              <input 
                type="checkbox" 
                checked={keepHistory}
                onChange={(e) => setKeepHistory(e.target.checked)}
                className="hidden"
              />
              <span className="text-white/60 text-sm group-hover:text-white/80 transition">
                Keep search history
                <span className="text-white/30 ml-1">OPTIONAL</span>
              </span>
            </label>
          </div>
        </div>

        <button 
          onClick={runAnalysis}
          disabled={!selectedImage || isAnalyzing || !user || !acceptedTerms || !hasRights}
          className="w-full py-3.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm"
        >
          {isAnalyzing ? (
            <>
              {Icons.spinner}
              Analyzing...
            </>
          ) : (
            <>
              {Icons.globe}
              Run GeoInt Analysis
            </>
          )}
        </button>

        {analysisProgress && (
          <div className="mt-4 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs uppercase tracking-wider">
                {analysisProgress.step === 'upload' && 'Uploading image...'}
                {analysisProgress.step === 'preprocessing' && 'Preprocessing image...'}
                {analysisProgress.step === 'feature_extraction' && 'Extracting visual features...'}
                {analysisProgress.step === 'matching' && 'Matching against global database...'}
                {analysisProgress.step === 'results' && 'Results ready!'}
              </span>
              <span className="text-white/30 text-xs">{analysisProgress.progress}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${analysisProgress.progress}%` }} 
              />
            </div>
          </div>
        )}

        {showResults && results && !results.error && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">Analysis Results</h2>
                <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
                  {results.neighbors || 0} neighbors
                </span>
                <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
                  {results.geoCluster || 'Global'}
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(results, null, 2)); }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/40 hover:text-white/70"
                >
                  {Icons.copy}
                </button>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/40 hover:text-white/70">
                  {Icons.download}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {results.top1 && <ResultCard result={results.top1} rank={1} />}
              {results.top2 && <ResultCard result={results.top2} rank={2} />}
              {results.top3 && <ResultCard result={results.top3} rank={3} />}
            </div>

            {results.visualFeatures && (
              <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Detected Features</div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-white/30">Vegetation: </span>
                    <span className="text-white/70">{results.visualFeatures.vegetation}</span>
                  </div>
                  <div>
                    <span className="text-white/30">Weather: </span>
                    <span className="text-white/70">{results.visualFeatures.weather}</span>
                  </div>
                  <div>
                    <span className="text-white/30">Architecture: </span>
                    <span className="text-white/70">{results.visualFeatures.architecture}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {results.visualFeatures.objects?.map((obj, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/50">
                      {obj}
                    </span>
                  ))}
                </div>
                {results.visualFeatures.ocr?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {results.visualFeatures.ocr.map((text, i) => (
                      <span key={i} className="text-xs bg-yellow-500/10 px-2 py-0.5 rounded text-yellow-300 font-mono">
                        {text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {results?.error && (
          <div className="mt-6 bg-black/50 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6 text-center">
            <div className="w-10 h-10 mx-auto mb-3 text-red-400/50">{Icons.warning}</div>
            <p className="text-red-400 text-sm">{results.error}</p>
          </div>
        )}

        {!user && (
          <div className="mt-4 text-center text-xs text-yellow-300">
            Please log in to use GeoInt analysis
          </div>
        )}

        {showResultModal && selectedResult && (
          <ResultModal result={selectedResult} onClose={() => { setShowResultModal(false); setSelectedResult(null); }} />
        )}
      </div>
    </div>
  );
};

export default GeoIntPage;