import { Ghost, Minus, Plus, Target, Timer, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { PublicPlayer, RoomState } from "../../shared/types.ts";
import { WHEEL } from "../../shared/wheel.ts";
import { useSecondsLeft } from "../clock.ts";
import type { GameApi } from "../useGame.ts";
import { AvatarSvg } from "./AvatarSvg.tsx";
import { Keyboard } from "./Keyboard.tsx";

interface GuessFormProps {
  onGuess: (text: string) => Promise<boolean>;
  big?: boolean;
  note?: ReactNode;
  disabled?: boolean;
}

function GuessForm({ onGuess, big, note, disabled }: GuessFormProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim() || busy || disabled) return;
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
        <button type="submit" className="btn btn-coral" disabled={!text.trim() || busy || disabled}>
          Zgaduję!
        </button>
      </div>
      {note && <p className="text-center text-xs font-black text-ink-soft">{note}</p>}
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

const OTHERS_DOING: Record<string, string> = {
  spin: "kręci kołem",
  action: "wybiera literę albo zgaduje",
  choice: "decyduje, kogo wskazać",
  revive: "wybiera: wskrzesić ducha czy grać dalej",
  give: "wybiera, komu oddać punkt",
  poolChoice: "decyduje, czy pula rośnie, czy maleje",
};

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
        <Headline sub={turn.playerId === you ? "Pole „Zgadnij lub odpadnij”. Nie ma odwrotu!" : `${current?.name} wskazuje właśnie Ciebie!`}>
          Zgadnij albo odpadasz!
        </Headline>
        <GuessForm big onGuess={game.guess} />
      </>
    );
  } else if (me?.status === "eliminated") {
    body = (
      <Headline sub="Ktoś może Cię wskrzesić polem na kole. Jeśli odpadną wszyscy, pula przepada.">
        <Ghost className="anim-float inline-block size-7 align-[-0.2em]" /> Jesteś duchem w tej rundzie
      </Headline>
    );
  } else if (myTurn && turn.phase === "spin") {
    body = <Headline sub="Kliknij „Kręć!” na środku koła.">Twoja kolej!</Headline>;
  } else if (turn.phase === "spinning") {
    body = <Headline sub={myTurn ? "Trzymaj kciuki!" : `Kręci: ${current?.name}`}>Koło się kręci…</Headline>;
  } else if (myTurn && turn.phase === "action") {
    const hint = turn.risky
      ? "Uwaga: pudło w literze kosztuje Cię 1 pkt."
      : turn.allowVowel
        ? "Możesz wybrać spółgłoskę albo samogłoskę."
        : "Wybierz spółgłoskę albo zgaduj całe hasło.";
    body = (
      <>
        <Headline sub={hint}>Twój ruch!</Headline>
        <GuessForm onGuess={game.guess} note="Złe hasło = tracisz kolejkę." />
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
        <Headline sub="Wskrzeszenie daje Ci 1 pkt, ale kończy Twój ruch.">Wskrzeszasz czy grasz?</Headline>
        <PlayerPick players={ghosts} tone="btn-mint" onPick={game.revive} />
        <button type="button" className="btn btn-sm mx-auto" onClick={() => game.revive(null)}>
          Graj dalej
        </button>
      </>
    );
  } else if (myTurn && turn.phase === "give") {
    const others = room.players.filter((p) => p.id !== you && p.connected);
    body = (
      <>
        <Headline sub="Oddajesz 1 pkt ze swojego konta, potem grasz dalej.">Komu oddajesz punkt?</Headline>
        <PlayerPick players={others} tone="btn-sun" onPick={game.give} />
      </>
    );
  } else if (myTurn && turn.phase === "poolChoice") {
    body = (
      <>
        <Headline sub={`Teraz w puli: ${round.pool} pkt. Pula nie spadnie poniżej 1.`}>Pula w górę czy w dół?</Headline>
        <div className="flex justify-center gap-3">
          <button type="button" className="btn btn-mint" onClick={() => game.pool(2)}>
            <Plus className="size-5" /> 2 pkt
          </button>
          <button type="button" className="btn btn-coral" onClick={() => game.pool(-2)}>
            <Minus className="size-5" /> 2 pkt
          </button>
        </div>
      </>
    );
  } else if (turn.phase === "forcedGuess") {
    body = <Headline sub="Zgadnij lub odpadnij!">{target?.name} musi zgadywać…</Headline>;
  } else {
    body = <Headline sub={`${current?.name ?? "?"} ${OTHERS_DOING[turn.phase] ?? ""}`}>Tura: {current?.name}</Headline>;
  }

  return (
    <section className="panel scroll-thin flex min-h-0 flex-col gap-3 overflow-y-auto p-4 xl:justify-center-safe" aria-label="Twój ruch">
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
        {segment && turn?.phase !== "spinning" ? (
          <span className="chip anim-pop !text-[0.7rem] !normal-case" style={{ background: segment.color, color: segment.textColor }}>
            <Target className="size-3.5" /> {segment.label}
          </span>
        ) : (
          <span />
        )}
        {seconds !== null && turn?.phase !== "spinning" && (
          <span className={`chip !text-sm ${seconds <= 5 ? "!bg-coral text-white anim-wobble" : "!bg-white"}`} aria-label={`Pozostało ${seconds} sekund`}>
            <Timer className="size-4" /> {seconds} s
          </span>
        )}
      </div>
      {seconds !== null && total > 0 && turn?.phase !== "spinning" && (
        <div className="h-2.5 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-lilac" aria-hidden="true">
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

/** Runda błyskawiczna: litery odsłaniają się same, zgadywać może każdy naraz. */
export function SpeedPanel({ room, you, game }: { room: RoomState; you: string; game: GameApi }) {
  const round = room.round!;
  const toStart = useSecondsLeft(round.startsAt);
  const lockLeft = useSecondsLeft(round.locks[you] ?? null) ?? 0;
  const started = !toStart;
  return (
    <section className="panel flex flex-col items-center justify-center gap-4 p-5 text-center" aria-label="Runda błyskawiczna">
      <span className="chip !bg-sun !px-4 !py-1 !text-sm shadow-[0_3px_0_var(--color-ink)]">
        <Zap className="size-4 fill-current" /> Runda błyskawiczna
      </span>
      {started ? (
        <Headline sub={`Litery odsłaniają się same. Kto pierwszy wpisze hasło, zgarnia ${round.pool} pkt.`}>Zgaduj!</Headline>
      ) : (
        <>
          <Headline sub="Litery zaczną się odsłaniać za chwilę.">Przygotuj się!</Headline>
          <div key={toStart} className="anim-pop font-display text-7xl leading-none text-grape">
            {toStart}
          </div>
        </>
      )}
      <div className="w-full max-w-md">
        <GuessForm
          big
          onGuess={game.guess}
          disabled={!started || lockLeft > 0}
          note={lockLeft > 0 ? `Pudło! Kolejna próba za ${lockLeft} s.` : "Pomyłka blokuje zgadywanie na 3 sekundy."}
        />
      </div>
    </section>
  );
}
