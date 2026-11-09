// Composant proposé pour le dépôt immobuild-website (Next.js, App Router).
// À copier dans immobuild-website/components/EstimationWidget.tsx — ce fichier n'est PAS utilisé par estimation-widget.
//
// Utilisation dans une page :
//   import EstimationWidget from '@/components/EstimationWidget';
//   <EstimationWidget lang="fr" />
//
// Adresse de l'outil : variable NEXT_PUBLIC_ESTIMATION_URL dans .env (ex. https://estimation-widget.pages.dev)
'use client';

import Script from 'next/script';
import { useEffect } from 'react';

const WIDGET_URL = process.env.NEXT_PUBLIC_ESTIMATION_URL ?? 'https://estimation-widget.pages.dev';

declare global {
  interface Window {
    ImmoBuildEstimation?: { mount: () => void };
  }
}

export default function EstimationWidget({ lang = 'fr' }: { lang?: 'fr' | 'de' | 'en' }) {
  // Navigation côté client : embed.js est déjà chargé, on monte l'iframe dans le nouveau conteneur
  useEffect(() => {
    window.ImmoBuildEstimation?.mount();
  }, [lang]);

  return (
    <>
      <div key={lang} data-immobuild-estimation="" data-lang={lang} />
      <Script src={`${WIDGET_URL}/embed.js`} strategy="afterInteractive" data-manual="" onReady={() => window.ImmoBuildEstimation?.mount()} />
    </>
  );
}
