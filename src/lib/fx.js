// Small finishing touches used across the whole site.
import gsap from "gsap";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// A soft purple glow follows the mouse over cards and panels (CSS reads --mx / --my).
const GLOW = ".panel, .stat, .wizard-main, .approval, .logger-ex, .hist-row, .macro, .modal, .method-card, .pillar, .plan2, .calc, .cta2, .inside-sec";
export function startGlow() {
  if (!fine() || reduced()) return () => {};
  const move = (e) => {
    const el = e.target.closest?.(GLOW);
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  document.addEventListener("pointermove", move, { passive: true });
  return () => document.removeEventListener("pointermove", move);
}

// Numbers in stat boxes roll up from zero the first time they appear.
export function countUp(root = document) {
  if (reduced()) return;
  root.querySelectorAll(".stat b, .macro b").forEach((el) => {
    if (el.dataset.counted) return;
    const text = el.textContent;
    const m = text.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/s);
    if (!m) return;
    const end = parseFloat(m[2].replace(/,/g, ""));
    if (!isFinite(end) || end === 0) return;
    const dec = (m[2].split(".")[1] || "").length;
    el.dataset.counted = "1";
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.1, ease: "power3.out",
      onUpdate: () => {
        const n = m[2].includes(",") ? Math.round(o.v).toLocaleString("en-GB") : o.v.toFixed(dec);
        el.textContent = m[1] + n + m[3];
      },
      onComplete: () => { el.textContent = text; },
    });
  });
}
