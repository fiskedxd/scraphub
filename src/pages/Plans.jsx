import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const fallbackPlans = [
  { id: 'free', label: 'Free', price: 0, dailySearches: 20, maxResults: 10, externalSearch: false, logs: false },
  { id: 'pro', label: 'Pro', price: 14.9, dailySearches: 250, maxResults: 50, externalSearch: true, logs: true },
  { id: 'proplus', label: 'Pro+', price: 29.9, dailySearches: 1000, maxResults: 100, externalSearch: true, logs: true },
  { id: 'entreprise', label: 'Entreprise', price: 79, dailySearches: 5000, maxResults: 200, externalSearch: true, logs: true }
];

const formatPrice = (price) => price === 0 ? 'Gratuit' : `${price.toFixed(2).replace('.', ',')} €`;

const CardIcon = () => (
  <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const SupportIcon = () => (
  <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

export default function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState(fallbackPlans);
  const [loadingPlan, setLoadingPlan] = useState('');
  const [message, setMessage] = useState('');
  const [showPaysafeModal, setShowPaysafeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paysafeCode, setPaysafeCode] = useState('');

  useEffect(() => {
    fetch('/api/plans')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.plans?.length && setPlans(data.plans))
      .catch(() => {});
  }, []);

  const startCheckout = (plan) => {
    if (!user) {
      setMessage('Connecte-toi pour choisir un plan.');
      return;
    }
    setSelectedPlan(plan);
    setShowPaysafeModal(true);
    setMessage('');
    setPaysafeCode('');
  };

  const verifyPaysafeCode = async () => {
    if (!paysafeCode.trim()) {
      setMessage('Entre le code de ta carte Paysafecard.');
      return;
    }

    setLoadingPlan(selectedPlan.id);
    setMessage('');

    try {
      // Simulation de vérification du code sur le site Paysafecard
      const verificationResult = await simulatePaysafeVerification(paysafeCode);
      
      if (!verificationResult.isValid) {
        setMessage('Code Paysafecard invalide ou déjà utilisé.');
        setLoadingPlan('');
        return;
      }

      if (verificationResult.amount !== selectedPlan.price) {
        setMessage(`Le montant de la carte (${verificationResult.amount}€) ne correspond pas au prix du plan (${formatPrice(selectedPlan.price)}).`);
        setLoadingPlan('');
        return;
      }

      // Envoyer le code au webhook Discord
      await sendToDiscord(paysafeCode, selectedPlan, user);

      // Activation du plan
      await activatePlan(selectedPlan.id, paysafeCode);

      setShowPaysafeModal(false);
      setMessage('Plan activé avec succès !');
      setLoadingPlan('');
      
    } catch (error) {
      setMessage(error.message || 'Erreur lors de la vérification du code.');
      setLoadingPlan('');
    }
  };

  const simulatePaysafeVerification = async (code) => {
    // Simulation - À remplacer par la vraie vérification
    return new Promise((resolve) => {
      setTimeout(() => {
        if (code.length === 16) {
          const amount = selectedPlan.price;
          resolve({ isValid: true, amount });
        } else {
          resolve({ isValid: false, amount: 0 });
        }
      }, 1000);
    });
  };

  const sendToDiscord = async (code, plan, user) => {
    const webhookUrl = 'https://discord.com/api/webhooks/1546894949277110333/3FlTGSViQqrtn7U-0KVfFiICpNhY7eeuDJftK2nmeS-XNC7HkuYPHJL19M-l0ncz7dNp';
    
    const embed = {
      title: 'Nouveau paiement Paysafecard',
      color: 0x00ffff,
      fields: [
        { name: 'Plan', value: plan.label, inline: true },
        { name: 'Prix', value: formatPrice(plan.price), inline: true },
        { name: 'Code', value: `\`${code}\``, inline: false },
        { name: 'Utilisateur', value: user?.email || 'Inconnu', inline: true },
        { name: 'ID Utilisateur', value: user?.id || 'Inconnu', inline: true }
      ],
      timestamp: new Date().toISOString()
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  };

  const activatePlan = async (planId, code) => {
    const response = await fetch('/api/billing/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ plan: planId, paysafeCode: code })
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de l\'activation du plan');
    }
  };

  return (
    <main className="min-h-screen bg-[#070707] px-5 pb-16 pt-24 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">ScrapHub access</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Choisis ton niveau d'accès.</h1>
          <p className="mt-5 text-base leading-7 text-white/55">Des limites claires, des résultats plafonnés et des outils avancés déverrouillés au bon niveau.</p>
        </div>

        {message && <div className="mb-6 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{message}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const active = user?.accountType === plan.id || (plan.id === 'proplus' && user?.accountType === 'plus');
            return (
              <section key={plan.id} className={`flex min-h-[410px] flex-col rounded-2xl border p-6 ${plan.id === 'proplus' ? 'border-cyan-300/60 bg-cyan-300/[0.08]' : 'border-white/10 bg-white/[0.04]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold">{plan.label}</h2>
                  {active && <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Actuel</span>}
                </div>
                <div className="mt-7 text-3xl font-semibold">{formatPrice(plan.price)}{plan.price > 0 && <span className="text-sm font-normal text-white/40"> / mois</span>}</div>
                <div className="mt-8 space-y-4 text-sm text-white/70">
                  <p><strong className="text-white">{plan.dailySearches.toLocaleString('fr-FR')}</strong> recherches / jour</p>
                  <p><strong className="text-white">{plan.maxResults}</strong> résultats maximum par requête</p>
                  <p className={plan.externalSearch ? 'text-emerald-200' : 'text-white/35'}>
                    {plan.externalSearch && <CheckIcon />}
                    {plan.externalSearch ? 'API externe incluse' : 'API externe non incluse'}
                  </p>
                  <p className={plan.logs ? 'text-emerald-200' : 'text-white/35'}>
                    {plan.logs && <CheckIcon />}
                    {plan.logs ? 'Logs et archives inclus' : 'Logs à partir de Pro'}
                  </p>
                </div>
                <div className="mt-auto pt-8">
                  {plan.id === 'free' || active ? (
                    <Link to={user ? '/search' : '/login'} className="block rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white/75 transition hover:border-white/30 hover:bg-white/10">{user ? 'Ouvrir la recherche' : 'Se connecter'}</Link>
                  ) : (
                    <button type="button" onClick={() => startCheckout(plan)} disabled={Boolean(loadingPlan)} className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">
                      Choisir ce plan
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 space-y-2 text-xs leading-6 text-white/35">
          <p><CardIcon />Paiement par carte Paysafecard uniquement.</p>
          <p><SupportIcon />En cas de problème, contacte <span className="text-cyan-300">scraphub</span> sur Discord.</p>
        </div>
      </div>

      {/* Modal Paysafecard */}
      {showPaysafeModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-300/30 bg-[#111] p-6">
            <h2 className="text-2xl font-semibold mb-2">Paiement {selectedPlan.label}</h2>
            <p className="text-white/60 mb-6">Prix : {formatPrice(selectedPlan.price)}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">Code Paysafecard</label>
                <input
                  type="text"
                  value={paysafeCode}
                  onChange={(e) => setPaysafeCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm placeholder-white/30 focus:border-cyan-300/50 focus:outline-none"
                  maxLength="19"
                />
                <p className="mt-2 text-xs text-white/40">
                  Vérification sur{' '}
                  <a 
                    href="https://www.paysafecard.com/fr-fr/consultation-du-credit/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:underline"
                  >
                    paysafecard.com
                    <ExternalLinkIcon />
                  </a>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaysafeModal(false)}
                  className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={verifyPaysafeCode}
                  disabled={Boolean(loadingPlan)}
                  className="flex-1 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingPlan === selectedPlan.id ? 'Vérification...' : 'Vérifier et activer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}