import { memo, useEffect, useMemo, useRef, useState } from "react";
import { SEGMENT_ANGLE, SPIN_MS, WHEEL } from "../../shared/wheel.ts";

const R = 228;
/** Tekst zaczyna się za środkowym przyciskiem i kończy przed ćwiekami na obwodzie. */
const TEXT_FROM = 64;
const TEXT_TO = 221;
/** Minimalny odstęp tekstu od krawędzi pola. */
const PAD = 4;
/** Odstęp między liniami i grubość obrysu liter (w em). */
const LINE_GAP = 0.16;
const OUTLINE = 0.12;
const MAX_SIZE = 24;
const FONT = '"Paytone One", Nunito, sans-serif';
const HALF_ANGLE = ((SEGMENT_ANGLE / 2) * Math.PI) / 180;

function point(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [radius * Math.sin(a), -radius * Math.cos(a)];
}

function segmentPath(i: number): string {
  const [x0, y0] = point(i * SEGMENT_ANGLE, R);
  const [x1, y1] = point((i + 1) * SEGMENT_ANGLE, R);
  return `M0 0L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
}

interface InkMetrics {
  width: number;
  ascent: number;
  descent: number;
}

let ctx: CanvasRenderingContext2D | null | undefined;

/** Szerokość i faktyczny zasięg liter w pionie (łącznie z kreskami i ogonkami) dla rozmiaru 1. */
function measure(text: string): InkMetrics {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return { width: text.length * 0.65, ascent: 1.05, descent: 0.25 };
  ctx.font = `100px ${FONT}`;
  const m = ctx.measureText(text);
  return { width: m.width / 100, ascent: m.actualBoundingBoxAscent / 100, descent: m.actualBoundingBoxDescent / 100 };
}

interface SegmentText {
  size: number;
  x: number;
  lines: { text: string; y: number }[];
}

/**
 * Dobiera największy rozmiar, przy którym każda linia mieści się w klinie pola.
 * Układ lokalny: oś x biegnie wzdłuż środka pola od osi koła, y to odległość od tej osi.
 */
function layoutText(lines: string[]): SegmentText {
  const metrics = lines.map(measure);

  const place = (size: number) => {
    const ys: number[] = [];
    metrics.forEach((m, j) => {
      const prev = metrics[j - 1];
      ys.push(j === 0 ? 0 : ys[j - 1] + (prev.descent + LINE_GAP + m.ascent) * size);
    });
    const top = ys[0] - metrics[0].ascent * size;
    const bottom = ys[ys.length - 1] + metrics[metrics.length - 1].descent * size;
    const shift = -(top + bottom) / 2;
    return ys.map((y) => y + shift);
  };

  // Zakres, w którym może leżeć środek tekstu, albo null, gdy tekst się nie mieści.
  const fit = (size: number) => {
    const ys = place(size);
    let lo = -Infinity;
    let hi = Infinity;
    metrics.forEach((m, j) => {
      const outline = (OUTLINE / 2) * size;
      const reach = Math.max(Math.abs(ys[j] - m.ascent * size), Math.abs(ys[j] + m.descent * size)) + outline;
      const half = (m.width * size) / 2 + outline;
      const inner = Math.max(TEXT_FROM, reach / Math.tan(HALF_ANGLE) + PAD / Math.sin(HALF_ANGLE));
      const outer = Math.sqrt(Math.max(0, TEXT_TO ** 2 - reach ** 2));
      lo = Math.max(lo, inner + half);
      hi = Math.min(hi, outer - half);
    });
    return lo <= hi ? { ys, x: (lo + hi) / 2 } : null;
  };

  let size = MAX_SIZE;
  if (!fit(size)) {
    let small = 4;
    let big = MAX_SIZE;
    for (let k = 0; k < 20; k++) {
      const mid = (small + big) / 2;
      if (fit(mid)) small = mid;
      else big = mid;
    }
    size = small;
  }
  const { ys, x } = fit(size) ?? { ys: place(size), x: (TEXT_FROM + TEXT_TO) / 2 };
  return { size, x, lines: lines.map((text, j) => ({ text, y: ys[j] })) };
}

/** Czeka na czcionkę koła, żeby mierzyć tekst tym samym krojem, którym zostanie narysowany. */
function useWheelFont(): boolean {
  const [ready, setReady] = useState(() => !document.fonts);
  useEffect(() => {
    if (ready) return;
    let alive = true;
    const sample = [...new Set(WHEEL.flatMap((s) => s.lines).join(""))].join("");
    document.fonts
      .load(`100px ${FONT}`, sample)
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [ready]);
  return ready;
}

const WheelFace = memo(function WheelFace() {
  const fontReady = useWheelFont();
  const texts = useMemo(() => (fontReady ? WHEEL.map((seg) => layoutText(seg.lines)) : null), [fontReady]);

  return (
    <svg viewBox="-250 -250 500 500" className="size-full drop-shadow-[0_10px_0_rgba(42,22,80,0.55)]" aria-hidden="true">
      <circle r="246" fill="#1d1233" />
      {WHEEL.map((seg, i) => {
        const text = texts?.[i];
        return (
          <g key={i}>
            <path d={segmentPath(i)} fill={seg.color} stroke="#1d1233" strokeWidth="3" />
            <path d={segmentPath(i)} fill="url(#wheel-shade)" />
            {text && (
              <g
                transform={`rotate(${(i + 0.5) * SEGMENT_ANGLE}) rotate(-90)`}
                fill={seg.textColor}
                fontFamily={FONT}
                fontSize={text.size}
                textAnchor="middle"
                // Obrys poprawia czytelność jasnego tekstu na jasnych polach; ciemny tekst go nie potrzebuje.
                stroke={seg.textColor === "#fff" ? "#1d1233" : "none"}
                strokeOpacity="0.55"
                strokeWidth={text.size * OUTLINE}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {text.lines.map((line, j) => (
                  <text key={j} x={text.x} y={line.y}>
                    {line.text}
                  </text>
                ))}
              </g>
            )}
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
