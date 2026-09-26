export type SegmentKind =
  | "play" // Graj dalej
  | "plus1" // +1 pkt do puli, graj dalej
  | "plus2" // +2 pkt do puli, graj dalej
  | "vowel" // Graj dalej, możesz wybrać samogłoskę
  | "reverse" // Graj dalej, odwracamy kolejkę
  | "lose" // Tracisz kolejkę
  | "loseTwo" // Ty i kolejna osoba tracicie kolejkę
  | "guessOrOut" // Zgadnij lub odpadnij
  | "pickGuessOrOut" // Graj dalej albo wybierz osobę do „Zgadnij lub odpadnij"
  | "revive"; // Wskrześ gracza i graj dalej

export interface Segment {
  kind: SegmentKind;
  /** Krótki napis na kole (czytany od środka na zewnątrz), najwyżej 2 linie. Pełny opis jest w `label`. */
  lines: string[];
  /** Pełny opis do dziennika i komunikatów. */
  label: string;
  color: string;
  textColor: string;
}

// Kolejność i kolory jak na kole referencyjnym (zgodnie z ruchem wskazówek zegara od góry) + pole wskrzeszenia.
export const WHEEL: Segment[] = [
  { kind: "plus1", lines: ["+1 PKT", "DO PULI"], label: "+1 pkt do puli", color: "#e8545e", textColor: "#fff" },
  { kind: "lose", lines: ["TRACISZ", "KOLEJKĘ"], label: "Tracisz kolejkę", color: "#35bfae", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#2f3b57", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#f59a45", textColor: "#fff" },
  { kind: "vowel", lines: ["SAMOGŁOSKA"], label: "Graj dalej, możesz wybrać samogłoskę", color: "#5b5fc7", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#3ea8d8", textColor: "#fff" },
  { kind: "loseTwo", lines: ["TRACISZ TY", "I NASTĘPNY"], label: "Ty i kolejna osoba tracicie kolejkę", color: "#f27856", textColor: "#fff" },
  { kind: "plus2", lines: ["+2 PKT", "DO PULI"], label: "+2 pkt do puli", color: "#f6d145", textColor: "#3b2a00" },
  { kind: "guessOrOut", lines: ["ZGADNIJ LUB", "ODPADNIJ"], label: "Zgadnij lub odpadnij", color: "#2f7fd6", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#6b6f7e", textColor: "#fff" },
  { kind: "pickGuessOrOut", lines: ["WSKAŻ", "OFIARĘ"], label: "Graj dalej albo wybierz osobę do „Zgadnij lub odpadnij”", color: "#e3685a", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#df4669", textColor: "#fff" },
  { kind: "reverse", lines: ["ZMIANA", "KIERUNKU"], label: "Graj dalej, ale odwracamy kolejkę", color: "#68bf66", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#e46aa6", textColor: "#fff" },
  { kind: "revive", lines: ["WSKRZEŚ", "GRACZA"], label: "Wskrześ gracza i graj dalej", color: "#9b5de5", textColor: "#fff" },
];

export const SEGMENT_ANGLE = 360 / WHEEL.length;

/** Czas animacji kręcenia (ms) — serwer czeka tyle przed rozstrzygnięciem pola. */
export const SPIN_MS = 4800;

/**
 * Oblicza nowy obrót koła (w stopniach, rosnąco) tak, by pod wskaźnikiem u góry
 * znalazł się `segmentIndex`. `jitter` w zakresie [0, 1) przesuwa punkt w obrębie pola.
 */
export function rotationFor(prevRotation: number, segmentIndex: number, jitter: number, extraTurns = 5): number {
  const target = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE * (0.15 + jitter * 0.7);
  const current = ((prevRotation % 360) + 360) % 360;
  const desired = ((360 - target) % 360 + 360) % 360;
  const delta = ((desired - current) % 360 + 360) % 360;
  return prevRotation + extraTurns * 360 + delta;
}

/** Który segment jest pod wskaźnikiem przy danym obrocie. */
export function segmentAt(rotation: number): number {
  const angle = ((360 - (rotation % 360)) % 360 + 360) % 360;
  return Math.floor(angle / SEGMENT_ANGLE) % WHEEL.length;
}
