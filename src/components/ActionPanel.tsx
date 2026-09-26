import { useState, type ReactNode } from "react";
import type { PublicPlayer, RoomState } from "../../shared/types.ts";
import { WHEEL } from "../../shared/wheel.ts";
import { useSecondsLeft } from "../clock.ts";
import type { GameApi } from "../useGame.ts";
import { AvatarSvg } from "./AvatarSvg.tsx";
import { Keyboard } from "./Keyboard.tsx";

function GuessForm({ onGuess, big, warning }: { onGuess: (text: string) => Promise<boolean>; big?: boolean; warning: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim() || busy) return;
        setBusy(true);
        const ok = await onGuess(text);
        setBusy(false);
        if (ok) setText("");
      }}
    >
      <div className="flex gap-2">
        <input
          className={`field min-w-0 flex-1 uppercase ${big ? "!py-3 text-xl" : ""}`}
          value={text}
          maxLength={80}
          placeholder="Całe hasło…"
          aria-label="Hasło"
          autoFocus={big}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-coral" disabled={!text.trim() || busy}>
          Zgaduję!
        </button>
      </div>
      <p className="text-center text-xs font-black text-ink-soft">{warning}</p>
    </form>
  );
}

function PlayerPick({ players, onPick, tone }: { players: PublicPlayer[]; onPick: (id: string) => void; tone: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {players.map((p) => (
        <button key={p.id} type="button" className={`btn btn-sm ${tone} !pl-1.5`} onClick={() => onPick(p.id)}>
          <AvatarSvg avatar={p.avatar} size={30} mood={p.status === "eliminated" ? "ghost" : "normal"} />
          <span className="normal-case">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

function Headline({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl uppercase leading-tight">{children}</div>
      {sub && <div className="mt-0.5 text-sm font-bold text-ink-soft">{sub}</div>}
    </div>
  );
}

export function ActionPanel({ room, you, game }: { room: RoomState; you: string; game: GameApi }) {
  const round = room.round!;
  const turn = round.turn;
  const seconds = useSecondsLeft(turn?.deadline ?? null);
  const byId = new Map(room.players.map((p) => [p.id, p]));
  const me = byId.get(you);
  const current = turn ? byId.get(turn.playerId) : undefined;
  const target = turn?.targetId ? byId.get(turn.targetId) : undefined;
  const myTurn = turn?.playerId === you;
  const segment = turn?.segmentIndex != null ? WHEEL[turn.segmentIndex] : null;
  const canType = myTurn && turn?.phase === "action";
  const total = room.settings.turnSeconds;

  let body: ReactNode;
  if (!turn) {
    body = <Headline sub="Gra wróci, gdy ktoś będzie mógł wykonać ruch.">Czekamy na graczy…</Headline>;
  } else if (turn.phase === "forcedGuess" && turn.targetId === you) {
    body = (
      <>
        <Headline sub={turn.playerId === you ? "Pole „Zgadnij lub odpadnij” — nie ma odwrotu!" : `${current?.name} wskazuje właśnie Ciebie!`}>
          Zgadnij albo odpadasz!
        </Headline>
        <GuessForm big onGuess={game.guess} warning="Pomyłka albo koniec czasu = odpadasz z rundy." />
      </>
    );
  } else if (me?.status === "eliminated") {
    body = (
      <Headline sub="Ktoś może Cię wskrzesić polem na kole. Jeśli odpadną wszyscy — wszyscy wracają!">
        <span className="inline-block anim-float">👻</span> Jesteś duchem w tej rundzie
      </Headline>
    );
  } else if (myTurn && turn.phase === "spin") {
    body = (
      <>
        <Headline sub="Kliknij środek koła albo przycisk poniżej.">Twoja kolej!</Headline>
        <button type="button" className="btn btn-sun anim-pulse mx-auto !px-10 !py-3 !text-2xl" onClick={game.spin}>
          🎡 Zakręć kołem
        </button>
      </>
    );
  } else if (turn.phase === "spinning") {
    body = <Headline sub={myTurn ? "Trzymaj kciuki!" : `Kręci: ${current?.name}`}>Koło się kręci…</Headline>;
  } else if (myTurn && turn.phase === "action") {
    body = (
      <>
        <Headline sub={turn.allowVowel ? "Możesz wybrać spółgłoskę albo samogłoskę." : "Wybierz spółgłoskę albo zgaduj całe hasło."}>
          Twój ruch!
        </Headline>
        <GuessForm onGuess={game.guess} warning="Uwaga: złe hasło = odpadasz z rundy." />
      </>
    );
  } else if (myTurn && turn.phase === "choice") {
    const others = room.players.filter((p) => p.id !== you && p.status === "active" && p.connected);
    body = (
      <>
        <Headline sub="Graj dalej albo wskaż osobę, która musi od razu zgadywać.">Twój wybór</Headline>
        <button type="button" className="btn btn-mint mx-auto" onClick={() => game.choice({ mode: "play" })}>
          Graj dalej
        </button>
        <PlayerPick players={others} tone="btn-coral" onPick={(targetId) => game.choice({ mode: "target", targetId })} />
      </>
    );
  } else if (myTurn && turn.phase === "revive") {
    const ghosts = room.players.filter((p) => p.status === "eliminated" && p.connected);
    body = (
      <>
        <Headline sub="Wybierz ducha, który wraca do gry. Potem grasz dalej.">Kogo wskrzeszasz?</Headline>
        <PlayerPick players={ghosts} tone="btn-mint" onPick={game.revive} />
      </>
    );
  } else if (turn.phase === "forcedGuess") {
    body = <Headline sub="Zgadnij lub odpadnij!">{target?.name} musi zgadywać…</Headline>;
  } else {
    const what: Record<string, string> = {
      spin: "kręci kołem",
      action: "wybiera literę albo zgaduje",
      choice: "decyduje, kogo wskazać",
      revive: "wybiera, kogo wskrzesić",
    };
    body = <Headline sub={`${current?.name ?? "?"} ${what[turn.phase] ?? ""}`}>Tura: {current?.name}</Headline>;
  }

  return (
    <section className="panel flex flex-col gap-3 p-4" aria-label="Twój ruch">
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
        {segment && turn?.phase !== "spinning" ? (
          <span className="chip anim-pop !text-[0.7rem] !normal-case" style={{ background: segment.color, color: segment.textColor }}>
            🎯 {segment.label}
          </span>
        ) : (
          <span />
        )}
        {seconds !== null && turn?.phase !== "spinning" && (
          <span className={`chip !text-sm ${seconds <= 5 ? "!bg-coral text-white anim-wobble" : "!bg-white"}`} aria-label={`Pozostało ${seconds} sekund`}>
            ⏱ {seconds} s
          </span>
        )}
      </div>
      {seconds !== null && total > 0 && turn?.phase !== "spinning" && (
        <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-lilac" aria-hidden="true">
          <div
            className={`h-full transition-[width] duration-300 ${seconds <= 5 ? "bg-coral" : "bg-mint"}`}
            style={{ width: `${Math.min(100, (seconds / total) * 100)}%` }}
          />
        </div>
      )}
      {body}
      <Keyboard used={round.usedLetters} enabled={canType} allowVowel={Boolean(canType && turn?.allowVowel)} onPick={game.letter} />
    </section>
  );
}
