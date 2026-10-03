import type { CSSProperties } from "react";
import { ARM_SVG, STYLUS_OFFSET_DEG } from "@/lib/geometry";
import styles from "./Turntable.module.css";

type Props = {
  /** Stylus angle in degrees (0 = straight down, positive = toward the platter). */
  angle: number;
  /** True while the stylus is in the groove. */
  down: boolean;
  /** CSS transition for the swing, e.g. "1500ms ease". */
  transition: string;
  /** "arm" draws the real thing; the others are blurred copies used for lighting. */
  variant?: "arm" | "shadow" | "reflection";
  /** Extra transform applied before the rotation, e.g. the shadow's offset. */
  offset?: string;
  style?: CSSProperties;
};

export default function Tonearm({ angle, down, transition, variant = "arm", offset = "", style }: Props) {
  const { width, height, pivot } = ARM_SVG;
  const rotation = Math.round((angle - STYLUS_OFFSET_DEG) * 1000) / 1000;
  const className =
    variant === "arm"
      ? `${styles.arm} ${down ? styles.armDown : styles.armUp}`
      : variant === "shadow"
        ? `${styles.arm} ${styles.armShadow} ${down ? styles.armShadowDown : styles.armShadowUp}`
        : `${styles.arm} ${styles.armReflection} ${down ? styles.armReflectionDown : styles.armReflectionUp}`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        ...style,
        transform: `${offset} rotate(${rotation}deg)`.trim(),
        transition: `transform ${transition}, filter 500ms ease, opacity 500ms ease`,
      }}
      aria-hidden="true"
    >
      {variant === "arm" && (
        <defs>
          <linearGradient id="arm-tube" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#5c5c5c" />
            <stop offset="0.35" stopColor="#f4f4f2" />
            <stop offset="0.6" stopColor="#a8a8a6" />
            <stop offset="1" stopColor="#3c3c3c" />
          </linearGradient>
          <linearGradient id="arm-weight" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1e1e20" />
            <stop offset="0.4" stopColor="#5b5b5f" />
            <stop offset="0.7" stopColor="#2e2e31" />
            <stop offset="1" stopColor="#141416" />
          </linearGradient>
          <radialGradient id="arm-brass" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#efd38a" />
            <stop offset="0.5" stopColor="#c69c4a" />
            <stop offset="1" stopColor="#7c5c22" />
          </radialGradient>
          <linearGradient id="arm-shell" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#8a6a2a" />
            <stop offset="0.4" stopColor="#e6c87a" />
            <stop offset="1" stopColor="#9a7430" />
          </linearGradient>
        </defs>
      )}

      {/* counterweight */}
      <rect x="49" y="26" width="42" height="58" rx="7" fill="url(#arm-weight)" />
      {variant === "arm" && (
        <g stroke="rgba(0,0,0,.45)" strokeWidth="1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1="52" x2="88" y1={33 + i * 7} y2={33 + i * 7} />
          ))}
        </g>
      )}
      <rect x="49" y="26" width="42" height="58" rx="7" fill="none" stroke="rgba(255,255,255,.12)" />

      {/* arm tube */}
      <rect x="64.5" y="80" width="11" height="480" rx="5.5" fill="url(#arm-tube)" />
      <rect x="66" y="80" width="2" height="480" fill="rgba(255,255,255,.35)" />

      {/* bearing housing over the pivot */}
      <circle cx={pivot.x} cy={pivot.y} r="17" fill="url(#arm-brass)" />
      <circle cx={pivot.x} cy={pivot.y} r="17" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />
      <circle cx={pivot.x} cy={pivot.y} r="5" fill="#2a1a10" />

      {/* offset headshell, cartridge and stylus; the inner group bounces on landing */}
      <g transform="rotate(20 70 556)">
        <g className={down ? styles.headshellLanded : undefined}>
          <path d="M61 548 h18 l6 36 l-3 26 h-24 l-3 -26 z" fill="url(#arm-shell)" />
          <path d="M61 548 h18 l6 36 l-3 26 h-24 l-3 -26 z" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.2" />
          <rect x="79" y="566" width="14" height="5" rx="2.5" fill="#d8d8d4" stroke="rgba(0,0,0,.35)" />
          <rect x="61" y="586" width="18" height="22" rx="2" fill="#1b1b1d" />
          <rect x="63" y="588" width="14" height="4" fill="#b5532a" />
          <circle cx="70" cy="613.6" r="2.2" fill="#f2f2f2" />
        </g>
      </g>
    </svg>
  );
}
