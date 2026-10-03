import styles from "./Player.module.css";

/** Deterministic mote positions so the server and client render the same markup. */
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 2 + (i % 3),
  duration: 9 + (i % 5) * 2.3,
  delay: -((i * 1.7) % 11),
}));

/** A brass desk lamp clamped above the room, with dust drifting through its light. */
export default function Lamp() {
  return (
    <div className={styles.lamp} aria-hidden="true">
      <div className={styles.lampArm} />
      <div className={styles.lampShade}>
        <span className={styles.lampBulb} />
      </div>
      <div className={styles.lampGlow} />
      <div className={styles.motes}>
        {MOTES.map((m, i) => (
          <i
            key={i}
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: m.size,
              height: m.size,
              animationDuration: `${m.duration}s`,
              animationDelay: `${m.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
