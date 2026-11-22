// Small helpers: dates, numbers, training maths.

export const DAY = 86400000;

export const today = () => toISO(new Date());

export function toISO(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(a, b) {
  return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / DAY);
}

export function fmtDate(iso, opts = { day: "numeric", month: "short" }) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", opts);
}

export function fmtDay(iso) {
  return fmtDate(iso, { weekday: "short", day: "numeric", month: "short" });
}

export function relDay(iso) {
  if (!iso) return "—";
  const n = daysBetween(today(), iso);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n} days ago`;
  return `In ${n} days`;
}

export const kg = (n, dp = 1) =>
  n == null || isNaN(n) ? "—" : `${Number(n).toFixed(dp).replace(/\.0+$/, "")} kg`;

export const round = (n, step = 0.5) => Math.round(n / step) * step;

// Estimated one-rep max (Epley). Used only to compare sessions with each other.
export const e1rm = (w, r) => (r > 0 && w > 0 ? w * (1 + r / 30) : 0);

export function bestSet(sets = []) {
  let best = null;
  for (const s of sets) {
    if (!s || !s.done || !s.weight || !s.reps) continue;
    const v = e1rm(+s.weight, +s.reps);
    if (!best || v > best.e1rm) best = { weight: +s.weight, reps: +s.reps, e1rm: v };
  }
  return best;
}

// Rolling average of bodyweight, so one heavy morning does not look like a trend.
export function smooth(points, window = 7) {
  return points.map((p, i) => {
    const from = p.date;
    const inRange = points.filter(
      (q, j) => j <= i && daysBetween(q.date, from) < window
    );
    const avg = inRange.reduce((a, q) => a + q.value, 0) / inRange.length;
    return { ...p, avg };
  });
}

// Weekly change from a smoothed series (kg per week).
export function weeklyRate(points) {
  if (points.length < 2) return null;
  const s = smooth(points);
  const a = s[Math.max(0, s.length - 15)];
  const b = s[s.length - 1];
  const days = daysBetween(a.date, b.date);
  if (days < 5) return null;
  return ((b.avg - a.avg) / days) * 7;
}

export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export const uid = () =>
  (crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));

// Seeded random numbers, so demo data looks the same on every visit.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }
}

export function sessionStore(key, value) {
  try {
    if (value === undefined) return JSON.parse(sessionStorage.getItem(key) || "null");
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }
}

export function cx(...a) {
  return a.filter(Boolean).join(" ");
}
