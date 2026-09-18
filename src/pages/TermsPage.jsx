import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const TermsPage = () => {
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
    { id: "preambule", title: "1. Préambule et acceptation", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
    { id: "services", title: "2. Services proposés", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { id: "legalFramework", title: "3. Cadre juridique", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "userObligations", title: "4. Obligations de l'utilisateur", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { id: "liability", title: "5. Limitation de responsabilité", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "rightToErasure", title: "6. Droit à l'effacement (RGPD Art. 17)", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
    { id: "suspension", title: "7. Suspension et résiliation", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
    { id: "applicableLaw", title: "8. Droit applicable et juridiction", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "contact", title: "9. Contact et signalements", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" }
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
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Conditions Générales d'Utilisation</h1>
            <p className="text-white/40 mt-2 text-sm">Version 4.0 | Dernière mise à jour : 18 septembre 2026 | Entrée en vigueur immédiate</p>
          </div>

          <div className="space-y-6 text-white/70 text-sm leading-relaxed">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                id={section.id}
                className={`section-animate bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-2xl ${
                  visibleSections[section.id] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={section.icon} /></svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                </div>

                {section.id === "preambule" && (
                  <>
                    <p>En accédant à ScrapHub (ci-après "la Plateforme"), vous acceptez pleinement et sans réserve les présentes Conditions Générales d'Utilisation (CGU). ScrapHub est une plateforme spécialisée dans la veille OSINT (Open Source Intelligence), la détection de fuites de données et la corrélation d'informations accessibles publiquement.</p>
                    <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-white/60 text-xs">
                      <span className="text-red-400 font-mono text-xs">AVERTISSEMENT :</span> Cette plateforme est destinée à un usage strictement informatif et éducatif. Toute utilisation malveillante, contraire à la loi, ou portant atteinte aux droits de tiers engage votre seule responsabilité.
                    </div>
                  </>
                )}

                {section.id === "services" && (
                  <p>ScrapHub permet d'effectuer des recherches dans des sources publiques et des index de données déjà signalées comme compromises, à des fins de cybersécurité, de sensibilisation et de prévention. Les résultats dépendent des sources interrogées et peuvent varier dans le temps.</p>
                )}

                {section.id === "legalFramework" && (
                  <>
                    <p className="mb-3">ScrapHub s'inscrit dans le respect du cadre juridique suivant :</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="border border-white/[0.06] rounded-lg p-3"><span className="text-white font-mono">RGPD (UE) 2016/679</span><span className="block text-white/50 text-xs mt-1">Articles 6, 14, 17 (intérêt légitime, information, effacement)</span></div>
                      <div className="border border-white/[0.06] rounded-lg p-3"><span className="text-white font-mono">Loi n°78-17</span><span className="block text-white/50 text-xs mt-1">Informatique et Libertés (modifiée)</span></div>
                      <div className="border border-white/[0.06] rounded-lg p-3"><span className="text-white font-mono">LCEN 2004-575</span><span className="block text-white/50 text-xs mt-1">Loi pour la Confiance en l'Économie Numérique</span></div>
                      <div className="border border-white/[0.06] rounded-lg p-3"><span className="text-white font-mono">Code pénal</span><span className="block text-white/50 text-xs mt-1">Articles 226-18 (collecte illicite), 321-1 (recel)</span></div>
                    </div>
                  </>
                )}

                {section.id === "userObligations" && (
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Ne pas utiliser la Plateforme pour harceler, menacer, doxer ou nuire à autrui.</li>
                    <li>Ne pas diffuser publiquement les résultats de recherche contenant des données personnelles de tiers.</li>
                    <li>Ne pas se faire passer pour une autre personne.</li>
                    <li>Ne pas utiliser les données obtenues à des fins illégales.</li>
                    <li>Respecter la législation en vigueur, notamment le RGPD et le Code pénal.</li>
                    <li>Signaler toute donnée manifestement illicite ou erreur de provenance à <span className="text-white font-mono">contact@scraphub.org</span>.</li>
                  </ul>
                )}

                {section.id === "liability" && (
                  <p>ScrapHub est fourni "en l'état" ("as is") sans garantie d'exhaustivité, d'exactitude ou d'actualité. Les données proviennent de sources tierces sur lesquelles ScrapHub n'exerce aucun contrôle direct. Conformément à la <span className="text-white">LCEN Art. 6-I-2</span>, la responsabilité de ScrapHub ne peut être engagée pour les contenus hébergés si elle n'avait pas connaissance de leur caractère manifestement illicite. En aucun cas ScrapHub ne pourra être tenu responsable des dommages indirects, pertes de données ou décisions prises sur la base des informations fournies. L'utilisateur est seul responsable de l'usage qu'il fait des informations obtenues.</p>
                )}

                {section.id === "rightToErasure" && (
                  <>
                    <p>Conformément à l'<span className="text-white">Article 17 du RGPD</span> (droit à l'effacement), toute personne peut demander la suppression de ses données personnelles des index de la Plateforme.</p>
                    <div className="mt-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                      <p className="font-mono text-xs text-white/60">Procédure : email à <span className="text-white">contact@scraphub.org</span> avec objet "RGPD Art.17" + pièce d'identité + description des données concernées.<br/>Délai de traitement : sous 72 heures (maximum légal : 30 jours).</p>
                    </div>
                  </>
                )}

                {section.id === "suspension" && (
                  <p>ScrapHub se réserve le droit de suspendre ou de résilier l'accès à la Plateforme, sans préavis ni justification, en cas de manquement aux présentes CGU, d'utilisation abusive, ou sur réquisition d'une autorité compétente.</p>
                )}

                {section.id === "applicableLaw" && (
                  <p>Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation ou à leur exécution relève des tribunaux français compétents. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.</p>
                )}

                {section.id === "contact" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="text-white/80 text-xs font-mono">contact@scraphub.org</span>
                      <span className="text-white/40 text-xs ml-auto">Contact général</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <span className="text-white/80 text-xs font-mono">contact@scraphub.org</span>
                      <span className="text-white/40 text-xs ml-auto">Protection des données (RGPD)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </div>
                      <span className="text-white/80 text-xs font-mono">contact@scraphub.org</span>
                      <span className="text-white/40 text-xs ml-auto">Signalement de fuites</span>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-white/[0.08] text-center">
            <p className="text-white/40 text-xs font-mono">Dernière mise à jour : 18 septembre 2026 · Contact : contact@scraphub.org. En utilisant ScrapHub, vous reconnaissez avoir pris connaissance et accepté l'intégralité des présentes conditions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;