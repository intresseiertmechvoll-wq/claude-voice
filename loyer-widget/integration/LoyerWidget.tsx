// Composant proposé pour le dépôt immobuild-website (Next.js, App Router).
// À copier dans immobuild-website/components/LoyerWidget.tsx — ce fichier n'est PAS utilisé par loyer-widget.
//
// Utilisation dans une page :
//   import LoyerWidget from '@/components/LoyerWidget';
//   <LoyerWidget lang="fr" />
//
// Adresse de l'outil : variable NEXT_PUBLIC_LOYER_URL dans .env (ex. https://verlounen.lu)
'use client';

import Script from 'next/script';
import { useEffect } from 'react';

const WIDGET_URL = process.env.NEXT_PUBLIC_LOYER_URL ?? 'https://verlounen.lu';

declare global {
  interface Window {
    ImmoBuildLoyer?: { mount: () => void };
  }
}

export default function LoyerWidget({ lang = 'fr' }: { lang?: 'fr' | 'de' | 'en' }) {
  // Navigation côté client : embed.js est déjà chargé, on monte l'iframe dans le nouveau conteneur
  useEffect(() => {
    window.ImmoBuildLoyer?.mount();
  }, [lang]);

  return (
    <>
      <div key={lang} data-immobuild-loyer="" data-lang={lang} />
      <Script src={`${WIDGET_URL}/embed.js`} strategy="afterInteractive" data-manual="" onReady={() => window.ImmoBuildLoyer?.mount()} />
    </>
  );
}
