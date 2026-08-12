/* ============================================================
   queue-and-likes.js
   Drop this file next to music-player.html (same folder).

   Adds two things on top of the existing player:
     - A "Queue" panel (opened via the pill at the bottom) that
       lists every song in the playlist, highlights what's
       currently playing, and jumps to any track on tap.
     - A heart/like toggle for the current song, plus a filter
       inside the queue to show only liked songs. Likes persist
       across visits via localStorage.

   This file talks to audio-player.js only through the small
   public interface it exposes on window.MotionFlowPlayer —
   it never reaches into audio-player.js's internals directly.
   ============================================================ */

(function () {
  const player = window.MotionFlowPlayer;
  if (!player) {
    console.error('queue-and-likes.js requires audio-player.js to load first.');
    return;
  }

  const LIKES_KEY = 'now-playing-liked-songs';

  const likeBtn            = document.getElementById('likeBtn');
  const queueToggleBtn     = document.getElementById('queueToggleBtn');
  const queueOverlay       = document.getElementById('queueOverlay');
  const queueList          = document.getElementById('queueList');
  const queueCloseBtn      = document.getElementById('queueCloseBtn');
  const queueLikedFilterBtn = document.getElementById('queueLikedFilterBtn');

  let likedFiles = loadLikes();     // Set of playlist "file" values the user has liked
  let showLikedOnly = false;

  // ---------- Persistence ----------
  function loadLikes() {
    try {
      const raw = localStorage.getItem(LIKES_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.warn('Could not read liked songs:', err);
      return new Set();
    }
  }

  function saveLikes() {
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(likedFiles)));
    } catch (err) {
      console.warn('Could not save liked songs:', err); // e.g. private browsing mode
    }
  }

  // Uploaded songs get a fresh blob URL every session, so `file` isn't a
  // stable identity for them — fall back to their permanent uploadId instead.
  function likeKey(track) {
    return track ? (track.uploadId || track.file) : null;
  }

  function isLiked(track) {
    const key = likeKey(track);
    return !!key && likedFiles.has(key);
  }

  function toggleLike(track) {
    const key = likeKey(track);
    if (!key) return;
    if (likedFiles.has(key)) likedFiles.delete(key);
    else likedFiles.add(key);
    saveLikes();
    refreshLikeButton();
    if (queueOverlay.classList.contains('open')) renderQueue();
  }

  // ---------- Like button (current track) ----------
  function refreshLikeButton() {
    const playlist = player.getPlaylist();
    const track = playlist[player.getCurrentIndex()];
    likeBtn.classList.toggle('active', isLiked(track));
  }

  likeBtn.addEventListener('click', () => {
    const playlist = player.getPlaylist();
    toggleLike(playlist[player.getCurrentIndex()]);
  });

  // ---------- Queue panel ----------
  function openQueue() {
    const settingsOverlay = document.getElementById('settingsOverlay');
    if (settingsOverlay) settingsOverlay.classList.remove('open');
    renderQueue();
    queueOverlay.classList.add('open');
  }
  function closeQueue() {
    queueOverlay.classList.remove('open');
  }

  queueToggleBtn.addEventListener('click', openQueue);
  queueCloseBtn.addEventListener('click', closeQueue);

  queueLikedFilterBtn.addEventListener('click', () => {
    showLikedOnly = !showLikedOnly;
    queueLikedFilterBtn.classList.toggle('active', showLikedOnly);
    renderQueue();
  });

  function renderQueue() {
    const playlist = player.getPlaylist();
    const currentIndex = player.getCurrentIndex();

    queueList.innerHTML = '';
    queueList.classList.toggle('filtered', showLikedOnly); // hides drag handles — see reasoning below

    const entries = playlist
      .map((track, index) => ({ track, index }))
      .filter(({ track }) => !showLikedOnly || isLiked(track));

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'queue-empty';
      empty.textContent = showLikedOnly ? 'No liked songs yet' : 'Playlist is empty';
      queueList.appendChild(empty);
      return;
    }

    entries.forEach(({ track, index }) => {
      const item = document.createElement('div');
      item.className = 'queue-item' + (index === currentIndex ? ' active' : '');
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      item.dataset.index = String(index);

      const handle = document.createElement('div');
      handle.className = 'queue-item-handle';
      handle.setAttribute('aria-label', 'Drag to reorder');
      handle.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/>' +
        '<circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/>' +
        '<circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>';

      const art = document.createElement('img');
      art.className = 'queue-item-art';
      art.src = track.art || '';
      art.alt = '';
      art.loading = 'lazy';

      const text = document.createElement('div');
      text.className = 'queue-item-text';
      const title = document.createElement('div');
      title.className = 'queue-item-title';
      title.textContent = track.title || track.file;
      const artist = document.createElement('div');
      artist.className = 'queue-item-artist';
      artist.textContent = track.artist || '';
      text.appendChild(title);
      text.appendChild(artist);

      const heart = document.createElement('button');
      heart.type = 'button';
      heart.className = 'queue-item-like' + (isLiked(track) ? ' liked' : '');
      heart.setAttribute('aria-label', 'Like');
      heart.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.8 2 4.5 5.3 4c2-.3 3.9.6 5 2.2C11.4 4.6 13.3 3.7 15.3 4c3.3.5 4.9 3.8 3.3 7.2-2.5 4.7-10 9.3-10 9.3z"/></svg>';
      heart.addEventListener('click', (e) => {
        e.stopPropagation(); // don't also trigger jumping to the track
        toggleLike(track);
      });

      const jumpToTrack = () => {
        player.jumpTo(index);
        closeQueue();
      };
      item.addEventListener('click', (e) => {
        // A drag that started on the handle shouldn't also jump to the track.
        if (e.target.closest('.queue-item-handle')) return;
        jumpToTrack();
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpToTrack(); }
      });

      if (!showLikedOnly) attachDragHandle(handle, item, index);

      item.appendChild(handle);
      item.appendChild(art);
      item.appendChild(text);
      item.appendChild(heart);
      queueList.appendChild(item);
    });
  }

  // ---------- Drag to reorder ----------
  // Reordering is only enabled on the unfiltered list — with "liked only"
  // active, an item's on-screen position no longer matches its real
  // playlist index, which would make dragging behave unpredictably.
  function attachDragHandle(handleEl, itemEl, fromIndex) {
    handleEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startDrag(e, itemEl, fromIndex);
    });
  }

  function startDrag(e, itemEl, fromIndex) {
    const startY = e.clientY;
    let targetIndex = fromIndex;

    itemEl.classList.add('dragging');
    itemEl.style.position = 'relative';
    try { itemEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }

    // Every other row currently in the list, used to figure out where the
    // dragged item should land based on pointer position.
    const siblings = Array.from(queueList.querySelectorAll('.queue-item')).filter((el) => el !== itemEl);

    function onMove(ev) {
      itemEl.style.transform = `translateY(${ev.clientY - startY}px)`;
      targetIndex = computeTargetIndex(ev.clientY, siblings, fromIndex);
    }

    function onUp(ev) {
      itemEl.removeEventListener('pointermove', onMove);
      itemEl.removeEventListener('pointerup', onUp);
      itemEl.removeEventListener('pointercancel', onUp);
      try { itemEl.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }

      itemEl.classList.remove('dragging');
      itemEl.style.transform = '';
      itemEl.style.position = '';

      if (targetIndex !== fromIndex) {
        player.moveTrack(fromIndex, targetIndex);
      }
      renderQueue();
    }

    itemEl.addEventListener('pointermove', onMove);
    itemEl.addEventListener('pointerup', onUp);
    itemEl.addEventListener('pointercancel', onUp);
  }

  function clampToPlaylist(i) {
    const max = player.getPlaylist().length - 1;
    return Math.max(0, Math.min(max, i));
  }

  // Figures out which real playlist index the dragged item should move to,
  // based on which sibling row the pointer is currently above.
  function computeTargetIndex(pointerY, siblings, fromIndex) {
    for (let i = 0; i < siblings.length; i++) {
      const rect = siblings[i].getBoundingClientRect();
      if (pointerY < rect.top + rect.height / 2) {
        let raw = Number(siblings[i].dataset.index);
        // Dragging downward past a sibling: once the dragged item is
        // removed from its original spot, everything after that spot
        // shifts back by one — so the true insertion point is one less
        // than this sibling's original index.
        if (raw > fromIndex) raw -= 1;
        return clampToPlaylist(raw);
      }
    }
    // Dropped below every sibling — goes to the very end of the list.
    return clampToPlaylist(player.getPlaylist().length - 1);
  }

  // Keep the like button and (if open) the queue panel in sync whenever the track changes
  player.onTrackChange(() => {
    refreshLikeButton();
    if (queueOverlay.classList.contains('open')) renderQueue();
  });

  refreshLikeButton();
})();
