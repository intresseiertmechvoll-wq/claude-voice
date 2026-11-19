// Composant proposé pour le dépôt immobuild-website (Next.js, App Router).
// À copier dans immobuild-website/components/AcheteurWidget.tsx — ce fichier n'est PAS utilisé par acheteur-widget.
//
// Utilisation dans une page :
//   import AcheteurWidget from '@/components/AcheteurWidget';
//   <AcheteurWidget lang="fr" />
//
// Adresse de l'outil : variable NEXT_PUBLIC_ACHETEUR_URL dans .env (ex. https://acheteur-widget.pages.dev)
// Peut être utilisé sur la même page que EstimationWidget : les deux outils ont des noms différents (pas de conflit).
'use client';

import Script from 'next/script';
import { useEffect } from 'react';

const WIDGET_URL = process.env.NEXT_PUBLIC_ACHETEUR_URL ?? 'https://acheteur-widget.pages.dev';

declare global {
  interface Window {
    ImmoBuildAcheteur?: { mount: () => void };
  }
}

export default function AcheteurWidget({ lang = 'fr' }: { lang?: 'fr' | 'de' | 'en' }) {
  // Navigation côté client : embed.js est déjà chargé, on monte l'iframe dans le nouveau conteneur
  useEffect(() => {
    window.ImmoBuildAcheteur?.mount();
  }, [lang]);

  return (
    <>
      <div key={lang} data-immobuild-acheteur="" data-lang={lang} />
      <Script id="immobuild-acheteur-embed" src={`${WIDGET_URL}/embed.js`} strategy="afterInteractive" data-manual="" onReady={() => window.ImmoBuildAcheteur?.mount()} />
    </>
  );
}
