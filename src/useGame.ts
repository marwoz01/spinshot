import confetti from "canvas-confetti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientProfile, ClientToServer, Fx, RoomSettings, RoomState, ServerToClient, TieChoice } from "../shared/types.ts";
import { SPIN_MS } from "../shared/wheel.ts";
import { useAuthInfo } from "./auth.tsx";
import { syncClock } from "./clock.ts";
import { sfx } from "./sfx.ts";

type GameSocket = Socket<ServerToClient, ClientToServer>;

function storage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

/** Identyfikator karty — pozwala wrócić do pokoju po odświeżeniu, a dwie karty to dwóch graczy. */
function sessionId(): string {
  const store = storage("session");
  let id = store?.getItem("spinshot:sid");
  if (!id) {
    id = crypto.randomUUID();
    store?.setItem("spinshot:sid", id);
  }
  return id;
}

function rememberRoom(code: string | null) {
  const store = storage("session");
  if (code) store?.setItem("spinshot:room", code);
  else store?.removeItem("spinshot:room");
  const url = new URL(window.location.href);
  if (code) url.searchParams.set("pokoj", code);
  else url.searchParams.delete("pokoj");
  window.history.replaceState(null, "", url);
}

function playFx(fx: Fx, you: string | null) {
  switch (fx.type) {
    case "spin":
      return sfx.spin(SPIN_MS);
    case "segment":
      return sfx.click();
    case "hit":
      return sfx.hit();
    case "miss":
    case "wrongGuess":
      return sfx.miss();
    case "pool":
      return fx.amount > 0 ? sfx.pool() : sfx.miss();
    case "score":
      return fx.amount > 0 ? sfx.pool() : sfx.miss();
    case "reveal":
      return sfx.click();
    case "eliminated":
      return sfx.eliminated();
    case "lifeLost":
      return sfx.miss();
    case "revived":
      return sfx.revive();
    case "reverse":
      return sfx.click();
    case "roundWin":
      sfx.win();
      confetti({ particleCount: fx.playerId === you ? 160 : 90, spread: 80, origin: { y: 0.6 } });
      return;
    case "gameOver":
      confetti({ particleCount: 220, spread: 120, startVelocity: 45, origin: { y: 0.5 } });
      return;
  }
}

export interface GameApi {
  connected: boolean;
  room: RoomState | null;
  you: string | null;
  toast: string | null;
  clearToast(): void;
  create(): void;
  join(code: string): void;
  leave(): void;
  settings(patch: Partial<RoomSettings>): void;
  kick(playerId: string): void;
  start(): void;
  spin(): void;
  letter(letter: string): void;
  guess(text: string): Promise<boolean>;
  choice(choice: { mode: "play" } | { mode: "target"; targetId: string }): void;
  /** null = zamiast wskrzeszać, graj dalej. */
  revive(playerId: string | null): void;
  give(playerId: string): void;
  pool(delta: 2 | -2): void;
  tie(choice: TieChoice): void;
  skip(): void;
  backToLobby(): void;
  chat(text: string): void;
}

export function useGame(profile: ClientProfile): GameApi {
  const auth = useAuthInfo();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const profileRef = useRef(profile);
  profileRef.current = profile;
  const tokenRef = useRef(auth.getToken);
  tokenRef.current = auth.getToken;
  const youRef = useRef<string | null>(null);
  const codeRef = useRef<string | null>(storage("session")?.getItem("spinshot:room") ?? null);

  const socket: GameSocket = useMemo(
    () =>
      io({
        autoConnect: false,
        auth: (cb) => {
          void tokenRef.current().then((token) => cb({ sessionId: sessionId(), token }));
        },
      }),
    [],
  );

  const resetRoom = useCallback(() => {
    codeRef.current = null;
    rememberRoom(null);
    setRoom(null);
    setYou(null);
    youRef.current = null;
  }, []);

  useEffect(() => {
    socket.on("connect", () => {
      setConnected(true);
      const code = codeRef.current;
      if (!code) return;
      socket.emit("room:join", { code, profile: profileRef.current }, (res) => {
        if (!res.ok) {
          resetRoom();
          setToast("Pokój już nie istnieje.");
        }
      });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:state", (state, youId) => {
      syncClock(state.serverTime);
      youRef.current = youId;
      setRoom(state);
      setYou(youId);
    });
    socket.on("room:kicked", () => {
      resetRoom();
      setToast("Wyrzucono Cię z pokoju.");
    });
    socket.on("fx", (fx) => playFx(fx, youRef.current));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket, resetRoom]);

  // Pierwsze połączenie dopiero po wczytaniu logowania; zmiana zalogowania = nowe połączenie z nowym tokenem.
  const authKey = auth.loaded ? (auth.userId ?? "guest") : null;
  useEffect(() => {
    if (authKey === null) return;
    if (socket.connected) socket.disconnect();
    socket.connect();
  }, [authKey, socket]);

  // Zmiany postaci w trakcie pobytu w pokoju (z opóźnieniem, żeby nie spamować przy klikaniu strzałek).
  useEffect(() => {
    if (!codeRef.current || !socket.connected) return;
    const id = setTimeout(() => socket.emit("profile:update", profile), 350);
    return () => clearTimeout(id);
  }, [profile, socket]);

  const enter = useCallback((code: string) => {
    codeRef.current = code;
    rememberRoom(code);
  }, []);

  const report = (res: { ok: boolean; error?: string }) => {
    if (!res.ok && res.error) setToast(res.error);
  };

  return {
    connected,
    room,
    you,
    toast,
    clearToast: () => setToast(null),
    create() {
      socket.emit("room:create", profileRef.current, (res) => (res.ok ? enter(res.code) : setToast(res.error)));
    },
    join(code) {
      socket.emit("room:join", { code, profile: profileRef.current }, (res) => (res.ok ? enter(res.code) : setToast(res.error)));
    },
    leave() {
      socket.emit("room:leave");
      resetRoom();
    },
    settings: (patch) => socket.emit("room:settings", patch),
    kick: (playerId) => socket.emit("room:kick", playerId),
    start: () => socket.emit("game:start", report),
    spin: () => socket.emit("game:spin"),
    letter: (letter) => socket.emit("game:letter", letter, report),
    guess: (text) =>
      new Promise((resolve) => {
        socket.emit("game:guess", text, (res) => {
          report(res);
          resolve(res.ok);
        });
      }),
    choice: (choice) => socket.emit("game:choice", choice),
    revive: (playerId) => socket.emit("game:revive", playerId),
    give: (playerId) => socket.emit("game:give", playerId),
    pool: (delta) => socket.emit("game:pool", delta),
    tie: (choice) => socket.emit("game:tie", choice),
    skip: () => socket.emit("game:skip"),
    backToLobby: () => socket.emit("game:lobby"),
    chat: (text) => socket.emit("chat:send", text),
  };
}
