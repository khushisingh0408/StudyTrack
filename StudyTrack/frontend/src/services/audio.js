// Web Audio API chime player and ambient white-noise focus generator

let ambientNode = null;
let ambientGain = null;
let ambientCtx = null;

export const playChime = (type = "success") => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === "success") {
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.01, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.85);
      });
    } else if (type === "tick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    console.warn("Audio playback issue", e);
  }
};

export const toggleFocusAmbience = (enable = false) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!enable) {
      if (ambientGain && ambientCtx) {
        ambientGain.gain.exponentialRampToValueAtTime(0.001, ambientCtx.currentTime + 0.5);
        setTimeout(() => {
          if (ambientNode) {
            ambientNode.stop();
            ambientNode.disconnect();
            ambientNode = null;
          }
        }, 600);
      }
      return;
    }

    ambientCtx = new AudioContext();
    const bufferSize = ambientCtx.sampleRate * 2;
    const buffer = ambientCtx.createBuffer(1, bufferSize, ambientCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink / Brown soothing rain noise
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    ambientNode = ambientCtx.createBufferSource();
    ambientNode.buffer = buffer;
    ambientNode.loop = true;

    // Gentle low-pass filter
    const filter = ambientCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;

    ambientGain = ambientCtx.createGain();
    ambientGain.gain.setValueAtTime(0.01, ambientCtx.currentTime);
    ambientGain.gain.exponentialRampToValueAtTime(0.15, ambientCtx.currentTime + 1);

    ambientNode.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(ambientCtx.destination);

    ambientNode.start(0);
  } catch (e) {
    console.warn("Ambience sound could not start", e);
  }
};
