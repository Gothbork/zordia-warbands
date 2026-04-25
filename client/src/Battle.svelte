<script>
  import { game, units, mySlot, isMyTurn, selectedUnitId, actionMode } from "./lib/store.js";
  import { callFunction } from "./lib/supabase.js";
  import { PLAYER_COLORS, PLAYER_NAMES } from "./lib/units.js";
  import GameBoard from "./GameBoard.svelte";
  import UnitPanel from "./UnitPanel.svelte";

  async function endTurn() {
    selectedUnitId.set(null);
    actionMode.set(null);
    await callFunction("end-turn", { gameId: $game.id });
  }

  $: currentPlayerName = $game ? PLAYER_NAMES[$game.current_turn] : "";
  $: currentPlayerColor = $game ? PLAYER_COLORS[$game.current_turn] : "#fff";

  $: winnerName = $game?.winner != null ? PLAYER_NAMES[$game.winner] : null;
  $: winnerColor = $game?.winner != null ? PLAYER_COLORS[$game.winner] : "#fff";

  $: unitCountByPlayer = [0,1,2,3].map((p) => $units.filter((u) => u.owner === p).length);
</script>

<div class="battle">
  <!-- Header -->
  <div class="header">
    <div class="turn-info">
      {#if $game?.phase === "ended"}
        <span class="winner" style="color:{winnerColor}">🏆 {winnerName} wins!</span>
      {:else}
        <span style="color:{currentPlayerColor}">{currentPlayerName}'s turn</span>
        {#if $isMyTurn}<span class="your-turn"> — Your turn!</span>{/if}
      {/if}
    </div>
    <div class="counts">
      {#each [0,1,2,3] as p}
        {#if !$game?.eliminated?.includes(p)}
          <span style="color:{PLAYER_COLORS[p]}">{unitCountByPlayer[p]}u</span>
        {/if}
      {/each}
    </div>
  </div>

  <!-- Map -->
  <div class="map-wrap">
    <GameBoard />
  </div>

  <!-- Unit panel + end turn -->
  <UnitPanel />

  {#if $isMyTurn && $game?.phase === "battle"}
    <button class="end-turn" on:click={endTurn}>End Turn</button>
  {/if}
</div>

<style>
  .battle {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    background: #0d1b2a;
    border-bottom: 1px solid #333;
    font-size: 0.9rem;
    flex-shrink: 0;
  }
  .your-turn { color: #ffe082; font-weight: 600; }
  .winner { font-weight: 700; font-size: 1.1rem; }
  .counts { display: flex; gap: 0.75rem; font-size: 0.8rem; }
  .map-wrap {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
  }
  .end-turn {
    width: 100%;
    padding: 1rem;
    background: #ffe082;
    color: #000;
    font-size: 1.1rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
  }
</style>
