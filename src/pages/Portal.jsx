import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { go } from "../lib/router";
import { planById, STRIPE_CUSTOMER_PORTAL } from "../config";
import { Brand, Choices, Empty, Field, Icon, Loading, Modal, Plate, useToast } from "../components/ui";
import { LineChart, Bars } from "../components/Chart";
import { PhotoCompare } from "../components/PhotoCompare";
import { adherence, bodySummary, checkinState, lastTimeFor, lifts, nextDay, strengthSeries, weeklySessions } from "../lib/insights";
import { bestSet, cx, fmtDate, fmtDay, kg, relDay, today } from "../lib/util";

const NAV = [
  ["app", "Today", "today"],
  ["app-training", "Training", "training"],
  ["app-food", "Food", "food"],
  ["app-progress", "Progress", "progress"],
  ["app-photos", "Photos", "photos"],
  ["app-checkins", "Check-ins", "checkins"],
];

function useData() {
  const [d, setD] = useState(null);
  const load = useCallback(async () => {
    const [client, plans, workouts, body, photos, checkins, messages, answers] = await Promise.all([
      api.myClient(), api.myPlans(), api.workouts(), api.bodyLogs(), api.photos(), api.checkins(), api.messages(),
      api.myAnswers().catch(() => null),
    ]);
    // Under-18s don't use progress photos.
    const minor = answers?.age !== undefined && answers?.age !== "" && +answers.age < 18;
    setD({ client, plans, workouts, body, photos, checkins, messages, minor });
  }, []);
  useEffect(() => { load(); }, [load]);
  return [d, load];
}

export function Portal({ route, session }) {
  const [d, reload] = useData();
  const [logDay, setLogDay] = useState(null);
  const name = (d?.client?.full_name || session.user.name || "").split(" ")[0];
  const nav = d?.minor ? NAV.filter(([r]) => r !== "app-photos") : NAV;

  const shell = (title, sub, body, actions) => (
    <div className="app">
      <aside className="side">
        <Brand light onClick={() => go("home")} />
        <nav aria-label="Client area">
          {nav.map(([r, label, icon]) => (
            <button key={r} aria-current={route === r ? "page" : undefined} onClick={() => go(r)}>
              <Icon name={icon} /> {label}
            </button>
          ))}
        </nav>
        <div className="foot">
          {STRIPE_CUSTOMER_PORTAL && <a href={STRIPE_CUSTOMER_PORTAL} style={{ color: "#9fabb6" }}>Manage payments</a>}
          <button onClick={async () => { await api.signOut(); go("home"); }}>Log out</button>
        </div>
      </aside>
      <main className="main">
        <div className="mobile-top">
          <Brand onClick={() => go("home")} />
          <button className="textbtn" onClick={async () => { await api.signOut(); go("home"); }}>Log out</button>
        </div>
        <div className="main-head">
          <div>
            <h1>{title}</h1>
            {sub && <p>{sub}</p>}
          </div>
          {actions}
        </div>
        {body}
      </main>
      <nav className="tabbar" aria-label="Client area">
        {nav.map(([r, label, icon]) => (
          <button key={r} aria-current={route === r ? "page" : undefined} onClick={() => go(r)}>
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </nav>
      {logDay && (
        <Logger
          day={logDay}
          workouts={d.workouts}
          onClose={() => setLogDay(null)}
          onSaved={async () => { setLogDay(null); await reload(); }}
        />
      )}
    </div>
  );

  if (!d) return shell("Loading", null, <Loading />);

  if (!d.client)
    return shell(`Hi ${name}`, null, (
      <div className="panel">
        <Empty title="Let's get you started">
          <p>You haven't filled in the questionnaire yet. It takes about 10 minutes.</p>
          <button className="btn" style={{ marginTop: 18 }} onClick={() => go("start")}>Start the questionnaire</button>
        </Empty>
      </div>
    ));

  const training = d.plans.training;
  const food = d.plans.nutrition;
  const waiting = !training || !food;

  if (route === "app-training") return shell("Training", training?.content?.title, waiting ? <Waiting d={d} /> : <TrainingView plan={training} workouts={d.workouts} onLog={setLogDay} reload={reload} />);
  if (route === "app-food") return shell("Food", food?.content?.title, waiting ? <Waiting d={d} /> : <FoodView plan={food} />);
  if (route === "app-progress") return shell("Progress", "Everything you log, as charts.", <ProgressView d={d} reload={reload} />);
  if (route === "app-photos")
    return d.minor
      ? shell("Photos", null, <div className="panel"><Empty title="No photos needed">We track your progress with your lifts, weigh-ins and check-ins instead.</Empty></div>)
      : shell("Photos", "Private: only you and your coach can see these.", <PhotosView d={d} reload={reload} />);
  if (route === "app-checkins") return shell("Check-ins", null, <CheckinsView d={d} reload={reload} />);
  return shell(`Hi ${name}`, fmtDate(today(), { weekday: "long", day: "numeric", month: "long" }), <TodayView d={d} onLog={setLogDay} reload={reload} waiting={waiting} />);
}

function Waiting({ d }) {
  const c = d.client;
  const steps = [
    ["Answers received", true],
    ["Payment", c.status !== "new"],
    ["Your coach builds your plans", false],
    ["Plans in your area", false],
  ];
  if (c.status === "new")
    return (
      <div className="panel">
        <Empty title="One step left">
          <p>Your answers are saved. Pay for your {planById(c.plan).name.toLowerCase()} and your coach starts on your plans.</p>
          <button className="btn" style={{ marginTop: 18 }} onClick={() => go("start")}>Go to payment</button>
        </Empty>
      </div>
    );
  return (
    <div className="panel">
      <h2 data-h="3">Your plans are being built</h2>
      <p className="muted" style={{ marginTop: 6 }}>Your coach is reading your answers. Your training and food plans will be here within 48 hours of paying.</p>
      <ol className="track">
        {steps.map(([st, done], i) => (
          <li key={st} className={done ? "done" : steps.findIndex(([, d]) => !d) === i ? "now" : ""}>
            {done ? "✓ " : ""}
            {st}
          </li>
        ))}
      </ol>
      <p className="small muted" style={{ marginTop: 18 }}>While you wait: add a weigh-in on the Progress page{d.minor ? "." : " and your first photos."}</p>
    </div>
  );
}

function TodayView({ d, onLog, reload, waiting }) {
  const ck = checkinState(d.client);
  const nd = nextDay(d.plans.training, d.workouts);
  const b = bodySummary(d.body);
  const adh = adherence(d.workouts, d.plans.training, 14);
  const lastMsg = d.checkins.find((k) => k.status === "sent");
  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      {waiting ? (
        <Waiting d={d} />
      ) : (
        <div className="panel" style={{ borderColor: "var(--ink)", borderWidth: 2 }}>
          <div className="panel-head">
            <div>
              <div className="small muted">Next workout</div>
              <h2 data-h="3" style={{ fontSize: "1.6rem" }}>{nd?.name}</h2>
              <div className="muted">{nd?.focus}, {nd?.exercises.length} exercises</div>
            </div>
            <button className="btn" onClick={() => onLog(nd)}>Start workout</button>
          </div>
          <div className="small muted">
            {nd?.exercises.map((e) => e.name).join(", ")}
          </div>
        </div>
      )}
      <div className="stats">
        <div className="stat"><span>Next check-in</span><b>{ck ? relDay(ck.date) : "—"}</b><small>{ck ? fmtDate(ck.date) : planById(d.client.plan).checkinDays ? "Starts with your plans" : "Not on your plan"}</small></div>
        <div className="stat"><span>Last 2 weeks</span><b>{adh ? `${adh.done}/${adh.planned}` : d.workouts.length}</b><small>sessions done</small></div>
        <div className="stat"><span>Bodyweight</span><b>{b ? kg(b.last.value) : "—"}</b><small>{b?.rate != null ? `${b.rate > 0 ? "+" : ""}${b.rate.toFixed(2)} kg a week` : "Add your first weigh-in"}</small></div>
      </div>
      <QuickWeigh reload={reload} />
      {lastMsg && (
        <div className="panel">
          <div className="panel-head"><h2 data-h="3">Latest from your coach</h2><span className="small muted">{fmtDate(lastMsg.sent_at?.slice(0, 10))}</span></div>
          <p className="quote">{lastMsg.message}</p>
          <button className="link" style={{ marginTop: 12 }} onClick={() => go("app-checkins")}>All check-ins</button>
        </div>
      )}
    </div>
  );
}

function QuickWeigh({ reload }) {
  const [w, setW] = useState("");
  const toast = useToast();
  return (
    <form
      className="panel row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!+w) return;
        await api.addBodyLog({ date: today(), weight_kg: +w });
        setW("");
        toast("Weigh-in saved");
        reload();
      }}
    >
      <label className="field" style={{ flex: 1, minWidth: 180 }}>
        <span>Today's weigh-in (kg)</span>
        <input className="input" type="number" step="0.1" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder="e.g. 74.6" />
      </label>
      <button className="btn ink" style={{ alignSelf: "flex-end" }}>Save weigh-in</button>
    </form>
  );
}

function TrainingView({ plan, workouts, onLog }) {
  const c = plan.content;
  const [i, setI] = useState(0);
  const day = c.days[i];
  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      <div className="panel">
        <p>{c.summary}</p>
        <div className="cols" style={{ "--n": 3, marginTop: 16 }}>
          <div><div className="small muted">When</div><b>{c.schedule}</b></div>
          <div><div className="small muted">How hard</div><b>{c.effort}</b></div>
          <div><div className="small muted">Getting stronger</div><b>{c.progression}</b></div>
        </div>
      </div>
      <div className="days" role="group" aria-label="Training days">
        {c.days.map((d, k) => (
          <button key={d.name} aria-pressed={k === i} onClick={() => setI(k)}>
            <b>{d.name}</b>
            <small>{d.focus}</small>
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2 data-h="3">{day.name}</h2>
          <button className="btn" onClick={() => onLog(day)}>Start this workout</button>
        </div>
        <table className="ex-table">
          <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Rest</th></tr></thead>
          <tbody>
            {day.exercises.map((e) => {
              const last = lastTimeFor(workouts, e.name);
              return (
                <tr key={e.name}>
                  <td>
                    {e.name}
                    {e.notes && <span className="note">{e.notes}</span>}
                    {last && <span className="note">Last: {last.sets.map((s) => `${s.weight}×${s.reps}`).join(", ")}</span>}
                  </td>
                  <td>{e.sets}</td><td>{e.reps}</td><td>{e.rest}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {c.notes?.length > 0 && <ul className="small muted" style={{ marginTop: 14 }}>{c.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      </div>
      <History workouts={workouts} />
    </div>
  );
}

function History({ workouts }) {
  const [open, setOpen] = useState(null);
  if (!workouts.length) return null;
  return (
    <div className="panel">
      <div className="panel-head"><h2 data-h="3">Logged workouts</h2><span className="small muted">{workouts.length} in total</span></div>
      <div className="hist">
        {workouts.slice(0, 12).map((w) => {
          const top = (w.entries || []).map((e) => ({ e, b: bestSet(e.sets) })).filter((x) => x.b).slice(0, 2);
          return (
            <button key={w.id} className="hist-row" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setOpen(w)}>
              <span className="muted small">{fmtDay(w.date)}</span>
              <span><b>{w.day_name}</b><span className="small muted">{top.map((x) => `${x.e.exercise} ${x.b.weight}×${x.b.reps}`).join(", ")}</span></span>
              <span className="chip">{(w.entries || []).reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} sets</span>
            </button>
          );
        })}
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)} label="Workout">
          <h2 data-h="3">{open.day_name}</h2>
          <p className="muted">{fmtDay(open.date)}</p>
          {(open.entries || []).map((e) => (
            <div key={e.exercise} style={{ marginTop: 14 }}>
              <b>{e.exercise}</b>
              <div className="small muted">{e.sets.filter((s) => s.done).map((s) => `${s.weight} kg × ${s.reps}`).join(", ") || "Not done"}</div>
            </div>
          ))}
          {open.notes && <p className="quote" style={{ marginTop: 16 }}>{open.notes}</p>}
          <button className="btn ink" style={{ marginTop: 22 }} onClick={() => setOpen(null)}>Close</button>
        </Modal>
      )}
    </div>
  );
}

function Logger({ day, workouts, onClose, onSaved }) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState(() =>
    day.exercises.map((e) => {
      const last = lastTimeFor(workouts, e.name);
      return {
        exercise: e.name,
        target: `${e.sets} × ${e.reps}`,
        last,
        sets: Array.from({ length: e.sets }, (_, k) => ({ weight: last?.sets[k]?.weight ?? last?.sets[0]?.weight ?? "", reps: "", done: false })),
      };
    })
  );
  const upd = (i, k, field, v) =>
    setEntries((es) => es.map((e, a) => (a !== i ? e : { ...e, sets: e.sets.map((s, b) => (b !== k ? s : { ...s, [field]: v })) })));
  const addSet = (i) => setEntries((es) => es.map((e, a) => (a !== i ? e : { ...e, sets: [...e.sets, { ...e.sets[e.sets.length - 1], reps: "", done: false }] })));
  const doneCount = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  async function finish() {
    await api.saveWorkout({
      date,
      day_name: day.name,
      notes,
      entries: entries.map((e) => ({
        exercise: e.exercise,
        target: e.target,
        sets: e.sets.map((s) => ({ weight: +s.weight || 0, reps: +s.reps || 0, done: !!s.done && +s.reps > 0 })),
      })),
    });
    toast("Workout saved");
    onSaved();
  }

  return (
    <Modal onClose={onClose} label={`Log ${day.name}`}>
      <div className="row between">
        <div>
          <h2 data-h="3" style={{ fontSize: "1.6rem" }}>{day.name}</h2>
          <span className="muted small">Fill in each set, then tick it.</span>
        </div>
        <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} aria-label="Date" />
      </div>
      <div style={{ marginTop: 18 }}>
        {entries.map((e, i) => (
          <div className="logger-ex" key={e.exercise}>
            <div className="row between">
              <h3 data-h="4">{e.exercise}</h3>
              <span className="chip">{e.target}</span>
            </div>
            {e.last && <div className="last">Last time ({fmtDate(e.last.date)}): {e.last.sets.map((s) => `${s.weight}×${s.reps}`).join(", ")}</div>}
            <div className="sets">
              <div className="set-head"><span>Set</span><span>kg</span><span>Reps</span><span>Done</span></div>
              {e.sets.map((s, k) => (
                <div className="set" key={k}>
                  <span className="n">{k + 1}</span>
                  <input className="input" type="number" inputMode="decimal" step="0.5" value={s.weight} onChange={(ev) => upd(i, k, "weight", ev.target.value)} aria-label={`${e.exercise} set ${k + 1} weight`} />
                  <input className="input" type="number" inputMode="numeric" value={s.reps} onChange={(ev) => upd(i, k, "reps", ev.target.value)} aria-label={`${e.exercise} set ${k + 1} reps`} />
                  <button type="button" className="done" aria-pressed={s.done} aria-label={`Set ${k + 1} done`} onClick={() => upd(i, k, "done", !s.done)}>✓</button>
                </div>
              ))}
            </div>
            <button className="textbtn small" onClick={() => addSet(i)}>+ Add a set</button>
          </div>
        ))}
      </div>
      <Field label="Notes for your coach (optional)">
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel? Any pain?" />
      </Field>
      <div className="row between" style={{ marginTop: 20, position: "sticky", bottom: -26, background: "var(--surface)", padding: "14px 0" }}>
        <button className="textbtn" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={finish} disabled={!doneCount}>Finish workout ({doneCount} sets)</button>
      </div>
    </Modal>
  );
}

function FoodView({ plan }) {
  const c = plan.content;
  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      <div className="panel">
        <div className="panel-head">
          <div><div className="small muted">Every day</div><h2 data-h="3" style={{ fontSize: "2rem" }}>{c.calories?.toLocaleString()} kcal</h2></div>
          <p className="muted" style={{ maxWidth: "46ch" }}>{c.summary}</p>
        </div>
        <div className="macros">
          <div className="macro"><span>Protein</span><b>{c.protein_g} g</b><i style={{ "--c": "var(--red)" }} /></div>
          <div className="macro"><span>Carbs</span><b>{c.carbs_g} g</b><i style={{ "--c": "var(--blue)" }} /></div>
          <div className="macro"><span>Fat</span><b>{c.fat_g} g</b><i style={{ "--c": "var(--yellow)" }} /></div>
          <div className="macro"><span>Water</span><b>{c.water_l} L</b><i style={{ "--c": "var(--rule)" }} /></div>
        </div>
      </div>
      <div className="panel">
        <h2 data-h="3">Your meals</h2>
        {c.meals.map((m) => (
          <div className="meal" key={m.name}>
            <b>{m.name}</b>
            <ul>{m.items.map((it, k) => <li key={k}><span>{it.food}</span><span>{it.amount}</span></li>)}</ul>
          </div>
        ))}
      </div>
      {c.supplements?.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h2 data-h="3">Supplements</h2><span className="small muted">Separate from your meals</span></div>
          <table className="ex-table">
            <thead><tr><th>What</th><th>How much</th><th>When</th></tr></thead>
            <tbody>
              {c.supplements.map((s, i) => (
                <tr key={i}>
                  <td>{s.name}{s.why && <div className="small muted" style={{ fontWeight: 400 }}>{s.why}</div>}</td>
                  <td style={{ fontWeight: 400 }}>{s.dose}</td>
                  <td style={{ fontWeight: 400 }}>{s.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="cols">
        {c.swaps?.length > 0 && <div className="panel"><h2 data-h="3">Easy swaps</h2><ul>{c.swaps.map((s) => <li key={s}>{s}</li>)}</ul></div>}
        {c.notes?.length > 0 && <div className="panel"><h2 data-h="3">Notes</h2><ul>{c.notes.map((s) => <li key={s}>{s}</li>)}</ul></div>}
      </div>
    </div>
  );
}

function ProgressView({ d, reload }) {
  const b = bodySummary(d.body);
  const list = useMemo(() => lifts(d.workouts), [d.workouts]);
  const [ex, setEx] = useState(null);
  const pick = ex || list[0]?.name;
  const series = pick ? strengthSeries(d.workouts, pick) : [];
  const weeks = weeklySessions(d.workouts, 8);
  const perWeek = d.plans.training?.content?.days_per_week;
  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      <div className="stats">
        <div className="stat"><span>Workouts logged</span><b>{d.workouts.length}</b></div>
        <div className="stat"><span>Weight change</span><b className={b?.change > 0 ? "up" : ""}>{b ? `${b.change > 0 ? "+" : ""}${b.change.toFixed(1)} kg` : "—"}</b><small>{b ? `since ${fmtDate(b.first.date)}` : ""}</small></div>
        <div className="stat"><span>Per week</span><b>{b?.rate != null ? `${b.rate > 0 ? "+" : ""}${b.rate.toFixed(2)}` : "—"}</b><small>kg, recent trend</small></div>
        <div className="stat"><span>Lifts going up</span><b>{list.filter((l) => l.change > 0).length}/{list.length || 0}</b></div>
      </div>
      <QuickWeigh reload={reload} />
      <div className="panel">
        <div className="panel-head">
          <h2 data-h="3">Bodyweight</h2>
          <div className="legend"><span><i style={{ background: "var(--muted)" }} />Weigh-ins</span><span><i style={{ background: "var(--red)" }} />7-day trend</span></div>
        </div>
        {b ? <LineChart series={[{ name: "Weigh-ins", colour: "var(--muted)", points: b.points, faint: true, width: 1.5 }, { name: "Trend", colour: "var(--red)", points: b.smooth }]} showDots={false} /> : <Empty title="No weigh-ins yet">Weigh yourself 3–4 mornings a week and add it above.</Empty>}
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2 data-h="3">Strength</h2>
          {list.length > 0 && (
            <select className="select" style={{ width: "auto" }} value={pick} onChange={(e) => setEx(e.target.value)} aria-label="Exercise">
              {list.map((l) => <option key={l.name}>{l.name}</option>)}
            </select>
          )}
        </div>
        {series.length ? (
          <>
            <LineChart series={[{ name: pick, colour: "var(--blue)", points: series }]} />
            <p className="small muted" style={{ marginTop: 8 }}>Each point is your best set that day, turned into an estimated one-rep max so different weights and reps can be compared.</p>
          </>
        ) : (
          <Empty title="Nothing logged yet">Log a workout and your strength chart starts here.</Empty>
        )}
      </div>
      {list.length > 0 && (
        <div className="panel">
          <h2 data-h="3" style={{ marginBottom: 12 }}>All lifts</h2>
          <table className="ex-table">
            <thead><tr><th>Exercise</th><th>First</th><th>Now</th><th>Change</th></tr></thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.name}>
                  <td>{l.name}</td>
                  <td>{l.first.set.weight}×{l.first.set.reps}</td>
                  <td>{l.last.set.weight}×{l.last.set.reps}</td>
                  <td className={l.change > 0 ? "up" : l.change < 0 ? "down" : ""}>{l.change > 0 ? "+" : ""}{l.change.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="panel">
        <div className="panel-head"><h2 data-h="3">Sessions a week</h2></div>
        <Bars data={weeks} target={perWeek} />
      </div>
    </div>
  );
}

function PhotosView({ d, reload }) {
  const toast = useToast();
  const [angle, setAngle] = useState("Front");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const shown = d.photos.filter((p) => p.angle === angle.toLowerCase());
  const [pair, setPair] = useState([]);
  const before = shown.find((p) => p.id === pair[0]) || shown[0];
  const after = shown.find((p) => p.id === pair[1]) || shown[shown.length - 1];
  const pickPhoto = (id) => setPair((p) => (p.length >= 2 ? [id] : [...p, id]));

  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      <div className="panel">
        <div className="panel-head"><h2 data-h="3">Add photos</h2><span className="small muted">Same spot, same light, every 2 weeks</span></div>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <Field label="Angle"><Choices options={["Front", "Side", "Back"]} value={angle} onChange={setAngle} label="Angle" /></Field>
          <Field label="Date"><input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></Field>
          <label className="btn ink" style={{ cursor: "pointer" }}>
            {busy ? "Uploading…" : "Choose photo"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                try {
                  await api.uploadPhoto(f, angle.toLowerCase(), date);
                  toast("Photo added");
                  await reload();
                } catch (err) {
                  toast(err.message);
                } finally {
                  setBusy(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2 data-h="3">Then vs now</h2>
          <Choices options={["Front", "Side", "Back"]} value={angle} onChange={(v) => { setAngle(v); setPair([]); }} label="Show angle" />
        </div>
        {shown.length >= 2 ? (
          <div className="cols" style={{ alignItems: "start" }}>
            <PhotoCompare before={before} after={after} />
            <div className="stack">
              <p className="muted small">Tap two photos to compare them. The first one you tap is the "before".</p>
              <div className="thumbs">
                {shown.map((p) => (
                  <button key={p.id} className="thumb" aria-pressed={p.id === before?.id || p.id === after?.id} onClick={() => pickPhoto(p.id)}>
                    <img src={p.url} alt={`${angle} photo ${fmtDate(p.date)}`} />
                    <span>{fmtDate(p.date)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Empty title={shown.length ? "One more to go" : "No photos yet"}>Add at least two {angle.toLowerCase()} photos on different days to compare them.</Empty>
        )}
      </div>
    </div>
  );
}

function CheckinsView({ d, reload }) {
  const toast = useToast();
  const plan = planById(d.client.plan);
  const ck = checkinState(d.client);
  const latestW = d.body[d.body.length - 1]?.weight_kg || "";
  const open = d.checkins.find((k) => k.status !== "sent");
  const [f, setF] = useState(open?.form || { weight: latestW, sleep: "", energy: "", hunger: "", stress: "", adherence: "", wins: "", struggles: "", questions: "" });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const [msg, setMsg] = useState("");
  const sent = d.checkins.filter((k) => k.status === "sent");

  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      {!plan.checkinDays ? (
        <>
          <div className="notice">The one-off plan doesn't include check-ins. Move to monthly coaching any time to get a check-in every 2 weeks.</div>
          <SelfAdjust />
        </>
      ) : (
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 data-h="3">{ck ? (ck.due ? "Your check-in is due" : `Next check-in: ${relDay(ck.date).toLowerCase()}`) : "Check-ins start with your plans"}</h2>
              {ck && <div className="small muted">{fmtDate(ck.date, { weekday: "long", day: "numeric", month: "long" })}</div>}
            </div>
            {open?.form && <span className="chip green">Sent to your coach</span>}
          </div>
          <form
            className="stack"
            style={{ "--gap": "18px" }}
            onSubmit={async (e) => {
              e.preventDefault();
              await api.submitCheckinForm({ ...f, weight: +f.weight || null, adherence: +f.adherence || null });
              toast("Check-in sent to your coach");
              reload();
            }}
          >
            <div className="two">
              <Field label="Weight this morning (kg)"><input className="input" type="number" step="0.1" value={f.weight} onChange={set("weight")} /></Field>
              <Field label="Average sleep (hours)"><input className="input" type="number" step="0.5" value={f.sleep} onChange={set("sleep")} /></Field>
            </div>
            <Field label="Energy"><Choices options={["1", "2", "3", "4", "5"]} value={String(f.energy)} onChange={set("energy")} label="Energy, 1 low to 5 high" /></Field>
            <Field label="Hunger"><Choices options={["1", "2", "3", "4", "5"]} value={String(f.hunger)} onChange={set("hunger")} label="Hunger, 1 low to 5 high" /></Field>
            <Field label="How closely did you follow the food plan?"><Choices options={["50", "60", "70", "80", "90", "100"]} value={String(f.adherence)} onChange={set("adherence")} label="Food plan percentage" /></Field>
            <Field label="Wins"><textarea className="textarea" value={f.wins} onChange={set("wins")} placeholder="PRs, good days, things that felt easier" /></Field>
            <Field label="Struggles"><textarea className="textarea" value={f.struggles} onChange={set("struggles")} /></Field>
            <Field label="Questions for your coach"><textarea className="textarea" value={f.questions} onChange={set("questions")} /></Field>
            <div><button className="btn">{open?.form ? "Update my check-in" : "Send check-in"}</button></div>
          </form>
        </div>
      )}

      {(plan.checkinDays || sent.length > 0) && <div className="panel">
        <h2 data-h="3" style={{ marginBottom: 12 }}>From your coach</h2>
        {sent.length === 0 ? (
          <p className="muted">Your check-in replies will appear here.</p>
        ) : (
          <div className="stack">
            {sent.map((k) => (
              <article key={k.id} style={{ paddingBottom: 16, borderBottom: "1px solid var(--rule-soft)" }}>
                <div className="small muted">{fmtDate(k.sent_at?.slice(0, 10), { day: "numeric", month: "long" })}</div>
                <p style={{ marginTop: 6 }}>{k.message}</p>
                {k.changes?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <b className="small">What changed</b>
                    <ul className="changes small">{k.changes.map((c) => <li key={c}>{c}</li>)}</ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>}

      <div className="panel">
        <h2 data-h="3" style={{ marginBottom: 12 }}>Messages</h2>
        <div className="stack" style={{ "--gap": "8px" }}>
          {d.messages.map((m) => (
            <div key={m.id} style={{ justifySelf: m.from === "client" ? "end" : "start", maxWidth: "80%", background: m.from === "client" ? "var(--ink)" : "var(--paper-2)", color: m.from === "client" ? "var(--paper)" : "var(--ink)", padding: "10px 14px", borderRadius: 14, marginLeft: m.from === "client" ? "auto" : 0, width: "fit-content" }}>
              {m.body}
            </div>
          ))}
        </div>
        <form
          className="row"
          style={{ marginTop: 14 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!msg.trim()) return;
            await api.sendMessage(msg.trim());
            setMsg("");
            reload();
          }}
        >
          <input className="input" style={{ flex: 1 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message your coach" aria-label="Message your coach" />
          <button className="btn ink">Send</button>
        </form>
      </div>
    </div>
  );
}

// One-off clients have no check-ins, so they get the same rules the coach uses, written simply (Coaching Rules, section 4).
const ADJUST = [
  ["Your weight", [
    "Weigh in most mornings, after the toilet and before food. Look at the weekly average, not single days.",
    "Ignore the jump in the first week of a new plan. It's water and food, not fat.",
  ]],
  ["Losing fat", [
    "Losing less than 0.25% of your weight a week for 2 weeks, and sticking to the plan? Eat 100–200 kcal less (from carbs or fat), or walk about 2,000 more steps a day.",
    "Losing more than 1% a week? Eat 100–200 kcal more.",
    "Dieting for 8–12 weeks, or hunger, mood or training falling apart? Have 1–2 weeks at maintenance.",
  ]],
  ["Building muscle", [
    "Not gaining for 2–3 weeks? Eat 100–200 kcal more.",
    "Gaining more than about 0.5% of your weight a week? Eat 100–200 kcal less.",
  ]],
  ["Your lifts", [
    "Hit the top of the rep range on every set? Add the smallest weight jump next time.",
    "Stuck for 2–3 weeks while sleeping and eating well? Check you're 0–2 reps from failure, then change the rep range or swap the exercise.",
    "Lifts dropping 2 sessions in a row, joints aching, sleeping badly? Take an easy week: half the sets, 3–4 reps from failure.",
    "Pain, not just effort? Swap the exercise. If it lasts, see a GP or physio.",
  ]],
  ["Sticking to it", [
    "Doing less than about 4 in 5 sessions or food days? Make the plan easier to fit your life before you change the numbers.",
  ]],
];

function SelfAdjust() {
  return (
    <div className="panel">
      <div className="panel-head"><h2 data-h="3">Adjust it yourself</h2><span className="small muted">The rules your coach uses</span></div>
      <div className="stack" style={{ "--gap": "16px" }}>
        {ADJUST.map(([title, items]) => (
          <div key={title}>
            <b>{title}</b>
            <ul className="adjust-list">{items.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}
