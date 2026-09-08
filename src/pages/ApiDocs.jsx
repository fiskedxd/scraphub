import React, { useState } from 'react';

const methodColors = {
  GET: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  POST: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
};

export default function ApiDocsPage() {
  const [apiKey, setApiKey] = useState('');
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadDocs = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setDocs(null);
    try {
      const response = await fetch('/api/developer/docs', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Clé API invalide');
      setDocs(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070707] px-5 pb-16 pt-24 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Developer portal</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Documentation API</h1>
          <p className="mt-5 text-base leading-7 text-white/55">Entre ta clé pour voir les endpoints disponibles, les limites de ton plan et les exemples de requêtes.</p>
        </div>

        <form onSubmit={loadDocs} className="mb-10 flex max-w-3xl flex-col gap-3 sm:flex-row">
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="api_key_..."
            autoComplete="off"
            required
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/60"
          />
          <button type="submit" disabled={loading} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{loading ? 'Vérification...' : 'Charger la documentation'}</button>
        </form>

        {error && <div className="mb-8 max-w-3xl rounded-xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-100">{error}</div>}

        {docs && (
          <>
            <div className="mb-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs uppercase tracking-wider text-white/35">Plan</p><p className="mt-2 text-xl font-semibold">{docs.planLabel}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs uppercase tracking-wider text-white/35">Requêtes / jour</p><p className="mt-2 text-xl font-semibold">{docs.rateLimitPerDay.toLocaleString('fr-FR')}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs uppercase tracking-wider text-white/35">Authentification</p><p className="mt-2 text-sm font-mono text-cyan-200">Bearer API key</p></div>
            </div>

            <div className="space-y-3">
              {docs.endpoints.map((endpoint) => (
                <article key={endpoint.id} className={`rounded-2xl border p-5 ${endpoint.allowed ? 'border-white/10 bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02] opacity-60'}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${methodColors[endpoint.method] || 'border-white/20 text-white/60'}`}>{endpoint.method}</span>
                    <code className="text-sm text-white/90">{endpoint.path}</code>
                    <span className="text-sm font-medium text-white/70">{endpoint.title}</span>
                    <span className="ml-auto text-xs text-white/35">{endpoint.allowed ? `Inclus ${docs.planLabel}` : `Pro requis`}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/50">{endpoint.description}</p>
                  {endpoint.example && endpoint.allowed && <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-cyan-100/80">{JSON.stringify(endpoint.example, null, 2)}</pre>}
                </article>
              ))}
            </div>
          </>
        )}

        {!docs && !error && <p className="text-sm text-white/35">La clé est vérifiée uniquement par le serveur et n’est pas enregistrée dans le navigateur.</p>}
      </div>
    </main>
  );
}
