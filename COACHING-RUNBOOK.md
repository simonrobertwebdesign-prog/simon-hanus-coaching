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
- Injuries and joint problems: plan around them and say how in the notes.
- Draft the training plan and the food plan from Coaching Rules (sections 0–3) and the lessons.
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
