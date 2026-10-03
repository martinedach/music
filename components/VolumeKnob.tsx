"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./VolumeKnob.module.css";

type Props = {
  value: number; // 0..1
  onChange: (v: number) => void;
};

const SWEEP = 270; // degrees of travel
const DRAG_PIXELS = 160; // vertical pixels for a full sweep
const TICKS = 11;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export default function VolumeKnob({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; v: number } | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Wheel needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.04 : 0.04;
      onChange(clamp(valueRef.current + delta));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onChange]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, v: valueRef.current };
    e.currentTarget.focus();
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dy = drag.current.y - e.clientY;
    onChange(clamp(drag.current.v + dy / DRAG_PIXELS));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.05;
    let next: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") next = value + step;
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = value - step;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = 1;
    if (next === null) return;
    e.preventDefault();
    onChange(clamp(next));
  };

  const rotation = -SWEEP / 2 + SWEEP * value;

  return (
    <div
      ref={ref}
      className={styles.knob}
      role="slider"
      tabIndex={0}
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: TICKS }, (_, i) => (
        <i
          key={i}
          className={styles.tick}
          style={{ transform: `rotate(${-SWEEP / 2 + (SWEEP / (TICKS - 1)) * i}deg)` }}
        />
      ))}
      <div className={styles.cap} style={{ transform: `rotate(${rotation}deg)` }}>
        <span className={styles.pointer} />
      </div>
    </div>
  );
}
