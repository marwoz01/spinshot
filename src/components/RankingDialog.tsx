import { Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Ranking, RankingEntry } from "../../shared/types.ts";
import { useAuthInfo } from "../auth.tsx";
import { AvatarSvg } from "./AvatarSvg.tsx";

const PLACE_COLORS = ["bg-sun", "bg-sky", "bg-coral text-white"];

/** Polska odmiana: 1 gra, 2 gry, 5 gier, 22 gry. */
function games(n: number): string {
  if (n === 1) return "1 gra";
  const tens = n % 100;
  return `${n} ${n % 10 >= 2 && n % 10 <= 4 && (tens < 12 || tens > 14) ? "gry" : "gier"}`;
}

function Row({ entry, mine }: { entry: RankingEntry; mine: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl border-[3px] border-ink px-3 py-1.5 ${mine ? "bg-[#fff4c7]" : "bg-lilac"}`}>
      <span className={`grid size-8 shrink-0 place-items-center rounded-full border-[3px] border-ink font-display ${PLACE_COLORS[entry.place - 1] ?? "bg-white"}`}>
        {entry.place}
      </span>
      {entry.avatar ? <AvatarSvg avatar={entry.avatar} size={36} /> : <span className="size-9 shrink-0" />}
      <span className="min-w-0 flex-1 truncate font-display text-lg">{entry.nick}</span>
      <span className="hidden text-xs font-black text-ink-soft sm:inline">
        {entry.stats.wins} wygr. · {games(entry.stats.gamesPlayed)}
      </span>
      <span className="shrink-0 font-display text-xl">{entry.stats.points} pkt</span>
    </li>
  );
}

export function RankingDialog({ onClose }: { onClose: () => void }) {
  const auth = useAuthInfo();
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = auth.signedIn ? await auth.getToken() : null;
        const res = await fetch("/api/ranking", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Ranking;
        if (!cancelled) setRanking(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const you = ranking?.you ?? null;
  const youOutsideTop = you && !ranking?.top.some((e) => e.place === you.place);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-label="Ranking graczy" onClick={onClose}>
      <div className="panel anim-pop flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="panel-title flex items-center gap-2">
            <Trophy className="size-6 fill-sun" /> Ranking graczy
          </h2>
          <button type="button" className="btn btn-sm btn-icon" aria-label="Zamknij" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        <p className="-mt-2 text-sm font-bold text-ink-soft">Liczą się gry rozegrane na koncie: najpierw punkty, potem wygrane.</p>

        {failed ? (
          <p className="py-6 text-center font-black text-coral">Nie udało się wczytać rankingu. Spróbuj za chwilę.</p>
        ) : !ranking ? (
          <p className="py-6 text-center font-black text-ink-soft">Wczytywanie…</p>
        ) : ranking.top.length === 0 ? (
          <p className="py-6 text-center font-black text-ink-soft">Nikt jeszcze nie rozegrał gry na koncie. Zaloguj się i bądź pierwszy!</p>
        ) : (
          <ol className="scroll-thin -mr-2 flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-2">
            {ranking.top.map((entry) => (
              <Row key={entry.place} entry={entry} mine={entry.place === you?.place} />
            ))}
            {youOutsideTop && (
              <>
                <li className="text-center font-display text-ink-soft" aria-hidden="true">
                  …
                </li>
                <Row entry={you} mine />
              </>
            )}
          </ol>
        )}

        {ranking && auth.enabled && !auth.signedIn && (
          <p className="text-center text-sm font-bold text-ink-soft">Zaloguj się, żeby Twoje gry trafiały do rankingu.</p>
        )}
      </div>
    </div>
  );
}
