import styles from "./Player.module.css";

/** Quiet set dressing around the deck: a coffee ring, a cloth, some 45s, a cable. */
export default function RoomProps() {
  return (
    <div className={styles.props} aria-hidden="true">
      <div className={styles.coffeeRing} />
      <div className={styles.cloth} />
      <div className={styles.singles}>
        <i />
        <i />
        <i />
      </div>
      <svg className={styles.cable} viewBox="0 0 320 220" fill="none">
        <path
          d="M0 24 C 70 10, 110 130, 190 110 S 280 150, 320 220"
          stroke="#121212"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M0 22 C 70 8, 110 128, 190 108 S 280 148, 320 218"
          stroke="rgba(255,255,255,.14)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
