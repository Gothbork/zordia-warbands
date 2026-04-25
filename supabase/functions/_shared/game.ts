import { UNIT_DEFS, UnitType } from "./units.ts";

export const MAP_W = 16;
export const MAP_H = 12;

export function chebyshev(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

// BFS reachable cells (no terrain in v1)
export function reachableCells(
  startX: number, startY: number, moveRange: number,
  occupied: Set<string>
): [number, number][] {
  const visited = new Set<string>();
  const result: [number, number][] = [];
  const queue: [number, number, number][] = [[startX, startY, 0]];
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    const [x, y, dist] = queue.shift()!;
    if (dist > 0) result.push([x, y]);
    if (dist >= moveRange) continue;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const nx = x + dx, ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (visited.has(key) || occupied.has(key)) continue;
      visited.add(key);
      queue.push([nx, ny, dist + 1]);
    }
  }
  return result;
}

export function getPlayerIndex(game: Record<string, unknown>, userId: string): number {
  for (let i = 0; i < 4; i++) {
    if (game[`player${i}_id`] === userId) return i;
  }
  return -1;
}

export function getMoveRange(unitType: UnitType): number {
  return UNIT_DEFS[unitType].move;
}

export function getAttackRange(unitType: UnitType): number {
  return UNIT_DEFS[unitType].range;
}

export function getDamage(unitType: UnitType): number {
  return UNIT_DEFS[unitType].damage;
}
