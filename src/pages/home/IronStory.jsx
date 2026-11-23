import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import { PLANS } from "../../config";
import { go, scrollToId } from "../../lib/router";
import { Plate } from "../../components/ui";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin);

export const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Plates go on the bar the way a lifter loads them: heaviest first.
const LOAD_ORDER = ["premium", "monthly", "oneoff"];
// When each plate lands, as a share of the whole story (matches ironScene.js).
const LANDS = { premium: 0.27, monthly: 0.39, oneoff: 0.51 };
// Example client's bench press, week by week (same numbers as the client area demo).
const CLIMB = [62.5, 62.5, 65, 65, 67.5, 67.5, 70];

const planById = (id) => PLANS.find((p) => p.id === id);
const priceText = (p) => `£${p.price} ${p.period === "once" ? "once" : "a month"}`;
const detailText = (p) => (p.checkinDays ? `Check-in every ${p.checkinDays === 7 ? "week" : "2 weeks"}` : "Plans only, no check-ins");
const kg = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function ClimbLine() {
  const x = (i) => 8 + (i / (CLIMB.length - 1)) * 284;
  const y = (v) => 72 - ((v - 60) / 12) * 62;
  const d = CLIMB.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <svg className="climb-line" viewBox="0 0 300 80" aria-hidden="true">
      <path d={d} pathLength="1" />
      <circle cx={x(CLIMB.length - 1)} cy={y(70)} r="5" />
    </svg>
  );
}

export function IronStory() {
  const root = useRef(null);
  const stage = useRef(null);
  const canvasHost = useRef(null);
  const scene = useRef(null);
  const progress = useRef(0);
  const [still] = useState(prefersReduced);
  const [gl, setGl] = useState("loading");
  const phone = typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;

  // Load the 3D world after the words are on screen, so the page shows fast.
  useEffect(() => {
    let dead = false;
    const start = async () => {
      try {
        await document.fonts?.load('800 66px "Archivo"').catch(() => {});
        const probe = document.createElement("canvas");
        if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("no WebGL");
        const { createIronWorld } = await import("./ironWorld.js");
        if (dead) return;
        scene.current = createIronWorld(canvasHost.current, { phone, still });
        scene.current.setProgress(progress.current);
        setGl("on");
      } catch (e) {
        if (!dead) setGl("off");
      }
    };
    const t = setTimeout(start, 60);
    return () => {
      dead = true;
      clearTimeout(t);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  // The mouse (or a finger) pushes the chalk dust and nudges the camera.
  useEffect(() => {
    if (still) return;
    const el = stage.current;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      scene.current?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1), true);
    };
    const leave = () => scene.current?.setPointer(0, 0, false);
    const up = (e) => e.pointerType !== "mouse" && leave();
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerup", up);
    };
  }, []);

  useGSAP(
    () => {
      if (still) return;
      const q = gsap.utils.selector(root);

      // Opening: the headline's letters rise and stretch out to full width.
      SplitText.create(q(".story-h1"), {
        type: "chars",
        autoSplit: true,
        aria: "auto",
        onSplit: (self) =>
          gsap.from(self.chars, {
            yPercent: 110,
            fontVariationSettings: '"wdth" 62',
            opacity: 0,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.028,
            delay: 0.15,
          }),
      });
      gsap.from(q(".ch-hero .hero-rest > *"), { opacity: 0, y: 18, duration: 0.7, ease: "power3.out", stagger: 0.08, delay: 0.75 });

      // The scroll story. Positions on this timeline are shares of the whole scroll (0 to 1).
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage.current,
          start: "top top",
          end: () => "+=" + Math.round(window.innerHeight * (phone ? 3.6 : 4.4)),
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            progress.current = self.progress;
            scene.current?.setProgress(self.progress);
          },
        },
      });
      tl.to({}, { duration: 1 }, 0);

      // 1. Headline squeezes and lifts away.
      tl.to(q(".scroll-cue"), { autoAlpha: 0, duration: 0.03 }, 0.005);
      tl.to(q(".story-h1"), { fontVariationSettings: '"wdth" 62', yPercent: -12, autoAlpha: 0, duration: 0.13, ease: "power1.in" }, 0.03);
      tl.to(q(".ch-hero .hero-rest"), { autoAlpha: 0, y: -40, duration: 0.08 }, 0.02);

      // 2. Plates slide on, one plan each.
      tl.fromTo(q(".ch-plates"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.005 }, 0.195);
      tl.fromTo(q(".ch-plates .plates-head"), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.2);
      LOAD_ORDER.forEach((id) => {
        const at = LANDS[id] - 0.04;
        const row = q(`.plate-row[data-plan="${id}"]`);
        tl.fromTo(row, { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.04, ease: "power2.out" }, at);
        const p = planById(id);
        tl.to(q(`.plate-row[data-plan="${id}"] .scr-price`), { scrambleText: { text: priceText(p), chars: "0123456789£", speed: 0.5 }, duration: 0.06 }, at + 0.01);
        tl.to(q(`.plate-row[data-plan="${id}"] .scr-kg`), { scrambleText: { text: `${p.plate} kg`, chars: "0123456789", speed: 0.5 }, duration: 0.04 }, at);
      });
      tl.fromTo(q(".ch-plates .plates-foot"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03 }, 0.58);
      tl.to(q(".ch-plates"), { autoAlpha: 0, y: -40, duration: 0.04 }, 0.64);

      // 3. The bar goes up and the numbers climb.
      tl.fromTo(q(".ch-climb"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.04 }, 0.66);
      const counter = { i: 0 };
      const w = q(".climb-kg")[0], wk = q(".climb-week")[0];
      tl.to(counter, {
        i: CLIMB.length - 1,
        duration: 0.17,
        onUpdate: () => {
          const i = Math.round(counter.i);
          w.textContent = kg(CLIMB[i]);
          wk.textContent = `Week ${i + 1}`;
        },
      }, 0.7);
      tl.fromTo(q(".climb-line path"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.17 }, 0.7);
      tl.fromTo(q(".climb-line circle"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.02, ease: "back.out(3)" }, 0.86);
      tl.to(q(".ch-climb"), { autoAlpha: 0, y: -40, duration: 0.03 }, 0.895);

      // 4. Last word.
      tl.fromTo(q(".ch-end"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.92);
    },
    { scope: root }
  );

  const rows = LOAD_ORDER.map(planById);

  return (
    <section ref={root} className={"story " + (still ? "is-still" : "is-motion")} aria-label="Online coaching">
      <div ref={stage} className="story-stage">
        <div ref={canvasHost} className={"story-canvas" + (gl === "on" ? " on" : "")} aria-hidden="true" />

        <div className="story-ch ch-hero">
          <div className="wrap">
            <h1 className="story-h1">
              <span className="l">Load</span>
              <span className="l hollow">the bar.</span>
            </h1>
            <div className="hero-rest">
              <p className="lead">
                Online coaching with training and food plans built for you, checked before they reach you, and changed as you get stronger.
              </p>
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
                  <li key={p.id} className="plate-row" data-plan={p.id}>
                    <Plate plan={p.id} size={46} />
                    <div>
                      <span className="pr-top">
                        <b>{p.name}</b>
                        {p.popular && <span className="chip blue">Most popular</span>}
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
              <div className="climb-num">
                <span className="climb-kg">{still ? "70" : "62.5"}</span>
                <span className="climb-unit">kg</span>
              </div>
              <div className="climb-sub">
                <b>Bench press</b> <span className="climb-week">{still ? "Week 7" : "Week 1"}</span>
              </div>
              <ClimbLine />
              <p className="small muted">Example client with made-up numbers: 62.5 kg to 70 kg in 7 weeks.</p>
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
