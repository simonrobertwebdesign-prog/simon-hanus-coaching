# Daily coaching run (for Claude)

Runs once a day in the Claude app's built-in browser on Simon's PC (simsbox11). Simon is logged in to the site there as the coach.
**Nothing reaches a client without Simon's yes**: everything Claude makes is a draft in the coach area's Approvals page.

## 0. Read first
From Simon's Brain (`Documents\Brain`): Start, Rules for AI, Next Time, then
`Projects/Coaching Website/` → The Plan, Coaching Lessons, and `Research/Coaching Rules.md`
(built from the training and food research in `Research/`; open the topic notes it links when you need the detail).
Order of authority: Simon's Coaching Lessons → Coaching Rules → this runbook.

## 1. Open the coach area
Open `https://simon-hanus-coaching.netlify.app/#coach-approvals` in the built-in browser.
If it shows the log-in page, stop and message Simon: "Please log in to the coach area so I can do today's check-ins."

## 2. Get today's list
In the page run `await SHC.todo()`. It returns:
`checkPayments`, `plansToMake`, `plansToRedo`, `checkinsDue`, `checkinsToRedo`, `waitingForSimon`.

## 3. Payments
For each `checkPayments` client, find the Stripe Checkout session (`stripe_session_id`, or the client's email) with the Stripe connector, account **Simon Hanus Coaching** (sandbox = test mode until the account goes live). The session's `client_reference_id` is the client's id.
Paid → `await SHC.confirmPayment(id, sessionId)`. Not found → leave it and put it in the report.

## 4. New plans (`plansToMake`)
`await SHC.client(id)` gives the answers, flags and logs.
- Heart, chest pain, dizziness/fainting, pregnancy or eating-disorder answers: **don't draft**. Tell Simon first.
- Flag "Using steroids or other PEDs now": **don't draft**. Tell Simon first. Never give advice on steroids or PEDs. Past use: just note it.
- Flag "Under 18": coach exactly like everyone else (Coaching Rules), food included. There are no progress photos for under-18s; use lifts, weigh-ins and check-ins.
- Food plans: meals are mostly whole, natural foods. Protein powder is fine in a meal if it's needed to hit protein.
- Any other supplements go in the food plan's own `supplements` list (`{ name, dose, when, why }`), never mixed into the meals. Keep doses within official safe upper limits (e.g. extra magnesium from supplements: 250–350 mg a day); anything above that, or for a client on medicine or with a health condition, mark `big_change` and say why in the report.
- Injuries and joint problems: plan around them and say how in the notes.
- Draft the training plan and the food plan from Coaching Rules (sections 0–3) and the lessons.
- **Starting calories:** `start` (from `SHC.client`) gives the formula guess (`formula`, bodyweight × 31–40 by job and steps), `tracked` (their own maintenance number, or what they eat now if their weight has been steady) and `protein`. If `tracked` is there and within about 15% of the formula, start from `tracked`. If it's far off, start between the two and say why in the notes. If they track and their weight is going up or down, maintenance is roughly what they eat now minus (going up) or plus (going down) a few hundred kcal: say it's a guess and let the first 2–3 weeks of weigh-ins fix it.
- **Other answers to use:** `body_now` (Lean → slower cut, 0.25–0.5% a week; Carrying extra fat → protein from goal weight), `dieting` (2–6 months or more and wanting to lose → think about 1–2 weeks at maintenance first, and mark it for Simon), `train_days` (lay the week out on those days), `priority` (up to 2 muscles get extra sets, up to ~20 a week), `other_activity` (counts as activity; keep leg work sensible around matches), `scales` (no kitchen scales → portions in handfuls, cups or pieces; no bathroom scales → ask them to get some in the first message and use waist and photos meanwhile).
- **Goal (changed 25 Nov):** the questionnaire now names it: Cut, Bulk, Lean bulk / maingain, Recomp, Get stronger, Get fitter and healthier, or "Not sure: my coach decides". `start.suggest` gives a first calorie range for the goal (Coaching Rules, section 3); for "coach decides", propose one from `body_now`, `experience` and `goal_weight` and say why in the note to Simon. `cut_pace` "Faster" only applies if they're not lean; otherwise keep it steady and say so.
- **Training answers (added 25 Nov):** `consistent` ("coming back after a break" → start at the lower end of sets and 2–3 reps in reserve for 2–4 weeks), `gym_name` (match the machines they'll have), `equipment` and `dumbbell_max` for home (pick exercises and rep ranges the weights allow), `style_pref` (lean the rep ranges that way within the rules), `cardio_likes` (use those for any cardio or step targets), `likes_ex` stay in where they fit, `dislikes_ex` stay out.
- **Food answers (added 25 Nov):** `food_style` decides powders: "All natural, whole foods only" → no shakes or bars at all; "Mostly whole foods, plus protein powder" → one scoop a day at most unless protein can't be hit otherwise; "A mix" → shakes and bars are fine. `supps_open` decides the Supplements table: "None" → leave it empty; "Just protein powder" → nothing else; "Open to proven ones" → only what [[Food - Supplements]] supports, within safe limits. `budget` is now a weekly amount in pounds. `eating_out` 3+ times a week → build in takeaway choices rather than banning them. `event` → plan the pace to the date. `compete` "show or meet booked" → tell Simon before drafting (prep is different work).
- **Also read:** `normal_day` (build the food plan from what they already eat where you can; small swaps beat a whole new diet), `coached_before` ("didn't work out" → keep the first plan simple and explain the why), `anything_else` (holidays, questions: answer questions in the plan's message to Simon for him to pass on). `found_us` is for Simon only.
- **One-off plans:** the client area shows a fixed "Adjust it yourself" guide on their Check-ins page. Keep the plan's own notes in line with it.
- Every plan gets 2–5 short `why` notes: `{ point, why, effect }`, in plain words.
- Save: `await SHC.draftPlan(id, "training" | "nutrition", content, why)`.

Content shapes are in `src/lib/seed.js` (`TRAINING_JAMIE`, `FOOD_JAMIE`).

## 5. Redo what Simon sent back (`plansToRedo`, `checkinsToRedo`)
Read his feedback. Save the lesson in the Brain's Coaching Lessons note **in his exact words**. Then redo it:
`await SHC.redoPlan(planId, content, why)` or `await SHC.draftCheckin(id, {..., checkin_id})`.

## 6. Check-ins (`checkinsDue`)
`await SHC.client(id)` → use `summary`: sessions done vs planned, missed sessions, lift trends (stalled lifts), bodyweight trend per week, the client's check-in answers.
Look at the photos too: open `#coach-client-<id>`, Photos tab, and take a screenshot of the compare view.

Rules (short form of Coaching Rules section 4; use 2-week weight averages, ignore week 1 of a new plan):
| What you see | Change |
|---|---|
| Building, not gaining for 2–3 weeks | +100–200 kcal |
| Building, gaining faster than target (beginner–intermediate 0.25–0.5%/week, advanced 0.1–0.25%) | −100–200 kcal |
| Cutting, losing under 0.25% of bodyweight a week for 2 weeks, good adherence | −100–200 kcal (carbs/fat), or +2,000 steps a day |
| Cutting, losing over 1% of bodyweight a week | +100–200 kcal |
| Under about 80% of sessions or food days done | Don't change the numbers; make the plan easier to stick to |
| A lift stuck 2–3 weeks with good sleep and food | Check RIR, then change its rep range or swap it |
| Performance down 2 sessions running, sore joints, bad sleep | Deload week (half the sets, 3–4 RIR) or cut a third of the sets |
| 8–12 weeks of dieting, or hunger/mood/training falling apart | Offer 1–2 weeks at maintenance |
| Pain, injury or feeling unwell mentioned | No changes; flag it for Simon |

If the plan changes, save a new plan version with `SHC.draftPlan(...)` too.

Then save the check-in: `await SHC.draftCheckin(id, { message, changes, report, big_change, checkin_id })`
- `message`: to the client. Warm, specific numbers, what's working, what changes and why. Under 120 words.
- `changes`: one short line per change.
- `report`: for Simon. What happened, what you changed, why. Two to four sentences.
- `big_change: true` when calories change by more than 200, training days change, pain or health comes up, or fewer than 60% of sessions were done.

## 7. Tell Simon
One short message: how many things are waiting in Approvals, big changes first, with the link `https://simon-hanus-coaching.netlify.app/#coach-approvals`.
If there's nothing to do, don't message him.

## 8. Brain
Add a line to today's log, update the Current state section of Coaching Website Hub if anything changed.
