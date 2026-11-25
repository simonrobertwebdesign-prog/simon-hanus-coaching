import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { go } from "../lib/router";
import { planById } from "../config";
import { Brand, Empty, Field, Icon, Loading, Modal, Plate, PlanChip, useToast } from "../components/ui";
import { LineChart, Bars } from "../components/Chart";
import { PhotoCompare } from "../components/PhotoCompare";
import { adherence, bodySummary, checkinState, checkinSummary, lastLogged, lifts, sheetRow, startingCalories, strengthSeries, weeklySessions } from "../lib/insights";
import { cx, fmtDate, fmtDay, initials, kg, relDay, today } from "../lib/util";
import { installAgent } from "../lib/agent";

export function Coach({ route }) {
  const [counts, setCounts] = useState({ approvals: 0 });
  const refreshCounts = useCallback(async () => {
    const a = await api.approvals();
    setCounts({ approvals: a.plans.length + a.checkins.length });
  }, []);
  useEffect(() => {
    refreshCounts();
    installAgent();
  }, [route]);

  const NAV = [
    ["coach", "Clients", "clients"],
    ["coach-approvals", "Approvals", "approvals", counts.approvals],
  ];
  let page;
  if (route === "coach-approvals") page = <Approvals onChange={refreshCounts} />;
  else if (route.startsWith("coach-client-")) page = <ClientDetail id={route.slice(13)} onChange={refreshCounts} />;
  else page = <Sheet />;

  return (
    <div className="app">
      <aside className="side">
        <Brand light onClick={() => go("home")} />
        <nav aria-label="Coach area">
          {NAV.map(([r, label, icon, n]) => (
            <button key={r} aria-current={route === r ? "page" : undefined} onClick={() => go(r)}>
              <Icon name={icon} /> {label} {n ? <span className="count">{n}</span> : null}
            </button>
          ))}
        </nav>
        <div className="foot">
          <span style={{ color: "#8f9aa5" }}>Coach: Simon</span>
          <button onClick={async () => { await api.signOut(); go("home"); }}>Log out</button>
        </div>
      </aside>
      <main className="main">
        <div className="mobile-top">
          <Brand onClick={() => go("home")} />
          <button className="textbtn" onClick={async () => { await api.signOut(); go("home"); }}>Log out</button>
        </div>
        {page}
      </main>
      <nav className="tabbar" aria-label="Coach area">
        {NAV.map(([r, label, icon, n]) => (
          <button key={r} aria-current={route === r ? "page" : undefined} onClick={() => go(r)}>
            <Icon name={icon} />
            {label}
            {n ? <span className="count">{n}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ---------------- the client sheet ----------------
function Sheet() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    (async () => {
      const [clients, appr] = await Promise.all([api.clients(), api.approvals()]);
      const drafts = new Set(appr.plans.map((p) => p.client_id));
      const out = await Promise.all(
        clients.map(async (c) => {
          const [w, b] = await Promise.all([api.workouts(c.id), api.bodyLogs(c.id)]);
          const bs = bodySummary(b);
          return { ...sheetRow(c, { hasDrafts: drafts.has(c.id) }), last: lastLogged(w), sessions14: w.filter((x) => x.date >= addDaysLocal(-13)).length, rate: bs?.rate };
        })
      );
      setRows(out);
    })();
  }, []);
  if (!rows) return <Loading />;
  const groups = {
    all: rows,
    due: rows.filter((r) => r.checkin?.due),
    todo: rows.filter((r) => r.todo && r.todo !== "Check-in due"),
    active: rows.filter((r) => r.status === "active"),
  };
  const shown = groups[filter];
  const exportCsv = () => {
    const head = ["Name", "Email", "Plan", "Status", "Started", "Next check-in", "Last workout", "Sessions (14 days)", "Flags"];
    const lines = rows.map((r) => [r.full_name, r.email, r.planName, r.status, r.start_date || "", r.next_checkin || "", r.last || "", r.sessions14, (r.flags || []).join("; ")]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    navigator.clipboard?.writeText(csv);
  };
  return (
    <>
      <div className="main-head">
        <div>
          <h1>Clients</h1>
          <p>{groups.active.length} coaching now. {groups.due.length} check-in{groups.due.length === 1 ? "" : "s"} due. {groups.todo.length} need something from you.</p>
        </div>
        <button className="btn sm ghost" onClick={exportCsv}>Copy as spreadsheet</button>
      </div>
      <div className="filters" role="group" aria-label="Filter clients">
        {[["all", "All"], ["due", "Check-in due"], ["todo", "Needs you"], ["active", "Coaching now"]].map(([k, l]) => (
          <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {l}
            {k !== "all" && groups[k].length ? <span className="n">{groups[k].length}</span> : null}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="panel"><Empty title="Nobody here">Nothing in this list right now.</Empty></div>
      ) : (
        <div className="sheet-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th>Client</th><th>Plan</th><th>To do</th><th>Started</th><th>Next check-in</th><th>Last workout</th><th>Sessions, 14 days</th><th>Weight a week</th><th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} onClick={() => go("coach-client-" + r.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && go("coach-client-" + r.id)}>
                  <td><span className="who"><span className="avatar">{initials(r.full_name)}</span>{r.full_name}</span></td>
                  <td><PlanChip plan={r.plan} /></td>
                  <td>{r.todo ? <span className={cx("chip", r.todo === "Check-in due" ? "red" : r.todo === "Not paid yet" ? "" : "amber")}>{r.todo}</span> : <span className="chip green">On track</span>}</td>
                  <td>{fmtDate(r.start_date)}</td>
                  <td>{r.checkin ? <span className={r.checkin.due ? "down" : ""} style={{ fontWeight: r.checkin.due ? 800 : 400 }}>{relDay(r.checkin.date)}</span> : "—"}</td>
                  <td>{r.last ? relDay(r.last) : "—"}</td>
                  <td>{r.status === "active" ? r.sessions14 : "—"}</td>
                  <td>{r.rate != null ? `${r.rate > 0 ? "+" : ""}${r.rate.toFixed(2)} kg` : "—"}</td>
                  <td>{r.flags?.length ? <span className="chip amber">{r.flags.length} flag{r.flags.length > 1 ? "s" : ""}</span> : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function addDaysLocal(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------------- approvals ----------------
function Approvals({ onChange }) {
  const [a, setA] = useState(null);
  const load = useCallback(async () => {
    setA(await api.approvals());
    onChange?.();
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!a) return <Loading />;
  const total = a.plans.length + a.checkins.length;
  return (
    <>
      <div className="main-head">
        <div>
          <h1>Approvals</h1>
          <p>Nothing reaches a client until you say yes.</p>
        </div>
      </div>
      {total === 0 && <div className="panel"><Empty title="All done">No plans or check-ins waiting for you.</Empty></div>}
      {a.checkins.map((k) => <CheckinApproval key={k.id} k={k} onDone={load} />)}
      {a.plans.map((p) => <PlanApproval key={p.id} p={p} onDone={load} />)}
    </>
  );
}

function Decide({ onApprove, onChanges, approveLabel = "Yes, send it" }) {
  const [asking, setAsking] = useState(false);
  const [fb, setFb] = useState("");
  return (
    <div className="approval-foot">
      {asking ? (
        <>
          <Field label="What should change?" hint="Claude will redo it using your notes, and learn from them for next time.">
            <textarea className="textarea" value={fb} onChange={(e) => setFb(e.target.value)} autoFocus />
          </Field>
          <div className="row">
            <button className="btn ink" disabled={!fb.trim()} onClick={() => onChanges(fb.trim())}>Send back to redo</button>
            <button className="textbtn" onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <div className="row">
          <button className="btn" onClick={onApprove}>{approveLabel}</button>
          <button className="btn ghost" onClick={() => setAsking(true)}>No, change it</button>
        </div>
      )}
    </div>
  );
}

function PlanApproval({ p, onDone }) {
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  return (
    <section className="approval">
      <div className="approval-head">
        <div className="row">
          <span className="avatar">{initials(p.client?.full_name)}</span>
          <div>
            <h2 className="approval-title">{p.client?.full_name}: new {p.kind === "training" ? "training" : "food"} plan</h2>
            <div className="small muted">{planById(p.client?.plan).name}. Drafted by {p.created_by === "claude" ? "Claude" : "you"}, {fmtDate(p.created_at?.slice(0, 10))}</div>
          </div>
        </div>
        <div className="row">
          <button className="textbtn" onClick={() => go("coach-client-" + p.client_id)}>Open client</button>
          <button className="btn sm ghost" onClick={() => setEdit(true)}>Edit</button>
        </div>
      </div>
      <div className="approval-body">
        {p.why?.length > 0 && (
          <div>
            <h3 data-h="4" style={{ marginBottom: 10 }}>Why it's built like this</h3>
            <div className="why">
              {p.why.map((w, i) => (
                <div className="why-item" key={i}>
                  <b>{w.point}</b>
                  <p><span>Why: </span>{w.why}</p>
                  <p><span>Effect: </span>{w.effect}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {p.kind === "training" ? <TrainingPreview c={p.content} /> : <FoodPreview c={p.content} />}
      </div>
      <Decide
        approveLabel="Yes, put it live"
        onApprove={async () => { await api.approvePlan(p.id); toast("Plan is live for " + p.client?.full_name.split(" ")[0]); onDone(); }}
        onChanges={async (fb) => { await api.requestPlanChanges(p.id, fb); toast("Sent back with your notes"); onDone(); }}
      />
      {edit && <PlanEditor plan={p} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); onDone(); }} />}
    </section>
  );
}

function CheckinApproval({ k, onDone }) {
  const toast = useToast();
  const [message, setMessage] = useState(k.message || "");
  const [editing, setEditing] = useState(false);
  return (
    <section className={cx("approval", k.big_change && "big")}>
      <div className="approval-head">
        <div className="row">
          <span className="avatar">{initials(k.client?.full_name)}</span>
          <div>
            <h2 className="approval-title">{k.client?.full_name}: check-in</h2>
            <div className="small muted">Due {fmtDate(k.due_date)}</div>
          </div>
        </div>
        <div className="row">
          {k.big_change && <span className="chip red">Big change: needs your eye</span>}
          <button className="textbtn" onClick={() => go("coach-client-" + k.client_id)}>Open client</button>
        </div>
      </div>
      <div className="approval-body">
        {k.report && (
          <div>
            <h3 data-h="4" style={{ marginBottom: 8 }}>Report for you</h3>
            <p>{k.report}</p>
          </div>
        )}
        {k.changes?.length > 0 && (
          <div>
            <h3 data-h="4" style={{ marginBottom: 8 }}>Changes to the plan</h3>
            <ul className="changes">{k.changes.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
        <div>
          <div className="row between" style={{ marginBottom: 8 }}>
            <h3 data-h="4">Message to {k.client?.full_name.split(" ")[0]}</h3>
            <button className="link small" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit message"}</button>
          </div>
          {editing ? <textarea className="textarea" style={{ minHeight: 160 }} value={message} onChange={(e) => setMessage(e.target.value)} /> : <p className="quote">{message}</p>}
        </div>
        {k.form && (
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Their check-in answers</summary>
            <FormAnswers form={k.form} />
          </details>
        )}
      </div>
      <Decide
        onApprove={async () => {
          if (message !== k.message) await api.saveCheckinDraft({ ...k, message });
          await api.approveCheckin(k.id);
          toast("Check-in sent");
          onDone();
        }}
        onChanges={async (fb) => { await api.requestCheckinChanges(k.id, fb); toast("Sent back with your notes"); onDone(); }}
      />
    </section>
  );
}

function FormAnswers({ form }) {
  const rows = [
    ["Weight", form.weight && kg(form.weight)], ["Sleep", form.sleep && form.sleep + " h"], ["Energy", form.energy && form.energy + "/5"],
    ["Hunger", form.hunger && form.hunger + "/5"], ["Food plan followed", form.adherence && form.adherence + "%"],
    ["Wins", form.wins], ["Struggles", form.struggles], ["Questions", form.questions],
  ].filter(([, v]) => v);
  return (
    <table className="ex-table" style={{ marginTop: 10 }}>
      <tbody>{rows.map(([k, v]) => <tr key={k}><td style={{ width: 170 }}>{k}</td><td style={{ fontWeight: 400 }}>{v}</td></tr>)}</tbody>
    </table>
  );
}

function TrainingPreview({ c }) {
  return (
    <div className="stack">
      <div>
        <h2 data-h="3">{c.title}</h2>
        <p className="muted" style={{ marginTop: 4 }}>{c.summary}</p>
        <p className="small" style={{ marginTop: 6 }}><b>When:</b> {c.schedule}. <b>Effort:</b> {c.effort}</p>
      </div>
      <div className="cols" style={{ "--n": Math.min(3, c.days.length) }}>
        {c.days.map((d) => (
          <div key={d.name} className="panel" style={{ padding: 14 }}>
            <b>{d.name}</b>
            <div className="small muted">{d.focus}</div>
            <table className="ex-table small" style={{ marginTop: 6 }}>
              <tbody>{d.exercises.map((e) => <tr key={e.name}><td style={{ padding: "6px 4px" }}>{e.name}</td><td style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>{e.sets} × {e.reps}</td></tr>)}</tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function FoodPreview({ c }) {
  return (
    <div className="stack">
      <div className="row between">
        <div><h2 data-h="3">{c.title}</h2><p className="muted" style={{ marginTop: 4 }}>{c.summary}</p></div>
        <span className="chip">{c.calories} kcal, P {c.protein_g} g, C {c.carbs_g} g, F {c.fat_g} g</span>
      </div>
      <div>
        {c.meals.map((m) => (
          <div className="meal" key={m.name}>
            <b>{m.name}</b>
            <ul>{m.items.map((it, i) => <li key={i}><span>{it.food}</span><span>{it.amount}</span></li>)}</ul>
          </div>
        ))}
      </div>
      {c.supplements?.length > 0 && (
        <div className="meal">
          <b>Supplements</b>
          <ul>{c.supplements.map((s, i) => <li key={i}><span>{s.name}{s.why ? ` (${s.why})` : ""}</span><span>{s.dose}, {s.when}</span></li>)}</ul>
        </div>
      )}
      {c.shopping?.length > 0 && (
        <div className="meal">
          <b>Shopping list</b>
          <ul>{c.shopping.map((s, i) => <li key={i}><span>{s.shop ? `${s.shop}: ` : ""}{s.item}</span><span>{s.amount}{s.price ? `, ${s.price}` : ""}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ---------------- one client ----------------
function ClientDetail({ id, onChange }) {
  const [b, setB] = useState(null);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const load = useCallback(async () => setB(await api.bundle(id)), [id]);
  useEffect(() => { load(); }, [load]);
  if (!b) return <Loading />;
  if (!b.client) return <Empty title="Client not found" />;
  const c = b.client;
  const live = (k) => b.plans.find((p) => p.kind === k && p.status === "live");
  const ck = checkinState(c);
  const tabs = [["overview", "Overview"], ["answers", "Answers"], ["training", "Training"], ["food", "Food"], ["checkins", "Check-ins"], ["photos", "Photos"], ["messages", "Messages"]];

  return (
    <>
      <div className="main-head">
        <div className="row" style={{ gap: 16 }}>
          <Plate plan={c.plan} size={56} />
          <div>
            <h1>{c.full_name}</h1>
            <p>{planById(c.plan).name}. {c.start_date ? `Started ${fmtDate(c.start_date, { day: "numeric", month: "long" })}.` : "Not started yet."} {ck ? `Next check-in ${relDay(ck.date).toLowerCase()}.` : ""}</p>
          </div>
        </div>
        <button className="textbtn" onClick={() => go("coach")}>All clients</button>
      </div>

      {c.status === "paid" && !c.payment_confirmed && (
        <div className="notice amber" style={{ marginBottom: 16 }}>
          <b>Payment not checked yet.</b> Claude checks Stripe before making plans.{" "}
          <button className="link" onClick={async () => { await api.confirmPayment(c.id); toast("Marked as paid"); load(); }}>Mark as paid</button>
        </div>
      )}
      {c.flags?.length > 0 && (
        <div className="notice amber" style={{ marginBottom: 16 }}>
          <b>Health flags:</b> {c.flags.join(". ")}
        </div>
      )}

      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "overview" && <Overview b={b} reload={load} />}
      {tab === "answers" && <Answers a={b.answers} />}
      {(tab === "training" || tab === "food") && (
        <PlansTab
          kind={tab === "training" ? "training" : "nutrition"}
          plans={b.plans}
          onEdit={(p) => setEditing(p)}
          onNew={() => setEditing({ client_id: c.id, kind: tab === "training" ? "training" : "nutrition", content: live(tab === "training" ? "training" : "nutrition")?.content || null })}
        />
      )}
      {tab === "checkins" && <CheckinsTab b={b} />}
      {tab === "photos" && <PhotosTab photos={b.photos} />}
      {tab === "messages" && <MessagesTab b={b} reload={load} />}
      {editing && (
        <PlanEditor
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); onChange?.(); }}
        />
      )}
    </>
  );
}

function Overview({ b, reload }) {
  const s = useMemo(() => checkinSummary(b), [b]);
  const training = b.plans.find((p) => p.kind === "training" && p.status === "live");
  const adh = adherence(b.workouts, training, 14);
  const list = lifts(b.workouts);
  const [notes, setNotes] = useState(b.client.coach_notes || "");
  const toast = useToast();
  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      <div className="stats">
        <div className="stat"><span>Sessions, last 2 weeks</span><b>{adh ? `${adh.done}/${adh.planned}` : "—"}</b><small>{adh ? `${adh.missed} missed` : "No plan yet"}</small></div>
        <div className="stat"><span>Bodyweight now</span><b>{s.body ? kg(s.body.avgNow) : "—"}</b><small>7-day average</small></div>
        <div className="stat"><span>Per week</span><b>{s.body?.rate != null ? `${s.body.rate > 0 ? "+" : ""}${s.body.rate.toFixed(2)} kg` : "—"}</b></div>
        <div className="stat"><span>Lifts up / stalled</span><b>{list.filter((l) => l.change > 0).length} / {list.filter((l) => l.stalled).length}</b></div>
      </div>
      <div className="cols">
        <div className="panel">
          <div className="panel-head"><h2 data-h="3">Bodyweight</h2></div>
          {s.body ? <LineChart series={[{ name: "Weigh-ins", colour: "var(--muted)", points: s.body.points, faint: true, width: 1.5 }, { name: "Trend", colour: "var(--red)", points: s.body.smooth }]} showDots={false} height={200} /> : <p className="muted">No weigh-ins.</p>}
        </div>
        <div className="panel">
          <div className="panel-head"><h2 data-h="3">Sessions a week</h2></div>
          <Bars data={weeklySessions(b.workouts, 8)} target={training?.content?.days_per_week} height={200} />
        </div>
      </div>
      {list.length > 0 && (
        <div className="panel">
          <h2 data-h="3" style={{ marginBottom: 12 }}>Lifts</h2>
          <table className="ex-table">
            <thead><tr><th>Exercise</th><th>Start</th><th>Now</th><th>Change</th><th>Last 3 sessions</th></tr></thead>
            <tbody>
              {list.slice(0, 10).map((l) => (
                <tr key={l.name}>
                  <td>{l.name}</td>
                  <td>{l.first.set.weight}×{l.first.set.reps}</td>
                  <td>{l.last.set.weight}×{l.last.set.reps}</td>
                  <td className={l.change > 0 ? "up" : l.change < 0 ? "down" : ""}>{l.change > 0 ? "+" : ""}{l.change.toFixed(0)}%</td>
                  <td>{l.stalled ? <span className="chip amber">Stalled</span> : <span className="chip green">Moving</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="panel">
        <div className="panel-head"><h2 data-h="3">Recent workouts</h2></div>
        <div className="hist">
          {b.workouts.slice(0, 6).map((w) => (
            <div key={w.id} className="hist-row">
              <span className="small muted">{fmtDay(w.date)}</span>
              <span><b>{w.day_name}</b><span className="small muted">{(w.entries || []).slice(0, 3).map((e) => { const s = e.sets.filter((x) => x.done); return s.length ? `${e.exercise} ${s[0].weight}×${s.map((x) => x.reps).join("/")}` : null; }).filter(Boolean).join(", ")}</span></span>
              {w.notes ? <span className="chip blue">Note</span> : <span />}
            </div>
          ))}
          {!b.workouts.length && <p className="muted">Nothing logged yet.</p>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h2 data-h="3">Your notes on {b.client.full_name.split(" ")[0]}</h2><span className="small muted">Only you and Claude see these</span></div>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn sm ink" style={{ marginTop: 10 }} onClick={async () => { await api.updateClient(b.client.id, { coach_notes: notes }); toast("Notes saved"); reload(); }}>Save notes</button>
      </div>
    </div>
  );
}

const LABELS = {
  age: "Age", sex: "Sex", height_cm: "Height (cm)", weight_kg: "Weight (kg)",
  goal: "Goal", cut_pace: "Cut pace", target: "Specific goal", event: "Date to aim for", compete: "Compete", goal_weight: "Goal weight", waist: "Waist", body_now: "Body now", why_now: "Why now", holding_back: "Held back by", coached_before: "Coached before",
  experience: "Training for", consistent: "Last 3 months", days: "Days a week", train_days: "Days that work", session: "Session length", where: "Trains at", gym_name: "Gym", equipment: "Kit", dumbbell_max: "Heaviest weights",
  routine: "Current training", lifts: "Best lifts", style_pref: "Likes to train", priority: "Priority muscles", likes_ex: "Loves", dislikes_ex: "Won't / can't do", cardio_likes: "Cardio they like", injuries: "Injuries",
  work: "Job / day", steps: "Steps", other_activity: "Other sport / cardio", sleep: "Sleep", stress: "Stress", train_time: "Trains at (time)",
  weight_trend: "Weight, last month", dieting: "Dieting now", tracking: "Tracks calories", calories_now: "Calories now (kcal)", protein_now: "Protein now (g)",
  maintenance_known: "Their maintenance (kcal)", scales: "Scales at home", eating_out: "Eats out", food_style: "Food style", supps_open: "Supplements in plan", shops: "Shops at", shops_other: "Other shop", shop_size: "Store size", shop_where: "Store / town",
  diet: "Diet", allergies: "Allergies", likes: "Foods loved", dislikes: "Won't eat", normal_day: "Normal day of eating", meals: "Meals a day", cooking: "Cooking", budget: "Budget", alcohol: "Alcohol", supplements: "Supplements",
  health_details: "Health details", peds: "Steroids / PEDs", peds_details: "PED details",
  guardian_name: "Parent / guardian", guardian_email: "Guardian email",
  anything_else: "Anything else", found_us: "Found us through",
};

function Answers({ a }) {
  if (!a) return <div className="panel"><Empty title="No answers">This client hasn't filled in the questionnaire.</Empty></div>;
  const rows = Object.entries(LABELS).filter(([k]) => a[k] !== undefined && a[k] !== "" && !(Array.isArray(a[k]) && !a[k].length));
  const yes = Object.entries(a.health || {}).filter(([, v]) => v === "Yes" || v === true).map(([k]) => k);
  const sc = startingCalories(a);
  return (
    <div className="stack" style={{ "--gap": "16px" }}>
    {sc && (
      <div className="panel">
        <div className="panel-head"><h2 data-h="3">Starting point</h2><span className="small muted">From their answers</span></div>
        <div className="stats">
          <div className="stat"><span>Maintenance guess</span><b>{sc.formula[0].toLocaleString()}–{sc.formula[1].toLocaleString()}</b><small>kcal, {a.weight_kg} kg {sc.multiplier}</small></div>
          <div className="stat"><span>From their tracking</span><b>{sc.tracked ? sc.tracked.toLocaleString() : "—"}</b><small>{sc.trackedFrom || (a.calories_now ? `eats ${(+a.calories_now).toLocaleString()} kcal, weight ${String(a.weight_trend || "unknown").toLowerCase()}` : "doesn't track")}</small></div>
          <div className="stat"><span>Suggested start</span><b>{sc.suggest ? `${sc.suggest.range[0].toLocaleString()}–${sc.suggest.range[1].toLocaleString()}` : "—"}</b><small>{sc.suggest ? `kcal, ${sc.suggest.why}` : "goal: coach decides"}</small></div>
          <div className="stat"><span>Protein</span><b>{sc.protein[0]}–{sc.protein[1]} g</b><small>1.6–2.2 g per kg of {sc.proteinFrom}{a.protein_now ? `, eats ${a.protein_now} g now` : ""}</small></div>
        </div>
      </div>
    )}
    <div className="panel">
      <table className="ex-table">
        <tbody>
          {rows.map(([k, l]) => <tr key={k}><td style={{ width: 200 }}>{l}</td><td style={{ fontWeight: 400 }}>{Array.isArray(a[k]) ? a[k].join(", ") : String(a[k])}</td></tr>)}
          <tr><td>Health check</td><td style={{ fontWeight: 400 }}>{yes.length ? <span className="chip amber">Yes to: {yes.join(", ")}</span> : "All no"}</td></tr>
        </tbody>
      </table>
    </div>
    </div>
  );
}

function PlansTab({ kind, plans, onEdit, onNew }) {
  const mine = plans.filter((p) => p.kind === kind).sort((a, b) => (b.version || 0) - (a.version || 0));
  const live = mine.find((p) => p.status === "live");
  const label = kind === "training" ? "training" : "food";
  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      <div className="row between">
        <span className="muted">{mine.length} version{mine.length === 1 ? "" : "s"}</span>
        <button className="btn sm ink" onClick={onNew}>{live ? `Change the ${label} plan` : `Write a ${label} plan`}</button>
      </div>
      {mine.length === 0 && <div className="panel"><Empty title={`No ${label} plan yet`}>Claude drafts one after payment is confirmed, or write one yourself.</Empty></div>}
      {mine.map((p) => (
        <div key={p.id} className="panel">
          <div className="panel-head">
            <div className="row">
              <b>Version {p.version}</b>
              <span className={cx("chip", p.status === "live" ? "green" : p.status === "draft" ? "amber" : p.status === "changes_requested" ? "red" : "")}>
                {{ live: "Live", draft: "Waiting for you", changes_requested: "Being redone", archived: "Old" }[p.status]}
              </span>
            </div>
            {p.status !== "archived" && <button className="btn sm ghost" onClick={() => onEdit(p)}>Edit</button>}
          </div>
          {p.feedback && <div className="notice amber" style={{ marginBottom: 12 }}><b>Your feedback:</b> {p.feedback}</div>}
          {p.status !== "archived" && (kind === "training" ? <TrainingPreview c={p.content} /> : <FoodPreview c={p.content} />)}
        </div>
      ))}
    </div>
  );
}

function CheckinsTab({ b }) {
  if (!planById(b.client.plan).checkinDays) return <div className="panel"><Empty title="No check-ins">One-off plans don't include check-ins.</Empty></div>;
  return (
    <div className="stack" style={{ "--gap": "16px" }}>
      {b.checkins.length === 0 && <div className="panel"><Empty title="No check-ins yet" /></div>}
      {b.checkins.map((k) => (
        <div key={k.id} className={cx("panel", k.big_change && k.status !== "sent" && "big")}>
          <div className="panel-head">
            <b>{fmtDate(k.due_date, { day: "numeric", month: "long" })}</b>
            <span className={cx("chip", k.status === "sent" ? "green" : k.status === "awaiting_approval" ? "amber" : k.status === "changes_requested" ? "red" : "blue")}>
              {{ sent: "Sent", awaiting_approval: "Waiting for you", changes_requested: "Being redone", submitted: "Form in, reply to write" }[k.status]}
            </span>
          </div>
          {k.report && <p><b>Report: </b>{k.report}</p>}
          {k.message && <p className="quote" style={{ marginTop: 10 }}>{k.message}</p>}
          {k.changes?.length > 0 && <ul className="changes small" style={{ marginTop: 10 }}>{k.changes.map((c) => <li key={c}>{c}</li>)}</ul>}
          {k.form && <details style={{ marginTop: 10 }}><summary style={{ cursor: "pointer", fontWeight: 700 }}>Their answers</summary><FormAnswers form={k.form} /></details>}
        </div>
      ))}
    </div>
  );
}

function PhotosTab({ photos }) {
  const angles = ["front", "side", "back"].filter((a) => photos.some((p) => p.angle === a));
  const [angle, setAngle] = useState(angles[0]);
  const list = photos.filter((p) => p.angle === angle);
  if (!photos.length) return <div className="panel"><Empty title="No photos yet" /></div>;
  return (
    <div className="panel">
      <div className="filters">{angles.map((a) => <button key={a} aria-pressed={a === angle} onClick={() => setAngle(a)}>{a[0].toUpperCase() + a.slice(1)}</button>)}</div>
      <div className="cols" style={{ alignItems: "start" }}>
        {list.length >= 2 ? <PhotoCompare before={list[0]} after={list[list.length - 1]} /> : <p className="muted">Needs two {angle} photos to compare.</p>}
        <div className="thumbs">{list.map((p) => <div key={p.id} className="thumb"><img src={p.url} alt={`${angle} ${fmtDate(p.date)}`} /><span>{fmtDate(p.date)}</span></div>)}</div>
      </div>
    </div>
  );
}

function MessagesTab({ b, reload }) {
  const [msg, setMsg] = useState("");
  return (
    <div className="panel">
      <div className="stack" style={{ "--gap": "8px" }}>
        {b.messages.length === 0 && <p className="muted">No messages yet.</p>}
        {b.messages.map((m) => (
          <div key={m.id} style={{ marginLeft: m.from === "coach" ? "auto" : 0, width: "fit-content", maxWidth: "80%", background: m.from === "coach" ? "var(--ink)" : "var(--paper-2)", color: m.from === "coach" ? "var(--paper)" : "var(--ink)", padding: "10px 14px", borderRadius: 14 }}>
            {m.body}
          </div>
        ))}
      </div>
      <form className="row" style={{ marginTop: 14 }} onSubmit={async (e) => { e.preventDefault(); if (!msg.trim()) return; await api.coachMessage(b.client.id, msg.trim()); setMsg(""); reload(); }}>
        <input className="input" style={{ flex: 1 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={`Message ${b.client.full_name.split(" ")[0]}`} aria-label="Message" />
        <button className="btn ink">Send</button>
      </form>
    </div>
  );
}

// ---------------- plan editor ----------------
const blankTraining = { title: "", summary: "", days_per_week: 3, schedule: "", effort: "", progression: "", days: [{ name: "Day 1", focus: "", exercises: [{ name: "", sets: 3, reps: "8-12", rest: "2 min", notes: "" }] }], notes: [] };
const blankFood = { title: "", summary: "", calories: 2200, protein_g: 150, carbs_g: 240, fat_g: 70, water_l: 3, meals: [{ name: "Breakfast", items: [{ food: "", amount: "" }] }], supplements: [], swaps: [], notes: [] };

function PlanEditor({ plan, onClose, onSaved }) {
  const toast = useToast();
  const isTraining = plan.kind === "training";
  const [c, setC] = useState(() => structuredClone(plan.content || (isTraining ? blankTraining : blankFood)));
  const set = (k, v) => setC((x) => ({ ...x, [k]: v }));
  const lines = (k) => (c[k] || []).join("\n");

  async function save(status) {
    await api.savePlan({ id: plan.id, client_id: plan.client_id, kind: plan.kind, content: c, why: plan.why || [], status, created_by: "coach" });
    toast(status === "live" ? "Saved and live" : "Saved");
    onSaved();
  }

  return (
    <Modal onClose={onClose} label="Edit plan">
      <h2 data-h="3" style={{ fontSize: "1.5rem" }}>{isTraining ? "Training plan" : "Food plan"}</h2>
      <div className="stack" style={{ "--gap": "14px", marginTop: 16 }}>
        <Field label="Title"><input className="input" value={c.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Summary for the client"><textarea className="textarea" value={c.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
        {isTraining ? (
          <>
            <div className="two">
              <Field label="Days a week"><input className="input" type="number" value={c.days_per_week} onChange={(e) => set("days_per_week", +e.target.value)} /></Field>
              <Field label="When"><input className="input" value={c.schedule} onChange={(e) => set("schedule", e.target.value)} /></Field>
            </div>
            <Field label="How hard"><input className="input" value={c.effort} onChange={(e) => set("effort", e.target.value)} /></Field>
            <Field label="Getting stronger"><input className="input" value={c.progression} onChange={(e) => set("progression", e.target.value)} /></Field>
            {c.days.map((d, di) => (
              <div key={di} className="panel" style={{ padding: 14 }}>
                <div className="row">
                  <input className="input" style={{ flex: 1 }} value={d.name} aria-label="Day name" onChange={(e) => set("days", c.days.map((x, i) => (i === di ? { ...x, name: e.target.value } : x)))} />
                  <input className="input" style={{ flex: 1 }} value={d.focus} placeholder="Focus" aria-label="Focus" onChange={(e) => set("days", c.days.map((x, i) => (i === di ? { ...x, focus: e.target.value } : x)))} />
                  <button className="x" aria-label="Remove day" onClick={() => set("days", c.days.filter((_, i) => i !== di))}>✕</button>
                </div>
                <table className="ed-table" style={{ marginTop: 8 }}>
                  <thead><tr><th>Exercise</th><th style={{ width: 64 }}>Sets</th><th style={{ width: 96 }}>Reps</th><th style={{ width: 90 }}>Rest</th><th>Note</th><th /></tr></thead>
                  <tbody>
                    {d.exercises.map((e, ei) => {
                      const up = (k, v) => set("days", c.days.map((x, i) => (i !== di ? x : { ...x, exercises: x.exercises.map((y, j) => (j === ei ? { ...y, [k]: v } : y)) })));
                      return (
                        <tr key={ei}>
                          <td><input className="input" value={e.name} onChange={(ev) => up("name", ev.target.value)} aria-label="Exercise" /></td>
                          <td><input className="input" type="number" value={e.sets} onChange={(ev) => up("sets", +ev.target.value)} aria-label="Sets" /></td>
                          <td><input className="input" value={e.reps} onChange={(ev) => up("reps", ev.target.value)} aria-label="Reps" /></td>
                          <td><input className="input" value={e.rest} onChange={(ev) => up("rest", ev.target.value)} aria-label="Rest" /></td>
                          <td><input className="input" value={e.notes || ""} onChange={(ev) => up("notes", ev.target.value)} aria-label="Note" /></td>
                          <td><button className="x" aria-label="Remove exercise" onClick={() => set("days", c.days.map((x, i) => (i !== di ? x : { ...x, exercises: x.exercises.filter((_, j) => j !== ei) })))}>✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button className="textbtn small" onClick={() => set("days", c.days.map((x, i) => (i !== di ? x : { ...x, exercises: [...x.exercises, { name: "", sets: 3, reps: "8-12", rest: "2 min", notes: "" }] })))}>+ Add exercise</button>
              </div>
            ))}
            <button className="btn sm ghost" onClick={() => set("days", [...c.days, { name: `Day ${c.days.length + 1}`, focus: "", exercises: [] }])}>+ Add day</button>
          </>
        ) : (
          <>
            <div className="cols" style={{ "--n": 5, gap: 10 }}>
              {[["calories", "kcal"], ["protein_g", "Protein g"], ["carbs_g", "Carbs g"], ["fat_g", "Fat g"], ["water_l", "Water L"]].map(([k, l]) => (
                <Field key={k} label={l}><input className="input" type="number" value={c[k]} onChange={(e) => set(k, +e.target.value)} /></Field>
              ))}
            </div>
            {c.meals.map((m, mi) => (
              <div key={mi} className="panel" style={{ padding: 14 }}>
                <div className="row">
                  <input className="input" style={{ flex: 1 }} value={m.name} aria-label="Meal name" onChange={(e) => set("meals", c.meals.map((x, i) => (i === mi ? { ...x, name: e.target.value } : x)))} />
                  <button className="x" aria-label="Remove meal" onClick={() => set("meals", c.meals.filter((_, i) => i !== mi))}>✕</button>
                </div>
                <table className="ed-table" style={{ marginTop: 8 }}>
                  <tbody>
                    {m.items.map((it, ii) => {
                      const up = (k, v) => set("meals", c.meals.map((x, i) => (i !== mi ? x : { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, [k]: v } : y)) })));
                      return (
                        <tr key={ii}>
                          <td><input className="input" value={it.food} placeholder="Food" onChange={(e) => up("food", e.target.value)} aria-label="Food" /></td>
                          <td style={{ width: 140 }}><input className="input" value={it.amount} placeholder="Amount" onChange={(e) => up("amount", e.target.value)} aria-label="Amount" /></td>
                          <td style={{ width: 40 }}><button className="x" aria-label="Remove food" onClick={() => set("meals", c.meals.map((x, i) => (i !== mi ? x : { ...x, items: x.items.filter((_, j) => j !== ii) })))}>✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button className="textbtn small" onClick={() => set("meals", c.meals.map((x, i) => (i !== mi ? x : { ...x, items: [...x.items, { food: "", amount: "" }] })))}>+ Add food</button>
              </div>
            ))}
            <button className="btn sm ghost" onClick={() => set("meals", [...c.meals, { name: "Snack", items: [{ food: "", amount: "" }] }])}>+ Add meal</button>
            <div className="panel" style={{ padding: 14 }}>
              <b>Supplements</b> <span className="small muted">Shown in their own section, apart from meals</span>
              <table className="ed-table" style={{ marginTop: 8 }}>
                <tbody>
                  {(c.supplements || []).map((s, si) => {
                    const up = (k, v) => set("supplements", c.supplements.map((x, i) => (i === si ? { ...x, [k]: v } : x)));
                    return (
                      <tr key={si}>
                        <td><input className="input" value={s.name} placeholder="What" onChange={(e) => up("name", e.target.value)} aria-label="Supplement" /></td>
                        <td style={{ width: 120 }}><input className="input" value={s.dose} placeholder="How much" onChange={(e) => up("dose", e.target.value)} aria-label="Dose" /></td>
                        <td style={{ width: 170 }}><input className="input" value={s.when} placeholder="When" onChange={(e) => up("when", e.target.value)} aria-label="When" /></td>
                        <td><input className="input" value={s.why || ""} placeholder="Why (optional)" onChange={(e) => up("why", e.target.value)} aria-label="Why" /></td>
                        <td style={{ width: 40 }}><button className="x" aria-label="Remove supplement" onClick={() => set("supplements", c.supplements.filter((_, i) => i !== si))}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button className="textbtn small" onClick={() => set("supplements", [...(c.supplements || []), { name: "", dose: "", when: "", why: "" }])}>+ Add supplement</button>
            </div>
            <div className="panel" style={{ padding: 14 }}>
              <b>Shopping list</b> <span className="small muted">A week's food from their shops, grouped by shop</span>
              <table className="ed-table" style={{ marginTop: 8 }}>
                <tbody>
                  {(c.shopping || []).map((s, si) => {
                    const up = (k, v) => set("shopping", c.shopping.map((x, i) => (i === si ? { ...x, [k]: v } : x)));
                    return (
                      <tr key={si}>
                        <td style={{ width: 130 }}><input className="input" value={s.shop || ""} placeholder="Shop" onChange={(e) => up("shop", e.target.value)} aria-label="Shop" /></td>
                        <td><input className="input" value={s.item || ""} placeholder="Product as sold" onChange={(e) => up("item", e.target.value)} aria-label="Product" /></td>
                        <td style={{ width: 120 }}><input className="input" value={s.amount || ""} placeholder="How much a week" onChange={(e) => up("amount", e.target.value)} aria-label="Amount a week" /></td>
                        <td style={{ width: 90 }}><input className="input" value={s.price || ""} placeholder="£" onChange={(e) => up("price", e.target.value)} aria-label="Price" /></td>
                        <td style={{ width: 40 }}><button className="x" aria-label="Remove item" onClick={() => set("shopping", c.shopping.filter((_, i) => i !== si))}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button className="textbtn small" onClick={() => set("shopping", [...(c.shopping || []), { shop: c.shopping?.at(-1)?.shop || "", item: "", amount: "", price: "" }])}>+ Add item</button>
            </div>
            <Field label="Swaps (one per line)"><textarea className="textarea" value={lines("swaps")} onChange={(e) => set("swaps", e.target.value.split("\n").filter(Boolean))} /></Field>
          </>
        )}
        <Field label="Notes (one per line)"><textarea className="textarea" value={lines("notes")} onChange={(e) => set("notes", e.target.value.split("\n").filter(Boolean))} /></Field>
      </div>
      <div className="row between" style={{ marginTop: 22 }}>
        <button className="textbtn" onClick={onClose}>Cancel</button>
        <div className="row">
          {plan.status !== "live" && <button className="btn ghost" onClick={() => save("draft")}>Save as draft</button>}
          <button className="btn" onClick={() => save("live")}>Save and put live</button>
        </div>
      </div>
    </Modal>
  );
}

export { checkinSummary };
