import type { Avatar } from "./avatar.ts";

export type PlayerStatus = "active" | "eliminated";

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: Avatar;
  score: number;
  roundsWon: number;
  status: PlayerStatus;
  /** Życia w bieżącej rundzie: pomyłka przy „Zgadnij lub odpadnij" zabiera jedno. */
  lives: number;
  connected: boolean;
  isGuest: boolean;
}

export interface RoomSettings {
  rounds: number;
  /** 0 = bez limitu czasu */
  turnSeconds: number;
  /** Jedna losowa runda (nie pierwsza) jest błyskawiczna: litery odsłaniają się same, wygrywa najszybszy. */
  speedRound: boolean;
}

/** Runda błyskawiczna pojawia się tylko w dłuższych grach. */
export const SPEED_MIN_ROUNDS = 5;

/** Losuje numer rundy błyskawicznej (od 2. do ostatniej) albo zwraca null, gdy jej nie ma. */
export function pickSpeedRound(settings: RoomSettings, rng: () => number = Math.random): number | null {
  if (!settings.speedRound || settings.rounds < SPEED_MIN_ROUNDS) return null;
  return 2 + Math.floor(rng() * (settings.rounds - 1));
}

export const ROUND_OPTIONS = [3, 5, 7, 10] as const;
export const TIMER_OPTIONS = [0, 15, 30, 45, 60] as const;
export const DEFAULT_SETTINGS: RoomSettings = { rounds: 5, turnSeconds: 30, speedRound: true };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const MAX_NAME = 16;
/** Ile pomyłek przy „Zgadnij lub odpadnij" wytrzymuje gracz w jednej rundzie. */
export const LIVES = 2;

export type TurnPhase =
  | "spin" // czeka na zakręcenie
  | "spinning" // koło się kręci
  | "action" // wpisz literę albo zgaduj hasło
  | "choice" // graj dalej albo wskaż osobę do „Zgadnij lub odpadnij"
  | "forcedGuess" // targetId musi zgadywać, inaczej odpada
  | "revive" // wskrześ ducha za 1 pkt albo graj dalej
  | "give" // oddaj 1 pkt wybranej osobie
  | "poolChoice"; // +2 albo -2 do puli

export interface TurnState {
  playerId: string;
  phase: TurnPhase;
  segmentIndex: number | null;
  allowVowel: boolean;
  /** Pole „Ryzykowna litera": pudło kosztuje 1 pkt. */
  risky: boolean;
  targetId: string | null;
  /** Znacznik czasu (ms) końca tury albo null, gdy bez limitu. */
  deadline: number | null;
}

export interface UsedLetter {
  letter: string;
  hits: number;
}

export type RoundMode = "wheel" | "speed";

export interface RoundState {
  number: number;
  mode: RoundMode;
  /** Runda błyskawiczna: kiedy zaczną się odsłaniać litery. */
  startsAt: number | null;
  /** Runda błyskawiczna: do kiedy gracz po pomyłce nie może zgadywać (playerId -> ms). */
  locks: Record<string, number>;
  /** Dogrywka po remisie: tylko ci gracze mogą zgadywać. */
  tiebreak: string[] | null;
  category: string;
  /** Słowa hasła: litera, null (zakryta) lub znak specjalny. */
  board: (string | null)[][];
  usedLetters: UsedLetter[];
  pool: number;
  direction: 1 | -1;
  wheelRotation: number;
  turn: TurnState | null;
  winnerId: string | null;
  /** Ujawniane dopiero po zakończeniu rundy. */
  answer: string | null;
}

export type RoomPhase = "lobby" | "playing" | "roundEnd" | "gameOver";

export type LogKind = "info" | "good" | "bad" | "chat" | "system";

export interface LogEntry {
  id: number;
  ts: number;
  kind: LogKind;
  text: string;
  playerId?: string;
}

export interface RoomState {
  code: string;
  phase: RoomPhase;
  hostId: string;
  settings: RoomSettings;
  players: PublicPlayer[];
  round: RoundState | null;
  log: LogEntry[];
  nextRoundAt: number | null;
  /** Remis na koniec gry: host wybiera dogrywkę albo wspólne 1. miejsce do `decideBy`. */
  tie: { playerIds: string[]; decideBy: number } | null;
  /** Czas serwera w chwili wysłania — klient liczy z niego przesunięcie zegara. */
  serverTime: number;
}

export interface ClientProfile {
  name: string;
  avatar: Avatar;
}

export type Fx =
  | { type: "spin"; playerId: string }
  | { type: "segment"; segmentIndex: number; playerId: string }
  | { type: "hit"; letter: string; hits: number; playerId: string }
  | { type: "miss"; letter: string; playerId: string }
  | { type: "pool"; amount: number }
  | { type: "eliminated"; playerId: string }
  | { type: "lifeLost"; playerId: string }
  | { type: "revived"; playerId: string }
  | { type: "wrongGuess"; playerId: string }
  | { type: "score"; playerId: string; amount: number }
  | { type: "reveal" }
  | { type: "reverse" }
  | { type: "roundWin"; playerId: string }
  | { type: "gameOver" };

export type TieChoice = "playoff" | "share";

export type Ack<T = object> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServer {
  "room:create": (profile: ClientProfile, ack: Ack<{ code: string }>) => void;
  "room:join": (data: { code: string; profile: ClientProfile }, ack: Ack<{ code: string }>) => void;
  "room:leave": () => void;
  "room:settings": (settings: Partial<RoomSettings>) => void;
  "room:kick": (playerId: string) => void;
  "profile:update": (profile: ClientProfile) => void;
  "game:start": (ack: Ack) => void;
  "game:spin": () => void;
  "game:letter": (letter: string, ack: Ack) => void;
  "game:guess": (text: string, ack: Ack) => void;
  "game:choice": (choice: { mode: "play" } | { mode: "target"; targetId: string }) => void;
  /** null = zamiast wskrzeszać, graj dalej. */
  "game:revive": (playerId: string | null) => void;
  "game:give": (playerId: string) => void;
  "game:pool": (delta: number) => void;
  "game:skip": () => void;
  "game:lobby": () => void;
  "game:tie": (choice: TieChoice) => void;
  "chat:send": (text: string) => void;
}

export interface ServerToClient {
  "room:state": (state: RoomState, you: string) => void;
  "room:kicked": () => void;
  fx: (fx: Fx) => void;
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  roundsWon: number;
  points: number;
}

export const EMPTY_STATS: UserStats = { gamesPlayed: 0, wins: 0, roundsWon: 0, points: 0 };

export interface RankingEntry {
  place: number;
  nick: string;
  avatar: Avatar | null;
  stats: UserStats;
}

export interface Ranking {
  top: RankingEntry[];
  /** Miejsce zalogowanego gracza (także spoza czołówki) albo null. */
  you: RankingEntry | null;
}
