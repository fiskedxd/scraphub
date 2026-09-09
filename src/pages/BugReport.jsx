import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BugReportPage = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState(window.location.href);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus('');
    try {
      const response = await fetch('/api/auth/bug-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title, url })
      });
      const data = await response.json();
      setStatus(response.ok ? data.message : data.error || 'Erreur lors de l’envoi.');
      if (response.ok) setTitle('');
    } catch (error) {
      setStatus('Impossible de contacter le serveur.');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return <main className="mx-auto min-h-screen max-w-xl px-6 py-24 text-center text-white"><h1 className="text-2xl font-semibold">Connecte-toi pour signaler un bug.</h1><Link className="mt-6 inline-block text-cyan-300" to="/login">Se connecter</Link></main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-24 text-white">
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">BUG HUNTER</p>
        <h1 className="mt-3 text-3xl font-semibold">Signaler un problème</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">Les signalements vérifiés débloquent le badge BUG Hunter.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm text-white/70">Description du bug
            <textarea required minLength={8} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-red-400/70" placeholder="Étapes pour reproduire le problème..." />
          </label>
          <label className="block text-sm text-white/70">Page concernée
            <input value={url} onChange={(event) => setUrl(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-red-400/70" />
          </label>
          <button disabled={sending} className="w-full rounded-xl border border-red-400/50 bg-red-500/15 px-4 py-3 text-sm font-medium transition hover:bg-red-500/25 disabled:opacity-50">{sending ? 'Envoi...' : 'Envoyer le signalement'}</button>
        </form>
        {status && <p className="mt-4 text-sm text-white/70">{status}</p>}
      </div>
    </main>
  );
};

export default BugReportPage;
