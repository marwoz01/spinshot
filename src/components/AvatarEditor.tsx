import { Crown, Dices, Lock, PersonStanding, Scissors, Shirt, Smile, Trophy, type LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  AVATAR_COLORS,
  AVATAR_OPTIONS,
  HAIR_COLORS,
  OUTFIT_COLORS,
  isUnlocked,
  randomAvatar,
  unlockRule,
  type Avatar,
  type AvatarPart,
} from "../../shared/avatar.ts";
import type { UserStats } from "../../shared/types.ts";
import { useAuthInfo } from "../auth.tsx";
import { AvatarSvg, type AvatarCrop } from "./AvatarSvg.tsx";

type Section =
  | { kind: "tiles"; key: AvatarPart; label: string; crop: AvatarCrop }
  | { kind: "colors"; key: "color" | "hairColor" | "outfitColor"; label: string; colors: readonly string[] };

const TABS: { id: string; label: string; icon: LucideIcon; sections: Section[] }[] = [
  {
    id: "body",
    label: "Postać",
    icon: PersonStanding,
    sections: [
      { kind: "tiles", key: "shape", label: "Kształt", crop: "head" },
      { kind: "colors", key: "color", label: "Kolor", colors: AVATAR_COLORS },
    ],
  },
  {
    id: "face",
    label: "Twarz",
    icon: Smile,
    sections: [
      { kind: "tiles", key: "eyes", label: "Oczy", crop: "face" },
      { kind: "tiles", key: "mouth", label: "Buzia", crop: "face" },
      { kind: "tiles", key: "extra", label: "Dodatki", crop: "face" },
    ],
  },
  {
    id: "hair",
    label: "Włosy",
    icon: Scissors,
    sections: [
      { kind: "tiles", key: "hair", label: "Fryzura", crop: "head" },
      { kind: "colors", key: "hairColor", label: "Kolor włosów", colors: HAIR_COLORS },
    ],
  },
  { id: "hat", label: "Czapka", icon: Crown, sections: [{ kind: "tiles", key: "hat", label: "Nakrycie głowy", crop: "head" }] },
  {
    id: "outfit",
    label: "Strój",
    icon: Shirt,
    sections: [
      { kind: "tiles", key: "outfit", label: "Strój", crop: "body" },
      { kind: "colors", key: "outfitColor", label: "Kolor stroju", colors: OUTFIT_COLORS },
      { kind: "tiles", key: "accessory", label: "Akcesoria", crop: "body" },
    ],
  },
];

interface AvatarEditorProps {
  avatar: Avatar;
  onChange: (avatar: Avatar) => void;
  /** Statystyki konta (null = gość); odblokowują nagrody. */
  stats: UserStats | null;
}

export function AvatarEditor({ avatar, onChange, stats }: AvatarEditorProps) {
  const auth = useAuthInfo();
  const [tab, setTab] = useState(TABS[0].id);
  const [bump, setBump] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const unlockStats = auth.signedIn ? stats : null;

  const update = (next: Avatar) => {
    setBump((b) => b + 1);
    setHint(null);
    onChange(next);
  };

  const pick = (key: AvatarPart, index: number) => {
    if (isUnlocked(key, index, unlockStats)) return update({ ...avatar, [key]: index });
    const rule = unlockRule(key, index)!;
    const name = AVATAR_OPTIONS[key][index];
    setHint(
      auth.signedIn && stats
        ? `${name}: ${rule.text} (masz ${stats[rule.stat]}).`
        : `${name}: nagroda dla zalogowanych. ${rule.text}.`,
    );
  };

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative">
        <div className="grid h-48 w-40 place-items-center overflow-hidden rounded-3xl border-4 border-ink bg-lilac shadow-[0_6px_0_var(--color-ink)] short:h-36 short:w-32">
          <div key={bump} className="anim-pop">
            <AvatarSvg avatar={avatar} size={172} crop="full" className="short:h-[132px]" />
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sun btn-icon absolute -right-3 bottom-1"
          title="Losuj postać"
          aria-label="Losuj postać"
          onClick={() => update(randomAvatar(unlockStats))}
        >
          <Dices className="size-5" />
        </button>
      </div>

      <div className="grid w-full max-w-md grid-cols-5 gap-1" role="tablist" aria-label="Części postaci">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border-[3px] border-ink py-1 text-[0.65rem] font-black uppercase tracking-wide transition-colors ${
              tab === id ? "bg-grape text-white shadow-[0_3px_0_var(--color-ink)]" : "bg-white hover:bg-lilac"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="scroll-thin h-44 w-full max-w-md overflow-y-auto rounded-2xl border-[3px] border-ink bg-white p-2.5 short:h-32" role="tabpanel">
        <div className="flex flex-col gap-2.5">
          {current.sections.map((section) =>
            section.kind === "colors" ? (
              <div key={section.key}>
                <div className="mb-1 text-[0.65rem] font-black uppercase tracking-wider text-ink-soft">{section.label}</div>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={section.label}>
                  {section.colors.map((color, i) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={avatar[section.key] === i}
                      aria-label={`${section.label} ${i + 1}`}
                      onClick={() => update({ ...avatar, [section.key]: i })}
                      className={`size-7 rounded-full border-[3px] border-ink transition-transform hover:scale-110 ${
                        avatar[section.key] === i ? "scale-110 ring-4 ring-sun" : ""
                      }`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div key={section.key}>
                <div className="mb-1 text-[0.65rem] font-black uppercase tracking-wider text-ink-soft">
                  {section.label}: <span className="text-ink">{AVATAR_OPTIONS[section.key][avatar[section.key]]}</span>
                </div>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={section.label}>
                  {AVATAR_OPTIONS[section.key].map((name, i) => {
                    const locked = !isUnlocked(section.key, i, unlockStats);
                    const rule = unlockRule(section.key, i);
                    const selected = avatar[section.key] === i;
                    return (
                      <button
                        key={name}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={locked ? `${name} (zablokowane)` : name}
                        title={rule ? `${name}: ${rule.text}` : name}
                        onClick={() => pick(section.key, i)}
                        className={`relative grid size-13 place-items-center rounded-xl border-[3px] border-ink transition-transform hover:-translate-y-0.5 ${
                          selected ? "bg-[#fff4c7] ring-4 ring-sun" : "bg-lilac"
                        }`}
                      >
                        <span className={locked ? "opacity-40 grayscale" : ""}>
                          <AvatarSvg avatar={{ ...avatar, [section.key]: i }} size={44} crop={section.crop} />
                        </span>
                        {rule && (
                          <span
                            className={`absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border-2 border-ink ${locked ? "bg-white" : "bg-sun"}`}
                            aria-hidden="true"
                          >
                            {locked ? <Lock className="size-2.5" /> : <Trophy className="size-2.5" />}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
      {hint && (
        <p className="-mt-1 flex max-w-md items-center gap-1.5 text-center text-xs font-black text-grape" role="status">
          <Lock className="size-3.5" /> {hint}
        </p>
      )}
    </div>
  );
}
