import { useEffect, useMemo, useState } from "react";
import { PLANS, planById } from "../config";
import { api } from "../lib/api";
import { go } from "../lib/router";
import { store, cx } from "../lib/util";
import { Brand, Choices, Field, Plate, Seg } from "../components/ui";

const HEALTH = [
  ["heart", "Has a doctor ever said you have a heart condition, or that you should only exercise under medical supervision?"],
  ["chest", "Do you get chest pain when you're active, or have you had chest pain in the last month at rest?"],
  ["dizzy", "Do you ever lose your balance from dizziness, or have you ever fainted?"],
  ["bp", "Do you have high blood pressure, diabetes or another long-term condition?"],
  ["joints", "Do you have a bone, joint or back problem that exercise could make worse?"],
  ["meds", "Are you taking any prescribed medicine?"],
  ["pregnant", "Are you pregnant, or have you given birth in the last 6 months?"],
  ["ed", "Have you ever been diagnosed with, or had treatment for, an eating disorder?"],
];

const STEPS = ["Plan", "About you", "Your goal", "Training", "Your day", "Food", "Health", "Agree", "Account", "Pay"];

const blank = {
  first_name: "", last_name: "", age: "", sex: "", height_unit: "cm", height_cm: "", height_ft: "", height_in: "",
  weight_unit: "kg", weight_kg: "", weight_st: "", weight_lb: "",
  goal: "", target: "", why_now: "", holding_back: "",
  experience: "", days: "", session: "", where: "", equipment: [], routine: "", lifts: "", likes_ex: "", dislikes_ex: "", injuries: "",
  work: "", steps: "", sleep: "", stress: "", train_time: "",
  diet: "", allergies: "", likes: "", dislikes: "", meals: "", cooking: "", budget: "", alcohol: "", tracking: "", supplements: "",
  health: {}, health_details: "",
  agree_age: false, agree_terms: false, agree_data: false, agree_results: false,
};

export function Start({ route, session }) {
  const saved = store("shc-q");
  const fromRoute = route.startsWith("start-") ? route.slice(6) : null;
  const [plan, setPlan] = useState(fromRoute || saved?.plan || "monthly");
  const [a, setA] = useState({ ...blank, ...(saved?.answers || {}) });
  const [step, setStep] = useState(fromRoute ? 1 : saved?.step ?? 0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [account, setAccount] = useState({ email: "", password: "" });

  useEffect(() => {
    store("shc-q", { plan, answers: a, step });
  }, [plan, a, step]);

  const set = (k) => (v) => setA((x) => ({ ...x, [k]: v?.target ? (v.target.type === "checkbox" ? v.target.checked : v.target.value) : v }));
  const p = planById(plan);
  const flags = useMemo(() => {
    const f = HEALTH.filter(([k]) => a.health[k] === "Yes").map(([, q]) => q);
    if (a.injuries?.trim()) f.push("Injury: " + a.injuries.trim());
    return f;
  }, [a]);

  // Logged in already? Skip the account step.
  const loggedIn = !!session?.user && session.user.role !== "coach";

  function validate(s) {
    const e = {};
    const need = (k, msg = "Please answer this") => {
      const v = a[k];
      if (v === "" || v == null || (Array.isArray(v) && !v.length)) e[k] = msg;
    };
    if (s === 1) {
      need("first_name"); need("last_name"); need("age"); need("sex");
      if (a.age && +a.age < 18) e.age = "Coaching is for people aged 18 and over.";
      if (a.height_unit === "cm") need("height_cm"); else need("height_ft");
      if (a.weight_unit === "kg") need("weight_kg"); else need("weight_st");
    }
    if (s === 2) { need("goal"); need("why_now"); }
    if (s === 3) { need("experience"); need("days"); need("session"); need("where"); }
    if (s === 4) { need("work"); need("sleep"); }
    if (s === 5) { need("diet"); need("cooking"); need("meals"); }
    if (s === 6) HEALTH.forEach(([k]) => { if (!a.health[k]) e["h_" + k] = "Please answer yes or no"; });
    if (s === 6 && flags.length && !a.health_details.trim()) e.health_details = "Tell us a little more so Simon can plan around it";
    if (s === 7) { if (!a.agree_age) e.agree_age = "Required"; if (!a.agree_terms) e.agree_terms = "Required"; if (!a.agree_data) e.agree_data = "Required"; }
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector(".err-text")?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    }
    return !Object.keys(e).length;
  }

  function metric() {
    const height_cm = a.height_unit === "cm" ? +a.height_cm : Math.round((+a.height_ft * 12 + +(a.height_in || 0)) * 2.54);
    const weight_kg = a.weight_unit === "kg" ? +a.weight_kg : Math.round((+a.weight_st * 14 + +(a.weight_lb || 0)) * 0.4536 * 10) / 10;
    return { height_cm, weight_kg };
  }

  async function saveAnswers() {
    const { height_cm, weight_kg } = metric();
    const answers = { ...a, height_cm, weight_kg, _flags: flags, submitted_at: new Date().toISOString() };
    await api.startClient({ plan, full_name: `${a.first_name} ${a.last_name}`.trim(), answers });
  }

  async function next() {
    if (!validate(step)) return;
    if (step === 7 && loggedIn) {
      setBusy(true);
      try {
        await saveAnswers();
        setStep(9);
      } catch (err) {
        setNote({ kind: "red", text: err.message });
      } finally {
        setBusy(false);
      }
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const back = () => setStep((s) => (s === 9 && loggedIn ? 7 : Math.max(0, s - 1)));

  async function createAccount(e) {
    e.preventDefault();
    const er = {};
    if (!/^\S+@\S+\.\S+$/.test(account.email)) er.email = "Enter a valid email address";
    if (account.password.length < 8) er.password = "Use at least 8 characters";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await api.signUp({ email: account.email.trim().toLowerCase(), password: account.password, name: `${a.first_name} ${a.last_name}`.trim() });
      if (r.needsConfirm) {
        setNote({ kind: "amber", text: "Check your email and press the link to confirm your account. You'll come straight back here to pay. Your answers are saved in this browser." });
        return;
      }
      await saveAnswers();
      setStep(9);
    } catch (err) {
      setNote({ kind: "red", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  // After confirming email, the person lands back here logged in.
  useEffect(() => {
    if (step === 8 && loggedIn) {
      (async () => {
        try {
          const existing = await api.myClient();
          if (!existing) await saveAnswers();
          setStep(9);
        } catch (err) {
          setNote({ kind: "red", text: err.message });
        }
      })();
    }
  }, [step, loggedIn]);

  async function pay() {
    const user = session?.user;
    if (p.paymentLink && !api.demo) {
      const url = new URL(p.paymentLink);
      url.searchParams.set("client_reference_id", user.id);
      url.searchParams.set("prefilled_email", user.email);
      location.href = url.toString();
      return;
    }
    setBusy(true);
    await api.reportPayment("demo-" + Date.now());
    store("shc-q", null);
    setBusy(false);
    go("paid");
  }

  const E = (k) => errors[k];
  const ruler = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="nav scrolled">
        <div className="wrap nav-in">
          <Brand onClick={() => go("home")} />
          <span className="push" style={{ marginLeft: "auto" }} />
          <span className="small muted hide-sm">Your answers are saved as you go</span>
        </div>
      </header>
      <div className="wrap wizard">
        <aside className="wizard-side">
          <div className="row" style={{ gap: 12 }}>
            <Plate plan={plan} size={44} />
            <div>
              <b>{p.name}</b>
              <div className="small muted">£{p.price} {p.period === "once" ? "one payment" : "a month"}</div>
            </div>
          </div>
          <div className="progress-bar" style={{ marginTop: 18 }} aria-hidden="true"><i style={{ width: ruler + "%" }} /></div>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s} className={cx(i < step && "done", i === step && "now")}>
                <i>{i < step ? "✓" : i + 1}</i>
                {s}
              </li>
            ))}
          </ol>
        </aside>

        <section className="wizard-main" aria-labelledby="step-title">
          <div className="small muted">Step {step + 1} of {STEPS.length}</div>

          {step === 0 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Pick your plan</h2>
              <p className="intro">You can change plan later. All three include a training plan and a food plan built for you.</p>
              <div className="wizard-body">
                {PLANS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setPlan(x.id)}
                    className="choice"
                    aria-pressed={plan === x.id}
                    style={{ borderRadius: 16, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center", padding: 16, textAlign: "left" }}
                  >
                    <Plate plan={x.id} size={48} />
                    <span>
                      <b style={{ display: "block", fontSize: "1.1rem" }}>{x.name}</b>
                      <span style={{ fontWeight: 400, opacity: 0.8 }}>{x.blurb}</span>
                    </span>
                    <b style={{ fontSize: "1.3rem", whiteSpace: "nowrap" }}>£{x.price}{x.period === "month" ? "/mo" : ""}</b>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>About you</h2>
              <p className="intro">The basics, so your calories and training start in the right place.</p>
              <div className="wizard-body">
                <div className="two">
                  <Field label="First name" error={E("first_name")}><input className={cx("input", E("first_name") && "err")} value={a.first_name} onChange={set("first_name")} autoComplete="given-name" /></Field>
                  <Field label="Last name" error={E("last_name")}><input className={cx("input", E("last_name") && "err")} value={a.last_name} onChange={set("last_name")} autoComplete="family-name" /></Field>
                </div>
                <div className="two">
                  <Field label="Age" error={E("age")}><input className={cx("input", E("age") && "err")} type="number" inputMode="numeric" min="0" value={a.age} onChange={set("age")} /></Field>
                  <Field label="Sex" hint="Used for calorie maths." error={E("sex")}><Choices options={["Male", "Female"]} value={a.sex} onChange={set("sex")} label="Sex" /></Field>
                </div>
                <Field label="Height" error={E("height_cm") || E("height_ft")}>
                  <div className="unit">
                    {a.height_unit === "cm" ? (
                      <input className="input" type="number" inputMode="decimal" placeholder="cm" aria-label="Height in cm" value={a.height_cm} onChange={set("height_cm")} />
                    ) : (
                      <div className="two">
                        <input className="input" type="number" inputMode="numeric" placeholder="feet" aria-label="Height, feet" value={a.height_ft} onChange={set("height_ft")} />
                        <input className="input" type="number" inputMode="numeric" placeholder="inches" aria-label="Height, inches" value={a.height_in} onChange={set("height_in")} />
                      </div>
                    )}
                    <Seg options={["cm", "ft"]} value={a.height_unit} onChange={set("height_unit")} />
                  </div>
                </Field>
                <Field label="Weight" error={E("weight_kg") || E("weight_st")}>
                  <div className="unit">
                    {a.weight_unit === "kg" ? (
                      <input className="input" type="number" inputMode="decimal" placeholder="kg" aria-label="Weight in kg" value={a.weight_kg} onChange={set("weight_kg")} />
                    ) : (
                      <div className="two">
                        <input className="input" type="number" inputMode="numeric" placeholder="stone" aria-label="Weight, stone" value={a.weight_st} onChange={set("weight_st")} />
                        <input className="input" type="number" inputMode="numeric" placeholder="pounds" aria-label="Weight, pounds" value={a.weight_lb} onChange={set("weight_lb")} />
                      </div>
                    )}
                    <Seg options={["kg", "st"]} value={a.weight_unit} onChange={set("weight_unit")} />
                  </div>
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Your goal</h2>
              <p className="intro">Be honest. The more Simon knows, the better the plan.</p>
              <div className="wizard-body">
                <Field label="Main goal" error={E("goal")}>
                  <Choices options={["Build muscle", "Lose fat", "Build muscle and lose fat", "Get stronger", "Get fitter and healthier"]} value={a.goal} onChange={set("goal")} label="Main goal" />
                </Field>
                <Field label="Anything specific?" hint="E.g. lose 6 kg by the summer, bench 100 kg, bigger arms.">
                  <input className="input" value={a.target} onChange={set("target")} />
                </Field>
                <Field label="Why now?" error={E("why_now")}>
                  <textarea className={cx("textarea", E("why_now") && "err")} value={a.why_now} onChange={set("why_now")} />
                </Field>
                <Field label="What's held you back before?">
                  <textarea className="textarea" value={a.holding_back} onChange={set("holding_back")} />
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Your training</h2>
              <p className="intro">So the plan fits your level, your week and your kit.</p>
              <div className="wizard-body">
                <Field label="How long have you been training properly?" error={E("experience")}>
                  <Choices options={["Not yet", "Under 6 months", "6 months – 2 years", "2–5 years", "5+ years"]} value={a.experience} onChange={set("experience")} label="Experience" />
                </Field>
                <Field label="Days a week you can train" error={E("days")}>
                  <Choices options={["2", "3", "4", "5", "6"]} value={a.days} onChange={set("days")} label="Days a week" />
                </Field>
                <Field label="Time per session" error={E("session")}>
                  <Choices options={["30 min", "45 min", "60 min", "75 min", "90 min"]} value={a.session} onChange={set("session")} label="Session length" />
                </Field>
                <Field label="Where do you train?" error={E("where")}>
                  <Choices options={["Commercial gym", "Home gym", "Home with dumbbells", "Bodyweight only"]} value={a.where} onChange={set("where")} label="Where" />
                </Field>
                {a.where && a.where !== "Commercial gym" && (
                  <Field label="What kit do you have?">
                    <Choices multi options={["Barbell and plates", "Squat rack", "Bench", "Dumbbells", "Adjustable dumbbells", "Pull-up bar", "Cables", "Bands", "Kettlebells"]} value={a.equipment} onChange={set("equipment")} label="Equipment" />
                  </Field>
                )}
                <Field label="What does your training look like now?" hint="Rough is fine: days, split, favourite lifts.">
                  <textarea className="textarea" value={a.routine} onChange={set("routine")} />
                </Field>
                <Field label="Best lifts, if you know them" hint="E.g. bench 80 kg × 5, squat 100 kg × 5.">
                  <input className="input" value={a.lifts} onChange={set("lifts")} />
                </Field>
                <div className="two">
                  <Field label="Exercises you love"><input className="input" value={a.likes_ex} onChange={set("likes_ex")} /></Field>
                  <Field label="Exercises you hate or can't do"><input className="input" value={a.dislikes_ex} onChange={set("dislikes_ex")} /></Field>
                </div>
                <Field label="Any injuries or pain?" hint="Leave blank if none.">
                  <input className="input" value={a.injuries} onChange={set("injuries")} />
                </Field>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Your day</h2>
              <p className="intro">How active you are outside the gym changes how much you need to eat.</p>
              <div className="wizard-body">
                <Field label="Your job or day" error={E("work")}>
                  <Choices options={["Mostly sitting", "On my feet a lot", "Physical / manual", "Student", "Shift work"]} value={a.work} onChange={set("work")} label="Job" />
                </Field>
                <Field label="Steps a day (roughly)">
                  <Choices options={["Under 5,000", "5,000–8,000", "8,000–12,000", "12,000+", "No idea"]} value={a.steps} onChange={set("steps")} label="Steps" />
                </Field>
                <Field label="Sleep a night" error={E("sleep")}>
                  <Choices options={["Under 6 h", "6–7 h", "7–8 h", "8+ h"]} value={a.sleep} onChange={set("sleep")} label="Sleep" />
                </Field>
                <Field label="Stress at the moment">
                  <Choices options={["Low", "Medium", "High"]} value={a.stress} onChange={set("stress")} label="Stress" />
                </Field>
                <Field label="When do you usually train?">
                  <Choices options={["Morning", "Lunchtime", "After work", "Evening", "It changes"]} value={a.train_time} onChange={set("train_time")} label="Training time" />
                </Field>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Food</h2>
              <p className="intro">Your food plan is built around food you like and can afford.</p>
              <div className="wizard-body">
                <Field label="How do you eat?" error={E("diet")}>
                  <Choices options={["Anything", "Vegetarian", "Vegan", "Pescatarian", "Halal", "Kosher", "Other"]} value={a.diet} onChange={set("diet")} label="Diet" />
                </Field>
                <Field label="Allergies or intolerances" hint="Leave blank if none.">
                  <input className="input" value={a.allergies} onChange={set("allergies")} />
                </Field>
                <div className="two">
                  <Field label="Foods you love"><textarea className="textarea" value={a.likes} onChange={set("likes")} /></Field>
                  <Field label="Foods you won't eat"><textarea className="textarea" value={a.dislikes} onChange={set("dislikes")} /></Field>
                </div>
                <Field label="Meals a day you'd like" error={E("meals")}>
                  <Choices options={["2", "3", "4", "5"]} value={a.meals} onChange={set("meals")} label="Meals" />
                </Field>
                <Field label="Cooking" error={E("cooking")}>
                  <Choices options={["I love cooking", "Basic meals", "As little as possible"]} value={a.cooking} onChange={set("cooking")} label="Cooking" />
                </Field>
                <Field label="Food budget">
                  <Choices options={["Tight", "Normal", "Flexible"]} value={a.budget} onChange={set("budget")} label="Budget" />
                </Field>
                <div className="two">
                  <Field label="Alcohol in a normal week"><Choices options={["None", "1–5 drinks", "6–14 drinks", "15+"]} value={a.alcohol} onChange={set("alcohol")} label="Alcohol" /></Field>
                  <Field label="Ever tracked calories?"><Choices options={["Never", "A bit", "Yes, regularly"]} value={a.tracking} onChange={set("tracking")} label="Tracking" /></Field>
                </div>
                <Field label="Supplements you take now" hint="E.g. whey, creatine. Leave blank if none.">
                  <input className="input" value={a.supplements} onChange={set("supplements")} />
                </Field>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Health check</h2>
              <p className="intro">Standard questions before starting any training plan. A yes doesn't stop you joining: Simon reads it personally, and may ask you to check with your GP first.</p>
              <div className="wizard-body" style={{ gap: 0 }}>
                {HEALTH.map(([k, q]) => (
                  <div className="yn" key={k}>
                    <div>
                      {q}
                      {E("h_" + k) && <div className="err-text">{E("h_" + k)}</div>}
                    </div>
                    <Choices options={["No", "Yes"]} value={a.health[k]} onChange={(v) => setA((x) => ({ ...x, health: { ...x.health, [k]: v } }))} label={q} />
                  </div>
                ))}
                {flags.length > 0 && (
                  <div style={{ marginTop: 22 }} className="stack">
                    <Field label="Tell us more" error={E("health_details")} hint="What it is, and anything your doctor has said.">
                      <textarea className={cx("textarea", E("health_details") && "err")} value={a.health_details} onChange={set("health_details")} />
                    </Field>
                    <div className="notice amber">
                      <b>Simon will look at this before your plan is made.</b> If you answered yes to the eating disorder question, your food plan won't be built around calorie targets, and Simon will talk to you first.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 7 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Before you pay</h2>
              <p className="intro">Three quick ticks so we can coach you properly.</p>
              <div className="wizard-body" style={{ gap: 4 }}>
                <label className="check"><input type="checkbox" checked={a.agree_age} onChange={set("agree_age")} /><span>I'm 18 or over.{E("agree_age") && <span className="err-text"> Required</span>}</span></label>
                <label className="check">
                  <input type="checkbox" checked={a.agree_terms} onChange={set("agree_terms")} />
                  <span>
                    I agree to the <a href="#terms">terms</a> and I've read the <a href="#health">health disclaimer</a>.
                    {E("agree_terms") && <span className="err-text"> Required</span>}
                  </span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={a.agree_data} onChange={set("agree_data")} />
                  <span>
                    I'm happy for Simon Hanus Coaching to keep my answers, health information, logs and progress photos to coach me. I can ask for them to be deleted at any time (<a href="#privacy">privacy policy</a>).
                    {E("agree_data") && <span className="err-text"> Required</span>}
                  </span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={a.agree_results} onChange={set("agree_results")} />
                  <span>Optional: Simon can share my progress (without my name or face) as a result on the website.</span>
                </label>
              </div>
            </>
          )}

          {step === 8 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Make your account</h2>
              <p className="intro">This is where your plans, logs and check-ins will live.</p>
              <form className="wizard-body" onSubmit={createAccount} noValidate>
                <Field label="Email" error={E("email")}>
                  <input className={cx("input", E("email") && "err")} type="email" autoComplete="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
                </Field>
                <Field label="Password" hint="At least 8 characters." error={E("password")}>
                  <input className={cx("input", E("password") && "err")} type="password" autoComplete="new-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
                </Field>
                {note && <div className={"notice " + note.kind}>{note.text}</div>}
                <div className="row">
                  <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
                  <span className="small muted">Already have one? <button type="button" className="link" onClick={() => go("login")}>Log in</button></span>
                </div>
              </form>
            </>
          )}

          {step === 9 && (
            <>
              <h2 id="step-title" style={{ marginTop: 8 }}>Pay and you're in</h2>
              <p className="intro">Payments are taken securely by Stripe. Your plans will be in your client area within 48 hours.</p>
              <div className="wizard-body">
                <div className="panel summary-row">
                  <Plate plan={plan} size={52} />
                  <div>
                    <b style={{ fontSize: "1.15rem" }}>{p.name}</b>
                    <div className="small muted">{p.checkinDays ? `Check-in every ${p.checkinDays === 7 ? "week" : "2 weeks"}. Cancel any time.` : "One payment. Yours to keep."}</div>
                  </div>
                  <b style={{ fontSize: "1.5rem" }}>£{p.price}{p.period === "month" ? "/mo" : ""}</b>
                </div>
                {flags.length > 0 && <div className="notice amber">You told us about something in the health check. Simon will read it before building your plan.</div>}
                {(api.demo || !p.paymentLink) && (
                  <div className="notice">
                    <b>Test mode.</b> Real payments aren't switched on yet, so this button pretends you've paid.
                  </div>
                )}
                {note && <div className={"notice " + note.kind}>{note.text}</div>}
                <button className="btn block" onClick={pay} disabled={busy}>
                  {p.period === "month" ? `Pay £${p.price} and start` : `Pay £${p.price}`}
                </button>
              </div>
            </>
          )}

          {step < 8 && (
            <div className="wizard-foot">
              {step > 0 ? <button className="textbtn" onClick={back}>Back</button> : <button className="textbtn" onClick={() => go("home")}>Cancel</button>}
              <button className="btn" onClick={next} disabled={busy}>
                {step === 7 ? (loggedIn ? "Save and continue to payment" : "Continue") : "Continue"}
              </button>
            </div>
          )}
          {step >= 8 && (
            <div className="wizard-foot">
              <button className="textbtn" onClick={back}>Back</button>
              <span />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function Paid({ session }) {
  useEffect(() => {
    const sid = new URLSearchParams(location.search).get("session_id");
    if (sid && session) api.reportPayment(sid).catch(() => {});
    store("shc-q", null);
  }, [session]);
  return (
    <div className="wrap auth" style={{ maxWidth: 620 }}>
      <Brand onClick={() => go("home")} />
      <div className="stack" style={{ marginTop: 40, "--gap": "18px" }}>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)" }}>You're in.</h1>
        <p className="lead">Thanks for paying. Simon is now reading your answers and building your training and food plans.</p>
        <div className="notice green">
          <b>What happens next:</b> your plans appear in your client area within 48 hours. Until then, have a look around and add your first weigh-in.
        </div>
        <div className="row">
          <button className="btn" onClick={() => go("app")}>Go to my area</button>
        </div>
      </div>
    </div>
  );
}
