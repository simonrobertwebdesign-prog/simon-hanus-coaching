import { useRef, useState } from "react";
import { fmtDate } from "../lib/util";

// Drag the handle to wipe between the old photo and the new one.
export function PhotoCompare({ before, after }) {
  const box = useRef(null);
  const [x, setX] = useState(50);
  const move = (clientX) => {
    const r = box.current.getBoundingClientRect();
    setX(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  if (!before || !after) return null;
  return (
    <div
      ref={box}
      className="compare"
      style={{ "--x": x + "%" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
      role="slider"
      aria-label="Compare photos"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(x)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setX((v) => Math.max(0, v - 5));
        if (e.key === "ArrowRight") setX((v) => Math.min(100, v + 5));
      }}
    >
      <img src={before.url} alt={`Photo from ${fmtDate(before.date)}`} draggable="false" />
      <img className="after" src={after.url} alt={`Photo from ${fmtDate(after.date)}`} draggable="false" />
      <div className="handle" />
      <span className="tag l">{fmtDate(before.date)}</span>
      <span className="tag r">{fmtDate(after.date)}</span>
    </div>
  );
}
