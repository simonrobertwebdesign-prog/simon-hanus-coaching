// Demo data so the site can be clicked through before the database is connected.
// Every person here is made up and labelled as demo data on screen.
import { addDays, today, rng, round, uid } from "./util";

const ex = (name, sets, reps, rest, notes = "") => ({ name, sets, reps, rest, notes });

export const TRAINING_JAMIE = {
  title: "Upper / lower, 4 days",
  summary:
    "Four sessions a week: two upper body, two lower body. Each muscle is trained twice a week with enough rest to recover and grow.",
  days_per_week: 4,
  schedule: "Mon upper A, Tue lower A, Thu upper B, Fri lower B",
  effort: "Finish most sets with 1–2 reps left in the tank. Last set of each exercise can go to 0–1.",
  progression:
    "Use the rep range. When you hit the top of the range on every set, add the smallest weight jump next time and start again at the bottom.",
  days: [
    {
      name: "Upper A",
      focus: "Chest and back, heavier",
      exercises: [
        ex("Bench press", 3, "6-8", "3 min"),
        ex("Chest-supported row", 3, "8-10", "2 min"),
        ex("Incline dumbbell press", 3, "8-12", "2 min"),
        ex("Lat pulldown", 3, "10-12", "2 min"),
        ex("Lateral raise", 3, "12-15", "1 min"),
        ex("Triceps pushdown", 2, "10-12", "1 min"),
        ex("EZ-bar curl", 2, "10-12", "1 min"),
      ],
    },
    {
      name: "Lower A",
      focus: "Squat focus",
      exercises: [
        ex("Back squat", 3, "5-7", "3 min"),
        ex("Romanian deadlift", 3, "8-10", "2 min"),
        ex("Leg press", 3, "10-12", "2 min"),
        ex("Lying leg curl", 3, "10-12", "1.5 min"),
        ex("Standing calf raise", 3, "10-15", "1 min"),
        ex("Cable crunch", 2, "12-15", "1 min"),
      ],
    },
    {
      name: "Upper B",
      focus: "Shoulders and back, more reps",
      exercises: [
        ex("Overhead press", 3, "6-8", "3 min"),
        ex("Pull-up", 3, "6-10", "2 min", "Add weight once you get 10 on every set."),
        ex("Machine chest press", 3, "8-10", "2 min"),
        ex("Seated cable row", 3, "10-12", "2 min"),
        ex("Rear delt fly", 3, "12-15", "1 min"),
        ex("Incline dumbbell curl", 2, "10-12", "1 min"),
        ex("Overhead triceps extension", 2, "10-12", "1 min"),
      ],
    },
    {
      name: "Lower B",
      focus: "Hinge focus",
      exercises: [
        ex("Trap bar deadlift", 3, "4-6", "3 min"),
        ex("Hack squat", 3, "8-10", "2 min"),
        ex("Hip thrust", 3, "8-12", "2 min"),
        ex("Walking lunge", 2, "10 each leg", "1.5 min"),
        ex("Seated leg curl", 3, "10-12", "1.5 min"),
        ex("Seated calf raise", 3, "12-15", "1 min"),
      ],
    },
  ],
  notes: [
    "Warm up with 2–3 lighter sets on the first exercise of each day.",
    "Log every set, even bad days. The numbers tell us what to change.",
  ],
};

export const FOOD_JAMIE = {
  title: "Lean bulk",
  calories: 2850,
  protein_g: 165,
  carbs_g: 360,
  fat_g: 80,
  water_l: 3,
  summary: "A small surplus so you gain about 0.25 kg a week, mostly muscle.",
  meals: [
    {
      name: "Breakfast",
      items: [
        { food: "Oats", amount: "100 g" },
        { food: "Greek yoghurt", amount: "200 g" },
        { food: "Semi-skimmed milk", amount: "250 ml" },
        { food: "Banana", amount: "1" },
      ],
    },
    {
      name: "Lunch",
      items: [
        { food: "Chicken breast", amount: "180 g" },
        { food: "Rice (dry weight)", amount: "110 g" },
        { food: "Mixed veg", amount: "150 g" },
        { food: "Olive oil", amount: "1 tsp" },
      ],
    },
    {
      name: "Before training",
      items: [
        { food: "Greek yoghurt 0%", amount: "250 g" },
        { food: "Granola", amount: "40 g" },
        { food: "Berries", amount: "100 g" },
      ],
    },
    {
      name: "Dinner",
      items: [
        { food: "5% beef mince", amount: "200 g" },
        { food: "Pasta (dry weight)", amount: "110 g" },
        { food: "Tomato pasta sauce", amount: "150 g" },
        { food: "Side salad", amount: "1 bowl" },
      ],
    },
    {
      name: "Evening",
      items: [
        { food: "Wholemeal toast", amount: "2 slices" },
        { food: "Peanut butter", amount: "25 g" },
      ],
    },
  ],
  swaps: [
    "Chicken ↔ turkey mince, white fish or tofu (same weight)",
    "Rice ↔ potatoes (×3 the weight) or wraps (2)",
    "Greek yoghurt ↔ skyr or cottage cheese",
  ],
  notes: [
    "Hit protein and calories most days; the exact foods can change.",
    "Weigh yourself 3–4 mornings a week after the toilet, before food.",
  ],
};

export const TRAINING_PRIYA = {
  title: "Full body, 3 days",
  summary: "Three full-body sessions a week. Keeps strength up while you lose fat.",
  days_per_week: 3,
  schedule: "Mon, Wed, Fri",
  effort: "Stop each set with 1–3 reps left.",
  progression: "Same as always: top of the rep range on every set, then add a little weight.",
  days: [
    {
      name: "Full body A",
      focus: "Squat, push, pull",
      exercises: [
        ex("Goblet squat", 3, "8-12", "2 min"),
        ex("Dumbbell bench press", 3, "8-10", "2 min"),
        ex("Lat pulldown", 3, "10-12", "2 min"),
        ex("Hip thrust", 3, "10-12", "2 min"),
        ex("Lateral raise", 2, "12-15", "1 min"),
      ],
    },
    {
      name: "Full body B",
      focus: "Hinge, press, row",
      exercises: [
        ex("Romanian deadlift", 3, "8-10", "2 min"),
        ex("Seated dumbbell press", 3, "8-12", "2 min"),
        ex("Cable row", 3, "10-12", "2 min"),
        ex("Leg press", 3, "10-15", "2 min"),
        ex("Plank", 2, "30-45 sec", "1 min"),
      ],
    },
  ],
  notes: ["Walk 8,000+ steps a day. It burns fat without eating into recovery."],
};

export const FOOD_PRIYA = {
  title: "Fat loss",
  calories: 1750,
  protein_g: 130,
  carbs_g: 170,
  fat_g: 60,
  water_l: 2.5,
  summary: "About 400 kcal under maintenance, aiming for 0.4–0.6 kg a week.",
  meals: [
    { name: "Breakfast", items: [{ food: "Eggs", amount: "2" }, { food: "Egg whites", amount: "100 g" }, { food: "Wholemeal toast", amount: "1 slice" }] },
    { name: "Lunch", items: [{ food: "Chicken wrap", amount: "1 large" }, { food: "Salad", amount: "1 bowl" }] },
    { name: "Snack", items: [{ food: "Skyr", amount: "150 g" }, { food: "Apple", amount: "1" }] },
    { name: "Dinner", items: [{ food: "Salmon fillet", amount: "130 g" }, { food: "New potatoes", amount: "200 g" }, { food: "Green veg", amount: "200 g" }] },
  ],
  swaps: ["Salmon ↔ chicken thighs or prawns"],
  notes: ["One meal out a week is fine. Pick a protein and a veg."],
};

export const TRAINING_TOM_DRAFT = {
  title: "Push / pull / legs, 3 days",
  summary: "Three sessions a week to fit around shifts. Simple lifts, easy to progress.",
  days_per_week: 3,
  schedule: "Any 3 days with a rest day after legs",
  effort: "Leave 2 reps in the tank for the first 4 weeks while you learn the lifts.",
  progression: "Top of the rep range on every set, then add the smallest jump.",
  days: [
    { name: "Push", focus: "Chest, shoulders, triceps", exercises: [ex("Dumbbell bench press", 3, "8-10", "2 min"), ex("Seated shoulder press", 3, "8-10", "2 min"), ex("Cable fly", 2, "12-15", "1 min"), ex("Lateral raise", 3, "12-15", "1 min"), ex("Triceps pushdown", 2, "10-12", "1 min")] },
    { name: "Pull", focus: "Back, biceps", exercises: [ex("Lat pulldown", 3, "8-10", "2 min"), ex("Chest-supported row", 3, "8-10", "2 min"), ex("Face pull", 2, "12-15", "1 min"), ex("Dumbbell curl", 3, "10-12", "1 min")] },
    { name: "Legs", focus: "Quads, hamstrings, calves", exercises: [ex("Leg press", 3, "10-12", "2 min"), ex("Romanian deadlift", 3, "8-10", "2 min"), ex("Leg extension", 2, "12-15", "1 min"), ex("Lying leg curl", 2, "10-12", "1 min"), ex("Calf raise", 3, "12-15", "1 min")] },
  ],
  notes: ["Machines first while you build technique; barbell squats can come in at week 5."],
};

export const WHY_TOM = [
  {
    point: "3 days, push / pull / legs",
    why: "He said shifts change week to week and 3 days is all he can promise.",
    effect: "He can stick to it, and every muscle still gets hard work once a week plus arms on two days.",
  },
  {
    point: "Machines and dumbbells first",
    why: "New to the gym (under 6 months) and said he feels unsure on barbell lifts.",
    effect: "Safer while he learns, and he can push closer to failure without form breaking down.",
  },
  {
    point: "2 reps in the tank for 4 weeks",
    why: "Beginner, and he mentioned getting very sore in the past.",
    effect: "Less soreness, so he doesn't skip sessions in the first month.",
  },
];

export const FOOD_TOM_DRAFT = {
  title: "Build muscle, simple meals",
  calories: 2650,
  protein_g: 150,
  carbs_g: 320,
  fat_g: 80,
  water_l: 3,
  summary: "Small surplus with meals he can make in 10 minutes.",
  meals: [
    { name: "Breakfast", items: [{ food: "Overnight oats with Greek yoghurt", amount: "1 pot" }, { food: "Banana", amount: "1" }] },
    { name: "Lunch", items: [{ food: "Meal-deal: chicken sandwich", amount: "1" }, { food: "Protein yoghurt", amount: "1" }, { food: "Fruit", amount: "1" }] },
    { name: "Dinner", items: [{ food: "Chicken thighs", amount: "200 g" }, { food: "Microwave rice", amount: "1 pouch" }, { food: "Frozen veg", amount: "150 g" }] },
    { name: "Evening", items: [{ food: "Milk", amount: "400 ml" }, { food: "Peanut butter on toast", amount: "2 slices" }] },
  ],
  swaps: ["Meal-deal sandwich ↔ wrap or pasta pot with at least 25 g protein"],
  notes: ["Works on a supermarket budget and with no time to cook on shift days."],
};

export const WHY_TOM_FOOD = [
  { point: "2,650 kcal", why: "His weight has been flat for months on about 2,400 kcal.", effect: "Roughly +250 kcal a day, so about 0.25 kg gained a week, mostly muscle." },
  { point: "Meal-deal lunch", why: "Said he eats at work and can't bring food.", effect: "He'll actually hit protein on shift days instead of skipping lunch." },
];

function genWorkouts(plan, startISO, weeks, seed, opts = {}) {
  const r = rng(seed);
  const pattern = opts.pattern || [0, 1, 3, 4]; // weekday offsets from Monday
  const base = { ...(opts.base || {}) };
  for (const d of plan.days) for (const e of d.exercises) if (base[e.name] == null) base[e.name] = Math.round(10 + r() * 40);
  const logs = [];
  for (let w = 0; w < weeks; w++) {
    pattern.forEach((off, i) => {
      const date = addDays(startISO, w * 7 + off);
      if (date > today()) return;
      if (r() < (opts.skip ?? 0.08)) return; // missed day
      const day = plan.days[i % plan.days.length];
      const entries = day.exercises.map((e) => {
        const [lo, hi] = String(e.reps).split("-").map((x) => parseInt(x)) ;
        const top = hi || lo || 10;
        const b = base[e.name];
        const prog = opts.stall?.includes(e.name) && w > weeks - 3 ? weeks - 3 : w;
        const weight = round(b + prog * (b > 60 ? 2.5 : 1.25) * 0.5, b > 30 ? 2.5 : 1);
        const sets = Array.from({ length: e.sets }, (_, si) => ({
          weight,
          reps: Math.max(lo || 5, top - si - Math.floor(r() * 2)),
          done: true,
        }));
        return { exercise: e.name, target: e.reps, sets };
      });
      logs.push({ id: uid(), date, day_name: day.name, entries, notes: "" });
    });
  }
  return logs;
}

function genBody(startISO, weeks, start, ratePerWeek, seed) {
  const r = rng(seed);
  const out = [];
  for (let d = 0; d <= weeks * 7; d += r() < 0.5 ? 2 : 3) {
    const date = addDays(startISO, d);
    if (date > today()) break;
    const v = start + (ratePerWeek * d) / 7 + (r() - 0.5) * 0.9;
    out.push({ id: uid(), date, weight_kg: Math.round(v * 10) / 10 });
  }
  return out;
}

// Simple placeholder "photo": a body outline, slightly leaner or bigger.
export function silhouette(label, waist = 1, shoulders = 1, tone = "#B9C2CA") {
  const sw = 70 * shoulders;
  const ww = 46 * waist;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'>
<rect width='300' height='400' fill='#DCE2E7'/>
<circle cx='150' cy='70' r='30' fill='${tone}'/>
<path d='M${150 - sw} 115 Q150 98 ${150 + sw} 115 L${150 + ww + 6} 250 Q150 262 ${150 - ww - 6} 250 Z' fill='${tone}'/>
<path d='M${150 - sw} 118 L${150 - sw - 22} 240 L${150 - sw - 6} 244 L${150 - sw + 12} 150 Z M${150 + sw} 118 L${150 + sw + 22} 240 L${150 + sw + 6} 244 L${150 + sw - 12} 150 Z' fill='${tone}'/>
<path d='M${150 - ww - 4} 250 L${150 - 42} 385 L${150 - 14} 385 L150 280 L${150 + 14} 385 L${150 + 42} 385 L${150 + ww + 4} 250 Z' fill='${tone}'/>
<text x='150' y='392' font-family='Arial' font-size='14' text-anchor='middle' fill='#5B6672'>${label}</text>
</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function buildSeed() {
  const t = today();
  const jamieStart = addDays(t, -56);
  const priyaStart = addDays(t, -35);
  const ellieStart = addDays(t, -42);

  const clients = [
    {
      id: "c-jamie", full_name: "Jamie Carter", email: "jamie@example.com", plan: "monthly",
      status: "active", start_date: jamieStart, next_checkin: t, payment_confirmed: true,
      flags: [], coach_notes: "Wants bigger shoulders. Works 9–5, trains after work.", created_at: jamieStart,
    },
    {
      id: "c-priya", full_name: "Priya Shah", email: "priya@example.com", plan: "premium",
      status: "active", start_date: priyaStart, next_checkin: addDays(t, 2), payment_confirmed: true,
      flags: [], coach_notes: "Wedding in March. Prefers short sessions.", created_at: priyaStart,
    },
    {
      id: "c-tom", full_name: "Tom Reid", email: "tom@example.com", plan: "oneoff",
      status: "paid", start_date: null, next_checkin: null, payment_confirmed: true,
      flags: [], coach_notes: "", created_at: addDays(t, -1),
    },
    {
      id: "c-liam", full_name: "Liam Ward", email: "liam@example.com", plan: "monthly",
      status: "paid", start_date: null, next_checkin: null, payment_confirmed: false, payment_reported: true,
      flags: ["Knee pain on deep squats (answer in questionnaire)"], coach_notes: "", created_at: t,
    },
    {
      id: "c-ellie", full_name: "Ellie Morgan", email: "ellie@example.com", plan: "monthly",
      status: "active", start_date: ellieStart, next_checkin: t, payment_confirmed: true,
      flags: [], coach_notes: "", created_at: ellieStart,
    },
  ];

  const plans = [
    { id: "p-j-t", client_id: "c-jamie", kind: "training", status: "live", version: 2, content: TRAINING_JAMIE, why: [], created_by: "claude", created_at: addDays(jamieStart, 28), approved_at: addDays(jamieStart, 28) },
    { id: "p-j-f", client_id: "c-jamie", kind: "nutrition", status: "live", version: 2, content: FOOD_JAMIE, why: [], created_by: "claude", created_at: addDays(jamieStart, 28), approved_at: addDays(jamieStart, 28) },
    { id: "p-p-t", client_id: "c-priya", kind: "training", status: "live", version: 1, content: TRAINING_PRIYA, why: [], created_by: "claude", created_at: priyaStart, approved_at: priyaStart },
    { id: "p-p-f", client_id: "c-priya", kind: "nutrition", status: "live", version: 1, content: FOOD_PRIYA, why: [], created_by: "claude", created_at: priyaStart, approved_at: priyaStart },
    { id: "p-e-t", client_id: "c-ellie", kind: "training", status: "live", version: 1, content: TRAINING_PRIYA, why: [], created_by: "coach", created_at: ellieStart, approved_at: ellieStart },
    { id: "p-e-f", client_id: "c-ellie", kind: "nutrition", status: "live", version: 1, content: { ...FOOD_PRIYA, calories: 1850, protein_g: 135 }, why: [], created_by: "coach", created_at: ellieStart, approved_at: ellieStart },
    { id: "p-t-t", client_id: "c-tom", kind: "training", status: "draft", version: 1, content: TRAINING_TOM_DRAFT, why: WHY_TOM, created_by: "claude", created_at: t },
    { id: "p-t-f", client_id: "c-tom", kind: "nutrition", status: "draft", version: 1, content: FOOD_TOM_DRAFT, why: WHY_TOM_FOOD, created_by: "claude", created_at: t },
  ];

  const workouts = {
    "c-jamie": genWorkouts(TRAINING_JAMIE, jamieStart, 8, 7, {
      base: { "Bench press": 62.5, "Back squat": 80, "Overhead press": 40, "Trap bar deadlift": 110, "Chest-supported row": 50, "Pull-up": 0, "Romanian deadlift": 70, "Leg press": 140, "Incline dumbbell press": 22, "Lat pulldown": 55 },
      stall: ["Overhead press"],
    }),
    "c-priya": genWorkouts(TRAINING_PRIYA, priyaStart, 5, 11, {
      pattern: [0, 2, 4], base: { "Goblet squat": 18, "Romanian deadlift": 40, "Hip thrust": 60, "Dumbbell bench press": 12 },
    }),
    "c-ellie": genWorkouts(TRAINING_PRIYA, ellieStart, 6, 5, { pattern: [0, 2, 4], skip: 0.35 }),
  };

  const body = {
    "c-jamie": genBody(jamieStart, 8, 72.6, 0.3, 3),
    "c-priya": genBody(priyaStart, 5, 68.2, -0.55, 4),
    "c-ellie": genBody(ellieStart, 6, 64.0, 0.05, 9),
  };

  const photos = {
    "c-jamie": [
      { id: uid(), date: jamieStart, angle: "front", url: silhouette("Week 1", 1, 1) },
      { id: uid(), date: addDays(jamieStart, 28), angle: "front", url: silhouette("Week 5", 1.01, 1.05) },
      { id: uid(), date: addDays(t, -1), angle: "front", url: silhouette("Week 8", 1.02, 1.1) },
    ],
    "c-priya": [
      { id: uid(), date: priyaStart, angle: "front", url: silhouette("Week 1", 1.12, 0.95) },
      { id: uid(), date: addDays(t, -2), angle: "front", url: silhouette("Week 5", 0.98, 0.95) },
    ],
  };

  const checkins = [
    {
      id: uid(), client_id: "c-jamie", due_date: addDays(jamieStart, 14), status: "sent", sent_at: addDays(jamieStart, 14),
      form: { weight: 73.2, sleep: 7, energy: 4, hunger: 3, adherence: 90, wins: "Bench felt strong.", struggles: "Missed one lower day.", questions: "" },
      message: "Great first two weeks, Jamie. Weight is up 0.6 kg, which is right where we want it. Bench and squat are both moving. Keep everything the same and try to get all 4 sessions in this fortnight.",
      changes: [], report: "On track. No changes.",
    },
    {
      id: uid(), client_id: "c-jamie", due_date: addDays(jamieStart, 28), status: "sent", sent_at: addDays(jamieStart, 28),
      form: { weight: 73.9, sleep: 6.5, energy: 4, hunger: 2, adherence: 85, wins: "Squat up 7.5 kg.", struggles: "Not always hungry for the last meal.", questions: "Can I swap the toast?" },
      message: "Squat up 7.5 kg in 4 weeks — that's proper progress. As you're not hungry at night, I've moved some food from the evening snack into lunch. Same calories, easier to eat. Yes, you can swap the toast for a bagel.",
      changes: ["Moved 150 kcal from evening to lunch"], report: "Good. Small food timing change.",
    },
    {
      id: uid(), client_id: "c-jamie", due_date: addDays(jamieStart, 42), status: "sent", sent_at: addDays(jamieStart, 42),
      form: { weight: 74.4, sleep: 7, energy: 5, hunger: 3, adherence: 95, wins: "All sessions done.", struggles: "", questions: "" },
      message: "Every session done this fortnight — that's what moves the numbers. Weight gain is steady at about 0.3 kg a week. Overhead press has slowed, so watch for a small change to it next time if it stays stuck.",
      changes: [], report: "On track. Watch overhead press.",
    },
    {
      id: "ck-ellie", client_id: "c-ellie", due_date: t, status: "awaiting_approval",
      form: { weight: 64.3, sleep: 5.5, energy: 2, hunger: 4, adherence: 60, wins: "", struggles: "Work has been mad, very tired.", questions: "Should I keep going if I'm this tired?" },
      message: "Thanks for being honest, Ellie. Tired and short on sleep is a hard time to push. For the next 2 weeks we'll drop to 2 sessions a week and cut each one to 45 minutes, and add 100 kcal so training feels better. The aim is to keep the habit going, not to chase records.",
      changes: ["Training: 3 days → 2 days, 45 minutes each", "Food: +100 kcal (1,850 → 1,950)"],
      report: "Ellie has missed about a third of sessions in 6 weeks and her sleep is down to 5.5 hours. Weight is flat. I think she's at risk of quitting, so I'm making the plan easier rather than harder for 2 weeks.",
      big_change: true,
    },
  ];

  const answers = {
    "c-tom": {
      age: 22, sex: "Male", height_cm: 180, weight_kg: 70, goal: "Build muscle", experience: "Under 6 months",
      days: 3, session: "60 min", where: "Commercial gym", diet: "Anything", allergies: "None", work: "Shift work in a warehouse",
      why_now: "Want to actually look like I train.", holding_back: "Never had a plan, don't know what to do in the gym.",
      likes: "Chicken, rice, pasta", dislikes: "Fish", cooking: "Basic", budget: "Tight", health: {},
    },
    "c-liam": {
      age: 27, sex: "Male", height_cm: 176, weight_kg: 84, goal: "Lose fat", experience: "2–5 years",
      days: 4, session: "75 min", where: "Commercial gym", diet: "Halal", allergies: "None",
      injuries: "Left knee hurts on deep squats.", health: { joints: true },
    },
    "c-jamie": { age: 24, sex: "Male", height_cm: 178, weight_kg: 72.5, goal: "Build muscle", experience: "2–5 years", days: 4, session: "75 min", where: "Commercial gym", diet: "Anything", health: {} },
  };

  const messages = [
    { id: uid(), client_id: "c-jamie", from: "client", body: "Is it ok to train Saturday instead of Friday this week?", created_at: addDays(t, -3) },
    { id: uid(), client_id: "c-jamie", from: "coach", body: "Yes, just keep a day off between lower A and lower B.", created_at: addDays(t, -3) },
  ];

  return { clients, plans, workouts, body, photos, checkins, answers, messages };
}
