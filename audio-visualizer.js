/* ============================================================
   audio-visualizer.js
   Drop this file next to music-player.html (same folder).

   Drives the small equalizer bars in the status pill using a real
   Web Audio AnalyserNode tapped off the <audio> element — the bars
   reflect actual frequency data from whatever is currently playing,
   not a decorative loop animation.
   ============================================================ */

(function () {
  const audioEl = document.getElementById('audioEl');
  const bars = document.querySelectorAll('#eqBars span');
  if (!audioEl || !bars.length) return;

  const FFT_SIZE = 64;          // small = fine for a handful of bars, cheap on CPU
  const SMOOTHING = 0.75;       // higher = smoother/laggier bar motion
  const REST_HEIGHT = '15%';    // resting bar height while paused

  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let rafId = null;

  // The Web Audio graph can only be built once per <audio> element —
  // createMediaElementSource() throws if called a second time — so this
  // is built lazily, on first playback, and reused after that.
  function ensureAudioGraph() {
    if (audioCtx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return; // very old browser — bars just stay at rest, nothing breaks

    audioCtx = new AudioCtx();
    const source = audioCtx.createMediaElementSource(audioEl);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;

    // Route audio through the analyser and back out to speakers — skipping
    // the destination connection would make the analyser tap silent.
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  // Collapse the FFT bins down to however many bars we actually have,
  // averaging each bin group into one bar height.
  function groupIntoBands(data, bandCount) {
    const bands = new Array(bandCount).fill(0);
    const perBand = Math.max(1, Math.floor(data.length / bandCount));
    for (let b = 0; b < bandCount; b++) {
      let sum = 0;
      for (let i = 0; i < perBand; i++) sum += data[b * perBand + i] || 0;
      bands[b] = sum / perBand;
    }
    return bands;
  }

  function render() {
    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
      const bands = groupIntoBands(dataArray, bars.length);
      bands.forEach((val, i) => {
        const pct = Math.max(12, Math.min(100, (val / 255) * 100));
        bars[i].style.height = pct + '%';
      });
    }
    rafId = requestAnimationFrame(render);
  }

  function start() {
    ensureAudioGraph();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (!rafId) render();
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    bars.forEach((bar) => { bar.style.height = REST_HEIGHT; });
  }

  audioEl.addEventListener('play', start);
  audioEl.addEventListener('pause', stop);
  audioEl.addEventListener('ended', stop);
})();
