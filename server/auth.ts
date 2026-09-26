import { createClerkClient, verifyToken } from "@clerk/backend";
import { sanitizeAvatar, type Avatar } from "../shared/avatar.ts";
import { EMPTY_STATS, MAX_NAME, type UserStats } from "../shared/types.ts";
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

async function readMeta(userId: string) {
  const user = await clerk!.users.getUser(userId);
  const meta = ((user.publicMetadata ?? {}) as Record<string, unknown>)[META_KEY] as GameMeta | undefined;
  return { user, meta: meta ?? {} };
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
  await clerk!.users.updateUserMetadata(result.userId, { publicMetadata: { [META_KEY]: { stats: next } } });
}
