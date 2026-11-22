// Demo version of the API: same functions as the real one, but the data lives
// in this browser only. Used until Supabase is connected.
import { buildSeed } from "./seed";
import { addDays, today, uid, store, sessionStore } from "./util";
import { planById } from "../config";

const KEY = "shc-demo-v3";
let db = store(KEY) || buildSeed();
const save = () => store(KEY, db);
const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));

let listeners = [];
const session = () => sessionStore("shc-demo-session");
const setSession = (s) => {
  sessionStore("shc-demo-session", s);
  listeners.forEach((f) => f(s));
};

const me = () => session()?.user;
const myId = () => me()?.id;
const client = (id) => db.clients.find((c) => c.id === id);

function checkinInterval(planId) {
  return planById(planId).checkinDays;
}

export const demoApi = {
  demo: true,

  // ---------- auth ----------
  async session() {
    return session();
  },
  onChange(cb) {
    listeners.push(cb);
    return () => (listeners = listeners.filter((f) => f !== cb));
  },
  async signUp({ email, name }) {
    const id = "c-" + uid().slice(0, 8);
    setSession({ user: { id, email, name, role: "client" } });
    return { needsConfirm: false };
  },
  async signIn({ email }) {
    const found = db.clients.find((c) => c.email === email.toLowerCase());
    if (!found) throw new Error("In the demo, use one of the demo buttons to look around.");
    setSession({ user: { id: found.id, email: found.email, name: found.full_name, role: "client" } });
  },
  async demoAs(role) {
    if (role === "coach")
      setSession({ user: { id: "coach", email: "coach@demo", name: "Simon Hanus", role: "coach" } });
    else {
      const c = client("c-jamie");
      setSession({ user: { id: c.id, email: c.email, name: c.full_name, role: "client" } });
    }
  },
  async signOut() {
    setSession(null);
  },
  async resetPassword() {},
  resetDemo() {
    db = buildSeed();
    save();
  },

  // ---------- client ----------
  async myClient() {
    return wait(client(myId()) || null);
  },
  async startClient({ plan, full_name, answers }) {
    const u = me();
    const flags = answers?._flags || [];
    db.clients.push({
      id: u.id, full_name, email: u.email, plan, status: "new", start_date: null, next_checkin: null,
      payment_confirmed: false, flags, coach_notes: "", created_at: today(),
    });
    db.answers[u.id] = answers;
    save();
  },
  async reportPayment(sessionId) {
    const c = client(myId());
    if (c) {
      c.payment_reported = true;
      c.stripe_session_id = sessionId || "demo";
      c.status = "paid";
      save();
    }
  },
  async myPlans() {
    const live = db.plans.filter((p) => p.client_id === myId() && p.status === "live");
    return wait({
      training: live.find((p) => p.kind === "training") || null,
      nutrition: live.find((p) => p.kind === "nutrition") || null,
    });
  },
  async workouts(clientId = myId()) {
    return wait((db.workouts[clientId] || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1)));
  },
  async saveWorkout(log) {
    const list = (db.workouts[myId()] ||= []);
    const i = list.findIndex((w) => w.id === log.id);
    const row = { ...log, id: log.id || uid() };
    if (i >= 0) list[i] = row;
    else list.push(row);
    save();
    return row;
  },
  async deleteWorkout(id) {
    db.workouts[myId()] = (db.workouts[myId()] || []).filter((w) => w.id !== id);
    save();
  },
  async bodyLogs(clientId = myId()) {
    return wait((db.body[clientId] || []).slice().sort((a, b) => (a.date > b.date ? 1 : -1)));
  },
  async addBodyLog({ date, weight_kg }) {
    const list = (db.body[myId()] ||= []).filter((b) => b.date !== date);
    list.push({ id: uid(), date, weight_kg: +weight_kg });
    db.body[myId()] = list;
    save();
  },
  async photos(clientId = myId()) {
    return wait((db.photos[clientId] || []).slice().sort((a, b) => (a.date > b.date ? 1 : -1)));
  },
  async uploadPhoto(file, angle, date) {
    const url = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(file);
    });
    (db.photos[myId()] ||= []).push({ id: uid(), date, angle, url });
    try {
      save();
    } catch {
      /* big photos may not fit in demo storage */
    }
  },
  async checkins(clientId = myId()) {
    return wait(
      db.checkins
        .filter((c) => c.client_id === clientId)
        .map((c) => (c.status === "sent" ? c : { ...c, message: null, changes: [], report: undefined }))
        .sort((a, b) => (a.due_date < b.due_date ? 1 : -1))
    );
  },
  async submitCheckinForm(form) {
    const c = client(myId());
    const due = c?.next_checkin || today();
    const open = db.checkins.find((k) => k.client_id === myId() && k.status !== "sent");
    if (open) open.form = form;
    else db.checkins.push({ id: uid(), client_id: myId(), due_date: due, status: "submitted", form, created_at: today() });
    save();
  },
  async messages(clientId = myId()) {
    return wait(db.messages.filter((m) => m.client_id === clientId).sort((a, b) => (a.created_at > b.created_at ? 1 : -1)));
  },
  async sendMessage(body) {
    db.messages.push({ id: uid(), client_id: myId(), from: "client", body, created_at: today() });
    save();
  },

  // ---------- coach ----------
  async clients() {
    return wait(db.clients);
  },
  async bundle(id) {
    const c = client(id);
    if (!c) return null;
    return wait({
      client: c,
      answers: db.answers[id] || null,
      plans: db.plans.filter((p) => p.client_id === id),
      workouts: (db.workouts[id] || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
      body: (db.body[id] || []).slice().sort((a, b) => (a.date > b.date ? 1 : -1)),
      photos: (db.photos[id] || []).slice().sort((a, b) => (a.date > b.date ? 1 : -1)),
      checkins: db.checkins.filter((k) => k.client_id === id).sort((a, b) => (a.due_date < b.due_date ? 1 : -1)),
      messages: db.messages.filter((m) => m.client_id === id),
    });
  },
  async approvals() {
    return wait({
      plans: db.plans.filter((p) => p.status === "draft").map((p) => ({ ...p, client: client(p.client_id) })),
      checkins: db.checkins
        .filter((k) => k.status === "awaiting_approval")
        .map((k) => ({ ...k, client: client(k.client_id) })),
    });
  },
  async savePlan({ id, client_id, kind, content, why = [], status = "draft", created_by = "coach" }) {
    if (id) {
      const p = db.plans.find((x) => x.id === id);
      Object.assign(p, { content, why, status: p.status === "live" && status === "draft" ? "live" : status });
      if (status === "live") return demoApi.approvePlan(id);
      save();
      return p;
    }
    const version = db.plans.filter((p) => p.client_id === client_id && p.kind === kind).length + 1;
    const p = { id: uid(), client_id, kind, content, why, status: "draft", version, created_by, created_at: today() };
    db.plans.push(p);
    save();
    if (status === "live") await demoApi.approvePlan(p.id);
    return p;
  },
  async approvePlan(id) {
    const p = db.plans.find((x) => x.id === id);
    db.plans.forEach((x) => {
      if (x.client_id === p.client_id && x.kind === p.kind && x.status === "live" && x.id !== id) x.status = "archived";
    });
    p.status = "live";
    p.approved_at = today();
    p.feedback = null;
    const c = client(p.client_id);
    const both = ["training", "nutrition"].every((k) => db.plans.some((x) => x.client_id === c.id && x.kind === k && x.status === "live"));
    if (both && c.status !== "active") {
      c.status = "active";
      c.start_date = c.start_date || today();
      const n = checkinInterval(c.plan);
      c.next_checkin = n ? addDays(c.start_date, n) : null;
    }
    save();
  },
  async requestPlanChanges(id, feedback) {
    const p = db.plans.find((x) => x.id === id);
    p.status = "changes_requested";
    p.feedback = feedback;
    save();
  },
  async saveCheckinDraft({ id, client_id, due_date, message, changes = [], report = "", big_change = false }) {
    let k = id ? db.checkins.find((x) => x.id === id) : db.checkins.find((x) => x.client_id === client_id && x.status !== "sent");
    if (!k) {
      k = { id: uid(), client_id, due_date: due_date || today(), created_at: today() };
      db.checkins.push(k);
    }
    Object.assign(k, { message, changes, report, big_change, status: "awaiting_approval", feedback: null });
    save();
    return k;
  },
  async approveCheckin(id) {
    const k = db.checkins.find((x) => x.id === id);
    k.status = "sent";
    k.sent_at = today();
    const c = client(k.client_id);
    const n = checkinInterval(c.plan);
    if (n) c.next_checkin = addDays(today(), n);
    save();
  },
  async requestCheckinChanges(id, feedback) {
    const k = db.checkins.find((x) => x.id === id);
    k.status = "changes_requested";
    k.feedback = feedback;
    save();
  },
  async updateClient(id, patch) {
    Object.assign(client(id), patch);
    save();
  },
  async confirmPayment(id) {
    Object.assign(client(id), { payment_confirmed: true, status: "paid" });
    save();
  },
  async coachMessage(clientId, body) {
    db.messages.push({ id: uid(), client_id: clientId, from: "coach", body, created_at: today() });
    save();
  },
};
