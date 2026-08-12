# Motion Flow — v0.2

A glassy, Apple-inspired "Now Playing" music player for the web. Real audio playback, per-song artwork with auto-tinted ambient lighting, a spatial mouse/gyroscope tilt effect, a live audio-reactive equalizer, a drag-to-reorder queue, liked songs, user-uploaded tracks that persist across sessions, lock-screen/hardware media controls, custom gradient backgrounds, and floating ambient bubbles — all in plain HTML/CSS/JS, no build step, no framework, no dependencies.

![status](https://img.shields.io/badge/status-in--development-orange) ![version](https://img.shields.io/badge/version-0.2-blue)

## Features

**Playback**
- Real MP3 playback with working play/pause, scrubbing, and volume
- Playlist loaded from `playlist.json`, not hardcoded — add songs without touching any code
- Shuffle and repeat (off → all → one), with a proper "1" badge for repeat-one
- Scroll-to-skip (desktop), swipe-to-skip (mobile — swipe right for next, left for previous)
- Full keyboard shortcuts: space to play/pause, arrows to skip/adjust volume

**Now Playing card**
- Glassmorphic panel — frosted glass, rounded corners, soft top sheen
- Per-song artwork that crossfades automatically on track change
- Ambient glow behind the card auto-tints to match each artwork's actual dominant color (sampled via canvas)
- Live 4-bar equalizer, driven by a real Web Audio `AnalyserNode` — reacts to the actual audio, not a decorative loop
- Spatial tilt effect: the card tilts toward your cursor on desktop, or toward your phone's real gyroscope on mobile

**Queue & library**
- Full queue panel — see every track, jump to any song, drag to reorder (grip handle, works with mouse or touch)
- "Liked only" filter within the queue
- Heart/like toggle, persisted across visits
- Settings panel: upload your own MP3s (+ optional artwork), stored permanently via IndexedDB, restored automatically on every visit

**Personalization**
- 6 background themes — 5 fixed presets (Purple, Teal, Orange, Baby Blue, Black) plus a real color picker for a fully custom gradient, all crossfading smoothly and remembered across visits
- Floating translucent bubbles drifting slowly behind the card

**Platform integration**
- Media Session API — real lock-screen artwork/title/artist, hardware media key support (earbuds, car stereo, keyboard media keys), and a scrubbable lock-screen progress bar
- Fully responsive — scales down on small screens, scrolls gracefully if the card is taller than the viewport, larger touch targets on touch devices

## Project structure

```
motion-flow/
├── music-player.html       # Markup + all styling
├── audio-player.js         # Core playback engine: playlist, scrubbing, volume,
│                            #   shuffle/repeat, swipe/scroll/keyboard skip,
│                            #   exposes window.MotionFlowPlayer for other files
├── playlist.json           # Song list — edit this to add/remove built-in tracks
├── tilt-effect.js          # Mouse + gyroscope spatial tilt
├── background-themes.js    # Gradient theme switcher + custom color picker
├── floating-bubbles.js     # Ambient floating bubbles
├── audio-visualizer.js     # Live equalizer bars (Web Audio AnalyserNode)
├── queue-and-likes.js      # Queue panel, drag-to-reorder, liked songs
├── custom-uploads.js       # Settings panel + IndexedDB-backed song uploads
├── media-session.js        # Lock-screen / hardware media controls
├── song1.mp3 / song1.jpg   # Track 1 audio + artwork
├── song2.mp3 / song2.jpg   # Track 2 audio + artwork
└── README.md
```

All feature files talk to the playback engine only through `window.MotionFlowPlayer` (`getPlaylist`, `getCurrentIndex`, `jumpTo`, `addTrack`, `removeTrackAt`, `moveTrack`, `onTrackChange`) rather than reaching into `audio-player.js` internals — each file is a self-contained add-on.

## Setup

1. Clone or download this folder as-is — every file must stay in the same directory.
2. Add built-in songs by editing `playlist.json`:

   ```json
   [
     { "file": "song1.mp3", "title": "Always Up", "artist": "Jon Keith", "art": "song1.jpg" },
     { "file": "song2.mp3", "title": "What A Life", "artist": "Jon Keith", "art": "song2.jpg" }
   ]
   ```

   Each entry needs a `file` (mp3), `title`, `artist`, and `art` (artwork image) — all files must sit in the same folder as `music-player.html`.

3. Serve the folder with a local static server — opening the HTML file directly via `file://` will block audio/image loading, `fetch()` of `playlist.json`, and IndexedDB in most browsers:

   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000/music-player.html
   ```

4. On mobile, tap **"Enable tilt effect"** the first time to grant motion access (iOS only — Android and desktop don't need it).
5. To add your own songs at runtime instead of editing `playlist.json`, use the gear icon (top-right) → **Upload a song**. These are stored locally in your browser via IndexedDB and persist across visits, but are per-browser/per-device — they aren't shared with anyone else visiting the page.

### Deploying (e.g. GitHub Pages)

Works as-is — commit every file including the mp3/jpg assets. `fetch()`, IndexedDB, and the Media Session API all require a real server context (which GitHub Pages provides over HTTPS); they will not work if the HTML is opened directly from disk. Keep filenames' case exactly matching what's referenced in `playlist.json` — GitHub Pages is case-sensitive even if your local machine isn't.

## Known limitations

- Shuffle has no play history — "previous" while shuffling picks a new random track rather than stepping back through what's already played
- Drag-to-reorder in the queue is disabled while the "liked only" filter is active (reordering a filtered view would shift indices unpredictably)
- Uploaded songs live in the browser's IndexedDB, so they're local to whichever browser/device uploaded them — not synced anywhere
- No Spotify integration — evaluated, but the current Spotify Developer Platform restrictions (Premium-only, 5-user cap on new Development Mode apps as of Feb 2026) make it impractical for a public-facing page; metadata-only integration remains a viable future option

## Roadmap ideas

- Shuffle-aware "liked songs only" playback mode (currently the like filter only affects what's *shown* in the queue, not what shuffle picks)
- PWA support (installable, offline-capable via a manifest + service worker)
- Resume last-played track/position on reload

---

Built iteratively with Claude.
