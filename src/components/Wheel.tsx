import { memo, useEffect, useRef, useState } from "react";
import { SEGMENT_ANGLE, SPIN_MS, WHEEL } from "../../shared/wheel.ts";

const R = 228;
const TEXT_CENTER = 140;
const TEXT_SPAN = 160;

function point(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [radius * Math.sin(a), -radius * Math.cos(a)];
}

function segmentPath(i: number): string {
  const [x0, y0] = point(i * SEGMENT_ANGLE, R);
  const [x1, y1] = point((i + 1) * SEGMENT_ANGLE, R);
  return `M0 0L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
}

function fitSize(text: string, base: number): number {
  return Math.min(base, TEXT_SPAN / (text.length * 0.56));
}

const WheelFace = memo(function WheelFace() {
  return (
    <svg viewBox="-250 -250 500 500" className="size-full drop-shadow-[0_10px_0_rgba(42,22,80,0.55)]" aria-hidden="true">
      <circle r="246" fill="#1d1233" />
      {WHEEL.map((seg, i) => {
        const main = seg.lines.map((text) => ({ text, size: fitSize(text, 21) }));
        const small = (seg.small ?? []).map((text) => ({ text, size: fitSize(text, 12.5) }));
        const lines = [...main, ...small];
        const heights = lines.map((l) => l.size * 1.08);
        const total = heights.reduce((a, b) => a + b, 0);
        let y = -total / 2;
        return (
          <g key={i}>
            <path d={segmentPath(i)} fill={seg.color} stroke="#1d1233" strokeWidth="3" />
            <path d={segmentPath(i)} fill="url(#wheel-shade)" />
            <g transform={`rotate(${(i + 0.5) * SEGMENT_ANGLE}) rotate(-90)`} fill={seg.textColor} fontFamily="Lilita One, Nunito, sans-serif">
              {lines.map((line, j) => {
                const cy = y + heights[j] / 2;
                y += heights[j];
                return (
                  <text key={j} x={TEXT_CENTER} y={cy} fontSize={line.size} textAnchor="middle" dominantBaseline="central" letterSpacing="0.3">
                    {line.text}
                  </text>
                );
              })}
            </g>
          </g>
        );
      })}
      {WHEEL.map((_, i) => {
        const [x, y] = point(i * SEGMENT_ANGLE, 238);
        return <circle key={i} cx={x} cy={y} r="4" fill="#cfc4e8" stroke="#1d1233" strokeWidth="1.5" />;
      })}
      <defs>
        <radialGradient id="wheel-shade">
          <stop offset="0.2" stopColor="#000" stopOpacity="0.18" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.08" />
        </radialGradient>
      </defs>
    </svg>
  );
});

interface WheelProps {
  rotation: number;
  canSpin: boolean;
  spinning: boolean;
  onSpin: () => void;
}

export function Wheel({ rotation, canSpin, spinning, onSpin }: WheelProps) {
  const first = useRef(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setAnimate(true);
  }, [rotation]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[430px]">
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animate ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.72, 0.16, 1)` : "none",
        }}
      >
        <WheelFace />
      </div>

      {/* wskaźnik */}
      <svg viewBox="0 0 60 70" className="absolute left-1/2 top-[-4%] w-[13%] -translate-x-1/2 drop-shadow-[0_4px_0_rgba(42,22,80,0.6)]" aria-hidden="true">
        <path d="M30 66L6 14a24 24 0 1 1 48 0z" fill="#ffd23f" stroke="#2a1650" strokeWidth="5" strokeLinejoin="round" />
        <circle cx="30" cy="22" r="8" fill="#fff" stroke="#2a1650" strokeWidth="4" />
      </svg>

      <button
        type="button"
        onClick={onSpin}
        disabled={!canSpin}
        aria-label={canSpin ? "Zakręć kołem" : "Koło"}
        className={`absolute left-1/2 top-1/2 grid size-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-ink font-display text-[clamp(1rem,3.4vw,1.5rem)] uppercase leading-none shadow-[0_5px_0_var(--color-ink)] transition-transform disabled:cursor-default ${
          canSpin ? "anim-pulse bg-sun hover:scale-105 active:scale-95" : "bg-white"
        }`}
      >
        {canSpin ? "Kręć!" : spinning ? <span className="anim-wobble inline-block text-3xl">🌀</span> : <span className="text-3xl">?</span>}
      </button>
    </div>
  );
}
