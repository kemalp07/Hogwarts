export const HOUSE_POINT_STEP = 5;
export const TARGET_HOUSE_POINT_SPREAD = 30;
export const HARD_HOUSE_POINT_SPREAD = 50;
export const MAX_HOUSE_POINT_SPREAD = TARGET_HOUSE_POINT_SPREAD;
export const MIN_POINTS_FLOOR_BASE = 5;
export const POINTS_FLOOR_INTERVAL_MS = 3 * 60 * 1000;

const HOUSES = ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin'] as const;

export function snapHousePoint(value: number): number {
  return Math.round(Number(value) / HOUSE_POINT_STEP) * HOUSE_POINT_STEP;
}

export function snapHousePoints(points: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(points).map(([house, value]) => [house, snapHousePoint(value)]),
  );
}

export function housePointsSpread(points: Record<string, number>): number {
  const values = HOUSES.map((h) => snapHousePoint(points[h] ?? 0));
  return Math.max(...values) - Math.min(...values);
}

export function computeMinimumPointsFloor(
  startedAtMs: number,
  nowMs: number = Date.now(),
): number {
  const elapsedMinutes = Math.max(0, (nowMs - startedAtMs) / 60000);
  const intervals = Math.floor(elapsedMinutes / (POINTS_FLOOR_INTERVAL_MS / 60000));
  return MIN_POINTS_FLOOR_BASE + intervals * HOUSE_POINT_STEP;
}

export function applyMinimumPointsFloor(
  points: Record<string, number>,
  floor: number,
): Record<string, number> {
  const adjusted = snapHousePoints(points);
  const snappedFloor = snapHousePoint(floor);
  const currentMin = Math.min(...HOUSES.map((h) => adjusted[h] ?? 0));
  if (currentMin >= snappedFloor) return adjusted;
  for (const house of HOUSES) {
    if ((adjusted[house] ?? 0) === currentMin) {
      adjusted[house] = snappedFloor;
    }
  }
  return adjusted;
}

export function rebalanceHousePoints(
  points: Record<string, number>,
  maxSpread: number = HARD_HOUSE_POINT_SPREAD,
): Record<string, number> {
  const balanced = snapHousePoints(points);
  let guard = 0;

  while (housePointsSpread(balanced) > maxSpread && guard < 20) {
    guard += 1;
    const leader = HOUSES.reduce((a, b) => (balanced[a] >= balanced[b] ? a : b));
    const lagger = HOUSES.reduce((a, b) => (balanced[a] <= balanced[b] ? a : b));
    if (balanced[leader] >= HOUSE_POINT_STEP) {
      balanced[leader] -= HOUSE_POINT_STEP;
    } else {
      balanced[lagger] += HOUSE_POINT_STEP;
    }
  }

  return balanced;
}

function housePointsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  return (
    a.gryffindor === b.gryffindor
    && a.hufflepuff === b.hufflepuff
    && a.ravenclaw === b.ravenclaw
    && a.slytherin === b.slytherin
  );
}

export function normalizeHousePoints(
  points: Record<string, number>,
  floorStartedAtMs?: number | null,
): Record<string, number> {
  let normalized = snapHousePoints(points);
  if (floorStartedAtMs != null && Number.isFinite(floorStartedAtMs)) {
    const floor = computeMinimumPointsFloor(floorStartedAtMs);
    normalized = applyMinimumPointsFloor(normalized, floor);
  }
  if (housePointsSpread(normalized) > HARD_HOUSE_POINT_SPREAD) {
    return rebalanceHousePoints(normalized, HARD_HOUSE_POINT_SPREAD);
  }
  return normalized;
}

export { housePointsEqual };
