# Motion Flow — v0.01

A glassy, Apple-inspired "Now Playing" music player for the web. Real audio playback, artwork that syncs per song, a spatial mouse/gyroscope tilt effect, toggleable gradient backgrounds, and floating ambient bubbles — all in plain HTML/CSS/JS, no build step, no dependencies.

![status](https://img.shields.io/badge/status-in--development-orange) ![version](https://img.shields.io/badge/version-0.01-blue)

## Features

- **Glassmorphic player card** — frosted glass panel, rounded corners, soft top sheen, no upload UI — everything is driven by a simple playlist you define in code
- **Real MP3 playback** — plays actual audio files bundled with the project, with working play/pause, scrubbing, and volume
- **Per-song artwork sync** — each track carries its own artwork; switching songs (via buttons, scroll, or auto-advance) crossfades the artwork automatically
- **Scroll-to-skip** — scroll your mouse wheel over the card to jump to the next/previous track (page scrolling elsewhere is untouched)
- **Spatial tilt effect** — the card subtly tilts toward your cursor on desktop, or toward your phone's real gyroscope on mobile (with a proper iOS permission prompt)
- **Toggleable gradient backgrounds** — Purple, Teal, Orange, Baby Blue, and Black, each a soft multi-layer glow behind the card, crossfading smoothly on switch and remembered across visits
- **Floating bubbles** — subtle, randomized translucent bubbles drifting slowly behind the card
- **Responsive** — scales down on small screens, scrolls gracefully if the card is taller than the viewport

## Project structure

```
motion-flow/
├── music-player.html       # Markup + all styling
├── audio-player.js         # Playlist, playback, scrubbing, volume, scroll-to-skip
├── tilt-effect.js          # Mouse + gyroscope spatial tilt
├── background-themes.js    # Gradient theme switcher
├── floating-bubbles.js     # Ambient floating bubbles
├── song1.mp3 / song1.jpg   # Track 1 audio + artwork
├── song2.mp3 / song2.jpg   # Track 2 audio + artwork
└── README.md
```

## Setup

1. Clone or download this folder as-is — every file must stay in the same directory.
2. Add your own songs by editing the `PLAYLIST` array at the top of `audio-player.js`:

   ```js
   const PLAYLIST = [
     { file: 'song1.mp3', title: 'Always Up', artist: 'Jon Keith', art: 'song1.jpg' },
     { file: 'song2.mp3', title: 'What A Life', artist: 'Jon Keith', art: 'song2.jpg' },
     // add more entries here — file, title, artist, art all live in this folder
   ];
   ```

3. Serve the folder with a local static server (opening the HTML file directly via `file://` will block audio/image loading in most browsers):

   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000/music-player.html
   ```

4. On mobile, tap **"Enable tilt effect"** the first time to grant motion access (iOS only — Android and desktop don't need it).

## Known limitations (v0.01)

- Playlist is defined in code, not loaded from a folder or config file
- No shuffle or repeat modes yet
- Background theme colors are fixed presets — no custom color picker yet
- Bubble count/intensity isn't user-adjustable

## Roadmap ideas

- Drag-and-drop playlist reordering
- Custom gradient color picker
- Shuffle / repeat-one modes
- Keyboard shortcuts (space to play/pause, arrows to skip)

---

Built iteratively with Claude.
