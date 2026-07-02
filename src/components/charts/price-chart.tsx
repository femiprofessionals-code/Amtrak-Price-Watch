"use client";

import { useMemo, useRef, useState } from "react";
import { formatCents, formatDateTime } from "@/lib/format";

export type PricePoint = { t: number; priceCents: number };

const PAD = { top: 12, right: 12, bottom: 24, left: 48 };
const W = 640;
const H = 240;

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1000;
    max += 1000;
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = span / count / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = mult * step;
  const start = Math.ceil(min / s) * s;
  const ticks: number[] = [];
  for (let v = start; v <= max; v += s) ticks.push(v);
  return ticks;
}

/**
 * Single-series price history line chart with target reference line,
 * crosshair hover and tooltip. Colors come from the design tokens so
 * light/dark mode both render a validated palette.
 */
export function PriceChart({
  points,
  targetCents,
  label = "Price history",
}: {
  points: PricePoint[];
  targetCents?: number;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { path, area, xy, yTicks, xTicks, summary } = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.t - b.t);
    const prices = sorted.map((p) => p.priceCents);
    const lo = Math.min(...prices, targetCents ?? Infinity);
    const hi = Math.max(...prices, targetCents ?? -Infinity);
    const padY = Math.max((hi - lo) * 0.12, 200);
    const yMin = Math.max(0, lo - padY);
    const yMax = hi + padY;
    const tMin = sorted[0]?.t ?? 0;
    const tMax = sorted[sorted.length - 1]?.t ?? 1;

    const x = (t: number) =>
      PAD.left + ((t - tMin) / Math.max(tMax - tMin, 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - (v - yMin) / Math.max(yMax - yMin, 1)) * (H - PAD.top - PAD.bottom);

    const xy = sorted.map((p) => ({ ...p, x: x(p.t), y: y(p.priceCents) }));
    const path = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const baseline = H - PAD.bottom;
    const area = xy.length
      ? `${path} L${xy[xy.length - 1].x.toFixed(1)},${baseline} L${xy[0].x.toFixed(1)},${baseline} Z`
      : "";

    const yTicks = niceTicks(yMin, yMax).map((v) => ({ v, y: y(v) }));
    const tickCount = Math.min(4, sorted.length);
    const xTicks = Array.from({ length: tickCount }, (_, i) => {
      const t = tMin + ((tMax - tMin) * i) / Math.max(tickCount - 1, 1);
      return { t, x: x(t) };
    });

    const summary =
      sorted.length > 0
        ? `${label}: ${sorted.length} checks from ${formatDateTime(new Date(tMin))} to ${formatDateTime(new Date(tMax))}. Latest ${formatCents(prices[prices.length - 1])}, low ${formatCents(Math.min(...prices))}, high ${formatCents(Math.max(...prices))}.`
        : `${label}: no data yet`;

    return { path, area, xy, yTicks, xTicks, summary };
  }, [points, targetCents, label]);

  const targetY = useMemo(() => {
    if (targetCents == null || xy.length === 0) return null;
    const prices = xy.map((p) => p.priceCents);
    const lo = Math.min(...prices, targetCents);
    const hi = Math.max(...prices, targetCents);
    const padY = Math.max((hi - lo) * 0.12, 200);
    const yMin = Math.max(0, lo - padY);
    const yMax = hi + padY;
    return PAD.top + (1 - (targetCents - yMin) / Math.max(yMax - yMin, 1)) * (H - PAD.top - PAD.bottom);
  }, [targetCents, xy]);

  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No price data yet — the first check will appear here shortly.
      </div>
    );
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    xy.forEach((p, i) => {
      const d = Math.abs(p.x - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const h = hover != null ? xy[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        className="w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* Recessive grid */}
        {yTicks.map(({ v, y }) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)">
              {formatCents(v)}
            </text>
          </g>
        ))}
        {xTicks.map(({ t, x }, i) => (
          <text
            key={i}
            x={x}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize="10.5"
            fill="var(--muted-foreground)"
          >
            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(t))}
          </text>
        ))}

        {/* Target reference line */}
        {targetY != null && targetY > PAD.top && targetY < H - PAD.bottom && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={targetY}
              y2={targetY}
              stroke="var(--success)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text x={W - PAD.right} y={targetY - 5} textAnchor="end" fontSize="10.5" fontWeight="500" fill="var(--success)">
              Target {formatCents(targetCents)}
            </text>
          </g>
        )}

        {/* Series */}
        <path d={area} fill="var(--primary)" opacity="0.08" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {xy.length === 1 && <circle cx={xy[0].x} cy={xy[0].y} r="4" fill="var(--primary)" />}

        {/* Hover layer */}
        {h && (
          <g>
            <line x1={h.x} x2={h.x} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <circle cx={h.x} cy={h.y} r="4.5" fill="var(--primary)" stroke="var(--card)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {h && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 shadow-lifted"
          style={{
            left: `${(h.x / W) * 100}%`,
            top: `${(Math.max(h.y - 14, 8) / H) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(new Date(h.t))}</p>
          <p className="text-sm font-semibold tabular-nums">{formatCents(h.priceCents)}</p>
        </div>
      )}
    </div>
  );
}
