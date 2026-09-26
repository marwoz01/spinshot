// Polski alfabet używany na klawiaturze i przy odkrywaniu hasła.
export const ALPHABET = [
  "A", "Ą", "B", "C", "Ć", "D", "E", "Ę", "F", "G", "H", "I", "J", "K", "L", "Ł",
  "M", "N", "Ń", "O", "Ó", "P", "Q", "R", "S", "Ś", "T", "U", "V", "W", "X", "Y",
  "Z", "Ź", "Ż",
] as const;

export const VOWELS = new Set(["A", "Ą", "E", "Ę", "I", "O", "Ó", "U", "Y"]);

const LETTER_SET = new Set<string>(ALPHABET);

export function isLetter(ch: string): boolean {
  return LETTER_SET.has(ch.toLocaleUpperCase("pl"));
}

export function isVowel(ch: string): boolean {
  return VOWELS.has(ch.toLocaleUpperCase("pl"));
}

const DIACRITICS: Record<string, string> = {
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
};

/** Porównanie odpowiedzi: bez wielkości liter, polskich znaków, interpunkcji i nadmiarowych spacji. */
export function normalizeAnswer(text: string): string {
  return text
    .toLocaleUpperCase("pl")
    .split("")
    .map((ch) => DIACRITICS[ch] ?? ch)
    .join("")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
