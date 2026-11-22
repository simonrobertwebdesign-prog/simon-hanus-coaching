// Turns raw logs into the numbers Simon (and Claude) look at.
import { addDays, bestSet, daysBetween, e1rm, today, weeklyRate, smooth, fmtDate } from "./util";
import { planById } from "../config";

export function strengthSeries(workouts, exercise) {
  const pts = [];
  for (const w of workouts) {
    const e = (w.entries || []).find((x) => x.exercise === exercise);
    const b = e && bestSet(e.sets);
    if (b) pts.push({ date: w.date, value: Math.round(b.e1rm * 10) / 10, set: b });
  }
  return pts.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function lifts(workouts) {
  const count = {};
  for (const w of workouts) for (const e of w.entries || []) if (bestSet(e.sets)) count[e.exercise] = (count[e.exercise] || 0) + 1;
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => {
      const s = strengthSeries(workouts, name);
      const first = s[0], last = s[s.length - 1];
      const recent = s.slice(-3);
      const stalled = recent.length === 3 && recent[2].value <= recent[0].value;
      return {
        name,
        sessions: s.length,
        first,
        last,
        change: first && last ? ((last.value - first.value) / first.value) * 100 : 0,
        stalled,
      };
    });
}

export function weeklySessions(workouts, weeks = 8) {
  const out = [];
  const end = today();
  for (let i = weeks - 1; i >= 0; i--) {
    const to = addDays(end, -i * 7);
    const from = addDays(to, -6);
    const n = workouts.filter((w) => w.date >= from && w.date <= to).length;
    out.push({ label: fmtDate(from, { day: "numeric", month: "numeric" }), value: n, from, to });
  }
  return out;
}

export function adherence(workouts, trainingPlan, days = 14, end = today()) {
  const perWeek = trainingPlan?.content?.days_per_week || trainingPlan?.days_per_week || 0;
  if (!perWeek) return null;
  const from = addDays(end, -days + 1);
  const done = workouts.filter((w) => w.date >= from && w.date <= end).length;
  const planned = Math.round((perWeek * days) / 7);
  return { done, planned, missed: Math.max(0, planned - done), pct: planned ? Math.min(100, Math.round((done / planned) * 100)) : 0 };
}

export function bodySummary(body) {
  const pts = body.map((b) => ({ date: b.date, value: +b.weight_kg }));
  if (!pts.length) return null;
  const s = smooth(pts);
  return {
    first: pts[0],
    last: pts[pts.length - 1],
    avgNow: s[s.length - 1].avg,
    change: s[s.length - 1].avg - s[0].avg,
    rate: weeklyRate(pts),
    points: pts,
    smooth: s.map((p) => ({ date: p.date, value: Math.round(p.avg * 10) / 10 })),
  };
}

export function lastLogged(workouts) {
  return workouts.reduce((a, w) => (!a || w.date > a ? w.date : a), null);
}

export function checkinState(client) {
  if (!client?.next_checkin) return null;
  const d = daysBetween(today(), client.next_checkin);
  return { date: client.next_checkin, days: d, due: d <= 0, overdue: d < 0 };
}

// What the client needs next (for the next workout suggestion).
export function nextDay(trainingPlan, workouts) {
  const days = trainingPlan?.content?.days || [];
  if (!days.length) return null;
  const last = workouts[0];
  const i = last ? days.findIndex((d) => d.name === last.day_name) : -1;
  return days[(i + 1) % days.length];
}

export function lastTimeFor(workouts, exercise) {
  for (const w of workouts) {
    const e = (w.entries || []).find((x) => x.exercise === exercise);
    if (e && e.sets?.some((s) => s.done)) return { date: w.date, sets: e.sets.filter((s) => s.done) };
  }
  return null;
}

// One row per client for the coach's sheet.
export function sheetRow(client, extra = {}) {
  const ck = checkinState(client);
  const plan = planById(client.plan);
  let todo = null;
  if (client.status === "new") todo = "Not paid yet";
  else if (client.status === "paid" && !client.payment_confirmed) todo = "Check payment";
  else if (client.status === "paid") todo = extra.hasDrafts ? "Approve plans" : "Plans to make";
  else if (ck?.due) todo = "Check-in due";
  return { ...client, planName: plan.name, checkin: ck, todo };
}

// The summary Claude uses to write a check-in, and Simon reads in the report.
export function checkinSummary(b) {
  const training = b.plans.find((p) => p.kind === "training" && p.status === "live");
  const sinceLast = b.checkins.find((k) => k.status === "sent")?.sent_at?.slice(0, 10) || b.client.start_date || addDays(today(), -14);
  const period = Math.max(7, daysBetween(sinceLast, today()));
  const recent = b.workouts.filter((w) => w.date >= sinceLast);
  return {
    period_days: period,
    since: sinceLast,
    adherence: adherence(b.workouts, training, period),
    sessions_logged: recent.length,
    body: bodySummary(b.body),
    lifts: lifts(b.workouts).slice(0, 8).map((l) => ({
      name: l.name,
      best_now: l.last && `${l.last.set.weight} kg × ${l.last.set.reps}`,
      best_start: l.first && `${l.first.set.weight} kg × ${l.first.set.reps}`,
      change_pct: Math.round(l.change * 10) / 10,
      stalled: l.stalled,
    })),
    latest_form: b.checkins.find((k) => k.status !== "sent")?.form || null,
    photos: b.photos.map((p) => ({ date: p.date, angle: p.angle })),
  };
}

export { e1rm };
