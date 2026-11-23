// When things happen in the home page scroll story, as a share of the whole scroll (0 to 1).
// Shared by the words (IronStory.jsx) and the 3D world (ironWorld.js) so they stay in step.

export const PIN_SCREENS = { desktop: 6.6, phone: 5.6 }; // how many screen-heights of scrolling the story takes

export const T = {
  heroOut: [0.015, 0.09],
  platesIn: 0.1,
  plates: {
    premium: [0.14, 0.23],
    monthly: [0.245, 0.335],
    oneoff: [0.35, 0.43],
  },
  clip: [0.435, 0.465],
  platesOut: [0.475, 0.5],
  climbIn: [0.51, 0.54],
  climb: [0.55, 0.86], // week 1 → week 7
  climbOut: [0.885, 0.905],
  endIn: [0.92, 0.96],
};

// Example client's bench press, week by week (made-up numbers).
export const CLIMB = [
  { kg: 62.5, reps: "8, 8, 7" },
  { kg: 62.5, reps: "8, 8, 8" },
  { kg: 65, reps: "8, 7, 6" },
  { kg: 65, reps: "8, 8, 7" },
  { kg: 67.5, reps: "7, 7, 6" },
  { kg: 67.5, reps: "8, 8, 7" },
  { kg: 70, reps: "8, 7, 7" },
];

// Week position (0 to 6, with fractions) for a story progress value.
export function weekAt(p) {
  const [a, b] = T.climb;
  return Math.min(1, Math.max(0, (p - a) / (b - a))) * (CLIMB.length - 1);
}

// Bar weight at a week position: holds on each week, then steps up quickly to the next.
export function kgAt(w) {
  const i = Math.floor(w), f = w - i;
  const a = CLIMB[Math.min(i, CLIMB.length - 1)].kg, b = CLIMB[Math.min(i + 1, CLIMB.length - 1)].kg;
  const k = Math.min(1, Math.max(0, (f - 0.55) / 0.3));
  return a + (b - a) * (k * k * (3 - 2 * k));
}
