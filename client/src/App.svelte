<script>
  import { onMount } from "svelte";
  import { supabase, ensureAnonymousSession } from "./lib/supabase.js";
  import { session, game, mySlot, loadGame } from "./lib/store.js";
  import Lobby from "./Lobby.svelte";
  import Battle from "./Battle.svelte";

  let ready = false;

  onMount(async () => {
    await ensureAnonymousSession();
    const { data: { session: s } } = await supabase.auth.getSession();
    session.set(s);

    supabase.auth.onAuthStateChange((_event, s) => session.set(s));

    // Handle invite link: /join?token=...
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      // Store token and redirect to clean URL so refresh doesn't re-join
      sessionStorage.setItem("joinToken", token);
      window.history.replaceState({}, "", "/");
    }

    // Restore game from session if returning player
    const savedGameId = sessionStorage.getItem("gameId");
    const savedSlot = sessionStorage.getItem("mySlot");
    if (savedGameId && savedSlot !== null) {
      mySlot.set(Number(savedSlot));
      await loadGame(savedGameId);
    }

    ready = true;
  });
</script>

{#if ready}
  {#if $game}
    <Battle />
  {:else}
    <Lobby />
  {/if}
{/if}
