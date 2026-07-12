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
  postwar_whistle: [
    { type: "tone", wave: "triangle", duration: 0.7, gain: 0.055, frequency: 430, endFrequency: 520 },
    { type: "tone", wave: "triangle", delay: 0.78, duration: 0.55, gain: 0.045, frequency: 520, endFrequency: 410 },
  ],
  recession_bell: [
    { type: "tone", wave: "sine", duration: 0.55, gain: 0.06, frequency: 330, endFrequency: 220 },
    { type: "tone", wave: "sine", delay: 0.48, duration: 0.72, gain: 0.045, frequency: 245, endFrequency: 150 },
  ],
  boom_fanfare: [
    { type: "tone", wave: "triangle", duration: 0.2, gain: 0.045, frequency: 392, endFrequency: 440 },
    { type: "tone", wave: "triangle", delay: 0.2, duration: 0.2, gain: 0.05, frequency: 494, endFrequency: 554 },
    { type: "tone", wave: "triangle", delay: 0.4, duration: 0.5, gain: 0.055, frequency: 659, endFrequency: 740 },
  ],
  ticker: [
    { type: "noise", duration: 0.05, gain: 0.045, filter: 2300 },
    { type: "noise", delay: 0.12, duration: 0.05, gain: 0.04, filter: 2100 },
    { type: "noise", delay: 0.24, duration: 0.05, gain: 0.04, filter: 1900 },
    { type: "tone", wave: "triangle", delay: 0.36, duration: 0.42, gain: 0.05, frequency: 620, endFrequency: 760 },
  ],
  crash: [
    { type: "tone", wave: "sawtooth", duration: 0.65, gain: 0.06, frequency: 520, endFrequency: 82 },
    { type: "noise", delay: 0.16, duration: 0.55, gain: 0.08, filter: 620 },
  ],
  winter_wind: [
    { type: "noise", duration: 1.4, gain: 0.045, filter: 520 },
    { type: "tone", wave: "sine", delay: 0.18, duration: 1.05, gain: 0.03, frequency: 145, endFrequency: 105 },
  ],
  vault: [
    { type: "tone", wave: "sine", duration: 0.16, gain: 0.08, frequency: 92, endFrequency: 58 },
    { type: "noise", delay: 0.18, duration: 0.1, gain: 0.075, filter: 480 },
    { type: "tone", wave: "triangle", delay: 0.42, duration: 0.65, gain: 0.045, frequency: 330, endFrequency: 440 },
  ],
  work_hammers: [
    { type: "noise", duration: 0.08, gain: 0.065, filter: 900 },
    { type: "noise", delay: 0.25, duration: 0.08, gain: 0.06, filter: 1050 },
    { type: "noise", delay: 0.5, duration: 0.08, gain: 0.055, filter: 1200 },
    { type: "tone", wave: "triangle", delay: 0.68, duration: 0.5, gain: 0.045, frequency: 262, endFrequency: 392 },
  ],
  setback: [
    { type: "tone", wave: "triangle", duration: 0.3, gain: 0.055, frequency: 392, endFrequency: 330 },
    { type: "tone", wave: "triangle", delay: 0.28, duration: 0.55, gain: 0.05, frequency: 294, endFrequency: 196 },
  ],
  mobilization: [
    { type: "noise", duration: 0.07, gain: 0.055, filter: 1250 },
    { type: "noise", delay: 0.2, duration: 0.07, gain: 0.055, filter: 1350 },
    { type: "noise", delay: 0.4, duration: 0.07, gain: 0.055, filter: 1450 },
    { type: "tone", wave: "square", delay: 0.58, duration: 0.5, gain: 0.025, frequency: 196, endFrequency: 294 },
  ],
  recovery_rise: [
    { type: "tone", wave: "triangle", duration: 0.28, gain: 0.04, frequency: 262, endFrequency: 330 },
    { type: "tone", wave: "triangle", delay: 0.26, duration: 0.28, gain: 0.045, frequency: 330, endFrequency: 392 },
    { type: "tone", wave: "triangle", delay: 0.52, duration: 0.7, gain: 0.055, frequency: 392, endFrequency: 523 },
  ],
  celebration: [
    { type: "tone", wave: "triangle", duration: 0.22, gain: 0.055, frequency: 392, endFrequency: 440 },
    { type: "tone", wave: "triangle", delay: 0.2, duration: 0.22, gain: 0.06, frequency: 494, endFrequency: 554 },
    { type: "tone", wave: "triangle", delay: 0.4, duration: 0.22, gain: 0.065, frequency: 587, endFrequency: 659 },
    { type: "tone", wave: "triangle", delay: 0.6, duration: 0.85, gain: 0.07, frequency: 784, endFrequency: 880 },
    { type: "noise", delay: 0.82, duration: 0.42, gain: 0.035, filter: 2400 },
  ],
};

const PHASE_CUES = {
  postwar: "postwar_whistle",
  recession_1921: "recession_bell",
  early_boom: "boom_fanfare",
  speculation: "ticker",
  crash: "crash",
  deepening: "winter_wind",
  bank_holiday: "vault",
  work_relief: "work_hammers",
  second: "setback",
  defense_shift: "mobilization",
  recovery: "recovery_rise",
  results: "celebration",
};

export function phaseSoundCueFor(phaseId) {
  return PHASE_CUES[phaseId] || "paper";
}

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
  oscillator.type = event.wave || "sine";
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
