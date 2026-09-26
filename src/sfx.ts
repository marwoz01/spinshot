// Proste efekty dźwiękowe syntezowane w WebAudio — bez plików audio.
let ctx: AudioContext | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem("kiz:muted") === "1";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem("kiz:muted", value ? "1" : "0");
  } catch {
    // brak dostępu do localStorage — ustawienie tylko na tę sesję
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", gain = 0.18, slideTo?: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  vol.gain.setValueAtTime(0.0001, t0);
  vol.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  /** Terkot koła: coraz rzadsze kliknięcia przez `ms` milisekund. */
  spin(ms: number) {
    const total = ms / 1000;
    let t = 0;
    let gap = 0.04;
    while (t < total - 0.2) {
      tone(1400, t, 0.03, "square", 0.05);
      t += gap;
      gap *= 1.075;
    }
  },
  click() {
    tone(600, 0, 0.06, "triangle", 0.12);
  },
  hit() {
    tone(660, 0, 0.12, "triangle");
    tone(990, 0.1, 0.18, "triangle");
  },
  miss() {
    tone(220, 0, 0.25, "sawtooth", 0.08, 140);
  },
  pool() {
    [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.12, "square", 0.07));
  },
  eliminated() {
    tone(500, 0, 0.5, "triangle", 0.16, 120);
  },
  revive() {
    [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.06, 0.14, "sine", 0.14));
  },
  win() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.16));
  },
  turn() {
    tone(880, 0, 0.1, "sine", 0.12);
    tone(1320, 0.08, 0.14, "sine", 0.1);
  },
};
