const PATTERNS = {
  paper: [
    { type: "noise", duration: 0.13, gain: 0.08, filter: 1150 },
  ],
  newspaper: [
    { type: "noise", duration: 0.2, gain: 0.11, filter: 900 },
    { type: "tone", delay: 0.03, duration: 0.08, gain: 0.07, frequency: 92, endFrequency: 62 },
  ],
  cards: [
    { type: "noise", duration: 0.07, gain: 0.05, filter: 1800 },
    { type: "noise", delay: 0.08, duration: 0.07, gain: 0.045, filter: 1650 },
    { type: "noise", delay: 0.16, duration: 0.07, gain: 0.04, filter: 1500 },
  ],
  stamp: [
    { type: "tone", duration: 0.11, gain: 0.12, frequency: 118, endFrequency: 55 },
    { type: "noise", duration: 0.055, gain: 0.08, filter: 650 },
  ],
  telegram: [
    { type: "tone", duration: 0.25, gain: 0.07, frequency: 880, endFrequency: 830 },
    { type: "tone", delay: 0.19, duration: 0.34, gain: 0.055, frequency: 1175, endFrequency: 1080 },
  ],
  gavel: [
    { type: "tone", duration: 0.12, gain: 0.13, frequency: 145, endFrequency: 58 },
    { type: "noise", duration: 0.07, gain: 0.09, filter: 520 },
    { type: "tone", delay: 0.2, duration: 0.1, gain: 0.1, frequency: 125, endFrequency: 52 },
  ],
  ready: [
    { type: "tone", duration: 0.16, gain: 0.045, frequency: 520, endFrequency: 660 },
  ],
};

let audioContext;

export function soundPatternFor(cue) {
  return PATTERNS[cue] || PATTERNS.paper;
}

function contextForPlayback() {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function connectEnvelope(context, start, event, volume) {
  const envelope = context.createGain();
  const peak = Math.max(0.0001, event.gain * volume);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.018, event.duration / 3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + event.duration);
  envelope.connect(context.destination);
  return envelope;
}

function playTone(context, start, event, volume) {
  const oscillator = context.createOscillator();
  const envelope = connectEnvelope(context, start, event, volume);
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(event.frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(event.endFrequency || event.frequency, start + event.duration);
  oscillator.connect(envelope);
  oscillator.start(start);
  oscillator.stop(start + event.duration + 0.02);
}

function playNoise(context, start, event, volume) {
  const sampleCount = Math.max(1, Math.round(context.sampleRate * event.duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = connectEnvelope(context, start, event, volume);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(event.filter || 1200, start);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(envelope);
  source.start(start);
}

export function playTabletopSound(cue, { enabled = true, volume = 1 } = {}) {
  if (!enabled) return false;
  const context = contextForPlayback();
  if (!context) return false;
  const start = context.currentTime + 0.01;
  soundPatternFor(cue).forEach((event) => {
    const eventStart = start + (event.delay || 0);
    if (event.type === "tone") playTone(context, eventStart, event, volume);
    else playNoise(context, eventStart, event, volume);
  });
  return true;
}

export function stopTabletopSounds() {
  const context = audioContext || contextForPlayback();
  if (!context) return false;
  if (context.state !== "suspended") context.suspend().catch(() => {});
  return true;
}
