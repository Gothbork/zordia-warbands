<script>
  import { callFunction } from "./lib/supabase.js";
  import { supabase } from "./lib/supabase.js";
  import { game, mySlot, loadGame, subscribeToGame } from "./lib/store.js";

  let createdGame = null;
  let inviteUrls = [];
  let joinToken = sessionStorage.getItem("joinToken") ?? "";
  let error = "";
  let loading = false;

  // Live slot fill status
  let slotsFilled = [true, false, false, false]; // slot 0 always filled (creator)

  async function createGame() {
    loading = true;
    error = "";
    try {
      const result = await callFunction("create-game", {});
      createdGame = result;
      inviteUrls = result.inviteUrls;

      mySlot.set(0);
      sessionStorage.setItem("mySlot", "0");
      sessionStorage.setItem("gameId", result.gameId);

      await loadGame(result.gameId);

      // Watch for players joining
      supabase
        .channel(`lobby:${result.gameId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${result.gameId}` },
          (payload) => {
            const g = payload.new;
            slotsFilled = [
              !!g.player0_id, !!g.player1_id, !!g.player2_id, !!g.player3_id,
            ];
          }
        )
        .subscribe();
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function joinGame() {
    if (!joinToken) return;
    loading = true;
    error = "";
    try {
      const result = await callFunction("join-game", { token: joinToken });
      sessionStorage.removeItem("joinToken");
      sessionStorage.setItem("mySlot", String(result.slot));
      sessionStorage.setItem("gameId", result.gameId);
      mySlot.set(result.slot);
      await loadGame(result.gameId);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function copy(url) {
    navigator.clipboard.writeText(url);
  }

  const SLOT_LABELS = ["Player 1 (you)", "Player 2", "Player 3", "Player 4"];
</script>

<div class="lobby">
  <h1>⚔️ Zordia Warbands</h1>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if !createdGame && !joinToken}
    <div class="actions">
      <button on:click={createGame} disabled={loading}>Create Game</button>
      <p class="or">— or —</p>
      <input bind:value={joinToken} placeholder="Paste invite token" />
      <button on:click={joinGame} disabled={loading || !joinToken}>Join Game</button>
    </div>
  {:else if joinToken && !$game}
    <div class="actions">
      <p>You have an invite. Ready to join?</p>
      <button on:click={joinGame} disabled={loading}>Join Game</button>
    </div>
  {:else if createdGame}
    <div class="waiting">
      <p class="code">Room: <strong>{createdGame.roomCode}</strong></p>
      <div class="slots">
        {#each SLOT_LABELS as label, i}
          <div class="slot {slotsFilled[i] ? 'joined' : ''}">
            <span>{label}</span>
            <span class="status">{slotsFilled[i] ? "✓ Joined" : "Waiting..."}</span>
            {#if i > 0 && inviteUrls[i - 1]}
              <button class="copy" on:click={() => copy(inviteUrls[i - 1])}>Copy Link</button>
            {/if}
          </div>
        {/each}
      </div>
      <p class="hint">Battle starts automatically when all 4 players join.</p>
    </div>
  {:else}
    <p>Waiting for game to load...</p>
  {/if}
</div>

<style>
  .lobby {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    gap: 1.5rem;
    max-width: 480px;
    margin: 0 auto;
  }
  h1 { font-size: 2rem; text-align: center; }
  .error { color: #ef9a9a; }
  .actions { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
  .or { text-align: center; color: #888; }
  input {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid #444;
    background: #16213e;
    color: #e0e0e0;
    font-size: 1rem;
  }
  button {
    padding: 0.85rem 1.5rem;
    border-radius: 8px;
    border: none;
    background: #4fc3f7;
    color: #000;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled { opacity: 0.5; }
  .waiting { width: 100%; display: flex; flex-direction: column; gap: 1rem; }
  .code { font-size: 1.25rem; text-align: center; }
  .slots { display: flex; flex-direction: column; gap: 0.5rem; }
  .slot {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: #16213e;
    border: 1px solid #333;
  }
  .slot.joined { border-color: #a5d6a7; }
  .slot span:first-child { flex: 1; }
  .status { font-size: 0.85rem; color: #888; }
  .slot.joined .status { color: #a5d6a7; }
  .copy {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    background: #333;
    color: #e0e0e0;
  }
  .hint { text-align: center; color: #888; font-size: 0.85rem; }
</style>
