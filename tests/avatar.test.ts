import { describe, expect, it } from "vitest";
import { isUnlocked, lockAvatar, randomAvatar, sanitizeAvatar, UNLOCKS, type Avatar } from "../shared/avatar.ts";
import { EMPTY_STATS } from "../shared/types.ts";
import { Room } from "../server/room.ts";

const HORNS = 12;
const noHooks = { onChange: () => {}, onFx: () => {}, onGameOver: () => {}, onEmpty: () => {} };

describe("postać", () => {
  it("stara postać (5 cech) zachowuje wygląd, a nowe cechy dostają wartości domyślne", () => {
    const old = sanitizeAvatar({ color: 3, shape: 1, eyes: 4, mouth: 2, hat: 6 });
    expect(old).toMatchObject({ color: 3, shape: 1, eyes: 4, mouth: 2, hat: 6, hair: 0, extra: 0, accessory: 0 });
  });

  it("odrzuca wartości spoza zakresu", () => {
    const bad = sanitizeAvatar({ color: 99, hat: -1, hair: 2.5, outfit: "x" });
    expect(bad.color).toBeLessThan(10);
    expect(bad.hat).toBe(0);
    expect(bad.hair).toBe(0);
  });

  it("gość nie może założyć nagrody, konto z wynikami może", () => {
    const withHorns: Avatar = { ...sanitizeAvatar({}), hat: HORNS };
    expect(lockAvatar(withHorns, null).hat).toBe(0);
    expect(lockAvatar(withHorns, { ...EMPTY_STATS, wins: 9 }).hat).toBe(0);
    expect(lockAvatar(withHorns, { ...EMPTY_STATS, wins: 10 }).hat).toBe(HORNS);
  });

  it("losowa postać gościa nie zawiera nagród", () => {
    for (let i = 0; i < 300; i++) {
      const avatar = randomAvatar(null);
      for (const [key, rules] of Object.entries(UNLOCKS)) {
        for (const index of Object.keys(rules)) {
          expect(avatar[key as keyof Avatar]).not.toBe(Number(index));
        }
      }
    }
  });

  it("w pokoju zablokowane elementy są zdejmowane, a po nowych wynikach można je założyć", () => {
    const room = new Room("TEST2", noHooks);
    const avatar: Avatar = { ...sanitizeAvatar({}), hat: HORNS };
    const guest = room.join("session-guest-1", "s1", null, { name: "Gość", avatar });
    expect(guest.avatar.hat).toBe(0);
    const pro = room.join("session-pro-1", "s2", "user_pro", { name: "Pro", avatar }, { ...EMPTY_STATS, wins: 10 });
    expect(pro.avatar.hat).toBe(HORNS);
    const rookie = room.join("session-new-1", "s3", "user_new", { name: "Nowy", avatar }, EMPTY_STATS);
    expect(rookie.avatar.hat).toBe(0);
    room.setUserStats("user_new", { ...EMPTY_STATS, wins: 10 });
    room.updateProfile(rookie.id, { name: "Nowy", avatar });
    expect(room.getPlayer(rookie.id)!.avatar.hat).toBe(HORNS);
    expect(isUnlocked("hat", HORNS, null)).toBe(false);
  });
});
