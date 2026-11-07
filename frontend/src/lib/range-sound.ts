// Arcade sound effects for the Shooting Academy game, synthesised with Web Audio (no audio files).
// Sound starts only after a visitor action (a click on Start) and can be muted; the choice is kept in this browser.

export type Sound = 'shot' | 'hit' | 'bullseye' | 'blast' | 'reload' | 'empty' | 'whoosh' | 'start' | 'end';
const KEY = 'eu.range-muted';
let audio: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function isMuted() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
export function setMuted(muted: boolean) { try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* storage unavailable */ } }

/** Call from a click handler: browsers only allow audio after a user gesture. */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  audio ||= new Ctor();
  if (audio.state === 'suspended') void audio.resume();
  if (!noise) {
    noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
}

function burst(at: number, length: number, from: number, to: number, volume: number, type: BiquadFilterType = 'lowpass') {
  if (!audio || !noise) return;
  const src = audio.createBufferSource(); src.buffer = noise;
  const filter = audio.createBiquadFilter(); filter.type = type; filter.frequency.setValueAtTime(from, at); filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), at + length);
  const gain = audio.createGain(); gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  src.connect(filter).connect(gain).connect(audio.destination); src.start(at, Math.random() * 0.5, length + 0.05);
}
function tone(at: number, length: number, from: number, to: number, volume: number, type: OscillatorType = 'square') {
  if (!audio) return;
  const osc = audio.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(from, at); osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), at + length);
  const gain = audio.createGain(); gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  osc.connect(gain).connect(audio.destination); osc.start(at); osc.stop(at + length + 0.02);
}

export function play(sound: Sound) {
  if (!audio || isMuted()) return;
  const t = audio.currentTime;
  switch (sound) {
    case 'shot': burst(t, 0.12, 4000, 600, 0.35); tone(t, 0.08, 180, 60, 0.15, 'triangle'); break;
    case 'hit': tone(t, 0.09, 900, 1400, 0.08); burst(t, 0.06, 6000, 2000, 0.12, 'highpass'); break;
    case 'bullseye': tone(t, 0.1, 880, 880, 0.08); tone(t + 0.08, 0.16, 1320, 1320, 0.08); break;
    case 'blast': burst(t, 0.9, 1800, 60, 0.6); tone(t, 0.5, 120, 35, 0.35, 'sine'); break;
    case 'reload': burst(t, 0.05, 3000, 1500, 0.2, 'bandpass'); burst(t + 0.18, 0.06, 2500, 1200, 0.25, 'bandpass'); break;
    case 'empty': tone(t, 0.04, 1200, 1100, 0.06, 'square'); break;
    case 'whoosh': burst(t, 0.45, 400, 3000, 0.18, 'bandpass'); break;
    case 'start': tone(t, 0.12, 440, 440, 0.07); tone(t + 0.15, 0.12, 440, 440, 0.07); tone(t + 0.3, 0.25, 880, 880, 0.08); break;
    case 'end': tone(t, 0.18, 660, 440, 0.08); tone(t + 0.2, 0.35, 440, 220, 0.08); break;
  }
}
