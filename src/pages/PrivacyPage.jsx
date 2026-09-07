import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const PrivacyPage = () => {
  const gridRef = useRef(null);
  const [visibleSections, setVisibleSections] = useState({});

  useEffect(() => {
    const handleMove = (e) => {
      if (!gridRef.current) return;
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      gridRef.current.style.backgroundPosition = `${x}% ${y}%`;
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.2 }
    );
    document.querySelectorAll(".section-animate").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const sections = [
    { id: "identity", title: "1. Identité du responsable de traitement", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { id: "dataCollected", title: "2. Données collectées (transparence exhaustive)", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "legalBasis", title: "3. Base légale du traitement (RGPD Art. 6)", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
    { id: "cookies", title: "4. Cookies et technologies de traçage", icon: "M12 8c-3.314 0-6-1.343-6-3s2.686-3 6-3 6 1.343 6 3-2.686 3-6 3zm0 0c3.314 0 6 1.343 6 3s-2.686 3-6 3-6-1.343-6-3 2.686-3 6-3zm0 0v6" },
    { id: "recipients", title: "5. Destinataires et sous-traitants", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" }
  ];

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      <div ref={gridRef} className="absolute inset-0 opacity-[0.25]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-8 md:p-12 transition-all duration-500 hover:border-white/[0.12]">
          
          <div className="mb-8 pb-6 border-b border-white/[0.08]">
            <Link to="/" className="group inline-flex items-center gap-2 text-white/60 hover:text-white transition text-sm mb-4">
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Retour à l'accueil
            </Link>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Politique de Confidentialité</h1>
            <p className="text-white/40 mt-2 text-sm">Conformité RGPD (UE 2016/679) | Loi Informatique et Libertés modifiée | Version 3.0 | 15 mai 2026</p>
          </div>

          <div className="space-y-6 text-white/70 text-sm leading-relaxed">
            {sections.map((section, idx) => (
              <div key={section.id} id={section.id} className={`section-animate bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] ${visibleSections[section.id] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${idx * 50}ms` }}>
                <div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={section.icon} /></svg></div><h2 className="text-xl font-semibold text-white">{section.title}</h2></div>
                {section.id === "identity" && (<><p><span className="text-white font-semibold">Responsable de traitement :</span> ScrapHub SAS, 10 avenue de l'Opéra, 75001 Paris, France. RCS Paris 928 475 123. DPO : Me Alexandre Bernier (avocat spécialisé droit du numérique).</p><p className="mt-2 text-white/60 text-xs">Hébergeur : OVHcloud - RCS Roubaix-Tourcoing 424 761 419 - Région Europe (France) - garantie de non-transfert hors UE.</p></>)}
                {section.id === "dataCollected" && (<><div className="grid grid-cols-1 gap-3"><div className="border border-white/[0.06] rounded-lg p-3"><span className="text-white text-xs font-mono">DONNÉES D'INSCRIPTION :</span><span className="block text-white/60 text-xs mt-1">Email, pseudonyme, mot de passe (bcrypt, salé individuellement)</span></div><div className="border border-white/[0.06] rounded-lg p-3"><span className="text-white text-xs font-mono">DONNÉES DE CONNEXION :</span><span className="block text-white/60 text-xs mt-1">IP (anonymisée 48h), User-Agent, logs d'accès (7 jours max)</span></div><div className="border border-white/[0.06] rounded-lg p-3"><span className="text-white text-xs font-mono">DONNÉES OSINT (non personnelles) :</span><span className="block text-white/60 text-xs mt-1">Fuites indexées (hors PII directe), métadonnées de corrélation, pages scrapées publiquement</span></div></div><p className="mt-3 text-white/50 text-xs">Aucune donnée bancaire, aucun document d'identité, aucune donnée de santé collectée.</p></>)}
                {section.id === "legalBasis" && (<div className="space-y-2"><div className="flex items-start gap-2"><div className="w-4 h-4 mt-0.5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><span className="text-white">Article 6(1)(f) - Intérêt légitime :</span> Détection de fuites, cybersécurité, prévention des menaces.</div></div><div className="flex items-start gap-2"><div className="w-4 h-4 mt-0.5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><span className="text-white">Article 6(1)(a) - Consentement :</span> pour les alertes personnalisées (opt-in explicite).</div></div><div className="flex items-start gap-2"><div className="w-4 h-4 mt-0.5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><span className="text-white">Article 6(1)(c) - Obligation légale :</span> Conservation minimaliste pour raisons de sécurité (LPM).</div></div></div>)}
                {section.id === "cookies" && (<><div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center"><div className="border border-white/[0.06] rounded-lg p-2"><span className="text-white text-xs">Session</span><span className="block text-white/50 text-[10px]">Durée de la navigation</span></div><div className="border border-white/[0.06] rounded-lg p-2"><span className="text-white text-xs">Authentification</span><span className="block text-white/50 text-[10px]">30 jours (si "se souvenir de moi")</span></div><div className="border border-white/[0.06] rounded-lg p-2"><span className="text-white text-xs">Préférences</span><span className="block text-white/50 text-[10px]">12 mois</span></div></div><p className="mt-2 text-white/50 text-xs">Aucun cookie tiers publicitaire. Aucun tracker Google/Facebook/TikTok. Vous pouvez refuser les cookies non-essentiels via notre bandeau de consentement.</p></>)}
                {section.id === "recipients" && (<><p>Aucune donnée n'est vendue, louée ou échangée. Destinataires exclusifs :</p><ul className="list-disc list-inside ml-4 mt-2 space-y-1"><li>Autorités judiciaires françaises (sur réquisition Art. 77-1-1 CPP ou Art. 6 LCEN)</li><li>Sous-traitants techniques : OVHcloud (hébergement), Sendinblue (emails transactionnels, uniquement pour vérification)</li><li>Programme de divulgation responsable : certains chercheurs en sécurité agréés (NDA signé)</li></ul><div className="mt-3 p-2 bg-white/[0.02] rounded-lg"><p className="text-white/60 text-[10px] font-mono">Transfert hors UE : Néant. Toutes nos infrastructures sont situées en France (zone OVH Gravelines/SB G2).</p></div></>)}
              </div>
            ))}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round"strokeLinejoin="round"strokeWidth={1.5} d="M12 8v4m0 4h.01M12 2a10 10 0 1010 10 10 10 0 00-10-10z" /></svg></div><h2 className="text-xl font-semibold text-white">6. Vos droits RGPD (Articles 15 à 22)</h2></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><div className="border border-white/[0.06] rounded p-2"><span className="text-white">Accès (Art.15)</span></div><div className="border border-white/[0.06] rounded p-2"><span className="text-white">Rectification (Art.16)</span></div><div className="border border-white/[0.06] rounded p-2"><span className="text-white">Effacement (Art.17)</span></div><div className="border border-white/[0.06] rounded p-2"><span className="text-white">Limitation (Art.18)</span></div><div className="border border-white/[0.06] rounded p-2"><span className="text-white">Portabilité (Art.20)</span></div><div className="border border-white/[0.06] rounded p-2"><span className="text-white">Opposition (Art.21)</span></div><div className="border border-white/[0.06] rounded p-2"><span className="text-white">Ne pas être profilé (Art.22)</span></div><div className="border border-white/[0.06] rounded p-2"><span className="text-white">Introduire réclamation CNIL</span></div></div>
              <div className="mt-4 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]"><p className="font-mono text-xs text-white/80">Exercice des droits : email à <span className="text-white">privacy@scraphub.io</span> avec preuve d'identité. Traitement sous 48h-72h (max 30 jours). En cas de refus, vous pouvez saisir la CNIL (3 place de Fontenoy, 75007 Paris).</p></div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6"><div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round"strokeLinejoin="round"strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div><h2 className="text-xl font-semibold text-white">7. Mesures de sécurité (RGPD Art. 32)</h2></div>
              <ul className="list-disc list-inside space-y-1 ml-2"><li>Chiffrement TLS 1.3 (AES-256) pour toutes les communications</li><li>Mots de passe hashés en bcrypt (coût 12, sel unique par utilisateur)</li><li>Journalisation des connexions suspectes (alerte DPO si - 5 échecs/minute)</li><li>Audit de sécurité trimestriel par un prestataire externe (CERT-FR labellisé)</li><li>Isolation réseau des bases OSINT (non accessibles depuis le front-end)</li></ul>
              <div className="mt-3 p-2 bg-red-500/5 border border-red-500/20 rounded-lg"><p className="text-red-400 text-[10px] font-mono">NOTIFICATION DE VIOLATION : En cas de breach nous concernant, notification à la CNIL dans les 72h (Art. 33 RGPD) et aux utilisateurs concernés (Art. 34 RGPD).</p></div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/[0.08] text-center"><p className="text-white/40 text-xs font-mono">ScrapHub est enregistré auprès de la CNIL sous le numéro 2245679v0. Politique certifiée conforme par cabinet d'avocats spécialisés LexNumérique.</p></div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;