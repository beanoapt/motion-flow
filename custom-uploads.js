/* ============================================================
   custom-uploads.js
   Drop this file next to music-player.html (same folder).

   Lets the person upload their own MP3 (+ optional artwork) from
   the settings panel and have it stick around across sessions —
   the actual audio/image files are stored as Blobs in IndexedDB
   (NOT localStorage, which caps out around 5MB and can't hold
   real audio files), and re-added to the live playlist on every
   page load via fresh blob: object URLs.

   Talks to audio-player.js only through its public interface
   (window.MotionFlowPlayer.addTrack / removeTrackAt / getPlaylist).
   ============================================================ */

(function () {
  if (!('indexedDB' in window)) {
    console.warn('IndexedDB not supported in this browser — custom uploads disabled.');
    return;
  }

  const player = window.MotionFlowPlayer;
  if (!player) {
    console.error('custom-uploads.js requires audio-player.js to load first.');
    return;
  }

  const DB_NAME = 'motion-flow-uploads';
  const DB_VERSION = 1;
  const STORE_NAME = 'songs';
  const MAX_FILE_MB = 60;

  const settingsBtn      = document.getElementById('settingsBtn');
  const settingsOverlay  = document.getElementById('settingsOverlay');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const uploadForm       = document.getElementById('uploadForm');
  const uploadAudioInput = document.getElementById('uploadAudioInput');
  const uploadArtInput   = document.getElementById('uploadArtInput');
  const uploadTitleInput = document.getElementById('uploadTitleInput');
  const uploadArtistInput = document.getElementById('uploadArtistInput');
  const uploadStatus     = document.getElementById('uploadStatus');
  const uploadsList      = document.getElementById('uploadsList');
  const queueOverlay     = document.getElementById('queueOverlay'); // for mutual-exclusion with the queue panel

  let db = null;

  // ---------- IndexedDB helpers ----------
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbGetAll() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function dbPut(record) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function dbDelete(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function makeId() {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'up_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  }

  // ---------- Convert a stored record into a playable track ----------
  // Object URLs only live for the current page session, so these are
  // regenerated fresh every time — the underlying Blobs persist in
  // IndexedDB permanently regardless.
  function trackFromRecord(record) {
    return {
      file: URL.createObjectURL(record.audioBlob),
      title: record.title || 'Untitled',
      artist: record.artist || 'Unknown Artist',
      art: record.artworkBlob ? URL.createObjectURL(record.artworkBlob) : '',
      uploadId: record.id,
    };
  }

  // ---------- Settings panel open/close ----------
  function openSettings() {
    if (queueOverlay) queueOverlay.classList.remove('open');
    settingsOverlay.classList.add('open');
  }
  function closeSettings() {
    settingsOverlay.classList.remove('open');
  }
  settingsBtn.addEventListener('click', openSettings);
  settingsCloseBtn.addEventListener('click', closeSettings);

  function setStatus(message, type) {
    uploadStatus.textContent = message || '';
    uploadStatus.className = 'upload-status' + (type ? ' ' + type : '');
  }

  // ---------- "My Uploads" list ----------
  function renderUploadsList(records) {
    uploadsList.innerHTML = '';

    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'uploads-empty';
      empty.textContent = 'No uploads yet — add a song above.';
      uploadsList.appendChild(empty);
      return;
    }

    records.forEach((record) => {
      const item = document.createElement('div');
      item.className = 'upload-item';

      const art = document.createElement('img');
      art.className = 'upload-item-art';
      art.alt = '';
      if (record.artworkBlob) art.src = URL.createObjectURL(record.artworkBlob);

      const text = document.createElement('div');
      text.className = 'upload-item-text';
      const title = document.createElement('div');
      title.className = 'upload-item-title';
      title.textContent = record.title || 'Untitled';
      const artist = document.createElement('div');
      artist.className = 'upload-item-artist';
      artist.textContent = record.artist || 'Unknown Artist';
      text.appendChild(title);
      text.appendChild(artist);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'upload-item-delete';
      del.setAttribute('aria-label', 'Delete ' + (record.title || 'upload'));
      del.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>';
      del.addEventListener('click', () => removeUpload(record.id));

      item.appendChild(art);
      item.appendChild(text);
      item.appendChild(del);
      uploadsList.appendChild(item);
    });
  }

  async function refreshUploadsUI() {
    try {
      const records = await dbGetAll();
      renderUploadsList(records);
    } catch (err) {
      console.error('Could not load uploads:', err);
    }
  }

  async function removeUpload(id) {
    try {
      await dbDelete(id);
    } catch (err) {
      console.error('Could not delete upload:', err);
      return;
    }
    // Find this upload's current position in the live playlist by its
    // permanent uploadId — safer than tracking a raw index, since the
    // playlist can shift as other tracks are added/removed.
    const playlist = player.getPlaylist();
    const idx = playlist.findIndex((t) => t.uploadId === id);
    if (idx !== -1) player.removeTrackAt(idx);
    refreshUploadsUI();
  }

  // ---------- Upload form ----------
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const audioFile = uploadAudioInput.files[0];
    if (!audioFile) { setStatus('Choose an MP3 file first.', 'error'); return; }
    if (audioFile.size > MAX_FILE_MB * 1024 * 1024) {
      setStatus('That file is over ' + MAX_FILE_MB + 'MB — try a smaller one.', 'error');
      return;
    }
    const artworkFile = uploadArtInput.files[0] || null;

    const record = {
      id: makeId(),
      title: uploadTitleInput.value.trim() || audioFile.name.replace(/\.[^/.]+$/, ''),
      artist: uploadArtistInput.value.trim() || 'Unknown Artist',
      audioBlob: audioFile,
      artworkBlob: artworkFile,
      createdAt: Date.now(),
    };

    setStatus('Saving…');
    try {
      await dbPut(record);
    } catch (err) {
      console.error('Could not save upload:', err);
      setStatus('Could not save — storage may be full.', 'error');
      return;
    }

    player.addTrack(trackFromRecord(record));
    setStatus('Added to your playlist!', 'success');
    uploadForm.reset();
    refreshUploadsUI();
  });

  // ---------- Init: restore previously saved uploads into the live playlist ----------
  (async function init() {
    try {
      db = await openDB();
    } catch (err) {
      console.error('Could not open the uploads database:', err);
      return;
    }

    let records = [];
    try {
      records = await dbGetAll();
    } catch (err) {
      console.error('Could not read saved uploads:', err);
    }

    records.forEach((record) => {
      try {
        player.addTrack(trackFromRecord(record));
      } catch (err) {
        console.error('Could not restore upload:', record.title, err);
      }
    });

    renderUploadsList(records);
  })();
})();
