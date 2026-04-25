export type UnitType = "warrior" | "archer" | "mage" | "scout" | "shieldbearer";

export interface UnitDef {
  type: UnitType;
  hp: number;
  move: number;
  range: number;
  damage: number;
}

export const UNIT_DEFS: Record<UnitType, UnitDef> = {
  warrior:      { type: "warrior",      hp: 12, move: 3, range: 1, damage: 3 },
  archer:       { type: "archer",       hp: 7,  move: 3, range: 4, damage: 2 },
  mage:         { type: "mage",         hp: 6,  move: 2, range: 3, damage: 4 },
  scout:        { type: "scout",        hp: 6,  move: 5, range: 1, damage: 2 },
  shieldbearer: { type: "shieldbearer", hp: 14, move: 2, range: 1, damage: 2 },
};

const POOL: UnitType[] = [
  "warrior", "warrior",
  "archer", "archer",
  "mage",
  "scout",
  "shieldbearer",
];

// Corner start positions for each player on a 16x12 grid (x, y pairs for 5 units)
export const START_POSITIONS: [number, number][][] = [
  [[0,0],[1,0],[0,1],[1,1],[0,2]],  // player 0: top-left
  [[14,0],[15,0],[14,1],[15,1],[14,2]],  // player 1: top-right
  [[14,9],[15,9],[14,10],[15,10],[14,11]],  // player 2: bottom-right
  [[0,9],[1,9],[0,10],[1,10],[0,11]],  // player 3: bottom-left
];

export function generateWarband(owner: number): { owner: number; type: UnitType; hp: number; max_hp: number; x: number; y: number }[] {
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 5);
  return picked.map((type, i) => {
    const def = UNIT_DEFS[type];
    const [x, y] = START_POSITIONS[owner][i];
    return { owner, type, hp: def.hp, max_hp: def.hp, x, y };
  });
}
