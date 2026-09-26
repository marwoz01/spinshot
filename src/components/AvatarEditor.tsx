import { ChevronLeft, ChevronRight, Dices } from "lucide-react";
import { useState } from "react";
import { AVATAR_COLORS, AVATAR_OPTIONS, avatarLimit, randomAvatar, type Avatar } from "../../shared/avatar.ts";
import { AvatarSvg } from "./AvatarSvg.tsx";

type Part = keyof typeof AVATAR_OPTIONS;

const PARTS: { key: Part; label: string }[] = [
  { key: "shape", label: "Kształt" },
  { key: "eyes", label: "Oczy" },
  { key: "mouth", label: "Buzia" },
  { key: "hat", label: "Na głowę" },
];

export function AvatarEditor({ avatar, onChange }: { avatar: Avatar; onChange: (avatar: Avatar) => void }) {
  const [bump, setBump] = useState(0);

  const update = (next: Avatar) => {
    setBump((b) => b + 1);
    onChange(next);
  };

  const cycle = (key: Part, delta: number) => {
    const n = avatarLimit(key);
    update({ ...avatar, [key]: (avatar[key] + delta + n) % n });
  };

  return (
    <div className="flex flex-col items-center gap-4 short:gap-3">
      <div className="relative">
        <div className="grid size-44 place-items-center rounded-full border-4 border-ink bg-lilac shadow-[0_6px_0_var(--color-ink)] short:size-32">
          <div key={bump} className="anim-pop short:scale-75">
            <AvatarSvg avatar={avatar} size={150} />
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sun btn-icon absolute -right-2 bottom-1"
          title="Losuj postać"
          aria-label="Losuj postać"
          onClick={() => update(randomAvatar())}
        >
          <Dices className="size-5" />
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Kolor">
        {AVATAR_COLORS.map((color, i) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={avatar.color === i}
            aria-label={`Kolor ${i + 1}`}
            onClick={() => update({ ...avatar, color: i })}
            className={`size-7 rounded-full border-[3px] border-ink transition-transform hover:scale-110 ${
              avatar.color === i ? "scale-110 ring-4 ring-sun" : ""
            }`}
            style={{ background: color }}
          />
        ))}
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-2">
        {PARTS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <button type="button" className="btn btn-sm btn-icon !size-8" aria-label={`${label}: poprzedni`} onClick={() => cycle(key, -1)}>
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex-1 rounded-xl border-[3px] border-ink bg-lilac px-2 py-1 text-center leading-tight">
              <div className="text-[0.65rem] font-black uppercase tracking-wider text-ink-soft">{label}</div>
              <div className="text-sm font-black">{AVATAR_OPTIONS[key][avatar[key]]}</div>
            </div>
            <button type="button" className="btn btn-sm btn-icon !size-8" aria-label={`${label}: następny`} onClick={() => cycle(key, 1)}>
              <ChevronRight className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
