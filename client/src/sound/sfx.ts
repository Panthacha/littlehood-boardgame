// Sound effects, synthesized with the Web Audio API (no audio files to
// download or license). Browsers only allow audio after a user gesture, so
// the context is created/resumed on the first tap or click anywhere.
// Mute is remembered per device in localStorage.

export type Sfx =
  | 'tap' | 'select' | 'tick' | 'tickUrgent' | 'go' | 'start' | 'reveal'
  | 'correct' | 'wrong' | 'page' | 'stamp' | 'complete' | 'fanfare'
  | 'shuffle' | 'flip' | 'lantern' | 'coin' | 'night' | 'howl' | 'bell'
  | 'sleep' | 'attack' | 'shield' | 'magic' | 'victory' | 'defeat' | 'gong';

const MUTE_KEY = 'lh-sound-muted';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } })();
const listeners = new Set<(m: boolean) => void>();

const ensure = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// Unlock audio on the first interaction (required by mobile browsers).
if (typeof window !== 'undefined') {
  const unlock = () => { ensure(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export const isMuted = () => muted;
export const setMuted = (m: boolean) => {
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* private mode */ }
  listeners.forEach(fn => fn(m));
};
export const onMuteChange = (fn: (m: boolean) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

// --- building blocks -------------------------------------------------------
type Wave = OscillatorType;
const tone = (c: AudioContext, at: number, freq: number, dur: number, opts: { type?: Wave; gain?: number; to?: number; attack?: number } = {}) => {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type || 'sine';
  o.frequency.setValueAtTime(freq, at);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
  const peak = opts.gain ?? 0.3;
  const a = opts.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + a);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.05);
};

let noiseBuf: AudioBuffer | null = null;
const noise = (c: AudioContext, at: number, dur: number, opts: { freq?: number; q?: number; gain?: number; type?: BiquadFilterType; sweepTo?: number } = {}) => {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = opts.type || 'bandpass';
  f.frequency.setValueAtTime(opts.freq ?? 1200, at);
  if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, at + dur);
  f.Q.value = opts.q ?? 1;
  const g = c.createGain();
  const peak = opts.gain ?? 0.3;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.05);
};

const arpeggio = (c: AudioContext, t: number, notes: number[], step: number, opts: { type?: Wave; gain?: number; dur?: number } = {}) =>
  notes.forEach((f, i) => tone(c, t + i * step, f, opts.dur ?? 0.35, { type: opts.type || 'triangle', gain: opts.gain ?? 0.22 }));

// note frequencies used below
const N = { C4: 261.6, E4: 329.6, G4: 392, A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, C6: 1046.5, E6: 1318.5, G3: 196, C3: 130.8, A3: 220, F3: 174.6 };

// --- the effects ------------------------------------------------------------
const SOUNDS: Record<Sfx, (c: AudioContext, t: number) => void> = {
  // soft wooden knock for buttons
  tap: (c, t) => { tone(c, t, 220, 0.07, { type: 'triangle', gain: 0.18, to: 140 }); noise(c, t, 0.04, { freq: 1800, q: 3, gain: 0.06 }); },
  select: (c, t) => { tone(c, t, N.G4, 0.12, { type: 'triangle', gain: 0.2 }); tone(c, t + 0.06, N.C5, 0.18, { type: 'triangle', gain: 0.2 }); },
  tick: (c, t) => tone(c, t, 880, 0.08, { type: 'square', gain: 0.08 }),
  tickUrgent: (c, t) => { tone(c, t, 1180, 0.09, { type: 'square', gain: 0.1 }); },
  go: (c, t) => { arpeggio(c, t, [N.C5, N.E5, N.G5], 0.06, { type: 'square', gain: 0.1, dur: 0.3 }); },
  start: (c, t) => { tone(c, t, N.G4, 0.4, { type: 'triangle', gain: 0.18 }); tone(c, t + 0.12, N.C5, 0.5, { type: 'triangle', gain: 0.18 }); },
  // sparkle for a reveal / correct answer appearing
  reveal: (c, t) => { [N.E6, N.G5 * 2, N.C6 * 1.5, N.E6 * 1.2].forEach((f, i) => tone(c, t + i * 0.07, f, 0.5, { type: 'sine', gain: 0.09 })); },
  correct: (c, t) => { arpeggio(c, t, [N.C5, N.E5, N.G5, N.C6], 0.07, { gain: 0.2 }); },
  wrong: (c, t) => { tone(c, t, 196, 0.28, { type: 'sawtooth', gain: 0.1, to: 140 }); tone(c, t + 0.12, 155, 0.3, { type: 'sawtooth', gain: 0.08, to: 110 }); },
  // paper page turn: filtered noise sweep
  page: (c, t) => { noise(c, t, 0.32, { freq: 600, sweepTo: 3500, q: 0.8, gain: 0.12 }); },
  stamp: (c, t) => { tone(c, t, 110, 0.18, { type: 'sine', gain: 0.45, to: 55 }); noise(c, t, 0.08, { freq: 400, q: 1, gain: 0.2 }); },
  complete: (c, t) => { arpeggio(c, t, [N.G4, N.C5, N.E5, N.G5], 0.09, { gain: 0.2, dur: 0.5 }); },
  fanfare: (c, t) => {
    arpeggio(c, t, [N.C4, N.E4, N.G4], 0.12, { type: 'sawtooth', gain: 0.07, dur: 0.25 });
    tone(c, t + 0.4, N.C5, 0.9, { type: 'sawtooth', gain: 0.08 });
    tone(c, t + 0.4, N.E5, 0.9, { type: 'triangle', gain: 0.12 });
    tone(c, t + 0.4, N.G5, 0.9, { type: 'triangle', gain: 0.1 });
  },
  // card riffle: quick ticks of noise
  shuffle: (c, t) => { for (let i = 0; i < 14; i++) noise(c, t + i * 0.045 + Math.random() * 0.01, 0.035, { freq: 2500 + Math.random() * 1500, q: 2, gain: 0.12 }); },
  flip: (c, t) => { noise(c, t, 0.18, { freq: 900, sweepTo: 4000, q: 1.2, gain: 0.14 }); tone(c, t + 0.12, N.A5, 0.3, { gain: 0.08 }); },
  // lantern lighting: warm rising chime
  lantern: (c, t) => { tone(c, t, N.E5, 0.6, { gain: 0.14 }); tone(c, t + 0.08, N.A5, 0.7, { gain: 0.1 }); noise(c, t, 0.25, { freq: 3000, q: 0.7, gain: 0.04 }); },
  coin: (c, t) => { tone(c, t, 988, 0.08, { type: 'square', gain: 0.08 }); tone(c, t + 0.07, 1319, 0.3, { type: 'square', gain: 0.08 }); },
  // nightfall: low drone swelling, then an owl-ish hoot
  night: (c, t) => {
    tone(c, t, N.C3, 2.4, { type: 'sine', gain: 0.2, attack: 0.8 });
    tone(c, t, N.G3, 2.4, { type: 'sine', gain: 0.12, attack: 0.9 });
    noise(c, t, 2.2, { type: 'lowpass', freq: 500, gain: 0.05 });
    tone(c, t + 1.4, 420, 0.25, { gain: 0.1, to: 380 });
    tone(c, t + 1.75, 420, 0.4, { gain: 0.1, to: 360 });
  },
  // wolf howl: rising then falling sine with vibrato-ish second voice
  howl: (c, t) => {
    tone(c, t, 300, 0.6, { type: 'sine', gain: 0.16, to: 620, attack: 0.25 });
    tone(c, t + 0.55, 620, 1.3, { type: 'sine', gain: 0.16, to: 380 });
    tone(c, t + 0.05, 305, 0.6, { type: 'triangle', gain: 0.06, to: 630, attack: 0.25 });
    tone(c, t + 0.6, 630, 1.25, { type: 'triangle', gain: 0.06, to: 385 });
  },
  // a house is called to wake: small bell
  bell: (c, t) => { tone(c, t, N.A5, 1.2, { gain: 0.18 }); tone(c, t, N.A5 * 2.76, 0.8, { gain: 0.05 }); tone(c, t + 0.3, N.E5, 1.0, { gain: 0.1 }); },
  sleep: (c, t) => { tone(c, t, N.E4, 0.8, { gain: 0.1, to: N.C4, attack: 0.1 }); },
  // arrow / attack: whoosh then thud
  attack: (c, t) => { noise(c, t, 0.22, { freq: 2500, sweepTo: 600, q: 1.5, gain: 0.16 }); tone(c, t + 0.2, 130, 0.2, { type: 'sine', gain: 0.4, to: 60 }); },
  shield: (c, t) => { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(c, t + i * 0.03, f, 0.9, { gain: 0.07 })); noise(c, t, 0.5, { freq: 5000, q: 0.5, gain: 0.03 }); },
  magic: (c, t) => { for (let i = 0; i < 6; i++) tone(c, t + i * 0.06, 900 + i * 180, 0.35, { gain: 0.07 }); },
  victory: (c, t) => {
    arpeggio(c, t, [N.C5, N.E5, N.G5], 0.13, { type: 'triangle', gain: 0.18, dur: 0.3 });
    [N.C5, N.E5, N.G5, N.C6].forEach(f => tone(c, t + 0.45, f, 1.4, { type: 'triangle', gain: 0.1 }));
    SOUNDS.reveal(c, t + 0.5);
  },
  defeat: (c, t) => { SOUNDS.howl(c, t); tone(c, t + 1.6, N.A3, 1.4, { type: 'sine', gain: 0.14, to: N.F3 }); },
  gong: (c, t) => { tone(c, t, 98, 2, { type: 'sine', gain: 0.3 }); tone(c, t, 196 * 1.4, 1.4, { type: 'sine', gain: 0.08 }); }
};

// Small throttle so a burst of state updates can't stack the same sound.
const lastPlayed: Partial<Record<Sfx, number>> = {};

export const play = (name: Sfx) => {
  if (muted) return;
  const c = ensure();
  if (!c || !master || c.state !== 'running') return;
  const now = c.currentTime;
  if ((lastPlayed[name] ?? -1) > now - 0.06) return;
  lastPlayed[name] = now;
  try { SOUNDS[name](c, now + 0.01); } catch { /* never let a sound break the game */ }
};

// Haptic buzz on phones (where supported) for moments that need attention.
export const buzz = (pattern: number | number[]) => {
  if (muted) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
};
