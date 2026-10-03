/**
 * Turntable layout, in container-width units (cqw). The deck is a CSS
 * container, so every measurement here is a percentage of its width.
 */

/** The tonearm SVG: viewBox 0 0 140 660, drawn at 14cqw wide (10 units per cqw). */
export const ARM_SVG = {
  width: 140,
  height: 660,
  unitsPerCqw: 10,
  pivot: { x: 70, y: 100 },
  /** Where the stylus tip lands after the headshell's 20° offset. */
  stylus: { x: 50.5, y: 609.6 },
} as const;

const toDeg = (rad: number) => (rad * 180) / Math.PI;

const stylusDx = ARM_SVG.stylus.x - ARM_SVG.pivot.x;
const stylusDy = ARM_SVG.stylus.y - ARM_SVG.pivot.y;

/** The stylus sits slightly off the tube axis; rotate the SVG by this less. */
export const STYLUS_OFFSET_DEG = toDeg(Math.atan2(-stylusDx, stylusDy));

export const DECK = {
  /** Platter centre and radius. */
  platter: { cx: 38, cy: 46, r: 33 },
  vinylR: 31,
  labelR: 12.5,
  /** Tonearm pivot and effective length from pivot to stylus. */
  pivot: { x: 86, y: 15 },
  armLength: Math.hypot(stylusDx, stylusDy) / ARM_SVG.unitsPerCqw,
  /** Groove radii at the start and end of a side. */
  leadInR: 29.5,
  runOutR: 13.5,
  /** Stylus angle (degrees, 0 = straight down) when parked on the rest. */
  restAngle: 6,
} as const;

/**
 * Angle the tonearm must rotate to (degrees, CSS convention) so the stylus sits
 * on the groove at radius `r` from the platter centre. Law of cosines on the
 * triangle pivot / platter centre / stylus.
 */
export function armAngleForRadius(r: number): number {
  const { pivot, platter, armLength: L } = DECK;
  const dx = platter.cx - pivot.x;
  const dy = platter.cy - pivot.y;
  const D = Math.hypot(dx, dy);
  // Direction from pivot to platter centre in the arm's convention
  // (0 = down, positive = swinging toward the platter).
  const toCentre = toDeg(Math.atan2(-dx, dy));
  const cosA = (L * L + D * D - r * r) / (2 * L * D);
  const alpha = toDeg(Math.acos(Math.min(1, Math.max(-1, cosA))));
  return toCentre - alpha;
}

/** Stylus angle for playback progress in [0, 1]. */
export function armAngleForProgress(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const r = DECK.leadInR + (DECK.runOutR - DECK.leadInR) * p;
  return armAngleForRadius(r);
}

/** Position of the arm rest clip, a little way down the tube at rest. */
export function armRestPosition(distance = 42) {
  const tubeAngle = DECK.restAngle - STYLUS_OFFSET_DEG;
  const a = (tubeAngle * Math.PI) / 180;
  return {
    x: DECK.pivot.x - distance * Math.sin(a),
    y: DECK.pivot.y + distance * Math.cos(a),
    angle: tubeAngle,
  };
}
