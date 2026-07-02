import { formatCents } from "@/lib/format";

/** Tiny inline trend line for table rows and stat tiles. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = 3;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / Math.max(hi - lo, 1)) * (height - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const falling = values[values.length - 1] < values[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Trend: from ${formatCents(values[0])} to ${formatCents(values[values.length - 1])}`}
      className={className}
    >
      <path
        d={d}
        fill="none"
        stroke={falling ? "var(--success)" : "var(--muted-foreground)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
