/* ============================================================
   background-themes.js
   Drop this file next to music-player.html (same folder).

   Builds the swatch row and switches between the .bg-layer
   gradient themes defined in the <style> block. Switching is a
   smooth opacity crossfade (see .bg-layer transition in the CSS)
   rather than an instant cut, and the choice is remembered
   across visits via localStorage.
   ============================================================ */

(function () {
  // Add/remove themes here — each id must match a
  // .bg-layer[data-theme="..."] rule in the CSS.
  const THEMES = [
    { id: 'none',     label: 'Black',      swatch: '#1c1c1e' },
    { id: 'purple',   label: 'Purple',     swatch: '#8b5cf6' },
    { id: 'teal',     label: 'Teal',       swatch: '#2dd4bf' },
    { id: 'orange',   label: 'Orange',     swatch: '#fb923c' },
    { id: 'babyblue', label: 'Baby Blue',  swatch: '#7dd3fc' },
  ];

  const STORAGE_KEY = 'now-playing-bg-theme';

  const switcher = document.getElementById('themeSwitcher');
  if (!switcher) return;

  const layers = {};
  document.querySelectorAll('.bg-layer').forEach((el) => {
    layers[el.dataset.theme] = el;
  });

  function setTheme(id) {
    if (!layers[id]) return;
    Object.keys(layers).forEach((key) => {
      layers[key].classList.toggle('active', key === id);
    });
    switcher.querySelectorAll('.theme-dot').forEach((dot) => {
      dot.classList.toggle('active', dot.dataset.theme === id);
    });
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* private mode etc — fine to skip */ }
  }

  THEMES.forEach((theme) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'theme-dot';
    dot.dataset.theme = theme.id;
    dot.style.background = theme.swatch;
    dot.setAttribute('aria-label', theme.label + ' background');
    dot.title = theme.label;
    dot.addEventListener('click', () => setTheme(theme.id));
    switcher.appendChild(dot);
  });

  let saved = 'none';
  try { saved = localStorage.getItem(STORAGE_KEY) || 'none'; } catch (e) { /* ignore */ }
  setTheme(saved);
})();
