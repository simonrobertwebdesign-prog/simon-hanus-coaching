// The coaching method on the home page, straight from the Coaching Rules (research, 22 Nov 2026).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReduced } from "./motion";
import { useSpotlight } from "./sections";

const METHOD = {
  training: {
    label: "Training",
    intro: "How your sessions are built.",
    items: [
      ["0–2", "Reps left in the tank", "Most sets end close to failure. Heavy barbell lifts stay 1 to 3 reps short, so you stay safe and keep good form."],
      ["2×", "Every muscle, every week", "Each muscle trained at least twice a week, as long as your days allow it."],
      ["6–20", "Hard sets per muscle", "Set by your experience: about 6 to 10 a week when you start, up to around 20 when you're advanced."],
      ["+1", "Reps first, then weight", "Hit the top of your rep range on every set, then add the smallest weight jump. Rest 2 to 3 minutes on the big lifts."],
    ],
  },
  food: {
    label: "Food",
    intro: "How your food plan is set.",
    items: [
      ["1.6–2.2", "Grams of protein per kg", "Every day, spread over your meals, with about 0.4 g per kg in each one."],
      ["×31–40", "Your starting calories", "Bodyweight in kg times 31 to 40, depending on how active you are. Then fixed from your real weigh-ins."],
      ["0.5–0.7%", "Of bodyweight a week", "The pace when losing fat: quick enough to see, slow enough to keep your muscle and strength."],
      ["Whole", "Food you like, from your shop", "Mostly whole foods you like, all sold at the shops you use, with a weekly shopping list. Powders and supplements only if you want them."],
    ],
  },
  checkins: {
    label: "Check-ins",
    intro: "How your plan changes.",
    items: [
      ["100", "Calories at a time", "Changes are small, usually 100 kcal, based on your 2-week weight trend, so nothing overshoots."],
      ["7-day", "Weight averages", "Weigh in most mornings. Weekly averages, not single days, decide what changes."],
      ["Peak", "Strength check", "When you're losing fat, your lifts are compared with your best, so muscle loss gets caught early."],
      ["80%", "Plans that fit your life", "Hitting less than about 80% of sessions? The plan changes to fit you before the numbers do."],
    ],
  },
};

function MethodCard({ n, title, text }) {
  const ref = useSpotlight();
  return (
    <article ref={ref} className="method-card">
      <span className="method-num" data-text={n}>{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export function Method() {
  const [tab, setTab] = useState("training");
  const grid = useRef(null);
  const tabs = useRef(null);
  const ind = useRef(null);
  const first = useRef(true);

  // the sliding marker under the active tab
  useLayoutEffect(() => {
    const btn = tabs.current?.querySelector(`[data-tab="${tab}"]`);
    if (!btn || !ind.current) return;
    const set = { x: btn.offsetLeft, width: btn.offsetWidth };
    if (first.current || prefersReduced()) gsap.set(ind.current, set);
    else gsap.to(ind.current, { ...set, duration: 0.45, ease: "power3.out" });
  }, [tab]);
  useEffect(() => {
    const on = () => {
      const btn = tabs.current?.querySelector('[aria-selected="true"]');
      if (btn) gsap.set(ind.current, { x: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // cards come in one after another; the big numbers scramble into place
  useGSAP(() => {
    if (prefersReduced()) return;
    const cards = grid.current.querySelectorAll(".method-card");
    const nums = grid.current.querySelectorAll(".method-num");
    const run = () => {
      gsap.fromTo(cards, { y: 26, opacity: 0, rotationX: -8 }, { y: 0, opacity: 1, rotationX: 0, duration: 0.6, ease: "power3.out", stagger: 0.07, overwrite: true });
      nums.forEach((n, i) => gsap.to(n, { duration: 0.8, delay: 0.1 + i * 0.07, scrambleText: { text: n.dataset.text, chars: "0123456789%×–+", speed: 0.6 }, overwrite: true }));
    };
    if (first.current) {
      first.current = false;
      gsap.set(cards, { opacity: 0 });
      gsap.timeline({ scrollTrigger: { trigger: grid.current, start: "top 82%", once: true, onEnter: run } });
    } else run();
  }, { dependencies: [tab], scope: grid });

  const m = METHOD[tab];
  return (
    <section className="section method-sec" id="method">
      <div className="wrap">
        <div className="method-head">
          <div>
            <h2>The method</h2>
            <p className="lead" style={{ marginTop: 16 }}>What goes into your plans: what the research supports, fitted to your goals, kit and life.</p>
          </div>
          <div ref={tabs} className="method-tabs" role="tablist" aria-label="The method">
            <span ref={ind} className="method-ind" aria-hidden="true" />
            {Object.entries(METHOD).map(([id, v]) => (
              <button key={id} role="tab" data-tab={id} aria-selected={tab === id} onClick={() => setTab(id)}>{v.label}</button>
            ))}
          </div>
        </div>
        <p className="method-intro muted">{m.intro}</p>
        <div ref={grid} className="method-grid" role="tabpanel" key={tab}>
          {m.items.map(([n, t, s]) => <MethodCard key={t} n={n} title={t} text={s} />)}
        </div>
      </div>
    </section>
  );
}

// ---------- how many days can you train? ----------

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = {
  2: { name: "Full body, twice", days: ["Full body", "", "", "Full body", "", "", ""] },
  3: { name: "Full body, three times", days: ["Full body", "", "Full body", "", "Full body", "", ""] },
  4: { name: "Upper / lower, twice", days: ["Upper", "Lower", "", "Upper", "Lower", "", ""] },
  5: { name: "Upper / lower + push / pull / legs", days: ["Upper", "Lower", "", "Push", "Pull", "Legs", ""] },
  6: { name: "Push / pull / legs, twice", days: ["Push", "Pull", "Legs", "Push", "Pull", "Legs", ""] },
};
const KIND = { "Full body": "steel", Upper: "crimson", Lower: "purple", Push: "crimson", Pull: "purple", Legs: "steel" };

export function WeekPlanner() {
  const [n, setN] = useState(4);
  const grid = useRef(null);
  const name = useRef(null);
  const firstRun = useRef(true);
  useGSAP(() => {
    if (prefersReduced()) return;
    if (firstRun.current) { firstRun.current = false; return; }
    gsap.fromTo(grid.current.querySelectorAll(".week-cell"), { rotationY: -90, opacity: 0.2 }, { rotationY: 0, opacity: 1, duration: 0.55, ease: "back.out(1.4)", stagger: 0.05, overwrite: true });
    gsap.fromTo(name.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out", overwrite: true });
  }, { dependencies: [n], scope: grid });
  const w = WEEKS[n];
  return (
    <section className="section week-sec" aria-labelledby="week-h">
      <div className="wrap week">
        <div>
          <h2 id="week-h">How many days can you train?</h2>
          <p className="lead" style={{ marginTop: 16 }}>Pick a number. This is how your week would be laid out, with every muscle trained at least twice.</p>
          <div className="seg week-seg" role="group" aria-label="Days a week">
            {[2, 3, 4, 5, 6].map((d) => <button key={d} aria-pressed={n === d} onClick={() => setN(d)}>{d} days</button>)}
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>Your real week is laid out on the days you tell us suit you. Miss days a lot? Fewer days beats a plan you can't finish.</p>
        </div>
        <div>
          <div ref={grid} className="week-grid">
            {DAYS.map((d, i) => {
              const s = w.days[i];
              return (
                <div key={d} className={"week-cell " + (s ? KIND[s] : "rest")}>
                  <span>{d}</span>
                  <b>{s || "Rest"}</b>
                </div>
              );
            })}
          </div>
          <p ref={name} className="week-name">{w.name}</p>
        </div>
      </div>
    </section>
  );
}

// ---------- starting numbers ----------

const ACTIVITY = [
  { id: "sit", label: "Mostly sitting", lo: 31, hi: 33, hint: "Desk, studying, under 5,000 steps" },
  { id: "feet", label: "On your feet", lo: 34, hi: 36, hint: "5,000 to 12,000 steps" },
  { id: "job", label: "Physical job", lo: 37, hi: 40, hint: "Manual work or 12,000+ steps" },
];
const GOALS = [
  { id: "lose", label: "Lose fat" },
  { id: "build", label: "Build muscle" },
  { id: "same", label: "Stay the same" },
];
const toStone = (kg) => {
  const lb = Math.round(kg * 2.20462);
  return `${Math.floor(lb / 14)} st ${lb % 14} lb`;
};
const comma = (n) => Math.round(n).toLocaleString("en-GB");
const r10 = (n) => Math.round(n / 10) * 10;

function useRoll(target, ref) {
  const cur = useRef(target);
  useEffect(() => {
    if (!ref.current) return;
    if (prefersReduced()) { ref.current.textContent = comma(target); cur.current = target; return; }
    const o = { v: cur.current };
    gsap.to(o, { v: target, duration: 0.5, ease: "power2.out", overwrite: true, onUpdate: () => { cur.current = o.v; if (ref.current) ref.current.textContent = comma(o.v); } });
  }, [target]);
}

export function StartingNumbers() {
  const [kg, setKg] = useState(75);
  const [act, setAct] = useState("feet");
  const [goal, setGoal] = useState("build");
  const a = ACTIVITY.find((x) => x.id === act);
  const mLo = r10(kg * a.lo), mHi = r10(kg * a.hi);
  const pLo = Math.round(kg * 1.6), pHi = Math.round(kg * 2.2);
  const refs = { mLo: useRef(null), mHi: useRef(null), pLo: useRef(null), pHi: useRef(null) };
  useRoll(mLo, refs.mLo); useRoll(mHi, refs.mHi); useRoll(pLo, refs.pLo); useRoll(pHi, refs.pHi);
  const fill = ((kg - 45) / (160 - 45)) * 100;
  const goalText = {
    lose: `Usually 300 to 500 kcal under this, losing 0.5 to 0.7% of your bodyweight a week (about ${(kg * 0.005).toFixed(1)} to ${(kg * 0.007).toFixed(1)} kg).`,
    build: "About 5 to 10% over this once you're trained. New to lifting? Start at this number to 5% over, and build muscle while you learn.",
    same: "Eat around this number and let the training do the work. Your weigh-ins show if it needs to move.",
  }[goal];
  const spot = useSpotlight();
  return (
    <section className="section calc-sec" aria-labelledby="calc-h">
      <div ref={spot} className="wrap calc">
        <div>
          <h2 id="calc-h">Your starting numbers</h2>
          <p className="lead" style={{ marginTop: 14 }}>The same sums your food plan starts from. Move the slider and pick what fits you.</p>
          <label className="calc-slider">
            <span className="calc-w"><b>{kg} kg</b> <span className="muted">({toStone(kg)})</span></span>
            <input type="range" min="45" max="160" step="1" value={kg} onChange={(e) => setKg(+e.target.value)} style={{ "--fill": fill + "%" }} aria-label="Your bodyweight in kilograms" />
          </label>
          <div className="calc-group">
            <span className="calc-label">How active are you?</span>
            <div className="seg" role="group" aria-label="How active are you">
              {ACTIVITY.map((x) => <button key={x.id} aria-pressed={act === x.id} onClick={() => setAct(x.id)} title={x.hint}>{x.label}</button>)}
            </div>
            <small className="muted">{a.hint}</small>
          </div>
          <div className="calc-group">
            <span className="calc-label">Your goal</span>
            <div className="seg" role="group" aria-label="Your goal">
              {GOALS.map((x) => <button key={x.id} aria-pressed={goal === x.id} onClick={() => setGoal(x.id)}>{x.label}</button>)}
            </div>
          </div>
        </div>
        <div className="calc-out" aria-live="polite">
          <div className="calc-block">
            <span className="calc-label">Maintenance calories a day</span>
            <div className="calc-num"><span ref={refs.mLo}>{comma(mLo)}</span><i>–</i><span ref={refs.mHi}>{comma(mHi)}</span></div>
            <p className="calc-goal">{goalText}</p>
          </div>
          <div className="calc-block">
            <span className="calc-label">Protein a day</span>
            <div className="calc-num small-num"><span ref={refs.pLo}>{pLo}</span><i>–</i><span ref={refs.pHi}>{pHi}</span><small>g</small></div>
          </div>
          <p className="small muted">A first guess only. If you already track your food, the questionnaire asks what you eat now, so your plan can start from your real numbers. Your weigh-ins fine-tune it from there.</p>
        </div>
      </div>
    </section>
  );
}
