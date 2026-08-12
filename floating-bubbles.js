/* ============================================================
   floating-bubbles.js
   Drop this file next to music-player.html (same folder).

   Generates a handful of soft, translucent circles that drift
   slowly behind the player card — each one randomized in size,
   position, timing, and drift distance so they never look like
   a repeating pattern. Purely decorative: pointer-events are
   disabled so they never intercept clicks, scrolls, or the tilt
   effect. Respects prefers-reduced-motion (CSS handles that part).
   ============================================================ */

(function () {
  const container = document.getElementById('bubbles');
  if (!container) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const BUBBLE_COUNT = 10;
  const MIN_SIZE = 40;   // px
  const MAX_SIZE = 130;  // px
  const MIN_DURATION = 14; // seconds per drift cycle
  const MAX_DURATION = 28;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const size = rand(MIN_SIZE, MAX_SIZE);
    const duration = rand(MIN_DURATION, MAX_DURATION);

    bubble.style.width = size.toFixed(0) + 'px';
    bubble.style.height = size.toFixed(0) + 'px';
    bubble.style.left = rand(0, 100).toFixed(1) + '%';
    bubble.style.top = rand(0, 100).toFixed(1) + '%';
    bubble.style.opacity = rand(0.2, 0.55).toFixed(2);

    // Smaller bubbles drift a little further, for a subtle parallax feel
    const driftScale = 100 / size;
    bubble.style.setProperty('--dur', duration.toFixed(1) + 's');
    bubble.style.setProperty('--delay', (-rand(0, duration)).toFixed(1) + 's'); // stagger starting points
    bubble.style.setProperty('--dx1', rand(-15, 15) * driftScale + 'px');
    bubble.style.setProperty('--dy1', rand(-45, -15) * driftScale + 'px');
    bubble.style.setProperty('--dx2', rand(-18, 18) * driftScale + 'px');
    bubble.style.setProperty('--dy2', rand(-70, -35) * driftScale + 'px');
    bubble.style.setProperty('--dx3', rand(-14, 14) * driftScale + 'px');
    bubble.style.setProperty('--dy3', rand(-40, -12) * driftScale + 'px');

    container.appendChild(bubble);
  }
})();
