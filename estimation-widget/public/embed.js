/*! ImmoBuild Kohn – outil « Estimation gratuite » – embed.js
 * Usage (une ligne) :
 *   <div data-immobuild-estimation data-lang="fr"></div><script src="https://VOTRE-ADRESSE/embed.js" async></script>
 * Options sur le <div> :
 *   data-lang="fr|de|en"   langue (sinon celle de la page, sinon fr)
 *   data-offset="90"       hauteur d'un en-tête fixe du site, en px (pour ne pas cacher le haut de l'outil)
 * Options sur le <script> :
 *   data-manual            ne crée pas de conteneur tout seul (sites Next.js / SPA : appeler ImmoBuildEstimation.mount())
 *   data-src="https://…"   adresse de l'outil, si une extension WordPress recopie ce script sur le site
 */
(function () {
  'use strict';
  if (window.ImmoBuildEstimation) {
    window.ImmoBuildEstimation.mount();
    return;
  }

  var script = document.currentScript || document.querySelector('script[src*="/embed.js"]');
  var src = script && (script.getAttribute('data-src') || script.src);
  if (!src) return;
  var base = new URL(src, location.href).origin;
  var LANGS = { fr: 'Estimation gratuite de votre bien', de: 'Kostenlose Bewertung Ihrer Immobilie', en: 'Free valuation of your property' };
  var FALLBACK = { fr: 'Ouvrir l’estimation gratuite', de: 'Kostenlose Bewertung öffnen', en: 'Open the free valuation' };

  function langOf(el) {
    var l = (el.getAttribute('data-lang') || script.getAttribute('data-lang') || document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
    return LANGS[l] ? l : 'fr';
  }

  // Le CSS du site (ex. « iframe { height: auto !important } ») ne doit pas écraser nos réglages
  function set(f, prop, value) {
    f.style.setProperty(prop, value, 'important');
  }

  function offsetOf(f) {
    var box = f.parentNode;
    var o = parseInt((box && box.getAttribute && box.getAttribute('data-offset')) || '', 10);
    return isNaN(o) ? 0 : Math.max(0, Math.min(o, 400));
  }

  // Ancêtre qui défile vraiment (la fenêtre, ou un conteneur « overflow: auto » du site)
  function scroller(el) {
    for (var p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      var o = getComputedStyle(p).overflowY;
      if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
    }
    return null;
  }

  function scrollToOffset(f, offset) {
    var top = f.getBoundingClientRect().top + offset - offsetOf(f);
    var s = scroller(f);
    if (s) s.scrollTo({ top: s.scrollTop + top - s.getBoundingClientRect().top, behavior: 'smooth' });
    else window.scrollTo({ top: window.scrollY + top, behavior: 'smooth' });
  }

  function fallback(el, f, lang) {
    if (f.getAttribute('data-ok') === '1') return;
    if (window.console) console.warn('[ImmoBuild] L’outil d’estimation ne s’affiche pas ici. Vérifiez que l’adresse de ce site est autorisée (frame-ancestors dans _headers).');
    var a = document.createElement('a');
    a.href = base + '/?lang=' + lang;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = FALLBACK[lang];
    a.style.cssText = 'display:inline-block;padding:14px 22px;border-radius:12px;background:#0a2342;color:#fff;font:600 16px/1.2 system-ui,sans-serif;text-decoration:none;';
    f.parentNode && f.parentNode.removeChild(f);
    el.appendChild(a);
  }

  function mount(el) {
    // Déjà monté et toujours là : rien à faire (si le framework a vidé le conteneur, on remonte)
    if (el.getAttribute('data-mounted') === '1' && el.querySelector('iframe[data-immobuild-frame]')) return;
    el.setAttribute('data-mounted', '1');
    var lang = langOf(el);
    var f = document.createElement('iframe');
    f.src = base + '/?lang=' + lang + '&src=' + encodeURIComponent(location.origin + location.pathname);
    f.title = LANGS[lang];
    f.setAttribute('data-immobuild-frame', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.setAttribute('loading', 'lazy'); // ne charge l'outil que lorsqu'il approche de l'écran
    // Hauteur de départ proche de la vraie hauteur de l'étape 1 : évite que la page « saute » au chargement
    var w = el.clientWidth || window.innerWidth;
    set(f, 'display', 'block');
    set(f, 'width', '100%');
    set(f, 'max-width', 'none');
    set(f, 'height', (w < 400 ? 1190 : w < 460 ? 1120 : 1080) + 'px');
    set(f, 'border', '0');
    set(f, 'padding', '0');
    set(f, 'background', 'transparent');
    set(f, 'overflow', 'hidden');
    var off = offsetOf(f) || parseInt(el.getAttribute('data-offset') || '0', 10) || 0;
    if (off) set(f, 'scroll-margin-top', off + 'px');
    // Si l'outil ne répond pas après son chargement (adresse non autorisée, panne), on montre un lien
    f.addEventListener('load', function () {
      setTimeout(function () {
        fallback(el, f, lang);
      }, 15000);
    });
    el.appendChild(f);
  }

  function mountAll() {
    var els = document.querySelectorAll('[data-immobuild-estimation]');
    // Sans conteneur, on en crée un juste après le script, seulement s'il est dans la page (pas dans <head>)
    if (!els.length && script.parentNode && !script.hasAttribute('data-manual') && document.body && document.body.contains(script)) {
      var div = document.createElement('div');
      div.setAttribute('data-immobuild-estimation', '');
      script.parentNode.insertBefore(div, script.nextSibling);
      els = [div];
    }
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== base || !e.data || e.data.source !== 'immobuild-estimation') return;
    var frames = document.querySelectorAll('iframe[data-immobuild-frame]');
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      if (f.contentWindow !== e.source) continue;
      f.setAttribute('data-ok', '1');
      if (e.data.type === 'height' && typeof e.data.height === 'number' && e.data.height > 0 && e.data.height < 20000) {
        set(f, 'height', Math.ceil(e.data.height) + 2 + 'px');
      } else if (e.data.type === 'scrollTo' && typeof e.data.offset === 'number') {
        scrollToOffset(f, Math.max(0, Math.min(e.data.offset, 20000)));
      } else if (e.data.type === 'scroll') {
        var top = f.getBoundingClientRect().top - offsetOf(f);
        if (top < 0 || top > window.innerHeight * 0.6) scrollToOffset(f, 0);
      }
    }
  });

  window.ImmoBuildEstimation = { mount: mountAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();
