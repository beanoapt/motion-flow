/* ============================================================
   media-session.js
   Drop this file next to music-player.html (same folder).

   Integrates with the browser's Media Session API so this player
   shows up properly on lock screens / notification shades with
   real artwork, title, and artist — and responds to hardware
   controls (earbud buttons, car stereo, keyboard media keys,
   lock-screen scrubbing) exactly like a native music app.

   Talks to audio-player.js only through its public interface
   (window.MotionFlowPlayer) plus the real <audio> element and
   button IDs already in the page — no changes needed there.
   ============================================================ */

(function () {
  if (!('mediaSession' in navigator)) return; // unsupported browser — nothing to do

  const audioEl = document.getElementById('audioEl');
  const playBtn = document.getElementById('playBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const player  = window.MotionFlowPlayer;

  if (!audioEl || !player) {
    console.error('media-session.js requires audio-player.js to load first.');
    return;
  }

  function guessMimeType(src) {
    const ext = (src.split('.').pop() || '').toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
  }

  // ---------- Metadata: title, artist, artwork on the lock screen ----------
  function updateMetadata() {
    const playlist = player.getPlaylist();
    const track = playlist[player.getCurrentIndex()];
    if (!track) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || track.file,
      artist: track.artist || '',
      album: 'Motion Flow',
      artwork: track.art ? [
        { src: track.art, sizes: '512x512', type: guessMimeType(track.art) },
      ] : [],
    });
  }

  // ---------- Hardware / lock-screen controls ----------
  // Route through the existing on-screen buttons so shuffle, repeat, and
  // the "stop at end of playlist" behavior all stay respected — this file
  // never duplicates that logic.
  navigator.mediaSession.setActionHandler('play',  () => playBtn && playBtn.click());
  navigator.mediaSession.setActionHandler('pause', () => playBtn && playBtn.click());
  navigator.mediaSession.setActionHandler('previoustrack', () => prevBtn && prevBtn.click());
  navigator.mediaSession.setActionHandler('nexttrack',     () => nextBtn && nextBtn.click());

  // Seeking support isn't universal across browsers — fail quietly where absent.
  try {
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.fastSeek && 'fastSeek' in audioEl) {
        audioEl.fastSeek(details.seekTime);
      } else {
        audioEl.currentTime = details.seekTime;
      }
    });
  } catch (err) { /* not supported here — the rest still works */ }

  try {
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      audioEl.currentTime = Math.max(0, audioEl.currentTime - (details.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const dur = audioEl.duration || 0;
      audioEl.currentTime = Math.min(dur, audioEl.currentTime + (details.seekOffset || 10));
    });
  } catch (err) { /* not supported here — the rest still works */ }

  // ---------- Playback state: keeps the lock-screen play/pause icon correct ----------
  function updatePlaybackState() {
    navigator.mediaSession.playbackState = audioEl.paused ? 'paused' : 'playing';
  }
  audioEl.addEventListener('play', updatePlaybackState);
  audioEl.addEventListener('pause', updatePlaybackState);

  // ---------- Position state: lets the OS draw a live, scrubbable progress bar ----------
  function updatePositionState() {
    if (!('setPositionState' in navigator.mediaSession)) return;
    if (!audioEl.duration || isNaN(audioEl.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audioEl.duration,
        playbackRate: audioEl.playbackRate || 1,
        position: audioEl.currentTime,
      });
    } catch (err) {
      // Can throw momentarily if position/duration are briefly out of sync
      // during a track swap — harmless, just skip that update.
    }
  }
  audioEl.addEventListener('loadedmetadata', updatePositionState);
  audioEl.addEventListener('timeupdate', updatePositionState);

  // ---------- Keep everything in sync whenever the track changes ----------
  player.onTrackChange(updateMetadata);
  updateMetadata(); // covers the case where a track is already loaded by the time this runs
})();
