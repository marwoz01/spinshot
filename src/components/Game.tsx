import { Coins, Ghost, LogOut, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useRef } from "react";
import type { RoomState } from "../../shared/types.ts";
import { useSecondsLeft } from "../clock.ts";
import { sfx } from "../sfx.ts";
import type { GameApi } from "../useGame.ts";
import { ActionPanel, SpeedPanel } from "./ActionPanel.tsx";
import { AvatarSvg } from "./AvatarSvg.tsx";
import { Board } from "./Board.tsx";
import { LogPanel } from "./LogPanel.tsx";
import { PlayerList } from "./PlayerList.tsx";
import { Wheel } from "./Wheel.tsx";

function RoundEnd({ room }: { room: RoomState }) {
  const round = room.round!;
  const winner = room.players.find((p) => p.id === round.winnerId);
  const seconds = useSecondsLeft(room.nextRoundAt);
  const last = round.number >= room.settings.rounds;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-label="Koniec rundy">
      <div className="panel anim-pop flex w-full max-w-xl flex-col items-center gap-3 p-6 text-center">
        <div className="chip !bg-sun">Runda {round.number} zakończona</div>
        {winner ? (
          <AvatarSvg avatar={winner.avatar} mood="happy" size={150} className="anim-float" />
        ) : (
          <Ghost className="anim-float size-24 fill-lilac text-ink" aria-hidden="true" />
        )}
        <div className="font-display text-3xl uppercase leading-tight">{winner ? `${winner.name} odgaduje hasło!` : round.mode === "speed" ? "Nikt nie odgadł hasła!" : "Wszyscy odpadli!"}</div>
        <div className="text-sm font-black uppercase tracking-wider text-ink-soft">Hasło ({round.category})</div>
        <div className="font-display text-3xl tracking-wide text-grape">{round.answer}</div>
        {winner ? (
          <div className="chip !bg-sun !px-5 !py-1.5 !text-xl shadow-[0_3px_0_var(--color-ink)]">
            <Coins className="size-5" /> +{round.pool} pkt
          </div>
        ) : (
          <div className="chip !px-5 !py-1.5 !text-base shadow-[0_3px_0_var(--color-ink)]">Pula {round.pool} pkt przepada</div>
        )}
        <div className="text-sm font-black text-ink-soft">{last ? "Za chwilę wyniki" : "Następna runda za"} {seconds ?? ""} s</div>
      </div>
    </div>
  );
}

function GameOver({ room, you, game }: { room: RoomState; you: string; game: GameApi }) {
  const ranking = [...room.players].sort((a, b) => b.score - a.score || b.roundsWon - a.roundsWon);
  const top = ranking[0]?.score ?? 0;
  const podium = [ranking[1], ranking[0], ranking[2]];
  const heights = ["h-24", "h-36", "h-16"];
  const places = [2, 1, 3];
  const isHost = room.hostId === you;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
      <h1 className="logo-text text-center text-[clamp(2.4rem,8vw,4.5rem)] leading-none">Koniec gry!</h1>
      <div className="panel w-full p-6">
        <div className="flex items-end justify-center gap-3 sm:gap-6">
          {podium.map((p, i) =>
            p ? (
              <div key={p.id} className="flex w-28 flex-col items-center sm:w-36">
                <AvatarSvg avatar={p.avatar} mood={p.score === top && top > 0 ? "happy" : "normal"} size={places[i] === 1 ? 150 : 116} className={places[i] === 1 ? "anim-float" : ""} />
                <div className="w-full truncate text-center font-display text-lg">{p.name}</div>
                <div className="text-sm font-black text-ink-soft">{p.score} pkt</div>
                <div
                  className={`mt-1 grid w-full place-items-center rounded-t-2xl border-[3px] border-b-0 border-ink font-display text-4xl text-white ${heights[i]} ${
                    places[i] === 1 ? "bg-sun" : places[i] === 2 ? "bg-sky" : "bg-coral"
                  }`}
                  style={{ WebkitTextStroke: "2px var(--color-ink)" }}
                >
                  {places[i]}
                </div>
              </div>
            ) : (
              <div key={i} className="w-28 sm:w-36" />
            ),
          )}
        </div>
        <div className="h-1 rounded bg-ink" />
        <ol className="mt-5 space-y-1.5">
          {ranking.map((p, i) => (
            <li key={p.id} className={`flex items-center gap-3 rounded-2xl border-[3px] border-ink px-3 py-1.5 ${p.id === you ? "bg-[#fff4c7]" : "bg-lilac"}`}>
              <span className="w-6 font-display text-xl">{i + 1}.</span>
              <AvatarSvg avatar={p.avatar} size={36} />
              <span className="flex-1 truncate font-display text-lg">{p.name}</span>
              <span className="text-sm font-black text-ink-soft">
                {p.roundsWon} {p.roundsWon === 1 ? "hasło" : p.roundsWon >= 2 && p.roundsWon <= 4 ? "hasła" : "haseł"}
              </span>
              <span className="font-display text-xl">{p.score} pkt</span>
            </li>
          ))}
        </ol>
      </div>
      {isHost ? (
        <button type="button" className="btn btn-sun !px-10 !py-4 !text-2xl" onClick={game.backToLobby}>
          <RotateCcw className="size-6" /> Zagraj ponownie
        </button>
      ) : (
        <p className="font-display text-xl text-white drop-shadow-[0_2px_0_rgba(42,22,80,.7)]">Czekamy, aż host zdecyduje, co dalej…</p>
      )}
    </div>
  );
}

export function Game({ room, you, game }: { room: RoomState; you: string; game: GameApi }) {
  const round = room.round;
  const turn = round?.turn;
  const isHost = room.hostId === you;
  const myMove = Boolean(turn && (turn.phase === "forcedGuess" ? turn.targetId === you : turn.playerId === you && turn.phase !== "spinning"));
  const moveKey = turn ? `${round?.number}:${turn.playerId}:${turn.phase}` : null;
  const lastMoveKey = useRef<string | null>(null);

  // Krótki sygnał, gdy przychodzi Twój ruch.
  useEffect(() => {
    if (myMove && moveKey !== lastMoveKey.current && (turn?.phase === "spin" || turn?.phase === "forcedGuess")) sfx.turn();
    lastMoveKey.current = moveKey;
  }, [myMove, moveKey, turn?.phase]);

  if (room.phase === "gameOver") return <GameOver room={room} you={you} game={game} />;
  if (!round) return null;

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_290px] xl:h-full">
      <div className="flex min-w-0 flex-col gap-4 xl:min-h-0">
        <PlayerList room={room} you={you} />
        <div className="panel flex shrink-0 flex-wrap justify-center gap-2 p-3">
          {isHost && (
            <button type="button" className="btn btn-sm" disabled={!turn || turn.phase === "spinning"} onClick={game.skip}>
              <SkipForward className="size-4" /> Pomiń ruch
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-coral"
            onClick={() => {
              if (window.confirm("Na pewno wyjść z gry?")) game.leave();
            }}
          >
            <LogOut className="size-4" /> Wyjdź z gry
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4 xl:min-h-0">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="chip !bg-white !px-4 !py-1 !text-base shadow-[0_3px_0_var(--color-ink)]">
            Runda {round.number}/{room.settings.rounds}
          </div>
          <div className="chip !bg-sun !px-4 !py-1 !text-base shadow-[0_3px_0_var(--color-ink)]" aria-label={`Pula punktów: ${round.pool}`}>
            <Coins className="size-4" /> Pula:
            <span key={round.pool} className="anim-pop inline-block">
              {round.pool}
            </span>
            pkt
          </div>
        </div>

        <section className="panel shrink-0 p-4 sm:p-5" aria-label="Plansza">
          <Board board={round.board} category={round.category} />
        </section>

        {round.mode === "speed" ? (
          <SpeedPanel room={room} you={you} game={game} />
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-stretch">
            {/* Na dużym ekranie koło dopasowuje się do wolnego miejsca (kontener mierzy szerokość i wysokość). */}
            <div className="py-4 xl:grid xl:place-items-center xl:py-3 xl:[container-type:size]">
              <Wheel rotation={round.wheelRotation} canSpin={turn?.playerId === you && turn.phase === "spin"} spinning={turn?.phase === "spinning"} onSpin={game.spin} />
            </div>
            <ActionPanel room={room} you={you} game={game} />
          </div>
        )}
      </div>

      <LogPanel log={room.log} players={room.players} onSend={game.chat} className="h-[28rem] lg:sticky lg:top-4 lg:h-[calc(100dvh-7rem)] xl:static xl:h-full" />

      {room.phase === "roundEnd" && <RoundEnd room={room} />}
    </div>
  );
}
