// Tools for Claude's daily coaching run. They only work in the coach area,
// logged in as Simon, so the database rules still apply.
// In the browser console: await SHC.todo()
import { api } from "./api";
import { checkinState, checkinSummary } from "./insights";
import { planById } from "../config";
import { today } from "./util";

export function installAgent() {
  if (window.SHC) return;
  window.SHC = {
    version: 1,
    help() {
      return {
        "todo()": "Everything that needs doing today, grouped.",
        "client(id)": "All data for one client, plus a summary for check-ins.",
        "confirmPayment(id, stripeSessionId)": "After checking the payment in Stripe.",
        "draftPlan(clientId, 'training'|'nutrition', content, why[])": "New plan draft for Simon to approve.",
        "redoPlan(planId, content, why[])": "Replace a plan Simon sent back.",
        "draftCheckin(clientId, {message, changes[], report, big_change, checkin_id?})": "Check-in for Simon to approve.",
      };
    },
    async todo() {
      const [clients, appr] = await Promise.all([api.clients(), api.approvals()]);
      const out = { date: today(), checkPayments: [], plansToMake: [], plansToRedo: [], checkinsDue: [], checkinsToRedo: [], waitingForSimon: appr.plans.length + appr.checkins.length };
      for (const c of clients) {
        const short = { id: c.id, name: c.full_name, email: c.email, plan: c.plan, flags: c.flags };
        if (c.status === "paid" && !c.payment_confirmed) out.checkPayments.push({ ...short, stripe_session_id: c.stripe_session_id });
        if (c.status === "paid" && c.payment_confirmed) {
          const b = await api.bundle(c.id);
          const kinds = ["training", "nutrition"];
          for (const k of kinds) {
            const ps = b.plans.filter((p) => p.kind === k);
            const redo = ps.find((p) => p.status === "changes_requested");
            if (redo) out.plansToRedo.push({ ...short, kind: k, plan_id: redo.id, feedback: redo.feedback });
            else if (!ps.some((p) => p.status === "draft" || p.status === "live")) out.plansToMake.push({ ...short, kind: k });
          }
        }
        if (c.status === "active" && planById(c.plan).checkinDays) {
          const ck = checkinState(c);
          const b = await api.bundle(c.id);
          const open = b.checkins.find((k) => k.status !== "sent");
          if (open?.status === "changes_requested") out.checkinsToRedo.push({ ...short, checkin_id: open.id, feedback: open.feedback });
          else if (ck?.due && (!open || open.status === "submitted")) out.checkinsDue.push({ ...short, due: ck.date, checkin_id: open?.id || null, form_sent: !!open?.form });
        }
        // Active clients whose plans were sent back.
        if (c.status === "active") {
          const b = await api.bundle(c.id);
          for (const p of b.plans.filter((p) => p.status === "changes_requested"))
            out.plansToRedo.push({ ...short, kind: p.kind, plan_id: p.id, feedback: p.feedback });
        }
      }
      return out;
    },
    async client(id) {
      const b = await api.bundle(id);
      return { ...b, photos: b.photos.map((p) => ({ date: p.date, angle: p.angle, url: p.url })), summary: checkinSummary(b) };
    },
    async confirmPayment(id, sessionId) {
      await api.confirmPayment(id, sessionId);
      return "ok";
    },
    async draftPlan(clientId, kind, content, why = []) {
      const p = await api.savePlan({ client_id: clientId, kind, content, why, status: "draft", created_by: "claude" });
      return p.id;
    },
    async redoPlan(planId, content, why = []) {
      await api.savePlan({ id: planId, content, why, status: "draft", created_by: "claude" });
      return "ok";
    },
    async draftCheckin(clientId, { message, changes = [], report = "", big_change = false, checkin_id = null, due_date = null }) {
      const k = await api.saveCheckinDraft({ id: checkin_id, client_id: clientId, due_date, message, changes, report, big_change });
      return k.id;
    },
  };
}
