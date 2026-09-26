import { describe, expect, it } from "vitest";
import { PASSWORDS } from "../server/passwords.ts";

/** Najdłuższe słowo, które na telefonie mieści się w jednym rzędzie planszy. */
const MAX_WORD = 13;

describe("baza haseł", () => {
  it("ma co najmniej 3 słowa w każdym haśle", () => {
    const short = PASSWORDS.filter((p) => p.answer.split(" ").length < 3).map((p) => p.answer);
    expect(short).toEqual([]);
  });

  it("używa tylko liter z klawiatury (bez Q, V, X i cyfr)", () => {
    const bad = PASSWORDS.filter((p) => !/^[A-PR-UWYZĄĆĘŁŃÓŚŹŻ ,.!?-]+$/u.test(p.answer)).map((p) => p.answer);
    expect(bad).toEqual([]);
  });

  it(`nie ma słów dłuższych niż ${MAX_WORD} znaków`, () => {
    const long = PASSWORDS.flatMap((p) => p.answer.split(" ")).filter((w) => w.length > MAX_WORD);
    expect(long).toEqual([]);
  });

  it("nie powtarza haseł", () => {
    const answers = PASSWORDS.map((p) => p.answer);
    const dupes = answers.filter((a, i) => answers.indexOf(a) !== i);
    expect(dupes).toEqual([]);
  });
});
