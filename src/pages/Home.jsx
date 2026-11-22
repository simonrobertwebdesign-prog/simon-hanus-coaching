import { useEffect, useMemo, useState } from "react";
import { PLANS, BRAND } from "../config";
import { go, scrollToId } from "../lib/router";
import { Plate, Brand, Icon } from "../components/ui";
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
          <button onClick={() => scrollToId("inside")}>Your client area</button>
          <button onClick={() => scrollToId("plans")}>Plans</button>
          <button onClick={() => scrollToId("about")}>About Simon</button>
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

// The hero's phone: a real-looking training log, the weight going up week by week.
const BENCH = [
  { w: 62.5, r: "8, 8, 7" },
  { w: 62.5, r: "8, 8, 8" },
  { w: 65, r: "8, 7, 6" },
  { w: 65, r: "8, 8, 7" },
  { w: 67.5, r: "7, 7, 6" },
  { w: 67.5, r: "8, 8, 7" },
  { w: 70, r: "8, 7, 7" },
];

function PhoneDemo() {
  const pts = BENCH.map((b, i) => [i, b.w]);
  const x = (i) => 12 + (i / (BENCH.length - 1)) * 276;
  const y = (v) => 76 - ((v - 60) / 12) * 64;
  const d = pts.map(([i, v], k) => `${k ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <div className="phone anim" aria-label="Example: the client area on a phone">
      <div className="phone-screen">
        <div className="phone-top">
          <div>
            <div className="small muted">Upper A</div>
            <b>Bench press</b>
          </div>
          <span className="small muted">3 × 6–8</span>
        </div>
        <div className="phone-body">
          <div style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--rule-soft)", padding: "8px 6px 2px" }}>
            <svg viewBox="0 0 300 86" width="100%" aria-hidden="true">
              <line x1="12" x2="288" y1={y(65)} y2={y(65)} stroke="var(--rule-soft)" />
              <line x1="12" x2="288" y1={y(70)} y2={y(70)} stroke="var(--rule-soft)" />
              <path className="draw" d={d} fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle className="pop" cx={x(6)} cy={y(70)} r="5" fill="var(--red)" />
            </svg>
          </div>
          {BENCH.map((b, i) => (
            <div key={i} className={"logrow" + (i === BENCH.length - 1 ? " pr" : "")} style={{ "--i": i }}>
              <span className="wk">Wk {i + 1}</span>
              <span>
                <span className="w">{b.w} kg</span> <span className="reps">× {b.r}</span>
              </span>
              {i === BENCH.length - 1 ? <span className="pr-tag pop">New best</span> : <span />}
            </div>
          ))}
        </div>
        <div className="phone-tabs" aria-hidden="true">
          {[["today", "Today"], ["training", "Training"], ["progress", "Progress"], ["photos", "Photos"]].map(([i, l]) => (
            <span key={i} className={i === "training" ? "on" : ""}><Icon name={i} />{l}</span>
          ))}
        </div>
      </div>
    </div>
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
          Your own area on the site, on your phone or laptop. Simon sees the same numbers you do.
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
      <div className="screen" role="tabpanel">
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
            <p className="small muted">Photos are private: only you and Simon can see them.</p>
          </div>
        )}
        <p className="small muted" style={{ marginTop: 18 }}>Example client with made-up numbers.</p>
      </div>
    </div>
  );
}

const FAQ = [
  ["Who are the plans for?", "Anyone who wants to build muscle, lose fat, get stronger or just get fitter, whatever your age, from complete beginners to people who've trained for years. Under 18? A parent or guardian signs off in the questionnaire. Gym or home: the questionnaire asks what you have."],
  ["How fast do I get my plans?", "Within 48 hours of paying. Simon checks every plan himself before it reaches you."],
  ["What happens at a check-in?", "You send your weight, how training went and how you feel. Simon looks at everything you've logged and sends back what's working, what changes, and why."],
  ["Can I cancel?", "Yes. Monthly and Premium have no minimum term. Cancel any time and you won't be charged again."],
  ["Do I need to count calories?", "Your food plan gives you meals and amounts, so you don't have to track every bite. If you like tracking, the targets are there too."],
  ["I have an injury or a health condition. Can I still join?", "Tell us in the questionnaire. Simon looks at it personally, plans around it, and may ask you to check with your GP first."],
  ["Is it really natural?", "Yes. No steroids, no shortcuts. Just training, food, sleep and patience, done properly."],
];

export function Home({ session }) {
  return (
    <>
      <Nav session={session} />
      <main>
        <section className="hero ruled">
          <div className="wrap hero-grid">
            <div>
              <h1>Get bigger and stronger. Naturally.</h1>
              <p className="lead">
                Training and food plans built for you by Simon Hanus, a natural bodybuilder for 5 years. Log every set, watch the numbers climb, and check in with your coach.
              </p>
              <div className="row">
                <button className="btn" onClick={() => go("start")}>Start the questionnaire</button>
                <button className="btn ghost" onClick={() => scrollToId("plans")}>See plans and prices</button>
              </div>
              <div className="hero-facts">
                <div><b>From £60</b>a month</div>
                <div><b>48 hours</b>to your plans</div>
                <div><b>No minimum</b>term</div>
              </div>
            </div>
            <PhoneDemo />
          </div>
        </section>

        <section className="wrap" aria-label="What makes it different">
          <div className="facts">
            <div>
              <h3>Built from your answers</h3>
              <p className="muted">A questionnaire on your goals, body, schedule, kit and food comes first. Nothing is copied and pasted.</p>
            </div>
            <div>
              <h3>Checked by Simon</h3>
              <p className="muted">Every plan and every check-in is read and approved by Simon before you see it.</p>
            </div>
            <div>
              <h3>Changes as you do</h3>
              <p className="muted">Your logs show what's working. Stalled lift, weight not moving? The plan changes.</p>
            </div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="wrap">
            <h2>How it works</h2>
            <ol className="steps">
              <li><h3>Pick a plan</h3><p>One-off, monthly or premium. The difference is how often Simon checks in.</p></li>
              <li><h3>Answer the questions</h3><p>About 8 minutes on your goals, training, food and health.</p></li>
              <li><h3>Get your plans</h3><p>Training and food plans made for you, in your client area within 48 hours.</p></li>
              <li><h3>Train and log</h3><p>Weights, reps, sets, bodyweight and photos, straight from your phone in the gym.</p></li>
              <li><h3>Check in and adjust</h3><p>Simon reviews your numbers and moves your plan on, every 1 or 2 weeks.</p></li>
            </ol>
          </div>
        </section>

        <section className="section" id="inside" style={{ background: "var(--paper-2)" }}>
          <div className="wrap">
            <Showcase />
          </div>
        </section>

        <section className="section" id="plans">
          <div className="wrap">
            <h2>Plans and prices</h2>
            <p className="lead" style={{ marginTop: 16, maxWidth: "48ch" }}>
              Every plan includes a training plan and a food plan built for you. Heavier plate, more coaching.
            </p>
            <div className="plans">
              {PLANS.map((p) => (
                <article key={p.id} className={"plan" + (p.popular ? " popular" : "")}>
                  {p.popular && <span className="ribbon">Most popular</span>}
                  <div className="plan-head">
                    <Plate plan={p.id} size={54} />
                    <div>
                      <h3>{p.name}</h3>
                      <span className="small muted">{p.checkinDays ? `Check-in every ${p.checkinDays === 7 ? "week" : "2 weeks"}` : "No check-ins"}</span>
                    </div>
                  </div>
                  <div className="price">
                    <b>£{p.price}</b>
                    <span>{p.period === "once" ? "one payment" : "a month"}</span>
                  </div>
                  <p className="muted">{p.blurb}</p>
                  <ul>
                    {p.includes.map((i) => (
                      <li key={i}><span className="tick" aria-hidden="true">✓</span>{i}</li>
                    ))}
                    {p.missing.map((i) => (
                      <li key={i} className="no"><span className="cross" aria-hidden="true">–</span><span><span className="sr-only">Not included: </span>{i}</span></li>
                    ))}
                  </ul>
                  <button className={"btn block" + (p.popular ? "" : " ghost")} onClick={() => go("start-" + p.id)}>
                    Choose {p.name.toLowerCase()}
                  </button>
                </article>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 22 }}>
              Monthly and Premium renew each month until you cancel. Prices include everything; no extra fees.
            </p>
          </div>
        </section>

        <section className="section" id="about" style={{ background: "var(--paper-2)" }}>
          <div className="wrap about">
            <div className="portrait">
              <div className="ring" aria-hidden="true" />
              <span className="mono" aria-hidden="true">SH</span>
              <span className="note">Simon's photo goes here.</span>
            </div>
            <div className="stack" style={{ "--gap": "18px" }}>
              <h2>Hi, I'm Simon</h2>
              <p className="lead" style={{ maxWidth: "44ch" }}>
                I've trained as a natural bodybuilder for 5 years, and I've already helped loads of people get their training and food sorted.
              </p>
              <p className="measure muted">
                Everything I coach is what I do myself: train hard, eat properly, sleep, and track the numbers so you know it's working. No steroids, no fads, no copy-and-paste plans. You tell me where you are and where you want to be, and I build the plan that gets you there.
              </p>
              <div className="row">
                <button className="btn" onClick={() => go("start")}>Start the questionnaire</button>
              </div>
            </div>
          </div>
        </section>

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

        <section className="wrap" style={{ paddingBottom: 40 }}>
          <div className="cta">
            <div>
              <h2>Your first plan is 8 minutes away</h2>
              <p>Answer the questions, pick your plan, and Simon gets to work.</p>
            </div>
            <button className="btn" onClick={() => go("start")}>Start the questionnaire</button>
          </div>
        </section>
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
