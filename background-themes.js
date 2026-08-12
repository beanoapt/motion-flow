/* ============================================================
   background-themes.js
   Drop this file next to music-player.html (same folder).

   Builds the swatch row and switches between the .bg-layer
   gradient themes defined in the <style> block. Switching is a
   smooth opacity crossfade (see .bg-layer transition in the CSS)
   rather than an instant cut, and the choice is remembered
   across visits via localStorage.

   Also adds a 6th "Custom" swatch — a real native color picker.
   Whatever color is picked gets turned into a layered gradient
   matching the visual style of the presets, applied live, and
   remembered across visits too.
   ============================================================ */

(function () {
  // Add/remove PRESET themes here — each id must match a
  // .bg-layer[data-theme="..."] rule in the CSS. The custom color
  // swatch is handled separately below, since its gradient is
  // generated at runtime rather than fixed in CSS.
  const THEMES = [
    { id: 'none',     label: 'Black',      swatch: '#1c1c1e' },
    { id: 'purple',   label: 'Purple',     swatch: '#8b5cf6' },
    { id: 'teal',     label: 'Teal',       swatch: '#2dd4bf' },
    { id: 'orange',   label: 'Orange',     swatch: '#fb923c' },
    { id: 'babyblue', label: 'Baby Blue',  swatch: '#7dd3fc' },
  ];

  const STORAGE_KEY = 'now-playing-bg-theme';
  const CUSTOM_COLOR_KEY = 'now-playing-custom-color';
  const DEFAULT_CUSTOM_COLOR = '#e879f9';

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

  // ---------- Custom color ----------
  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  // Builds the same three-layer glow structure as the presets, just from
  // whatever single color was picked, so it fits the existing visual style.
  function applyCustomGradient(hex) {
    if (!layers.custom) return;
    const { r, g, b } = hexToRgb(hex);
    layers.custom.style.background =
      `radial-gradient(circle at 18% 18%, rgba(${r},${g},${b},0.55), transparent 55%),` +
      `radial-gradient(circle at 85% 15%, rgba(${r},${g},${b},0.30), transparent 50%),` +
      `radial-gradient(circle at 50% 90%, rgba(${r},${g},${b},0.42), transparent 60%),` +
      `#050308`;
  }

  let customColor = DEFAULT_CUSTOM_COLOR;
  try { customColor = localStorage.getItem(CUSTOM_COLOR_KEY) || DEFAULT_CUSTOM_COLOR; } catch (e) { /* ignore */ }
  applyCustomGradient(customColor);

  const customInput = document.createElement('input');
  customInput.type = 'color';
  customInput.className = 'theme-dot custom-color-input';
  customInput.dataset.theme = 'custom';
  customInput.value = customColor;
  customInput.title = 'Custom color';
  customInput.setAttribute('aria-label', 'Pick a custom background color');

  // Fires continuously while dragging inside the native picker, so the
  // background updates live rather than only once a color is confirmed.
  customInput.addEventListener('input', () => {
    customColor = customInput.value;
    applyCustomGradient(customColor);
    try { localStorage.setItem(CUSTOM_COLOR_KEY, customColor); } catch (e) { /* ignore */ }
    setTheme('custom');
  });

  switcher.appendChild(customInput);

  let saved = 'none';
  try { saved = localStorage.getItem(STORAGE_KEY) || 'none'; } catch (e) { /* ignore */ }
  setTheme(saved);
})();
