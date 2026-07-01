// Encounter frequency. The whole game is rate-limited RNG: rare enough to be an event,
// gated so it can never feel like spam. Cooldown + last-domain are recorded in
// chrome.storage.local AT SPAWN TIME (not at catch) so reloading the page can't re-roll the dice.
window.NB_SPAWN = (() => {
  const T = () => window.NB_TUNABLES;

  let despawnTimer = null;

  const storageGet = (keys) => new Promise((res) => chrome.storage.local.get(keys, res));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  function isDenylisted(host) {
    return T().DENYLIST.some((re) => re.test(host));
  }

  async function gate() {
    if (NB_STATE.state !== 'Dormant') return 'not dormant';
    const host = location.hostname;
    if (!host) return 'no hostname';
    if (isDenylisted(host)) return 'denylisted';
    const d = await storageGet(['nb_lastSpawnTimestamp', 'nb_lastSpawnDomain']);
    if (Date.now() - (d.nb_lastSpawnTimestamp || 0) < T().GLOBAL_COOLDOWN_MS) return 'cooldown';
    if (d.nb_lastSpawnDomain === host) return 'same domain twice in a row';
    return null;
  }

  // force=true is the debug path: skips every gate including the RNG roll.
  async function checkAndMaybeSpawn(force) {
    if (force) {
      if (NB_STATE.state !== 'Dormant') return false;
    } else {
      const blocked = await gate();
      if (blocked) return false;
      if (Math.random() * 100 >= T().SPAWN_RATE_PERCENT) return false;
    }
    await spawn(!!force);
    return true;
  }

  function pickDoorPos() {
    // basement doors belong in the lower half of the page
    return {
      x: Math.round(rand(80, Math.max(81, innerWidth - 80))),
      y: Math.round(rand(innerHeight * 0.55, innerHeight * 0.92)),
    };
  }

  async function spawn(forced) {
    chrome.storage.local.set({
      nb_lastSpawnTimestamp: Date.now(),
      nb_lastSpawnDomain: location.hostname,
    });

    if (!(window.NB_ACCESS && window.NB_ACCESS.reducedMotion)) {
      NB_UI.showTell(T().PRE_SPAWN_TELL_MS);
      await new Promise((res) => setTimeout(res, T().PRE_SPAWN_TELL_MS));
    }

    const pos = pickDoorPos();
    if (!NB_MACHINE.toLurking(pos)) return;

    console.log('[Neckbeard] SPAWN', {
      encounterId: NB_STATE.encounterId,
      domain: location.hostname,
      forced,
      doorPos: pos,
    });

    NB_UI.showDoor(pos, () => NB_MACHINE.toHunting());

    const lurkMs = rand(T().LURKING_DURATION_MIN_MS, T().LURKING_DURATION_MAX_MS);
    despawnTimer = setTimeout(() => {
      if (NB_STATE.state === 'Lurking') {
        console.log('[Neckbeard] DESPAWN (door ignored)');
        NB_MACHINE.toDormant();
      }
    }, lurkMs);
  }

  function cancelDespawn() {
    if (despawnTimer) { clearTimeout(despawnTimer); despawnTimer = null; }
  }

  return { checkAndMaybeSpawn, cancelDespawn };
})();
