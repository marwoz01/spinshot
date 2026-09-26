import { createClerkClient, verifyToken } from "@clerk/backend";
import { sanitizeAvatar, type Avatar } from "../shared/avatar.ts";
import { EMPTY_STATS, MAX_NAME, type Ranking, type RankingEntry, type UserStats } from "../shared/types.ts";
import type { GameResult } from "./room.ts";

const secretKey = process.env.CLERK_SECRET_KEY;
export const publishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? null;
export const clerkEnabled = Boolean(secretKey && publishableKey);

const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES?.split(",").map((s) => s.trim()).filter(Boolean);
const clerk = clerkEnabled ? createClerkClient({ secretKey, publishableKey: publishableKey! }) : null;

// Dane gry trzymamy w publicMetadata pod własnym kluczem, żeby nie kolidować z innymi aplikacjami na tym samym Clerku.
const META_KEY = "spinshot";

interface GameMeta {
  avatar?: Avatar;
  nick?: string;
  stats?: Partial<UserStats>;
}

export interface Profile {
  avatar: Avatar | null;
  nick: string | null;
  stats: UserStats;
}

/** Zwraca userId z tokenu sesji Clerka albo null (gość / zły token / Clerk wyłączony). */
export async function verifySession(token: unknown): Promise<string | null> {
  if (!clerkEnabled || typeof token !== "string" || !token) return null;
  try {
    const payload = await verifyToken(token, { secretKey, authorizedParties });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function metaOf(user: { publicMetadata?: Record<string, unknown> | null }): GameMeta {
  return (((user.publicMetadata ?? {}) as Record<string, unknown>)[META_KEY] as GameMeta | undefined) ?? {};
}

async function readMeta(userId: string) {
  const user = await clerk!.users.getUser(userId);
  return { user, meta: metaOf(user) };
}

export async function getProfile(userId: string): Promise<Profile> {
  const { user, meta } = await readMeta(userId);
  return {
    avatar: meta.avatar ? sanitizeAvatar(meta.avatar) : null,
    nick: meta.nick ?? user.username ?? user.firstName ?? null,
    stats: { ...EMPTY_STATS, ...meta.stats },
  };
}

export async function saveProfile(userId: string, input: { avatar?: unknown; nick?: unknown }): Promise<void> {
  const patch: GameMeta = {};
  if (input.avatar !== undefined) patch.avatar = sanitizeAvatar(input.avatar);
  if (typeof input.nick === "string") patch.nick = input.nick.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  await clerk!.users.updateUserMetadata(userId, { publicMetadata: { [META_KEY]: patch } });
  rankingCache = null;
}

export async function recordGame(result: GameResult): Promise<void> {
  const { meta } = await readMeta(result.userId);
  const stats = { ...EMPTY_STATS, ...meta.stats };
  const next: UserStats = {
    gamesPlayed: stats.gamesPlayed + 1,
    wins: stats.wins + (result.won ? 1 : 0),
    roundsWon: stats.roundsWon + result.roundsWon,
    points: stats.points + result.score,
  };
  // Nick z pokoju trafia na konto, jeśli gracz nie ustawił własnego, żeby ranking nie był pełen „Anonimów".
  const nick = meta.nick ?? result.name;
  await clerk!.users.updateUserMetadata(result.userId, { publicMetadata: { [META_KEY]: { stats: next, nick } } });
  rankingCache = null;
}

// ───────────────────────── ranking ─────────────────────────

export const RANKING_SIZE = 10;
const RANKING_TTL_MS = 60_000;
let rankingCache: { at: number; rows: (RankingEntry & { userId: string })[] } | null = null;

/**
 * Zalogowani, którzy rozegrali choć jedną grę: najpierw punkty, potem wygrane i odgadnięte hasła.
 * Clerk nie filtruje po metadata, więc pobieramy listę kont i trzymamy wynik minutę w pamięci.
 */
async function rankedUsers() {
  if (rankingCache && Date.now() - rankingCache.at < RANKING_TTL_MS) return rankingCache.rows;
  const users: Awaited<ReturnType<NonNullable<typeof clerk>["users"]["getUserList"]>>["data"] = [];
  for (let offset = 0; ; ) {
    const { data, totalCount } = await clerk!.users.getUserList({ limit: 500, offset });
    users.push(...data);
    offset += data.length;
    if (data.length === 0 || offset >= totalCount) break;
  }
  const rows = users
    .map((user) => {
      const meta = metaOf(user);
      return {
        userId: user.id,
        // Imienia z konta (np. z Google) nie pokazujemy publicznie; tylko nick z gry albo nazwa użytkownika.
        nick: meta.nick || user.username || "Anonim",
        avatar: meta.avatar ? sanitizeAvatar(meta.avatar) : null,
        stats: { ...EMPTY_STATS, ...meta.stats },
      };
    })
    .filter((row) => row.stats.gamesPlayed > 0)
    .sort((a, b) => b.stats.points - a.stats.points || b.stats.wins - a.stats.wins || b.stats.roundsWon - a.stats.roundsWon)
    .map((row, i) => ({ ...row, place: i + 1 }));
  rankingCache = { at: Date.now(), rows };
  return rows;
}

export async function getRanking(userId: string | null): Promise<Ranking> {
  const rows = await rankedUsers();
  const publicEntry = ({ userId: _id, ...entry }: RankingEntry & { userId: string }): RankingEntry => entry;
  const mine = userId ? rows.find((row) => row.userId === userId) : undefined;
  return { top: rows.slice(0, RANKING_SIZE).map(publicEntry), you: mine ? publicEntry(mine) : null };
}
