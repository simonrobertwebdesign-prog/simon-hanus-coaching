import { useState } from "react";
import { api } from "../lib/api";
import { go } from "../lib/router";
import { Brand, Field } from "../components/ui";
import { cx } from "../lib/util";

export function Login({ initialMode = "login" }) {
  const [f, setF] = useState({ email: "", password: "", name: "" });
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(initialMode);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      if (mode === "signup") {
        if (f.password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const r = await api.signUp({ email: f.email.trim().toLowerCase(), password: f.password, name: f.name.trim() });
        if (r.needsConfirm) {
          setNote({ kind: "green", text: "Account made. Check your email and press the link to confirm it." });
          return;
        }
        const s = await api.session();
        go(s?.user?.role === "coach" ? "coach" : "app");
      } else if (mode === "reset") {
        await api.resetPassword(f.email.trim());
        setNote({ kind: "green", text: "If that email has an account, a reset link is on its way." });
      } else {
        await api.signIn({ email: f.email.trim().toLowerCase(), password: f.password });
        const s = await api.session();
        go(s?.user?.role === "coach" ? "coach" : "app");
      }
    } catch (err) {
      setNote({ kind: "red", text: err.message === "Invalid login credentials" ? "That email and password don't match. Try again or reset your password." : err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap auth">
      <Brand onClick={() => go("home")} />
      <div className="wizard-main" style={{ marginTop: 28 }}>
        <h2>{mode === "reset" ? "Reset your password" : mode === "signup" ? "Create an account" : "Log in"}</h2>
        <form className="wizard-body" onSubmit={submit}>
          {mode === "signup" && (
            <Field label="Your name">
              <input className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
            </Field>
          )}
          <Field label="Email">
            <input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          </Field>
          {mode !== "reset" && (
            <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
              <input className="input" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            </Field>
          )}
          {note && <div className={cx("notice", note.kind)}>{note.text}</div>}
          <button className="btn block" disabled={busy}>{mode === "reset" ? "Send reset link" : mode === "signup" ? (busy ? "Creating…" : "Create account") : busy ? "Logging in…" : "Log in"}</button>
          <div className="row between small">
            <button type="button" className="link" onClick={() => setMode(mode === "reset" ? "login" : "reset")}>
              {mode === "reset" ? "Back to log in" : "Forgot password?"}
            </button>
            <span className="muted">New here? <button type="button" className="link" onClick={() => go("start")}>Start the questionnaire</button></span>
          </div>
        </form>
        {api.demo && (
          <div className="notice amber" style={{ marginTop: 22 }}>
            <b>This is a demo.</b> Look around as a client or as the coach:
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn sm ink" onClick={async () => { await api.demoAs("client"); go("app"); }}>Client area</button>
              <button className="btn sm ink" onClick={async () => { await api.demoAs("coach"); go("coach"); }}>Coach area</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResetPassword() {
  const [pw, setPw] = useState("");
  const [note, setNote] = useState(null);
  return (
    <div className="wrap auth">
      <Brand onClick={() => go("home")} />
      <form
        className="wizard-main stack"
        style={{ marginTop: 28 }}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.updatePassword(pw);
            go("app");
          } catch (err) {
            setNote(err.message);
          }
        }}
      >
        <h2>New password</h2>
        <Field label="New password" hint="At least 8 characters.">
          <input className="input" type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" />
        </Field>
        {note && <div className="notice red">{note}</div>}
        <button className="btn">Save password</button>
      </form>
    </div>
  );
}
