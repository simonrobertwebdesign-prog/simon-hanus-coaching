// Everything Simon might want to change lives here.

export const BRAND = {
  name: "Simon Hanus Coaching",
  coach: "Simon Hanus",
  // TODO(Simon): the email clients can write to.
  contactEmail: "",
  // TODO(Simon): Instagram / TikTok handles, if you want them on the site.
  socials: [],
};

// Supabase (logins, database, private photos). The URL and the "publishable"
// key are safe to be public: the database rules decide who sees what.
// Leave empty to run the site in demo mode.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://azoywyvjgxnwohiihegs.supabase.co";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_ji_2gRGACS85xH-ReKGedA_ow44PaX8";

// The clickable preview is built in "preview" mode and always uses demo data.
export const DEMO = import.meta.env.MODE === "preview" || !SUPABASE_URL || !SUPABASE_KEY;

// Plates: a heavier plate means more coaching. Each level has its own accent ring:
// steel (one-off), crimson (monthly), purple (premium).
export const PLANS = [
  {
    id: "oneoff",
    name: "One-off plan",
    price: 80,
    period: "once",
    plate: 15,
    colour: "steel",
    checkinDays: null,
    blurb: "Your training plan and food plan, built from your answers. Yours to keep.",
    includes: [
      "Training plan built for you",
      "Food plan built for you",
      "Client area to log every set",
      "Progress charts and photos",
    ],
    missing: ["Check-ins with Simon", "Plan changes as you progress"],
    // Stripe payment links. TEST MODE ("buy.stripe.com/test_...") until the coaching Stripe account is live.
    paymentLink: "https://buy.stripe.com/test_eVq4gybnn04kaLnbw60RG00",
  },
  {
    id: "monthly",
    name: "Monthly coaching",
    price: 60,
    period: "month",
    plate: 20,
    colour: "crimson",
    checkinDays: 14,
    popular: true,
    blurb: "Your plans, plus a check-in every 2 weeks that moves them forward with you.",
    includes: [
      "Training plan built for you",
      "Food plan built for you",
      "Client area to log every set",
      "Progress charts and photos",
      "Check-in every 2 weeks",
      "Plan changes as you progress",
    ],
    missing: [],
    paymentLink: "https://buy.stripe.com/test_9B68wOajj7wM6v7bw60RG01",
  },
  {
    id: "premium",
    name: "Premium coaching",
    price: 100,
    period: "month",
    plate: 25,
    colour: "purple",
    checkinDays: 7,
    blurb: "Weekly check-ins for faster changes and closer support.",
    includes: [
      "Training plan built for you",
      "Food plan built for you",
      "Client area to log every set",
      "Progress charts and photos",
      "Check-in every week",
      "Plan changes as you progress",
      "Replies to your messages first",
    ],
    missing: [],
    paymentLink: "https://buy.stripe.com/test_aFa00i6333gw8DffMm0RG02",
  },
];

export const planById = (id) => PLANS.find((p) => p.id === id) || PLANS[1];

// Stripe's page where clients manage or cancel a subscription.
export const STRIPE_CUSTOMER_PORTAL = "https://billing.stripe.com/p/login/test_eVq4gybnn04kaLnbw60RG00";
