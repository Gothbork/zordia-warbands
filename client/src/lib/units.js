export const UNIT_DEFS = {
  warrior:      { label: "Warrior",      emoji: "⚔️",  hp: 12, move: 3, range: 1, damage: 3 },
  archer:       { label: "Archer",       emoji: "🏹",  hp: 7,  move: 3, range: 4, damage: 2 },
  mage:         { label: "Mage",         emoji: "🔮",  hp: 6,  move: 2, range: 3, damage: 4 },
  scout:        { label: "Scout",        emoji: "🗡️",  hp: 6,  move: 5, range: 1, damage: 2 },
  shieldbearer: { label: "Shieldbearer", emoji: "🛡️",  hp: 14, move: 2, range: 1, damage: 2 },
};

export const PLAYER_COLORS = ["#4fc3f7", "#ef9a9a", "#a5d6a7", "#ffe082"];
export const PLAYER_NAMES  = ["Blue",    "Red",     "Green",   "Yellow"];

// Chebyshev distance (8-directional)
export function chebyshev(x1, y1, x2, y2) {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

// BFS reachable cells — mirrors server logic for UI highlighting
export function reachableCells(startX, startY, moveRange, units, excludeId) {
  const occupied = new Set(
    units.filter((u) => u.id !== excludeId).map((u) => `${u.x},${u.y}`)
  );
  const visited = new Set([`${startX},${startY}`]);
  const result = [];
  const queue = [[startX, startY, 0]];

  while (queue.length > 0) {
    const [x, y, dist] = queue.shift();
    if (dist > 0) result.push([x, y]);
    if (dist >= moveRange) continue;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const nx = x + dx, ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= 16 || ny >= 12) continue;
      if (visited.has(key) || occupied.has(key)) continue;
      visited.add(key);
      queue.push([nx, ny, dist + 1]);
    }
  }
  return result;
}
