import type { ReactNode } from "react";
import { AVATAR_COLORS, HAIR_COLORS, OUTFIT_COLORS, type Avatar } from "../../shared/avatar.ts";

export type Mood = "normal" | "happy" | "ghost";
/** full: cała postać, head: sama głowa (małe rozmiary), face: przybliżona twarz, body: sam strój (kafelki w edytorze). */
export type AvatarCrop = "full" | "head" | "face" | "body";

const INK = "#2a1650";
const SW = 4;
const PANTS = "#33264d";

/** Górna krawędź „głowy" dla każdego kształtu: tam siadają czapki, fryzury i czułek. */
const HEAD_TOP = [22, 16, 24, 28];

const VIEWBOX: Record<AvatarCrop, string> = {
  full: "0 -16 100 164",
  head: "0 -16 100 110",
  face: "14 30 72 56",
  body: "4 66 92 84",
};

/** Nakrycia głowy, przy których czułek zostaje widoczny. */
const ANTENNA_HATS = new Set([0, 4, 5, 12]);

function darker(hex: string, amount = 0.18): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`;
}

// ───────────────────────── głowa ─────────────────────────

function Head({ shape, fill }: { shape: number; fill: string }) {
  if (shape === 1) {
    return <path d="M50 16c20 0 32 16 32 38 0 22-14 36-32 36S18 76 18 54c0-22 12-38 32-38z" fill={fill} stroke={INK} strokeWidth={SW} />;
  }
  if (shape === 2) {
    return <rect x="16" y="24" width="68" height="64" rx="18" fill={fill} stroke={INK} strokeWidth={SW} />;
  }
  if (shape === 3) {
    return <ellipse cx="50" cy="58" rx="40" ry="30" fill={fill} stroke={INK} strokeWidth={SW} />;
  }
  return <circle cx="50" cy="56" r="34" fill={fill} stroke={INK} strokeWidth={SW} />;
}

function Ears({ fill }: { fill: string }) {
  return (
    <g fill={fill} stroke={INK} strokeWidth={3.5}>
      <circle cx="11" cy="52" r="7" />
      <circle cx="89" cy="52" r="7" />
    </g>
  );
}

function Antenna({ top, fill }: { top: number; fill: string }) {
  return (
    <g stroke={INK} strokeLinecap="round">
      <path d={`M50 ${top + 6}Q52 ${top - 10} 62 ${top - 16}`} fill="none" strokeWidth={4} />
      <circle cx="64" cy={top - 18} r="5.5" fill={fill} strokeWidth={3.5} />
    </g>
  );
}

function Eyes({ type, mood }: { type: number; mood: Mood }) {
  const L = 38;
  const R = 62;
  const Y = 50;
  if (mood === "ghost") {
    return (
      <g stroke={INK} strokeWidth={SW} strokeLinecap="round">
        <path d={`M${L - 5} ${Y - 5}l10 10M${L + 5} ${Y - 5}l-10 10`} />
        <path d={`M${R - 5} ${Y - 5}l10 10M${R + 5} ${Y - 5}l-10 10`} />
      </g>
    );
  }
  if (mood === "happy") {
    return (
      <g fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round">
        <path d={`M${L - 7} ${Y + 3}q7 -10 14 0`} />
        <path d={`M${R - 7} ${Y + 3}q7 -10 14 0`} />
      </g>
    );
  }
  switch (type) {
    case 1:
      return (
        <g stroke={INK} strokeWidth={3}>
          <circle cx={L} cy={Y} r="10" fill="#fff" />
          <circle cx={R} cy={Y} r="10" fill="#fff" />
          <circle cx={L + 2} cy={Y + 1} r="5" fill={INK} stroke="none" />
          <circle cx={R + 2} cy={Y + 1} r="5" fill={INK} stroke="none" />
          <circle cx={L + 4} cy={Y - 1} r="1.6" fill="#fff" stroke="none" />
          <circle cx={R + 4} cy={Y - 1} r="1.6" fill="#fff" stroke="none" />
        </g>
      );
    case 2:
      return (
        <g fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round">
          <path d={`M${L - 7} ${Y}q7 6 14 0`} />
          <path d={`M${R - 7} ${Y}q7 6 14 0`} />
          <path d={`M${L - 8} ${Y - 5}h16M${R - 8} ${Y - 5}h16`} strokeWidth={2.5} />
        </g>
      );
    case 3: {
      const star = (cx: number) => `M${cx} ${Y - 8}l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6-5-2.9-5 2.9 1.2-5.6-4.2-3.8 5.6-.6z`;
      return (
        <g fill="#ffd23f" stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
          <path d={star(L)} />
          <path d={star(R)} />
        </g>
      );
    }
    case 4:
      return (
        <g stroke={INK} strokeWidth={3.5}>
          <circle cx={L} cy={Y} r="10" fill="rgb(255 255 255 / .55)" />
          <circle cx={R} cy={Y} r="10" fill="rgb(255 255 255 / .55)" />
          <path d={`M${L + 10} ${Y}h4`} />
          <path d={`M${L - 10} ${Y - 2}l-8 -3M${R + 10} ${Y - 2}l8 -3`} />
          <circle cx={L} cy={Y + 1} r="3.5" fill={INK} stroke="none" />
          <circle cx={R} cy={Y + 1} r="3.5" fill={INK} stroke="none" />
        </g>
      );
    case 5:
      return (
        <g stroke={INK} strokeWidth={3}>
          <circle cx={L} cy={Y} r="8.5" fill="#fff" />
          <circle cx={R} cy={Y} r="8.5" fill="#fff" />
          <circle cx={L + 4} cy={Y + 2} r="4" fill={INK} stroke="none" />
          <circle cx={R - 4} cy={Y - 1} r="4" fill={INK} stroke="none" />
        </g>
      );
    case 6: // kosmiczne: duże pomarańczowe oczy jak u maskotki Reddita
      return (
        <g stroke={INK} strokeWidth={2.5}>
          <ellipse cx={L} cy={Y + 1} rx="6.5" ry="7.5" fill="#ff4500" />
          <ellipse cx={R} cy={Y + 1} rx="6.5" ry="7.5" fill="#ff4500" />
          <circle cx={L + 2} cy={Y - 2} r="2" fill="#fff" stroke="none" />
          <circle cx={R + 2} cy={Y - 2} r="2" fill="#fff" stroke="none" />
        </g>
      );
    case 7: {
      const heart = (cx: number) => `M${cx} ${Y + 7}c-9-6-11-11-8-14 2.5-2.5 6-1.5 8 1.5 2-3 5.5-4 8-1.5 3 3 1 8-8 14z`;
      return (
        <g fill="#ff5d73" stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
          <path d={heart(L)} />
          <path d={heart(R)} />
        </g>
      );
    }
    default:
      return (
        <g fill={INK}>
          <circle cx={L} cy={Y} r="5" />
          <circle cx={R} cy={Y} r="5" />
          <circle cx={L + 1.5} cy={Y - 1.5} r="1.5" fill="#fff" />
          <circle cx={R + 1.5} cy={Y - 1.5} r="1.5" fill="#fff" />
        </g>
      );
  }
}

function Mouth({ type, mood }: { type: number; mood: Mood }) {
  const common = { fill: "none", stroke: INK, strokeWidth: SW, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (mood === "ghost") return <path d="M38 72q4-4 8 0t8 0 8 0" {...common} />;
  if (mood === "happy" || type === 1) {
    return (
      <g>
        <path d="M35 64q15 22 30 0z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M43 72q7 5 14 0q-7-4-14 0z" fill="#ff7a93" />
      </g>
    );
  }
  switch (type) {
    case 2:
      return <ellipse cx="50" cy="71" rx="6" ry="7.5" fill={INK} />;
    case 3:
      return (
        <g>
          <path d="M53 68q1 12 6 12t5-11" fill="#ff7a93" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <path d="M38 66q12 10 26 0" {...common} />
        </g>
      );
    case 4:
      return (
        <g>
          <path d="M50 66c-6-6-16-4-19 3 6-2 12 0 19-1 7 1 13-1 19 1-3-7-13-9-19-3z" fill="#5a3a1a" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M45 75h10" {...common} strokeWidth={3} />
        </g>
      );
    case 5:
      return <path d="M38 72q6-5 12 0t12-4" {...common} />;
    case 6: // szeroki uśmiech z zębami
      return (
        <g stroke={INK} strokeLinejoin="round">
          <path d="M34 64q16 18 32 0z" fill="#fff" strokeWidth={3} />
          <path d="M34 64h32M45 64v6M55 64v6" fill="none" strokeWidth={2} />
        </g>
      );
    case 7: // kotek :3
      return <path d="M40 66q5 7 10 0q5 7 10 0" {...common} strokeWidth={3.5} />;
    default:
      return <path d="M39 67q11 11 22 0" {...common} />;
  }
}

function Extra({ type, top }: { type: number; top: number }) {
  switch (type) {
    case 1:
      return (
        <g fill="#ff4f86" opacity="0.55">
          <ellipse cx="27" cy="64" rx="7.5" ry="4.5" />
          <ellipse cx="73" cy="64" rx="7.5" ry="4.5" />
        </g>
      );
    case 2:
      return (
        <g fill="#a0522d" opacity="0.75">
          {[
            [29, 61],
            [34, 64],
            [27, 66],
            [71, 61],
            [66, 64],
            [73, 66],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" />
          ))}
        </g>
      );
    case 3:
      return (
        <g transform="rotate(-28 72 64)" stroke={INK} strokeWidth={2}>
          <rect x="62" y="60" width="20" height="8" rx="3" fill="#f5d6a8" />
          <rect x="68" y="60" width="8" height="8" fill="#e8b97c" strokeWidth={1.5} />
        </g>
      );
    case 4:
      return <path d="M73 57l2 4.4 4.8.5-3.6 3.2 1 4.8-4.2-2.5-4.2 2.5 1-4.8-3.6-3.2 4.8-.5z" fill="#ffd23f" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />;
    case 5:
      return <path d={`M66 ${top + 8}l-5 7h5l-4 8`} fill="none" stroke="#c23a3a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />;
    default:
      return null;
  }
}

// ───────────────────────── włosy i nakrycia głowy ─────────────────────────

/** Część fryzury schowana za głową (kucyki, afro, kok). */
function HairBack({ type, top: t, color }: { type: number; top: number; color: string }) {
  const style = { fill: color, stroke: INK, strokeWidth: 3.5 };
  switch (type) {
    case 3:
      return (
        <g {...style}>
          <ellipse cx="12" cy={t + 34} rx="9" ry="13" transform={`rotate(20 12 ${t + 34})`} />
          <ellipse cx="88" cy={t + 34} rx="9" ry="13" transform={`rotate(-20 88 ${t + 34})`} />
        </g>
      );
    case 4:
      return (
        <g {...style}>
          <circle cx="24" cy={t + 32} r="18" />
          <circle cx="76" cy={t + 32} r="18" />
          <circle cx="50" cy={t + 14} r="30" />
        </g>
      );
    case 6:
      return <circle cx="50" cy={t - 6} r="12" {...style} />;
    default:
      return null;
  }
}

function HairFront({ type, top: t, color }: { type: number; top: number; color: string }) {
  const style = { fill: color, stroke: INK, strokeWidth: 3.5, strokeLinejoin: "round" as const };
  switch (type) {
    case 1:
      return <path d={`M17 ${t + 30}C15 ${t - 6} 85 ${t - 6} 83 ${t + 30}C76 ${t + 16} 66 ${t + 22} 58 ${t + 12}C52 ${t + 22} 40 ${t + 20} 34 ${t + 12}C28 ${t + 20} 22 ${t + 20} 17 ${t + 30}z`} {...style} />;
    case 2:
      return <path d={`M39 ${t + 9}L43 ${t - 14}L49 ${t + 1}L53 ${t - 20}L57 ${t + 1}L63 ${t - 12}L62 ${t + 10}Q50 ${t + 4} 39 ${t + 9}z`} {...style} />;
    case 3:
    case 6:
      return <path d={`M18 ${t + 24}C16 ${t - 4} 84 ${t - 4} 82 ${t + 24}C74 ${t + 10} 58 ${t + 6} 50 ${t + 14}C42 ${t + 6} 26 ${t + 10} 18 ${t + 24}z`} {...style} />;
    case 4:
      return <path d={`M20 ${t + 20}Q50 ${t - 4} 80 ${t + 20}Q70 ${t + 10} 60 ${t + 14}Q50 ${t + 6} 40 ${t + 14}Q30 ${t + 10} 20 ${t + 20}z`} {...style} />;
    case 5:
      return <path d={`M17 ${t + 28}L19 ${t + 2}L28 ${t + 8}L31 ${t - 8}L41 ${t + 4}L50 ${t - 11}L57 ${t + 4}L67 ${t - 7}L70 ${t + 8}L81 ${t + 2}L83 ${t + 28}C70 ${t + 14} 30 ${t + 14} 17 ${t + 28}z`} {...style} />;
    default:
      return null;
  }
}

function Hat({ type, top }: { type: number; top: number }) {
  const t = top;
  switch (type) {
    case 1: // czapka z daszkiem
      return (
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <path d={`M26 ${t + 12}c0-16 48-16 48 0z`} fill="#ff5d73" />
          <path d={`M60 ${t + 11}h26c2 0 2 5-1 6H62z`} fill="#ff5d73" />
          <circle cx="50" cy={t - 1} r="3" fill="#fff" />
        </g>
      );
    case 2: // korona
      return <path d={`M30 ${t + 6}l-2-22 11 11 11-15 11 15 11-11-2 22z`} fill="#ffd23f" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />;
    case 3: // czarodziej
      return (
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <path d={`M30 ${t + 6}L54 ${t - 34}l16 40z`} fill="#4d6bff" />
          <path d={`M22 ${t + 6}h56`} strokeLinecap="round" strokeWidth={5} />
          <path d={`M50 ${t - 10}l1.5 3.5 3.8.4-2.8 2.6.8 3.8-3.3-2-3.3 2 .8-3.8-2.8-2.6 3.8-.4z`} fill="#ffd23f" strokeWidth={1.5} />
        </g>
      );
    case 4: // kokarda
      return (
        <g stroke={INK} strokeWidth={3} strokeLinejoin="round" transform={`translate(64 ${t + 2}) rotate(18)`}>
          <path d="M0 0l-15-9v18z" fill="#ff7ab8" />
          <path d="M0 0l15-9v18z" fill="#ff7ab8" />
          <circle r="4.5" fill="#ff4d9a" />
        </g>
      );
    case 5: // słuchawki
      return (
        <g stroke={INK} strokeWidth={3.5}>
          <path d={`M17 ${t + 34}c0-40 66-40 66 0`} fill="none" strokeWidth={6} />
          <path d={`M17 ${t + 34}c0-40 66-40 66 0`} fill="none" stroke="#41b6ff" strokeWidth={2} />
          <rect x="9" y={t + 26} width="14" height="22" rx="6" fill="#41b6ff" />
          <rect x="77" y={t + 26} width="14" height="22" rx="6" fill="#41b6ff" />
        </g>
      );
    case 6: // cylinder
      return (
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <rect x="34" y={t - 26} width="32" height="30" rx="3" fill="#33264d" />
          <rect x="34" y={t - 6} width="32" height="6" fill="#ff5d73" />
          <path d={`M24 ${t + 5}h52`} strokeLinecap="round" strokeWidth={6} />
        </g>
      );
    case 7: // imprezowa
      return (
        <g stroke={INK} strokeWidth={3} strokeLinejoin="round" transform={`rotate(-14 50 ${t})`}>
          <path d={`M36 ${t + 6}L50 ${t - 30}l14 36z`} fill="#35d0a0" />
          <path d={`M41 ${t - 6}l15 5M45 ${t - 18}l9 3`} stroke="#ffd23f" strokeWidth={4} />
          <circle cx="50" cy={t - 32} r="5.5" fill="#ff5d73" />
        </g>
      );
    case 8: // beret
      return (
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <ellipse cx="46" cy={t + 3} rx="31" ry="11" fill="#e8545e" transform={`rotate(-8 46 ${t + 3})`} />
          <path d={`M46 ${t - 8}l2-6`} strokeLinecap="round" />
        </g>
      );
    case 9: // kapelusz kowbojski
      return (
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <path d={`M31 ${t + 8}c0-22 6-28 19-24 13-4 19 2 19 24z`} fill="#b9773b" />
          <path d={`M33 ${t + 1}h34`} stroke="#6b3f1d" strokeWidth={4} />
          <path d={`M8 ${t + 4}q42 16 84 0q-6 12-42 12T8 ${t + 4}z`} fill="#c98a4b" />
        </g>
      );
    case 10: // hełm wikinga
      return (
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <path d={`M27 ${t + 2}q-15-4-17-24q9 10 21 13z`} fill="#fff4d6" />
          <path d={`M73 ${t + 2}q15-4 17-24q-9 10-21 13z`} fill="#fff4d6" />
          <path d={`M20 ${t + 16}c0-34 60-34 60 0z`} fill="#aab3c5" />
          <path d={`M20 ${t + 16}h60`} strokeWidth={6} strokeLinecap="round" />
          <path d={`M50 ${t - 9}v24`} strokeWidth={3} />
        </g>
      );
    case 11: // aureola
      return (
        <g fill="none">
          <ellipse cx="50" cy={t - 13} rx="22" ry="6.5" stroke={INK} strokeWidth={8} />
          <ellipse cx="50" cy={t - 13} rx="22" ry="6.5" stroke="#ffd23f" strokeWidth={4} />
        </g>
      );
    case 12: // rogi diabełka
      return (
        <g fill="#e03a4e" stroke={INK} strokeWidth={3} strokeLinejoin="round">
          <path d={`M31 ${t + 10}q-5-16 5-24q-1 11 7 18z`} />
          <path d={`M69 ${t + 10}q5-16-5-24q1 11-7 18z`} />
        </g>
      );
    case 13: // czapka zimowa z pomponem
      return (
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <path d={`M21 ${t + 16}c0-38 58-38 58 0z`} fill="#41b6ff" />
          <rect x="18" y={t + 10} width="64" height="10" rx="5" fill="#fff" />
          <circle cx="50" cy={t - 12} r="7" fill="#fff" />
        </g>
      );
    default:
      return null;
  }
}

// ───────────────────────── ciało i strój ─────────────────────────

const TORSO = "M32 84h36a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V92a8 8 0 0 1 8-8z";

interface OutfitLook {
  torso: string;
  /** Kolor rękawów; krótkie rękawy zasłaniają tylko ramię. */
  sleeve: string;
  shortSleeve: boolean;
  pants: string;
  socks?: string;
  /** Za postacią (peleryna). */
  back?: ReactNode;
  /** Na szyi, pod głową (kaptur). */
  collar?: ReactNode;
  details?: ReactNode;
}

function outfitLook(type: number, color: string): OutfitLook {
  const dark = darker(color);
  switch (type) {
    case 1: // bluza z kapturem
      return {
        torso: color,
        sleeve: color,
        shortSleeve: false,
        pants: PANTS,
        collar: <ellipse cx="50" cy="89" rx="27" ry="8" fill={dark} stroke={INK} strokeWidth={3.5} />,
        details: (
          <g stroke={INK} strokeWidth={2.5} strokeLinecap="round">
            <path d="M37 112h26v9a3 3 0 0 1-3 3H40a3 3 0 0 1-3-3z" fill={dark} strokeLinejoin="round" />
            <path d="M45 92l-1 11M55 92l1 11" stroke="#fff" strokeWidth={2.5} />
          </g>
        ),
      };
    case 2: // sweter w paski
      return {
        torso: color,
        sleeve: color,
        shortSleeve: false,
        pants: PANTS,
        details: (
          <g fill="#fff" opacity="0.85">
            <rect x="24" y="97" width="52" height="6" />
            <rect x="24" y="109" width="52" height="6" />
          </g>
        ),
      };
    case 3: // ogrodniczki
      return {
        torso: "#f4f1fa",
        sleeve: "#f4f1fa",
        shortSleeve: true,
        pants: color,
        details: (
          <g stroke={INK} strokeLinecap="round">
            <path d="M36 103L33 86M64 103l3-17" strokeWidth={8} />
            <path d="M36 103L33 86M64 103l3-17" stroke={color} strokeWidth={4.5} />
            <path d="M34 102h32v26H34z" fill={color} strokeWidth={2.5} strokeLinejoin="round" />
            <path d="M43 110h14v7H43z" fill={dark} strokeWidth={2} strokeLinejoin="round" />
            <circle cx="37" cy="104" r="2" fill={INK} stroke="none" />
            <circle cx="63" cy="104" r="2" fill={INK} stroke="none" />
          </g>
        ),
      };
    case 4: // garnitur
      return {
        torso: color,
        sleeve: color,
        shortSleeve: false,
        pants: dark,
        details: (
          <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
            <path d="M40 84l10 22 10-22z" fill="#fff" />
            <path d="M47 89h6l-1 4 2 11-4 4-4-4 2-11z" fill="#ff5d73" strokeWidth={2} />
            <path d="M40 84l6 22M60 84l-6 22" fill="none" />
            <circle cx="50" cy="114" r="1.8" fill={INK} stroke="none" />
            <circle cx="50" cy="121" r="1.8" fill={INK} stroke="none" />
          </g>
        ),
      };
    case 5: // strój sportowy
      return {
        torso: color,
        sleeve: color,
        shortSleeve: true,
        pants: color,
        socks: "#fff",
        details: (
          <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
            <path d="M41 85l9 8 9-8" strokeWidth={3} />
            <path d="M47 102l4-3v18" strokeWidth={4} />
          </g>
        ),
      };
    case 6: // kombinezon kosmiczny
      return {
        torso: "#eef0f7",
        sleeve: "#eef0f7",
        shortSleeve: false,
        pants: "#eef0f7",
        details: (
          <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
            <rect x="24" y="112" width="52" height="6" fill={color} />
            <rect x="39" y="94" width="22" height="13" rx="3" fill={color} />
            <circle cx="44" cy="100.5" r="2" fill="#ffd23f" strokeWidth={1.5} />
            <circle cx="50" cy="100.5" r="2" fill="#35d0a0" strokeWidth={1.5} />
            <circle cx="56" cy="100.5" r="2" fill="#ff5d73" strokeWidth={1.5} />
          </g>
        ),
      };
    case 7: // peleryna bohatera
      return {
        torso: color,
        sleeve: color,
        shortSleeve: false,
        pants: dark,
        back: <path d="M28 88L12 142q38 10 76 0L72 88z" fill={dark} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />,
        details: (
          <g stroke={INK} strokeLinejoin="round">
            <circle cx="50" cy="104" r="9" fill="#ffd23f" strokeWidth={2.5} />
            <path d="M50 97.5l1.9 4 4.4.5-3.3 3 .9 4.3-3.9-2.2-3.9 2.2.9-4.3-3.3-3 4.4-.5z" fill="#ff5d73" strokeWidth={1.4} />
          </g>
        ),
      };
    default: // koszulka
      return {
        torso: color,
        sleeve: color,
        shortSleeve: true,
        pants: PANTS,
        details: <path d="M42 86q8 6 16 0" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />,
      };
  }
}

function Arm({ side, up, skin, look }: { side: -1 | 1; up: boolean; skin: string; look: OutfitLook }) {
  const x0 = 50 + side * 23;
  const y0 = 95;
  const x1 = 50 + side * (up ? 37 : 34);
  const y1 = up ? 70 : 117;
  const mid = (k: number) => [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
  const [sx, sy] = look.shortSleeve ? mid(0.45) : [x1, y1];
  return (
    <g strokeLinecap="round">
      <path d={`M${x0} ${y0}L${x1} ${y1}`} stroke={INK} strokeWidth={13} />
      <path d={`M${x0} ${y0}L${x1} ${y1}`} stroke={skin} strokeWidth={7} />
      <path d={`M${x0} ${y0}L${sx} ${sy}`} stroke={look.sleeve} strokeWidth={7} />
      <circle cx={x1} cy={y1} r="5.5" fill={skin} stroke={INK} strokeWidth={3} />
    </g>
  );
}

function Legs({ look }: { look: OutfitLook }) {
  return (
    <g stroke={INK} strokeWidth={3.5}>
      {[35, 53].map((x) => (
        <g key={x}>
          <rect x={x} y="116" width="12" height="24" rx="5" fill={look.pants} />
          {look.socks && <rect x={x} y="130" width="12" height="8" fill={look.socks} strokeWidth={2.5} />}
          <ellipse cx={x + 5} cy="142" rx="9" ry="5" fill={INK} />
        </g>
      ))}
    </g>
  );
}

function Accessory({ type }: { type: number }) {
  switch (type) {
    case 1: // muszka
      return (
        <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
          <path d="M50 94l-11-6v12zM50 94l11-6v12z" fill="#ff5d73" />
          <circle cx="50" cy="94" r="3" fill="#e03a4e" />
        </g>
      );
    case 2: // szalik
      return (
        <g stroke={INK} strokeWidth={3} strokeLinejoin="round">
          <path d="M59 94l5 22h-10l-2-20z" fill="#ff5d73" />
          <path d="M28 86q22 12 44 0v8q-22 12-44 0z" fill="#ff5d73" />
          <path d="M54 108h10" stroke="#fff" strokeWidth={2.5} />
        </g>
      );
    case 3: // naszyjnik z serduszkiem
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M37 89Q50 104 63 89" fill="none" stroke={INK} strokeWidth={5} />
          <path d="M37 89Q50 104 63 89" fill="none" stroke="#ffd23f" strokeWidth={2.5} />
          <path d="M50 106c-6-4-7.5-7.5-5.5-9.5 1.7-1.7 4-1 5.5 1 1.5-2 3.8-2.7 5.5-1 2 2 .5 5.5-5.5 9.5z" fill="#ff5d73" stroke={INK} strokeWidth={2} />
        </g>
      );
    case 4: // złoty medal
      return (
        <g strokeLinejoin="round">
          <path d="M41 87l9 16 9-16" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
          <path d="M41 87l9 16 9-16" fill="none" stroke="#41b6ff" strokeWidth={4.5} strokeLinecap="round" />
          <circle cx="50" cy="108" r="8" fill="#ffd23f" stroke={INK} strokeWidth={2.5} />
          <path d="M50 102.5l1.6 3.4 3.7.4-2.8 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z" fill="#fff4b0" stroke={INK} strokeWidth={1.2} />
        </g>
      );
    case 5: // krawat
      return <path d="M47 89h6l-1 4 3 17-5 6-5-6 3-17z" fill="#ff5d73" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />;
    default:
      return null;
  }
}

export function AvatarSvg({
  avatar,
  mood = "normal",
  size = 64,
  crop,
  className,
}: {
  avatar: Avatar;
  mood?: Mood;
  /** Wysokość w pikselach. */
  size?: number;
  crop?: AvatarCrop;
  className?: string;
}) {
  const view = crop ?? (size >= 64 ? "full" : "head");
  const skin = AVATAR_COLORS[avatar.color] ?? AVATAR_COLORS[0];
  const hair = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0];
  const top = HEAD_TOP[avatar.shape] ?? 22;
  const look = outfitLook(avatar.outfit, OUTFIT_COLORS[avatar.outfitColor] ?? OUTFIT_COLORS[0]);
  const up = mood === "happy";
  const [, , w, h] = VIEWBOX[view].split(" ").map(Number);
  return (
    <svg
      viewBox={VIEWBOX[view]}
      width={view === "full" ? (size * w) / h : size}
      height={size}
      className={className}
      style={mood === "ghost" ? { filter: "grayscale(1)", opacity: 0.55 } : undefined}
      aria-hidden="true"
    >
      {look.back}
      <Legs look={look} />
      <Arm side={-1} up={up} skin={skin} look={look} />
      <Arm side={1} up={up} skin={skin} look={look} />
      <path d={TORSO} fill={look.torso} />
      {look.details}
      <path d={TORSO} fill="none" stroke={INK} strokeWidth={SW} />
      {look.collar}

      <HairBack type={avatar.hair} top={top} color={hair} />
      {ANTENNA_HATS.has(avatar.hat) && <Antenna top={top} fill={skin} />}
      {avatar.shape === 3 && <Ears fill={skin} />}
      <Head shape={avatar.shape} fill={skin} />
      <ellipse cx="36" cy={top + 14} rx="9" ry="5" fill="#fff" opacity="0.45" transform={`rotate(-25 36 ${top + 14})`} />
      <circle cx="29" cy="63" r="5" fill="#ff7a93" opacity="0.35" />
      <circle cx="71" cy="63" r="5" fill="#ff7a93" opacity="0.35" />
      <Accessory type={avatar.accessory} />
      <Extra type={avatar.extra} top={top} />
      <Eyes type={avatar.eyes} mood={mood} />
      <Mouth type={avatar.mouth} mood={mood} />
      <HairFront type={avatar.hair} top={top} color={hair} />
      <Hat type={avatar.hat} top={top} />
    </svg>
  );
}
