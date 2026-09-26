import { AVATAR_COLORS, type Avatar } from "../../shared/avatar.ts";

export type Mood = "normal" | "happy" | "ghost";

const INK = "#2a1650";
const SW = 4;

/** Górna krawędź „głowy" dla każdego kształtu — tam siadają czapki. */
const HEAD_TOP = [22, 16, 24];

function Body({ shape, fill }: { shape: number; fill: string }) {
  if (shape === 1) {
    return <path d="M50 16c20 0 32 16 32 38 0 22-14 36-32 36S18 76 18 54c0-22 12-38 32-38z" fill={fill} stroke={INK} strokeWidth={SW} />;
  }
  if (shape === 2) {
    return <rect x="16" y="24" width="68" height="64" rx="18" fill={fill} stroke={INK} strokeWidth={SW} />;
  }
  return <circle cx="50" cy="56" r="34" fill={fill} stroke={INK} strokeWidth={SW} />;
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
      const star = (cx: number) =>
        `M${cx} ${Y - 8}l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6-5-2.9-5 2.9 1.2-5.6-4.2-3.8 5.6-.6z`;
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
    default:
      return <path d="M39 67q11 11 22 0" {...common} />;
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
      return (
        <path
          d={`M30 ${t + 6}l-2-22 11 11 11-15 11 15 11-11-2 22z`}
          fill="#ffd23f"
          stroke={INK}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      );
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
    default:
      return null;
  }
}

export function AvatarSvg({ avatar, mood = "normal", size = 64, className }: { avatar: Avatar; mood?: Mood; size?: number; className?: string }) {
  const fill = AVATAR_COLORS[avatar.color] ?? AVATAR_COLORS[0];
  const top = HEAD_TOP[avatar.shape] ?? 22;
  return (
    <svg
      viewBox="0 -16 100 110"
      width={size}
      height={size}
      className={className}
      style={mood === "ghost" ? { filter: "grayscale(1)", opacity: 0.55 } : undefined}
      aria-hidden="true"
    >
      <Body shape={avatar.shape} fill={fill} />
      <ellipse cx="36" cy={top + 14} rx="9" ry="5" fill="#fff" opacity="0.45" transform={`rotate(-25 36 ${top + 14})`} />
      <circle cx="29" cy="63" r="5" fill="#ff7a93" opacity="0.35" />
      <circle cx="71" cy="63" r="5" fill="#ff7a93" opacity="0.35" />
      <Eyes type={avatar.eyes} mood={mood} />
      <Mouth type={avatar.mouth} mood={mood} />
      <Hat type={avatar.hat} top={top} />
    </svg>
  );
}
