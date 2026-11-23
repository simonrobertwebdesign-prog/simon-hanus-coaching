// Interactive sections for the home page (test 2).
import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { PLANS } from "../../config";
import { go } from "../../lib/router";
import { prefersReduced } from "./IronStory";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---------- small effects ----------

// A glow that follows the mouse inside an element (CSS reads --mx / --my).
export function useSpotlight() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer()) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", move, { passive: true });
    return () => el.removeEventListener("pointermove", move);
  }, []);
  return ref;
}

// The element leans towards the mouse, with a soft shine where the mouse is.
export function useTilt(max = 9) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || prefersReduced()) return;
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });
    gsap.set(el, { transformPerspective: 900 });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      ry((x - 0.5) * max * 2);
      rx(-(y - 0.5) * max * 2);
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
    };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, []);
  return ref;
}

// Buttons that lean towards the mouse when it gets close.
export function useMagnetic(strength = 0.35) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || prefersReduced()) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const zone = el.parentElement;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    zone.addEventListener("pointermove", move, { passive: true });
    zone.addEventListener("pointerleave", leave);
    return () => { zone.removeEventListener("pointermove", move); zone.removeEventListener("pointerleave", leave); };
  }, []);
  return ref;
}

// ---------- the plate, drawn flat (matches the 3D plates) ----------

const ACCENT = { steel: "#d8dadd", crimson: "#c8102e", purple: "#8b3fd1" };

function dodecagon(R, cut) {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    pts.push([Math.cos(a) * R, Math.sin(a) * R]);
  }
  let d = "";
  pts.forEach((c, i) => {
    const p = pts[(i + 11) % 12], n = pts[(i + 1) % 12];
    const towards = (q) => { const dx = q[0] - c[0], dy = q[1] - c[1], l = Math.hypot(dx, dy); return [c[0] + (dx / l) * cut, c[1] + (dy / l) * cut]; };
    const a = towards(p), b = towards(n);
    d += `${i ? "L" : "M"}${a[0].toFixed(4)},${a[1].toFixed(4)} Q${c[0].toFixed(4)},${c[1].toFixed(4)} ${b[0].toFixed(4)},${b[1].toFixed(4)} `;
  });
  return d + "Z";
}
function slot(r1, r2, base, half) {
  const rm = (r1 + r2) / 2, rc = (r2 - r1) / 2;
  const P = (r, a) => `${(Math.cos(a) * r).toFixed(4)},${(Math.sin(a) * r).toFixed(4)}`;
  const a0 = base - half, a1 = base + half;
  return `M${P(r2, a0)} A${r2},${r2} 0 0 1 ${P(r2, a1)} A${rc},${rc} 0 0 1 ${P(r1, a1)} A${r1},${r1} 0 0 0 ${P(r1, a0)} A${rc},${rc} 0 0 1 ${P(r2, a0)} Z`;
}
const PLATE_D = dodecagon(0.98, 0.07) + " " + slot(0.59, 0.79, 0, 0.36) + " " + slot(0.59, 0.79, Math.PI, 0.36);

export function PlateArt({ plan, className = "" }) {
  const p = PLANS.find((x) => x.id === plan);
  const c = ACCENT[p.colour] || ACCENT.crimson;
  const uid = useId().replace(/:/g, "");
  return (
    <svg className={"plate-art " + className} viewBox="-1 -1 2 2" aria-hidden="true">
      <defs>
        <radialGradient id={`hub-${uid}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c9cdd2" />
          <stop offset="1" stopColor="#7b8087" />
        </radialGradient>
        <radialGradient id={`face-${uid}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#2b2b31" />
          <stop offset="1" stopColor="#0d0d0f" />
        </radialGradient>
      </defs>
      <path d={PLATE_D} fill={`url(#face-${uid})`} fillRule="evenodd" stroke="#3a3a42" strokeWidth="0.012" />
      <circle r="0.86" fill="none" stroke={c} strokeWidth="0.035" />
      <circle r="0.25" fill={`url(#hub-${uid})`} />
      <circle r="0.105" fill="#050506" />
      <text y="0.66" textAnchor="middle" fill="#f4f4f5" fontSize="0.21" fontWeight="900" style={{ fontVariationSettings: '"wdth" 125' }}>{p.plate} KG</text>
    </svg>
  );
}

// ---------- marquee that speeds up with your scroll ----------

function MarqueeRow({ children, reverse }) {
  return (
    <div className={"mq-row" + (reverse ? " rev" : "")}>
      <div className="mq-track">{children}{children}</div>
    </div>
  );
}

export function Marquee() {
  const root = useRef(null);
  useGSAP(() => {
    if (prefersReduced()) return;
    const tracks = gsap.utils.toArray(root.current.querySelectorAll(".mq-track"));
    const tweens = tracks.map((t, i) =>
      gsap.fromTo(t, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: 38 + i * 6, ease: "none", repeat: -1 })
    );
    ScrollTrigger.create({
      trigger: root.current,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 7);
        tweens.forEach((tw) => {
          gsap.to(tw, { timeScale: self.direction * boost, duration: 0.15, overwrite: true });
          gsap.to(tw, { timeScale: self.direction, duration: 1.2, delay: 0.15, ease: "power2.out" });
        });
      },
    });
  }, { scope: root });
  const plate = <span className="mq-plate"><PlateArt plan="monthly" /></span>;
  const one = <>{["Load the bar", "Plans built for you", "Checked before you see them"].map((t) => <span key={t} className="mq-item">{t}{plate}</span>)}</>;
  const two = <>{["Train hard", "Eat properly", "Log every set", "Check in", "Grow"].map((t) => <span key={t} className="mq-item">{t}{plate}</span>)}</>;
  return (
    <section ref={root} className="marquee" aria-label="Load the bar. Plans built for you.">
      <div aria-hidden="true">
        <MarqueeRow>{one}{one}</MarqueeRow>
        <MarqueeRow reverse>{two}{two}</MarqueeRow>
      </div>
    </section>
  );
}

// ---------- three pillars with a torch-like glow ----------

function Pillar({ title, children }) {
  const ref = useSpotlight();
  return (
    <article ref={ref} className="pillar">
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

export function Pillars() {
  return (
    <section className="section pillars-sec" aria-label="What makes it different">
      <div className="wrap pillars">
        <Pillar title="Built from your answers">A questionnaire on your goals, body, schedule, kit and food comes first. Nothing is copied and pasted.</Pillar>
        <Pillar title="Checked by Simon">Every plan and every check-in is read and approved before you see it.</Pillar>
        <Pillar title="Changes as you do">Your logs show what's working. Stalled lift, weight not moving? The plan changes.</Pillar>
      </div>
    </section>
  );
}

// ---------- how it works: cards that stack as you scroll ----------

const STEPS = [
  ["Pick your plate", "One-off, monthly or premium. The heavier the plate, the more often you check in."],
  ["Answer the questions", "About 8 minutes on your goals, training, food and health. Under 18? A parent or guardian signs off."],
  ["Get your plans", "Training and food plans made for you, in your client area within 48 hours."],
  ["Train and log", "Weights, reps, sets and bodyweight, straight from your phone in the gym."],
  ["Check in and grow", "Your numbers get read and your plan moves on, every week or every 2 weeks."],
];

export function StackSteps() {
  const root = useRef(null);
  useGSAP(() => {
    if (prefersReduced()) return;
    const cards = gsap.utils.toArray(root.current.querySelectorAll(".step-card"));
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: 0.93, "--dim": 0.5, ease: "none",
        scrollTrigger: { trigger: next, start: "top 75%", end: "top 25%", scrub: true },
      });
    });
  }, { scope: root });
  return (
    <section className="section" id="how">
      <div className="wrap">
        <h2>How it works</h2>
        <ol ref={root} className="stack-steps">
          {STEPS.map(([t, s], i) => (
            <li key={t} className="step-card" style={{ "--i": i }}>
              <span className="step-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{t}</h3>
                <p>{s}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------- plans: pick your plate ----------

function PlanCard({ p }) {
  const ref = useTilt(7);
  const priceRef = useRef(null);
  useGSAP(() => {
    if (prefersReduced()) return;
    const o = { v: 0 };
    gsap.to(o, {
      v: p.price, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: priceRef.current, start: "top 88%", once: true },
      onUpdate: () => { if (priceRef.current) priceRef.current.textContent = "£" + Math.round(o.v); },
    });
  });
  return (
    <article ref={ref} className={"plan2 " + p.colour + (p.popular ? " popular" : "")}>
      <div className="plan2-shine" aria-hidden="true" />
      {p.popular && <span className="ribbon">Most popular</span>}
      <PlateArt plan={p.id} className="spin" />
      <h3>{p.name}</h3>
      <span className="small muted">{p.plate} kg plate, {p.checkinDays ? `check-in every ${p.checkinDays === 7 ? "week" : "2 weeks"}` : "no check-ins"}</span>
      <div className="price">
        <b ref={priceRef}>£{p.price}</b>
        <span>{p.period === "once" ? "one payment" : "a month"}</span>
      </div>
      <p className="muted">{p.blurb}</p>
      <ul>
        {p.includes.map((i) => <li key={i}><span className="tick" aria-hidden="true">✓</span>{i}</li>)}
        {p.missing.map((i) => <li key={i} className="no"><span className="cross" aria-hidden="true">–</span><span><span className="sr-only">Not included: </span>{i}</span></li>)}
      </ul>
      <button className={"btn block" + (p.popular ? "" : " ghost")} onClick={() => go("start-" + p.id)}>Choose {p.name.toLowerCase()}</button>
    </article>
  );
}

export function PlanCards() {
  return (
    <section className="section plans-sec" id="plans">
      <div className="wrap">
        <h2>Pick your plate</h2>
        <p className="lead" style={{ marginTop: 16, maxWidth: "46ch" }}>Every plan includes a training plan and a food plan built for you. Heavier plate, more coaching.</p>
        <div className="plans2">{PLANS.map((p) => <PlanCard key={p.id} p={p} />)}</div>
        <p className="small muted" style={{ marginTop: 22 }}>Monthly and Premium renew each month until you cancel. Prices include everything; no extra fees.</p>
      </div>
    </section>
  );
}

// ---------- protein calculator ----------

const toStone = (kg) => {
  const lb = Math.round(kg * 2.20462);
  return `${Math.floor(lb / 14)} st ${lb % 14} lb`;
};

export function ProteinCalc() {
  const [kg, setKg] = useState(75);
  const lowRef = useRef(null), highRef = useRef(null);
  const shown = useRef({ lo: Math.round(75 * 1.6), hi: Math.round(75 * 2.2) });
  useEffect(() => {
    const lo = Math.round(kg * 1.6), hi = Math.round(kg * 2.2);
    if (prefersReduced()) {
      lowRef.current.textContent = lo; highRef.current.textContent = hi;
      return;
    }
    gsap.to(shown.current, {
      lo, hi, duration: 0.45, ease: "power2.out", overwrite: true,
      onUpdate: () => {
        lowRef.current.textContent = Math.round(shown.current.lo);
        highRef.current.textContent = Math.round(shown.current.hi);
      },
    });
  }, [kg]);
  const fill = ((kg - 40) / (160 - 40)) * 100;
  const spot = useSpotlight();
  return (
    <section className="section calc-sec" aria-labelledby="calc-h">
      <div ref={spot} className="wrap calc">
        <div>
          <h2 id="calc-h">How much protein do you need?</h2>
          <p className="lead" style={{ marginTop: 16 }}>Slide to your bodyweight. This is the range the research supports: 1.6 to 2.2 g of protein per kg, every day.</p>
          <label className="calc-slider">
            <span className="calc-w"><b>{kg} kg</b> <span className="muted">({toStone(kg)})</span></span>
            <input type="range" min="40" max="160" step="1" value={kg} onChange={(e) => setKg(+e.target.value)} style={{ "--fill": fill + "%" }} aria-label="Your bodyweight in kilograms" />
          </label>
        </div>
        <div className="calc-out" aria-live="polite">
          <span className="calc-label">Protein a day</span>
          <div className="calc-num"><span ref={lowRef}>{Math.round(75 * 1.6)}</span><i>–</i><span ref={highRef}>{Math.round(75 * 2.2)}</span><small>g</small></div>
          <p className="small muted">A rough guide only. Your food plan sets your exact numbers, and they change as you go.</p>
        </div>
      </div>
    </section>
  );
}

// ---------- words that light up as you read ----------

export function RevealText({ children, className = "" }) {
  const ref = useRef(null);
  useGSAP(() => {
    if (prefersReduced()) return;
    SplitText.create(ref.current, {
      type: "words",
      autoSplit: true,
      onSplit: (self) =>
        gsap.fromTo(self.words, { opacity: 0.16 }, {
          opacity: 1, stagger: 0.08, ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top 82%", end: "bottom 45%", scrub: true },
        }),
    });
  }, { scope: ref });
  return <p ref={ref} className={className}>{children}</p>;
}

// ---------- last call ----------

export function FinalCta() {
  const spot = useSpotlight();
  const mag = useMagnetic();
  return (
    <section className="wrap" style={{ paddingBottom: 40 }}>
      <div ref={spot} className="cta2">
        <div>
          <h2>Your first plan is 8 minutes away.</h2>
          <p>Answer the questions, pick your plate, and your plans get built for you.</p>
        </div>
        <div className="mag-zone">
          <button ref={mag} className="btn big-btn" onClick={() => go("start")}>Start the questionnaire</button>
        </div>
      </div>
    </section>
  );
}
