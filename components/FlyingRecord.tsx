"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { sleeveColours } from "@/lib/sleeves";
import styles from "./Player.module.css";

type Props = {
  from: DOMRect;
  to: DOMRect;
  index: number;
  duration: number;
  onDone: () => void;
};

/**
 * A record pulled from its sleeve, flying in an arc to hover just above the
 * platter. Its final frame matches the platter's drop-in animation start.
 */
export default function FlyingRecord({ from, to, index, duration, onDone }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const startScale = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${startScale}) rotate(0deg)`, offset: 0 },
        {
          transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 48}px) scale(${((startScale + 1) / 2) * 1.12}) rotate(80deg)`,
          offset: 0.5,
        },
        { transform: `translate(0px, ${-to.height * 0.09}px) scale(1.04) rotate(160deg)`, offset: 1 },
      ],
      { duration, easing: "cubic-bezier(.35,.1,.25,1)", fill: "forwards" },
    );
    anim.onfinish = () => done.current();
    return () => anim.cancel();
    // Runs once for the lifetime of the flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colours = sleeveColours(index);
  return (
    <div
      ref={ref}
      className={styles.fly}
      aria-hidden="true"
      style={
        {
          left: to.left,
          top: to.top,
          width: to.width,
          height: to.height,
          "--sleeve-bg": colours.bg,
        } as CSSProperties
      }
    >
      <span className={styles.flyLabel} />
    </div>
  );
}
