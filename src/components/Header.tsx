import { LogOut, Volume2, VolumeX } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useAuthInfo } from "../auth.tsx";
import { isMuted, setMuted } from "../sfx.ts";

const ClerkControls = lazy(() => import("../clerk.tsx").then((m) => ({ default: m.ClerkControls })));

export function Header({ compact, onLeave }: { compact: boolean; onLeave?: () => void }) {
  const auth = useAuthInfo();
  const [muted, setMutedState] = useState(isMuted);
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
      {compact ? (
        <div className="logo-text text-2xl sm:text-3xl" style={{ WebkitTextStrokeWidth: 5 }}>
          Spinshot
        </div>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-icon"
          aria-label={muted ? "Włącz dźwięk" : "Wycisz"}
          title={muted ? "Włącz dźwięk" : "Wycisz"}
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
          }}
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        {onLeave && (
          <button type="button" className="btn btn-sm btn-coral" onClick={onLeave}>
            <LogOut className="size-4" /> Wyjdź
          </button>
        )}
        {auth.enabled && (
          <Suspense fallback={null}>
            <ClerkControls />
          </Suspense>
        )}
      </div>
    </header>
  );
}
