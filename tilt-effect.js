/* ============================================================
   tilt-effect.js
   Drop this file next to music-player.html (same folder).

   Gives the player card a subtle "spatial" tilt, like Apple's
   parallax scenes:
     - Desktop: the card tilts toward the mouse cursor anywhere
       on the page, with eased, springy motion.
     - Mobile: if the browser exposes real device orientation
       (an actual gyroscope), the card tilts with the phone
       instead — the first touch prompts for permission on iOS.
   Respects prefers-reduced-motion by doing nothing at all.
   ============================================================ */

(function () {
  const player = document.getElementById('player');
  if (!player) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX_TILT_DEG   = 25;     // how far the card rotates at full extent
  const MAX_LIFT_SCALE = 1.015; // slight pop toward the viewer while active
  const EASE           = 0.09;  // lower = smoother/laggier, higher = snappier

  let targetX = 0, targetY = 0; // -1..1, desired tilt
  let currentX = 0, currentY = 0; // -1..1, eased current tilt
  let active = false;

  function render() {
    currentX += (targetX - currentX) * EASE;
    currentY += (targetY - currentY) * EASE;

    const rotateY = currentX * MAX_TILT_DEG;
    const rotateX = -currentY * MAX_TILT_DEG;
    const scale = active ? MAX_LIFT_SCALE : 1;

    player.style.transform =
      `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

    // Move the specular highlight opposite the tilt, like light catching glass
    const mx = 50 + currentX * 35;
    const my = 30 + currentY * 35;
    player.style.setProperty('--mx', mx.toFixed(1) + '%');
    player.style.setProperty('--my', my.toFixed(1) + '%');

    requestAnimationFrame(render);
  }

  // ---------- Desktop: follow the mouse anywhere on the page ----------
  function handleMouseMove(e) {
    const rect = player.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Normalize against half the viewport so the tilt stays gentle
    // even when the cursor is far from the card.
    const dx = (e.clientX - cx) / (window.innerWidth / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);

    targetX = Math.max(-1, Math.min(1, dx));
    targetY = Math.max(-1, Math.min(1, dy));
    active = true;
    player.classList.add('tilting');
  }

  function handleMouseLeaveWindow() {
    targetX = 0;
    targetY = 0;
    active = false;
    player.classList.remove('tilting');
  }

  // ---------- Mobile: real gyroscope via DeviceOrientationEvent ----------
  const NEUTRAL_BETA = 45; // roughly how far back a phone is held while viewed
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  function handleOrientation(e) {
    if (e.beta === null || e.gamma === null) return;
    const gamma = Math.max(-30, Math.min(30, e.gamma));         // left/right tilt
    const beta  = Math.max(-30, Math.min(30, e.beta - NEUTRAL_BETA)); // fwd/back tilt
    targetX = gamma / 30;
    targetY = beta / 30;
    active = true;
    player.classList.add('tilting');
  }

  function enableGyro() {
    window.addEventListener('deviceorientation', handleOrientation);
  }

  const DOE = window.DeviceOrientationEvent;
  const permissionBtn = document.getElementById('tiltPermissionBtn');

  if (DOE && typeof DOE.requestPermission === 'function') {
    // iOS 13+: motion access requires an explicit, visible tap — not a
    // hijacked first touch, which could land on the play button instead.
    if (permissionBtn) {
      permissionBtn.classList.add('show');
      permissionBtn.addEventListener('click', () => {
        DOE.requestPermission()
          .then((state) => {
            if (state === 'granted') enableGyro();
            permissionBtn.classList.remove('show');
          })
          .catch(() => { permissionBtn.classList.remove('show'); });
      });
    }
  } else if (DOE && isTouchDevice) {
    // Android and older iOS: no permission prompt needed, just start listening.
    enableGyro();
  }

  // On touch devices, skip the mouse-follow behavior entirely — it has
  // no meaning there and stray synthetic events can conflict with the gyro.
  if (!isTouchDevice) {
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);
  }

  requestAnimationFrame(render);
})();
