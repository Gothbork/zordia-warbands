<script>
  import { selectedUnit, selectedUnitId, actionMode, isMyTurn, mySlot } from "./lib/store.js";
  import { UNIT_DEFS, PLAYER_COLORS, PLAYER_NAMES } from "./lib/units.js";
</script>

<div class="panel">
  {#if $selectedUnit}
    {@const def = UNIT_DEFS[$selectedUnit.type]}
    <div class="unit-info">
      <span class="emoji">{def.emoji}</span>
      <div class="stats">
        <strong style="color:{PLAYER_COLORS[$selectedUnit.owner]}">{def.label}</strong>
        <span>HP {$selectedUnit.hp}/{$selectedUnit.max_hp} · MV {def.move} · RNG {def.range} · DMG {def.damage}</span>
      </div>
    </div>

    {#if $isMyTurn && $selectedUnit.owner === $mySlot}
      <div class="actions">
        <button
          class:active={$actionMode === "move"}
          disabled={$selectedUnit.moved}
          on:click={() => actionMode.set($actionMode === "move" ? null : "move")}
        >
          {$selectedUnit.moved ? "Moved" : "Move"}
        </button>
        <button
          class:active={$actionMode === "attack"}
          disabled={$selectedUnit.attacked}
          on:click={() => actionMode.set($actionMode === "attack" ? null : "attack")}
        >
          {$selectedUnit.attacked ? "Attacked" : "Attack"}
        </button>
        <button class="clear" on:click={() => { selectedUnitId.set(null); actionMode.set(null); }}>✕</button>
      </div>
    {/if}
  {:else}
    <p class="hint">Tap a unit to select it</p>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #16213e;
    border-top: 1px solid #333;
    min-height: 72px;
  }
  .unit-info { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
  .emoji { font-size: 2rem; flex-shrink: 0; }
  .stats { display: flex; flex-direction: column; font-size: 0.8rem; min-width: 0; }
  .stats strong { font-size: 0.95rem; }
  .actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
  button {
    padding: 0.5rem 0.85rem;
    border-radius: 8px;
    border: 1px solid #444;
    background: #1a1a2e;
    color: #e0e0e0;
    font-size: 0.85rem;
    cursor: pointer;
    white-space: nowrap;
  }
  button:disabled { opacity: 0.4; cursor: default; }
  button.active { background: #4fc3f7; color: #000; border-color: #4fc3f7; }
  button.clear { background: transparent; border-color: #555; }
  .hint { color: #666; font-size: 0.85rem; }
</style>
