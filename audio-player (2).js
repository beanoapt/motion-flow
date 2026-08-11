/* ============================================================
   audio-player.js
   Drop this file next to music-player.html (same folder) and
   it will hook itself up to the existing player UI, pulling
   real audio from a user-uploaded MP3 file.

   It expects these element IDs to exist in the HTML:
     audioEl, audioInput, uploadSongBtn, songFileName,
     playBtn, playIcon, prevBtn, nextBtn,
     scrubber, scrubTrack, scrubFill, scrubKnob,
     timeElapsed, timeRemaining,
     volTrack, volFill, volKnob,
     controls, trackTitle, trackArtist
   ============================================================ */

(function () {
  const audioEl        = document.getElementById('audioEl');
  const audioInput     = document.getElementById('audioInput');
  const uploadSongBtn  = document.getElementById('uploadSongBtn');
  const songFileName   = document.getElementById('songFileName');

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
  const volTrack        = document.getElementById('volTrack');
  const volFill         = document.getElementById('volFill');
  const volKnob          = document.getElementById('volKnob');

  const trackTitle     = document.getElementById('trackTitle');
  const trackArtist    = document.getElementById('trackArtist');

  const PLAY_ICON  = '<path d="M8 5v14l11-7z"/>';
  const PAUSE_ICON = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';

  let currentObjectUrl = null;

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
    scrubberWrap.classList.toggle('no-track', !loaded);
    controlsWrap.classList.toggle('no-track', !loaded);
  }

  // ---------- Upload MP3 ----------
  uploadSongBtn.addEventListener('click', () => audioInput.click());

  audioInput.addEventListener('change', () => {
    const file = audioInput.files[0];
    if (!file) return;

    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);

    audioEl.src = currentObjectUrl;
    audioEl.load();

    songFileName.textContent = file.name;
    uploadSongBtn.classList.add('loaded');

    // Pre-fill title/artist from the filename if the fields are still empty
    if (!trackTitle.value) {
      trackTitle.value = file.name.replace(/\.[^/.]+$/, '');
    }

    setTrackLoaded(true);
    resetScrub();
  });
  playBtn.addEventListener('click', () => {
    if (!audioEl.src) {
      audioInput.click();
      return;
    }
    if (audioEl.paused) {
      audioEl.play();
    } else {
      audioEl.pause();
    }
  });

  audioEl.addEventListener('play', () => {
    playIcon.innerHTML = PAUSE_ICON;
  });
  audioEl.addEventListener('pause', () => {
    playIcon.innerHTML = PLAY_ICON;
  });

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

  // Auto-advance to the next song when the current one finishes
  audioEl.addEventListener('ended', () => {
    const nextIndex = (currentIndex + 1) % PLAYLIST.length;
    loadTrack(nextIndex, true);
  });

  // ---------- Time / scrubber sync ----------
  function resetScrub() {
    scrubFill.style.width = '0%';
    scrubKnob.style.left = '0%';
    timeElapsedEl.textContent = '0:00';
    timeRemainEl.textContent = '−0:00';
  }

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
  audioEl.addEventListener('loadedmetadata', updateScrubFromAudio);

  function scrubTo(clientX) {
    if (!audioEl.duration) return;
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

  // ---------- Playlist ----------
  // Add one entry per song. `file` is the MP3 filename (must sit in the
  // same folder as music-player.html). `title` and `artist` populate the
  // title/artist fields automatically the moment that track loads.
  const PLAYLIST = [
    { file: 'song1.mp3', title: 'Always Up', artist: 'Jon Keith' },
    { file: 'song2.mp3', title: 'Song Title', artist: 'Artist Name' },
    { file: 'song3.mp3', title: 'Song Title', artist: 'Artist Name' },
  ];

  let currentIndex = 0;

  function loadTrack(index, autoplay) {
    if (index < 0 || index >= PLAYLIST.length) return;
    currentIndex = index;
    const track = PLAYLIST[currentIndex];

    audioEl.src = track.file;
    audioEl.load();

    trackTitle.value = track.title;
    trackArtist.value = track.artist;

    audioEl.addEventListener('loadedmetadata', () => {
      uploadSongBtn.classList.add('loaded');
      songFileName.textContent = track.file;
      setTrackLoaded(true);
      if (autoplay) audioEl.play();
    }, { once: true });

    audioEl.addEventListener('error', () => {
      // This song's MP3 wasn't found next to the HTML file.
      songFileName.textContent = 'File not found: ' + track.file;
      setTrackLoaded(false);
    }, { once: true });

    resetScrub();
  }

  // ---------- Init ----------
  audioEl.volume = 0.7;
  updateVolUI();
  setTrackLoaded(false);
  resetScrub();
  loadTrack(0, false);
})();
