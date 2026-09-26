import { Check, Crown, Link, Pencil, Play, X } from "lucide-react";
import { useState } from "react";
import { MAX_NAME, MAX_PLAYERS, MIN_PLAYERS, ROUND_OPTIONS, SPEED_MIN_ROUNDS, TIMER_OPTIONS, type ClientProfile, type RoomState, type UserStats } from "../../shared/types.ts";
import type { GameApi } from "../useGame.ts";
import { AvatarEditor } from "./AvatarEditor.tsx";
import { AvatarSvg } from "./AvatarSvg.tsx";
import { LogPanel } from "./LogPanel.tsx";

function Segmented<T extends number>({
  options,
  value,
  label,
  disabled,
  format,
  onChange,
}: {
  options: readonly T[];
  value: T;
  label: string;
  disabled: boolean;
  format: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-black uppercase tracking-wider text-ink-soft">{label}</div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === value}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`btn btn-sm ${option === value ? "btn-grape" : ""} disabled:!opacity-100 ${disabled && option !== value ? "!opacity-45" : ""}`}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface LobbyProps {
  room: RoomState;
  you: string;
  game: GameApi;
  profile: ClientProfile;
  onProfile: (profile: ClientProfile) => void;
  stats: UserStats | null;
}

export function Lobby({ room, you, game, profile, onProfile, stats }: LobbyProps) {
  const isHost = room.hostId === you;
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const present = room.players.filter((p) => p.connected).length;
  const speedPossible = room.settings.rounds >= SPEED_MIN_ROUNDS;
  const link = `${window.location.origin}/?pokoj=${room.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Skopiuj link:", link);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:h-full">
      {/* Na telefonie kolumny znikają (contents), a kolejność ustalają klasy order-*. */}
      <div className="contents lg:flex lg:flex-col lg:gap-5 xl:min-h-0">
        <section className="panel order-1 p-5" aria-labelledby="players-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="players-title" className="panel-title">
              Gracze <span className="text-ink-soft">{room.players.length}/{MAX_PLAYERS}</span>
            </h2>
            <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Moja postać
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {room.players.map((p) => (
              <li
                key={p.id}
                className={`anim-pop relative flex flex-col items-center rounded-2xl border-[3px] border-ink p-2 pb-3 text-center ${
                  p.id === you ? "bg-[#fff4c7]" : "bg-lilac"
                } ${p.connected ? "" : "opacity-50"}`}
              >
                {p.id === room.hostId && (
                  <span className="absolute -left-2 -top-3 -rotate-12" title="Host" aria-label="Host">
                    <Crown className="size-8 fill-sun text-ink" />
                  </span>
                )}
                {isHost && p.id !== you && (
                  <button
                    type="button"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full border-2 border-ink bg-coral text-xs font-black text-white"
                    aria-label={`Wyrzuć: ${p.name}`}
                    title="Wyrzuć"
                    onClick={() => game.kick(p.id)}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
                <AvatarSvg avatar={p.avatar} size={104} />
                <div className="w-full truncate font-display text-lg leading-tight">{p.name}</div>
                <div className="mt-0.5 flex flex-wrap justify-center gap-1">
                  {p.id === you && <span className="chip !bg-sun !text-[0.6rem]">Ty</span>}
                  {!p.isGuest && <span className="chip !bg-mint !text-[0.6rem]">Konto</span>}
                  {!p.connected && <span className="chip !text-[0.6rem]">Offline</span>}
                </div>
              </li>
            ))}
            {Array.from({ length: Math.max(0, MIN_PLAYERS + 2 - room.players.length) }, (_, i) => (
              <li key={`empty-${i}`} className="grid min-h-36 place-items-center rounded-2xl border-[3px] border-dashed border-ink/30 text-3xl text-ink/25">
                ?
              </li>
            ))}
          </ul>
        </section>
        <LogPanel log={room.log} players={room.players} onSend={game.chat} title="Czat" className="order-4 h-72 xl:h-auto xl:min-h-40 xl:flex-1" />
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-5">
        <section className="panel order-2 p-5" aria-labelledby="invite-title">
          <h2 id="invite-title" className="panel-title mb-2">
            Zaproś znajomych
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-2xl border-[3px] border-ink bg-lilac py-2 text-center font-display text-4xl tracking-[0.3em]">{room.code}</div>
            <button type="button" className="btn btn-mint" onClick={copy}>
              {copied ? (
                <>
                  <Check className="size-5" /> Skopiowano
                </>
              ) : (
                <>
                  <Link className="size-5" /> Link
                </>
              )}
            </button>
          </div>
        </section>

        <section className="panel order-3 flex flex-col gap-4 p-5" aria-labelledby="settings-title">
          <h2 id="settings-title" className="panel-title">
            Ustawienia {!isHost && <span className="text-sm text-ink-soft normal-case">(ustawia host)</span>}
          </h2>
          <Segmented label="Liczba rund" options={ROUND_OPTIONS} value={room.settings.rounds as (typeof ROUND_OPTIONS)[number]} disabled={!isHost} format={String} onChange={(rounds) => game.settings({ rounds })} />
          <Segmented
            label="Czas na ruch"
            options={TIMER_OPTIONS}
            value={room.settings.turnSeconds as (typeof TIMER_OPTIONS)[number]}
            disabled={!isHost}
            format={(s) => (s === 0 ? "Bez limitu" : `${s} s`)}
            onChange={(turnSeconds) => game.settings({ turnSeconds })}
          />
          <Segmented
            label={`Runda błyskawiczna w połowie gry${speedPossible ? "" : ` (od ${SPEED_MIN_ROUNDS} rund)`}`}
            options={[1, 0] as const}
            value={room.settings.speedRound && speedPossible ? 1 : 0}
            disabled={!isHost || !speedPossible}
            format={(v) => (v ? "Tak" : "Nie")}
            onChange={(v) => game.settings({ speedRound: v === 1 })}
          />
          {isHost ? (
            <>
              <button type="button" className="btn btn-sun w-full !py-4 !text-2xl short:!py-3" disabled={present < MIN_PLAYERS} onClick={game.start}>
                <Play className="size-6 fill-current" /> Start
              </button>
              {present < MIN_PLAYERS && <p className="-mt-2 text-center text-sm font-black text-ink-soft">Potrzeba co najmniej {MIN_PLAYERS} graczy.</p>}
            </>
          ) : (
            <p className="anim-wobble rounded-2xl border-[3px] border-dashed border-ink/40 p-3 text-center font-display text-lg text-ink-soft">
              Czekamy, aż host wystartuje…
            </p>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-label="Edytuj postać" onClick={() => setEditing(false)}>
          <div className="panel anim-pop flex w-full max-w-sm flex-col items-center gap-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="panel-title">Twoja postać</h2>
            <AvatarEditor avatar={profile.avatar} stats={stats} onChange={(avatar) => onProfile({ ...profile, avatar })} />
            <input className="field max-w-72 text-center text-lg" value={profile.name} maxLength={MAX_NAME} aria-label="Nick" onChange={(e) => onProfile({ ...profile, name: e.target.value })} />
            <button type="button" className="btn btn-sun" onClick={() => setEditing(false)}>
              Gotowe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
