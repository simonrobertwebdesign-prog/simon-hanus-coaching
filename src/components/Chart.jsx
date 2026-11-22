import { useMemo } from "react";
import { fmtDate } from "../lib/util";

// Line chart in plain SVG. series: [{ name, colour, points: [{date, value}], dashed }]
export function LineChart({ series, height = 220, unit = "", yPad = 0.15, showDots = true, className = "" }) {
  const W = 640;
  const H = height;
  const m = { t: 14, r: 14, b: 26, l: 40 };
  const all = series.flatMap((s) => s.points);
  const calc = useMemo(() => {
    if (!all.length) return null;
    const ts = all.map((p) => new Date(p.date + "T12:00:00").getTime());
    const vs = all.map((p) => p.value);
    let t0 = Math.min(...ts), t1 = Math.max(...ts);
    if (t0 === t1) { t0 -= 86400000; t1 += 86400000; }
    let v0 = Math.min(...vs), v1 = Math.max(...vs);
    const pad = (v1 - v0 || Math.abs(v1) || 1) * yPad;
    v0 -= pad; v1 += pad;
    const x = (d) => m.l + ((new Date(d + "T12:00:00").getTime() - t0) / (t1 - t0)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - (v - v0) / (v1 - v0)) * (H - m.t - m.b);
    const ticks = [0, 0.5, 1].map((f) => v0 + pad + f * (v1 - v0 - 2 * pad));
    const dates = [all[0].date, all[Math.floor(all.length / 2)].date, all[all.length - 1].date];
    return { x, y, ticks, t0, t1, dates };
  }, [JSON.stringify(series)]);

  if (!calc) return <div className="empty small">No data yet.</div>;
  const { x, y, ticks } = calc;
  const sortedDates = [...new Set(all.map((p) => p.date))].sort();
  const xd = [sortedDates[0], sortedDates[Math.floor(sortedDates.length / 2)], sortedDates[sortedDates.length - 1]];

  return (
    <svg className={"chart " + className} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.name).join(", ")}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--rule-soft)" />
          <text x={m.l - 8} y={y(t) + 4} textAnchor="end">
            {Math.round(t * 10) / 10}
            {unit}
          </text>
        </g>
      ))}
      {[...new Set(xd)].map((d, i, arr) => (
        <text key={d} x={x(d)} y={H - 6} textAnchor={arr.length === 1 ? "middle" : i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle"}>
          {fmtDate(d)}
        </text>
      ))}
      {series.map((s) => {
        const pts = [...s.points].sort((a, b) => (a.date < b.date ? -1 : 1));
        const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke={s.colour} strokeWidth={s.width || 2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "4 5" : undefined} opacity={s.faint ? 0.45 : 1} />
            {showDots && !s.faint && !s.dashed &&
              pts.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r="3.2" fill="var(--surface)" stroke={s.colour} strokeWidth="2" />)}
          </g>
        );
      })}
    </svg>
  );
}

// Simple bars, e.g. sessions per week.
export function Bars({ data, height = 160, target, colour = "var(--ink)" }) {
  const W = 640, H = height, m = { t: 10, r: 8, b: 26, l: 28 };
  const max = Math.max(target || 0, ...data.map((d) => d.value), 1);
  const bw = (W - m.l - m.r) / data.length;
  const y = (v) => m.t + (1 - v / max) * (H - m.t - m.b);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart">
      {target ? (
        <g>
          <line x1={m.l} x2={W - m.r} y1={y(target)} y2={y(target)} stroke="var(--red)" strokeDasharray="4 5" />
          <text x={W - m.r} y={y(target) - 5} textAnchor="end" style={{ fill: "var(--red)" }}>
            plan: {target}
          </text>
        </g>
      ) : null}
      {data.map((d, i) => (
        <g key={i}>
          <rect x={m.l + i * bw + bw * 0.18} width={bw * 0.64} y={y(d.value)} height={Math.max(0, H - m.b - y(d.value))} rx="5" fill={d.colour || colour} />
          <text x={m.l + i * bw + bw / 2} y={H - 8} textAnchor="middle">
            {d.label}
          </text>
        </g>
      ))}
      <text x={m.l - 8} y={m.t + 8} textAnchor="end">{max}</text>
      <text x={m.l - 8} y={H - m.b} textAnchor="end">0</text>
    </svg>
  );
}
