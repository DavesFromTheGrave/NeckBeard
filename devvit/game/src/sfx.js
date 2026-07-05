// Tiny WebAudio synth — zero assets, real juice. Every cue is generated.
window.NB = window.NB || {};

NB.sfx = (() => {
  let ctx = null;
  const ac = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());

  function tone(freq, dur, type = 'square', vol = 0.12, slideTo = null) {
    try {
      const a = ac();
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.value = freq;
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g).connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    } catch (e) { /* audio blocked until first gesture — fine */ }
  }
  function noise(dur, vol = 0.1) {
    try {
      const a = ac();
      const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = a.createBufferSource(), g = a.createGain();
      s.buffer = buf; g.gain.value = vol;
      s.connect(g).connect(a.destination); s.start();
    } catch (e) {}
  }

  return {
    telegraph: () => tone(180, 0.45, 'sawtooth', 0.10, 90),
    lunge:     () => tone(300, 0.18, 'square', 0.14, 700),
    stumble:   () => { tone(160, 0.12, 'triangle', 0.1, 80); noise(0.15, 0.06); },
    vault:     () => { tone(140, 0.16, 'square', 0.09, 210); noise(0.1, 0.05); }, // grunt + scuff
    cheer:     () => { tone(700, 0.1, 'square', 0.08, 1050); setTimeout(() => tone(920, 0.12, 'square', 0.07), 90); },
    caught:    () => { tone(120, 0.6, 'sawtooth', 0.18, 40); noise(0.5, 0.14); },
    pickup:    () => tone(660, 0.12, 'square', 0.1, 990),
    shieldPop: () => tone(440, 0.25, 'triangle', 0.14, 110),
    throwWind: () => tone(220, 0.3, 'sawtooth', 0.08, 320),
    commentHit:() => { tone(200, 0.15, 'square', 0.12, 60); noise(0.12, 0.08); },
    yank:      () => tone(500, 0.5, 'sawtooth', 0.12, 60),
    crack:     () => { noise(0.6, 0.18); tone(70, 0.7, 'sawtooth', 0.14, 35); },
    ding:      () => { tone(880, 0.4, 'sine', 0.12); setTimeout(() => tone(1174, 0.5, 'sine', 0.1), 140); },
    gulp:      () => tone(400, 0.5, 'sine', 0.14, 55),
    revenant:  () => { tone(55, 1.4, 'sawtooth', 0.16, 110); noise(0.8, 0.08); },
  };
})();
