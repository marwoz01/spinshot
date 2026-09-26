export interface Avatar {
  color: number;
  shape: number;
  eyes: number;
  mouth: number;
  hat: number;
}

export const AVATAR_COLORS = [
  "#ff6b6b", "#ffa94d", "#ffd43b", "#8ce99a", "#38d9a9",
  "#4dabf7", "#748ffc", "#b197fc", "#f783ac", "#e9ecef",
] as const;

export const AVATAR_OPTIONS = {
  shape: ["Kulka", "Fasolka", "Klocek"],
  eyes: ["Kropki", "Wielkie", "Zaspane", "Gwiazdki", "Okulary", "Zezik"],
  mouth: ["Uśmiech", "Banan", "Ojej", "Język", "Wąsy", "Krzywy"],
  hat: ["Brak", "Czapka", "Korona", "Czarodziej", "Kokarda", "Słuchawki", "Cylinder", "Imprezowa"],
} as const;

const LIMITS: Record<keyof Avatar, number> = {
  color: AVATAR_COLORS.length,
  shape: AVATAR_OPTIONS.shape.length,
  eyes: AVATAR_OPTIONS.eyes.length,
  mouth: AVATAR_OPTIONS.mouth.length,
  hat: AVATAR_OPTIONS.hat.length,
};

export const AVATAR_KEYS = Object.keys(LIMITS) as (keyof Avatar)[];

export function avatarLimit(key: keyof Avatar): number {
  return LIMITS[key];
}

export function randomAvatar(): Avatar {
  const pick = (n: number) => Math.floor(Math.random() * n);
  return {
    color: pick(LIMITS.color),
    shape: pick(LIMITS.shape),
    eyes: pick(LIMITS.eyes),
    mouth: pick(LIMITS.mouth),
    hat: pick(LIMITS.hat),
  };
}

/** Przyjmuje dowolne dane (od klienta / z Clerka) i zwraca poprawny awatar. */
export function sanitizeAvatar(input: unknown): Avatar {
  const fallback = randomAvatar();
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Record<string, unknown>;
  const out = { ...fallback };
  for (const key of AVATAR_KEYS) {
    const value = raw[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < LIMITS[key]) {
      out[key] = value;
    }
  }
  return out;
}
