export type SegmentKind =
  | "play" // Graj dalej
  | "plus1" // +1 pkt do puli, graj dalej
  | "plus2" // +2 pkt do puli, graj dalej
  | "poolChoice" // +2 albo -2 do puli (wybierasz), graj dalej
  | "bonus" // +1 pkt dla Ciebie, graj dalej
  | "give" // Oddaj 1 pkt wybranej osobie, graj dalej
  | "risky" // Graj dalej, ale pudło w literze kosztuje 1 pkt
  | "vowel" // Graj dalej, możesz wybrać samogłoskę
  | "reverse" // Graj dalej, odwracamy kolejkę
  | "lose" // Tracisz kolejkę
  | "loseTwo" // Ty i kolejna osoba tracicie kolejkę
  | "guessOrOut" // Zgadnij lub odpadnij
  | "pickGuessOrOut" // Graj dalej albo wybierz osobę do „Zgadnij lub odpadnij"
  | "revive"; // Wskrześ gracza i zgarnij 1 pkt albo graj dalej

export interface Segment {
  kind: SegmentKind;
  /** Krótki napis na kole (czytany od środka na zewnątrz), najwyżej 2 linie. Pełny opis jest w `label`. */
  lines: string[];
  /** Pełny opis do dziennika i komunikatów. */
  label: string;
  color: string;
  textColor: string;
}

// Kolejność zgodnie z ruchem wskazówek zegara od góry; sąsiednie pola mają różne kolory.
export const WHEEL: Segment[] = [
  { kind: "plus1", lines: ["+1 PKT", "DO PULI"], label: "+1 pkt do puli", color: "#e8545e", textColor: "#fff" },
  { kind: "lose", lines: ["TRACISZ", "KOLEJKĘ"], label: "Tracisz kolejkę", color: "#35bfae", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#2f3b57", textColor: "#fff" },
  { kind: "give", lines: ["ODDAJ 1 PKT", "KOMUŚ"], label: "Oddaj 1 pkt wybranej osobie i graj dalej", color: "#f59a45", textColor: "#fff" },
  { kind: "vowel", lines: ["SAMOGŁOSKA"], label: "Graj dalej, możesz wybrać samogłoskę", color: "#5b5fc7", textColor: "#fff" },
  { kind: "bonus", lines: ["+1 PKT", "DLA CIEBIE"], label: "Dostajesz 1 pkt i grasz dalej", color: "#3ea8d8", textColor: "#fff" },
  { kind: "loseTwo", lines: ["TRACISZ TY", "I NASTĘPNY"], label: "Ty i kolejna osoba tracicie kolejkę", color: "#f27856", textColor: "#fff" },
  { kind: "plus2", lines: ["+2 PKT", "DO PULI"], label: "+2 pkt do puli", color: "#f6d145", textColor: "#3b2a00" },
  { kind: "guessOrOut", lines: ["ZGADNIJ LUB", "ODPADNIJ"], label: "Zgadnij lub odpadnij", color: "#2f7fd6", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#6b6f7e", textColor: "#fff" },
  { kind: "risky", lines: ["RYZYKOWNA", "LITERA"], label: "Graj dalej, ale pudło w literze kosztuje 1 pkt", color: "#c2417a", textColor: "#fff" },
  { kind: "pickGuessOrOut", lines: ["WSKAŻ", "OFIARĘ"], label: "Graj dalej albo wybierz osobę do „Zgadnij lub odpadnij”", color: "#e3685a", textColor: "#fff" },
  { kind: "poolChoice", lines: ["±2 PKT", "DO PULI"], label: "+2 albo -2 pkt do puli (wybierasz) i graj dalej", color: "#ece6f7", textColor: "#2a1650" },
  { kind: "reverse", lines: ["ZMIANA", "KIERUNKU"], label: "Graj dalej, ale odwracamy kolejkę", color: "#68bf66", textColor: "#fff" },
  { kind: "play", lines: ["GRAJ DALEJ"], label: "Graj dalej", color: "#e46aa6", textColor: "#fff" },
  { kind: "revive", lines: ["WSKRZEŚ", "+1 PKT"], label: "Wskrześ gracza i zgarnij 1 pkt albo graj dalej", color: "#9b5de5", textColor: "#fff" },
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
