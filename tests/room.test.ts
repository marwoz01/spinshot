import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeAnswer } from "../shared/letters.ts";
import type { Fx } from "../shared/types.ts";
import { rotationFor, segmentAt, SPIN_MS, WHEEL, type SegmentKind } from "../shared/wheel.ts";
import { AWAY_TURN_MS, ROUND_END_MS, Room, SPEED_INTRO_MS, SPEED_LOCK_MS, SPEED_POOL, SPEED_REVEAL_MS, SPEED_TAIL_MS, type GameResult } from "../server/room.ts";

const avatar = { color: 0, shape: 0, eyes: 0, mouth: 0, hat: 0 };

function setup(names = ["Ala", "Bartek", "Celina"], turnSeconds = 30) {
  const fx: Fx[] = [];
  const results: GameResult[][] = [];
  const room = new Room("TEST1", {
    onChange: () => {},
    onFx: (_r, f) => fx.push(f),
    onGameOver: (_r, res) => results.push(res),
    onEmpty: () => {},
  });
  const ids = names.map((name, i) => room.join(`session-${i}-xyz`, `socket-${i}`, i === 0 ? "user_1" : null, { name, avatar }).id);
  room.settings.turnSeconds = turnSeconds;
  return { room, ids, fx, results };
}

function startWith(room: Room, hostId: string, answer: string) {
  room.start(hostId);
  room.round!.answer = answer;
}

/** Kręci kołem tak, by wypadło pierwsze pole danego rodzaju. */
function spinTo(room: Room, playerId: string, kind: SegmentKind) {
  const index = WHEEL.findIndex((s) => s.kind === kind);
  const values = [(index + 0.5) / WHEEL.length, 0.5];
  room.rng = () => values.shift() ?? 0.5;
  room.spin(playerId);
  vi.advanceTimersByTime(SPIN_MS);
}

const turn = (room: Room) => room.round!.turn!;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("poczekalnia", () => {
  it("wymaga hosta i co najmniej dwóch graczy", () => {
    const solo = setup(["Ala"]);
    expect(() => solo.room.start(solo.ids[0])).toThrow(/co najmniej/);
    const { room, ids } = setup();
    expect(() => room.start(ids[1])).toThrow(/host/);
    room.start(ids[0]);
    expect(room.phase).toBe("playing");
    expect(turn(room)).toMatchObject({ playerId: ids[0], phase: "spin" });
  });

  it("nadaje unikalne nicki i przywraca gracza po sessionId", () => {
    const { room, ids } = setup(["Ala", "Ala"]);
    expect(room.getPlayer(ids[1])!.name).toBe("Ala 2");
    const again = room.join("session-0-xyz", "socket-new", "user_1", { name: "Ala", avatar });
    expect(again.id).toBe(ids[0]);
    expect(room.players).toHaveLength(2);
  });
});

describe("tura", () => {
  it("Graj dalej: tylko spółgłoska, trafienie odkrywa literę i daje kolejny obrót", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "ALA MA KOTA");
    spinTo(room, ids[0], "play");
    expect(turn(room).phase).toBe("action");
    expect(() => room.letter(ids[0], "a")).toThrow(/Samogłosk/);
    room.letter(ids[0], "m");
    const state = room.toState();
    expect(state.round!.board[1]).toEqual(["M", null]);
    expect(state.round!.answer).toBeNull();
    expect(turn(room)).toMatchObject({ playerId: ids[0], phase: "spin" });
    expect(() => room.spin(ids[1])).toThrow(/Twój ruch/);
  });

  it("pudło w literze oddaje kolejkę", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "ALA MA KOTA");
    spinTo(room, ids[0], "play");
    room.letter(ids[0], "Z");
    expect(turn(room)).toMatchObject({ playerId: ids[1], phase: "spin" });
  });

  it("pole samogłoski pozwala wpisać samogłoskę", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "ALA MA KOTA");
    spinTo(room, ids[0], "vowel");
    room.letter(ids[0], "A");
    expect(room.round!.usedLetters).toEqual([{ letter: "A", hits: 4 }]);
  });

  it("nie pozwala powtórzyć litery", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "ALA MA KOTA");
    spinTo(room, ids[0], "play");
    room.letter(ids[0], "K");
    spinTo(room, ids[0], "play");
    expect(() => room.letter(ids[0], "k")).toThrow(/już padła/);
  });

  it("+2 powiększa pulę, a poprawne hasło ją zgarnia", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "ŻÓŁW");
    spinTo(room, ids[0], "plus2");
    expect(room.round!.pool).toBe(3);
    room.guess(ids[0], "zolw");
    expect(room.phase).toBe("roundEnd");
    expect(room.getPlayer(ids[0])!.score).toBe(3);
    expect(room.toState().round!.answer).toBe("ŻÓŁW");
  });

  it("złe hasło kosztuje tylko kolejkę", () => {
    const { room, ids, fx } = setup();
    startWith(room, ids[0], "ALA MA KOTA");
    spinTo(room, ids[0], "play");
    room.guess(ids[0], "Ola ma psa");
    expect(room.getPlayer(ids[0])!.status).toBe("active");
    expect(fx.some((f) => f.type === "wrongGuess")).toBe(true);
    expect(turn(room).playerId).toBe(ids[1]);
  });

  it("złe hasło przy „Zgadnij lub odpadnij” eliminuje z rundy", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "guessOrOut");
    room.guess(ids[0], "PIES");
    expect(room.getPlayer(ids[0])!.status).toBe("eliminated");
    expect(turn(room).playerId).toBe(ids[1]);
  });

  it("gdy wszyscy odpadną, runda kończy się bez zwycięzcy", () => {
    const { room, ids } = setup(["Ala", "Bartek"]);
    startWith(room, ids[0], "ALA MA KOTA");
    spinTo(room, ids[0], "plus2");
    room.letter(ids[0], "Z");
    spinTo(room, ids[1], "guessOrOut");
    room.guess(ids[1], "nie");
    spinTo(room, ids[0], "guessOrOut");
    room.guess(ids[0], "też nie");
    expect(room.players.every((p) => p.status === "eliminated")).toBe(true);
    expect(room.phase).toBe("roundEnd");
    expect(room.round!.winnerId).toBeNull();
    expect(room.players.every((p) => p.score === 0)).toBe(true);
    expect(room.toState().round!.answer).toBe("ALA MA KOTA");
    vi.advanceTimersByTime(ROUND_END_MS);
    expect(room.round!.number).toBe(2);
    expect(room.players.every((p) => p.status === "active")).toBe(true);
  });

  it("odkrycie ostatniej litery wygrywa rundę", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    room.round!.revealed.add("O").add("T");
    spinTo(room, ids[0], "play");
    room.letter(ids[0], "K");
    expect(room.round!.winnerId).toBe(ids[0]);
  });
});

describe("pola koła", () => {
  it("Tracisz kolejkę przekazuje ruch", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "lose");
    expect(turn(room).playerId).toBe(ids[1]);
  });

  it("Ty i kolejna osoba tracicie kolejkę", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "loseTwo");
    expect(turn(room).playerId).toBe(ids[2]);
  });

  it("odwrócenie kolejki zmienia kierunek", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "reverse");
    room.letter(ids[0], "Z");
    expect(turn(room).playerId).toBe(ids[2]);
  });

  it("Zgadnij lub odpadnij: koniec czasu eliminuje", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "guessOrOut");
    expect(turn(room)).toMatchObject({ phase: "forcedGuess", targetId: ids[0] });
    expect(() => room.letter(ids[0], "K")).toThrow();
    vi.advanceTimersByTime(30_000);
    expect(room.getPlayer(ids[0])!.status).toBe("eliminated");
    expect(turn(room).playerId).toBe(ids[1]);
  });

  it("wybór osoby do „Zgadnij lub odpadnij”", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "pickGuessOrOut");
    expect(turn(room).phase).toBe("choice");
    room.choice(ids[0], { mode: "target", targetId: ids[2] });
    expect(() => room.guess(ids[0], "KOT")).toThrow();
    room.guess(ids[2], "PIES");
    expect(room.getPlayer(ids[2])!.status).toBe("eliminated");
    expect(turn(room).playerId).toBe(ids[1]);
  });

  it("wskrzeszenie przywraca ducha, daje 1 pkt i kończy ruch", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "guessOrOut");
    room.guess(ids[0], "PIES");
    spinTo(room, ids[1], "revive");
    expect(turn(room).phase).toBe("revive");
    room.revive(ids[1], ids[0]);
    expect(room.getPlayer(ids[0])!.status).toBe("active");
    expect(room.getPlayer(ids[1])!.score).toBe(1);
    expect(turn(room)).toMatchObject({ playerId: ids[2], phase: "spin" });
  });

  it("przy wskrzeszeniu można zamiast tego grać dalej", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "guessOrOut");
    room.guess(ids[0], "PIES");
    spinTo(room, ids[1], "revive");
    room.revive(ids[1], null);
    expect(room.getPlayer(ids[0])!.status).toBe("eliminated");
    expect(room.getPlayer(ids[1])!.score).toBe(0);
    expect(turn(room)).toMatchObject({ playerId: ids[1], phase: "action" });
  });

  it("wskrzeszenie bez odpadniętych działa jak Graj dalej", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "revive");
    expect(turn(room).phase).toBe("action");
  });

  it("+1 pkt dla Ciebie trafia prosto na konto", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "bonus");
    expect(room.getPlayer(ids[0])!.score).toBe(1);
    expect(turn(room).phase).toBe("action");
  });

  it("oddaj 1 pkt: przekazuje punkt wybranej osobie", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    room.getPlayer(ids[0])!.score = 2;
    spinTo(room, ids[0], "give");
    expect(turn(room).phase).toBe("give");
    expect(() => room.give(ids[0], ids[0])).toThrow();
    room.give(ids[0], ids[2]);
    expect(room.getPlayer(ids[0])!.score).toBe(1);
    expect(room.getPlayer(ids[2])!.score).toBe(1);
    expect(turn(room).phase).toBe("action");
  });

  it("oddaj 1 pkt bez punktów działa jak Graj dalej", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    spinTo(room, ids[0], "give");
    expect(turn(room).phase).toBe("action");
  });

  it("ryzykowna litera: pudło zabiera 1 pkt, ale nie schodzi poniżej zera", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    room.getPlayer(ids[0])!.score = 1;
    spinTo(room, ids[0], "risky");
    expect(turn(room).risky).toBe(true);
    room.letter(ids[0], "Z");
    expect(room.getPlayer(ids[0])!.score).toBe(0);
    spinTo(room, ids[1], "risky");
    room.letter(ids[1], "P");
    expect(room.getPlayer(ids[1])!.score).toBe(0);
  });

  it("±2 do puli: gracz wybiera, a pula nie spada poniżej 1", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "ALA MA KOTA");
    spinTo(room, ids[0], "poolChoice");
    expect(turn(room).phase).toBe("poolChoice");
    expect(() => room.poolChoice(ids[0], 5)).toThrow();
    room.poolChoice(ids[0], 2);
    expect(room.round!.pool).toBe(3);
    room.letter(ids[0], "M");
    spinTo(room, ids[0], "poolChoice");
    room.poolChoice(ids[0], -2);
    room.letter(ids[0], "K");
    spinTo(room, ids[0], "poolChoice");
    room.poolChoice(ids[0], -2);
    expect(room.round!.pool).toBe(1);
  });
});

describe("runda błyskawiczna", () => {
  /** Rozgrywa zwykłe rundy (zgadując hasło) aż do rundy o podanym numerze. */
  function playUntil(room: Room, number: number) {
    while (room.round!.number < number) {
      const current = turn(room).playerId;
      spinTo(room, current, "play");
      room.guess(current, room.round!.answer);
      vi.advanceTimersByTime(ROUND_END_MS);
    }
  }

  function speedSetup() {
    const ctx = setup();
    ctx.room.settings.rounds = 5;
    ctx.room.start(ctx.ids[0]);
    // W grze na 5 rund błyskawiczna jest trzecia, w połowie gry.
    playUntil(ctx.room, 3);
    ctx.room.round!.answer = "ALA MA KOTA";
    return ctx;
  }
  const shown = (room: Room) => room.toState().round!.board.flat().filter((ch) => ch !== null).length;

  it("runda w połowie gry jest błyskawiczna i odsłania pojedyncze litery", () => {
    const { room, ids } = speedSetup();
    expect(room.round!.mode).toBe("speed");
    expect(room.round!.turn).toBeNull();
    expect(room.round!.pool).toBe(SPEED_POOL);
    expect(() => room.spin(ids[0])).toThrow();
    expect(() => room.guess(ids[1], "ALA MA KOTA")).toThrow(/start/);
    expect(shown(room)).toBe(0);
    vi.advanceTimersByTime(SPEED_INTRO_MS);
    expect(shown(room)).toBe(1);
    vi.advanceTimersByTime(SPEED_REVEAL_MS * 2);
    expect(shown(room)).toBe(3);
  });

  it("każdy może zgadywać, pomyłka blokuje na chwilę, trafienie wygrywa pulę", () => {
    const { room, ids } = speedSetup();
    vi.advanceTimersByTime(SPEED_INTRO_MS);
    room.guess(ids[2], "OLA MA PSA");
    expect(() => room.guess(ids[2], "ALA MA KOTA")).toThrow(/poczekaj/i);
    vi.advanceTimersByTime(SPEED_LOCK_MS);
    const before = room.getPlayer(ids[1])!.score;
    room.guess(ids[1], "ala ma kota");
    expect(room.phase).toBe("roundEnd");
    expect(room.round!.winnerId).toBe(ids[1]);
    expect(room.getPlayer(ids[1])!.score).toBe(before + SPEED_POOL);
  });

  it("gdy nikt nie zgadnie, pula przepada, a gra toczy się dalej kołem", () => {
    const { room } = speedSetup();
    // 9 liter: pierwsza po odliczaniu, potem 8 odstępów i czas na wpisanie po ostatniej.
    vi.advanceTimersByTime(SPEED_INTRO_MS + SPEED_REVEAL_MS * 8);
    expect(shown(room)).toBe(9);
    expect(room.phase).toBe("playing");
    vi.advanceTimersByTime(SPEED_TAIL_MS);
    expect(room.phase).toBe("roundEnd");
    expect(room.round!.winnerId).toBeNull();
    vi.advanceTimersByTime(ROUND_END_MS);
    expect(room.round).toMatchObject({ number: 4, mode: "wheel" });
    expect(turn(room).phase).toBe("spin");
  });

  it("w grze na 3 rundy nie ma rundy błyskawicznej", () => {
    const { room, ids } = setup();
    room.updateSettings(ids[0], { rounds: 3 });
    room.start(ids[0]);
    for (let r = 1; r <= 3; r++) {
      expect(room.round).toMatchObject({ number: r, mode: "wheel" });
      if (r < 3) playUntil(room, r + 1);
    }
  });

  it("można ją wyłączyć w ustawieniach", () => {
    const { room, ids } = setup();
    room.updateSettings(ids[0], { rounds: 5, speedRound: false });
    room.start(ids[0]);
    playUntil(room, 3);
    expect(room.round!.mode).toBe("wheel");
  });
});

describe("czas i rozłączenia", () => {
  it("brak zakręcenia w czasie = utrata kolejki", () => {
    const { room, ids } = setup();
    startWith(room, ids[0], "KOT");
    vi.advanceTimersByTime(30_000);
    expect(turn(room).playerId).toBe(ids[1]);
  });

  it("bez limitu czasu tura czeka, ale rozłączony gracz jest pomijany", () => {
    const { room, ids } = setup(undefined, 0);
    startWith(room, ids[0], "KOT");
    vi.advanceTimersByTime(120_000);
    expect(turn(room).playerId).toBe(ids[0]);
    room.disconnect(ids[0], "socket-0");
    vi.advanceTimersByTime(AWAY_TURN_MS);
    expect(turn(room).playerId).toBe(ids[1]);
  });
});

describe("koniec gry", () => {
  it("po ostatniej rundzie zapisuje wyniki zalogowanych", () => {
    const { room, ids, results } = setup(["Ala", "Bartek"]);
    room.settings.rounds = 3;
    room.settings.speedRound = false;
    room.start(ids[0]);
    for (let r = 0; r < 3; r++) {
      const current = turn(room).playerId;
      spinTo(room, current, "play");
      room.guess(current, room.round!.answer);
      vi.advanceTimersByTime(ROUND_END_MS);
    }
    expect(room.phase).toBe("gameOver");
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveLength(1);
    expect(results[0][0].userId).toBe("user_1");
    room.backToLobby(ids[0]);
    expect(room.phase).toBe("lobby");
    expect(room.players.every((p) => p.score === 0)).toBe(true);
  });
});

describe("koło i litery", () => {
  it("obrót koła trafia w wylosowane pole", () => {
    let rotation = 0;
    for (let i = 0; i < WHEEL.length; i++) {
      for (const jitter of [0, 0.5, 0.999]) {
        rotation = rotationFor(rotation, i, jitter);
        expect(segmentAt(rotation)).toBe(i);
      }
    }
  });

  it("porównuje hasła bez polskich znaków i interpunkcji", () => {
    expect(normalizeAnswer("  Żółć, gęślą!  ")).toBe(normalizeAnswer("zolc gesla"));
    expect(normalizeAnswer("Pat i Mat")).not.toBe(normalizeAnswer("Pat i Mata"));
  });
});
