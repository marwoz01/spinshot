import { useEffect } from "react";
import { Game } from "./components/Game.tsx";
import { Header } from "./components/Header.tsx";
import { Home } from "./components/Home.tsx";
import { Lobby } from "./components/Lobby.tsx";
import { useGame } from "./useGame.ts";
import { useProfile } from "./useProfile.ts";

function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 3500);
    return () => clearTimeout(id);
  }, [text, onClose]);
  return (
    <div
      role="alert"
      className="fixed left-1/2 top-4 z-50 max-w-[calc(100vw-2rem)] rounded-2xl border-[3px] border-ink bg-coral px-5 py-2.5 font-display text-lg text-white shadow-[0_5px_0_var(--color-ink)] [animation:toast-in_.25s_ease-out_both]"
      onClick={onClose}
    >
      {text}
    </div>
  );
}

export function App() {
  const { profile, updateProfile, stats, refreshStats } = useProfile();
  const game = useGame(profile);
  const { room, you } = game;
  const phase = room?.phase;

  // Statystyki zapisują się na serwerze po grze — odśwież je chwilę później.
  useEffect(() => {
    if (phase !== "gameOver") return;
    const id = setTimeout(refreshStats, 2500);
    return () => clearTimeout(id);
  }, [phase, refreshStats]);

  const inRoom = Boolean(room && you);
  // W trakcie rundy przycisk wyjścia jest w panelu gry, więc nagłówek go nie powtarza.
  const midGame = room?.phase === "playing" || room?.phase === "roundEnd";

  return (
    <div className="flex min-h-dvh flex-col xl:h-dvh">
      <Header compact={inRoom} onLeave={inRoom && !midGame ? game.leave : undefined} showRanking={!midGame} />
      <main className="flex-1 px-4 pb-10 xl:min-h-0 xl:overflow-y-auto xl:pb-4">
        {!room || !you ? (
          <Home profile={profile} onProfile={updateProfile} stats={stats} connected={game.connected} onCreate={game.create} onJoin={game.join} />
        ) : room.phase === "lobby" ? (
          <Lobby room={room} you={you} game={game} profile={profile} onProfile={updateProfile} />
        ) : (
          <Game room={room} you={you} game={game} />
        )}
      </main>
      {inRoom && !game.connected && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border-[3px] border-ink bg-sun px-4 py-1.5 font-display shadow-[0_4px_0_var(--color-ink)]">
          Łączenie ponownie…
        </div>
      )}
      {game.toast && <Toast text={game.toast} onClose={game.clearToast} />}
    </div>
  );
}
