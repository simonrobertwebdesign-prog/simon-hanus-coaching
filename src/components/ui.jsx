import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { planById } from "../config";
import { cx } from "../lib/util";

export function Plate({ plan, size = 40 }) {
  const p = planById(plan);
  return (
    <span className={cx("plate", p.colour)} style={{ "--s": size + "px" }} aria-hidden="true">
      <span>{p.plate}</span>
    </span>
  );
}

export function PlanChip({ plan }) {
  const p = planById(plan);
  return (
    <span className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
      <Plate plan={plan} size={24} />
      <span>{p.name}</span>
    </span>
  );
}

// A form row. Single inputs sit inside a <label>; groups of buttons get a
// labelled group instead, so the label doesn't attach to the first button.
export function Field({ label, hint, error, children, group }) {
  const isGroup = group || children?.type === Choices || children?.type === Seg || children?.type === "div";
  const inner = (
    <>
      <span>{label}</span>
      {children}
      {hint && !error && <small>{hint}</small>}
      {error && <span className="err-text">{error}</span>}
    </>
  );
  return isGroup ? (
    <div className="field" role="group" aria-label={label}>
      {inner}
    </div>
  ) : (
    <label className="field">{inner}</label>
  );
}

// Pick one (or several) from a list of options.
export function Choices({ options, value, onChange, multi = false, label }) {
  const isOn = (o) => (multi ? (value || []).includes(o) : value === o);
  const toggle = (o) => {
    if (!multi) return onChange(o);
    const v = new Set(value || []);
    v.has(o) ? v.delete(o) : v.add(o);
    onChange([...v]);
  };
  return (
    <div className="choices" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o} className="choice" aria-pressed={isOn(o)} onClick={() => toggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button type="button" key={o} aria-pressed={value === o} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

const ToastCtx = createContext(() => {});
export function ToastHost({ children }) {
  const [msg, setMsg] = useState(null);
  const show = useCallback((m) => setMsg(m), []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Modal({ onClose, children, label }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h2 data-h="3">{title}</h2>
      <div className="measure" style={{ marginInline: "auto" }}>
        {children}
      </div>
    </div>
  );
}

export function Loading() {
  return <div className="empty">Loading…</div>;
}

export function Brand({ onClick, light }) {
  return (
    <button className="brand" onClick={onClick} style={light ? { color: "#fff" } : undefined}>
      <span className="plate crimson" style={{ "--s": "30px" }} aria-hidden="true" />
      <span>
        Simon Hanus
        <small>Coaching</small>
      </span>
    </button>
  );
}

const paths = {
  today: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  training: "M3 10h2v4H3zM19 10h2v4h-2zM6 7h3v10H6zM15 7h3v10h-3zM9 11h6v2H9z",
  food: "M7 3v8a2 2 0 0 0 2 2v8M11 3v8M9 3v4M16 3c-1.7 0-3 2.2-3 5s1.3 4 3 4v9",
  progress: "M4 19h16M6 16l4-5 3 3 5-7",
  photos: "M4 7h3l2-2h6l2 2h3v12H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  checkins: "M5 4h14v12H9l-4 4zM9 9h6M9 12h4",
  clients: "M4 5h16v14H4zM4 10h16M10 5v14",
  approvals: "M5 12.5l4 4 10-10",
  logout: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9",
};
export function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
