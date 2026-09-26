import { ALPHABET, VOWELS } from "../../shared/letters.ts";
import type { UsedLetter } from "../../shared/types.ts";

// Q, V i X nie występują w polskich hasłach, ale serwer je przyjmie — na klawiaturze je pomijamy.
const KEYS = ALPHABET.filter((l) => !["Q", "V", "X"].includes(l));

interface KeyboardProps {
  used: UsedLetter[];
  enabled: boolean;
  allowVowel: boolean;
  onPick: (letter: string) => void;
}

export function Keyboard({ used, enabled, allowVowel, onPick }: KeyboardProps) {
  const usedMap = new Map(used.map((u) => [u.letter, u.hits]));
  return (
    <div className="flex flex-wrap justify-center gap-1.5" aria-label="Litery">
      {KEYS.map((letter) => {
        const hits = usedMap.get(letter);
        const vowel = VOWELS.has(letter);
        const locked = hits !== undefined || (vowel && !allowVowel);
        const cls = hits === undefined ? (vowel ? "key-vowel" : "") : hits > 0 ? "key-hit" : "key-miss";
        return (
          <button
            key={letter}
            type="button"
            className={`key ${cls}`}
            disabled={!enabled || locked}
            onClick={() => onPick(letter)}
            title={vowel && !allowVowel ? "Samogłoski tylko z pola koła" : undefined}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
