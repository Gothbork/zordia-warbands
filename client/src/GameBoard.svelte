<script>
  import { units, game, mySlot, selectedUnitId, actionMode, selectedUnit, isMyTurn } from "./lib/store.js";
  import { callFunction } from "./lib/supabase.js";
  import { UNIT_DEFS, PLAYER_COLORS, chebyshev, reachableCells } from "./lib/units.js";

  const MAP_W = 16;
  const MAP_H = 12;
  const cells = Array.from({ length: MAP_H }, (_, y) => Array.from({ length: MAP_W }, (_, x) => ({ x, y })));

  $: unitMap = Object.fromEntries($units.map((u) => [`${u.x},${u.y}`, u]));

  $: validMoves = (() => {
    if (!$isMyTurn || !$selectedUnit || $actionMode !== "move") return new Set();
    const cells = reachableCells($selectedUnit.x, $selectedUnit.y, UNIT_DEFS[$selectedUnit.type].move, $units, $selectedUnit.id);
    return new Set(cells.map(([x, y]) => `${x},${y}`));
  })();

  $: validTargets = (() => {
    if (!$isMyTurn || !$selectedUnit || $actionMode !== "attack") return new Set();
    const range = UNIT_DEFS[$selectedUnit.type].range;
    return new Set(
      $units
        .filter((u) => u.owner !== $mySlot && chebyshev($selectedUnit.x, $selectedUnit.y, u.x, u.y) <= range)
        .map((u) => `${u.x},${u.y}`)
    );
  })();

  async function handleCellTap(x, y) {
    const unitHere = unitMap[`${x},${y}`];

    if ($actionMode === "move" && validMoves.has(`${x},${y}`)) {
      await callFunction("move-unit", { gameId: $game.id, unitId: $selectedUnit.id, toX: x, toY: y });
      actionMode.set(null);
      return;
    }

    if ($actionMode === "attack" && validTargets.has(`${x},${y}`)) {
      await callFunction("attack-unit", { gameId: $game.id, unitId: $selectedUnit.id, targetId: unitHere.id });
      actionMode.set(null);
      selectedUnitId.set(null);
      return;
    }

    // Select own unit
    if (unitHere && unitHere.owner === $mySlot && $isMyTurn) {
      selectedUnitId.set(unitHere.id);
      actionMode.set(null);
    } else {
      selectedUnitId.set(null);
      actionMode.set(null);
    }
  }
</script>

<div class="board" style="--cols:{MAP_W}; --rows:{MAP_H}">
  {#each cells as row}
    {#each row as { x, y }}
      {@const key = `${x},${y}`}
      {@const unit = unitMap[key]}
      {@const isMove = validMoves.has(key)}
      {@const isTarget = validTargets.has(key)}
      {@const isSelected = unit && unit.id === $selectedUnitId}
      <div
        class="cell"
        class:move={isMove}
        class:target={isTarget}
        class:selected={isSelected}
        on:click={() => handleCellTap(x, y)}
        on:keydown={(e) => e.key === "Enter" && handleCellTap(x, y)}
        role="button"
        tabindex="0"
      >
        {#if unit}
          <div class="unit" style="color:{PLAYER_COLORS[unit.owner]}">
            <span class="emoji">{UNIT_DEFS[unit.type].emoji}</span>
            <div class="hp-bar">
              <div class="hp-fill" style="width:{(unit.hp / unit.max_hp) * 100}%; background:{PLAYER_COLORS[unit.owner]}"></div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  {/each}
</div>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    grid-template-rows: repeat(var(--rows), 1fr);
    width: 100%;
    aspect-ratio: 4/3;
    border: 1px solid #333;
    touch-action: manipulation;
  }
  .cell {
    border: 1px solid #1f2d40;
    background: #0d1b2a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    min-height: 0;
  }
  .cell.move    { background: #1a3a5c; }
  .cell.target  { background: #4a1a1a; }
  .cell.selected { outline: 2px solid #fff; outline-offset: -2px; }
  .unit { display: flex; flex-direction: column; align-items: center; width: 100%; padding: 1px; }
  .emoji { font-size: clamp(10px, 2.5vw, 22px); line-height: 1; }
  .hp-bar { width: 90%; height: 3px; background: #333; border-radius: 2px; margin-top: 1px; }
  .hp-fill { height: 100%; border-radius: 2px; transition: width 0.2s; }
</style>
