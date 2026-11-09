/*! ImmoBuild Kohn – outil « Estimation gratuite » – embed.js
 * Usage (une ligne) :
 *   <div data-immobuild-estimation data-lang="fr"></div><script src="https://VOTRE-ADRESSE/embed.js" async></script>
 * Langues : fr (par défaut), de, en.
 */
(function () {
  'use strict';
  if (window.ImmoBuildEstimation) {
    window.ImmoBuildEstimation.mount();
    return;
  }

  var script = document.currentScript || document.querySelector('script[src*="/embed.js"]');
  if (!script || !script.src) return;
  var base = new URL(script.src, location.href).origin;
  var LANGS = { fr: 'Estimation gratuite de votre bien', de: 'Kostenlose Bewertung Ihrer Immobilie', en: 'Free valuation of your property' };

  function langOf(el) {
    var l = (el.getAttribute('data-lang') || script.getAttribute('data-lang') || document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
    return LANGS[l] ? l : 'fr';
  }

  function mount(el) {
    if (el.getAttribute('data-mounted') === '1') return;
    el.setAttribute('data-mounted', '1');
    var lang = langOf(el);
    var f = document.createElement('iframe');
    f.src = base + '/?lang=' + lang + '&src=' + encodeURIComponent(location.origin + location.pathname);
    f.title = LANGS[lang];
    f.setAttribute('data-immobuild-frame', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.style.cssText = 'display:block;width:100%;height:640px;border:0;overflow:hidden;background:transparent;';
    el.appendChild(f);
  }

  function mountAll() {
    var els = document.querySelectorAll('[data-immobuild-estimation]');
    if (!els.length && script.parentNode && !script.hasAttribute('data-manual')) {
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
      if (e.data.type === 'height' && typeof e.data.height === 'number' && e.data.height > 0 && e.data.height < 20000) {
        f.style.height = Math.ceil(e.data.height) + 2 + 'px';
      } else if (e.data.type === 'scroll') {
        var top = f.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });

  window.ImmoBuildEstimation = { mount: mountAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();
