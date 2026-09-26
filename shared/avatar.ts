import type { UserStats } from "./types.ts";

export interface Avatar {
  /** Kolor postaci (skóry). */
  color: number;
  shape: number;
  eyes: number;
  mouth: number;
  hat: number;
  hair: number;
  hairColor: number;
  /** Dodatek na twarzy. */
  extra: number;
  outfit: number;
  outfitColor: number;
  /** Dodatek na szyi i tułowiu. */
  accessory: number;
}

export const AVATAR_COLORS = [
  "#ff6b6b", "#ffa94d", "#ffd43b", "#8ce99a", "#38d9a9",
  "#4dabf7", "#748ffc", "#b197fc", "#f783ac", "#e9ecef",
] as const;

export const HAIR_COLORS = ["#6b3f1d", "#2a1650", "#f2c14e", "#d9622b", "#ff7ab8", "#41b6ff", "#35d0a0", "#9b5de5"] as const;

export const OUTFIT_COLORS = [
  "#ff5d73", "#ffa94d", "#ffd23f", "#35d0a0", "#41b6ff",
  "#6b2fe0", "#f783ac", "#33264d", "#f4f1fa", "#8a8f9e",
] as const;

// Nowe elementy dopisujemy zawsze na końcu list: numery są zapisane w profilach graczy.
export const AVATAR_OPTIONS = {
  shape: ["Kulka", "Fasolka", "Klocek", "Owal"],
  eyes: ["Kropki", "Wielkie", "Zaspane", "Gwiazdki", "Okulary", "Zezik", "Kosmiczne", "Serduszka"],
  mouth: ["Uśmiech", "Banan", "Ojej", "Język", "Wąsy", "Krzywy", "Szeroki uśmiech", "Kotek"],
  hat: [
    "Brak", "Czapka", "Korona", "Czarodziej", "Kokarda", "Słuchawki", "Cylinder", "Imprezowa",
    "Beret", "Kowbojski", "Hełm wikinga", "Aureola", "Rogi", "Zimowa",
  ],
  hair: ["Brak", "Grzywka", "Irokez", "Kucyki", "Afro", "Czupryna", "Kok"],
  extra: ["Brak", "Rumieńce", "Piegi", "Plaster", "Gwiazdka", "Błyskawica"],
  outfit: ["Koszulka", "Bluza", "Sweter w paski", "Ogrodniczki", "Garnitur", "Strój sportowy", "Kombinezon", "Peleryna"],
  accessory: ["Brak", "Muszka", "Szalik", "Naszyjnik", "Złoty medal", "Krawat"],
} as const;

export type AvatarPart = keyof typeof AVATAR_OPTIONS;

const LIMITS: Record<keyof Avatar, number> = {
  color: AVATAR_COLORS.length,
  shape: AVATAR_OPTIONS.shape.length,
  eyes: AVATAR_OPTIONS.eyes.length,
  mouth: AVATAR_OPTIONS.mouth.length,
  hat: AVATAR_OPTIONS.hat.length,
  hair: AVATAR_OPTIONS.hair.length,
  hairColor: HAIR_COLORS.length,
  extra: AVATAR_OPTIONS.extra.length,
  outfit: AVATAR_OPTIONS.outfit.length,
  outfitColor: OUTFIT_COLORS.length,
  accessory: AVATAR_OPTIONS.accessory.length,
};

export const AVATAR_KEYS = Object.keys(LIMITS) as (keyof Avatar)[];

/** Wartości dla cech, których nie ma w starszych zapisanych profilach. */
const DEFAULTS: Avatar = { color: 0, shape: 3, eyes: 0, mouth: 0, hat: 0, hair: 0, hairColor: 0, extra: 0, outfit: 0, outfitColor: 4, accessory: 0 };

export function avatarLimit(key: keyof Avatar): number {
  return LIMITS[key];
}

// ───────────────────────── nagrody ─────────────────────────

export interface UnlockRule {
  stat: keyof UserStats;
  min: number;
  /** Co trzeba zrobić, np. „Wygraj 10 gier". */
  text: string;
}

/** Elementy dostępne tylko dla zalogowanych, za wyniki zapisane na koncie. */
export const UNLOCKS: { [K in AvatarPart]?: Record<number, UnlockRule> } = {
  hat: {
    10: { stat: "points", min: 50, text: "Zdobądź łącznie 50 pkt" },
    11: { stat: "roundsWon", min: 25, text: "Odgadnij 25 haseł" },
    12: { stat: "wins", min: 10, text: "Wygraj 10 gier" },
  },
  eyes: { 7: { stat: "gamesPlayed", min: 5, text: "Rozegraj 5 gier" } },
  outfit: {
    4: { stat: "gamesPlayed", min: 20, text: "Rozegraj 20 gier" },
    7: { stat: "wins", min: 5, text: "Wygraj 5 gier" },
  },
  accessory: { 4: { stat: "wins", min: 1, text: "Wygraj pierwszą grę" } },
};

export function unlockRule(key: keyof Avatar, index: number): UnlockRule | null {
  return (UNLOCKS as Partial<Record<keyof Avatar, Record<number, UnlockRule>>>)[key]?.[index] ?? null;
}

/** `stats` = null oznacza gościa: nagrody są wtedy zablokowane. */
export function isUnlocked(key: keyof Avatar, index: number, stats: UserStats | null): boolean {
  const rule = unlockRule(key, index);
  return !rule || (stats !== null && stats[rule.stat] >= rule.min);
}

/** Zamienia elementy, których gracz jeszcze nie odblokował, na domyślne. */
export function lockAvatar(avatar: Avatar, stats: UserStats | null): Avatar {
  const out = { ...avatar };
  for (const key of AVATAR_KEYS) {
    if (!isUnlocked(key, out[key], stats)) out[key] = DEFAULTS[key];
  }
  return out;
}

export function randomAvatar(stats: UserStats | null = null): Avatar {
  const pick = (key: keyof Avatar) => {
    const allowed = Array.from({ length: LIMITS[key] }, (_, i) => i).filter((i) => isUnlocked(key, i, stats));
    return allowed[Math.floor(Math.random() * allowed.length)];
  };
  const out = Object.fromEntries(AVATAR_KEYS.map((key) => [key, pick(key)])) as unknown as Avatar;
  // Dodatki co drugi raz, żeby losowe postacie nie były przeładowane.
  if (Math.random() < 0.5) out.extra = 0;
  if (Math.random() < 0.5) out.accessory = 0;
  return out;
}

/** Przyjmuje dowolne dane (od klienta / z Clerka) i zwraca poprawny awatar. */
export function sanitizeAvatar(input: unknown): Avatar {
  if (!input || typeof input !== "object") return randomAvatar();
  const raw = input as Record<string, unknown>;
  const out = { ...DEFAULTS };
  for (const key of AVATAR_KEYS) {
    const value = raw[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < LIMITS[key]) {
      out[key] = value;
    }
  }
  return out;
}
