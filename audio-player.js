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
  // One entry per song. `file` = MP3 filename, `art` = artwork image
  // filename. Both must sit in the same folder as music-player.html.
  // The artwork switches automatically whenever the track changes —
  // just make sure each song's `art` points to the right image.
  const PLAYLIST = [
    { file: 'song1.mp3', title: 'Always Up', artist: 'Jon Keith', art: 'song1.jpg' },
    { file: 'song2.mp3', title: 'What A Life', artist: 'Jon Keith', art: 'song2.jpg' },

    // Add more songs here, each with its own artwork, e.g.:
    // { file: 'song2.mp3', title: 'Song Title', artist: 'Artist Name', art: 'song2.jpg' },
  ];

  let currentIndex = 0;

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

  // ---------- Artwork sync ----------
  function setArtwork(src) {
    artworkImg.classList.remove('loaded');
    if (!src) return;
    const probe = new Image();
    probe.onload = () => {
      artworkImg.src = src;
      artworkImg.classList.add('loaded');
      // Tint the ambient glow behind the card to loosely match the art
      ambient.style.background = `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 60%)`;
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

  // ---------- Prev / Next: cycle through the playlist ----------
  prevBtn.addEventListener('click', () => {
    const wasPlaying = !audioEl.paused;
    const prevIndex = (currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    loadTrack(prevIndex, wasPlaying);
  });
  nextBtn.addEventListener('click', () => {
    const wasPlaying = !audioEl.paused;
    const nextIndex = (currentIndex + 1) % PLAYLIST.length;
    loadTrack(nextIndex, wasPlaying);
  });
  audioEl.addEventListener('ended', () => {
    const nextIndex = (currentIndex + 1) % PLAYLIST.length;
    loadTrack(nextIndex, true);
  });

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

  // ---------- Init ----------
  audioEl.volume = 0.7;
  updateVolUI();
  setTrackLoaded(false);
  resetScrub();
  loadTrack(0, false);
})();
