import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const fallbackPlans = [
  { id: 'free', label: 'Free', price: 0, dailySearches: 20, maxResults: 10, features: ['Recherche de base'] },
  { id: 'pro', label: 'Pro', price: 14.9, dailySearches: 250, maxResults: 50, features: ['Recherche externe', 'Logs et archives', 'Domain intelligence'] },
  { id: 'proplus', label: 'Pro+', price: 29.9, dailySearches: 1000, maxResults: 100, features: ['Recherche multi-source', 'Lookup avance', 'Recherche YouTube', 'Exports JSON/CSV', 'Webhooks'] },
  { id: 'entreprise', label: 'Entreprise', price: 79, dailySearches: 5000, maxResults: 200, features: ['Batch domain intelligence', 'Audit et analytics', 'Exports planifies', 'Webhooks avances', 'Gestion equipe', 'SLA et support prioritaire'] }
];

const formatPrice = (price) => price === 0 ? 'Gratuit' : `${price.toFixed(2).replace('.', ',')} EUR`;

export default function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState(fallbackPlans);
  const [loadingPlan, setLoadingPlan] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/plans')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.plans?.length && setPlans(data.plans))
      .catch(() => {});
  }, []);

  const startCheckout = async (plan) => {
    if (!user) {
      setMessage('Connecte-toi pour choisir un plan.');
      return;
    }
    setLoadingPlan(plan.id);
    setMessage('');
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ plan: plan.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout indisponible');
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setMessage(error.message);
      setLoadingPlan('');
    }
  };

  return (
    <main className="min-h-screen bg-[#070707] px-5 pb-16 pt-24 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">ScrapHub access</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Choisis ton niveau d'acces.</h1>
          <p className="mt-5 text-base leading-7 text-white/55">Des limites claires et des outils adaptes aux recherches individuelles comme aux equipes.</p>
        </div>
        {message && <div className="mb-6 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{message}</div>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const active = user?.accountType === plan.id || (plan.id === 'proplus' && user?.accountType === 'plus');
            return (
              <section key={plan.id} className={`flex min-h-[500px] flex-col rounded-2xl border p-6 ${plan.id === 'proplus' ? 'border-cyan-300/60 bg-cyan-300/[0.08]' : 'border-white/10 bg-white/[0.04]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold">{plan.label}</h2>
                  {active && <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Actuel</span>}
                </div>
                <div className="mt-7 text-3xl font-semibold">{formatPrice(plan.price)}{plan.price > 0 && <span className="text-sm font-normal text-white/40"> / mois</span>}</div>
                <div className="mt-8 space-y-4 text-sm text-white/70">
                  <p><strong className="text-white">{plan.dailySearches.toLocaleString('fr-FR')}</strong> recherches / jour</p>
                  <p><strong className="text-white">{plan.maxResults}</strong> resultats maximum par requete</p>
                  {(plan.features || []).map((feature) => <p key={feature} className="text-emerald-200">&#10003; {feature}</p>)}
                </div>
                <div className="mt-auto pt-8">
                  {plan.id === 'free' || active ? (
                    <Link to={user ? '/search' : '/login'} className="block rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white/75 transition hover:border-white/30 hover:bg-white/10">{user ? 'Ouvrir la recherche' : 'Se connecter'}</Link>
                  ) : (
                    <button type="button" onClick={() => startCheckout(plan)} disabled={Boolean(loadingPlan)} className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{loadingPlan === plan.id ? 'Ouverture...' : 'Choisir ce plan'}</button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <p className="mt-8 text-xs leading-6 text-white/35">Le paiement est traite sur la page securisee du prestataire officiel. Aucun code de paiement n'est demande ni conserve par ScrapHub.</p>
      </div>
    </main>
  );
}
