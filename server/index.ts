import "./env.ts";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import { Server, type Socket } from "socket.io";
import type { Ack, ClientProfile, ClientToServer, ServerToClient, UserStats } from "../shared/types.ts";
import { clerkEnabled, getProfile, getRanking, publishableKey, recordGame, saveProfile, verifySession } from "./auth.ts";
import { GameError, Room, type RoomHooks } from "./room.ts";

interface SocketData {
  sessionId: string;
  userId: string | null;
  /** Statystyki konta z chwili połączenia (odświeżane po grze); null dla gościa. */
  stats: UserStats | null;
  roomCode: string | null;
  playerId: string | null;
}

type GameSocket = Socket<ClientToServer, ServerToClient, Record<string, never>, SocketData>;

const PORT = Number(process.env.PORT ?? 3001);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>(httpServer, {
  cors: process.env.NODE_ENV === "production" ? undefined : { origin: true, credentials: true },
});

// ───────────────────────── pokoje ─────────────────────────

const rooms = new Map<string, Room>();
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode(): string {
  for (;;) {
    const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    if (!rooms.has(code)) return code;
  }
}

const hooks: RoomHooks = {
  onChange(room) {
    const state = room.toState();
    for (const socketId of io.sockets.adapter.rooms.get(room.code) ?? []) {
      const socket = io.sockets.sockets.get(socketId) as GameSocket | undefined;
      if (socket?.data.playerId) socket.emit("room:state", state, socket.data.playerId);
    }
  },
  onFx(room, fx) {
    io.to(room.code).emit("fx", fx);
  },
  onGameOver(room, results) {
    for (const result of results) {
      recordGame(result)
        .then((stats) => {
          // Nowe wyniki od razu odblokowują nagrody, bez ponownego łączenia.
          room.setUserStats(result.userId, stats);
          for (const socket of io.sockets.sockets.values() as Iterable<GameSocket>) {
            if (socket.data.userId === result.userId) socket.data.stats = stats;
          }
        })
        .catch((err) => console.error("Nie udało się zapisać statystyk:", err));
    }
  },
  onEmpty(room) {
    room.dispose();
    rooms.delete(room.code);
  },
};

// ───────────────────────── HTTP ─────────────────────────

app.use(express.json({ limit: "8kb" }));

app.get("/api/config", (_req, res) => {
  res.json({ clerkPublishableKey: clerkEnabled ? publishableKey : null });
});

async function requireUser(req: Request, res: Response): Promise<string | null> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const userId = await verifySession(token);
  if (!userId) res.status(401).json({ error: "Zaloguj się." });
  return userId;
}

app.get("/api/profile", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  try {
    res.json(await getProfile(userId));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Nie udało się pobrać profilu." });
  }
});

app.put("/api/profile", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  try {
    await saveProfile(userId, { avatar: req.body?.avatar, nick: req.body?.nick });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Nie udało się zapisać profilu." });
  }
});

app.get("/api/ranking", async (req, res) => {
  if (!clerkEnabled) return res.json({ top: [], you: null });
  try {
    // Logowanie jest tu opcjonalne: token służy tylko do pokazania miejsca pytającego gracza.
    const userId = await verifySession(req.headers.authorization?.replace(/^Bearer\s+/i, ""));
    res.json(await getRanking(userId));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Nie udało się pobrać rankingu." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: "1h" }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// ───────────────────────── Socket.IO ─────────────────────────

io.use(async (socket: GameSocket, next) => {
  const { sessionId, token } = (socket.handshake.auth ?? {}) as { sessionId?: unknown; token?: unknown };
  if (typeof sessionId !== "string" || !/^[\w-]{8,64}$/.test(sessionId)) {
    return next(new Error("Brak identyfikatora sesji."));
  }
  const userId = await verifySession(token);
  const stats = userId ? await getProfile(userId).then((p) => p.stats).catch(() => null) : null;
  socket.data = { sessionId, userId, stats, roomCode: null, playerId: null };
  next();
});

function fail(ack: ((res: { ok: false; error: string }) => void) | undefined, err: unknown): void {
  if (err instanceof GameError) {
    ack?.({ ok: false, error: err.message });
    return;
  }
  console.error(err);
  ack?.({ ok: false, error: "Coś poszło nie tak." });
}

/** Uruchamia akcję na pokoju gracza; błędy gry trafiają do `ack`, jeśli jest. */
function withRoom(socket: GameSocket, ack: Ack | undefined, action: (room: Room, playerId: string) => void): void {
  const room = socket.data.roomCode ? rooms.get(socket.data.roomCode) : undefined;
  const playerId = socket.data.playerId;
  if (!room || !playerId) return fail(ack, new GameError("Nie jesteś w pokoju."));
  try {
    action(room, playerId);
    ack?.({ ok: true });
  } catch (err) {
    fail(ack, err);
  }
}

function leaveCurrentRoom(socket: GameSocket): void {
  const { roomCode, playerId } = socket.data;
  if (!roomCode) return;
  socket.leave(roomCode);
  const room = rooms.get(roomCode);
  if (room && playerId) room.leave(playerId);
  socket.data.roomCode = null;
  socket.data.playerId = null;
}

function enterRoom(socket: GameSocket, room: Room, profile: ClientProfile): string {
  if (socket.data.roomCode && socket.data.roomCode !== room.code) leaveCurrentRoom(socket);
  socket.join(room.code);
  socket.data.roomCode = room.code;
  const player = room.join(socket.data.sessionId, socket.id, socket.data.userId, profile, socket.data.stats);
  socket.data.playerId = player.id;
  hooks.onChange(room);
  return player.id;
}

io.on("connection", (socket: GameSocket) => {
  socket.on("room:create", (profile, ack) => {
    try {
      const room = new Room(newCode(), hooks);
      rooms.set(room.code, room);
      enterRoom(socket, room, profile);
      ack({ ok: true, code: room.code });
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("room:join", (data, ack) => {
    const room = rooms.get(String(data?.code ?? "").trim().toUpperCase());
    if (!room) return ack({ ok: false, error: "Nie ma takiego pokoju. Sprawdź kod." });
    try {
      enterRoom(socket, room, data.profile);
      ack({ ok: true, code: room.code });
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("room:leave", () => leaveCurrentRoom(socket));
  socket.on("room:settings", (settings) => withRoom(socket, undefined, (room, id) => room.updateSettings(id, settings ?? {})));
  socket.on("room:kick", (targetId) =>
    withRoom(socket, undefined, (room, id) => {
      const kicked = room.kick(id, targetId);
      const kickedSocket = kicked.socketId ? (io.sockets.sockets.get(kicked.socketId) as GameSocket | undefined) : undefined;
      if (kickedSocket) {
        kickedSocket.leave(room.code);
        kickedSocket.data.roomCode = null;
        kickedSocket.data.playerId = null;
        kickedSocket.emit("room:kicked");
      }
    }),
  );
  socket.on("profile:update", (profile) => withRoom(socket, undefined, (room, id) => room.updateProfile(id, profile)));
  socket.on("game:start", (ack) => withRoom(socket, ack, (room, id) => room.start(id)));
  socket.on("game:spin", () => withRoom(socket, undefined, (room, id) => room.spin(id)));
  socket.on("game:letter", (letter, ack) => withRoom(socket, ack, (room, id) => room.letter(id, letter)));
  socket.on("game:guess", (text, ack) => withRoom(socket, ack, (room, id) => room.guess(id, text)));
  socket.on("game:choice", (choice) => withRoom(socket, undefined, (room, id) => room.choice(id, choice)));
  socket.on("game:revive", (targetId) => withRoom(socket, undefined, (room, id) => room.revive(id, typeof targetId === "string" ? targetId : null)));
  socket.on("game:give", (targetId) => withRoom(socket, undefined, (room, id) => room.give(id, String(targetId))));
  socket.on("game:pool", (delta) => withRoom(socket, undefined, (room, id) => room.poolChoice(id, Number(delta))));
  socket.on("game:skip", () => withRoom(socket, undefined, (room, id) => room.skip(id)));
  socket.on("game:lobby", () => withRoom(socket, undefined, (room, id) => room.backToLobby(id)));
  socket.on("chat:send", (text) => withRoom(socket, undefined, (room, id) => room.chat(id, text)));

  socket.on("disconnect", () => {
    const { roomCode, playerId } = socket.data;
    const room = roomCode ? rooms.get(roomCode) : undefined;
    if (room && playerId) room.disconnect(playerId, socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Spinshot działa na http://localhost:${PORT} (Clerk: ${clerkEnabled ? "włączony" : "wyłączony, tylko goście"})`);
});
