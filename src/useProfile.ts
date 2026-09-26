import { useCallback, useEffect, useRef, useState } from "react";
import { randomAvatar, sanitizeAvatar } from "../shared/avatar.ts";
import type { ClientProfile, UserStats } from "../shared/types.ts";
import { useAuthInfo } from "./auth.tsx";

const KEY = "spinshot:profile";

function loadLocal(): ClientProfile {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw === "object") {
      return { name: typeof raw.name === "string" ? raw.name : "", avatar: sanitizeAvatar(raw.avatar) };
    }
  } catch {
    // uszkodzony wpis albo brak localStorage — zaczynamy od nowa
  }
  return { name: "", avatar: randomAvatar() };
}

function saveLocal(profile: ClientProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // brak localStorage — postać zostaje tylko w tej sesji
  }
}

export function useProfile() {
  const auth = useAuthInfo();
  const [profile, setProfile] = useState<ClientProfile>(loadLocal);
  const [stats, setStats] = useState<UserStats | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRemote = useCallback(async () => {
    const token = await auth.getToken();
    if (!token) return null;
    const res = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as { avatar: unknown; nick: string | null; stats: UserStats };
  }, [auth]);

  // Po zalogowaniu wczytujemy postać i statystyki zapisane na koncie.
  useEffect(() => {
    if (!auth.signedIn) {
      setStats(null);
      return;
    }
    let cancelled = false;
    void fetchRemote().then((data) => {
      if (!data || cancelled) return;
      setStats(data.stats);
      setProfile((prev) => {
        const next = {
          name: data.nick || prev.name || auth.displayName || "",
          avatar: data.avatar ? sanitizeAvatar(data.avatar) : prev.avatar,
        };
        saveLocal(next);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [auth.signedIn, auth.userId]);

  const updateProfile = useCallback(
    (next: ClientProfile) => {
      setProfile(next);
      saveLocal(next);
      if (!auth.signedIn) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const token = await auth.getToken();
        if (!token) return;
        await fetch("/api/profile", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: next.avatar, nick: next.name }),
        }).catch(() => {});
      }, 800);
    },
    [auth],
  );

  const refreshStats = useCallback(() => {
    if (!auth.signedIn) return;
    void fetchRemote().then((data) => data && setStats(data.stats));
  }, [auth.signedIn, fetchRemote]);

  return { profile, updateProfile, stats, refreshStats };
}
