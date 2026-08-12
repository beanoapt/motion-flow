/* ============================================================
   audio-player.js
   Drop this file next to music-player.html (same folder).
   Each song in the playlist below carries its own MP3 file and
   its own artwork image — when a track loads, the artwork swaps
   to match automatically. No upload step, no manual syncing.
   ============================================================ */

(function () {
  const audioEl        = document.getElementById('audioEl');
  const artworkImg     = document.getElementById('artworkImg');
  const songFileName   = document.getElementById('songFileName');
  const ambient        = document.getElementById('ambient');

  const playBtn        = document.getElementById('playBtn');
  const playIcon       = document.getElementById('playIcon');
  const prevBtn        = document.getElementById('prevBtn');
  const nextBtn        = document.getElementById('nextBtn');

  const scrubberWrap   = document.getElementById('scrubber');
  const scrubTrack     = document.getElementById('scrubTrack');
  const scrubFill      = document.getElementById('scrubFill');
  const scrubKnob      = document.getElementById('scrubKnob');
  const timeElapsedEl  = document.getElementById('timeElapsed');
  const timeRemainEl   = document.getElementById('timeRemaining');

  const controlsWrap   = document.getElementById('controls');
  const volTrack       = document.getElementById('volTrack');
  const volFill        = document.getElementById('volFill');
  const volKnob        = document.getElementById('volKnob');

  const trackTitle     = document.getElementById('trackTitle');
  const trackArtist    = document.getElementById('trackArtist');

  const PLAY_ICON  = '<path d="M8 5v14l11-7z"/>';
  const PAUSE_ICON = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';

  let trackReady = false; // true once the CURRENT track has actually loaded

  // ---------- Playlist ----------
  // Loaded from playlist.json at startup (see fetch call near the bottom
  // of this file). Each entry needs: file (mp3 filename), title, artist,
  // art (image filename) — all files must sit in the same folder as
  // music-player.html and playlist.json.
  let PLAYLIST = [];

  let currentIndex = 0;
  let trackChangeListeners = []; // subscribers notified whenever the current track changes

  // ---------- Format mm:ss ----------
  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.round(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ---------- Enable / disable controls ----------
  function setTrackLoaded(loaded) {
    trackReady = loaded;
    scrubberWrap.classList.toggle('no-track', !loaded);
    controlsWrap.classList.toggle('no-track', !loaded);
  }

  function resetScrub() {
    scrubFill.style.width = '0%';
    scrubKnob.style.left = '0%';
    timeElapsedEl.textContent = '0:00';
    timeRemainEl.textContent = '−0:00';
  }

  // ---------- Extract a vivid accent color from artwork ----------
  // Downsamples the image onto a small offscreen canvas, averages the
  // pixels (skipping near-black/near-white/transparent ones so the result
  // isn't dragged toward gray), then boosts saturation a touch so the glow
  // reads as a real color instead of a washed-out average.
  function extractAccentColor(imgEl) {
    return new Promise((resolve) => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgEl, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const rr = data[i], gg = data[i + 1], bb = data[i + 2], aa = data[i + 3];
          if (aa < 200) continue;
          const lum = (rr + gg + bb) / 3;
          if (lum < 20 || lum > 235) continue; // skip near-black / near-white pixels
          r += rr; g += gg; b += bb; count++;
        }
        if (count === 0) { resolve(null); return; }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        resolve(boostSaturation(r, g, b, 1.35));
      } catch (err) {
        // Canvas can throw if the image is cross-origin without CORS headers —
        // fails gracefully back to the default glow.
        console.warn('Could not sample artwork color:', err);
        resolve(null);
      }
    });
  }

  function boostSaturation(r, g, b, factor) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2 / 255;
    if (max === min) return { r, g, b }; // fully gray — nothing to boost
    const d = (max - min) / 255;
    const s = l > 0.5 ? d / (2 - (max + min) / 255) : d / ((max + min) / 255);
    const boostedS = Math.min(1, s * factor);

    let h;
    const rf = r / 255, gf = g / 255, bf = b / 255, maxf = max / 255;
    if (maxf === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6;
    else if (maxf === gf) h = ((bf - rf) / d + 2) / 6;
    else h = ((rf - gf) / d + 4) / 6;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + boostedS) : l + boostedS - l * boostedS;
    const p = 2 * l - q;
    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
  }

  // ---------- Artwork sync ----------
  function setArtwork(src) {
    artworkImg.classList.remove('loaded');
    if (!src) return;
    const probe = new Image();
    probe.onload = () => {
      artworkImg.src = src;
      artworkImg.classList.add('loaded');

      // Tint the ambient glow to match this song's actual artwork colors,
      // falling back to the original neutral white glow if sampling fails.
      extractAccentColor(probe).then((color) => {
        const tint = color ? `${color.r},${color.g},${color.b}` : '255,255,255';
        const alpha = color ? 0.4 : 0.08;
        ambient.style.background = `radial-gradient(circle at 30% 20%, rgba(${tint},${alpha}), transparent 60%)`;
      });
    };
    probe.onerror = () => {
      console.error('Artwork not found:', src);
      artworkImg.classList.remove('loaded');
    };
    probe.src = src;
  }

  // ---------- Load a track from the playlist ----------
  function loadTrack(index, autoplay) {
    if (index < 0 || index >= PLAYLIST.length) return;
    currentIndex = index;
    const track = PLAYLIST[currentIndex];

    setTrackLoaded(false);
    resetScrub();
    songFileName.textContent = 'Loading ' + track.file + '…';

    trackTitle.value = track.title;
    trackArtist.value = track.artist;
    setArtwork(track.art);

    trackChangeListeners.forEach((fn) => {
      try { fn(currentIndex, track); } catch (err) { console.error(err); }
    });

    audioEl.src = track.file;
    audioEl.load();

    const onReady = () => {
      audioEl.removeEventListener('error', onError);
      songFileName.textContent = track.title + ' — ' + track.artist;
      setTrackLoaded(true);
      updateScrubFromAudio();
      if (autoplay) attemptPlay();
    };
    const onError = () => {
      audioEl.removeEventListener('loadedmetadata', onReady);
      console.error('Could not load audio file:', track.file, audioEl.error);
      songFileName.textContent = '⚠ File not found: ' + track.file;
      setTrackLoaded(false);
    };

    audioEl.addEventListener('loadedmetadata', onReady, { once: true });
    audioEl.addEventListener('error', onError, { once: true });
  }

  // ---------- Play / Pause ----------
  function attemptPlay() {
    const p = audioEl.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        console.error('Playback failed:', err);
        songFileName.textContent = '⚠ Playback blocked — click play again';
      });
    }
  }

  playBtn.addEventListener('click', () => {
    if (!trackReady) return;
    if (audioEl.paused) {
      attemptPlay();
    } else {
      audioEl.pause();
    }
  });

  audioEl.addEventListener('play',  () => { playIcon.innerHTML = PAUSE_ICON; });
  audioEl.addEventListener('pause', () => { playIcon.innerHTML = PLAY_ICON;  });

  // ---------- Shuffle / Repeat ----------
  const shuffleBtn      = document.getElementById('shuffleBtn');
  const repeatBtn       = document.getElementById('repeatBtn');
  const repeatOneBadge  = document.getElementById('repeatOneBadge');

  let shuffleOn = false;
  let repeatMode = 'off'; // 'off' -> 'all' -> 'one' -> 'off' ...

  function pickNextIndex() {
    if (shuffleOn && PLAYLIST.length > 1) {
      let idx;
      do { idx = Math.floor(Math.random() * PLAYLIST.length); } while (idx === currentIndex);
      return idx;
    }
    return (currentIndex + 1) % PLAYLIST.length;
  }

  function pickPrevIndex() {
    if (shuffleOn && PLAYLIST.length > 1) {
      let idx;
      do { idx = Math.floor(Math.random() * PLAYLIST.length); } while (idx === currentIndex);
      return idx;
    }
    return (currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
  }

  shuffleBtn.addEventListener('click', () => {
    shuffleOn = !shuffleOn;
    shuffleBtn.classList.toggle('active', shuffleOn);
  });

  repeatBtn.addEventListener('click', () => {
    repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    repeatBtn.classList.toggle('active', repeatMode !== 'off');
    repeatOneBadge.classList.toggle('show', repeatMode === 'one');
  });

  // ---------- Prev / Next: cycle through the playlist ----------
  prevBtn.addEventListener('click', () => {
    const wasPlaying = !audioEl.paused;
    loadTrack(pickPrevIndex(), wasPlaying);
  });
  nextBtn.addEventListener('click', () => {
    const wasPlaying = !audioEl.paused;
    loadTrack(pickNextIndex(), wasPlaying);
  });
  audioEl.addEventListener('ended', () => {
    if (repeatMode === 'one') {
      audioEl.currentTime = 0;
      attemptPlay();
      return;
    }
    const atLastTrack = !shuffleOn && currentIndex === PLAYLIST.length - 1;
    if (repeatMode === 'off' && atLastTrack) {
      // Reached the real end of the playlist with repeat off — stop, like a normal player.
      playIcon.innerHTML = PLAY_ICON;
      return;
    }
    loadTrack(pickNextIndex(), true);
  });

  // ---------- Scroll wheel: skip tracks ----------
  // Only hijacks the wheel while the cursor is over the card itself, so the
  // page can still scroll normally everywhere else. A short cooldown makes
  // one scroll gesture skip exactly one track instead of flying through
  // several — wheel events fire many times per physical scroll motion.
  const playerCard = document.getElementById('player');
  const WHEEL_COOLDOWN_MS = 550;
  let wheelLocked = false;

  if (playerCard) {
    playerCard.addEventListener('wheel', (e) => {
      if (!trackReady || wheelLocked) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      wheelLocked = true;

      const wasPlaying = !audioEl.paused;
      if (e.deltaY > 0) {
        loadTrack(pickNextIndex(), wasPlaying);
      } else if (e.deltaY < 0) {
        loadTrack(pickPrevIndex(), wasPlaying);
      }

      setTimeout(() => { wheelLocked = false; }, WHEEL_COOLDOWN_MS);
    }, { passive: false });
  }

  // ---------- Swipe: skip tracks on mobile ----------
  // Swipe right → next track, swipe left → previous track. Uses passive
  // listeners and only *reads* touch positions rather than calling
  // preventDefault, so normal page scrolling is never blocked — a swipe
  // that turns out to be a vertical scroll just quietly does nothing here.
  const SWIPE_MIN_DISTANCE = 50;   // px — how far a horizontal swipe must travel
  const SWIPE_MAX_VERTICAL = 60;   // px — more vertical drift than this reads as a scroll, not a swipe
  let touchStartX = 0, touchStartY = 0, trackingSwipe = false;

  // Don't treat drags on the scrubber/volume sliders, buttons, or an open
  // queue panel as playlist swipes — those already have their own touch handling.
  function isSwipeExcluded(target) {
    return !!(target && target.closest && target.closest(
      '#scrubTrack, #volTrack, .queue-overlay, button, input'
    ));
  }

  if (playerCard) {
    playerCard.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || isSwipeExcluded(e.target)) {
        trackingSwipe = false;
        return;
      }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      trackingSwipe = true;
    }, { passive: true });

    playerCard.addEventListener('touchend', (e) => {
      if (!trackingSwipe || !trackReady) { trackingSwipe = false; return; }
      trackingSwipe = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (Math.abs(dx) >= SWIPE_MIN_DISTANCE && Math.abs(dy) < SWIPE_MAX_VERTICAL) {
        const wasPlaying = !audioEl.paused;
        if (dx > 0) {
          loadTrack(pickNextIndex(), wasPlaying); // swipe right → next
        } else {
          loadTrack(pickPrevIndex(), wasPlaying); // swipe left → previous
        }
      }
    }, { passive: true });
  }

  // ---------- Time / scrubber sync ----------
  function updateScrubFromAudio() {
    const duration = audioEl.duration || 0;
    const current = audioEl.currentTime || 0;
    const pct = duration ? Math.min(100, (current / duration) * 100) : 0;
    scrubFill.style.width = pct + '%';
    scrubKnob.style.left = pct + '%';
    timeElapsedEl.textContent = formatTime(current);
    timeRemainEl.textContent = '−' + formatTime(duration - current);
  }
  audioEl.addEventListener('timeupdate', updateScrubFromAudio);

  function scrubTo(clientX) {
    if (!trackReady || !audioEl.duration) return;
    const rect = scrubTrack.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audioEl.currentTime = pct * audioEl.duration;
    updateScrubFromAudio();
  }

  let draggingScrub = false;
  scrubTrack.addEventListener('mousedown', (e) => { draggingScrub = true; scrubTo(e.clientX); });
  window.addEventListener('mousemove', (e) => { if (draggingScrub) scrubTo(e.clientX); });
  window.addEventListener('mouseup', () => draggingScrub = false);
  scrubTrack.addEventListener('touchstart', (e) => { draggingScrub = true; scrubTo(e.touches[0].clientX); });
  window.addEventListener('touchmove', (e) => { if (draggingScrub) scrubTo(e.touches[0].clientX); });
  window.addEventListener('touchend', () => draggingScrub = false);

  // ---------- Volume ----------
  function updateVolUI() {
    const pct = audioEl.volume * 100;
    volFill.style.width = pct + '%';
    volKnob.style.left = pct + '%';
  }

  function volTo(clientX) {
    const rect = volTrack.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audioEl.volume = pct;
    updateVolUI();
  }

  let draggingVol = false;
  volTrack.addEventListener('mousedown', (e) => { draggingVol = true; volTo(e.clientX); });
  window.addEventListener('mousemove', (e) => { if (draggingVol) volTo(e.clientX); });
  window.addEventListener('mouseup', () => draggingVol = false);
  volTrack.addEventListener('touchstart', (e) => { draggingVol = true; volTo(e.touches[0].clientX); });
  window.addEventListener('touchmove', (e) => { if (draggingVol) volTo(e.touches[0].clientX); });
  window.addEventListener('touchend', () => draggingVol = false);

  // ---------- Keyboard shortcuts ----------
  // Space: play/pause · Left/Right: prev/next track · Up/Down: volume
  const VOLUME_STEP = 0.05;

  window.addEventListener('keydown', (e) => {
    // Don't hijack typing in a field, or shortcuts held with a modifier key
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        playBtn.click();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextBtn.click();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevBtn.click();
        break;
      case 'ArrowUp':
        e.preventDefault();
        audioEl.volume = Math.min(1, audioEl.volume + VOLUME_STEP);
        updateVolUI();
        break;
      case 'ArrowDown':
        e.preventDefault();
        audioEl.volume = Math.max(0, audioEl.volume - VOLUME_STEP);
        updateVolUI();
        break;
    }
  });

  // ---------- Public API (used by queue-and-likes.js, custom-uploads.js) ----------
  window.MotionFlowPlayer = {
    getPlaylist: () => PLAYLIST.slice(),
    getCurrentIndex: () => currentIndex,
    isPlaying: () => !audioEl.paused,
    jumpTo: (index) => {
      const wasPlaying = !audioEl.paused;
      loadTrack(index, wasPlaying);
    },
    onTrackChange: (callback) => { trackChangeListeners.push(callback); },

    // Appends a track to the live playlist without interrupting playback.
    // Track shape: { file, title, artist, art, uploadId? }
    addTrack: (track) => {
      PLAYLIST.push(track);
    },

    // Removes the track at `index`. If it's the one currently playing,
    // advances to the next track (or stops if the playlist is now empty).
    // Otherwise just shifts currentIndex to keep pointing at the same song.
    removeTrackAt: (index) => {
      if (index < 0 || index >= PLAYLIST.length) return;
      const removingCurrent = index === currentIndex;
      PLAYLIST.splice(index, 1);

      if (PLAYLIST.length === 0) {
        audioEl.pause();
        audioEl.removeAttribute('src');
        setTrackLoaded(false);
        songFileName.textContent = 'Playlist is empty';
        return;
      }
      if (removingCurrent) {
        const wasPlaying = !audioEl.paused;
        loadTrack(Math.min(index, PLAYLIST.length - 1), wasPlaying);
      } else if (index < currentIndex) {
        currentIndex -= 1;
      }
    },

    // Moves the track at `fromIndex` to `toIndex`, shifting everything
    // between them. Keeps currentIndex pointing at the same actual track
    // even though its position may shift as a result of the move.
    moveTrack: (fromIndex, toIndex) => {
      if (fromIndex < 0 || fromIndex >= PLAYLIST.length) return;
      if (toIndex < 0 || toIndex >= PLAYLIST.length) return;
      if (fromIndex === toIndex) return;

      const [moved] = PLAYLIST.splice(fromIndex, 1);
      PLAYLIST.splice(toIndex, 0, moved);

      if (currentIndex === fromIndex) {
        currentIndex = toIndex;
      } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
        currentIndex -= 1;
      } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
        currentIndex += 1;
      }
    },
  };

  // ---------- Init ----------
  audioEl.volume = 0.7;
  updateVolUI();
  setTrackLoaded(false);
  resetScrub();

  songFileName.textContent = 'Loading playlist…';

  fetch('playlist.json')
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('playlist.json is empty or not a list');
      }
      PLAYLIST = data;
      loadTrack(0, false);
    })
    .catch((err) => {
      console.error('Could not load playlist.json:', err);
      songFileName.textContent = '⚠ Could not load playlist.json';
    });
})();
