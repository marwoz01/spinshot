import { randomUUID } from "node:crypto";
import { sanitizeAvatar, type Avatar } from "../shared/avatar.ts";
import { isLetter, isVowel, normalizeAnswer } from "../shared/letters.ts";
import {
  DEFAULT_SETTINGS,
  MAX_NAME,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROUND_OPTIONS,
  TIMER_OPTIONS,
  type ClientProfile,
  type Fx,
  type LogEntry,
  type LogKind,
  type PlayerStatus,
  type PublicPlayer,
  type RoomPhase,
  type RoomSettings,
  type RoomState,
  type TurnPhase,
  type TurnState,
  type UsedLetter,
} from "../shared/types.ts";
import { rotationFor, SPIN_MS, WHEEL } from "../shared/wheel.ts";
import { pickPassword } from "./passwords.ts";

export const ROUND_END_MS = 7000;
/** Ile czekamy na rozłączonego gracza, gdy to on ma wykonać ruch. */
export const AWAY_TURN_MS = 8000;
/** Po tylu ms rozłączony gracz znika z poczekalni (albo oddaje hosta w trakcie gry). */
export const LEAVE_GRACE_MS = 20000;
/** Po tylu ms pusty pokój jest usuwany. */
export const EMPTY_ROOM_MS = 60000;
const LOG_LIMIT = 80;
const CHAT_COOLDOWN_MS = 400;

export class GameError extends Error {}

export interface Player {
  id: string;
  sessionId: string;
  socketId: string | null;
  userId: string | null;
  name: string;
  avatar: Avatar;
  score: number;
  roundsWon: number;
  status: PlayerStatus;
  connected: boolean;
}

interface Round {
  number: number;
  category: string;
  answer: string;
  revealed: Set<string>;
  usedLetters: UsedLetter[];
  pool: number;
  direction: 1 | -1;
  wheelRotation: number;
  turn: TurnState | null;
  winnerId: string | null;
}

export interface GameResult {
  userId: string;
  score: number;
  roundsWon: number;
  won: boolean;
}

export interface RoomHooks {
  onChange(room: Room): void;
  onFx(room: Room, fx: Fx): void;
  onGameOver(room: Room, results: GameResult[]): void;
  onEmpty(room: Room): void;
}

export class Room {
  readonly code: string;
  hostId = "";
  phase: RoomPhase = "lobby";
  settings: RoomSettings = { ...DEFAULT_SETTINGS };
  players: Player[] = [];
  round: Round | null = null;
  log: LogEntry[] = [];
  nextRoundAt: number | null = null;
  rng: () => number = Math.random;

  private hooks: RoomHooks;
  private usedAnswers = new Set<string>();
  private logId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingSegment: number | null = null;
  private leaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private emptyTimer: ReturnType<typeof setTimeout> | null = null;
  private lastChat = new Map<string, number>();

  constructor(code: string, hooks: RoomHooks) {
    this.code = code;
    this.hooks = hooks;
  }

  // ───────────────────────── gracze ─────────────────────────

  getPlayer(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  /** Dołącza nowego gracza albo przywraca istniejącego (ten sam sessionId). */
  join(sessionId: string, socketId: string, userId: string | null, profile: ClientProfile): Player {
    const existing = this.players.find((p) => p.sessionId === sessionId);
    if (existing) {
      existing.connected = true;
      existing.socketId = socketId;
      existing.userId = userId;
      this.applyProfile(existing, profile);
      this.clearLeaveTimer(existing.id);
      this.clearEmptyTimer();
      if (this.round?.turn && this.inputPlayerId() === existing.id && this.round.turn.phase !== "spinning") {
        this.armDeadline();
      }
      this.resumeIfStalled();
      this.touch();
      return existing;
    }

    if (this.players.length >= MAX_PLAYERS) throw new GameError("Pokój jest pełny.");
    const player: Player = {
      id: randomUUID().slice(0, 8),
      sessionId,
      socketId,
      userId,
      name: "",
      avatar: sanitizeAvatar(null),
      score: 0,
      roundsWon: 0,
      status: "active",
      connected: true,
    };
    this.applyProfile(player, profile);
    this.players.push(player);
    if (!this.getPlayer(this.hostId)) this.hostId = player.id;
    this.clearEmptyTimer();
    this.addLog("system", `${player.name} dołącza do pokoju.`);
    this.resumeIfStalled();
    this.touch();
    return player;
  }

  updateProfile(playerId: string, profile: ClientProfile): void {
    const player = this.requirePlayer(playerId);
    this.applyProfile(player, profile);
    this.touch();
  }

  /** Rozłączenie gniazda — gracz ma chwilę na powrót (np. odświeżenie strony). */
  disconnect(playerId: string, socketId: string): void {
    const player = this.getPlayer(playerId);
    if (!player || player.socketId !== socketId) return;
    player.connected = false;
    player.socketId = null;

    this.clearLeaveTimer(player.id);
    this.leaveTimers.set(
      player.id,
      setTimeout(() => this.finalizeLeave(player.id), LEAVE_GRACE_MS),
    );

    if (this.round?.turn && this.inputPlayerId() === player.id) this.shortenDeadlineForAway();
    if (!this.players.some((p) => p.connected)) {
      this.clearEmptyTimer();
      this.emptyTimer = setTimeout(() => this.hooks.onEmpty(this), EMPTY_ROOM_MS);
    }
    this.touch();
  }

  /** Świadome wyjście z pokoju. */
  leave(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) return;
    if (this.phase === "lobby") {
      this.removePlayer(player.id);
      return;
    }
    player.connected = false;
    player.socketId = null;
    this.addLog("system", `${player.name} opuszcza grę.`);
    if (this.hostId === player.id) this.transferHost();
    if (this.round?.turn && this.inputPlayerId() === player.id && this.round.turn.phase !== "spinning") {
      this.endTurn();
    }
    if (!this.players.some((p) => p.connected)) this.hooks.onEmpty(this);
    else this.touch();
  }

  kick(hostId: string, playerId: string): Player {
    this.requireHost(hostId);
    if (this.phase !== "lobby") throw new GameError("Wyrzucać można tylko w poczekalni.");
    if (playerId === hostId) throw new GameError("Nie możesz wyrzucić siebie.");
    const player = this.requirePlayer(playerId);
    this.removePlayer(player.id, `${player.name} wylatuje z pokoju.`);
    return player;
  }

  private finalizeLeave(playerId: string): void {
    this.leaveTimers.delete(playerId);
    const player = this.getPlayer(playerId);
    if (!player || player.connected) return;
    if (this.phase === "lobby") {
      this.removePlayer(player.id);
    } else if (this.hostId === player.id) {
      this.transferHost();
      this.touch();
    }
  }

  private removePlayer(playerId: string, message?: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return;
    const [player] = this.players.splice(idx, 1);
    this.clearLeaveTimer(player.id);
    this.addLog("system", message ?? `${player.name} wychodzi z pokoju.`);
    if (this.players.length === 0) {
      this.hooks.onEmpty(this);
      return;
    }
    if (this.hostId === player.id) this.transferHost();
    this.touch();
  }

  private transferHost(): void {
    const next = this.players.find((p) => p.connected && p.id !== this.hostId) ?? this.players.find((p) => p.id !== this.hostId);
    if (!next) return;
    this.hostId = next.id;
    this.addLog("system", `${next.name} przejmuje rolę hosta.`);
  }

  private applyProfile(player: Player, profile: ClientProfile): void {
    const base =
      String(profile?.name ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_NAME) || "Gracz";
    player.name = this.uniqueName(base, player.id);
    player.avatar = sanitizeAvatar(profile?.avatar);
  }

  private uniqueName(base: string, selfId: string): string {
    const taken = new Set(this.players.filter((p) => p.id !== selfId).map((p) => p.name.toLocaleLowerCase("pl")));
    if (!taken.has(base.toLocaleLowerCase("pl"))) return base;
    for (let i = 2; ; i++) {
      const candidate = `${base.slice(0, MAX_NAME - 2)} ${i}`;
      if (!taken.has(candidate.toLocaleLowerCase("pl"))) return candidate;
    }
  }

  // ───────────────────────── poczekalnia ─────────────────────────

  updateSettings(playerId: string, patch: Partial<RoomSettings>): void {
    this.requireHost(playerId);
    if (this.phase !== "lobby") throw new GameError("Ustawienia można zmieniać tylko w poczekalni.");
    if (patch.rounds !== undefined && (ROUND_OPTIONS as readonly number[]).includes(patch.rounds)) {
      this.settings.rounds = patch.rounds;
    }
    if (patch.turnSeconds !== undefined && (TIMER_OPTIONS as readonly number[]).includes(patch.turnSeconds)) {
      this.settings.turnSeconds = patch.turnSeconds;
    }
    this.touch();
  }

  start(playerId: string): void {
    this.requireHost(playerId);
    if (this.phase !== "lobby") throw new GameError("Gra już trwa.");
    const present = this.players.filter((p) => p.connected);
    if (present.length < MIN_PLAYERS) throw new GameError(`Potrzeba co najmniej ${MIN_PLAYERS} graczy.`);
    for (const p of this.players) {
      p.score = 0;
      p.roundsWon = 0;
    }
    this.usedAnswers.clear();
    this.addLog("system", "Gra się zaczyna! Powodzenia!");
    this.startRound(1);
  }

  backToLobby(playerId: string): void {
    this.requireHost(playerId);
    if (this.phase === "lobby") return;
    this.clearTimer();
    this.phase = "lobby";
    this.round = null;
    this.nextRoundAt = null;
    for (const p of this.players) {
      p.status = "active";
      p.score = 0;
      p.roundsWon = 0;
    }
    // Nieobecni gracze nie wiszą w poczekalni w nieskończoność.
    for (const p of [...this.players]) {
      if (!p.connected && !this.leaveTimers.has(p.id)) this.removePlayer(p.id);
    }
    this.addLog("system", "Wracamy do poczekalni.");
    this.touch();
  }

  chat(playerId: string, text: string): void {
    const player = this.requirePlayer(playerId);
    const clean = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!clean) return;
    const now = Date.now();
    if (now - (this.lastChat.get(playerId) ?? 0) < CHAT_COOLDOWN_MS) return;
    this.lastChat.set(playerId, now);
    this.addLog("chat", clean, player.id);
    this.touch();
  }

  // ───────────────────────── rozgrywka ─────────────────────────

  private startRound(number: number): void {
    const password = pickPassword(this.usedAnswers, this.rng);
    this.usedAnswers.add(password.answer);
    for (const p of this.players) p.status = "active";
    this.phase = "playing";
    this.nextRoundAt = null;
    this.round = {
      number,
      category: password.category,
      answer: password.answer,
      revealed: new Set(),
      usedLetters: [],
      pool: 1,
      direction: 1,
      wheelRotation: this.round?.wheelRotation ?? 0,
      turn: null,
      winnerId: null,
    };
    this.addLog("system", `Runda ${number}/${this.settings.rounds} — temat: ${password.category}`);
    const eligible = this.eligiblePlayers();
    const starter = eligible[(number - 1) % Math.max(1, eligible.length)];
    if (starter) this.startTurn(starter.id);
    else this.touch();
  }

  spin(playerId: string): void {
    const round = this.requireRound();
    const turn = this.requireTurn(playerId, "spin");
    const index = Math.floor(this.rng() * WHEEL.length);
    round.wheelRotation = rotationFor(round.wheelRotation, index, this.rng());
    turn.phase = "spinning";
    turn.segmentIndex = null;
    turn.deadline = null;
    this.pendingSegment = index;
    this.clearTimer();
    this.timer = setTimeout(() => this.resolveSegment(), SPIN_MS);
    this.emitFx({ type: "spin", playerId });
    this.touch();
  }

  private resolveSegment(): void {
    this.timer = null;
    const round = this.round;
    const turn = round?.turn;
    const index = this.pendingSegment;
    this.pendingSegment = null;
    if (!round || !turn || turn.phase !== "spinning" || index === null) return;

    const segment = WHEEL[index];
    const player = this.requirePlayer(turn.playerId);
    turn.segmentIndex = index;
    this.addLog("info", `${player.name} kręci: ${segment.label}`, player.id);
    this.emitFx({ type: "segment", segmentIndex: index, playerId: player.id });

    switch (segment.kind) {
      case "play":
        return this.toAction(false);
      case "plus1":
      case "plus2": {
        const amount = segment.kind === "plus1" ? 1 : 2;
        round.pool += amount;
        this.emitFx({ type: "pool", amount });
        return this.toAction(false);
      }
      case "vowel":
        return this.toAction(true);
      case "reverse":
        round.direction = round.direction === 1 ? -1 : 1;
        this.emitFx({ type: "reverse" });
        return this.toAction(false);
      case "lose":
        return this.endTurn();
      case "loseTwo": {
        const skipped = this.nextEligible(player.id, 1);
        if (skipped && skipped.id !== player.id) this.addLog("bad", `${skipped.name} również traci kolejkę.`);
        return this.endTurn(2);
      }
      case "guessOrOut":
        turn.phase = "forcedGuess";
        turn.targetId = player.id;
        this.armDeadline();
        return this.touch();
      case "pickGuessOrOut":
        if (this.eligiblePlayers().some((p) => p.id !== player.id)) {
          turn.phase = "choice";
          this.armDeadline();
          return this.touch();
        }
        return this.toAction(false);
      case "revive":
        if (this.revivablePlayers().length > 0) {
          turn.phase = "revive";
          this.armDeadline();
          return this.touch();
        }
        this.addLog("info", `Nikt nie odpadł — ${player.name} gra dalej.`);
        return this.toAction(false);
    }
  }

  private toAction(allowVowel: boolean): void {
    const turn = this.requireRound().turn!;
    turn.phase = "action";
    turn.allowVowel = allowVowel;
    this.armDeadline();
    this.touch();
  }

  letter(playerId: string, raw: string): void {
    const round = this.requireRound();
    const turn = this.requireTurn(playerId, "action");
    const letter = String(raw ?? "").trim().toLocaleUpperCase("pl");
    if (letter.length !== 1 || !isLetter(letter)) throw new GameError("Wpisz jedną literę.");
    if (isVowel(letter) && !turn.allowVowel) {
      throw new GameError("Samogłoskę możesz wybrać tylko po wylosowaniu takiego pola.");
    }
    if (round.usedLetters.some((u) => u.letter === letter)) throw new GameError("Ta litera już padła.");

    const player = this.requirePlayer(playerId);
    const hits = [...round.answer].filter((ch) => ch === letter).length;
    round.usedLetters.push({ letter, hits });
    if (hits > 0) {
      round.revealed.add(letter);
      this.addLog("good", `${player.name}: litera ${letter} — trafienia: ${hits}`, player.id);
      this.emitFx({ type: "hit", letter, hits, playerId });
    } else {
      this.addLog("bad", `${player.name}: litera ${letter} — pudło`, player.id);
      this.emitFx({ type: "miss", letter, playerId });
    }

    if (this.allLettersRevealed()) return this.winRound(player.id);
    this.endTurn();
  }

  guess(playerId: string, text: string): void {
    const round = this.requireRound();
    const turn = round.turn;
    const allowed =
      turn &&
      ((turn.phase === "action" && turn.playerId === playerId) ||
        (turn.phase === "forcedGuess" && turn.targetId === playerId));
    if (!allowed) throw new GameError("Teraz nie możesz zgadywać.");
    const guess = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!guess) throw new GameError("Wpisz hasło.");

    if (normalizeAnswer(guess) === normalizeAnswer(round.answer)) return this.winRound(playerId);

    const player = this.requirePlayer(playerId);
    this.addLog("bad", `${player.name} zgaduje „${guess}” — pudło! ${player.name} odpada z rundy.`, player.id);
    this.eliminate(player.id);
    this.endTurn();
  }

  choice(playerId: string, choice: { mode: "play" } | { mode: "target"; targetId: string }): void {
    const turn = this.requireTurn(playerId, "choice");
    if (choice?.mode === "play") return this.toAction(false);
    const target = choice?.mode === "target" ? this.getPlayer(choice.targetId) : undefined;
    if (!target || target.id === playerId || !this.isEligible(target)) {
      throw new GameError("Tej osoby nie można wskazać.");
    }
    const player = this.requirePlayer(playerId);
    turn.phase = "forcedGuess";
    turn.targetId = target.id;
    this.addLog("info", `${player.name} wskazuje: ${target.name} — zgadnij lub odpadnij!`, player.id);
    this.armDeadline();
    this.touch();
  }

  revive(playerId: string, targetId: string): void {
    this.requireTurn(playerId, "revive");
    const target = this.getPlayer(targetId);
    if (!target || target.status !== "eliminated" || !target.connected) {
      throw new GameError("Tej osoby nie można wskrzesić.");
    }
    const player = this.requirePlayer(playerId);
    target.status = "active";
    this.addLog("good", `${player.name} wskrzesza: ${target.name}!`, player.id);
    this.emitFx({ type: "revived", playerId: target.id });
    this.toAction(false);
  }

  skip(playerId: string): void {
    this.requireHost(playerId);
    const turn = this.round?.turn;
    if (this.phase !== "playing" || !turn) throw new GameError("Nie ma czego pomijać.");
    if (turn.phase === "spinning") throw new GameError("Poczekaj, aż koło się zatrzyma.");
    const who = this.getPlayer(this.inputPlayerId() ?? "");
    this.addLog("system", `Host pomija ruch${who ? `: ${who.name}` : ""}.`);
    this.endTurn();
  }

  private onTimeout(): void {
    this.timer = null;
    const turn = this.round?.turn;
    if (!turn || this.phase !== "playing") return;
    const who = this.getPlayer(this.inputPlayerId() ?? "");
    const away = who && !who.connected;
    if (turn.phase === "forcedGuess" && who) {
      this.addLog("bad", `${who.name} nie ${away ? "odpowiada" : "zdąża zgadnąć"} — odpada z rundy.`, who.id);
      this.eliminate(who.id);
    } else if (who) {
      this.addLog("bad", `${who.name}: ${away ? "brak gracza" : "czas minął"} — traci kolejkę.`, who.id);
    }
    this.endTurn();
  }

  private eliminate(playerId: string): void {
    const player = this.requirePlayer(playerId);
    player.status = "eliminated";
    this.emitFx({ type: "eliminated", playerId });
    if (this.eligiblePlayers().length === 0) {
      for (const p of this.players) if (p.connected) p.status = "active";
      this.addLog("system", "Wszyscy odpadli — wszyscy wracają do gry!");
      this.emitFx({ type: "allBack" });
    }
  }

  private endTurn(steps = 1): void {
    const round = this.round;
    if (!round || this.phase !== "playing") return;
    this.clearTimer();
    this.pendingSegment = null;
    const from = round.turn?.playerId;
    const next = from ? this.nextEligible(from, steps) : this.eligiblePlayers()[0];
    if (!next) {
      round.turn = null;
      this.touch();
      return;
    }
    this.startTurn(next.id);
  }

  private startTurn(playerId: string): void {
    const round = this.requireRound();
    round.turn = {
      playerId,
      phase: "spin",
      segmentIndex: null,
      allowVowel: false,
      targetId: null,
      deadline: null,
    };
    this.armDeadline();
    this.touch();
  }

  private resumeIfStalled(): void {
    if (this.phase === "playing" && this.round && !this.round.turn) this.endTurn();
  }

  private winRound(playerId: string): void {
    const round = this.requireRound();
    const player = this.requirePlayer(playerId);
    this.clearTimer();
    for (const ch of round.answer) if (isLetter(ch)) round.revealed.add(ch);
    player.score += round.pool;
    player.roundsWon += 1;
    round.winnerId = player.id;
    round.turn = null;
    this.addLog("good", `${player.name} odgaduje hasło „${round.answer}” i zgarnia ${round.pool} pkt!`, player.id);
    this.emitFx({ type: "roundWin", playerId: player.id });

    this.phase = "roundEnd";
    this.nextRoundAt = Date.now() + ROUND_END_MS;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (round.number >= this.settings.rounds) this.finishGame();
      else this.startRound(round.number + 1);
    }, ROUND_END_MS);
    this.touch();
  }

  private finishGame(): void {
    this.phase = "gameOver";
    this.nextRoundAt = null;
    const top = Math.max(0, ...this.players.map((p) => p.score));
    const winners = this.players.filter((p) => p.score === top && top > 0);
    this.addLog("system", winners.length ? `Koniec gry! Wygrywa: ${winners.map((w) => w.name).join(", ")}` : "Koniec gry!");
    this.emitFx({ type: "gameOver" });
    const results = this.players
      .filter((p): p is Player & { userId: string } => Boolean(p.userId))
      .map((p) => ({ userId: p.userId, score: p.score, roundsWon: p.roundsWon, won: winners.includes(p) }));
    this.hooks.onGameOver(this, results);
    this.touch();
  }

  // ───────────────────────── kolejka i czas ─────────────────────────

  /** Kto ma teraz wykonać ruch (przy „zgadnij lub odpadnij" może to być wskazana osoba). */
  inputPlayerId(): string | null {
    const turn = this.round?.turn;
    if (!turn) return null;
    return turn.phase === "forcedGuess" && turn.targetId ? turn.targetId : turn.playerId;
  }

  private isEligible(p: Player): boolean {
    return p.connected && p.status === "active";
  }

  private eligiblePlayers(): Player[] {
    return this.players.filter((p) => this.isEligible(p));
  }

  private revivablePlayers(): Player[] {
    return this.players.filter((p) => p.connected && p.status === "eliminated");
  }

  /** Następny aktywny gracz w bieżącym kierunku; `steps` = ilu aktywnych przeskoczyć. */
  private nextEligible(fromId: string, steps: number): Player | null {
    const n = this.players.length;
    const start = this.players.findIndex((p) => p.id === fromId);
    if (start < 0) return this.eligiblePlayers()[0] ?? null;
    const dir = this.round?.direction ?? 1;
    let found = 0;
    for (let i = 1; i <= n * steps; i++) {
      const p = this.players[(((start + i * dir) % n) + n) % n];
      if (this.isEligible(p) && ++found === steps) return p;
    }
    return null;
  }

  private armDeadline(): void {
    const turn = this.round?.turn;
    if (!turn) return;
    this.clearTimer();
    const now = Date.now();
    const seconds = this.settings.turnSeconds;
    let deadline: number | null = seconds > 0 ? now + seconds * 1000 : null;
    const input = this.getPlayer(this.inputPlayerId() ?? "");
    if (input && !input.connected) deadline = Math.min(deadline ?? Infinity, now + AWAY_TURN_MS);
    turn.deadline = deadline;
    if (deadline !== null) this.timer = setTimeout(() => this.onTimeout(), deadline - now);
  }

  private shortenDeadlineForAway(): void {
    const turn = this.round?.turn;
    if (!turn || turn.phase === "spinning") return;
    const now = Date.now();
    if (turn.deadline !== null && turn.deadline <= now + AWAY_TURN_MS) return;
    this.clearTimer();
    turn.deadline = now + AWAY_TURN_MS;
    this.timer = setTimeout(() => this.onTimeout(), AWAY_TURN_MS);
  }

  private allLettersRevealed(): boolean {
    const round = this.requireRound();
    return [...round.answer].every((ch) => !isLetter(ch) || round.revealed.has(ch));
  }

  // ───────────────────────── pomocnicze ─────────────────────────

  private requirePlayer(id: string): Player {
    const player = this.getPlayer(id);
    if (!player) throw new GameError("Nie ma takiego gracza.");
    return player;
  }

  private requireHost(id: string): void {
    if (this.hostId !== id) throw new GameError("Tylko host może to zrobić.");
  }

  private requireRound(): Round {
    if (!this.round || (this.phase !== "playing" && this.phase !== "roundEnd")) {
      throw new GameError("Gra nie trwa.");
    }
    return this.round;
  }

  private requireTurn(playerId: string, phase: TurnPhase): TurnState {
    const turn = this.requireRound().turn;
    if (this.phase !== "playing" || !turn || turn.phase !== phase || turn.playerId !== playerId) {
      throw new GameError("To nie jest teraz Twój ruch.");
    }
    return turn;
  }

  private addLog(kind: LogKind, text: string, playerId?: string): void {
    this.log.push({ id: ++this.logId, ts: Date.now(), kind, text, playerId });
    if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT);
  }

  private emitFx(fx: Fx): void {
    this.hooks.onFx(this, fx);
  }

  private touch(): void {
    this.hooks.onChange(this);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private clearLeaveTimer(id: string): void {
    const t = this.leaveTimers.get(id);
    if (t) clearTimeout(t);
    this.leaveTimers.delete(id);
  }

  private clearEmptyTimer(): void {
    if (this.emptyTimer) clearTimeout(this.emptyTimer);
    this.emptyTimer = null;
  }

  dispose(): void {
    this.clearTimer();
    this.clearEmptyTimer();
    for (const t of this.leaveTimers.values()) clearTimeout(t);
    this.leaveTimers.clear();
  }

  toState(): RoomState {
    const round = this.round;
    const finished = this.phase === "roundEnd" || this.phase === "gameOver";
    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      settings: { ...this.settings },
      players: this.players.map(
        (p): PublicPlayer => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
          roundsWon: p.roundsWon,
          status: p.status,
          connected: p.connected,
          isGuest: !p.userId,
        }),
      ),
      round: round && {
        number: round.number,
        category: round.category,
        board: round.answer
          .split(" ")
          .map((word) => [...word].map((ch) => (!isLetter(ch) || round.revealed.has(ch) || finished ? ch : null))),
        usedLetters: [...round.usedLetters],
        pool: round.pool,
        direction: round.direction,
        wheelRotation: round.wheelRotation,
        turn: round.turn && { ...round.turn },
        winnerId: round.winnerId,
        answer: finished ? round.answer : null,
      },
      log: [...this.log],
      nextRoundAt: this.nextRoundAt,
      serverTime: Date.now(),
    };
  }
}
