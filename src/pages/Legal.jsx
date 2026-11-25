import { BRAND } from "../config";
import { Nav, Footer } from "./Home";

// First drafts. Simon should have these checked before taking real payments.
const contact = BRAND.contactEmail ? `email ${BRAND.contactEmail}` : "send your coach a message from your client area";
const UPDATED = "25 November 2026";

const pages = {
  terms: {
    title: "Terms",
    body: [
      ["Who we are", `${BRAND.name} is run by ${BRAND.coach}, a sole trader in England. "We" and "us" mean ${BRAND.coach}.`],
      ["What you're buying", "A training plan and a food plan built for you from your questionnaire, with a shopping list for the shops you use, and access to your client area. On Monthly and Premium, check-ins every 2 weeks or every week, where your plans are reviewed and updated. On the One-off plan, a guide to adjusting the plan yourself."],
      ["Who can join", "Anyone aged 14 or over can join. If you're under 18, a parent or guardian must agree in the questionnaire, and we may contact them about your coaching. Answer the questionnaire honestly, including the health questions. We may refuse or pause coaching if it isn't safe, and refund any unused payment."],
      ["Payments", "Payments are taken by Stripe. The One-off plan is a single payment. Monthly and Premium are charged every month on the day you joined until you cancel."],
      ["Cancelling", "Cancel a monthly plan any time and you won't be charged again; coaching continues to the end of the month you've paid for. Under UK consumer law you have 14 days to cancel, but because your plans are made for you, once your plans have been delivered you agree that this right ends and the payment is non-refundable for that month."],
      ["Your part", "Follow the plan sensibly, use good technique, stop if something hurts, and tell us about any change in your health. Results depend on many things we don't control, so we can't promise a particular result."],
      ["Changes", "We may update these terms; we'll tell you by email or in your client area before changes affect a payment."],
      ["Law", "These terms are under the law of England and Wales."],
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      ["What we collect", "Your name, email and questionnaire answers, including health information you choose to give (health questions, medicines, eating history, what you eat now and whether you use performance-enhancing drugs). If you're under 18, your parent or guardian's name and email. Your training and bodyweight logs, check-in answers, messages and progress photos. Stripe handles your card details; we never see them."],
      ["Why", "To build and update your plans, run check-ins and keep your account working. We use your health information and photos only with your consent, which you give in the questionnaire. If you're under 18, your parent or guardian gives consent too, and we don't collect progress photos."],
      ["Who can see it", `Only you and ${BRAND.coach}. We use AI tools to help draft plans and check-ins from your data; every plan and message is checked by ${BRAND.coach} before you see it. Data is stored with Supabase (database and private photo storage), the site is hosted by Netlify, and payments go through Stripe.`],
      ["How long", "While you're a client, and up to 12 months after you leave so you can come back to your history. Ask and we'll delete it sooner."],
      ["Your rights", `You can ask to see, correct, download or delete your data, or withdraw consent, at any time: ${contact}. You can also complain to the Information Commissioner's Office (ico.org.uk).`],
      ["Cookies and storage", "We only store what's needed on your device to keep you logged in and to save your questionnaire answers as you go. No advertising or tracking cookies."],
    ],
  },
  health: {
    title: "Health disclaimer",
    body: [
      ["Not medical advice", `${BRAND.name} gives training and nutrition coaching. It is not medical advice and doesn't replace your doctor, a registered dietitian or a physiotherapist.`],
      ["Check with your GP", "If you have a health condition, an injury, take medication, are pregnant or have had an eating disorder, speak to your GP before starting. We'll ask about these in the questionnaire."],
      ["Supplements", "Any supplements in your plan are listed separately, with doses within official safe limits. If you take medicine, have a health condition, are pregnant or are under 18, check with your GP or pharmacist before taking any supplement."],
      ["Stop if it hurts", "Stop exercising and get medical help if you feel chest pain, faintness, severe breathlessness or sharp pain."],
      ["Your responsibility", "You take part at your own risk and are responsible for using good technique and safe equipment."],
    ],
  },
};

export function Legal({ which, session }) {
  const p = pages[which];
  return (
    <>
      <Nav session={session} />
      <main className="wrap legal">
        <h1>{p.title}</h1>
        <p className="muted">Last updated {UPDATED}.</p>
        {p.body.map(([h, t]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{t}</p>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
