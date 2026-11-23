// The home page scroll story: words over the 3D barbell world.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import { PLANS } from "../../config";
import { go, scrollToId } from "../../lib/router";
import { Plate } from "../../components/ui";
import { prefersReduced } from "./motion";
import { T, CLIMB, PIN_SCREENS, weekAt, kgAt } from "./storyTiming";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin);

const LOAD_ORDER = ["premium", "monthly", "oneoff"];
const planById = (id) => PLANS.find((p) => p.id === id);
const priceText = (p) => `£${p.price} ${p.period === "once" ? "once" : "a month"}`;
const detailText = (p) => (p.checkinDays ? `Check-in every ${p.checkinDays === 7 ? "week" : "2 weeks"}` : "Plans only, no check-ins");
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const repTotal = (r) => r.split(",").reduce((s, n) => s + +n, 0);

// What changed this week, in plain words.
function deltaText(i) {
  if (i === 0) return "Starting point";
  const a = CLIMB[i - 1], b = CLIMB[i];
  if (b.kg > a.kg) return i === CLIMB.length - 1 ? `New best, +${fmt(b.kg - a.kg)} kg` : `+${fmt(b.kg - a.kg)} kg on the bar`;
  const d = repTotal(b.reps) - repTotal(a.reps);
  return d > 0 ? `Same weight, +${d} rep${d === 1 ? "" : "s"}` : "Same weight";
}

// ---------- the chart ----------
const CW = 520, CH = 210, M = { l: 38, r: 14, t: 14, b: 30 };
const cx = (w) => M.l + (w / (CLIMB.length - 1)) * (CW - M.l - M.r);
const cy = (kg) => M.t + (1 - (kg - 60) / 12.5) * (CH - M.t - M.b);
const LINE = CLIMB.map((c, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${cy(c.kg).toFixed(1)}`).join(" ");
const AREA = `${LINE} L${cx(CLIMB.length - 1)},${CH - M.b} L${cx(0)},${CH - M.b} Z`;

function ClimbChart({ full }) {
  return (
    <svg className="climb-chart" viewBox={`0 0 ${CW} ${CH}`} aria-hidden="true">
      <defs>
        <linearGradient id="climb-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#9e1028" stopOpacity="0.55" />
          <stop offset="1" stopColor="#9e1028" stopOpacity="0" />
        </linearGradient>
        <clipPath id="climb-clip"><rect className="climb-reveal" x="0" y="0" width={full ? CW : M.l} height={CH} /></clipPath>
      </defs>
      {[60, 65, 70].map((v) => (
        <g key={v}>
          <line x1={M.l} x2={CW - M.r} y1={cy(v)} y2={cy(v)} className="grid" />
          <text x={M.l - 8} y={cy(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      <line x1={M.l} x2={CW - M.r} y1={cy(62.5)} y2={cy(62.5)} className="start" />
      {CLIMB.map((c, i) => <text key={i} x={cx(i)} y={CH - 8} textAnchor="middle" className={"wk wk-" + i}>W{i + 1}</text>)}
      <g clipPath="url(#climb-clip)">
        <path d={AREA} fill="url(#climb-fill)" />
        <path d={LINE} className="line" />
      </g>
      {CLIMB.map((c, i) => <circle key={i} cx={cx(i)} cy={cy(c.kg)} r="5" className={"dot" + (full ? " on" : "")} data-i={i} />)}
      <circle className="head" cx={cx(full ? CLIMB.length - 1 : 0)} cy={cy(full ? 70 : 62.5)} r="8" />
    </svg>
  );
}

export function Story() {
  const root = useRef(null);
  const stage = useRef(null);
  const canvasHost = useRef(null);
  const world = useRef(null);
  const progress = useRef(0);
  const [still] = useState(prefersReduced);
  const [gl, setGl] = useState("loading");
  const phone = typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;

  // Load the 3D world after the words are on screen, so the page shows fast.
  useEffect(() => {
    let dead = false;
    const start = async () => {
      try {
        await Promise.all([document.fonts?.load('900 66px "Anybody"'), document.fonts?.load('900 italic 66px "Anybody"')]).catch(() => {});
        const probe = document.createElement("canvas");
        if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("no WebGL");
        const { createIronWorld } = await import("./ironWorld.js");
        if (dead) return;
        world.current = createIronWorld(canvasHost.current, { phone, still });
        world.current.setProgress(progress.current);
        setGl("on");
      } catch {
        if (!dead) setGl("off");
      }
    };
    const t = setTimeout(start, 60);
    return () => { dead = true; clearTimeout(t); world.current?.dispose(); world.current = null; };
  }, []);

  // The mouse (or a finger) pushes the dust and nudges the camera.
  useEffect(() => {
    if (still) return;
    const el = stage.current;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      world.current?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1), true);
    };
    const leave = () => world.current?.setPointer(0, 0, false);
    const up = (e) => e.pointerType !== "mouse" && leave();
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerup", up);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); el.removeEventListener("pointerup", up); };
  }, []);

  useGSAP(() => {
    if (still) return;
    const q = gsap.utils.selector(root);

    // Opening: the headline's letters rise and stretch out.
    SplitText.create(q(".story-h1"), {
      type: "chars",
      autoSplit: true,
      aria: "auto",
      onSplit: (self) =>
        gsap.from(self.chars, { yPercent: 110, fontVariationSettings: '"wdth" 50', opacity: 0, duration: 1, ease: "expo.out", stagger: 0.035, delay: 0.15 }),
    });
    gsap.from(q(".ch-hero .hero-rest > *"), { opacity: 0, y: 18, duration: 0.7, ease: "power3.out", stagger: 0.08, delay: 0.8 });

    const rail = q(".story-rail i")[0];
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage.current,
        start: "top top",
        end: () => "+=" + Math.round(window.innerHeight * (phone ? PIN_SCREENS.phone : PIN_SCREENS.desktop)),
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progress.current = self.progress;
          world.current?.setProgress(self.progress);
          if (rail) rail.style.transform = `scaleY(${self.progress})`;
        },
      },
    });
    tl.to({}, { duration: 1 }, 0);
    const span = ([a, b]) => b - a;

    // 1. Headline squeezes and lifts away.
    tl.to(q(".scroll-cue"), { autoAlpha: 0, duration: 0.02 }, 0.004);
    tl.to(q(".story-h1"), { fontVariationSettings: '"wdth" 50', yPercent: -12, autoAlpha: 0, duration: span(T.heroOut), ease: "power1.in" }, T.heroOut[0]);
    tl.to(q(".ch-hero .hero-rest"), { autoAlpha: 0, y: -40, duration: span(T.heroOut) * 0.8 }, T.heroOut[0]);

    // 2. Plates slide on, one plan each.
    tl.fromTo(q(".ch-plates"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.004 }, T.platesIn - 0.004);
    tl.fromTo(q(".ch-plates .plates-head"), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.03 }, T.platesIn);
    LOAD_ORDER.forEach((id) => {
      const [a, b] = T.plates[id];
      const p = planById(id);
      const row = q(`.plate-row[data-plan="${id}"]`);
      tl.fromTo(row, { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.03, ease: "power2.out" }, a);
      tl.to(q(`.plate-row[data-plan="${id}"] .scr-kg`), { scrambleText: { text: `${p.plate} kg`, chars: "0123456789", speed: 0.5 }, duration: 0.03 }, a);
      tl.to(q(`.plate-row[data-plan="${id}"] .scr-price`), { scrambleText: { text: priceText(p), chars: "0123456789£", speed: 0.5 }, duration: 0.05 }, a + 0.01);
      tl.fromTo(row, { "--lit": 0 }, { "--lit": 1, duration: (b - a) * 0.6 }, a + (b - a) * 0.4);
    });
    tl.fromTo(q(".ch-plates .plates-foot"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, T.clip[0]);
    tl.to(q(".ch-plates"), { autoAlpha: 0, y: -40, duration: span(T.platesOut) }, T.platesOut[0]);

    // 3. The numbers climb, week by week, and the bar goes up with them.
    tl.fromTo(q(".ch-climb"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: span(T.climbIn) }, T.climbIn[0]);
    const kgEl = q(".climb-kg")[0], wkEl = q(".climb-week")[0], dEl = q(".climb-delta")[0], setsEl = q(".climb-sets")[0];
    const reveal = q(".climb-reveal")[0], head = q(".climb-chart .head")[0], dots = q(".climb-chart .dot"), wks = q(".climb-chart .wk");
    let last = -1;
    const proxy = { p: T.climb[0] };
    tl.to(proxy, {
      p: T.climb[1],
      duration: span(T.climb),
      onUpdate: () => {
        const w = weekAt(proxy.p);
        const kg = kgAt(w);
        const ci = Math.min(CLIMB.length - 1, Math.floor(w + 0.45));
        kgEl.textContent = fmt(Math.round(kg * 2) / 2);
        reveal.setAttribute("width", String(cx(w) + 2));
        head.setAttribute("cx", cx(w).toFixed(1));
        head.setAttribute("cy", cy(kg).toFixed(1));
        if (ci !== last) {
          last = ci;
          wkEl.textContent = `Week ${ci + 1}`;
          dEl.textContent = deltaText(ci);
          dEl.className = "climb-delta" + (ci === 0 ? "" : CLIMB[ci].kg > CLIMB[ci - 1].kg ? " up" : " reps") + (ci === CLIMB.length - 1 ? " best" : "");
          setsEl.textContent = `${fmt(CLIMB[ci].kg)} kg × ${CLIMB[ci].reps}`;
          dots.forEach((d, i) => d.classList.toggle("on", i <= ci));
          wks.forEach((d, i) => d.classList.toggle("on", i === ci));
          gsap.fromTo(dEl, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", overwrite: true });
        }
      },
    }, T.climb[0]);
    tl.to(q(".ch-climb"), { autoAlpha: 0, y: -40, duration: span(T.climbOut) }, T.climbOut[0]);

    // 4. Last word.
    tl.fromTo(q(".ch-end"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: span(T.endIn) }, T.endIn[0]);
  }, { scope: root });

  const rows = LOAD_ORDER.map(planById);
  const lastWeek = CLIMB[CLIMB.length - 1];

  return (
    <section ref={root} className={"story " + (still ? "is-still" : "is-motion")} aria-label="Online coaching">
      <div ref={stage} className="story-stage">
        <div ref={canvasHost} className={"story-canvas" + (gl === "on" ? " on" : "")} aria-hidden="true" />
        {!still && <div className="story-rail" aria-hidden="true"><i /></div>}

        <div className="story-ch ch-hero">
          <div className="wrap">
            <h1 className="story-h1">
              <span className="l">Load</span>
              <span className="l hollow">the bar.</span>
            </h1>
            <div className="hero-rest">
              <p className="lead">Online coaching with training and food plans built for you, checked before they reach you, and changed as you get stronger.</p>
              <div className="row">
                <button className="btn" onClick={() => go("start")}>Start the questionnaire</button>
                <button className="btn ghost" onClick={() => scrollToId("plans")}>See plans and prices</button>
              </div>
            </div>
          </div>
          {!still && <div className="scroll-cue" aria-hidden="true"><span />Scroll to load the bar</div>}
        </div>

        <div className="story-ch ch-plates">
          <div className="wrap">
            <div className="plates-panel">
              <h2 className="plates-head">Heavier plate,<br />more coaching.</h2>
              <ul className="plate-rows">
                {rows.map((p) => (
                  <li key={p.id} className={"plate-row " + p.colour} data-plan={p.id}>
                    <Plate plan={p.id} size={46} />
                    <div>
                      <span className="pr-top">
                        <b>{p.name}</b>
                        {p.popular && <span className="chip red">Most popular</span>}
                      </span>
                      <span className="pr-meta">
                        <span className="sr-only">{p.plate} kg plate, {priceText(p)}, {detailText(p)}</span>
                        <span aria-hidden="true">
                          <span className="scr-kg">{still ? `${p.plate} kg` : ""}</span>
                          <span className="dotsep" />
                          <span className="scr-price">{still ? priceText(p) : ""}</span>
                        </span>
                      </span>
                      <span className="pr-detail">{detailText(p)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="plates-foot">
                <button className="link" onClick={() => scrollToId("plans")}>Compare everything in each plan</button>
              </div>
            </div>
          </div>
        </div>

        <div className="story-ch ch-climb">
          <div className="wrap">
            <div className="climb-panel">
              <h2>Log every set. Watch the numbers climb.</h2>
              <div className="climb-top">
                <div className="climb-num"><span className="climb-kg">{fmt(still ? lastWeek.kg : CLIMB[0].kg)}</span><span className="climb-unit">kg</span></div>
                <div className="climb-meta">
                  <span className="climb-week">{still ? `Week ${CLIMB.length}` : "Week 1"}</span>
                  <span className={"climb-delta" + (still ? " up best" : "")}>{still ? deltaText(CLIMB.length - 1) : "Starting point"}</span>
                </div>
              </div>
              <div className="climb-log"><b>Bench press</b><span className="climb-sets">{fmt(still ? lastWeek.kg : CLIMB[0].kg)} kg × {still ? lastWeek.reps : CLIMB[0].reps}</span></div>
              <ClimbChart full={still} />
              <p className="climb-how">Hit the top of your reps on every set, then add the smallest weight. Same weight with more reps counts as progress too.</p>
              <p className="small muted">Example client with made-up numbers.</p>
            </div>
          </div>
        </div>

        <div className="story-ch ch-end">
          <div className="wrap">
            <div className="end-panel">
              <h2>Every plan checked before it reaches you.</h2>
              <p className="lead">Built from your answers, read and approved by your coach, then changed as you do.</p>
              <div className="row">
                <button className="btn" onClick={() => go("start")}>Start the questionnaire</button>
                <button className="btn ghost" onClick={() => scrollToId("plans")}>See plans and prices</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
