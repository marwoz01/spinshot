import type { RoomState } from "../../shared/types.ts";
import { AvatarSvg } from "./AvatarSvg.tsx";

export function PlayerList({ room, you }: { room: RoomState; you: string }) {
  const round = room.round;
  const turn = round?.turn;
  const activeId = turn ? (turn.phase === "forcedGuess" && turn.targetId ? turn.targetId : turn.playerId) : null;

  return (
    <section className="panel p-3" aria-labelledby="gp-title">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="gp-title" className="panel-title !text-base">
          Gracze
        </h2>
        {round && (
          <span className="chip" title="Kierunek kolejki">
            Kolejka {round.direction === 1 ? "⬇" : "⬆"}
          </span>
        )}
      </div>
      <ol className="scroll-thin flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {room.players.map((p) => {
          const isActive = p.id === activeId;
          const ghost = p.status === "eliminated";
          const winner = round?.winnerId === p.id;
          return (
            <li
              key={p.id}
              className={`relative flex min-w-40 items-center gap-2 rounded-2xl border-[3px] border-ink px-2 py-1.5 transition-colors lg:min-w-0 ${
                isActive ? "anim-pulse bg-sun" : p.id === you ? "bg-[#fff4c7]" : "bg-lilac"
              } ${p.connected ? "" : "opacity-45"}`}
            >
              <AvatarSvg avatar={p.avatar} size={44} mood={ghost ? "ghost" : winner ? "happy" : "normal"} className="shrink-0" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-1 truncate font-display text-[1.02rem]">
                  {p.id === room.hostId && <span aria-label="Host">👑</span>}
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="text-xs font-black text-ink-soft">
                  {ghost ? "👻 duch" : !p.connected ? "📴 offline" : p.id === you ? "to Ty" : isActive ? "ma ruch" : " "}
                </div>
              </div>
              <div className="shrink-0 rounded-xl border-[3px] border-ink bg-white px-2 text-center font-display text-lg leading-tight">
                {p.score}
                <div className="-mt-1 text-[0.55rem] font-black uppercase text-ink-soft">pkt</div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
