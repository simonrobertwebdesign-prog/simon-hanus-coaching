import { useEffect, useMemo, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { Story } from "./home/Story";
import { prefersReduced } from "./home/motion";
import { Marquee, Pillars, StackSteps, PlanCards, FinalCta, useTilt, useSpotlight } from "./home/sections";
import { Method, WeekPlanner, StartingNumbers } from "./home/method";
import { PLANS, BRAND } from "../config";
import { go, scrollToId } from "../lib/router";
import { Plate, Brand } from "../components/ui";
import { LineChart } from "../components/Chart";
import { PhotoCompare } from "../components/PhotoCompare";
import { buildSeed, TRAINING_JAMIE, FOOD_JAMIE } from "../lib/seed";
import { strengthSeries, bodySummary } from "../lib/insights";

export function Nav({ session }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const inApp = session?.user?.role === "coach" ? "coach" : "app";
  return (
    <header className={"nav" + (scrolled ? " scrolled" : "")}>
      <div className="wrap nav-in">
        <Brand onClick={() => go("home")} />
        <nav className="nav-links" aria-label="Main">
          <button onClick={() => scrollToId("how")}>How it works</button>
          <button onClick={() => scrollToId("method")}>The method</button>
          <button onClick={() => scrollToId("inside")}>Your client area</button>
          <button onClick={() => scrollToId("plans")}>Plans</button>
        </nav>
        <span className="push" />
        {session ? (
          <button className="btn sm ghost" onClick={() => go(inApp)}>
            {inApp === "coach" ? "Coach area" : "My area"}
          </button>
        ) : (
          <button className="textbtn" onClick={() => go("login")}>
            Log in
          </button>
        )}
        <button className="btn sm" onClick={() => go("start")}>
          Start
        </button>
      </div>
    </header>
  );
}

function Showcase() {
  const demo = useMemo(() => buildSeed(), []);
  const workouts = demo.workouts["c-jamie"];
  const body = bodySummary(demo.body["c-jamie"]);
  const photos = demo.photos["c-jamie"];
  const [tab, setTab] = useState("training");
  const tabs = [
    ["training", "Your training plan", "Every exercise, set, rep and rest, made for you."],
    ["food", "Your food plan", "Calories, protein and meals you actually like."],
    ["progress", "Your progress", "Strength and bodyweight charts from what you log."],
    ["photos", "Then vs now", "Drag between your first photo and your latest."],
  ];
  return (
    <div className="show">
      <div>
        <h2>Everything in one place</h2>
        <p className="lead" style={{ marginTop: 16 }}>
          Your own area on the site, on your phone or laptop. Your coach sees the same numbers you do.
        </p>
        <div className="show-tabs" role="tablist" aria-label="Client area">
          {tabs.map(([id, t, s]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              <b>{t}</b>
              <span>{s}</span>
            </button>
          ))}
        </div>
      </div>
      <TiltScreen>
        {tab === "training" && (
          <div className="stack">
            <div className="row between">
              <h3>{TRAINING_JAMIE.title}</h3>
              <span className="chip blue">Day 1 of 4</span>
            </div>
            <table className="ex-table">
              <thead>
                <tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Rest</th></tr>
              </thead>
              <tbody>
                {TRAINING_JAMIE.days[0].exercises.map((e) => (
                  <tr key={e.name}><td>{e.name}</td><td>{e.sets}</td><td>{e.reps}</td><td>{e.rest}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "food" && (
          <div className="stack">
            <div className="row between">
              <h3>{FOOD_JAMIE.title}</h3>
              <span className="chip">{FOOD_JAMIE.calories.toLocaleString()} kcal a day</span>
            </div>
            <div className="macros">
              <div className="macro"><span>Protein</span><b>{FOOD_JAMIE.protein_g} g</b><i style={{ "--c": "var(--red)" }} /></div>
              <div className="macro"><span>Carbs</span><b>{FOOD_JAMIE.carbs_g} g</b><i style={{ "--c": "var(--blue)" }} /></div>
              <div className="macro"><span>Fat</span><b>{FOOD_JAMIE.fat_g} g</b><i style={{ "--c": "var(--yellow)" }} /></div>
              <div className="macro"><span>Water</span><b>{FOOD_JAMIE.water_l} L</b><i style={{ "--c": "var(--rule)" }} /></div>
            </div>
            <div>
              {FOOD_JAMIE.meals.slice(0, 3).map((m) => (
                <div className="meal" key={m.name}>
                  <b>{m.name}</b>
                  <ul>{m.items.map((it) => <li key={it.food}><span>{it.food}</span><span>{it.amount}</span></li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "progress" && (
          <div className="stack" style={{ "--gap": "22px" }}>
            <div>
              <div className="row between"><h3>Back squat</h3><span className="chip green">Stronger every week</span></div>
              <LineChart series={[{ name: "Estimated best", colour: "var(--blue)", points: strengthSeries(workouts, "Back squat") }]} height={190} unit="" />
            </div>
            <div>
              <div className="row between"><h3>Bodyweight</h3><span className="chip">{body.rate > 0 ? "+" : ""}{body.rate.toFixed(2)} kg a week</span></div>
              <LineChart series={[{ name: "Weigh-ins", colour: "var(--muted)", points: body.points, faint: true, width: 1.5 }, { name: "Trend", colour: "var(--red)", points: body.smooth }]} height={170} showDots={false} />
            </div>
          </div>
        )}
        {tab === "photos" && (
          <div className="stack">
            <div className="row between"><h3>Week 1 vs week 8</h3><span className="small muted">Drag the handle</span></div>
            <PhotoCompare before={photos[0]} after={photos[photos.length - 1]} />
            <p className="small muted">Photos are private: only you and your coach can see them.</p>
          </div>
        )}
        <p className="small muted" style={{ marginTop: 18 }}>Example client with made-up numbers.</p>
      </TiltScreen>
    </div>
  );
}

function TiltScreen({ children }) {
  const ref = useTilt(5);
  return <div ref={ref} className="screen" role="tabpanel">{children}</div>;
}

function InsideSection() {
  const spot = useSpotlight();
  return (
    <section ref={spot} className="section inside-sec" id="inside">
      <div className="wrap">
        <Showcase />
      </div>
    </section>
  );
}

const FAQ = [
  ["Who are the plans for?", "Anyone aged 14 or over who wants to build muscle, lose fat, get stronger or just get fitter, from complete beginners to people who've trained for years. Under 18? A parent or guardian signs off in the questionnaire. Gym or home: the questionnaire asks what you have."],
  ["What do I need to start?", "Somewhere to train (a gym, or home with the kit you have), your phone to log sessions, and bathroom scales for morning weigh-ins. Kitchen scales help with the food plan but aren't a must."],
  ["How fast do I get my plans?", "Within 48 hours of paying. Your coach checks every plan before it reaches you."],
  ["What happens at a check-in?", "You send your weight, how training went and how you feel. Your coach looks at everything you've logged and sends back what's working, what changes, and why."],
  ["Can I cancel?", "Yes. Monthly and Premium have no minimum term. Cancel any time and you won't be charged again."],
  ["Do I need to count calories?", "Your food plan gives you meals and amounts, so you don't have to track every bite. If you like tracking, the targets are there too."],
  ["I have an injury or a health condition. Can I still join?", "Tell us in the questionnaire. Your coach looks at it personally, plans around it, and may ask you to check with your GP first."],
];

// Smooth scroll for the home page only (the forms and client area keep normal scrolling).
function useSmoothScroll() {
  useEffect(() => {
    if (prefersReduced()) return;
    const lenis = new Lenis({ lerp: 0.11 });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);
}

// Section headings stretch out to full width as they scroll into view.
function useKineticHeadings() {
  useEffect(() => {
    if (prefersReduced()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray("main > .section h2").forEach((h) => {
        gsap.fromTo(h, { fontVariationSettings: '"wdth" 60' }, {
          fontVariationSettings: '"wdth" 108',
          ease: "none",
          scrollTrigger: { trigger: h, start: "top 95%", end: "top 62%", scrub: true },
        });
      });
    });
    return () => ctx.revert();
  }, []);
}

export function Home({ session }) {
  useSmoothScroll();
  useKineticHeadings();
  return (
    <>
      <Nav session={session} />
      <main>
        <Story />
        <Marquee />
        <Pillars />
        <StackSteps />
        <Method />
        <WeekPlanner />
        <StartingNumbers />

        <InsideSection />

        <PlanCards />

        <section className="section" id="faq">
          <div className="wrap">
            <h2>Questions</h2>
            <div className="faq">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap row between">
        <span>© {new Date().getFullYear()} {BRAND.name}</span>
        <div className="row">
          <button onClick={() => go("terms")}>Terms</button>
          <button onClick={() => go("privacy")}>Privacy</button>
          <button onClick={() => go("health")}>Health disclaimer</button>
          {BRAND.contactEmail && <a href={"mailto:" + BRAND.contactEmail}>{BRAND.contactEmail}</a>}
        </div>
      </div>
    </footer>
  );
}
