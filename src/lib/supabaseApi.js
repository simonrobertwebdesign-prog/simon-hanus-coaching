// Real version of the API, on Supabase. Same functions as demoApi.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

function must({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

let me = null; // { id, email, name, role }

async function loadMe(session) {
  if (!session?.user) return (me = null);
  const { data } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  me = {
    id: session.user.id,
    email: session.user.email,
    name: data?.full_name || session.user.user_metadata?.full_name || "",
    role: data?.role || "client",
  };
  return me;
}

const mapMsg = (m) => ({ ...m, from: m.sender });

async function signed(rows) {
  if (!rows.length) return [];
  const { data } = await sb.storage.from("progress").createSignedUrls(rows.map((r) => r.path), 3600);
  return rows.map((r, i) => ({ ...r, url: data?.[i]?.signedUrl || "" }));
}

export const supabaseApi = {
  demo: false,
  sb,

  // ---------- auth ----------
  async session() {
    const { data } = await sb.auth.getSession();
    const user = await loadMe(data.session);
    return user ? { user } : null;
  },
  onChange(cb) {
    const { data } = sb.auth.onAuthStateChange(async (_e, s) => {
      const user = await loadMe(s);
      cb(user ? { user } : null);
    });
    return () => data.subscription.unsubscribe();
  },
  async signUp({ email, password, name }) {
    const data = must(
      await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: location.origin + "/#start" },
      })
    );
    return { needsConfirm: !data.session };
  },
  async signIn({ email, password }) {
    must(await sb.auth.signInWithPassword({ email, password }));
  },
  async signOut() {
    await sb.auth.signOut();
  },
  async resetPassword(email) {
    must(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/#reset" }));
  },
  async updatePassword(password) {
    must(await sb.auth.updateUser({ password }));
  },

  // ---------- client ----------
  async myClient() {
    if (!me) return null;
    return must(await sb.from("clients").select("*").eq("id", me.id).maybeSingle());
  },
  async startClient({ plan, full_name, answers }) {
    must(await sb.rpc("start_client", { p_plan: plan, p_full_name: full_name, p_answers: answers }));
  },
  async reportPayment(sessionId) {
    must(await sb.rpc("report_payment", { p_session: sessionId || null }));
  },
  async myPlans() {
    const rows = must(await sb.from("plans").select("*").eq("client_id", me.id).eq("status", "live"));
    return {
      training: rows.find((p) => p.kind === "training") || null,
      nutrition: rows.find((p) => p.kind === "nutrition") || null,
    };
  },
  async workouts(clientId = me.id) {
    return must(await sb.from("workouts").select("*").eq("client_id", clientId).order("date", { ascending: false }));
  },
  async saveWorkout(log) {
    const row = { ...log, client_id: me.id };
    if (!row.id) delete row.id;
    return must(await sb.from("workouts").upsert(row).select().single());
  },
  async deleteWorkout(id) {
    must(await sb.from("workouts").delete().eq("id", id));
  },
  async bodyLogs(clientId = me.id) {
    return must(await sb.from("body_logs").select("*").eq("client_id", clientId).order("date"));
  },
  async addBodyLog({ date, weight_kg }) {
    must(await sb.from("body_logs").upsert({ client_id: me.id, date, weight_kg }, { onConflict: "client_id,date" }));
  },
  async photos(clientId = me.id) {
    return signed(must(await sb.from("photos").select("*").eq("client_id", clientId).order("date")));
  },
  async uploadPhoto(file, angle, date) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${me.id}/${date}-${angle}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    must(await sb.storage.from("progress").upload(path, file, { contentType: file.type }));
    must(await sb.from("photos").insert({ client_id: me.id, date, angle, path }));
  },
  async checkins(clientId = me.id) {
    return must(await sb.from("checkins").select("*").eq("client_id", clientId).order("due_date", { ascending: false }));
  },
  async submitCheckinForm(form) {
    must(await sb.rpc("submit_checkin", { p_form: form }));
  },
  async messages(clientId = me.id) {
    return must(await sb.from("messages").select("*").eq("client_id", clientId).order("created_at")).map(mapMsg);
  },
  async sendMessage(body) {
    must(await sb.from("messages").insert({ client_id: me.id, sender: "client", body }));
  },

  // ---------- coach ----------
  async clients() {
    return must(await sb.from("clients").select("*").order("created_at", { ascending: false }));
  },
  async bundle(id) {
    const [client, q, plans, workouts, body, photos, checkins, drafts, messages] = await Promise.all([
      sb.from("clients").select("*").eq("id", id).single().then(must),
      sb.from("questionnaires").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(1).then(must),
      sb.from("plans").select("*").eq("client_id", id).order("created_at", { ascending: false }).then(must),
      supabaseApi.workouts(id),
      supabaseApi.bodyLogs(id),
      supabaseApi.photos(id),
      supabaseApi.checkins(id),
      sb.from("checkin_drafts").select("*, checkins!inner(client_id)").eq("checkins.client_id", id).then(must),
      supabaseApi.messages(id),
    ]);
    const byId = Object.fromEntries(drafts.map((d) => [d.checkin_id, d]));
    return {
      client,
      answers: q[0]?.answers || null,
      plans,
      workouts,
      body,
      photos,
      checkins: checkins.map((k) => (byId[k.id] && k.status !== "sent" ? { ...k, ...pickDraft(byId[k.id]) } : { ...k, report: byId[k.id]?.report, big_change: byId[k.id]?.big_change })),
      messages,
    };
  },
  async approvals() {
    const [plans, checkins, clients] = await Promise.all([
      sb.from("plans").select("*").eq("status", "draft").then(must),
      sb.from("checkins").select("*, checkin_drafts(*)").eq("status", "awaiting_approval").then(must),
      supabaseApi.clients(),
    ]);
    const c = Object.fromEntries(clients.map((x) => [x.id, x]));
    return {
      plans: plans.map((p) => ({ ...p, client: c[p.client_id] })),
      checkins: checkins.map((k) => {
        const d = Array.isArray(k.checkin_drafts) ? k.checkin_drafts[0] : k.checkin_drafts;
        return { ...k, ...pickDraft(d || {}), client: c[k.client_id] };
      }),
    };
  },
  async savePlan({ id, client_id, kind, content, why = [], status = "draft", created_by = "coach" }) {
    let row;
    if (id) {
      const patch = { content, why };
      const cur = must(await sb.from("plans").select("status").eq("id", id).single());
      if (status === "draft" && cur.status === "changes_requested") Object.assign(patch, { status: "draft" });
      row = must(await sb.from("plans").update(patch).eq("id", id).select().single());
    } else {
      const { count } = await sb.from("plans").select("id", { count: "exact", head: true }).eq("client_id", client_id).eq("kind", kind);
      row = must(
        await sb.from("plans").insert({ client_id, kind, content, why, status: "draft", version: (count || 0) + 1, created_by }).select().single()
      );
    }
    if (status === "live") await supabaseApi.approvePlan(row.id);
    return row;
  },
  async approvePlan(id) {
    must(await sb.rpc("approve_plan", { p_plan: id }));
  },
  async requestPlanChanges(id, feedback) {
    must(await sb.from("plans").update({ status: "changes_requested", feedback }).eq("id", id));
  },
  async saveCheckinDraft({ id, client_id, due_date, message, changes = [], report = "", big_change = false }) {
    let checkinId = id;
    if (!checkinId) {
      const open = must(await sb.from("checkins").select("id").eq("client_id", client_id).neq("status", "sent").limit(1));
      checkinId = open[0]?.id;
    }
    if (!checkinId) {
      checkinId = must(
        await sb.from("checkins").insert({ client_id, due_date: due_date || new Date().toISOString().slice(0, 10), status: "awaiting_approval" }).select("id").single()
      ).id;
    } else {
      must(await sb.from("checkins").update({ status: "awaiting_approval" }).eq("id", checkinId));
    }
    must(
      await sb.from("checkin_drafts").upsert({ checkin_id: checkinId, message, changes, report, big_change, feedback: null, updated_at: new Date().toISOString() })
    );
    return { id: checkinId };
  },
  async approveCheckin(id) {
    must(await sb.rpc("approve_checkin", { p_checkin: id }));
  },
  async requestCheckinChanges(id, feedback) {
    must(await sb.from("checkins").update({ status: "changes_requested" }).eq("id", id));
    must(await sb.from("checkin_drafts").update({ feedback }).eq("checkin_id", id));
  },
  async updateClient(id, patch) {
    must(await sb.from("clients").update(patch).eq("id", id));
  },
  async confirmPayment(id, sessionId) {
    must(await sb.from("clients").update({ payment_confirmed: true, status: "paid", ...(sessionId ? { stripe_session_id: sessionId } : {}) }).eq("id", id));
  },
  async coachMessage(clientId, body) {
    must(await sb.from("messages").insert({ client_id: clientId, sender: "coach", body }));
  },
};

function pickDraft(d) {
  return {
    message: d.message ?? null,
    changes: d.changes ?? [],
    report: d.report ?? "",
    big_change: d.big_change ?? false,
    feedback: d.feedback ?? null,
  };
}
