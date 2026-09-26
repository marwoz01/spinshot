import type { Avatar } from "./avatar.ts";

export type PlayerStatus = "active" | "eliminated";

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: Avatar;
  score: number;
  roundsWon: number;
  status: PlayerStatus;
  connected: boolean;
  isGuest: boolean;
}

export interface RoomSettings {
  rounds: number;
  /** 0 = bez limitu czasu */
  turnSeconds: number;
}

export const ROUND_OPTIONS = [3, 5, 7, 10] as const;
export const TIMER_OPTIONS = [0, 15, 30, 45, 60] as const;
export const DEFAULT_SETTINGS: RoomSettings = { rounds: 5, turnSeconds: 30 };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const MAX_NAME = 16;

export type TurnPhase =
  | "spin" // czeka na zakręcenie
  | "spinning" // koło się kręci
  | "action" // wpisz literę albo zgaduj hasło
  | "choice" // graj dalej albo wskaż osobę do „Zgadnij lub odpadnij"
  | "forcedGuess" // targetId musi zgadywać, inaczej odpada
  | "revive"; // wybierz odpadniętego gracza do wskrzeszenia

export interface TurnState {
  playerId: string;
  phase: TurnPhase;
  segmentIndex: number | null;
  allowVowel: boolean;
  targetId: string | null;
  /** Znacznik czasu (ms) końca tury albo null, gdy bez limitu. */
  deadline: number | null;
}

export interface UsedLetter {
  letter: string;
  hits: number;
}

export interface RoundState {
  number: number;
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
  | { type: "revived"; playerId: string }
  | { type: "allBack" }
  | { type: "reverse" }
  | { type: "roundWin"; playerId: string }
  | { type: "gameOver" };

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
  "game:revive": (playerId: string) => void;
  "game:skip": () => void;
  "game:lobby": () => void;
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
