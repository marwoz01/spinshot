import { CaseSensitive, FerrisWheel, Ghost, Play } from "lucide-react";
import { useState } from "react";
import { MAX_NAME, type ClientProfile, type UserStats } from "../../shared/types.ts";
import { useAuthInfo } from "../auth.tsx";
import { AvatarEditor } from "./AvatarEditor.tsx";

const STEPS = [
  { icon: <FerrisWheel />, title: "Zakręć kołem", text: "Pole na kole decyduje, co możesz zrobić w tej turze." },
  { icon: <CaseSensitive />, title: "Litera albo hasło", text: "Wybierz spółgłoskę albo zgaduj całe hasło. Trafiona litera to kolejny obrót. Samogłoski tylko z koła!" },
  { icon: <Ghost />, title: "Zgadnij lub odpadnij", text: "Złe hasło kosztuje kolejkę. Przy „Zgadnij lub odpadnij” masz 2 życia, bez nich zostajesz duchem." },
];

interface HomeProps {
  profile: ClientProfile;
  onProfile: (profile: ClientProfile) => void;
  stats: UserStats | null;
  connected: boolean;
  onCreate: () => void;
  onJoin: (code: string) => void;
}

export function Home({ profile, onProfile, stats, connected, onCreate, onJoin }: HomeProps) {
  const auth = useAuthInfo();
  const invite = new URLSearchParams(window.location.search).get("pokoj")?.toUpperCase() ?? "";
  const [code, setCode] = useState(invite);
  const nameMissing = !profile.name.trim();

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 xl:h-full xl:justify-center xl:gap-4">
      <div className="anim-float flex flex-col items-center pt-2 text-center xl:shrink-0 xl:pt-0">
        <h1 className="logo-text text-[clamp(2.6rem,9vw,5.2rem)] leading-none xl:text-[clamp(2.4rem,7.5vh,5.2rem)]">Spinshot</h1>
        <p className="mt-4 max-w-md text-lg font-extrabold text-white/90 drop-shadow-[0_2px_0_rgba(42,22,80,.6)] xl:mt-2 xl:max-w-none short:hidden">
          Kręć kołem, odkrywaj litery i nie daj się złapać na podchwytliwe hasło!
        </p>
      </div>

      <div className="panel grid w-full grid-cols-1 gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:min-h-0 xl:grid-rows-[minmax(0,1fr)] xl:gap-8 xl:p-6 short:p-5">
        <section className="flex flex-col items-center gap-4 short:gap-3 xl:min-h-0" aria-labelledby="character-title">
          <div className="flex w-full items-center justify-between">
            <h2 id="character-title" className="panel-title">
              Twoja postać
            </h2>
            <span className={`chip ${auth.signedIn ? "!bg-mint" : ""}`}>{auth.signedIn ? "Konto" : "Gość"}</span>
          </div>
          <AvatarEditor avatar={profile.avatar} stats={stats} onChange={(avatar) => onProfile({ ...profile, avatar })} />
          <label className="w-full max-w-72">
            <span className="mb-1 block text-xs font-black uppercase tracking-wider text-ink-soft">Twój nick</span>
            <input
              className="field text-center text-lg"
              value={profile.name}
              maxLength={MAX_NAME}
              placeholder="Wpisz nick…"
              onChange={(e) => onProfile({ ...profile, name: e.target.value })}
            />
          </label>
          {auth.signedIn && stats && (
            // Jeden niski wiersz zamiast kafelków, żeby strona mieściła się bez przewijania.
            <dl className="flex flex-wrap justify-center gap-1.5" aria-label="Twoje statystyki">
              {[
                ["Gry", stats.gamesPlayed],
                ["Wygrane", stats.wins],
                ["Hasła", stats.roundsWon],
                ["Punkty", stats.points],
              ].map(([label, value]) => (
                <div key={label} className="chip !gap-1 !bg-lilac">
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="font-display text-sm leading-none">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {auth.enabled && !auth.signedIn && (
            <p className="max-w-md text-center text-sm font-bold text-ink-soft">Zaloguj się, żeby zapisać postać, zbierać statystyki i nagrody.</p>
          )}
        </section>

        <section className="flex flex-col gap-5" aria-labelledby="howto-title">
          <h2 id="howto-title" className="panel-title">
            Jak grać?
          </h2>
          <ol className="grid gap-2.5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-2xl border-[3px] border-ink bg-lilac p-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-white [&>svg]:size-6" aria-hidden="true">
                  {step.icon}
                </span>
                <div>
                  <div className="font-display text-base uppercase leading-tight">
                    {i + 1}. {step.title}
                  </div>
                  <p className="text-sm font-semibold leading-snug text-ink-soft">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-auto flex flex-col gap-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) onJoin(code);
              }}
            >
              <input
                className="field flex-1 text-center font-display text-xl uppercase tracking-[0.25em]"
                value={code}
                maxLength={5}
                placeholder="KOD"
                aria-label="Kod pokoju"
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              />
              <button type="submit" className={`btn ${invite ? "btn-sun" : "btn-mint"}`} disabled={!connected || nameMissing || code.length < 5}>
                Dołącz
              </button>
            </form>
            <button type="button" className="btn btn-sun w-full !py-4 !text-2xl" disabled={!connected || nameMissing} onClick={onCreate}>
              <Play className="size-6 fill-current" /> Stwórz pokój
            </button>
            {nameMissing && <p className="text-center text-sm font-black text-coral">Najpierw wpisz nick.</p>}
            {!connected && <p className="text-center text-sm font-black text-ink-soft">Łączenie z serwerem…</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
